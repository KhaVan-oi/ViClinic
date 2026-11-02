import { NextResponse } from "next/server";
import { errors, handle, parseBody } from "@/lib/http";
import { toE164 } from "@/lib/phone";
import { createSessionClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/account";
import { toPublic } from "@/server/account-repository";
import { repo } from "@/server/account-service";

const INVALID = () => errors.unauthorized("Số điện thoại hoặc mật khẩu không đúng");

/** POST /api/auth/login — đăng nhập bằng SĐT + mật khẩu, session lưu trong cookie. */
export const POST = handle(async (req: Request) => {
  const { phone, password } = await parseBody(req, loginSchema);
  const account = await repo().findByPhone(phone);

  if (account?.status === "PENDING_ACTIVATION") {
    throw errors.forbidden(
      "ACCOUNT_PENDING_ACTIVATION",
      "Tài khoản chưa được kích hoạt. Vui lòng kích hoạt và đặt mật khẩu.",
    );
  }
  if (!account?.authUserId) throw INVALID();

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ phone: toE164(phone), password });
  if (error) {
    // Supabase trả lỗi "banned" cho tài khoản đã bị khóa
    if (account.status === "DISABLED" && /banned/i.test(error.message)) {
      throw errors.forbidden("ACCOUNT_DISABLED", "Tài khoản đã bị khóa");
    }
    // Chỉ lỗi thông tin đăng nhập mới là 401; lỗi cấu hình (vd: Phone provider tắt) là lỗi hệ thống
    if (error.code === "invalid_credentials") throw INVALID();
    throw error;
  }
  if (account.status === "DISABLED") {
    await supabase.auth.signOut();
    throw errors.forbidden("ACCOUNT_DISABLED", "Tài khoản đã bị khóa");
  }

  return NextResponse.json({ user: toPublic(account) });
});
