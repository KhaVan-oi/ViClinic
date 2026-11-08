import { formatClinicDateTime } from "@/lib/dates";

export interface NotificationDraft {
  recipientUserId: number;
  appointmentId: number;
  content: string;
  createdAt: Date;
}

export interface NotificationItemDto {
  notificationId: number;
  appointmentId: number;
  content: string;
  createdAtIso: string;
  readAtIso: string | null;
  createdAtLabel: string;
  appointmentStatus: string;
  serviceName: string;
}

export function buildEnterConfirmedNotifications(input: {
  appointmentId: number;
  patientId: number;
  doctorId: number;
  startAt: Date;
  createdAt: Date;
}): NotificationDraft[] {
  const formatted = formatClinicDateTime(input.startAt, "dd/MM/yyyy HH:mm");
  return [
    {
      recipientUserId: input.patientId,
      appointmentId: input.appointmentId,
      content: `Lịch hẹn ${input.appointmentId} đã được xác nhận vào ${formatted}.`,
      createdAt: input.createdAt,
    },
    {
      recipientUserId: input.doctorId,
      appointmentId: input.appointmentId,
      content: `Bạn có lịch hẹn ${input.appointmentId} vào ${formatted}.`,
      createdAt: input.createdAt,
    },
  ];
}

export function buildRescheduleNotifications(input: {
  appointmentId: number;
  patientId: number;
  oldDoctorId: number | null;
  newDoctorId: number | null;
  oldStartAt: Date;
  newStartAt: Date;
  createdAt: Date;
  serviceChanged?: boolean;
}): NotificationDraft[] {
  const formatted = formatClinicDateTime(input.newStartAt, "dd/MM/yyyy HH:mm");
  const doctorChanged = input.oldDoctorId !== input.newDoctorId;
  const timeChanged = input.oldStartAt.getTime() !== input.newStartAt.getTime();

  const drafts: NotificationDraft[] = [];
  function add(recipientUserId: number, content: string) {
    drafts.push({ recipientUserId, appointmentId: input.appointmentId, content, createdAt: input.createdAt });
  }
  if (input.serviceChanged) {
    drafts.push(...[...new Set([input.patientId,input.oldDoctorId,input.newDoctorId].filter((id): id is number => id !== null))].map(recipientUserId=>({recipientUserId,appointmentId:input.appointmentId,createdAt:input.createdAt,content:`Lịch hẹn ${input.appointmentId} đã đổi dịch vụ. Giờ khám mới: ${formatted}. Vui lòng kiểm tra phiếu hẹn.`})));
    return drafts;
  }

  if (doctorChanged) {
    add(input.patientId, timeChanged
        ? `Lịch hẹn ${input.appointmentId} đã được đổi bác sĩ và thời gian.`
        : `Bác sĩ của lịch hẹn ${input.appointmentId} đã được thay đổi.`);
    if (input.oldDoctorId !== null) {
      add(input.oldDoctorId, `Lịch hẹn ${input.appointmentId} không còn được phân công cho bạn.`);
    }
    if (input.newDoctorId !== null) {
      add(input.newDoctorId, `Bạn được phân công lịch hẹn ${input.appointmentId} vào ${formatted}.`);
    }
    return drafts;
  }

  if (timeChanged) {
    add(input.patientId, `Lịch hẹn ${input.appointmentId} đã được đổi sang ${formatted}.`);
    if (input.newDoctorId !== null) {
      add(input.newDoctorId, `Lịch hẹn ${input.appointmentId} của bạn đã đổi sang ${formatted}.`);
    }
  }

  return drafts;
}

export function buildCancelNotifications(input: {
  appointmentId: number;
  patientId: number;
  doctorId: number | null;
  createdAt: Date;
}): NotificationDraft[] {
  return [input.patientId, ...(input.doctorId === null ? [] : [input.doctorId])].map(recipientUserId => ({
    recipientUserId,
    appointmentId: input.appointmentId,
    content: `Lịch hẹn ${input.appointmentId} đã được hủy.`,
    createdAt: input.createdAt,
  }));
}

