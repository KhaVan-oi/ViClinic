import "server-only";
import { errors } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateAccountInput, Role } from "@/lib/validation/account";
import { AccountRepository, toPublic, type Account, type AccountRecord } from "./account-repository";
import { createAuthUser, deleteAuthUser, updateAuthUser } from "./auth-admin";
import { canManage, type AccountAction } from "./permissions";

export const repo = () => new AccountRepository(createAdminClient());

export function assertCan(actor: AccountRecord, action: AccountAction, targetRole: Role) {
  if (!canManage(actor.role, action, targetRole)) throw errors.forbidden();
}

export async function getOrThrow(userId: number): Promise<AccountRecord> {
  const account = await repo().findByUserId(userId);
  if (!account) throw errors.notFound();
  return account;
}

/**
 * Tạo USERS + ACCOUNTS (+ user Supabase Auth nếu có mật khẩu).
 * Không có mật khẩu => PENDING_ACTIVATION, bệnh nhân tự kích hoạt sau (FR-M01-005).
 */
export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const accounts = repo();
  if (await accounts.phoneTaken(input.phone)) {
    throw errors.conflict("PHONE_TAKEN", "Số điện thoại đã được sử dụng");
  }

  const authUserId = input.password ? await createAuthUser(input.phone, input.password) : null;
  try {
    const created = await accounts.create({
      ...input,
      authUserId,
      status: authUserId ? "ACTIVE" : "PENDING_ACTIVATION",
    });
    return toPublic(created);
  } catch (err) {
    if (authUserId) await deleteAuthUser(authUserId);
    if ((err as { code?: string }).code === "23505") {
      throw errors.conflict("PHONE_TAKEN", "Số điện thoại đã được sử dụng");
    }
    throw err;
  }
}

/** Đặt mật khẩu: tạo user Auth nếu chưa có (tài khoản pending / seed), ngược lại cập nhật. */
export async function setPassword(account: AccountRecord, password: string): Promise<void> {
  if (account.authUserId) {
    await updateAuthUser(account.authUserId, { password });
    return;
  }
  const authUserId = await createAuthUser(account.phone, password);
  await repo().linkAuthUser(account.userId, authUserId);
  if (account.status === "DISABLED") await updateAuthUser(authUserId, { banned: true });
}
