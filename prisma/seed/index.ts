import "dotenv/config";
import argon2 from "argon2";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { SEED_SERVICES } from "./catalog";
import { buildIdentitySeedData } from "./identity";
import { buildSchedulingSeedData } from "./scheduling";
import { buildAppointmentsHistoryAndNotifications, SEED_REFERENCE_DATE } from "./appointments";
import { BOOKING_HORIZON_DAYS, CLINIC_TIMEZONE } from "../../src/config/business";
import { PASSWORD_HASH_OPTIONS } from "../../src/config/security";
import { addDays, differenceInCalendarDays } from "date-fns";
import { TZDate } from "@date-fns/tz";

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const demoPasswordHash = await argon2.hash("Demo@12345", {
    type: argon2.argon2id,
    ...PASSWORD_HASH_OPTIONS,
  });

  const { users, userRoles, accounts } = buildIdentitySeedData(demoPasswordHash);
  const { doctorServices, doctorShifts, doctorUnavailability } =
    buildSchedulingSeedData();
  const { appointments, history, notifications } =
    buildAppointmentsHistoryAndNotifications({
      shifts: doctorShifts,
      unavailability: doctorUnavailability,
    });

  const dayOffset = differenceInCalendarDays(
    new TZDate(new Date(), CLINIC_TIMEZONE),
    new TZDate(SEED_REFERENCE_DATE, CLINIC_TIMEZONE),
  );
  for (const row of [...doctorShifts, ...doctorUnavailability, ...appointments, ...history, ...notifications]) {
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        Object.assign(row, { [key]: addDays(new TZDate(value, CLINIC_TIMEZONE), dayOffset) });
      }
    }
  }

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "otp_challenges",
      "auth_sessions",
      "notifications",
      "appointment_history",
      "appointments",
      "doctor_unavailability",
      "doctor_shifts",
      "doctor_services",
      "services",
      "accounts",
      "user_roles",
      "users"
    RESTART IDENTITY CASCADE;
  `);

  await prisma.user.createMany({ data: users });

  await prisma.userRole.createMany({
    data: userRoles.map((ur) => ({
      userId: ur.userId,
      role: ur.roleName,
    })),
  });

  await prisma.account.createMany({ data: accounts });

  await prisma.service.createMany({
    data: SEED_SERVICES.map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      isActive: s.isActive,
    })),
  });

  await prisma.doctorService.createMany({ data: doctorServices });

  await prisma.doctorShift.createMany({
    data: doctorShifts.map((sh) => ({
      shiftId: sh.shiftId,
      doctorId: sh.doctorId,
      startAt: sh.startAt,
      endAt: sh.endAt,
    })),
  });

  await prisma.doctorUnavailability.createMany({
    data: doctorUnavailability.map((u) => ({
      unavailabilityId: u.unavailabilityId,
      doctorId: u.doctorId,
      startAt: u.startAt,
      endAt: u.endAt,
    })),
  });

  await prisma.appointment.createMany({ data: appointments });

  const serviceByAppointment = new Map(appointments.map(row => [row.appointmentId, row.serviceId]));
  await prisma.appointmentHistory.createMany({
    data: history.map((h) => ({
      historyId: h.historyId,
      appointmentId: h.appointmentId,
      actorUserId: h.actorUserId,
      oldServiceId: h.oldStatus === null ? null : serviceByAppointment.get(h.appointmentId),
      newServiceId: serviceByAppointment.get(h.appointmentId),
      oldStatus: h.oldStatus,
      newStatus: h.newStatus,
      oldDoctorId: h.oldDoctorId,
      newDoctorId: h.newDoctorId,
      oldStartAt: h.oldStartAt,
      newStartAt: h.newStartAt,
      oldEndAt: h.oldEndAt,
      newEndAt: h.newEndAt,
      changedAt: h.changedAt,
    })),
  });

  await prisma.notification.createMany({ data: notifications });

  await prisma.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 1));
    SELECT setval(pg_get_serial_sequence('accounts', 'account_id'), COALESCE((SELECT MAX(account_id) FROM accounts), 1));
    SELECT setval(pg_get_serial_sequence('services', 'service_id'), COALESCE((SELECT MAX(service_id) FROM services), 1));
    SELECT setval(pg_get_serial_sequence('doctor_shifts', 'shift_id'), COALESCE((SELECT MAX(shift_id) FROM doctor_shifts), 1));
    SELECT setval(pg_get_serial_sequence('doctor_unavailability', 'unavailability_id'), COALESCE((SELECT MAX(unavailability_id) FROM doctor_unavailability), 1));
    SELECT setval(pg_get_serial_sequence('appointments', 'appointment_id'), COALESCE((SELECT MAX(appointment_id) FROM appointments), 1));
    SELECT setval(pg_get_serial_sequence('appointment_history', 'history_id'), COALESCE((SELECT MAX(history_id) FROM appointment_history), 1));
    SELECT setval(pg_get_serial_sequence('notifications', 'notification_id'), COALESCE((SELECT MAX(notification_id) FROM notifications), 1));
  `);
  const today = new TZDate(new Date(), CLINIC_TIMEZONE);
  const doctorHours = new Map(doctorShifts.map(shift => [shift.doctorId, {start: new TZDate(shift.startAt, CLINIC_TIMEZONE), end: new TZDate(shift.endAt, CLINIC_TIMEZONE)} ]));
  const extraShifts = [];
  for (const [doctorId, hours] of doctorHours) for (let offset = 0; offset <= BOOKING_HORIZON_DAYS; offset++) {
    const day = addDays(today, offset);
    if (day.getDay() === 0) continue;
    const startAt = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), hours.start.getHours(), hours.start.getMinutes(), CLINIC_TIMEZONE);
    const endAt = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), hours.end.getHours(), hours.end.getMinutes(), CLINIC_TIMEZONE);
    if (!doctorShifts.some(shift => shift.doctorId === doctorId && shift.startAt < endAt && shift.endAt > startAt)) extraShifts.push({doctorId, startAt, endAt});
  }
  await prisma.doctorShift.createMany({data: extraShifts});
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in .env.");
  const pool = new Pool({
    options: "-c timezone=UTC",
    connectionString:
      process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    console.log("Seeding canonical ViClinic demo dataset...");
    await seedDatabase(prisma);
    console.log("Seed data loaded for the current date.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
