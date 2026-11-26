"use server";

import { createCompleteAppointmentAction, readBookingForm } from "@/modules/appointments/actions";
import { redirect } from "next/navigation";
import { createPatientContext, completePatientContext, updatePatientBasicProfile } from "@/modules/patients/server";
import { cancelAppointment, confirmAppointment } from "@/modules/appointments/transitions";
import { createConfirmedAppointment, createPendingAppointment, rescheduleAppointment } from "@/modules/appointments/booking";
import { createSafeAction, encodeActionError } from "@/server/actions";
import { getReceptionAppointmentById } from "@/modules/appointments/queries";
import { getAvailableSlots } from "@/modules/scheduling/availability";
import { formatClinicIsoDate, getClinicDayStart, getClinicDayEndExclusive } from "@/lib/dates";
import { addDays } from "date-fns";
import { normalizeVietnamPhone } from "@/lib/profile";
import { db } from "@/server/db";

export async function suggestNearestAppointment(appointmentId: number, serviceId?: number) {
  const appointment = await getReceptionAppointmentById(appointmentId);
  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) return { error: "Lịch hẹn này không còn được đổi giờ." };
  const today = formatClinicIsoDate(new Date());
  for (let offset = 0; offset < 30; offset++) {
    const date = formatClinicIsoDate(addDays(getClinicDayStart(today), offset));
    const slots = await getAvailableSlots({ serviceId: serviceId ?? appointment.serviceId, date, patientId: appointment.patientId, excludeAppointmentId: appointmentId, enforceHorizon: false });
    const slot = slots.find(candidate => !candidate.patientConflicts?.length);
    if (!slot) continue;
    const loads = await db.appointment.groupBy({ by: ["doctorId"], where: { doctorId: { in: slot.eligibleDoctorIds }, appointmentId: { not: appointmentId }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] }, startAt: { gte: getClinicDayStart(date), lt: getClinicDayEndExclusive(date) } }, _count: { _all: true } });
    const count = (id: number) => loads.find(row => row.doctorId === id)?._count._all ?? 0;
    const doctorId = slot.eligibleDoctorIds.toSorted((a,b) => count(a)-count(b) || a-b)[0];
    return { href: `/reception/appointments/${appointmentId}?${new URLSearchParams({ action: "RESCHEDULE", reschedDate: date, reschedServiceId:String(serviceId ?? appointment.serviceId), reschedDoctorId: String(doctorId), suggestedStart: slot.startAtIso })}` };
  }
  return { error: "Chưa có giờ phù hợp trong 30 ngày tới. Chọn ngày khác để tìm thêm." };
}

export const receptionCreatePatientAction = createSafeAction({
  parse: (formData) => ({
    phone: String(formData.get("phone") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    returnTo: String(formData.get("returnTo") ?? "patients").trim(),
  }),
  handler: async (input) => {
    const existing = await db.user.findUnique({ where: { phone: normalizeVietnamPhone(input.phone) }, select: { userId: true } });
    if (existing) return completePatientContext({ userId: existing.userId, fullName: input.fullName, birthDate: input.birthDate, email: input.email || null });
    return createPatientContext({
      phone: input.phone,
      fullName: input.fullName,
      birthDate: input.birthDate,
      email: input.email || null,
    });
  },
  revalidatePaths: ["/reception", "/reception/patients"],
  redirectTo: (output, input) => {
    if (input.returnTo === "booking") {
      return `/reception/appointments/new?patientId=${output.userId}&createdPatient=1`;
    }
    return `/reception/patients/${output.userId}?created=1`;
  },
  onErrorRedirect: (err, input) => {
    if (input.returnTo === "booking") {
      return `/reception/appointments/new?error=${encodeActionError(err)}`;
    }
    return `/reception/patients?error=${encodeActionError(err)}`;
  },
});

export const receptionUpdatePatientAction = createSafeAction({
  parse: (formData) => ({
    userId: Number(formData.get("userId") ?? 0),
    fullName: String(formData.get("fullName") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
  }),
  handler: async (input) => {
    return await updatePatientBasicProfile({
      userId: input.userId,
      fullName: input.fullName,
      birthDate: input.birthDate,
      email: input.email || null,
    });
  },
  revalidatePaths: ["/reception/patients"],
  redirectTo: (_, input) => `/reception/patients/${input.userId}?updated=1`,
  onErrorRedirect: (err, input) =>
    `/reception/patients/${input.userId}?error=${encodeActionError(err)}`,
});

export const receptionCreateConfirmedAppointmentAction = createSafeAction({
  parse: (formData) => ({
    ...readBookingForm(formData),
    patientId: Number(formData.get("patientId") ?? 0),
    doctorId: Number(formData.get("doctorId") ?? 0),
  }),
  handler: async (input) => {
    return await createConfirmedAppointment({
      patientId: input.patientId,
      serviceId: input.serviceId,
      doctorId: input.doctorId,
      startAtIso: input.startAtIso,
    });
  },
  revalidatePaths: ["/reception", "/reception/appointments"],
  redirectTo: (output) =>
    `/reception/appointments/${output.appointmentId}?created=1`,
  onErrorRedirect: (err, input) =>
    `/reception/appointments/new?patientId=${input.patientId}&serviceId=${input.serviceId
    }&doctorId=${input.doctorId}&date=${encodeURIComponent(
      input.date
    )}&error=${encodeActionError(err)}`,
});

export const receptionCreatePendingAppointmentAction = createSafeAction({
  parse: (formData) => ({
    ...readBookingForm(formData),
    patientId: Number(formData.get("patientId") ?? 0),
  }),
  handler: async (input) => {
    return await createPendingAppointment({
      patientId: input.patientId,
      serviceId: input.serviceId,
      doctorId: input.doctorId,
      startAtIso: input.startAtIso,
    });
  },
  revalidatePaths: ["/reception", "/reception/appointments"],
  redirectTo: (output) =>
    `/reception/appointments/${output.appointmentId}?created=1`,
  onErrorRedirect: (err, input) =>
    `/reception/appointments/new?patientId=${input.patientId}&serviceId=${input.serviceId
    }${input.doctorId ? `&doctorId=${input.doctorId}` : ""}&date=${encodeURIComponent(
      input.date
    )}&error=${encodeActionError(err)}`,
});

export const receptionConfirmAppointmentAction = createSafeAction({
  parse: (formData) => {
    const doctorIdRaw = String(formData.get("doctorId") ?? "").trim();
    return {
      appointmentId: Number(formData.get("appointmentId") ?? 0),
      doctorId:
        doctorIdRaw && Number(doctorIdRaw) > 0 ? Number(doctorIdRaw) : null,
      acknowledgeOverdueWarning:
        formData.get("acknowledgeOverdueWarning") === "true",
    };
  },
  handler: async ({ appointmentId, doctorId, acknowledgeOverdueWarning }) => {
    const res = await confirmAppointment({
      appointmentId,
      doctorId,
      acknowledgeOverdueWarning,
    });
    if (!res.confirmed && res.requiresOverdueWarning) {
      redirect(
        `/reception/appointments/${appointmentId}?overdueWarning=1${doctorId ? `&pendingDoctorId=${doctorId}` : ""
        }&warningMsg=${encodeURIComponent(res.warningMessage)}`
      );
    }
    return res;
  },
  revalidatePaths: ["/reception", "/reception/appointments"],
  redirectTo: (_, { appointmentId }) =>
    `/reception/appointments/${appointmentId}?confirmed=1`,
  onErrorRedirect: (err, { appointmentId }) =>
    `/reception/appointments/${appointmentId}?error=${encodeActionError(err)}`,
});

export const receptionRescheduleAppointmentAction = createSafeAction({
  parse: (formData) => {
    const doctorIdRaw = String(formData.get("doctorId") ?? "").trim();
    return {
      appointmentId: Number(formData.get("appointmentId") ?? 0),
      serviceId: formData.get("serviceId") ? Number(formData.get("serviceId")) : undefined,
      doctorId:
        doctorIdRaw && Number(doctorIdRaw) > 0 ? Number(doctorIdRaw) : null,
      startAtIso: String(formData.get("startAtIso") ?? "").trim(),
      reschedDate: String(formData.get("reschedDate") ?? "").trim(),
    };
  },
  handler: input => rescheduleAppointment(input),
  revalidatePaths: ["/reception", "/reception/appointments"],
  redirectTo: (_, { appointmentId }) =>
    `/reception/appointments/${appointmentId}?rescheduled=1`,
  onErrorRedirect: (err, { appointmentId, reschedDate, doctorId, serviceId }) =>
    `/reception/appointments/${appointmentId}?reschedDate=${encodeURIComponent(
      reschedDate
    )}&action=RESCHEDULE&reschedDoctorId=${doctorId ?? ""}&reschedServiceId=${serviceId ?? ""}&error=${encodeActionError(err)}`,
});

export const receptionCancelAppointmentAction = createSafeAction({
  parse: (formData) => ({
    appointmentId: Number(formData.get("appointmentId") ?? 0),
  }),
  handler: input => cancelAppointment(input),
  revalidatePaths: ["/reception", "/reception/appointments"],
  redirectTo: (_, { appointmentId }) =>
    `/reception/appointments/${appointmentId}?cancelled=1`,
  onErrorRedirect: (err, { appointmentId }) =>
    `/reception/appointments/${appointmentId}?action=CANCEL&error=${encodeActionError(err)}`,
});

export const receptionCompleteAppointmentAction = createCompleteAppointmentAction("reception");
