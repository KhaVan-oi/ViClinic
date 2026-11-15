import "server-only";

import { db } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { requireActiveContext } from "@/server/authorization";
import { formatClinicIsoDate, getClinicDayEndExclusive, getClinicDayStart, formatTimeRange, subtractBusyIntervals } from "@/lib/dates";

import { AppointmentStatus } from "@/config/business";
import { getAllAffectedActiveAppointmentsMap } from "@/modules/scheduling/impact";
import { CalendarEventDto } from "@/modules/appointments/contracts";
import { getDoctorAppointments } from "@/modules/appointments/queries";
import { appointmentSearch } from "./queries";

export async function getCalendarEventsForRole(
  input: {
    fromDate: string;
    toDate: string;
    doctorId?: number | null;
    serviceId?: number | null;
    query?: string;
    status?: AppointmentStatus | "ALL" | null;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<CalendarEventDto[]> {
  const ctx = await requireActiveContext(
    ["PATIENT", "RECEPTIONIST", "DOCTOR", "CLINIC_MANAGER"],
    explicitCtx
  );

  const rangeStart = getClinicDayStart(input.fromDate);
  const rangeEnd = getClinicDayEndExclusive(input.toDate);

  const effectiveDoctorId =
    ctx.activeContext === "DOCTOR" ? ctx.userId : input.doctorId ?? undefined;

  const [shifts, unavailabilities, appointments] = await Promise.all([
    ctx.activeContext === "PATIENT" ? [] : db.doctorShift.findMany({
      where: {
        ...(effectiveDoctorId ? { doctorId: effectiveDoctorId } : {}),
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: { shiftId: true, doctorId: true, startAt: true, endAt: true, doctor: { select: { fullName: true } } },
      orderBy: { startAt: "asc" },
    }),
    ctx.activeContext === "PATIENT" ? [] : db.doctorUnavailability.findMany({
      where: {
        ...(effectiveDoctorId ? { doctorId: effectiveDoctorId } : {}),
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: { unavailabilityId: true, doctorId: true, startAt: true, endAt: true, doctor: { select: { fullName: true } } },
      orderBy: { startAt: "asc" },
    }),
    db.appointment.findMany({
      where: {
        ...(ctx.activeContext === "PATIENT" ? { patientId: ctx.userId } : {}),
        ...appointmentSearch(input.query),
        ...(effectiveDoctorId ? { doctorId: effectiveDoctorId } : {}),
        ...(input.serviceId ? { serviceId: input.serviceId } : {}),
        ...(input.status && input.status !== "ALL"
          ? { status: input.status }
          : {}),
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: {
        appointmentId: true,
        doctorId: true,
        serviceId: true,
        status: true,
        startAt: true,
        endAt: true,
        service: { select: { name: true } },
        doctor: { select: { fullName: true } },
        patient: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
    }),
  ]);

  const events: CalendarEventDto[] = [];

  for (const sh of shifts) {
    const busy = unavailabilities.filter(item => item.doctorId === sh.doctorId);
    for (const interval of subtractBusyIntervals(sh, busy)) {
      events.push({
        shiftId: sh.shiftId,
        kind: "SHIFT",
        title: `Ca trực: ${sh.doctor.fullName}`,
        doctorId: sh.doctorId,
        doctorName: sh.doctor.fullName,
        startAtIso: interval.startAt.toISOString(),
        endAtIso: interval.endAt.toISOString(),
        slotLabel: formatTimeRange(interval.startAt, interval.endAt),
      });
    }
  }

  for (const u of unavailabilities) {
    events.push({
      unavailabilityId: u.unavailabilityId,
      kind: "UNAVAILABILITY",
      title: `Lịch bận: ${u.doctor.fullName}`,
      doctorId: u.doctorId,
      doctorName: u.doctor.fullName,
      startAtIso: u.startAt.toISOString(),
      endAtIso: u.endAt.toISOString(),
      slotLabel: formatTimeRange(u.startAt, u.endAt),
    });
  }

  for (const a of appointments) {
    const status = a.status as AppointmentStatus;
    let title: string;
    let subtitle: string | undefined;

    if (ctx.activeContext === "RECEPTIONIST") {
      title = a.patient.fullName;
      subtitle = `${a.service.name} • SĐT: ${a.patient.phone}`;
    } else if (ctx.activeContext === "DOCTOR") {
      title = a.patient.fullName;
      subtitle = a.service.name;
    } else {
      title = a.service.name;
      subtitle = a.doctor?.fullName ?? "Chưa phân công bác sĩ";
    }

    events.push({
      appointmentId: a.appointmentId,
      kind: "APPOINTMENT",
      title,
      subtitle,
      doctorId: a.doctorId,
      doctorName: a.doctor?.fullName ?? null,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      status,
      startAtIso: a.startAt.toISOString(),
      endAtIso: a.endAt.toISOString(),
      slotLabel: formatTimeRange(a.startAt, a.endAt),
    });
  }

  return events;
}

export async function getDoctorDashboardSummary(
  explicitCtx?: AuthenticatedContext | null
) {
  const ctx = await requireActiveContext(["DOCTOR"], explicitCtx);
  const now = new Date();
  const todayIso = formatClinicIsoDate(now);
  const todayStart = getClinicDayStart(todayIso);
  const todayEnd = getClinicDayEndExclusive(todayIso);

  const [todayPage, upcomingPage, overduePage, todayShifts] =
    await Promise.all([
      getDoctorAppointments({ tab: "TODAY", page: 1, pageSize: 50 }, ctx),
      getDoctorAppointments({ tab: "UPCOMING", page: 1, pageSize: 1 }, ctx),
      getDoctorAppointments({ tab: "OVERDUE_CONFIRMED", page: 1, pageSize: 1 }, ctx),
      db.doctorShift.findMany({
        where: {
          doctorId: ctx.userId,
          startAt: { lt: todayEnd },
          endAt: { gt: todayStart },
        },
        orderBy: { startAt: "asc" },
      }),
    ]);

  const nextAppointment =
    todayPage.items.find(
      (a) =>
        (a.status === "CONFIRMED" || a.status === "PENDING") &&
        new Date(a.endAtIso).getTime() >= now.getTime()
    ) ??
    upcomingPage.items[0] ??
    null;

  return {
    todayIso,
    todayCount: todayPage.totalItems,
    upcomingCount: upcomingPage.totalItems,
    overdueConfirmedCount: overduePage.totalItems,
    nextAppointment,
    todayAppointments: todayPage.items,
    todayShifts: todayShifts.map((s) => ({
      shiftId: s.shiftId,
      slotLabel: formatTimeRange(s.startAt, s.endAt),
    })),

  };
}

export async function getManagerDashboardSummary(
  explicitCtx?: AuthenticatedContext | null
) {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const now = new Date();
  const todayIso = formatClinicIsoDate(now);
  const todayStart = getClinicDayStart(todayIso);
  const todayEnd = getClinicDayEndExclusive(todayIso);

  const [
    todayAppointmentsCount,
    statusGroups,
    affectedMap,
    todayShifts,
    upcomingShiftsRows,
    activeServicesCount,
    inactiveServicesCount,
    activeDoctorsCount,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        startAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    db.appointment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    getAllAffectedActiveAppointmentsMap(),
    db.doctorShift.findMany({
      where: {
        startAt: { lt: todayEnd },
        endAt: { gt: todayStart },
      },
      include: { doctor: true },
      orderBy: [{ startAt: "asc" }, { doctorId: "asc" }],
    }),
    db.doctorShift.findMany({
      where: {
        endAt: { gt: todayStart },
      },
      include: { doctor: true },
      orderBy: [{ startAt: "asc" }, { doctorId: "asc" }],
      take: 8,
    }),
    db.service.count({ where: { isActive: true } }),
    db.service.count({ where: { isActive: false } }),
    db.user.count({
      where: { roles: { some: { role: "DOCTOR" } } },
    }),
  ]);

  const countByStatus = new Map<string, number>(
    statusGroups.map((g) => [g.status, g._count._all])
  );

  const affectedIds = Array.from(affectedMap.keys());
  const affectedRows =
    affectedIds.length > 0
      ? await db.appointment.findMany({
        where: { appointmentId: { in: affectedIds } },
        include: {
          service: true,
          doctor: true,
        },
        orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
        take: 10,
      })
      : [];

  return {
    todayIso,
    todayAppointmentsCount,
    pendingCount: countByStatus.get("PENDING") ?? 0,
    confirmedCount: countByStatus.get("CONFIRMED") ?? 0,
    completedCount: countByStatus.get("COMPLETED") ?? 0,
    cancelledCount: countByStatus.get("CANCELLED") ?? 0,
    affectedCount: affectedMap.size,
    affectedItems: affectedRows.map((a) => ({
      appointmentId: a.appointmentId,
      serviceName: a.service.name,
      doctorName: a.doctor?.fullName ?? null,
      slotLabel: formatTimeRange(a.startAt, a.endAt),
      status: a.status as AppointmentStatus,
    })),
    activeServicesCount,
    inactiveServicesCount,
    activeDoctorsCount,
    todayShifts: todayShifts.map((s) => ({
      shiftId: s.shiftId,
      doctorId: s.doctorId,
      doctorName: s.doctor.fullName,
      slotLabel: formatTimeRange(s.startAt, s.endAt),
    })),
    upcomingShifts: upcomingShiftsRows.map((s) => ({
      shiftId: s.shiftId,
      doctorId: s.doctorId,
      doctorName: s.doctor.fullName,
      slotLabel: formatTimeRange(s.startAt, s.endAt),
    })),
  };
}
