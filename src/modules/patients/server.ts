import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { RoleName } from "@/config/business";
import { formatDateOnlyUtc, parseDateOnlyUtc, formatTimeRange } from "@/lib/dates";
import { DomainError, parseInput } from "@/lib/errors";

import { buildPaginatedResult, normalizePagination, PaginatedResult } from "@/lib/pagination";
import { normalizeVietnamPhone } from "@/lib/profile";
import { requireActiveContext } from "@/server/authorization";
import { db, mapDatabaseConstraintError } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import {
  patientContextInputSchema,
  updatePatientBasicProfileSchema,
  ReceptionPatientDetailDto,
  ReceptionPatientListFilter,
  ReceptionPatientLookupResult,
  ReceptionPatientSummaryDto,
} from "@/modules/patients/contracts";

function mapUserToPatientSummary(row: {
  userId: number;
  fullName: string;
  birthDate: Date | null;
  phone: string;
  email: string | null;
  roles: Array<{ role: string; }>;
  _count?: { patientAppointments: number; };
}): ReceptionPatientSummaryDto {
  const roles = row.roles.map((r) => r.role as RoleName);
  return {
    userId: row.userId,
    fullName: row.fullName,
    birthDate: row.birthDate ? formatDateOnlyUtc(row.birthDate) : null,
    phone: row.phone,
    email: row.email,
    hasPatientRole: roles.includes("PATIENT"),
    roles,
    appointmentCount: row._count?.patientAppointments ?? 0,
  };
}

export async function findPatientByPhone(
  input: { phone: string; },
  explicitCtx?: AuthenticatedContext | null
): Promise<ReceptionPatientLookupResult> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);
  const normalizedPhone = normalizeVietnamPhone(input.phone);

  const row = await db.user.findUnique({
    where: { phone: normalizedPhone },
    include: {
      roles: true,
      _count: {
        select: { patientAppointments: true },
      },
    },
  });

  if (!row) {
    return {
      found: false,
      normalizedPhone,
      patient: null,
    };
  }

  return {
    found: true,
    normalizedPhone,
    patient: mapUserToPatientSummary(row),
  };
}

export async function createPatientContext(
  input: {
    phone: string;
    fullName: string;
    birthDate: string;
    email?: string | null;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<ReceptionPatientSummaryDto> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);

  const parsed = parseInput(patientContextInputSchema, {
    ...input,
    email: input.email ?? "",
  }, "Thông tin người khám bệnh không hợp lệ.");

  const normalizedPhone = normalizeVietnamPhone(parsed.phone);
  const existing = await db.user.findUnique({
    where: { phone: normalizedPhone },
  });

  if (existing) {
    throw new DomainError(
      "IDENTITY_CONFLICT",
      "Số điện thoại này đã tồn tại trong hệ thống. Vui lòng sử dụng hồ sơ hiện có thay vì tạo mới.",
      409,
      { existingUserId: existing.userId }
    );
  }

  try {
    const created = await db.user.create({
      data: {
        fullName: parsed.fullName.trim(),
        birthDate: parseDateOnlyUtc(parsed.birthDate),
        phone: normalizedPhone,
        email: parsed.email?.trim() ? parsed.email.trim() : null,
        roles: {
          create: {
            role: "PATIENT",
          },
        },
      },
      include: {
        roles: true,
        _count: { select: { patientAppointments: true } },
      },
    });

    return mapUserToPatientSummary(created);
  } catch (err) {
    mapDatabaseConstraintError(err);
  }
}

export async function completePatientContext(
  input: {
    userId: number;
    fullName?: string;
    birthDate?: string;
    email?: string | null;
    allowOverwriteBirthDate?: boolean;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<ReceptionPatientSummaryDto> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);

  const existing = await db.user.findUnique({
    where: { userId: input.userId },
    include: { roles: true },
  });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy hồ sơ người dùng.", 404);
  }

  const parsedInputBirthDate = input.birthDate?.trim()
    ? parseDateOnlyUtc(input.birthDate.trim())
    : null;

  const nextBirthDate = input.allowOverwriteBirthDate
    ? (parsedInputBirthDate ?? existing.birthDate)
    : (existing.birthDate ?? parsedInputBirthDate);

  if (!nextBirthDate) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Thông tin người khám bệnh bắt buộc phải có ngày sinh."
    );
  }

  const profile = parseInput(updatePatientBasicProfileSchema, {
    userId: existing.userId,
    fullName: input.fullName ?? existing.fullName,
    birthDate: formatDateOnlyUtc(nextBirthDate),
    email: input.email === undefined ? existing.email ?? "" : input.email ?? "",
  }, "Thông tin người khám bệnh không hợp lệ.");
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { userId: existing.userId },
      data: {
        fullName: profile.fullName,
        birthDate: nextBirthDate,
        email: profile.email?.toLowerCase() || null,
      },
    });

    const hasPatient = existing.roles.some((r) => r.role === "PATIENT");
    if (!hasPatient) {
      await tx.userRole.create({
        data: {
          userId: existing.userId,
          role: "PATIENT",
        },
      });
    }
  }).catch(mapDatabaseConstraintError);

  const updated = await db.user.findUniqueOrThrow({
    where: { userId: existing.userId },
    include: {
      roles: true,
      _count: { select: { patientAppointments: true } },
    },
  });

  return mapUserToPatientSummary(updated);
}

export async function updatePatientBasicProfile(
  input: {
    userId: number;
    fullName: string;
    birthDate: string;
    email?: string | null;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<ReceptionPatientSummaryDto> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);

  const parsed = parseInput(updatePatientBasicProfileSchema, {
    ...input,
    email: input.email ?? "",
  }, "Thông tin cập nhật hồ sơ không hợp lệ.");

  return completePatientContext(
    {
      userId: parsed.userId,
      fullName: parsed.fullName,
      birthDate: parsed.birthDate,
      email: parsed.email ?? null,
      allowOverwriteBirthDate: true,
    },
    explicitCtx
  );
}

export async function getReceptionPatientDetail(
  userId: number,
  explicitCtx?: AuthenticatedContext | null
): Promise<ReceptionPatientDetailDto | null> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);

  const row = await db.user.findUnique({
    where: { userId },
    include: {
      roles: true,
      _count: { select: { patientAppointments: true } },
      patientAppointments: {
        include: {
          service: true,
          doctor: true,
        },
        orderBy: [{ startAt: "desc" }, { appointmentId: "desc" }],
      },
    },
  });

  if (!row) return null;

  const base = mapUserToPatientSummary(row);
  return {
    ...base,
    appointments: row.patientAppointments.map((a) => ({
      appointmentId: a.appointmentId,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      doctorId: a.doctorId,
      doctorName: a.doctor?.fullName ?? null,
      startAtIso: a.startAt.toISOString(),
      endAtIso: a.endAt.toISOString(),
      startAtLabel: formatTimeRange(a.startAt, a.endAt),
      status: a.status,
    })),
  };
}

export async function listPatientsForReception(
  filter: ReceptionPatientListFilter,
  explicitCtx?: AuthenticatedContext | null,
  maxPageSize = 100
): Promise<PaginatedResult<ReceptionPatientSummaryDto>> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);

  const { page, pageSize, skip, take } = normalizePagination(
    { page: filter.page, pageSize: filter.pageSize },
    20,
    maxPageSize
  );

  const andConditions: Prisma.UserWhereInput[] = [
    {
      roles: {
        some: { role: "PATIENT" },
      },
    },
  ];

  const q = filter.searchQuery?.trim();
  if (q) {
    andConditions.push({
      OR: [
        { phone: { contains: q } },
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (filter.appointments === "upcoming") andConditions.push({ patientAppointments: { some: { startAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } } } });
  if (filter.appointments === "none") andConditions.push({ patientAppointments: { none: {} } });
  const where: Prisma.UserWhereInput = { AND: andConditions };

  const [rows, totalItems] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        roles: true,
        _count: { select: { patientAppointments: true } },
      },
      orderBy: [{ userId: "asc" }],
      skip,
      take,
    }),
    db.user.count({ where }),
  ]);

  const items = rows.map(mapUserToPatientSummary);
  return buildPaginatedResult(items, totalItems, page, pageSize);
}
