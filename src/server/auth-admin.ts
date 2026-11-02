import "server-only";
import { errors } from "@/lib/http";
import { toE164 } from "@/lib/phone";
import { createAdminClient, createStatelessClient } from "@/lib/supabase/admin";

// Thời gian "ban" đủ dài để coi như khóa vĩnh viễn (~100 năm)
const BAN_FOREVER = "876000h";

/** Tạo user trong Supabase Auth (đăng nhập bằng SĐT + mật khẩu, không cần OTP). */
export async function createAuthUser(phone: string, password: string): Promise<string> {
  const { data, error } = await createAdminClient().auth.admin.createUser({
    phone: toE164(phone),
    password,
    phone_confirm: true,
  });
  if (error) {
    if (error.status === 422 || /already/i.test(error.message)) {
      throw errors.conflict("PHONE_TAKEN", "Số điện thoại đã được sử dụng");
    }
    throw error;
  }
  return data.user.id;
}

export async function deleteAuthUser(authUserId: string): Promise<void> {
  await createAdminClient().auth.admin.deleteUser(authUserId);
}

export async function updateAuthUser(
  authUserId: string,
  attrs: { password?: string; phone?: string; banned?: boolean },
): Promise<void> {
  const { error } = await createAdminClient().auth.admin.updateUserById(authUserId, {
    ...(attrs.password && { password: attrs.password }),
    ...(attrs.phone && { phone: toE164(attrs.phone), phone_confirm: true }),
    ...(attrs.banned !== undefined && { ban_duration: attrs.banned ? BAN_FOREVER : "none" }),
  });
  if (error) throw error;
}

/** Kiểm tra mật khẩu mà không thay đổi session cookie của request. */
export async function verifyPassword(phone: string, password: string): Promise<boolean> {
  const client = createStatelessClient();
  const { error } = await client.auth.signInWithPassword({ phone: toE164(phone), password });
  if (error) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}
