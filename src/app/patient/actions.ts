"use server";

import { readBookingForm } from "@/modules/appointments/actions";
import { cancelAppointment } from "@/modules/appointments/transitions";
import { createPendingAppointment, rescheduleAppointment } from "@/modules/appointments/booking";
import { createSafeAction, encodeActionError } from "@/server/actions";

export const patientBookAppointmentAction = createSafeAction({
  parse: readBookingForm,
  handler: async (input) => {
    return await createPendingAppointment({
      serviceId: input.serviceId,
      doctorId: input.doctorId,
      startAtIso: input.startAtIso,
    });
  },
  revalidatePaths: ["/patient", "/patient/appointments"],
  redirectTo: (output) => `/patient/appointments/${output.appointmentId}?created=1`,
  onErrorRedirect: (err, input) =>
    `/patient/book?serviceId=${input.serviceId}&date=${encodeURIComponent(
      input.date
    )}${input.doctorId ? `&doctorId=${input.doctorId}` : ""}&error=${encodeActionError(err)}`,
});

export const patientCancelAppointmentAction = createSafeAction({
  parse: (formData) => ({
    appointmentId: Number(formData.get("appointmentId") ?? 0),
  }),
  handler: input => cancelAppointment(input),
  revalidatePaths: ["/patient", "/patient/appointments"],
  redirectTo: (_, { appointmentId }) =>
    `/patient/appointments/${appointmentId}?cancelled=1`,
  onErrorRedirect: (err, { appointmentId }) =>
    `/patient/appointments/${appointmentId}?error=${encodeActionError(err)}`,
});

export const patientRescheduleAppointmentAction = createSafeAction({
  parse: form => ({ appointmentId: Number(form.get("appointmentId")), serviceId: Number(form.get("serviceId")), doctorId: Number(form.get("doctorId")) || null, startAtIso: String(form.get("startAtIso") ?? ""), date: String(form.get("date") ?? "") }),
  handler: input => rescheduleAppointment(input),
  revalidatePaths: ["/patient", "/patient/appointments"],
  redirectTo: output => `/patient/appointments/${output.appointmentId}?rescheduled=1`,
  onErrorRedirect: (error, input) => `/patient/book?${new URLSearchParams({ appointmentId: String(input.appointmentId), serviceId: String(input.serviceId), doctorId: String(input.doctorId ?? 0), date: input.date })}&error=${encodeActionError(error)}`,
});
