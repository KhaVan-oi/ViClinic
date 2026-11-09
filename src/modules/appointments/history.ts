import "server-only";
import type { Appointment } from "@/generated/prisma/client";
import type { DbTransactionClient } from "@/server/db";

type AppointmentSnapshot = Pick<Appointment, "appointmentId" | "serviceId" | "doctorId" | "status" | "startAt" | "endAt">;

export function recordAppointmentChange(tx: DbTransactionClient, input: {
  actorUserId: number;
  before: AppointmentSnapshot | null;
  after: AppointmentSnapshot;
  changedAt: Date;
}) {
  const { before, after } = input;
  return tx.appointmentHistory.create({ data: {
    appointmentId: after.appointmentId,
    actorUserId: input.actorUserId,
    oldDoctorId: before?.doctorId ?? null,
    newDoctorId: after.doctorId,
    oldServiceId: before?.serviceId ?? null,
    newServiceId: after.serviceId,
    oldStatus: before?.status ?? null,
    newStatus: after.status,
    oldStartAt: before?.startAt ?? null,
    newStartAt: after.startAt,
    oldEndAt: before?.endAt ?? null,
    newEndAt: after.endAt,
    changedAt: input.changedAt,
  } });
}
