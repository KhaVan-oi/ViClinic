import "server-only";
import { errors } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/validation/account";
import { AccountRepository, type AccountRecord } from "./account-repository";

/** Lấy tài khoản đang đăng nhập; đọc lại trạng thái từ DB để tài khoản bị khóa mất quyền ngay. */
export async function getCurrentUser(): Promise<AccountRecord> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw errors.unauthorized();

  const account = await new AccountRepository(createAdminClient()).findByAuthUserId(data.user.id);
  if (!account || account.status !== "ACTIVE") throw errors.unauthorized();
  return account;
}

export async function requireRoles(...roles: Role[]): Promise<AccountRecord> {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) throw errors.forbidden();
  return user;
}
