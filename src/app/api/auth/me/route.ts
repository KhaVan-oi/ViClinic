import { NextResponse } from "next/server";
import { handle, parseBody } from "@/lib/http";
import { updateProfileSchema } from "@/lib/validation/account";
import { toPublic } from "@/server/account-repository";
import { getOrThrow, repo } from "@/server/account-service";
import { getCurrentUser } from "@/server/current-user";

/** GET /api/auth/me — thông tin tài khoản đang đăng nhập. */
export const GET = handle(async () => {
  const me = await getCurrentUser();
  return NextResponse.json({ user: toPublic(me) });
});

/** PATCH /api/auth/me — tự cập nhật họ tên, email, ngày sinh. */
export const PATCH = handle(async (req: Request) => {
  const me = await getCurrentUser();
  const body = await parseBody(req, updateProfileSchema);
  await repo().updateProfile(me.userId, body);
  return NextResponse.json({ user: toPublic(await getOrThrow(me.userId)) });
});
