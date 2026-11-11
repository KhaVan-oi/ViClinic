"use server";

import { createCompleteAppointmentAction } from "@/modules/appointments/actions";
import { createUnavailability } from "@/modules/scheduling/shifts";
import { createSafeAction, encodeActionError, isDomainError } from "@/server/actions";

export const doctorCompleteAppointmentAction = createCompleteAppointmentAction("doctor");

export const doctorCreateUnavailabilityAction = createSafeAction({
  parse: (formData) => ({
    date: String(formData.get("date") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    acknowledgeImpact: formData.get("acknowledgeImpact") === "true",
  }),
  handler: input => createUnavailability(input),
  revalidatePaths: ["/doctor", "/doctor/unavailability", "/doctor/calendar"],
  redirectTo: () => `/doctor/unavailability?created=1`,
  onErrorRedirect: (err, input) => {
    const base = `/doctor/unavailability?date=${encodeURIComponent(
      input.date
    )}&startTime=${encodeURIComponent(
      input.startTime
    )}&endTime=${encodeURIComponent(input.endTime)}`;

    if (isDomainError(err) && err.code === "CONFIRMATION_REQUIRED") {
      return `${base}&preview=1`;
    }
    return `${base}&error=${encodeActionError(err)}`;
  },
});
