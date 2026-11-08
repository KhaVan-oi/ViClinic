import "server-only";

import { RoleName } from "@/config/business";
import { DomainError, parseInput } from "@/lib/errors";
import { normalizeVietnamPhone } from "@/lib/profile";
import { db } from "@/server/db";
import { issueOtpChallenge, verifyAndConsumeOtpChallenge } from "@/server/otp";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/password";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from "@/server/rate-limit";
import { AuthenticatedContext, createAuthSession } from "@/server/session";
import {
  getDefaultActiveContext,
  loginSchema,
  passwordRecoveryStartSchema,
  reactivationCompleteSchema,
} from "@/modules/identity/contracts";
import { findUserWithAccountAndRolesByPhone } from "@/modules/identity/queries";
import { claimProofTokenChallenge, createAuthProofToken, verifyAuthProofToken } from "@/modules/identity/proof";

export interface LoginResult {
  userId: number;
  accountId: number;
  fullName: string;
  phone: string;
  roles: RoleName[];
  activeContext: RoleName;
  requiresRoleSelection: boolean;
  sessionId: string;
  rawToken: string;
}

export async function login(
  input: {
    phone: string;
    password: string;
    preferredContext?: RoleName;
    setCookie?: boolean;
  },
  clientMeta?: { ipAddress?: string | null; userAgent?: string | null; }
): Promise<LoginResult> {
  const parsed = parseInput(loginSchema, input, "Thông tin đăng nhập không hợp lệ.");

  const normalizedPhone = normalizeVietnamPhone(parsed.phone);
  await checkLoginRateLimit(normalizedPhone);

  const user = await findUserWithAccountAndRolesByPhone(normalizedPhone);
  if (!user || !user.account) {
    await recordLoginFailure(normalizedPhone);
    throw new DomainError(
      "INVALID_CREDENTIALS",
      "Số điện thoại hoặc mật khẩu không chính xác.",
      401
    );
  }

  if (user.account.status === "PENDING_ACTIVATION" && !user.account.passwordHash) {
    throw new DomainError(
      "ACCOUNT_PENDING_ACTIVATION",
      "Tài khoản của bạn đang chờ kích hoạt lần đầu. Vui lòng nhập mã xác minh để thiết lập mật khẩu.",
      403,
      { phone: normalizedPhone, accountId: user.account.accountId }
    );
  }


  if (!user.account.passwordHash) {
    await recordLoginFailure(normalizedPhone);
    throw new DomainError(
      "INVALID_CREDENTIALS",
      "Số điện thoại hoặc mật khẩu không chính xác.",
      401
    );
  }

  const isPasswordValid = await verifyPassword(
    user.account.passwordHash,
    parsed.password
  );
  if (!isPasswordValid) {
    await recordLoginFailure(normalizedPhone);
    throw new DomainError(
      "INVALID_CREDENTIALS",
      "Số điện thoại hoặc mật khẩu không chính xác.",
      401
    );
  }

  if (user.account.status === "DISABLED") {
    throw new DomainError(
      "ACCOUNT_DISABLED",
      "Tài khoản của bạn hiện đang tạm khóa. Vui lòng liên hệ phòng khám qua hotline 1900 0091 để được hỗ trợ mở lại.",
      403
    );
  }

  if (user.account.status === "PENDING_ACTIVATION") {
    const challenge = await resendReactivationOtp({ phone: normalizedPhone });
    await clearLoginFailures(normalizedPhone);
    throw new DomainError("ACCOUNT_REACTIVATION_READY", "Nhập mã xác minh đã gửi để mở lại tài khoản.", 403,
      { phone: normalizedPhone, accountId: user.account.accountId, challengeId: challenge.challengeId });
  }

  await clearLoginFailures(normalizedPhone);

  const roles = user.roles.map((r) => r.role as RoleName);
  if (roles.length === 0) {
    throw new DomainError(
      "FORBIDDEN",
      "Tài khoản chưa được gán vai trò sử dụng trong hệ thống.",
      403
    );
  }

  const activeContext =
    parsed.preferredContext && roles.includes(parsed.preferredContext)
      ? parsed.preferredContext
      : getDefaultActiveContext(roles);

  const requiresRoleSelection =
    roles.length > 1 && !parsed.preferredContext;

  const session = await createAuthSession({
    accountId: user.account.accountId,
    activeContext,
    ipAddress: clientMeta?.ipAddress ?? null,
    userAgent: clientMeta?.userAgent ?? null,
    setCookie: input.setCookie ?? true,
  });

  return {
    userId: user.userId,
    accountId: user.account.accountId,
    fullName: user.fullName,
    phone: user.phone,
    roles,
    activeContext,
    requiresRoleSelection,
    sessionId: session.sessionId,
    rawToken: session.rawToken,
  };
}

export async function startPasswordRecovery(input: {
  phone: string;
}): Promise<{
  acknowledged: true;
  phone: string;
  message: string;
}> {
  const parsed = parseInput(passwordRecoveryStartSchema, input, "Số điện thoại không hợp lệ.");

  const normalizedPhone = normalizeVietnamPhone(parsed.phone);
  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);

  if (!existing?.account) throw new DomainError("ACCOUNT_NOT_FOUND", "Số điện thoại này chưa có tài khoản. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.", 404);
  if (existing.account.status === "PENDING_ACTIVATION") {
    if (existing.account.passwordHash) throw new DomainError("ACCOUNT_REACTIVATION_REQUIRED", "Tài khoản đang chờ xác minh mở lại. Vui lòng đăng nhập bằng mật khẩu hiện có hoặc liên hệ phòng khám nếu quên mật khẩu.", 403);
    throw new DomainError("ACCOUNT_PENDING_ACTIVATION", "Tài khoản chưa được kích hoạt. Vui lòng kích hoạt lần đầu để tạo mật khẩu.", 403);
  }
  if (existing.account.status === "DISABLED") throw new DomainError("ACCOUNT_DISABLED", "Tài khoản đang tạm khóa. Vui lòng liên hệ phòng khám để được hỗ trợ.", 403);
  await issueOtpChallenge({ purpose: "RECOVER_PASSWORD", phone: normalizedPhone, accountId: existing.account.accountId });

  return {
    acknowledged: true,
    phone: normalizedPhone,
    message:
      "Mã xác minh đã được gửi qua SMS.",
  };
}

export async function verifyPasswordRecoveryOtp(input: {
  phone: string;
  otpCode: string;
}): Promise<{ phone: string; proofToken: string; }> {
  const normalizedPhone = normalizeVietnamPhone(input.phone);
  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);
  if (!existing?.account || existing.account.status !== "ACTIVE") {
    throw new DomainError(
      "OTP_INVALID",
      "Mã xác minh không hợp lệ hoặc tài khoản không đủ điều kiện đặt lại mật khẩu.",
      400
    );
  }

  const challenge = await verifyAndConsumeOtpChallenge({
    purpose: "RECOVER_PASSWORD",
    phone: normalizedPhone,
    code: input.otpCode,
  });

  const proofToken = createAuthProofToken({
    scope: "RECOVERY",
    phone: normalizedPhone,
    challengeId: challenge.challengeId,
  });

  return {
    phone: normalizedPhone,
    proofToken,
  };
}

export async function completePasswordRecoveryWithProof(input: {
  phone: string;
  proofToken: string;
  newPassword: string;
}): Promise<{ accountId: number; phone: string; }> {
  const verified = verifyAuthProofToken(input.proofToken, "RECOVERY");
  const normalizedPhone = normalizeVietnamPhone(input.phone);
  if (normalizeVietnamPhone(verified.phone) !== normalizedPhone) {
    throw new DomainError(
      "INVALID_PROOF_TOKEN",
      "Vui lòng xác minh lại số điện thoại để đổi mật khẩu.",
      400
    );
  }

  validatePasswordStrength(input.newPassword);

  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);
  if (!existing?.account || existing.account.status !== "ACTIVE") {
    throw new DomainError(
      "ACCOUNT_INVALID",
      "Tài khoản không đủ điều kiện đặt lại mật khẩu.",
      400
    );
  }

  const accountId = existing.account.accountId;
  const passwordHash = await hashPassword(input.newPassword);
  const now = new Date();

  await db.$transaction(async (tx) => {

    await claimProofTokenChallenge(verified.challengeId, tx);

    await tx.account.update({
      where: { accountId },
      data: { passwordHash },
    });

    await tx.authSession.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: now },
    });
  });

  return {
    accountId,
    phone: normalizedPhone,
  };
}

export async function resendReactivationOtp(input: {
  phone: string;
}): Promise<{
  phone: string;
  challengeId: string;
  expiresAt: Date;
}> {
  const normalizedPhone = normalizeVietnamPhone(input.phone);
  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);

  if (!existing?.account || (existing.account.status !== "PENDING_ACTIVATION" || !existing.account.passwordHash)) {
    throw new DomainError(
      "REACTIVATION_NOT_PERMITTED",
      "Tài khoản này chưa được phép mở lại. Vui lòng liên hệ phòng khám.",
      403
    );
  }

  const challenge = await issueOtpChallenge({
    purpose: "REACTIVATE",
    phone: normalizedPhone,
    accountId: existing.account.accountId,
  });

  return {
    phone: normalizedPhone,
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt,
  };
}

export async function completeReactivation(input: {
  phone: string;
  otpCode: string;
}): Promise<{ userId: number; accountId: number; phone: string; }> {
  const parsed = parseInput(reactivationCompleteSchema, input, "Dữ liệu mở lại tài khoản không hợp lệ.");

  const normalizedPhone = normalizeVietnamPhone(parsed.phone);

  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);
  if (!existing?.account || (existing.account.status !== "PENDING_ACTIVATION" || !existing.account.passwordHash)) {
    throw new DomainError(
      "REACTIVATION_NOT_PERMITTED",
      "Không thể mở lại tài khoản này. Vui lòng kiểm tra số điện thoại hoặc liên hệ phòng khám.",
      403
    );
  }

  const challenge = await verifyAndConsumeOtpChallenge({
    purpose: "REACTIVATE",
    phone: normalizedPhone,
    code: parsed.otpCode,
  });

  const now = new Date();

  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT account_id FROM accounts WHERE account_id = ${existing.account!.accountId} FOR UPDATE`;
    await claimProofTokenChallenge(challenge.challengeId, tx);
    const activated = await tx.account.updateMany({
      where: { accountId: existing.account!.accountId, status: "PENDING_ACTIVATION", passwordHash: existing.account!.passwordHash },
      data: { status: "ACTIVE" },
    });
    if (!activated.count) throw new DomainError("REACTIVATION_NOT_PERMITTED", "Quyền mở lại tài khoản đã thay đổi. Vui lòng liên hệ phòng khám.", 403);
    await tx.authSession.updateMany({ where: { accountId: existing.account!.accountId, revokedAt: null }, data: { revokedAt: now } });
  });

  return {
    userId: existing.userId,
    accountId: existing.account.accountId,
    phone: normalizedPhone,
  };
}

export function projectSessionView(session: AuthenticatedContext): import("./contracts").SessionView {
  return {
    fullName: session.fullName,
    phone: session.phone,
    email: session.email,
    birthDate: session.birthDate?.toISOString().slice(0, 10) ?? null,
    activeContext: session.activeContext,
    staffRole: session.staffRole,
    hasPatientRole: session.hasPatientRole,
  };
}
