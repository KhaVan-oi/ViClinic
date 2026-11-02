import { z } from "zod";
import { VN_PHONE_REGEX } from "@/lib/phone";

export const ROLES = ["PATIENT", "RECEPTIONIST", "DOCTOR", "CLINIC_MANAGER", "ADMIN"] as const;
export const ACCOUNT_STATUSES = ["PENDING_ACTIVATION", "ACTIVE", "DISABLED"] as const;
export type Role = (typeof ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

const phone = z.string().trim().regex(VN_PHONE_REGEX, "Số điện thoại không hợp lệ (vd: 0912345678)");
const password = z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72);
const fullName = z.string().trim().min(1, "Họ tên là bắt buộc").max(120);
const email = z.string().trim().email("Email không hợp lệ").max(120);
const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh dạng YYYY-MM-DD")
  .refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d) <= new Date(), "Ngày sinh không hợp lệ");

// ---------- Auth ----------
export const loginSchema = z.object({
  phone: z.string().trim().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  fullName,
  birthDate,
  phone,
  email: email.optional(),
  password,
});

export const activateSchema = z.object({
  phone,
  birthDate, // xác minh danh tính cho tài khoản được tạo tại quầy
  password,
});

export const changePasswordSchema = z
  .object({ oldPassword: z.string().min(1), newPassword: password })
  .refine((v) => v.oldPassword !== v.newPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });

export const updateProfileSchema = z
  .object({ fullName, email: email.nullable(), birthDate })
  .partial()
  .strict();

// ---------- Quản lý tài khoản ----------
export const createAccountSchema = z
  .object({
    fullName,
    birthDate: birthDate.optional(),
    phone,
    email: email.optional(),
    role: z.enum(ROLES),
    // Bỏ trống password => PENDING_ACTIVATION (chỉ cho PATIENT, FR-M01-005)
    password: password.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "PATIENT" && !v.birthDate) {
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Ngày sinh bắt buộc với bệnh nhân" });
    }
    if (v.role !== "PATIENT" && !v.password) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Tài khoản nhân sự bắt buộc có mật khẩu" });
    }
  });

export const adminUpdateAccountSchema = updateProfileSchema.extend({ phone: phone.optional() }).strict();

export const updateStatusSchema = z.object({ status: z.enum(["ACTIVE", "DISABLED"]) });

export const resetPasswordSchema = z.object({ newPassword: password });

export const listAccountsQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
