import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";

import { getClinicDayEndExclusive, getClinicDayStart, parseClinicDateTime, formatTimeRange } from "@/lib/dates";

import { db, type DbTransactionClient } from "@/server/db";
import { detectAppointmentScheduleDisruption, AffectedAppointmentPreviewItemDto, ScheduleImpactPreviewDto } from "@/modules/scheduling/contracts";

type ImpactAppointment = Prisma.AppointmentGetPayload<{
  include: { service: true; doctor: true };
}> & { patient?: { fullName: string } };

export function mapAffectedAppointment(
  appt: ImpactAppointment,
  reasons: AffectedAppointmentPreviewItemDto["reasons"],
): AffectedAppointmentPreviewItemDto {
  return {
    appointmentId: appt.appointmentId,
    serviceId: appt.serviceId,
    serviceName: appt.service.name,
    doctorId: appt.doctorId,
    doctorName: appt.doctor?.fullName ?? null,
    ...(appt.patient ? { patientName: appt.patient.fullName } : {}),
    startAtIso: appt.startAt.toISOString(),
    endAtIso: appt.endAt.toISOString(),
    timeRangeLabel: formatTimeRange(appt.startAt, appt.endAt),
    status: appt.status,
    reasons,
  };
}

export async function previewShiftChangeImpactInternal(input: {
  shiftId?: number;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
}, client: DbTransactionClient = db): Promise<ScheduleImpactPreviewDto> {
  const proposedStart = parseClinicDateTime(`${input.date} ${input.startTime}`);
  const proposedEnd = parseClinicDateTime(`${input.date} ${input.endTime}`);

  // L1: khi sửa ca, phải xét cả khoảng thời gian của ca CŨ (có thể ở ngày khác),
  // nếu không lịch hẹn ở ngày cũ sẽ mất ca mà không được cảnh báo.
  const original = input.shiftId
    ? await client.doctorShift.findUnique({ where: { shiftId: input.shiftId } })
    : null;
  const windowStarts = [getClinicDayStart(input.date)];
  const windowEnds = [getClinicDayEndExclusive(input.date)];
  if (original) {
    windowStarts.push(original.startAt);
    windowEnds.push(original.endAt);
  }
  const rangeStart = new Date(Math.min(...windowStarts.map(d => d.getTime())));
  const rangeEnd = new Date(Math.max(...windowEnds.map(d => d.getTime())));
  const inspectedWindows = windowStarts.map((startAt, i) => ({ startAt, endAt: windowEnds[i] }));

  const [existingShifts, unavailabilities, candidateAppointments] = await Promise.all([
    client.doctorShift.findMany({
      where: {
        doctorId: input.doctorId,
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
    }),
    client.doctorUnavailability.findMany({
      where: {
        doctorId: input.doctorId,
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
    }),
    client.appointment.findMany({
      where: {
        doctorId: input.doctorId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      include: {
        service: true,
        doctor: true,
      },
      orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
    }),
  ]);
  const activeAppointments = candidateAppointments.filter(appt =>
    inspectedWindows.some(w => appt.startAt < w.endAt && appt.endAt > w.startAt)
  );

  const simulatedShifts = existingShifts
    .filter((sh) => sh.shiftId !== input.shiftId)
    .map((sh) => ({ startAt: sh.startAt, endAt: sh.endAt }));
  simulatedShifts.push({ startAt: proposedStart, endAt: proposedEnd });

  const affectedAppointments: AffectedAppointmentPreviewItemDto[] = [];
  for (const appt of activeAppointments) {
    const reasons = detectAppointmentScheduleDisruption({
      startAt: appt.startAt,
      endAt: appt.endAt,
      doctorShifts: simulatedShifts,
      doctorUnavailabilities: unavailabilities,
    });
    if (reasons.includes("OUTSIDE_SHIFT")) {
      affectedAppointments.push(mapAffectedAppointment(appt, reasons));
    }
  }

  return {
    hasImpact: affectedAppointments.length > 0,
    affectedCount: affectedAppointments.length,
    affectedAppointments,
  };
}

export async function previewUnavailabilityImpactInternal(input: {
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
}, client: DbTransactionClient = db): Promise<ScheduleImpactPreviewDto> {
  const proposedStart = parseClinicDateTime(`${input.date} ${input.startTime}`);
  const proposedEnd = parseClinicDateTime(`${input.date} ${input.endTime}`);

  const overlappingActive = await client.appointment.findMany({
    where: {
      doctorId: input.doctorId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: proposedEnd },
      endAt: { gt: proposedStart },
    },
    include: {
      service: true,
      doctor: true,
      patient: true,
    },
    orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
  });

  const affectedAppointments = overlappingActive.map((appt) =>
    mapAffectedAppointment(appt, ["UNAVAILABILITY_CONFLICT"])
  );

  return {
    hasImpact: affectedAppointments.length > 0,
    affectedCount: affectedAppointments.length,
    affectedAppointments,
  };
}

export const getAllAffectedActiveAppointmentsMap = cache(async function getAllAffectedActiveAppointmentsMap(): Promise<
  Map<number, AffectedAppointmentPreviewItemDto>
> {
  const [activeAssigned, allShifts, allUnavailabilities] = await Promise.all([
    db.appointment.findMany({
      where: {
        doctorId: { not: null },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        service: true,
        doctor: true,
        patient: true,
      },
      orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
    }),
    db.doctorShift.findMany(),
    db.doctorUnavailability.findMany(),
  ]);

  const shiftsByDoc = Map.groupBy(allShifts, row => row.doctorId);
  const unavByDoc = Map.groupBy(allUnavailabilities, row => row.doctorId);

  const affectedMap = new Map<number, AffectedAppointmentPreviewItemDto>();
  for (const appt of activeAssigned) {
    if (appt.doctorId === null) continue;
    const reasons = detectAppointmentScheduleDisruption({
      startAt: appt.startAt,
      endAt: appt.endAt,
      doctorShifts: shiftsByDoc.get(appt.doctorId) ?? [],
      doctorUnavailabilities: unavByDoc.get(appt.doctorId) ?? [],
    });

    if (reasons.length > 0) {
      affectedMap.set(appt.appointmentId, mapAffectedAppointment(appt, reasons));
    }
  }

  return affectedMap;
});
