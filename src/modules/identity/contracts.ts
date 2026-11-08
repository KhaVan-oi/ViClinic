import {
  AccountStatus,
  RoleName,
  StaffRoleName,
  STAFF_ROLES,
  ALL_ROLES,
} from "@/config/business";
import { z } from "zod";
import { PASSWORD_PATTERN, PASSWORD_RULE_MESSAGE } from "@/config/security";
import { birthDateSchema, optionalEmailSchema, fullNameSchema } from "@/lib/profile";
const newPasswordSchema = z.string().regex(new RegExp(`^${PASSWORD_PATTERN}$`), PASSWORD_RULE_MESSAGE);

export interface AdminAccountRowDto {
  accountId: number;
  userId: number;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  status: AccountStatus;
  roles: RoleName[];
  staffRole: StaffRoleName | null;
  hasPatientRole: boolean;
  isReactivationPending: boolean;
}

export interface AdminAccountDetailDto extends AdminAccountRowDto {
  doctorDependencies: DoctorRoleDependencySummary | null;
}

export interface AdminAccountListFilter {
  searchQuery?: string;
  role?: RoleName | "ALL";
  status?: AccountStatus | "ALL";
  reactivationReview?: boolean;
  page?: number;
  pageSize?: number;
}

export const loginSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
  preferredContext: z
    .enum(["PATIENT", "RECEPTIONIST", "DOCTOR", "CLINIC_MANAGER", "ADMIN"])
    .optional(),
});

export const patientRegistrationPhoneSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
});

export const patientRegistrationStartSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
  fullName: fullNameSchema
    .optional(),
  birthDate: birthDateSchema
    .optional()
    .or(z.literal("")),
  email: optionalEmailSchema,
});

export const completeRegistrationDetailsSchema = z
  .object({
    fullName: fullNameSchema,
    birthDate: birthDateSchema,
    email: optionalEmailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(8, "Vui lòng nhập xác nhận mật khẩu."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp.",
    path: ["confirmPassword"],
  });

export const completeActivationSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
  otpCode: z
    .string()
    .regex(/^\d{6}$/, "Mã xác minh phải gồm đúng 6 chữ số.")
    .optional(),
  proofToken: z.string().min(1).optional(),
  password: newPasswordSchema,
  fullName: z.string().trim().optional(),
  birthDate: z.string().optional(),
  email: optionalEmailSchema,
});

export const passwordRecoveryStartSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
});

export const reactivationCompleteSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
  otpCode: z.string().regex(/^\d{6}$/, "Mã xác minh phải gồm đúng 6 chữ số."),
});

export const createOrReuseStaffSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
  fullName: fullNameSchema,
  birthDate: birthDateSchema,
  email: optionalEmailSchema,
  staffRole: z.enum(STAFF_ROLES),
  includePatientRole: z.boolean().optional().default(false),
});

export const enablePersonalPatientSchema = z.object({
  birthDate: birthDateSchema
    .optional()
    .or(z.literal("")),
  email: optionalEmailSchema,
});

export const changeStaffRoleSchema = z.object({
  userId: z.coerce.number().int().positive(),
  nextStaffRole: z.enum(STAFF_ROLES).nullable(),
  keepPatientRole: z.boolean().optional(),
  birthDate: birthDateSchema.optional(),
});

export function isStaffRole(role: RoleName): role is StaffRoleName {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function validateRoleSet(
  roles: readonly RoleName[]
): { valid: true; } | { valid: false; reason: string; } {
  if (roles.length === 0) {
    return {
      valid: false,
      reason: "Cần giữ ít nhất một vai trò cho tài khoản.",
    };
  }
  const unique = new Set(roles);
  let staffCount = 0;
  for (const r of unique) {
    if (!(ALL_ROLES as readonly string[]).includes(r)) {
      return {
        valid: false,
        reason: "Vai trò được chọn không hợp lệ.",
      };
    }
    if (isStaffRole(r)) {
      staffCount++;
    }
  }
  if (staffCount > 1) {
    return {
      valid: false,
      reason: "Mỗi nhân sự chỉ có một vai trò công việc.",
    };
  }
  return { valid: true };
}

export function getDefaultActiveContext(roles: readonly RoleName[]): RoleName {
  const staffRole = roles.find(isStaffRole);
  if (staffRole) {
    return staffRole;
  }
  return roles[0] ?? "PATIENT";
}

export interface DoctorRoleDependencySummary {
  doctorId: number;
  serviceCount: number;
  futureShiftCount: number;
  futureUnavailabilityCount: number;
  activeAppointmentCount: number;
  hasBlockingDependencies: boolean;
  message: string;
}

export function computeDoctorDependencyBlocked(input: {
  serviceCount: number;
  futureShiftCount: number;
  futureUnavailabilityCount: number;
  activeAppointmentCount: number;
}): boolean {
  return (
    input.serviceCount > 0 ||
    input.futureShiftCount > 0 ||
    input.futureUnavailabilityCount > 0 ||
    input.activeAppointmentCount > 0
  );
}

export interface SessionView {
  fullName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  activeContext: RoleName;
  staffRole: RoleName | null;
  hasPatientRole: boolean;
}
