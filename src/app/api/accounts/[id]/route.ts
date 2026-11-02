import { NextResponse } from "next/server";
import { errors, handle, parseBody, parseId } from "@/lib/http";
import { adminUpdateAccountSchema } from "@/lib/validation/account";
import { toPublic } from "@/server/account-repository";
import { assertCan, getOrThrow, repo } from "@/server/account-service";
import { updateAuthUser } from "@/server/auth-admin";
import { requireRoles } from "@/server/current-user";
import { ACCOUNT_VIEWERS } from "@/server/permissions";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/accounts/:id */
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const actor = await requireRoles(...ACCOUNT_VIEWERS);
  const account = await getOrThrow(parseId((await params).id));
  assertCan(actor, "view", account.role);
  return NextResponse.json({ user: toPublic(account) });
});

/** PATCH /api/accounts/:id — sửa hồ sơ (họ tên, ngày sinh, SĐT, email). */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const actor = await requireRoles("ADMIN", "RECEPTIONIST");
  const account = await getOrThrow(parseId((await params).id));
  assertCan(actor, "update", account.role);
  const body = await parseBody(req, adminUpdateAccountSchema);

  if (body.phone && body.phone !== account.phone) {
    if (await repo().phoneTaken(body.phone, account.userId)) {
      throw errors.conflict("PHONE_TAKEN", "Số điện thoại đã được sử dụng");
    }
    // SĐT là định danh đăng nhập: đồng bộ sang Supabase Auth
    if (account.authUserId) await updateAuthUser(account.authUserId, { phone: body.phone });
  }

  await repo().updateProfile(account.userId, body);
  return NextResponse.json({ user: toPublic(await getOrThrow(account.userId)) });
});
