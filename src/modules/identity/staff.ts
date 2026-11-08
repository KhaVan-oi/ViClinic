import "server-only";
import { protectLastActiveAdmin } from "./admin-guard";

import { RoleName, STAFF_ROLES, StaffRoleName } from "@/config/business";
import { parseDateOnlyUtc } from "@/lib/dates";
import { DomainError, parseInput } from "@/lib/errors";
import { normalizeVietnamPhone } from "@/lib/profile";
import { requireActiveContext } from "@/server/authorization";
import { db, mapDatabaseConstraintError, DbTransactionClient } from "@/server/db";
import { issueOtpChallenge } from "@/server/otp";
import { AuthenticatedContext, getCurrentSession } from "@/server/session";
import {
  validateRoleSet,
  changeStaffRoleSchema,
  createOrReuseStaffSchema,
  enablePersonalPatientSchema,
  computeDoctorDependencyBlocked,
  DoctorRoleDependencySummary,
} from "@/modules/identity/contracts";

export async function createOrReuseStaff(
  input: {
    phone: string;
    fullName: string;
    birthDate?: string | null;
    email?: string | null;
    staffRole: StaffRoleName;
    includePatientRole?: boolean;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  userId: number;
  accountId: number;
  phone: string;
  reusedIdentity: boolean;
  accountStatus: string;
  roles: RoleName[];
  activationOtpSent: boolean | null;
}> {
  await requireActiveContext(["ADMIN"], explicitCtx);

  const parsed = parseInput(createOrReuseStaffSchema, {
    ...input,
    birthDate: input.birthDate ?? "",
    email: input.email ?? "",
  }, "Dữ liệu tạo nhân sự không hợp lệ.");

  const normalizedPhone = normalizeVietnamPhone(parsed.phone);
  const parsedBirthDate = parseDateOnlyUtc(parsed.birthDate);
  const normalizedEmail = parsed.email?.toLowerCase() || null;

  const existing = await db.user.findUnique({
    where: { phone: normalizedPhone },
    include: { account: true, roles: true },
  });

  if (existing) {
    const currentRoles = existing.roles.map((r) => r.role as RoleName);
    const existingStaffRoles = currentRoles.filter((r) =>
      (STAFF_ROLES as readonly string[]).includes(r)
    );
    if (existingStaffRoles.length > 0) {
      throw new DomainError(
        "ROLE_CONFLICT",
        "Số điện thoại này đã thuộc về một nhân sự trong hệ thống. Vui lòng quản lý phân quyền tại trang Vai trò nhân sự.",
        409
      );
    }
  }


  try {
    const txResult = await db.$transaction(async (tx) => {
      const currentRoles = existing?.roles.map(row => row.role as RoleName) ?? [];
      const nextRoles = Array.from(new Set<RoleName>([
        ...currentRoles,
        parsed.staffRole,
        ...(parsed.includePatientRole ? ["PATIENT" as const] : []),
      ]));
      const roleCheck = validateRoleSet(nextRoles);
      if (!roleCheck.valid) throw new DomainError("ROLE_CONFLICT", roleCheck.reason, 409);

      const user = existing
        ? await tx.user.update({
          where: { userId: existing.userId },
          data: {
            fullName: parsed.fullName,
            birthDate: existing.birthDate ?? parsedBirthDate,
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
          },
        })
        : await tx.user.create({
          data: {
            phone: normalizedPhone,
            fullName: parsed.fullName,
            birthDate: parsedBirthDate,
            email: normalizedEmail,
          },
        });

      for (const role of nextRoles) {
        if (!currentRoles.includes(role)) {
          await tx.userRole.create({ data: { userId: user.userId, role } });
        }
      }
      const account = existing?.account ?? await tx.account.create({
        data: { userId: user.userId, passwordHash: null, status: "PENDING_ACTIVATION" },
      });
      if (account.status === "ACTIVE") {
        await tx.authSession.updateMany({
          where: { accountId: account.accountId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return {
        userId: user.userId,
        accountId: account.accountId,
        accountStatus: account.status,
        reusedIdentity: Boolean(existing),
        roles: nextRoles,
        shouldIssueActivateOtp: account.status === "PENDING_ACTIVATION" && !account.passwordHash,
      };
    });

    let activationOtpSent: boolean | null = null;
    if (txResult.shouldIssueActivateOtp) {
      try {
        await issueOtpChallenge({
          purpose: "ACTIVATE",
          phone: normalizedPhone,
          accountId: txResult.accountId,
          skipCooldown: true,
        });
        activationOtpSent = true;
      } catch (error) {
        if (!(error instanceof DomainError) || !["SMS_DELIVERY_FAILED", "RATE_LIMITED"].includes(error.code)) throw error;
        activationOtpSent = false;
      }
    }

    return {
      userId: txResult.userId,
      accountId: txResult.accountId,
      phone: normalizedPhone,
      reusedIdentity: txResult.reusedIdentity,
      accountStatus: txResult.accountStatus,
      roles: txResult.roles,
      activationOtpSent,
    };
  } catch (err) {
    mapDatabaseConstraintError(err);
  }
}

export async function enablePersonalPatientForCurrentStaff(
  input: {
    birthDate?: string | null;
    email?: string | null;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  userId: number;
  roles: RoleName[];
  birthDate: string;
}> {
  const ctx = explicitCtx ?? (await getCurrentSession());
  if (!ctx) {
    throw new DomainError(
      "UNAUTHENTICATED",
      "Vui lòng đăng nhập để đặt lịch cho bản thân.",
      401
    );
  }

  const parsed = parseInput(enablePersonalPatientSchema, {
    birthDate: input.birthDate ?? "",
    email: input.email ?? "",
  }, "Dữ liệu thiết lập hồ sơ cá nhân không hợp lệ.");

  const user = await db.user.findUnique({
    where: { userId: ctx.userId },
    include: { roles: true },
  });
  if (!user) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy thông tin người dùng.", 404);
  }

  const parsedBirthDate =
    parsed.birthDate && parsed.birthDate.trim().length > 0
      ? parseDateOnlyUtc(parsed.birthDate.trim())
      : null;

  const finalBirthDate = user.birthDate ?? parsedBirthDate;
  if (!finalBirthDate) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Vui lòng nhập ngày sinh để kích hoạt hồ sơ đặt lịch khám cá nhân."
    );
  }

  const normalizedEmail = parsed.email?.trim()
    ? parsed.email.trim().toLowerCase()
    : null;

  const currentRoles = user.roles.map((r) => r.role as RoleName);
  const nextRoles = Array.from(new Set<RoleName>([...currentRoles, "PATIENT"]));
  const roleCheck = validateRoleSet(nextRoles);
  if (!roleCheck.valid) {
    throw new DomainError("ROLE_CONFLICT", roleCheck.reason, 409);
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { userId: user.userId },
        data: {
          birthDate: user.birthDate ?? finalBirthDate,
          ...(normalizedEmail && !user.email ? { email: normalizedEmail } : {}),
        },
      });

      if (!currentRoles.includes("PATIENT")) {
        await tx.userRole.create({
          data: {
            userId: user.userId,
            role: "PATIENT",
          },
        });
      }
    });

    return {
      userId: user.userId,
      roles: nextRoles,
      birthDate: finalBirthDate.toISOString().slice(0, 10),
    };
  } catch (err) {
    mapDatabaseConstraintError(err);
  }
}

export async function changeStaffRole(
  input: {
    userId: number;
    nextStaffRole: StaffRoleName | null;
    keepPatientRole?: boolean;
    birthDate?: string;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  userId: number;
  roles: RoleName[];
}> {
  await requireActiveContext(["ADMIN"], explicitCtx);

  const parsed = parseInput(changeStaffRoleSchema, input, "Dữ liệu phân quyền không hợp lệ.");

  return db.$transaction(async (tx) => {
    if (parsed.nextStaffRole !== "ADMIN") await protectLastActiveAdmin(tx, parsed.userId);
    const user = await tx.user.findUnique({
      where: { userId: parsed.userId },
      include: { roles: true, account: true },
    });

    if (!user) {
      throw new DomainError("NOT_FOUND", "Không tìm thấy người dùng.", 404);
    }

    const currentRoles = user.roles.map((r) => r.role as RoleName);
    const hadDoctor = currentRoles.includes("DOCTOR");
    const hadPatient = currentRoles.includes("PATIENT");
    const shouldHavePatient = hadPatient || Boolean(parsed.keepPatientRole);

    const birthDate = user.birthDate ?? (parsed.birthDate ? parseDateOnlyUtc(parsed.birthDate) : null);
    if (!birthDate) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Vui lòng bổ sung ngày sinh trước khi lưu thay đổi vai trò."
      );
    }

    const nextRoles: RoleName[] = [
      ...(parsed.nextStaffRole ? [parsed.nextStaffRole] : []),
      ...(shouldHavePatient ? (["PATIENT"] as RoleName[]) : []),
    ];

    const check = validateRoleSet(nextRoles);
    if (!check.valid) {
      throw new DomainError("ROLE_CONFLICT", check.reason, 409);
    }

    if (hadDoctor && parsed.nextStaffRole !== "DOCTOR") {
      await tx.$queryRaw`SELECT user_id FROM "users" WHERE user_id = ${user.userId} FOR UPDATE`;
      const deps = await checkDoctorRoleDependencies(user.userId, tx);
      if (deps.hasBlockingDependencies) {
        throw new DomainError("DEPENDENCY_BLOCKED", deps.message, 409, {
          dependencies: deps,
        });
      }
    }

    if (!user.birthDate && birthDate) {
      await tx.user.update({ where: { userId: user.userId }, data: { birthDate } });
    }

    await tx.userRole.deleteMany({
      where: {
        userId: user.userId,
        role: { notIn: nextRoles },
      },
    });

    for (const r of nextRoles) {
      if (!currentRoles.includes(r)) {
        await tx.userRole.create({
          data: {
            userId: user.userId,
            role: r,
          },
        });
      }
    }

    if (user.account) {
      await tx.authSession.updateMany({
        where: { accountId: user.account.accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return {
      userId: user.userId,
      roles: nextRoles,
    };
  });
}

export async function getDoctorRoleDependencyMap(
  doctorIds: number[],
  client: DbTransactionClient = db,
): Promise<Map<number, DoctorRoleDependencySummary>> {
  if (!doctorIds.length) return new Map();
  const now = new Date();
  const doctorId = { in: doctorIds };
  const groups = await Promise.all([
    client.doctorService.groupBy({ by: ["doctorId"], where: { doctorId }, _count: { _all: true } }),
    client.doctorShift.groupBy({ by: ["doctorId"], where: { doctorId, endAt: { gt: now } }, _count: { _all: true } }),
    client.doctorUnavailability.groupBy({ by: ["doctorId"], where: { doctorId, endAt: { gt: now } }, _count: { _all: true } }),
    client.appointment.groupBy({ by: ["doctorId"], where: { doctorId, status: { in: ["PENDING", "CONFIRMED"] }, endAt: { gt: now } }, _count: { _all: true } }),
  ]);
  const counts = groups.map(rows => new Map(rows.map(row => [row.doctorId, row._count._all])));
  return new Map(doctorIds.map(doctorId => {
    const [serviceCount, futureShiftCount, futureUnavailabilityCount, activeAppointmentCount] = counts.map(count => count.get(doctorId) ?? 0);
    const hasBlockingDependencies = computeDoctorDependencyBlocked({ serviceCount, futureShiftCount, futureUnavailabilityCount, activeAppointmentCount });
    const parts: string[] = [];
    if (activeAppointmentCount > 0) {
      parts.push(`${activeAppointmentCount} lịch hẹn đang hoạt động`);
    }
    if (futureShiftCount > 0) {
      parts.push(`${futureShiftCount} ca làm việc sắp tới`);
    }
    if (futureUnavailabilityCount > 0) {
      parts.push(`${futureUnavailabilityCount} lịch bận sắp tới`);
    }
    if (serviceCount > 0) {
      parts.push(`${serviceCount} dịch vụ chuyên môn đang phụ trách`);
    }

    const message = hasBlockingDependencies
      ? `Chưa thể chuyển vai trò Bác sĩ vì nhân sự này vẫn đang gắn với ${parts.join(", ")}. Vui lòng phối hợp Quản lý phòng khám và Lễ tân điều chuyển các mục này trước.`
      : "Có thể chuyển đổi vai trò công việc.";

    return [doctorId, { doctorId, serviceCount, futureShiftCount, futureUnavailabilityCount, activeAppointmentCount, hasBlockingDependencies, message }];
  }));
}

export async function checkDoctorRoleDependencies(
  doctorId: number,
  tx?: DbTransactionClient,
): Promise<DoctorRoleDependencySummary> {
  return (await getDoctorRoleDependencyMap([doctorId], tx)).get(doctorId)!;
}
