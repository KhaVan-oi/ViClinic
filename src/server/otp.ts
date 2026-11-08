import "server-only";

import crypto from "crypto";
import { addMinutes, addSeconds } from "date-fns";
import { OtpPurpose } from "@/config/business";
import { env } from "@/config/env";
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from "@/config/security";
import { DomainError } from "@/lib/errors";
import { db } from "@/server/db";
import { smsGateway } from "@/server/sms";
import { consumeOtpIssueLimit } from "@/server/rate-limit";

export function computeOtpHmac(input: {
  challengeId: string;
  phone: string;
  purpose: OtpPurpose;
  code: string;
}): string {
  const payload = `${input.challengeId}:${input.phone}:${input.purpose}:${input.code}`;
  return crypto
    .createHmac("sha256", env.OTP_HMAC_SECRET)
    .update(payload)
    .digest("hex");
}

export function generateSixDigitOtp(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

const PURPOSE_LABELS: Record<OtpPurpose, string> = {
  ACTIVATE: "kich hoat tai khoan",
  RECOVER_PASSWORD: "khoi phuc mat khau",
  REACTIVATE: "kich hoat lai tai khoan",
};

export async function issueOtpChallenge(input: {
  purpose: OtpPurpose;
  phone: string;
  accountId: number | null;
  skipCooldown?: boolean;
}): Promise<{ challengeId: string; expiresAt: Date; }> {
  const now = new Date();

  if (!input.skipCooldown) {
    const existing = await db.otpChallenge.findFirst({
      where: {
        phone: input.phone,
        purpose: input.purpose,
        consumedAt: null,
      },
      orderBy: [{ createdAt: "desc" }, { attemptCount: "asc" }],
    });

    if (
      existing &&
      existing.expiresAt.getTime() > now.getTime() &&
      existing.attemptCount < OTP_MAX_ATTEMPTS
    ) {
      const cooldownUntil = addSeconds(existing.createdAt, OTP_RESEND_COOLDOWN_SECONDS);
      if (cooldownUntil.getTime() > now.getTime()) {
        const waitSec = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000);
        throw new DomainError(
          "OTP_COOLDOWN",
          `Vui lòng đợi ${waitSec} giây trước khi yêu cầu gửi lại mã xác minh.`,
          429
        );
      }
    }
  }

  await consumeOtpIssueLimit(`${input.purpose}:${input.phone}`);

  const challengeId = crypto.randomUUID();
  const code = generateSixDigitOtp();
  const codeDigest = computeOtpHmac({
    challengeId,
    phone: input.phone,
    purpose: input.purpose,
    code,
  });
  const expiresAt = addMinutes(now, OTP_TTL_MINUTES);

  const label = PURPOSE_LABELS[input.purpose];
  await smsGateway.sendSms({
    to: input.phone,
    message: `[ViClinic] Ma xac thuc ${label} cua ban la ${code}. Hieu luc trong ${OTP_TTL_MINUTES} phut.`,
  });

  const created = await db.$transaction(async (tx) => {
    await tx.otpChallenge.updateMany({
      where: {
        phone: input.phone,
        purpose: input.purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        attemptCount: OTP_MAX_ATTEMPTS + 1,
      },
    });

    return tx.otpChallenge.create({
      data: {
        challengeId,
        accountId: input.accountId,
        phone: input.phone,
        purpose: input.purpose,
        codeDigest,
        createdAt: now,
        expiresAt,
        attemptCount: 0,
      },
    });
  });

  return {
    challengeId: created.challengeId,
    expiresAt: created.expiresAt,
  };
}

export async function verifyAndConsumeOtpChallenge(input: {
  purpose: OtpPurpose;
  phone: string;
  code: string;
  challengeId?: string;
}): Promise<{
  challengeId: string;
  accountId: number | null;
  phone: string;
  purpose: OtpPurpose;
}> {
  const now = new Date();
  const trimmedCode = input.code.trim();

  if (!/^\d{6}$/.test(trimmedCode)) {
    throw new DomainError("OTP_INVALID", "Mã xác minh phải gồm đúng 6 chữ số.", 400);
  }

  const latestForPurpose = await db.otpChallenge.findFirst({
    where: {
      phone: input.phone,
      purpose: input.purpose,
    },
    orderBy: [{ createdAt: "desc" }, { attemptCount: "asc" }],
  });

  const challenge = input.challengeId
    ? await db.otpChallenge.findUnique({ where: { challengeId: input.challengeId } })
    : latestForPurpose;

  if (!challenge || challenge.phone !== input.phone || challenge.purpose !== input.purpose) {
    throw new DomainError("OTP_INVALID", "Mã xác minh không hợp lệ hoặc không tồn tại.", 400);
  }

  if (challenge.consumedAt) {
    throw new DomainError("OTP_CONSUMED", "Mã xác minh này đã được sử dụng.", 400);
  }

  if (
    (latestForPurpose && latestForPurpose.challengeId !== challenge.challengeId) ||
    challenge.attemptCount > OTP_MAX_ATTEMPTS
  ) {
    throw new DomainError(
      "OTP_INVALID",
      "Mã xác minh cũ đã hết hiệu lực do bạn vừa yêu cầu gửi mã mới.",
      400
    );
  }

  if (challenge.expiresAt.getTime() <= now.getTime()) {
    throw new DomainError("OTP_EXPIRED", "Mã xác minh đã hết hạn. Vui lòng yêu cầu gửi mã mới.", 400);
  }

  if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw new DomainError(
      "OTP_MAX_ATTEMPTS",
      "Bạn đã nhập sai mã xác minh quá số lần cho phép. Vui lòng yêu cầu gửi mã mới.",
      400
    );
  }

  const expectedDigest = computeOtpHmac({
    challengeId: challenge.challengeId,
    phone: challenge.phone,
    purpose: challenge.purpose as OtpPurpose,
    code: trimmedCode,
  });

  const aBuf = Buffer.from(challenge.codeDigest, "hex");
  const bBuf = Buffer.from(expectedDigest, "hex");
  const isMatch = aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);

  if (!isMatch) {
    const attempt = await db.otpChallenge.updateMany({
      where: {
        challengeId: challenge.challengeId,
        consumedAt: null,
        attemptCount: { lt: OTP_MAX_ATTEMPTS },
        expiresAt: { gt: now },
      },
      data: {
        attemptCount: { increment: 1 },
      },
    });
    const updatedChallenge = await db.otpChallenge.findUnique({
      where: { challengeId: challenge.challengeId },
      select: { attemptCount: true },
    });
    if (attempt.count === 0 || !updatedChallenge || updatedChallenge.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new DomainError(
        "OTP_MAX_ATTEMPTS",
        "Bạn đã nhập sai mã xác minh quá số lần cho phép. Vui lòng yêu cầu gửi mã mới.",
        400
      );
    }
    throw new DomainError("OTP_INVALID", "Mã xác minh không chính xác.", 400);
  }

  const updateResult = await db.otpChallenge.updateMany({
    where: {
      challengeId: challenge.challengeId,
      consumedAt: null,
      attemptCount: { lt: OTP_MAX_ATTEMPTS },
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });

  if (updateResult.count === 0) {
    throw new DomainError(
      "OTP_CONSUMED",
      "Mã xác minh này đã được sử dụng hoặc đã bị hủy.",
      400
    );
  }

  return {
    challengeId: challenge.challengeId,
    accountId: challenge.accountId,
    phone: challenge.phone,
    purpose: challenge.purpose as OtpPurpose,
  };
}
