import { recordAppointmentChange } from "./history";
import "server-only";

import { db, mapDatabaseConstraintError, type DbTransactionClient } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { requireActiveContext } from "@/server/authorization";
import { DomainError, parseInput } from "@/lib/errors";
import { validateCandidateSlot } from "@/modules/scheduling/availability";
import { buildEnterConfirmedNotifications, persistAppointmentNotifications, buildCancelNotifications } from "@/modules/notifications/server";
import {
  confirmAppointmentSchema,
  canTransitionAppointment,
  isOverduePending,
  cancelAppointmentSchema,
  canPatientSelfCancel,
  completeAppointmentSchema,
  canCompleteAppointment,
  isEarlyCompletion,
} from "@/modules/appointments/contracts";
import { AppointmentStatus } from "@/config/business";

async function lockAppointment(tx: DbTransactionClient, appointmentId: number) {
  await tx.$queryRaw`
    SELECT appointment_id FROM "appointments" WHERE appointment_id = ${appointmentId} FOR UPDATE
  `;
  const appointment = await tx.appointment.findUnique({ where: { appointmentId } });
  if (!appointment) throw new DomainError("NOT_FOUND", "Không tìm thấy lịch hẹn.", 404);
  return appointment;
}

export async function confirmAppointment(
  rawInput: unknown,
  explicitCtx?: AuthenticatedContext | null
): Promise<
  | {
    confirmed: false;
    requiresOverdueWarning: true;
    warningMessage: string;
  }
  | {
    confirmed: true;
    appointmentId: number;
    status: "CONFIRMED";
    doctorId: number;
  }
> {
  const ctx = await requireActiveContext(["RECEPTIONIST"], explicitCtx);
  const parsed = parseInput(confirmAppointmentSchema, rawInput, "Dữ liệu xác nhận lịch hẹn không hợp lệ.");

  const now = new Date();

  try {
    return await db.$transaction(async (tx) => {
    const appt = await lockAppointment(tx, parsed.appointmentId);

      if (appt.status !== "PENDING") {
        throw new DomainError(
          "INVALID_STATUS_TRANSITION",
          "Lịch hẹn không còn chờ xác nhận. Vui lòng tải lại trang.",
          409
        );
      }

      const targetDoctorId = parsed.doctorId ?? appt.doctorId;
      if (!targetDoctorId) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Vui lòng chọn bác sĩ phụ trách trước khi xác nhận lịch hẹn.",
          400
        );
      }

      await validateCandidateSlot(
        {
          patientId: appt.patientId,
          serviceId: appt.serviceId,
          doctorId: targetDoctorId,
          startAt: appt.startAt,
          mode: "CONFIRM",
          excludeAppointmentId: appt.appointmentId,
          fixedEndAt: appt.endAt,
        },
        tx
      );

      if (
        isOverduePending("PENDING", appt.startAt, now) &&
        !parsed.acknowledgeOverdueWarning
      ) {
        return {
          confirmed: false as const,
          requiresOverdueWarning: true as const,
          warningMessage:
            "Thời điểm bắt đầu của lịch hẹn này đã đến hoặc đã qua. Bạn có muốn tiếp tục xác nhận lịch hẹn tại khung giờ này hay đổi sang khung giờ khác?",
        };
      }

      await tx.appointment.update({
        where: { appointmentId: appt.appointmentId },
        data: {
          doctorId: targetDoctorId,
          status: "CONFIRMED",
        },
      });

      await recordAppointmentChange(tx, {
      actorUserId: ctx.userId, before: appt, changedAt: now,
      after: { ...appt, status: "CONFIRMED", doctorId: targetDoctorId },
    });

      const drafts = buildEnterConfirmedNotifications({
        appointmentId: appt.appointmentId,
        patientId: appt.patientId,
        doctorId: targetDoctorId,
        startAt: appt.startAt,
        createdAt: now,
      });
      await persistAppointmentNotifications(tx, drafts);

      return {
        confirmed: true as const,
        appointmentId: appt.appointmentId,
        status: "CONFIRMED" as const,
        doctorId: targetDoctorId,
      };
    });
  } catch (err) {
    mapDatabaseConstraintError(err);
  }
}

export async function cancelAppointment(
  rawInput: unknown,
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  appointmentId: number;
  status: "CANCELLED";
}> {
  const ctx = await requireActiveContext(["PATIENT", "RECEPTIONIST"], explicitCtx);
  const parsed = parseInput(cancelAppointmentSchema, rawInput, "Dữ liệu hủy lịch không hợp lệ.");

  const now = new Date();

  return db.$transaction(async (tx) => {
    const appt = await lockAppointment(tx, parsed.appointmentId);

    const currentStatus = appt.status as AppointmentStatus;

    if (ctx.activeContext === "PATIENT") {
      if (appt.patientId !== ctx.userId) {
        throw new DomainError(
          "FORBIDDEN",
          "Bạn không có quyền hủy lịch hẹn của người khác.",
          403
        );
      }

      const selfCheck = canPatientSelfCancel(currentStatus, appt.startAt, now);
      if (!selfCheck.allowed) {
        if (selfCheck.reason === "WITHIN_2_HOUR_CUTOFF") {
          throw new DomainError(
            "PATIENT_CANCEL_CUTOFF_EXCEEDED",
            "Bạn chỉ có thể tự hủy lịch trực tuyến trước giờ hẹn ít nhất 02 giờ. Vui lòng liên hệ Lễ tân phòng khám qua hotline 1900 0091 để được hỗ trợ.",
            409
          );
        }
        throw new DomainError(
          "INVALID_STATUS_TRANSITION",
          "Lịch hẹn này hiện không thể hủy trực tuyến.",
          409
        );
      }
    } else {
      if (!canTransitionAppointment(currentStatus, "CANCELLED")) {
        throw new DomainError(
          "INVALID_STATUS_TRANSITION",
          "Chỉ lịch hẹn đang chờ xác nhận hoặc đã xác nhận mới có thể hủy.",
          409
        );
      }
    }

    await tx.appointment.update({
      where: { appointmentId: appt.appointmentId },
      data: {
        status: "CANCELLED",
      },
    });

    await recordAppointmentChange(tx, {
      actorUserId: ctx.userId, before: appt, changedAt: now,
      after: { ...appt, status: "CANCELLED" },
    });

    const drafts = buildCancelNotifications({
      appointmentId: appt.appointmentId,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      createdAt: now,
    });
    await persistAppointmentNotifications(tx, drafts);

    return {
      appointmentId: appt.appointmentId,
      status: "CANCELLED" as const,
    };
  });
}

export async function completeAppointment(
  rawInput: unknown,
  explicitCtx?: AuthenticatedContext | null
): Promise<
  | {
    completed: false;
    requiresEarlyWarning: true;
    warningMessage: string;
  }
  | {
    completed: true;
    appointmentId: number;
    status: "COMPLETED";
  }
> {
  const ctx = await requireActiveContext(["DOCTOR", "RECEPTIONIST"], explicitCtx);
  const parsed = parseInput(completeAppointmentSchema, rawInput, "Dữ liệu hoàn tất lịch hẹn không hợp lệ.");

  const now = new Date();

  return db.$transaction(async (tx) => {
    const appt = await lockAppointment(tx, parsed.appointmentId);

    const currentStatus = appt.status as AppointmentStatus;
    const perm = canCompleteAppointment({
      actorRole: ctx.activeContext,
      actorUserId: ctx.userId,
      status: currentStatus,
      doctorId: appt.doctorId,
    });

    if (!perm.allowed) {
      if (perm.reason === "NOT_ASSIGNED_DOCTOR") {
        throw new DomainError(
          "FORBIDDEN",
          "Chỉ bác sĩ phụ trách mới được hoàn tất lịch hẹn này.",
          403
        );
      }
      if (perm.reason === "FORBIDDEN_ROLE") {
        throw new DomainError(
          "FORBIDDEN",
          "Bạn không có quyền hoàn tất lịch hẹn.",
          403
        );
      }
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Chỉ có thể hoàn tất lịch hẹn đã xác nhận và có bác sĩ phụ trách.",
        409
      );
    }

    if (
      isEarlyCompletion(appt.startAt, now) &&
      !parsed.acknowledgeEarlyWarning
    ) {
      return {
        completed: false as const,
        requiresEarlyWarning: true as const,
        warningMessage:
          "Chưa đến giờ hẹn. Người khám bệnh đã khám xong và bạn muốn hoàn tất lịch hẹn?",
      };
    }

    await tx.appointment.update({
      where: { appointmentId: appt.appointmentId },
      data: {
        status: "COMPLETED",
      },
    });

    await recordAppointmentChange(tx, {
      actorUserId: ctx.userId, before: appt, changedAt: now,
      after: { ...appt, status: "COMPLETED" },
    });

    return {
      completed: true as const,
      appointmentId: appt.appointmentId,
      status: "COMPLETED" as const,
    };
  });
}
