export const PASSWORD_MIN_LENGTH = 8 as const;

export const PASSWORD_HASH_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MAX_LENGTH = 128 as const;
export const PASSWORD_PATTERN = `(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[\\x21-\\x7E]{${PASSWORD_MIN_LENGTH},${PASSWORD_MAX_LENGTH}}`;
export const PASSWORD_RULE_MESSAGE = `Mật khẩu cần ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} ký tự không dấu, gồm chữ hoa, chữ thường, số và ký hiệu; không dùng khoảng trắng.`;

export const SESSION_TTL_HOURS = 8 as const;

export const OTP_TTL_MINUTES = 5 as const;

export const OTP_MAX_ATTEMPTS = 5 as const;

export const OTP_RESEND_COOLDOWN_SECONDS = 60 as const;

export const LOGIN_FAILURE_LIMIT_POINTS = 5 as const;

export const LOGIN_FAILURE_WINDOW_SECONDS = 600 as const;

export const OTP_ISSUE_LIMIT_POINTS = 3 as const;

export const OTP_ISSUE_WINDOW_SECONDS = 600 as const;

export const AUTH_PROOF_CLAIMED_ATTEMPTS = 999;
