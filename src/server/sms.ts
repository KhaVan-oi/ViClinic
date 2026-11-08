import "server-only";

import { env } from "@/config/env";
import { DomainError } from "@/lib/errors";

const SMS_TIMEOUT_MS = 15_000;

export const smsGateway = {
  async sendSms(payload: { to: string; message: string; }): Promise<void> {
    try {
      const response = await fetch(`${env.SMS_API_BASE_URL.replace(/\/$/, "")}/v1/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: payload.to, body: payload.message }),
        signal: AbortSignal.timeout(SMS_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new DomainError("SMS_DELIVERY_FAILED", "Chưa gửi được mã xác minh. Vui lòng thử lại sau ít phút.", 503);
      }
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError("SMS_DELIVERY_FAILED", "Chưa gửi được mã xác minh. Vui lòng thử lại sau ít phút.", 503);
    }
  },
};
