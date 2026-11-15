import { recordAppointmentChange } from "./history";
import "server-only";

import { db, mapDatabaseConstraintError } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { requireActiveContext } from "@/server/authorization";
import { DomainError, parseInput } from "@/lib/errors";
import { parseClinicDateTime } from "@/lib/dates";
import { validateCandidateSlot } from "@/modules/scheduling/availability";
import { assertValidNewBookingHorizon } from "@/modules/scheduling/contracts";
import { buildEnterConfirmedNotifications, persistAppointmentNotifications, buildRescheduleNotifications } from "@/modules/notifications/server";
import { createConfirmedAppointmentSchema, createPendingAppointmentSchema, rescheduleAppointmentSchema } from "@/modules/appointments/contracts";
import { AppointmentStatus } from "@/config/business";

type CreatedAppointment<S extends "PENDING" | "CONFIRMED"> = {
  appointmentId: number;
  status: S;
  startAtIso: string;
  endAtIso: string;
};

async function createAppointmentRecord<S extends "PENDING" | "CONFIRMED">(
  ctx: AuthenticatedContext,
  input: { patientId: number; serviceId: number; doctorId: number | null; startAt: Date; },
  status: S,
): Promise<CreatedAppointment<S>> {
  const now = new Date();
  try {
    return await db.$transaction(async tx => {
      if (ctx.activeContext === "RECEPTIONIST") {
        const patientRole = await tx.userRole.findUnique({
          where: { userId_role: { userId: input.patientId, role: "PATIENT" } },
        });
        if (!patientRole) throw new DomainError("NOT_FOUND", "Không tìm thấy người khám bệnh được chọn.", 404);
      }
      const slot = await validateCandidateSlot({ ...input, mode: "CREATE" }, tx);
      const appointment = await tx.appointment.create({
        data: {
          patientId: input.patientId,
          serviceId: input.serviceId,
          doctorId: input.doctorId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          status,
        },
      });
      await recordAppointmentChange(tx, { actorUserId: ctx.userId, before: null, after: appointment, changedAt: now });
      if (status === "CONFIRMED" && input.doctorId !== null) {
        const drafts = buildEnterConfirmedNotifications({
          appointmentId: appointment.appointmentId,
          patientId: input.patientId,
          doctorId: input.doctorId,
          startAt: slot.startAt,
          createdAt: now,
        });
        await persistAppointmentNotifications(tx, drafts);
      }
      return {
        appointmentId: appointment.appointmentId,
        status,
        startAtIso: slot.startAt.toISOString(),
        endAtIso: slot.endAt.toISOString(),
      };
    });
  } catch (error) {
    mapDatabaseConstraintError(error);
  }
}

export async function createPendingAppointment(
  rawInput: unknown,
  explicitCtx?: AuthenticatedContext | null,
): Promise<CreatedAppointment<"PENDING">> {
  const ctx = await requireActiveContext(["PATIENT", "RECEPTIONIST"], explicitCtx);
  const input = parseInput(createPendingAppointmentSchema, rawInput, "Dữ liệu đặt lịch không hợp lệ.");
  const startAt = parseClinicDateTime(input.startAtIso);
  if (Number.isNaN(startAt.getTime())) throw new DomainError("VALIDATION_ERROR", "Khung giờ bắt đầu không hợp lệ.");
  const patientId = ctx.activeContext === "PATIENT" ? ctx.userId : input.patientUserId ?? input.patientId;
  if (!patientId) throw new DomainError("VALIDATION_ERROR", "Vui lòng chọn người khám bệnh.");
  return createAppointmentRecord(ctx, {
    patientId,
    serviceId: input.serviceId,
    doctorId: input.doctorId ?? null,
    startAt,
  }, "PENDING");
}

export async function createConfirmedAppointment(
  rawInput: unknown,
  explicitCtx?: AuthenticatedContext | null,
): Promise<CreatedAppointment<"CONFIRMED">> {
  const ctx = await requireActiveContext(["RECEPTIONIST"], explicitCtx);
  const input = parseInput(createConfirmedAppointmentSchema, rawInput, "Dữ liệu tạo lịch hẹn không hợp lệ.");
  const startAt = parseClinicDateTime(input.startAtIso);
  if (Number.isNaN(startAt.getTime())) throw new DomainError("VALIDATION_ERROR", "Khung giờ bắt đầu không hợp lệ.");
  return createAppointmentRecord(ctx, {
    patientId: input.patientId,
    serviceId: input.serviceId,
    doctorId: input.doctorId,
    startAt,
  }, "CONFIRMED");
}

export async function rescheduleAppointment(
  rawInput: unknown,
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  appointmentId: number;
  status: "PENDING" | "CONFIRMED";
  doctorId: number | null;
  startAtIso: string;
  endAtIso: string;
}> {
  const ctx = await requireActiveContext(["RECEPTIONIST", "PATIENT"], explicitCtx);
  const parsed = parseInput(rescheduleAppointmentSchema, rawInput, "Dữ liệu đổi lịch không hợp lệ.");

  const newStartAt = parseClinicDateTime(parsed.startAtIso);
  if (Number.isNaN(newStartAt.getTime())) {
    throw new DomainError("VALIDATION_ERROR", "Khung giờ bắt đầu mới không hợp lệ.");
  }

  const now = new Date();

  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT appointment_id FROM "appointments" WHERE appointment_id = ${parsed.appointmentId} FOR UPDATE
      `;

      const appt = await tx.appointment.findUnique({
        where: { appointmentId: parsed.appointmentId },
      });

      if (!appt) {
        throw new DomainError("NOT_FOUND", "Không tìm thấy lịch hẹn.", 404);
      }

      if (ctx.activeContext === "PATIENT") {
        if (appt.patientId !== ctx.userId) throw new DomainError("NOT_FOUND", "Không tìm thấy lịch hẹn.", 404);
        if (appt.status !== "PENDING" || appt.startAt <= now) throw new DomainError("INVALID_STATUS_TRANSITION", "Không thể tự đổi lịch hẹn này. Vui lòng liên hệ phòng khám để được hỗ trợ.", 409);
        assertValidNewBookingHorizon(newStartAt, now);
      }

      if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
        throw new DomainError(
          "INVALID_STATUS_TRANSITION",
          "Chỉ lịch hẹn đang chờ xác nhận hoặc đã xác nhận mới có thể đổi sang khung giờ khác.",
          409
        );
      }

      const targetDoctorId =
        parsed.doctorId !== undefined ? parsed.doctorId : appt.doctorId;
      const targetServiceId = parsed.serviceId ?? appt.serviceId;
      const serviceChanged = targetServiceId !== appt.serviceId;
      if (serviceChanged && appt.startAt <= new Date()) throw new DomainError("INVALID_STATUS_TRANSITION", "Không thể đổi dịch vụ khi đã đến giờ khám.", 409);

      if (appt.status === "CONFIRMED" && targetDoctorId === null) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Lịch hẹn đã xác nhận bắt buộc phải có bác sĩ phụ trách khi đổi lịch.",
          400
        );
      }

      const slot = await validateCandidateSlot(
        {
          patientId: appt.patientId,
          serviceId: targetServiceId,
          doctorId: targetDoctorId,
          startAt: newStartAt,
          mode: "RESCHEDULE",
          excludeAppointmentId: appt.appointmentId,
        },
        tx
      );

      const doctorChanged = appt.doctorId !== targetDoctorId;
      const timeChanged =
        appt.startAt.getTime() !== slot.startAt.getTime() ||
        appt.endAt.getTime() !== slot.endAt.getTime();

      if (!serviceChanged && !doctorChanged && !timeChanged) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Bác sĩ và khung giờ khám mới trùng với thông tin hiện tại của lịch hẹn.",
          400
        );
      }

      await tx.appointment.update({
        where: { appointmentId: appt.appointmentId },
        data: {
          serviceId: targetServiceId,
          doctorId: targetDoctorId,
          startAt: slot.startAt,
          endAt: slot.endAt,
        },
      });

      const status = appt.status as AppointmentStatus & ("PENDING" | "CONFIRMED");

      await recordAppointmentChange(tx, {
        actorUserId: ctx.userId, before: appt, changedAt: now,
        after: { ...appt, doctorId: targetDoctorId, serviceId: targetServiceId, startAt: slot.startAt, endAt: slot.endAt },
      });

      const drafts = buildRescheduleNotifications({
        appointmentId: appt.appointmentId,
        patientId: appt.patientId,
        oldDoctorId: appt.doctorId,
        newDoctorId: targetDoctorId,
        oldStartAt: appt.startAt,
        newStartAt: slot.startAt,
        createdAt: now,
        serviceChanged,
      });
      await persistAppointmentNotifications(tx, drafts);

      return {
        appointmentId: appt.appointmentId,
        status,
        doctorId: targetDoctorId,
        startAtIso: slot.startAt.toISOString(),
        endAtIso: slot.endAt.toISOString(),
      };
    });
  } catch (err) {
    mapDatabaseConstraintError(err);
  }
}
