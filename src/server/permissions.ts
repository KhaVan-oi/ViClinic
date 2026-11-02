import { ROLES, type Role } from "@/lib/validation/account";

/**
 * Ma trận quyền quản lý tài khoản cho 5 vai trò (PBS 2.1, R03).
 *
 * | Vai trò        | view               | create / update | changeStatus / resetPassword |
 * |----------------|--------------------|-----------------|------------------------------|
 * | ADMIN          | mọi vai trò        | mọi vai trò     | mọi vai trò                  |
 * | CLINIC_MANAGER | DOCTOR (quản lý ca)| —               | —                            |
 * | RECEPTIONIST   | PATIENT, DOCTOR    | PATIENT         | —                            |
 * | DOCTOR         | —                  | —               | —                            |
 * | PATIENT        | —                  | —               | —                            |
 *
 * Mọi vai trò đều xem / sửa hồ sơ của chính mình qua /api/auth/me.
 * Lễ tân xem bác sĩ để gán bác sĩ cho lịch Pending; quản lý xem bác sĩ để tạo ca.
 */
export type AccountAction = "view" | "create" | "update" | "changeStatus" | "resetPassword";

const MATRIX: Record<Role, Partial<Record<AccountAction, readonly Role[]>>> = {
  ADMIN: {
    view: ROLES,
    create: ROLES,
    update: ROLES,
    changeStatus: ROLES,
    resetPassword: ROLES,
  },
  CLINIC_MANAGER: { view: ["DOCTOR"] },
  RECEPTIONIST: { view: ["PATIENT", "DOCTOR"], create: ["PATIENT"], update: ["PATIENT"] },
  DOCTOR: {},
  PATIENT: {},
};

export function canManage(actor: Role, action: AccountAction, targetRole: Role): boolean {
  return MATRIX[actor][action]?.includes(targetRole) ?? false;
}

/** Các vai trò mà actor được xem trong danh sách tài khoản. */
export function viewableRoles(actor: Role): Role[] {
  return [...(MATRIX[actor].view ?? [])];
}

export const ACCOUNT_VIEWERS: Role[] = ROLES.filter((r) => viewableRoles(r).length > 0);
