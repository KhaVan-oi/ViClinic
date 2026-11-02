import { NextResponse } from "next/server";
import { handle, parseBody } from "@/lib/http";
import { createAccountSchema, listAccountsQuerySchema } from "@/lib/validation/account";
import { assertCan, createAccount, repo } from "@/server/account-service";
import { requireRoles } from "@/server/current-user";
import { ACCOUNT_VIEWERS, viewableRoles } from "@/server/permissions";

/** GET /api/accounts?role=&status=&q=&page=&pageSize= */
export const GET = handle(async (req: Request) => {
  const actor = await requireRoles(...ACCOUNT_VIEWERS);
  const query = listAccountsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));

  // Giới hạn dữ liệu theo vai trò: chỉ trả về các vai trò actor được xem
  if (query.role) assertCan(actor, "view", query.role);
  const roles = query.role ? [query.role] : viewableRoles(actor.role);

  const { items, total } = await repo().list({ ...query, roles });
  return NextResponse.json({ items, total, page: query.page, pageSize: query.pageSize });
});

/** POST /api/accounts — ADMIN tạo mọi role; lễ tân tạo bệnh nhân tại quầy. */
export const POST = handle(async (req: Request) => {
  const actor = await requireRoles("ADMIN", "RECEPTIONIST");
  const body = await parseBody(req, createAccountSchema);
  assertCan(actor, "create", body.role);
  const user = await createAccount(body);
  return NextResponse.json({ user }, { status: 201 });
});
