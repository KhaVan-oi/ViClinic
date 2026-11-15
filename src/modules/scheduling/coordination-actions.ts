"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireActiveContext } from "@/server/authorization";
import { formatTimeRange } from "@/lib/dates";
import { isDomainError } from "@/lib/errors";

export async function previewAffectedAppointment(appointmentId: number) {
  const ctx = await requireActiveContext([
    "CLINIC_MANAGER",
    "RECEPTIONIST",
    "DOCTOR",
  ]);
  const id = z.number().int().positive().safeParse(appointmentId);
  if (!id.success) return { error: "Mã lịch hẹn không hợp lệ." };
  const appointment = await db.appointment.findFirst({
    where: {
      appointmentId,
      ...(ctx.activeContext === "DOCTOR" ? { doctorId: ctx.userId } : {}),
    },
    select: {
      appointmentId: true,
      status: true,
      startAt: true,
      endAt: true,
      doctor: { select: { fullName: true } },
      service: { select: { name: true } },
      patient: { select: { fullName: true, phone: true } },
    },
  });
  if (!appointment)
    return { error: "Không tìm thấy lịch hẹn hoặc bạn không có quyền xem." };
  return {
    appointment: {
      appointmentId,
      status: appointment.status,
      slot: formatTimeRange(appointment.startAt, appointment.endAt),
      doctor: appointment.doctor?.fullName ?? "Chưa phân công",
      service: appointment.service.name,
      patient:
        ctx.activeContext === "CLINIC_MANAGER"
          ? undefined
          : appointment.patient.fullName,
      phone:
        ctx.activeContext === "RECEPTIONIST"
          ? appointment.patient.phone
          : undefined,
    },
  };
}

export async function sendCoordinationRequest(ids: number[], reason = "Cần kiểm tra trước khi thay đổi lịch làm việc hoặc dịch vụ.") {
  const ctx = await requireActiveContext(["CLINIC_MANAGER", "DOCTOR"]);
  const parsed = z
    .array(z.number().int().positive())
    .min(1)
    .max(1000)
    .safeParse(ids);
  if (!parsed.success)
    return { error: "Danh sách lịch hẹn không hợp lệ (tối đa 1.000 lịch)." };
  const reasonText = z.string().trim().min(1).max(250).safeParse(reason);
  if (!reasonText.success) return {error:"Nội dung yêu cầu điều phối không hợp lệ."};
  try {
    const now = new Date();
    const appointments = await db.appointment.findMany({
      where: {
        appointmentId: { in: [...new Set(ids)] },
        status: { in: ["PENDING", "CONFIRMED"] },
        endAt: { gt: now },
        ...(ctx.activeContext === "DOCTOR" ? { doctorId: ctx.userId } : {}),
      },
      select: { appointmentId: true, patientId: true },
    });
    if (appointments.length !== new Set(ids).size)
      return {
        error:
          "Có lịch đã thay đổi trạng thái hoặc không thuộc phạm vi của bạn. Tải lại danh sách trước khi gửi.",
      };
    const recipients = await db.user.findMany({
      where: {
        roles: { some: { role: "RECEPTIONIST" } },
        account: { status: "ACTIVE" },
      },
      select: { userId: true },
    });
    if (!recipients.length)
      return { error: "Chưa có lễ tân đang hoạt động để nhận yêu cầu." };
    const recent = await db.notification.findMany({
      where: {
        appointmentId: { in: ids },
        createdAt: { gte: new Date(now.getTime() - 300000) },
        content: { startsWith: "Yêu cầu điều phối:" },
      },
      select: { appointmentId: true, recipientUserId: true },
    });
    const known = new Set(
      recent.map((item) => `${item.appointmentId}:${item.recipientUserId}`),
    );
    const data = appointments.flatMap((appointment) =>
      recipients
        .filter(
          (recipient) =>
            recipient.userId !== appointment.patientId &&
            !known.has(`${appointment.appointmentId}:${recipient.userId}`),
        )
        .map((recipient) => ({
          appointmentId: appointment.appointmentId,
          recipientUserId: recipient.userId,
          createdAt: now,
          content: `Yêu cầu điều phối: lịch hẹn VC-${String(appointment.appointmentId).padStart(6, "0")}. ${reasonText.data}`,
        })),
    );
    if (data.length) await db.notification.createMany({ data });
    revalidatePath("/reception");
    revalidatePath("/reception/notifications");
    return { sent: appointments.length };
  } catch (error) {
    return {
      error: isDomainError(error)
        ? error.message
        : "Không gửi được yêu cầu. Vui lòng thử lại.",
    };
  }
}

export async function getCoordinationRequestState(ids: number[]) {
  const ctx = await requireActiveContext(["CLINIC_MANAGER", "DOCTOR"]);
  const parsed = z.array(z.number().int().positive()).min(1).max(1000).parse(ids);
  const appointments = await db.appointment.findMany({
    where: { appointmentId: {in:parsed}, ...(ctx.activeContext === "DOCTOR" ? {doctorId:ctx.userId} : {}) },
    select: { history: {orderBy:{changedAt:"desc"},take:1,select:{changedAt:true}}, notifications: {where:{content:{startsWith:"Yêu cầu điều phối:"}},orderBy:{createdAt:"desc"},take:1,select:{createdAt:true}} },
  });
  return appointments.length === new Set(parsed).size && appointments.every(item => item.notifications[0] && item.notifications[0].createdAt > (item.history[0]?.changedAt ?? new Date(0)));
}
