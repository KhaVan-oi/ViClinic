import { NextResponse } from "next/server";
import { handle, parseBody, parseId } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validation/account";
import { assertCan, getOrThrow, repo, setPassword } from "@/server/account-service";
import { requireRoles } from "@/server/current-user";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/accounts/:id/reset-password — ADMIN đặt lại mật khẩu. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const actor = await requireRoles("ADMIN");
  const account = await getOrThrow(parseId((await params).id));
  assertCan(actor, "resetPassword", account.role);
  const { newPassword } = await parseBody(req, resetPasswordSchema);

  await setPassword(account, newPassword);
  // Tài khoản chờ kích hoạt trở thành ACTIVE; tài khoản bị khóa vẫn giữ DISABLED
  if (account.status === "PENDING_ACTIVATION") await repo().setStatus(account.userId, "ACTIVE");
  return NextResponse.json({ message: "Đặt lại mật khẩu thành công" });
});
