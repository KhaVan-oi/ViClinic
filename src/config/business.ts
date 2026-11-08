export const CLINIC_TIMEZONE = "Asia/Ho_Chi_Minh" as const;

export const MIN_BIRTH_DATE_ISO = "1900-01-01" as const;

export const SLOT_GRID_MINUTES = 15 as const;

export const BOOKING_HORIZON_DAYS = 30 as const;

export const PATIENT_CANCEL_CUTOFF_MINUTES = 120 as const;


export const STAFF_ROLES = [
  "RECEPTIONIST",
  "DOCTOR",
  "CLINIC_MANAGER",
  "ADMIN",
] as const;

export type StaffRoleName = (typeof STAFF_ROLES)[number];

export const ALL_ROLES = [
  "PATIENT",
  "RECEPTIONIST",
  "DOCTOR",
  "CLINIC_MANAGER",
  "ADMIN",
] as const;

export type RoleName = (typeof ALL_ROLES)[number];

export const HOME_PATH_BY_CONTEXT: Record<RoleName, string> = {
  PATIENT: "/patient",
  RECEPTIONIST: "/reception",
  DOCTOR: "/doctor",
  CLINIC_MANAGER: "/manager",
  ADMIN: "/admin",
};

export function getHomePathForContext(context: RoleName): string {
  return HOME_PATH_BY_CONTEXT[context];
}

export const ACCOUNT_STATUSES = [
  "PENDING_ACTIVATION",
  "ACTIVE",
  "DISABLED",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const OTP_PURPOSES = [
  "ACTIVATE",
  "RECOVER_PASSWORD",
  "REACTIVATE",
] as const;

export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export const ROLE_LABELS: Record<string, string> = {
  PATIENT: "Người khám bệnh",
  RECEPTIONIST: "Lễ tân",
  DOCTOR: "Bác sĩ",
  CLINIC_MANAGER: "Quản lý",
  ADMIN: "Quản trị viên",
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  PENDING_ACTIVATION: "Chờ kích hoạt",
  ACTIVE: "Đang hoạt động",
  DISABLED: "Đã vô hiệu hóa",
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
};

export function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? "Chưa xác định vai trò";
}

export function formatAccountStatusLabel(status: string): string {
  return ACCOUNT_STATUS_LABELS[status] ?? "Chưa xác định trạng thái";
}

export function formatAppointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? "Chưa xác định trạng thái";
}
