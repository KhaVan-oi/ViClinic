import "server-only";
import { AUTH_PROOF_CLAIMED_ATTEMPTS } from "@/config/security";

import crypto from "crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { env } from "@/config/env";
import { DomainError } from "@/lib/errors";

export const REGISTRATION_PROOF_COOKIE_NAME = "viclinic_reg_proof";

export const ACTIVATION_PROOF_COOKIE_NAME = "viclinic_act_proof";

export const RECOVERY_PROOF_COOKIE_NAME = "viclinic_rec_proof";
export const REACTIVATION_LOGIN_COOKIE_NAME = "viclinic_reactivation_login";

export const AUTH_PROOF_TTL_SECONDS = 15 * 60;

export const REGISTRATION_PROOF_TTL_SECONDS = AUTH_PROOF_TTL_SECONDS;

export type AuthProofScope = "REGISTRATION" | "ACTIVATION" | "RECOVERY" | "REACTIVATION_LOGIN";

export interface AuthProofPayload {
  phone: string;
  challengeId: string;
  scope: AuthProofScope;
  exp: number;
}

const proofPayloadSchema = z.object({
  phone: z.string().min(1),
  challengeId: z.string().min(1),
  scope: z.enum(["REGISTRATION", "ACTIVATION", "RECOVERY", "REACTIVATION_LOGIN"]),
  exp: z.number().int().positive(),
});

function invalidProof(): never {
  throw new DomainError("INVALID_PROOF_TOKEN", "Không thể tiếp tục xác minh. Vui lòng nhận mã mới.", 400);
}

export function createAuthProofToken(input: {
  phone: string;
  challengeId: string;
  scope: AuthProofScope;
}): string {
  const exp = Math.floor(Date.now() / 1000) + AUTH_PROOF_TTL_SECONDS;
  const payload: AuthProofPayload = {
    phone: input.phone,
    challengeId: input.challengeId,
    scope: input.scope,
    exp,
  };

  const serialized = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.OTP_HMAC_SECRET)
    .update(serialized)
    .digest("hex");

  return `${serialized}.${signature}`;
}

export function verifyAuthProofToken(
  token: string,
  expectedScope: AuthProofScope
): AuthProofPayload {
  if (!token || typeof token !== "string") {
    invalidProof();
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    invalidProof();
  }

  const [serialized, signature] = parts;
  if (!/^[a-f0-9]{64}$/.test(signature)) invalidProof();
  const expectedSignature = crypto
    .createHmac("sha256", env.OTP_HMAC_SECRET)
    .update(serialized)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expectedSignature, "hex");

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    invalidProof();
  }

  let payload: AuthProofPayload;
  try {
    payload = proofPayloadSchema.parse(JSON.parse(Buffer.from(serialized, "base64url").toString("utf-8")));
  } catch {
    invalidProof();
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec) {
    throw new DomainError(
      "EXPIRED_PROOF_TOKEN",
      "Bạn đã hết thời gian hoàn tất thông tin. Vui lòng xác minh số điện thoại lại.",
      400
    );
  }

  if (expectedScope && payload.scope !== expectedScope) {
    throw new DomainError(
      "INVALID_PROOF_SCOPE",
      "Mã xác minh không dùng được cho thao tác này. Vui lòng nhận mã mới.",
      403
    );
  }

  return payload;
}

export async function claimProofTokenChallenge(
  challengeId: string,
  tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0]
): Promise<void> {
  const client = tx ?? db;
  const result = await client.otpChallenge.updateMany({
    where: {
      challengeId,
      consumedAt: { not: null },
      attemptCount: { lt: AUTH_PROOF_CLAIMED_ATTEMPTS },
    },
    data: {
      attemptCount: AUTH_PROOF_CLAIMED_ATTEMPTS,
    },
  });

  if (result.count === 0) {
    throw new DomainError(
      "PROOF_ALREADY_USED",
      "Lần xác minh này không còn sử dụng được. Vui lòng nhận mã mới.",
      400
    );
  }
}

export async function verifyReactivationLoginProof(token: string, phone?: string) {
  const proof = verifyAuthProofToken(token, "REACTIVATION_LOGIN");
  const challenge = await db.otpChallenge.findFirst({
    where: { challengeId: proof.challengeId, phone: proof.phone, purpose: "REACTIVATE", attemptCount: { lt: AUTH_PROOF_CLAIMED_ATTEMPTS },
      account: { status: "PENDING_ACTIVATION", passwordHash: { not: null } } },
    select: { challengeId: true },
  });
  if (!challenge || (phone && proof.phone !== phone)) {
    throw new DomainError("INVALID_PROOF_TOKEN", "Vui lòng đăng nhập lại để tiếp tục mở tài khoản.", 403);
  }
  return proof;
}
