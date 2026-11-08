import "server-only";

import { RoleName } from "@/config/business";
import { redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { AuthenticatedContext, getCurrentSession } from "@/server/session";

export async function requirePatientPageSession(nextPath: string) {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (session.activeContext !== "PATIENT") return null;
  return requireActiveContext(["PATIENT"], session);
}

export async function requireAuthenticated(
  explicitCtx?: AuthenticatedContext | null
): Promise<AuthenticatedContext> {
  const ctx = explicitCtx !== undefined ? explicitCtx : await getCurrentSession();
  if (!ctx) {
    throw new DomainError("UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.", 401);
  }
  if (ctx.accountStatus !== "ACTIVE") {
    throw new DomainError(
      "ACCOUNT_DISABLED",
      "Tài khoản chưa thể sử dụng. Vui lòng liên hệ phòng khám.",
      403
    );
  }
  return ctx;
}

export async function requireActiveContext(
  allowedContexts: readonly RoleName[],
  explicitCtx?: AuthenticatedContext | null
): Promise<AuthenticatedContext> {
  const ctx = await requireAuthenticated(explicitCtx);
  if (!ctx.roles.includes(ctx.activeContext)) {
    throw new DomainError("FORBIDDEN", "Bạn cần đăng nhập lại để tiếp tục.", 403);
  }
  if (!allowedContexts.includes(ctx.activeContext)) {
    throw new DomainError(
      "FORBIDDEN",
      "Tài khoản của bạn không có quyền thực hiện thao tác này.",
      403
    );
  }
  return ctx;
}
