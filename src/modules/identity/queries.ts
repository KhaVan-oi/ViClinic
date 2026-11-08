import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  AccountStatus,
  RoleName,
  STAFF_ROLES,
  StaffRoleName,
} from "@/config/business";
import { requireActiveContext } from "@/server/authorization";
import { db } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { formatDateOnlyUtc } from "@/lib/dates";
import { buildPaginatedResult, normalizePagination, PaginatedResult } from "@/lib/pagination";
import {
  DoctorRoleDependencySummary,
  AdminAccountDetailDto,
  AdminAccountListFilter,
  AdminAccountRowDto,
} from "@/modules/identity/contracts";
import { checkDoctorRoleDependencies, getDoctorRoleDependencyMap } from "@/modules/identity/staff";

export async function findUserWithAccountAndRolesByPhone(phone: string) {
  return db.user.findUnique({
    where: { phone },
    include: {
      account: true,
      roles: true,
    },
  });
}

export async function findAccountWithUserAndRolesById(accountId: number) {
  return db.account.findUnique({
    where: { accountId },
    include: {
      user: {
        include: {
          roles: true,
        },
      },

    },
  });
}

function mapAccountToAdminDto(
  row: {
    accountId: number;
    userId: number;
    status: string;
    passwordHash: string | null;
    user: {
      fullName: string;
      phone: string;
      email: string | null;
      birthDate: Date | null;
      roles: Array<{ role: string; }>;
    };

  }
): AdminAccountRowDto {
  const roles = row.user.roles.map((r) => r.role as RoleName);
  const staffRole =
    (roles.find((r) => (STAFF_ROLES as readonly string[]).includes(r)) as
      | StaffRoleName
      | undefined) ?? null;
  const hasPatientRole = roles.includes("PATIENT");
  const isReactivationPending = row.status === "PENDING_ACTIVATION" && row.passwordHash !== null;

  return {
    accountId: row.accountId,
    userId: row.userId,
    fullName: row.user.fullName,
    phone: row.user.phone,
    email: row.user.email,
    birthDate: row.user.birthDate ? formatDateOnlyUtc(row.user.birthDate) : null,
    status: row.status as AccountStatus,
    roles,
    staffRole,
    hasPatientRole,
    isReactivationPending,
  };
}

export async function listAccountsForAdmin(
  filter: AdminAccountListFilter,
  explicitCtx?: AuthenticatedContext | null
): Promise<PaginatedResult<AdminAccountRowDto>> {
  await requireActiveContext(["ADMIN"], explicitCtx);
  const { page, pageSize, skip, take } = normalizePagination(
    { page: filter.page, pageSize: filter.pageSize },
    20,
    100
  );

  const andConditions: Prisma.AccountWhereInput[] = [];

  if (filter.reactivationReview) {
    andConditions.push({ OR: [{ status: "DISABLED" }, { status: "PENDING_ACTIVATION", passwordHash: { not: null } }] });
  }
  if (filter.status && filter.status !== "ALL") {
    andConditions.push({ status: filter.status });
  }

  if (filter.role && filter.role !== "ALL") {
    andConditions.push({
      user: {
        roles: {
          some: { role: filter.role },
        },
      },
    });
  }

  const q = filter.searchQuery?.trim();
  if (q) {
    andConditions.push({
      user: {
        OR: [
          { phone: { contains: q } },
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
    });
  }

  const where: Prisma.AccountWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [rows, totalItems] = await Promise.all([
    db.account.findMany({
      where,
      include: {
        user: {
          include: {
            roles: true,
          },
        },

      },
      orderBy: [{ accountId: "asc" }],
      skip,
      take,
    }),
    db.account.count({ where }),
  ]);

  const items = rows.map((r) => mapAccountToAdminDto(r));
  return buildPaginatedResult(items, totalItems, page, pageSize);
}

export async function getAdminAccountDetailById(
  accountId: number,
  explicitCtx?: AuthenticatedContext | null
): Promise<AdminAccountDetailDto | null> {
  await requireActiveContext(["ADMIN"], explicitCtx);
  const row = await findAccountWithUserAndRolesById(accountId);
  if (!row) return null;

  const base = mapAccountToAdminDto(row);
  const doctorDependencies = base.roles.includes("DOCTOR")
    ? await checkDoctorRoleDependencies(base.userId)
    : null;

  return {
    ...base,
    doctorDependencies,
  };
}

export interface StaffRoleGovernanceItemDto {
  userId: number;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  accountId: number | null;
  accountStatus: AccountStatus | null;
  roles: RoleName[];
  staffRole: StaffRoleName;
  hasPatientRole: boolean;
  doctorDependencies: DoctorRoleDependencySummary | null;
}

export async function listStaffUsersForRoleGovernance(
  explicitCtx?: AuthenticatedContext | null
): Promise<StaffRoleGovernanceItemDto[]> {
  await requireActiveContext(["ADMIN"], explicitCtx);

  const staffUsers = await db.user.findMany({
    where: {
      roles: {
        some: {
          role: { in: ["RECEPTIONIST", "DOCTOR", "CLINIC_MANAGER", "ADMIN"] },
        },
      },
    },
    include: {
      roles: true,
      account: true,
    },
    orderBy: { userId: "asc" },
  });

  const dependencies = await getDoctorRoleDependencyMap(staffUsers.filter(user => user.roles.some(role => role.role === "DOCTOR")).map(user => user.userId));
  return staffUsers.map((u) => {
    const roles = u.roles.map((r) => r.role as RoleName);
    const staffRole =
      (roles.find((r) => r !== "PATIENT") as StaffRoleName | undefined) ?? "RECEPTIONIST";
    const hasPatientRole = roles.includes("PATIENT");
    const doctorDependencies =
      staffRole === "DOCTOR" ? dependencies.get(u.userId) ?? null : null;

    return {
      userId: u.userId,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      birthDate: u.birthDate ? formatDateOnlyUtc(u.birthDate) : null,
      accountId: u.account?.accountId ?? null,
      accountStatus: (u.account?.status as AccountStatus | undefined) ?? null,
      roles,
      staffRole,
      hasPatientRole,
      doctorDependencies,
    };
  });
}

export interface AdminDashboardSummaryDto {
  totalAccounts: number;
  activeAccounts: number;
  pendingActivationCount: number;
  disabledCount: number;
  staffCountByRole: Record<StaffRoleName, number>;
  pendingAccounts: AdminAccountRowDto[];
  disabledAccounts: AdminAccountRowDto[];
}

export async function getAdminDashboardSummary(
  explicitCtx?: AuthenticatedContext | null
): Promise<AdminDashboardSummaryDto> {
  await requireActiveContext(["ADMIN"], explicitCtx);

  const [accountCounts, pendingPage, disabledPage, staffCounts] = await Promise.all([
    db.account.groupBy({ by: ["status"], _count: { _all: true } }),
    listAccountsForAdmin({ status: "PENDING_ACTIVATION", page: 1, pageSize: 20 }, explicitCtx),
    listAccountsForAdmin({ status: "DISABLED", page: 1, pageSize: 20 }, explicitCtx),
    db.userRole.groupBy({
      by: ["role"],
      where: { role: { in: [...STAFF_ROLES] } },
      _count: { _all: true },
    }),
  ]);
  const countsByStatus = new Map(accountCounts.map(row => [row.status, row._count._all]));
  const countsByRole = new Map(staffCounts.map(row => [row.role, row._count._all]));
  const staffCountByRole = Object.fromEntries(
    STAFF_ROLES.map(role => [role, countsByRole.get(role) ?? 0]),
  ) as Record<StaffRoleName, number>;

  return {
    totalAccounts: accountCounts.reduce((total, row) => total + row._count._all, 0),
    activeAccounts: countsByStatus.get("ACTIVE") ?? 0,
    pendingActivationCount: pendingPage.totalItems,
    disabledCount: disabledPage.totalItems,
    staffCountByRole,
    pendingAccounts: pendingPage.items,
    disabledAccounts: disabledPage.items,
  };
}
