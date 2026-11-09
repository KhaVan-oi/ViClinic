import "server-only";

import { SLOT_GRID_MINUTES } from "@/config/business";
import {
  formatClinicTime,
  generateCandidateGridSlots,
  getClinicDayEndExclusive,
  getClinicDayStart,
  isHalfOpenOverlap,
} from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { db, DbTransactionClient } from "@/server/db";
import {
  assertValidFutureRescheduleTime,
  assertValidNewBookingHorizon,
  computeSlotEndTime,
  isDoctorSlotValidInMemory,
  isValidSlotGridStart,
  isWithinBookingHorizon,
  AvailableSlotDto,
  EligibleDoctorDto,
} from "@/modules/scheduling/contracts";

export async function listEligibleDoctors(input: {
  serviceId: number;
  excludePatientUserId?: number | null;
}, client: DbTransactionClient = db): Promise<EligibleDoctorDto[]> {
  const rows = await client.doctorService.findMany({
    where: {
      serviceId: input.serviceId,
      ...(input.excludePatientUserId
        ? { doctorId: { not: input.excludePatientUserId } }
        : {}),
      doctor: {
        roles: {
          some: { role: "DOCTOR" },
        },
      },
    },
    select: { doctorId: true, doctor: { select: { fullName: true } } },
    orderBy: { doctorId: "asc" },
  });

  return rows.map((r) => ({
    doctorId: r.doctorId,
    fullName: r.doctor.fullName,
  }));
}

async function loadDoctorSchedule(doctorIds: number[], startAt: Date, endAt: Date, excludeAppointmentId?: number | null, client: DbTransactionClient = db) {
  const window = { doctorId: { in: doctorIds }, startAt: { lt: endAt }, endAt: { gt: startAt } };
  const select = { doctorId: true, startAt: true, endAt: true } as const;
  return Promise.all([
    client.doctorShift.findMany({ where: window, select, orderBy: { startAt: "asc" } }),
    client.doctorUnavailability.findMany({ where: window, select }),
    client.appointment.findMany({
      where: { ...window, status: { in: ["PENDING", "CONFIRMED"] }, ...(excludeAppointmentId ? { appointmentId: { not: excludeAppointmentId } } : {}) },
      select,
    }),
  ]);
}

export async function listAvailableDoctorsForAppointment(input: {
  startAt: Date;
  endAt: Date;
  appointmentId: number;
}, doctors: EligibleDoctorDto[]): Promise<EligibleDoctorDto[]> {
  if (!doctors.length) return [];
  const [shifts, unavailabilities, appointments] = await loadDoctorSchedule(doctors.map(doctor => doctor.doctorId), input.startAt, input.endAt, input.appointmentId);
  return doctors.filter(doctor => isDoctorSlotValidInMemory({
    startAt: input.startAt,
    endAt: input.endAt,
    shifts: shifts.filter(row => row.doctorId === doctor.doctorId),
    unavailabilities: unavailabilities.filter(row => row.doctorId === doctor.doctorId),
    activeAppointments: appointments.filter(row => row.doctorId === doctor.doctorId),
  }).valid);
}

export async function getAvailableSlots(input: {
  serviceId: number;
  date: string;
  doctorId?: number | null;
  patientId?: number | null;
  excludeAppointmentId?: number | null;
  enforceHorizon?: boolean;
}, eligibleDoctorsInput?: EligibleDoctorDto[]): Promise<AvailableSlotDto[]> {
  const now = new Date();
  const service = await db.service.findUnique({
    where: { serviceId: input.serviceId },
  });
  if (!service || !service.isActive) {
    return [];
  }

  const eligibleDoctors = eligibleDoctorsInput ?? await listEligibleDoctors({
    serviceId: service.serviceId,
    excludePatientUserId: input.patientId,
  });

  const candidateDoctorIds = input.doctorId
    ? eligibleDoctors
      .filter((d) => d.doctorId === input.doctorId)
      .map((d) => d.doctorId)
    : eligibleDoctors.map((d) => d.doctorId);

  if (candidateDoctorIds.length === 0) {
    return [];
  }

  const dayStart = getClinicDayStart(input.date);
  const dayEndExclusive = getClinicDayEndExclusive(input.date);

  const [schedule, patientActiveAppts] = await Promise.all([
    loadDoctorSchedule(candidateDoctorIds, dayStart, dayEndExclusive, input.excludeAppointmentId),
    input.patientId ? db.appointment.findMany({
      where: {
        patientId: input.patientId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: dayEndExclusive },
        endAt: { gt: dayStart },
        ...(input.excludeAppointmentId ? { appointmentId: { not: input.excludeAppointmentId } } : {}),
      },
      select: { appointmentId: true, service: { select: { name: true } }, startAt: true, endAt: true },
    }) : Promise.resolve([]),
  ]);
  const [shifts, unavailabilities, doctorActiveAppts] = schedule;

  const shiftsByDoc = Map.groupBy(shifts, row => row.doctorId);
  const unavByDoc = Map.groupBy(unavailabilities, row => row.doctorId);
  const apptsByDoc = Map.groupBy(doctorActiveAppts, row => row.doctorId);

  const slotMap = new Map<
    number,
    { startAt: Date; endAt: Date; eligibleDoctorIds: Set<number>; }
  >();

  for (const docId of candidateDoctorIds) {
    const docShifts = shiftsByDoc.get(docId) ?? [];
    for (const sh of docShifts) {
      const gridSlots = generateCandidateGridSlots(
        sh.startAt,
        sh.endAt,
        service.durationMinutes,
        SLOT_GRID_MINUTES
      );

      for (const slot of gridSlots) {
        if (slot.startAt.getTime() < dayStart.getTime() || slot.startAt.getTime() >= dayEndExclusive.getTime()) {
          continue;
        }
        if (slot.startAt.getTime() <= now.getTime()) {
          continue;
        }
        if (
          input.enforceHorizon !== false &&
          !isWithinBookingHorizon(slot.startAt, now)
        ) {
          continue;
        }

        const check = isDoctorSlotValidInMemory({
          startAt: slot.startAt,
          endAt: slot.endAt,
          shifts: docShifts,
          unavailabilities: unavByDoc.get(docId) ?? [],
          activeAppointments: apptsByDoc.get(docId) ?? [],
        });

        if (check.valid) {
          const existing = slotMap.get(slot.startAt.getTime());
          if (existing) {
            existing.eligibleDoctorIds.add(docId);
          } else {
            slotMap.set(slot.startAt.getTime(), {
              startAt: slot.startAt,
              endAt: slot.endAt,
              eligibleDoctorIds: new Set([docId]),
            });
          }
        }
      }
    }
  }

  return Array.from(slotMap.values())
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .map((s) => ({
      startAtIso: s.startAt.toISOString(),
      endAtIso: s.endAt.toISOString(),
      startTimeLabel: formatClinicTime(s.startAt),
      endTimeLabel: formatClinicTime(s.endAt),
      eligibleDoctorIds: Array.from(s.eligibleDoctorIds).sort((a, b) => a - b),
      patientConflicts: patientActiveAppts.filter(pa => isHalfOpenOverlap(s.startAt, s.endAt, pa.startAt, pa.endAt)).map(pa => ({ appointmentId: pa.appointmentId, serviceName: pa.service.name, startTimeLabel: formatClinicTime(pa.startAt), endTimeLabel: formatClinicTime(pa.endAt) })),
    }));
}

export async function validateCandidateSlot(
  input: {
    patientId: number;
    serviceId: number;
    doctorId: number | null;
    startAt: Date;
    mode: "CREATE" | "CONFIRM" | "RESCHEDULE";
    excludeAppointmentId?: number | null;
    fixedEndAt?: Date | null;
  },
  tx?: DbTransactionClient
): Promise<{
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
}> {
  const client = tx ?? db;
  const now = new Date();

  if (tx) {
    await tx.$queryRaw`
      SELECT service_id FROM "services" WHERE service_id = ${input.serviceId} FOR UPDATE
    `;
  }

  const service = await client.service.findUnique({
    where: { serviceId: input.serviceId },
  });

  if (!service) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy dịch vụ khám.", 404);
  }

  if (!service.isActive) {
    throw new DomainError(
      "SERVICE_INACTIVE",
      `Dịch vụ "${service.name}" hiện đã ngừng hoạt động và không nhận lịch hẹn mới.`,
      400
    );
  }

  if (!isValidSlotGridStart(input.startAt, SLOT_GRID_MINUTES)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Giờ bắt đầu lịch hẹn phải theo mốc ${SLOT_GRID_MINUTES} phút (00, 15, 30, 45).`
    );
  }

  if (input.mode === "CREATE") {
    assertValidNewBookingHorizon(input.startAt, now);
  } else if (input.mode === "RESCHEDULE") {
    assertValidFutureRescheduleTime(input.startAt, now);
  }

  if (input.doctorId !== null && input.patientId === input.doctorId) {
    throw new DomainError(
      "PATIENT_DOCTOR_SAME_PERSON",
      "Người khám bệnh không thể đặt lịch khám với chính mình trong vai trò Bác sĩ.",
      400
    );
  }

  const endAt =
    input.mode === "CONFIRM" && input.fixedEndAt
      ? input.fixedEndAt
      : computeSlotEndTime(input.startAt, service.durationMinutes);

  const patientOverlaps = await client.appointment.findMany({
    where: {
      patientId: input.patientId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: endAt },
      endAt: { gt: input.startAt },
      ...(input.excludeAppointmentId
        ? { appointmentId: { not: input.excludeAppointmentId } }
        : {}),
    },
  });

  if (
    patientOverlaps.some((a) =>
      isHalfOpenOverlap(input.startAt, endAt, a.startAt, a.endAt)
    )
  ) {
    throw new DomainError(
      "PATIENT_OVERLAP_CONFLICT",
      "Người khám bệnh đã có lịch hẹn trùng giờ. Vui lòng chọn giờ khác.",
      409
    );
  }

  const eligibleDoctors = await listEligibleDoctors({
    serviceId: service.serviceId,
    excludePatientUserId: input.patientId,
  }, client);
  const doctorIds = input.doctorId === null
    ? eligibleDoctors.map(doctor => doctor.doctorId)
    : eligibleDoctors.filter(doctor => doctor.doctorId === input.doctorId).map(doctor => doctor.doctorId);

  if (input.doctorId !== null && !doctorIds.length) {
    throw new DomainError("DOCTOR_SERVICE_MISMATCH", "Bác sĩ này không nhận khám dịch vụ bạn đã chọn.", 400);
  }
  if (!doctorIds.length) {
    throw new DomainError("OUTSIDE_SHIFT", "Hiện không có bác sĩ nào phụ trách dịch vụ này trong khung giờ đã chọn.", 400);
  }
  const [shifts, unavailabilities, appointments] = await loadDoctorSchedule(
    doctorIds, input.startAt, endAt, input.excludeAppointmentId, client,
  );
  const checks = doctorIds.map(doctorId => isDoctorSlotValidInMemory({
    startAt: input.startAt,
    endAt,
    shifts: shifts.filter(row => row.doctorId === doctorId),
    unavailabilities: unavailabilities.filter(row => row.doctorId === doctorId),
    activeAppointments: appointments.filter(row => row.doctorId === doctorId),
  }));
  if (input.doctorId !== null) {
    const result = checks[0];
    if (!result.valid) {
      const failures = {
        OUTSIDE_SHIFT: { message: "Giờ khám bạn chọn nằm ngoài ca trực của bác sĩ.", status: 400 },
        UNAVAILABILITY_CONFLICT: { message: "Bác sĩ bận vào giờ này. Vui lòng chọn giờ khác.", status: 409 },
        DOCTOR_OVERLAP_CONFLICT: { message: "Bác sĩ đã có lịch vào giờ này. Vui lòng chọn giờ khác.", status: 409 },
      };
      const failure = failures[result.reason!];
      throw new DomainError(result.reason!, failure.message, failure.status);
    }
  } else if (!checks.some(result => result.valid)) {
    throw new DomainError("OUTSIDE_SHIFT", "Không có bác sĩ còn trống vào giờ này. Vui lòng chọn giờ khác.", 409);
  }

  return {
    startAt: input.startAt,
    endAt,
    durationMinutes: service.durationMinutes,
  };
}
