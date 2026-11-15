import { type AppointmentStatus, PATIENT_CANCEL_CUTOFF_MINUTES, type RoleName } from "@/config/business";
import { z } from "zod";

export type PatientAppointmentTab = "UPCOMING" | "HISTORY" | "ALL";

export interface AppointmentHistoryItemDto {
  historyId: number;
  appointmentId: number;
  actorUserId: number;
  actorName: string;
  actorRoles: string[];
  oldStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus;
  oldDoctorId: number | null;
  oldDoctorName: string | null;
  newDoctorId: number | null;
  newDoctorName: string | null;
  oldServiceName: string | null;
  newServiceName: string | null;
  oldStartAtIso: string | null;
  oldEndAtIso: string | null;
  newStartAtIso: string;
  newEndAtIso: string;
  newSlotLabel: string;
  oldSlotLabel: string | null;
  changedAtIso: string;
  changedAtLabel: string;
}

interface AppointmentSummary {
  appointmentId: number;
  serviceId: number;
  serviceName: string;
  serviceDurationMinutes: number;
  doctorId: number | null;
  doctorName: string | null;
  startAtIso: string;
  endAtIso: string;
  slotLabel: string;
  status: AppointmentStatus;
}

export interface PatientAppointmentDto extends AppointmentSummary {
  canSelfCancel: boolean;
  cancelCutoffReason?: string;
}

export interface ReceptionAppointmentDto extends AppointmentSummary {
  patientId: number;
  patientName: string;
  patientPhone: string;
  patientBirthDate: string | null;
  isOverduePending: boolean;
  isOverdueConfirmed: boolean;
  isEarlyCompletion: boolean;
  needsCoordination: boolean;
  coordinationReasons: string[];
  history?: AppointmentHistoryItemDto[];
}

export interface DoctorAppointmentDto extends AppointmentSummary {
  patientName: string;
  patientBirthDate: string | null;
  doctorId: number;
  doctorName: string;
  isOverdueConfirmed: boolean;
  isEarlyCompletion: boolean;
}

export interface CalendarEventDto {
  appointmentId?: number;
  shiftId?: number;
  unavailabilityId?: number;
  kind: "APPOINTMENT" | "SHIFT" | "UNAVAILABILITY";
  title: string;
  subtitle?: string;
  doctorId: number | null;
  doctorName: string | null;
  serviceId?: number;
  serviceName?: string;
  status?: AppointmentStatus;
  startAtIso: string;
  endAtIso: string;
  slotLabel: string;
}

export type ReceptionQueueTab =
  | "TODAY_SCHEDULE"
  | "CREATED_TODAY_PENDING"
  | "PENDING_UNASSIGNED"
  | "PENDING_ASSIGNED"
  | "OVERDUE_PENDING"
  | "NEEDS_COORDINATION"
  | "TODAY_CONFIRMED"
  | "OVERDUE_CONFIRMED"
  | "ALL";

export type DoctorAppointmentTab =
  | "TODAY"
  | "PENDING"
  | "HISTORY"
  | "UPCOMING"
  | "OVERDUE_CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export const createPendingAppointmentSchema = z.object({
  serviceId: z.coerce.number().int().positive("Vui lòng chọn dịch vụ khám."),
  doctorId: z.coerce.number().int().positive().nullable().optional(),
  startAtIso: z.string().min(10, "Vui lòng chọn khung giờ khám."),
  patientId: z.coerce.number().int().positive().nullable().optional(),
  patientUserId: z.coerce.number().int().positive().nullable().optional(),
});

export const createConfirmedAppointmentSchema = z.object({
  patientId: z.coerce.number().int().positive("Vui lòng chọn người khám bệnh."),
  serviceId: z.coerce.number().int().positive("Vui lòng chọn dịch vụ khám."),
  doctorId: z.coerce.number().int().positive("Vui lòng chọn bác sĩ."),
  startAtIso: z.string().min(10, "Vui lòng chọn khung giờ khám."),
});

export const confirmAppointmentSchema = z.object({
  appointmentId: z.coerce.number().int().positive(),
  doctorId: z.coerce.number().int().positive().nullable().optional(),
  acknowledgeOverdueWarning: z.boolean().optional().default(false),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive().optional(),
  doctorId: z.coerce.number().int().positive().nullable().optional(),
  startAtIso: z.string().min(10, "Vui lòng chọn khung giờ khám mới."),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.coerce.number().int().positive(),
});

export const completeAppointmentSchema = z.object({
  appointmentId: z.coerce.number().int().positive(),
  acknowledgeEarlyWarning: z.boolean().optional().default(false),
});

export const VALID_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionAppointment(
  fromStatus: AppointmentStatus,
  toStatus: AppointmentStatus
): boolean {
  return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

export function canPatientSelfCancel(
  status: AppointmentStatus,
  startAt: Date,
  now: Date
): {
  allowed: boolean;
  reason?: "INVALID_STATUS" | "WITHIN_2_HOUR_CUTOFF";
  minutesRemaining: number;
} {
  const diffMs = startAt.getTime() - now.getTime();
  const minutesRemaining = Math.floor(diffMs / 60_000);
  if (status !== "PENDING" && status !== "CONFIRMED") {
    return { allowed: false, reason: "INVALID_STATUS", minutesRemaining };
  }
  if (diffMs < PATIENT_CANCEL_CUTOFF_MINUTES * 60_000) {
    return { allowed: false, reason: "WITHIN_2_HOUR_CUTOFF", minutesRemaining };
  }
  return { allowed: true, minutesRemaining };
}

export function isOverduePending(status: AppointmentStatus, startAt: Date, now: Date): boolean {
  return status === "PENDING" && startAt.getTime() <= now.getTime();
}

export function isOverdueConfirmed(status: AppointmentStatus, endAt: Date, now: Date): boolean {
  return status === "CONFIRMED" && endAt.getTime() < now.getTime();
}

export function isEarlyCompletion(startAt: Date, now: Date): boolean {
  return now.getTime() < startAt.getTime();
}

export function canCompleteAppointment(params: {
  actorRole: RoleName;
  actorUserId: number;
  status: AppointmentStatus;
  doctorId: number | null;
}): {
  allowed: boolean;
  reason?: "INVALID_STATUS" | "MISSING_DOCTOR" | "FORBIDDEN_ROLE" | "NOT_ASSIGNED_DOCTOR";
} {
  if (params.status !== "CONFIRMED") return { allowed: false, reason: "INVALID_STATUS" };
  if (params.doctorId === null) return { allowed: false, reason: "MISSING_DOCTOR" };
  if (params.actorRole === "RECEPTIONIST") return { allowed: true };
  if (params.actorRole !== "DOCTOR") return { allowed: false, reason: "FORBIDDEN_ROLE" };
  if (params.doctorId !== params.actorUserId) return { allowed: false, reason: "NOT_ASSIGNED_DOCTOR" };
  return { allowed: true };
}
