import { z } from "zod";
import {
  isValidIsoDate,
  formatClinicIsoDate,
  getClinicDayEndExclusive,
  isHalfOpenOverlap,
  isIntervalContained,
} from "@/lib/dates";
import { addDays, addMinutes } from "date-fns";
import { BOOKING_HORIZON_DAYS, SLOT_GRID_MINUTES } from "@/config/business";
import { DomainError } from "@/lib/errors";

export interface ServiceDto {
  serviceId: number;
  name: string;
  durationMinutes: number;
  isActive: boolean;
  doctorCount: number;
  activeAppointmentCount?: number;
}

export interface EligibleDoctorDto {
  doctorId: number;
  fullName: string;
}

export interface AvailableSlotDto {
  startAtIso: string;
  endAtIso: string;
  startTimeLabel: string;
  endTimeLabel: string;
  eligibleDoctorIds: number[];
  patientConflicts?: { appointmentId: number; serviceName: string; startTimeLabel: string; endTimeLabel: string }[];
}

export interface AffectedAppointmentPreviewItemDto {
  appointmentId: number;
  serviceId: number;
  serviceName: string;
  doctorId: number | null;
  doctorName: string | null;
  patientName?: string;
  startAtIso: string;
  endAtIso: string;
  timeRangeLabel: string;
  status: string;
  reasons: AppointmentDisruptionReason[];
}

export interface ServiceDeactivationImpactDto {
  serviceId: number;
  serviceName: string;
  canDeactivate: boolean;
  futureActiveCount: number;
  affectedAppointments: AffectedAppointmentPreviewItemDto[];
}

export interface DoctorServiceRemovalImpactDto {
  doctorId: number;
  doctorName: string;
  serviceId: number;
  serviceName: string;
  canRemove: boolean;
  futureActiveCount: number;
  affectedAppointments: AffectedAppointmentPreviewItemDto[];
}

interface ScheduleTimeDto {
  doctorId: number;
  doctorName: string;
  dateIso: string;
  dateLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  startAtIso: string;
  endAtIso: string;
}

export interface ShiftDto extends ScheduleTimeDto {
  shiftId: number;
}

export interface UnavailabilityDto extends ScheduleTimeDto {
  unavailabilityId: number;
}

export interface ScheduleImpactPreviewDto {
  hasImpact: boolean;
  affectedCount: number;
  affectedAppointments: AffectedAppointmentPreviewItemDto[];
}

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const createServiceSchema = z.object({
  name: z.string().trim().min(2, "Tên dịch vụ phải có ít nhất 2 ký tự.").max(120),
  durationMinutes: z
    .number()
    .int()
    .positive("Thời lượng phải là số phút nguyên lớn hơn 0."),
});

export const updateServiceSchema = createServiceSchema.extend({
  serviceId: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

export const doctorServicePairSchema = z.object({
  doctorId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
});

export const shiftInputSchema = z.object({
  doctorId: z.number().int().positive(),
  date: z.string().refine(isValidIsoDate, "Ngày làm việc không hợp lệ."),
  startTime: z.string().regex(timeRegex, "Giờ bắt đầu không hợp lệ."),
  endTime: z.string().regex(timeRegex, "Giờ kết thúc không hợp lệ."),
  acknowledgeImpact: z.boolean().optional(),
});

export const updateShiftInputSchema = shiftInputSchema.extend({
  shiftId: z.number().int().positive(),
});

export const unavailabilityInputSchema = z.object({
  date: z.string().refine(isValidIsoDate, "Ngày nghỉ không hợp lệ."),
  startTime: z.string().regex(timeRegex, "Giờ bắt đầu không hợp lệ."),
  endTime: z.string().regex(timeRegex, "Giờ kết thúc không hợp lệ."),
  acknowledgeImpact: z.boolean().optional(),
});

export function isValidSlotGridStart(
  startAt: Date,
  gridMinutes = SLOT_GRID_MINUTES
): boolean {
  return (
    startAt.getUTCSeconds() === 0 &&
    startAt.getUTCMilliseconds() === 0 &&
    startAt.getUTCMinutes() % gridMinutes === 0
  );
}

export function isWithinBookingHorizon(
  startAt: Date,
  now: Date,
  horizonDays = BOOKING_HORIZON_DAYS
): boolean {
  if (startAt.getTime() <= now.getTime()) {
    return false;
  }
  const maxDateStr = formatClinicIsoDate(addDays(now, horizonDays));
  const maxExclusive = getClinicDayEndExclusive(maxDateStr);
  return startAt.getTime() < maxExclusive.getTime();
}

export function assertValidNewBookingHorizon(
  startAt: Date,
  now: Date,
  horizonDays = BOOKING_HORIZON_DAYS
): void {
  if (startAt.getTime() <= now.getTime()) {
    throw new DomainError(
      "OUTSIDE_BOOKING_HORIZON",
      "Thời gian đặt lịch phải ở trong tương lai.",
      400
    );
  }
  if (!isWithinBookingHorizon(startAt, now, horizonDays)) {
    throw new DomainError(
      "OUTSIDE_BOOKING_HORIZON",
      `Chỉ được phép đặt lịch trước tối đa ${horizonDays} ngày.`,
      400
    );
  }
}

export function assertValidFutureRescheduleTime(startAt: Date, now: Date): void {
  if (startAt.getTime() <= now.getTime()) {
    throw new DomainError(
      "OUTSIDE_BOOKING_HORIZON",
      "Thời gian đổi lịch mới phải ở trong tương lai.",
      400
    );
  }
}

export function computeSlotEndTime(startAt: Date, durationMinutes: number): Date {
  return addMinutes(startAt, durationMinutes);
}

export function isDoctorSlotValidInMemory(input: {
  startAt: Date;
  endAt: Date;
  shifts: ReadonlyArray<{ startAt: Date; endAt: Date; }>;
  unavailabilities: ReadonlyArray<{ startAt: Date; endAt: Date; }>;
  activeAppointments: ReadonlyArray<{ startAt: Date; endAt: Date; }>;
}): {
  valid: boolean;
  reason?:
  | "OUTSIDE_SHIFT"
  | "UNAVAILABILITY_CONFLICT"
  | "DOCTOR_OVERLAP_CONFLICT";
} {
  const insideShift = input.shifts.some((sh) =>
    isIntervalContained(input.startAt, input.endAt, sh.startAt, sh.endAt)
  );
  if (!insideShift) {
    return { valid: false, reason: "OUTSIDE_SHIFT" };
  }

  const hitsUnavailability = input.unavailabilities.some((u) =>
    isHalfOpenOverlap(input.startAt, input.endAt, u.startAt, u.endAt)
  );
  if (hitsUnavailability) {
    return { valid: false, reason: "UNAVAILABILITY_CONFLICT" };
  }

  const hitsAppointment = input.activeAppointments.some((a) =>
    isHalfOpenOverlap(input.startAt, input.endAt, a.startAt, a.endAt)
  );
  if (hitsAppointment) {
    return { valid: false, reason: "DOCTOR_OVERLAP_CONFLICT" };
  }

  return { valid: true };
}

export type AppointmentDisruptionReason =
  | "OUTSIDE_SHIFT"
  | "UNAVAILABILITY_CONFLICT";

export function detectAppointmentScheduleDisruption(input: {
  startAt: Date;
  endAt: Date;
  doctorShifts: ReadonlyArray<{ startAt: Date; endAt: Date; }>;
  doctorUnavailabilities: ReadonlyArray<{ startAt: Date; endAt: Date; }>;
}): AppointmentDisruptionReason[] {
  const reasons: AppointmentDisruptionReason[] = [];

  const coveredByShift = input.doctorShifts.some((sh) =>
    isIntervalContained(input.startAt, input.endAt, sh.startAt, sh.endAt)
  );
  if (!coveredByShift) {
    reasons.push("OUTSIDE_SHIFT");
  }

  const overlapsUnavailability = input.doctorUnavailabilities.some((u) =>
    isHalfOpenOverlap(input.startAt, input.endAt, u.startAt, u.endAt)
  );
  if (overlapsUnavailability) {
    reasons.push("UNAVAILABILITY_CONFLICT");
  }

  return reasons;
}
