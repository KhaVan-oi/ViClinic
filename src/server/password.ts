import "server-only";

import argon2 from "argon2";
import { PASSWORD_HASH_OPTIONS, PASSWORD_PATTERN, PASSWORD_RULE_MESSAGE } from "@/config/security";
import { DomainError } from "@/lib/errors";

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  ...PASSWORD_HASH_OPTIONS,
};

const passwordPattern = new RegExp(`^${PASSWORD_PATTERN}$`);

export function validatePasswordStrength(password: string): void {
  if (typeof password !== "string" || !passwordPattern.test(password)) throw new DomainError("VALIDATION_ERROR", PASSWORD_RULE_MESSAGE);
}

export async function hashPassword(plaintext: string): Promise<string> {
  validatePasswordStrength(plaintext);
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string | null | undefined,
  plaintext: string
): Promise<boolean> {
  if (!passwordHash || !plaintext) {
    return false;
  }
  try {
    return await argon2.verify(passwordHash, plaintext);
  } catch {
    return false;
  }
}
