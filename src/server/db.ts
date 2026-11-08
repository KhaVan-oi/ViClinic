import "server-only";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { env } from "@/config/env";
import { DomainError } from "@/lib/errors";

const globalForPrisma = globalThis as unknown as {
  pgPool?: Pool;
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString: env.DATABASE_URL,

      options: "-c timezone=UTC",
      max: 20,
    });
  globalForPrisma.pgPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type DbTransactionClient = Prisma.TransactionClient;

export function mapDatabaseConstraintError(err: unknown): never {
  if (err instanceof DomainError) {
    throw err;
  }
  const msg = err instanceof Error ? err.message : String(err);
  const meta =
    typeof err === "object" && err !== null && "meta" in err
      ? (err as { meta?: Record<string, unknown>; }).meta
      : undefined;
  const fullText = `${msg} ${JSON.stringify(meta ?? {})}`;

  if (fullText.includes("users_email_normalized_key") || (fullText.includes("email") && (fullText.includes("Unique constraint") || fullText.includes("23505")))) {
    throw new DomainError("IDENTITY_CONFLICT", "Địa chỉ email này đã được sử dụng cho một hồ sơ khác.", 409);
  }

  if (fullText.includes("excl_doctor_shifts_overlap")) {
    throw new DomainError(
      "SHIFT_OVERLAP_CONFLICT",
      "Bác sĩ đã có ca trực trùng giờ. Vui lòng kiểm tra lại thời gian.",
      409
    );
  }
  if (fullText.includes("patient_overlap")) {
    throw new DomainError(
      "PATIENT_OVERLAP_CONFLICT",
      "Người khám bệnh đã có lịch hẹn trùng giờ. Vui lòng chọn giờ khác.",
      409
    );
  }
  if (fullText.includes("doctor_overlap") || fullText.includes("23P01")) {
    throw new DomainError(
      "DOCTOR_OVERLAP_CONFLICT",
      "Khung giờ của bác sĩ vừa được đặt hoặc bị trùng với một lịch hẹn đang hoạt động khác.",
      409
    );
  }
  if (fullText.includes("uq_user_roles_one_staff_role")) {
    throw new DomainError(
      "ROLE_CONFLICT",
      "Một nhân sự chỉ được giữ một vai trò làm việc.",
      409
    );
  }
  if (fullText.includes("chk_appointments_patient_not_doctor")) {
    throw new DomainError(
      "PATIENT_DOCTOR_SAME_PERSON",
      "Người khám bệnh và bác sĩ phụ trách không được là cùng một người.",
      400
    );
  }
  if (fullText.includes("users_phone_key") || fullText.includes("phone")) {
    if (fullText.includes("Unique constraint") || fullText.includes("23505")) {
      throw new DomainError(
        "IDENTITY_CONFLICT",
        "Số điện thoại này đã tồn tại trong hệ thống.",
        409
      );
    }
  }
  throw err;
}
