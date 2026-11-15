import "server-only";

import { redirect } from "next/navigation";
import { createSafeAction, encodeActionError } from "@/server/actions";
import { completeAppointment } from "./transitions";

export function readBookingForm(form: FormData) {
  const doctorId = Number(form.get("doctorId"));
  return {
    serviceId: Number(form.get("serviceId") ?? 0),
    doctorId: doctorId > 0 ? doctorId : null,
    startAtIso: String(form.get("startAtIso") ?? "").trim(),
    date: String(form.get("date") ?? "").trim(),
  };
}

export function createCompleteAppointmentAction(workspace: "doctor" | "reception") {
  const base = `/${workspace}`;
  return createSafeAction({
    parse: (form: FormData) => ({
      appointmentId: Number(form.get("appointmentId") ?? 0),
      acknowledgeEarlyWarning: form.get("acknowledgeEarlyWarning") === "true",
    }),
    handler: async input => {
      const result = await completeAppointment(input);
      if (!result.completed && result.requiresEarlyWarning) {
        redirect(`${base}/appointments/${input.appointmentId}?earlyWarning=1&warningMsg=${encodeURIComponent(result.warningMessage)}`);
      }
      return result;
    },
    revalidatePaths: [base, `${base}/appointments`],
    redirectTo: (_, {appointmentId}) => `${base}/appointments/${appointmentId}?completed=1`,
    onErrorRedirect: (error, {appointmentId}) => `${base}/appointments/${appointmentId}?error=${encodeActionError(error)}`,
  });
}
