import "server-only";

import { DomainError, parseInput } from "@/lib/errors";
import { normalizeVietnamPhone } from "@/lib/profile";
import { parseDateOnlyUtc } from "@/lib/dates";
import { db, mapDatabaseConstraintError } from "@/server/db";
import { issueOtpChallenge, verifyAndConsumeOtpChallenge } from "@/server/otp";
import { hashPassword, validatePasswordStrength } from "@/server/password";
import { completeActivationSchema, patientRegistrationStartSchema } from "@/modules/identity/contracts";
import { findUserWithAccountAndRolesByPhone } from "@/modules/identity/queries";
import {
  claimProofTokenChallenge,
  verifyAuthProofToken,
} from "@/modules/identity/proof";

export async function startPatientRegistration(input: {
  phone: string;
  fullName?: string;
  birthDate?: string;
  email?: string;
}): Promise<{
  phone: string;
  userId: number | null;
  accountId: number | null;
  challengeId: string;
  expiresAt: Date;
  reusedIdentity: boolean;
  fullName: string;
  birthDate: string;
  email: string | null;
}> {
  const parsed = parseInput(patientRegistrationStartSchema, input, "Thông tin đăng ký không hợp lệ.");

  const normalizedPhone = normalizeVietnamPhone(parsed.phone);
  const normalizedEmail = parsed.email?.trim()
    ? parsed.email.trim().toLowerCase()
    : null;

  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);

  if (existing?.account) {
    if (existing.account.status === "ACTIVE") {
      throw new DomainError(
        "ACCOUNT_ALREADY_EXISTS",
        "Số điện thoại này đã có tài khoản đang hoạt động. Vui lòng đăng nhập hoặc chọn Quên mật khẩu.",
        409
      );
    }
    if (existing.account.status === "PENDING_ACTIVATION") {
      if (existing.account.passwordHash) {
        throw new DomainError("ACCOUNT_REACTIVATION_REQUIRED", "Tài khoản đã được phép mở lại. Vui lòng đăng nhập bằng mật khẩu hiện có để nhận mã xác minh.", 403);
      }
      throw new DomainError(
        "ACCOUNT_PENDING_ACTIVATION",
        "Tài khoản của bạn đang chờ kích hoạt lần đầu. Vui lòng hoàn tất kích hoạt.",
        403,
        { phone: normalizedPhone, accountId: existing.account.accountId }
      );
    }
    if (existing.account.status === "DISABLED") {
      throw new DomainError(
        "ACCOUNT_DISABLED",
        "Tài khoản gắn với số điện thoại này hiện đang tạm khóa. Vui lòng liên hệ phòng khám để được hỗ trợ.",
        403,
        { phone: normalizedPhone, accountId: existing.account.accountId }
      );
    }
  }

  if (normalizedEmail) {
    const emailOwner = await db.user.findFirst({
      where: { email: normalizedEmail },
    });
    if (emailOwner && emailOwner.userId !== existing?.userId) {
      throw new DomainError(
        "IDENTITY_CONFLICT",
        "Địa chỉ email này đã được sử dụng cho một hồ sơ khác.",
        409
      );
    }
  }

  const challenge = await issueOtpChallenge({
    purpose: "ACTIVATE",
    phone: normalizedPhone,
    accountId: existing?.account?.accountId ?? null,
  });

  const draftData = {
    fullName: parsed.fullName ?? existing?.fullName ?? "",
    birthDate:
      parsed.birthDate ??
      (existing?.birthDate ? existing.birthDate.toISOString().slice(0, 10) : ""),
    email: normalizedEmail ?? existing?.email ?? null,
  };

  return {
    phone: normalizedPhone,
    userId: existing?.userId ?? null,
    accountId: existing?.account?.accountId ?? null,
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt,
    reusedIdentity: Boolean(existing),
    ...draftData,
  };
}

export async function completePatientRegistration(input: {
  phone: string;
  otpCode?: string;
  proofToken?: string;
  password: string;
  fullName?: string;
  birthDate?: string;
  email?: string;
}): Promise<{ userId: number; accountId: number; phone: string; reusedIdentity: boolean; }> {
  const parsed = parseInput(completeActivationSchema, input, "Dữ liệu xác thực không hợp lệ.");
  parseInput(patientRegistrationStartSchema, parsed, "Thông tin hồ sơ không hợp lệ.");

  const normalizedPhone = normalizeVietnamPhone(parsed.phone);
  validatePasswordStrength(parsed.password);

  let challengeId: string | undefined;

  if (parsed.proofToken) {
    const proof = verifyAuthProofToken(parsed.proofToken, "REGISTRATION");
    if (normalizeVietnamPhone(proof.phone) !== normalizedPhone) {
      throw new DomainError(
        "INVALID_PROOF_TOKEN",
        "Số điện thoại chưa được xác minh. Vui lòng nhận mã mới.",
        400
      );
    }
    challengeId = proof.challengeId;
  } else if (parsed.otpCode) {
    const consumedChallenge = await verifyAndConsumeOtpChallenge({
      purpose: "ACTIVATE",
      phone: normalizedPhone,
      code: parsed.otpCode,
    });
    challengeId = consumedChallenge.challengeId;
  } else {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Vui lòng cung cấp mã OTP hoặc phiên xác thực hợp lệ."
    );
  }

  const existingBeforeVerify = await findUserWithAccountAndRolesByPhone(normalizedPhone);
  if (existingBeforeVerify?.account?.passwordHash || existingBeforeVerify?.account?.status === "ACTIVE") {
    throw new DomainError(
      "ACCOUNT_ALREADY_EXISTS",
      "Tài khoản này đã được kích hoạt trước đó. Vui lòng đăng nhập.",
      409
    );
  }
  if (existingBeforeVerify?.account?.status === "DISABLED") {
    throw new DomainError(
      "ACCOUNT_DISABLED",
      "Tài khoản hiện đang tạm khóa, không thể kích hoạt.",
      403
    );
  }

  const effectiveFullName =
    parsed.fullName?.trim() ||
    existingBeforeVerify?.fullName ||
    "";
  const effectiveBirthDateStr =
    parsed.birthDate?.trim() ||
    null;
  const effectiveEmail = parsed.email !== undefined ? parsed.email.trim().toLowerCase() || null : existingBeforeVerify?.email ?? null;

  if (!existingBeforeVerify && (!effectiveFullName || !effectiveBirthDateStr)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Vui lòng cung cấp đầy đủ họ tên và ngày sinh để hoàn tất tạo hồ sơ khám bệnh."
    );
  }

  const parsedBirthDate = effectiveBirthDateStr
    ? parseDateOnlyUtc(effectiveBirthDateStr)
    : null;

  if (!existingBeforeVerify?.birthDate && !parsedBirthDate) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Vui lòng cung cấp ngày sinh hợp lệ để hoàn tất tạo hồ sơ khám bệnh."
    );
  }

  const passwordHash = await hashPassword(parsed.password);
  const now = new Date();

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { phone: normalizedPhone },
        include: { account: true, roles: true },
      });

      if (effectiveEmail && await tx.user.findFirst({where: {email: effectiveEmail, ...(existing ? {userId: {not: existing.userId}} : {})}})) {
        throw new DomainError("IDENTITY_CONFLICT", "Địa chỉ email này đã được sử dụng cho một hồ sơ khác.", 409);
      }

      if (existing) {
        if (existing.account?.passwordHash || existing.account?.status === "ACTIVE") {
          throw new DomainError(
            "ACCOUNT_ALREADY_EXISTS",
            "Tài khoản này đã được kích hoạt trước đó.",
            409
          );
        }
        if (existing.account?.status === "DISABLED") {
          throw new DomainError(
            "ACCOUNT_DISABLED",
            "Tài khoản hiện đang tạm khóa.",
            403
          );
        }

      }

      const user = existing
        ? await tx.user.update({
            where: { userId: existing.userId },
            data: {
              fullName: effectiveFullName,
              birthDate: parsedBirthDate ?? existing.birthDate,
              email: effectiveEmail,
            },
          })
        : await tx.user.create({
            data: {
              phone: normalizedPhone,
              fullName: effectiveFullName,
              birthDate: parsedBirthDate,
              email: effectiveEmail,
            },
          });

      if (!existing?.roles.some(role => role.role === "PATIENT")) {
        await tx.userRole.create({ data: { userId: user.userId, role: "PATIENT" } });
      }
      const credentials = { passwordHash, status: "ACTIVE" };
      const account = existing?.account
        ? await tx.account.update({ where: { accountId: existing.account.accountId }, data: credentials })
        : await tx.account.create({ data: { userId: user.userId, ...credentials } });

      if (challengeId) {
        await claimProofTokenChallenge(challengeId, tx);
        await tx.otpChallenge.updateMany({ where: { challengeId }, data: { accountId: account.accountId } });
      }
      if (existing) {
        await tx.authSession.updateMany({
          where: { accountId: account.accountId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      return { userId: user.userId, accountId: account.accountId, reusedIdentity: Boolean(existing) };
    });

    return {
      userId: result.userId,
      accountId: result.accountId,
      phone: normalizedPhone,
      reusedIdentity: result.reusedIdentity,
    };
  } catch (err) {
    mapDatabaseConstraintError(err);
  }
}

export async function startStaffActivation(input: {
  phone: string;
}): Promise<{
  phone: string;
  accountId: number;
  challengeId: string;
  expiresAt: Date;
}> {
  const normalizedPhone = normalizeVietnamPhone(input.phone);
  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);

  if (!existing || !existing.account) {
    throw new DomainError(
      "ACCOUNT_NOT_FOUND",
      "Không tìm thấy hồ sơ tài khoản chờ kích hoạt với số điện thoại này.",
      404
    );
  }

  if (existing.account.status === "ACTIVE") {
    throw new DomainError(
      "ACCOUNT_ALREADY_EXISTS",
      "Tài khoản đã được kích hoạt trước đó. Vui lòng đăng nhập bằng mật khẩu của bạn.",
      409
    );
  }

  if (existing.account.status === "DISABLED") {
    throw new DomainError(
      "ACCOUNT_DISABLED",
      "Tài khoản hiện đang tạm khóa. Vui lòng liên hệ phòng khám để được hỗ trợ.",
      403
    );
  }

  if (existing.account.passwordHash) {
    throw new DomainError("ACCOUNT_REACTIVATION_REQUIRED", "Đăng nhập bằng mật khẩu hiện có để xác minh mở lại tài khoản.", 403);
  }

  const challenge = await issueOtpChallenge({
    purpose: "ACTIVATE",
    phone: normalizedPhone,
    accountId: existing.account.accountId,
  });

  return {
    phone: normalizedPhone,
    accountId: existing.account.accountId,
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt,
  };
}

export async function completeStaffActivationWithProof(input: {
  phone: string;
  proofToken: string;
  password: string;
}): Promise<{ userId: number; accountId: number; phone: string; }> {
  const verified = verifyAuthProofToken(input.proofToken, "ACTIVATION");
  const normalizedPhone = normalizeVietnamPhone(input.phone);
  if (normalizeVietnamPhone(verified.phone) !== normalizedPhone) {
    throw new DomainError(
      "INVALID_PROOF_TOKEN",
      "Vui lòng xác minh lại số điện thoại để kích hoạt tài khoản.",
      400
    );
  }

  const existing = await findUserWithAccountAndRolesByPhone(normalizedPhone);
  if (!existing || !existing.account) {
    throw new DomainError(
      "ACCOUNT_NOT_FOUND",
      "Không tìm thấy tài khoản nhân sự cần kích hoạt.",
      404
    );
  }

  if (existing.account.status !== "PENDING_ACTIVATION" || existing.account.passwordHash) {
    throw new DomainError(
      "INVALID_ACCOUNT_STATE",
      "Tài khoản này không cần kích hoạt. Vui lòng đăng nhập.",
      400
    );
  }

  const accountId = existing.account.accountId;
  const passwordHash = await hashPassword(input.password);
  await db.$transaction(async (tx) => {
    await claimProofTokenChallenge(verified.challengeId, tx);
    const activated = await tx.account.updateMany({
      where: { accountId, status: "PENDING_ACTIVATION", passwordHash: null },
      data: { passwordHash, status: "ACTIVE" },
    });
    if (!activated.count) throw new DomainError("INVALID_ACCOUNT_STATE", "Trạng thái tài khoản đã thay đổi. Vui lòng đăng nhập lại.", 409);
  });

  return {
    userId: existing.userId,
    accountId,
    phone: normalizedPhone,
  };
}
