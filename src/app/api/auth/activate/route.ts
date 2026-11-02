import { NextResponse } from "next/server";
import { errors, handle, parseBody } from "@/lib/http";
import { toE164 } from "@/lib/phone";
import { createSessionClient } from "@/lib/supabase/server";
import { activateSchema } from "@/lib/validation/account";
import { toPublic } from "@/server/account-repository";
import { getOrThrow, repo, setPassword } from "@/server/account-service";

/**
 * POST /api/auth/activate — kích hoạt tài khoản PENDING_ACTIVATION do lễ tân tạo (FR-M01-005).
 * Bệnh nhân xác minh bằng SĐT + ngày sinh rồi đặt mật khẩu.
 */
export const POST = handle(async (req: Request) => {
  const { phone, birthDate, password } = await parseBody(req, activateSchema);
  const account = await repo().findByPhone(phone);

  if (!account || account.status !== "PENDING_ACTIVATION" || account.birthDate !== birthDate) {
    throw errors.badRequest(
      "ACTIVATION_FAILED",
      "Thông tin kích hoạt không đúng hoặc tài khoản không ở trạng thái chờ kích hoạt",
    );
  }

  await setPassword(account, password);
  await repo().setStatus(account.userId, "ACTIVE");

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ phone: toE164(phone), password });
  if (error) throw error;

  return NextResponse.json({ user: toPublic(await getOrThrow(account.userId)) });
});
