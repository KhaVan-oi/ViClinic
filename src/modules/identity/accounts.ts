import "server-only";
import { AUTH_PROOF_CLAIMED_ATTEMPTS } from "@/config/security";
import { protectLastActiveAdmin } from "./admin-guard";

import { DomainError } from "@/lib/errors";
import { requireActiveContext } from "@/server/authorization";
import { db } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { findAccountWithUserAndRolesById } from "@/modules/identity/queries";

export async function disableAccount(
  input: { accountId: number; },
  explicitCtx?: AuthenticatedContext | null
): Promise<{ accountId: number; status: "DISABLED"; }> {
  await requireActiveContext(["ADMIN"], explicitCtx);
  const now = new Date();

  const existing = await findAccountWithUserAndRolesById(input.accountId);
  if (!existing) {
    throw new DomainError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.", 404);
  }

  await db.$transaction(async tx => {
    await protectLastActiveAdmin(tx, existing.userId);
    await tx.account.update({
      where: { accountId: existing.accountId },
      data: { status: "DISABLED" },
    });
    await tx.authSession.updateMany({
      where: { accountId: existing.accountId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.otpChallenge.updateMany({
      where: { accountId: existing.accountId, consumedAt: null },
      data: { consumedAt: now, attemptCount: AUTH_PROOF_CLAIMED_ATTEMPTS },
    });
  });

  return {
    accountId: existing.accountId,
    status: "DISABLED",
  };
}

export async function permitReactivation(
  input: { accountId: number; },
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  accountId: number;
  phone: string;
  status: "PENDING_ACTIVATION";
}> {
  await requireActiveContext(["ADMIN"], explicitCtx);

  const existing = await findAccountWithUserAndRolesById(input.accountId);
  if (!existing) {
    throw new DomainError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.", 404);
  }

  if (existing.status !== "DISABLED") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Chỉ có thể cho phép mở lại tài khoản đang bị khóa.",
      400
    );
  }

  await db.$transaction(async tx => {
    const updated = await tx.account.updateMany({
      where: { accountId: existing.accountId, status: "DISABLED" },
      data: { status: "PENDING_ACTIVATION" },
    });
    if (!updated.count) throw new DomainError("INVALID_ACCOUNT_STATE", "Trạng thái tài khoản đã thay đổi. Vui lòng tải lại.", 409);
    await tx.otpChallenge.updateMany({
      where: { accountId: existing.accountId },
      data: { consumedAt: new Date(), attemptCount: AUTH_PROOF_CLAIMED_ATTEMPTS },
    });
  });
  return { accountId: existing.accountId, phone: existing.user.phone, status: "PENDING_ACTIVATION" };
}
