import { NextResponse } from "next/server";
import { errors, handle, parseBody } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validation/account";
import { setPassword } from "@/server/account-service";
import { verifyPassword } from "@/server/auth-admin";
import { getCurrentUser } from "@/server/current-user";

/** POST /api/auth/change-password */
export const POST = handle(async (req: Request) => {
  const me = await getCurrentUser();
  const { oldPassword, newPassword } = await parseBody(req, changePasswordSchema);
  if (!(await verifyPassword(me.phone, oldPassword))) {
    throw errors.badRequest("WRONG_PASSWORD", "Mật khẩu hiện tại không đúng");
  }
  await setPassword(me, newPassword);
  return NextResponse.json({ message: "Đổi mật khẩu thành công" });
});
