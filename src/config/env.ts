import "server-only";

import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OTP_HMAC_SECRET: z.string().min(32).refine(
    (val) => !isProd || val !== "viclinic-local-dev-otp-hmac-secret-key-2026-32bytes",
    { message: "Default dev OTP_HMAC_SECRET is strictly forbidden in production." }
  ),
  SESSION_COOKIE_NAME: z.string().min(1).default("viclinic_session"),
  SMS_API_BASE_URL: z.string().url().default("http://localhost:4001"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
