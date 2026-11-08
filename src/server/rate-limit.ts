import "server-only";

import { RateLimiterMemory } from "rate-limiter-flexible";
import {
  LOGIN_FAILURE_LIMIT_POINTS,
  LOGIN_FAILURE_WINDOW_SECONDS,
  OTP_ISSUE_LIMIT_POINTS,
  OTP_ISSUE_WINDOW_SECONDS,
} from "@/config/security";
import { DomainError } from "@/lib/errors";

const loginFailureLimiter = new RateLimiterMemory({
  points: LOGIN_FAILURE_LIMIT_POINTS,
  duration: LOGIN_FAILURE_WINDOW_SECONDS,
});

const otpIssueLimiter = new RateLimiterMemory({
  points: OTP_ISSUE_LIMIT_POINTS,
  duration: OTP_ISSUE_WINDOW_SECONDS,
});

export async function checkLoginRateLimit(key: string): Promise<void> {
  const res = await loginFailureLimiter.get(key);
  if (res && res.remainingPoints <= 0) {
    throw new DomainError(
      "RATE_LIMITED",
      "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 10 phút.",
      429
    );
  }
}

export async function recordLoginFailure(key: string): Promise<void> {
  try {
    await loginFailureLimiter.consume(key, 1);
  } catch {
    throw new DomainError(
      "RATE_LIMITED",
      "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 10 phút.",
      429
    );
  }
}

export async function clearLoginFailures(key: string): Promise<void> {
  await loginFailureLimiter.delete(key);
}

export async function consumeOtpIssueLimit(key: string): Promise<void> {
  try {
    await otpIssueLimiter.consume(key, 1);
  } catch {
    throw new DomainError(
      "RATE_LIMITED",
      "Bạn đã yêu cầu mã OTP quá số lần cho phép. Vui lòng thử lại sau 10 phút.",
      429
    );
  }
}
