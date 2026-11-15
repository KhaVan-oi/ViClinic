"use server";

import { assignDoctorService, removeDoctorService } from "@/modules/scheduling/doctor-services";
import { createService, deactivateService, updateService } from "@/modules/scheduling/services";
import { createShift, updateShift } from "@/modules/scheduling/shifts";
import { createSafeAction, encodeActionError, isDomainError } from "@/server/actions";

export const managerCreateServiceAction = createSafeAction({
  parse: (formData) => ({
    name: String(formData.get("name") ?? "").trim(),
    durationMinutes: Number(formData.get("durationMinutes") ?? 30),
  }),
  handler: input => createService(input),
  revalidatePaths: ["/manager/services", "/services", "/"],
  redirectTo: () => "/manager/services?created=1",
  onErrorRedirect: (err) => `/manager/services?error=${encodeActionError(err)}`,
});

export const managerUpdateServiceAction = createSafeAction({
  parse: (formData) => {
    const isActiveRaw = formData.get("isActive");
    return {
      serviceId: Number(formData.get("serviceId") ?? 0),
      name: String(formData.get("name") ?? "").trim(),
      durationMinutes: Number(formData.get("durationMinutes") ?? 30),
      isActive:
        isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined,
    };
  },
  handler: input => updateService(input),
  revalidatePaths: ["/manager/services", "/services", "/"],
  redirectTo: () => "/manager/services?updated=1",
  onErrorRedirect: (err, input) => {
    if (isDomainError(err) && err.code === "DEPENDENCY_BLOCKED") {
      return `/manager/services?blockedServiceId=${input.serviceId}`;
    }
    return `/manager/services?error=${encodeActionError(err)}`;
  },
});

export const managerDeactivateServiceAction = createSafeAction({
  parse: (formData) => ({
    serviceId: Number(formData.get("serviceId") ?? 0),
  }),
  handler: async ({ serviceId }) => {
    return await deactivateService({ serviceId });
  },
  revalidatePaths: ["/manager/services", "/services", "/"],
  redirectTo: () => "/manager/services?deactivated=1",
  onErrorRedirect: (err, { serviceId }) => {
    if (isDomainError(err) && err.code === "DEPENDENCY_BLOCKED") {
      return `/manager/services?blockedServiceId=${serviceId}`;
    }
    return `/manager/services?error=${encodeActionError(err)}`;
  },
});

export const managerAssignDoctorServiceAction = createSafeAction({
  parse: (formData) => ({
    doctorId: Number(formData.get("doctorId") ?? 0),
    serviceId: Number(formData.get("serviceId") ?? 0),
  }),
  handler: input => assignDoctorService(input),
  revalidatePaths: ["/manager/doctor-services"],
  redirectTo: () => "/manager/doctor-services?assigned=1",
  onErrorRedirect: (err) =>
    `/manager/doctor-services?error=${encodeActionError(err)}`,
});

export const managerRemoveDoctorServiceAction = createSafeAction({
  parse: (formData) => ({
    doctorId: Number(formData.get("doctorId") ?? 0),
    serviceId: Number(formData.get("serviceId") ?? 0),
  }),
  handler: input => removeDoctorService(input),
  revalidatePaths: ["/manager/doctor-services"],
  redirectTo: () => "/manager/doctor-services?removed=1",
  onErrorRedirect: (err, { doctorId, serviceId }) => {
    if (isDomainError(err) && err.code === "DEPENDENCY_BLOCKED") {
      return `/manager/doctor-services?blockedDoctorId=${doctorId}&blockedServiceId=${serviceId}`;
    }
    return `/manager/doctor-services?error=${encodeActionError(err)}`;
  },
});

export const managerCreateShiftAction = createSafeAction({
  parse: (formData) => ({
    doctorId: Number(formData.get("doctorId") ?? 0),
    date: String(formData.get("date") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),

  }),
  handler: input => createShift(input),
  revalidatePaths: ["/manager/shifts", "/manager/calendar"],
  redirectTo: (_, input) => `/manager/shifts?doctorId=${input.doctorId}&fromDate=${encodeURIComponent(input.date)}&created=1`,
  onErrorRedirect: (err, input) =>
    `/manager/shifts?doctorId=${input.doctorId}&date=${encodeURIComponent(input.date)}&startTime=${encodeURIComponent(input.startTime)}&endTime=${encodeURIComponent(input.endTime)}&error=${encodeActionError(err)}`,
});

export const managerUpdateShiftAction = createSafeAction({
  parse: (formData) => ({
    shiftId: Number(formData.get("shiftId") ?? 0),
    doctorId: Number(formData.get("doctorId") ?? 0),
    date: String(formData.get("date") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    acknowledgeImpact: formData.get("acknowledgeImpact") === "true",
  }),
  handler: input => updateShift(input),
  revalidatePaths: ["/manager/shifts", "/manager/calendar"],
  redirectTo: (_, input) => `/manager/shifts?doctorId=${input.doctorId}&fromDate=${encodeURIComponent(input.date)}&updated=1`,
  onErrorRedirect: (err, input) => {
    if (isDomainError(err) && err.code === "CONFIRMATION_REQUIRED") {
      return `/manager/shifts?previewShiftId=${input.shiftId}&doctorId=${input.doctorId
        }&date=${encodeURIComponent(input.date)}&startTime=${encodeURIComponent(
          input.startTime
        )}&endTime=${encodeURIComponent(input.endTime)}`;
    }
    return `/manager/shifts?editShiftId=${input.shiftId}&doctorId=${input.doctorId
      }&date=${encodeURIComponent(input.date)}&startTime=${encodeURIComponent(input.startTime)}&endTime=${encodeURIComponent(input.endTime)}&error=${encodeActionError(err)}`;
  },
});
