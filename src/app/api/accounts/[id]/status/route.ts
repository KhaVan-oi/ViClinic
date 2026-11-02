import { NextResponse } from "next/server";
import { errors, handle, parseBody, parseId } from "@/lib/http";
import { updateStatusSchema } from "@/lib/validation/account";
import { toPublic } from "@/server/account-repository";
import { assertCan, getOrThrow, repo } from "@/server/account-service";
import { updateAuthUser } from "@/server/auth-admin";
import { requireRoles } from "@/server/current-user";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/accounts/:id/status — khóa (DISABLED) / mở khóa (ACTIVE). */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const actor = await requireRoles("ADMIN");
  const account = await getOrThrow(parseId((await params).id));
  assertCan(actor, "changeStatus", account.role);
  const { status } = await parseBody(req, updateStatusSchema);

  if (account.userId === actor.userId) {
    throw errors.badRequest("SELF_STATUS_CHANGE", "Không thể tự thay đổi trạng thái tài khoản của mình");
  }
  if (account.status === "PENDING_ACTIVATION") {
    throw errors.conflict(
      "ACCOUNT_NOT_ACTIVATED",
      "Tài khoản chưa kích hoạt; hãy để bệnh nhân kích hoạt hoặc đặt lại mật khẩu trước",
    );
  }

  // Ban trong Supabase Auth để vô hiệu hóa cả refresh token hiện có
  if (account.authUserId) await updateAuthUser(account.authUserId, { banned: status === "DISABLED" });
  await repo().setStatus(account.userId, status);
  return NextResponse.json({ user: toPublic(await getOrThrow(account.userId)) });
});
