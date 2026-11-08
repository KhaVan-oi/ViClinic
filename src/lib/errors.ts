import type { ZodType } from "zod";
export type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_PENDING_ACTIVATION"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_REACTIVATION_REQUIRED"
  | "ACCOUNT_REACTIVATION_READY"
  | "ACCOUNT_ALREADY_EXISTS"
  | "IDENTITY_CONFLICT"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_CONSUMED"
  | "OTP_MAX_ATTEMPTS"
  | "OTP_COOLDOWN"
  | "SMS_DELIVERY_FAILED"
  | "RATE_LIMITED"
  | "REACTIVATION_NOT_PERMITTED"
  | "ROLE_CONFLICT"
  | "DEPENDENCY_BLOCKED"
  | "SERVICE_INACTIVE"
  | "DOCTOR_SERVICE_MISMATCH"
  | "PATIENT_DOCTOR_SAME_PERSON"
  | "OUTSIDE_BOOKING_HORIZON"
  | "OUTSIDE_SHIFT"
  | "UNAVAILABILITY_CONFLICT"
  | "PATIENT_OVERLAP_CONFLICT"
  | "DOCTOR_OVERLAP_CONFLICT"
  | "SHIFT_OVERLAP_CONFLICT"
  | "INVALID_STATUS_TRANSITION"
  | "PATIENT_CANCEL_CUTOFF_EXCEEDED"
  | "CONFIRMATION_REQUIRED"
  | "INVALID_PROOF_TOKEN"
  | "EXPIRED_PROOF_TOKEN"
  | "INVALID_PROOF_SCOPE"
  | "PROOF_ALREADY_USED"
  | "ACCOUNT_INVALID"
  | "INVALID_ACCOUNT_STATE";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}

export function apiErrorResponse(error: unknown, fallback: string, unexpectedStatus = 500): Response {
  if (isDomainError(error)) {
    return Response.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  return Response.json({ error: fallback }, { status: unexpectedStatus });
}

export function parseInput<T>(schema: ZodType<T>, value: unknown, fallback: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new DomainError("VALIDATION_ERROR", result.error.issues[0]?.message ?? fallback);
  }
  return result.data;
}

export function encodeActionError(err: unknown): string {
  if (isDomainError(err)) {
    return `${encodeURIComponent(err.message)}&code=${encodeURIComponent(err.code)}`;
  }
  return encodeURIComponent("Không thể thực hiện thao tác. Vui lòng thử lại.");
}

export function rethrowIfNextRedirect(err: unknown): void {
  if (
    err &&
    typeof err === "object" &&
    "digest" in err &&
    String((err as { digest?: string; }).digest).startsWith("NEXT_REDIRECT")
  ) {
    throw err;
  }
}
