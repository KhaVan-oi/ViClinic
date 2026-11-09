import { addHours } from "date-fns";
import { isValidIsoDate, formatClinicIsoDate, formatDateOnlyUtc, getClinicDayEndExclusive, getClinicDayStart, formatTimeRange, formatTimestamp } from "@/lib/dates";
import "server-only";
import { cache } from "react";

import { type Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { requireActiveContext } from "@/server/authorization";
import { DomainError } from "@/lib/errors";

import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
  PaginationInput,
  parsePositiveId,
} from "@/lib/pagination";
import { AppointmentStatus } from "@/config/business";
import { getAllAffectedActiveAppointmentsMap } from "@/modules/scheduling/impact";
import {
  canPatientSelfCancel,
  isEarlyCompletion,
  isOverdueConfirmed,
  isOverduePending,
  AppointmentHistoryItemDto,
  DoctorAppointmentDto,
  DoctorAppointmentTab,
  PatientAppointmentDto,
  PatientAppointmentTab,
  ReceptionAppointmentDto,
  ReceptionQueueTab,
} from "@/modules/appointments/contracts";

const appointmentHistoryQuery = {
  include: {
    actor: { include: { roles: true } },
    oldDoctor: true,
    newDoctor: true,
    oldService: true,
    newService: true,
  },
  orderBy: [{ changedAt: "asc" }, { historyId: "asc" }],
} satisfies Prisma.AppointmentHistoryFindManyArgs;

const receptionCoordination = cache(async () => {
  const [affected, requests] = await Promise.all([
    getAllAffectedActiveAppointmentsMap(),
    db.notification.findMany({
      where: { content: { startsWith: "Yêu cầu điều phối:" }, appointment: { status: { in: ["PENDING","CONFIRMED"] }, endAt: { gt: new Date() } } },
      select: { appointmentId: true, createdAt: true, appointment: { select: { history: { orderBy: {changedAt:"desc"},take:1,select:{changedAt:true} } } } },
    }),
  ]);
  const result = new Map<number,{reasons:string[]}>(affected);
  for (const request of requests) if (request.createdAt > (request.appointment.history[0]?.changedAt ?? new Date(0)) && !result.has(request.appointmentId)) result.set(request.appointmentId,{reasons:["Phòng khám yêu cầu kiểm tra và sắp xếp lại lịch hẹn."]});
  return result;
});

const doctorAppointmentSelect = {
  appointmentId: true,
  serviceId: true,
  doctorId: true,
  startAt: true,
  endAt: true,
  status: true,
  patient: {
    select: {
      fullName: true,
      birthDate: true,
    },
  },
  service: {
    select: {
      name: true,
      durationMinutes: true,
    },
  },
  doctor: {
    select: {
      fullName: true,
    },
  },
} satisfies Prisma.AppointmentSelect;

function mapAppointmentHistoryRow(
  h: Prisma.AppointmentHistoryGetPayload<typeof appointmentHistoryQuery>,
  fallbackStartAt: Date,
  fallbackEndAt: Date,
  actorNameOverride?: string
): AppointmentHistoryItemDto {
  return {
    historyId: h.historyId,
    appointmentId: h.appointmentId,
    actorUserId: h.actorUserId,
    actorName: actorNameOverride ?? h.actor.fullName,
    actorRoles: h.actor.roles.map((r) => r.role),
    oldStatus: (h.oldStatus as AppointmentStatus | null) ?? null,
    newStatus: h.newStatus as AppointmentStatus,
    oldDoctorId: h.oldDoctorId,
    oldDoctorName: h.oldDoctor?.fullName ?? null,
    newDoctorId: h.newDoctorId,
    newDoctorName: h.newDoctor?.fullName ?? null,
    oldServiceName: h.oldService?.name ?? null,
    newServiceName: h.newService?.name ?? null,
    oldStartAtIso: h.oldStartAt ? h.oldStartAt.toISOString() : null,
    oldEndAtIso: h.oldEndAt ? h.oldEndAt.toISOString() : null,
    newStartAtIso: (h.newStartAt ?? fallbackStartAt).toISOString(),
    newEndAtIso: (h.newEndAt ?? fallbackEndAt).toISOString(),
    newSlotLabel: formatTimeRange(
      h.newStartAt ?? fallbackStartAt,
      h.newEndAt ?? fallbackEndAt
    ),
    oldSlotLabel:
      h.oldStartAt && h.oldEndAt
        ? formatTimeRange(h.oldStartAt, h.oldEndAt)
        : null,
    changedAtIso: h.changedAt.toISOString(),
    changedAtLabel: formatTimestamp(h.changedAt),
  };
}

type AppointmentSummaryRow = {
  appointmentId: number;
  serviceId: number;
  service: { name: string; durationMinutes: number; };
  doctorId: number | null;
  doctor: { fullName: string; } | null;
  startAt: Date;
  endAt: Date;
  status: string;
};

function appointmentSummary(row: AppointmentSummaryRow) {
  return {
    appointmentId: row.appointmentId,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    serviceDurationMinutes: (row.endAt.getTime() - row.startAt.getTime()) / 60000,
    doctorId: row.doctorId,
    doctorName: row.doctor?.fullName ?? null,
    startAtIso: row.startAt.toISOString(),
    endAtIso: row.endAt.toISOString(),
    slotLabel: formatTimeRange(row.startAt, row.endAt),
    status: row.status as AppointmentStatus,
  };
}

function patientAppointment(row: AppointmentSummaryRow, now: Date): PatientAppointmentDto {
  const cancelCheck = canPatientSelfCancel(row.status as AppointmentStatus, row.startAt, now);
  return {
    ...appointmentSummary(row),
    canSelfCancel: cancelCheck.allowed,
    cancelCutoffReason: cancelCheck.reason,
  };
}

type ReceptionRow = AppointmentSummaryRow & {
  patientId: number;
  patient: { fullName: string; phone: string; birthDate: Date | null };
};

function receptionAppointment(row: ReceptionRow, now: Date, affected?: { reasons: string[] }): ReceptionAppointmentDto {
  const status = row.status as AppointmentStatus;
  return {
    ...appointmentSummary(row),
    patientId: row.patientId,
    patientName: row.patient.fullName,
    patientPhone: row.patient.phone,
    patientBirthDate: row.patient.birthDate ? formatDateOnlyUtc(row.patient.birthDate) : null,
    isOverduePending: isOverduePending(status, row.startAt, now),
    isOverdueConfirmed: isOverdueConfirmed(status, row.endAt, now),
    isEarlyCompletion: isEarlyCompletion(row.startAt, now),
    needsCoordination: Boolean(affected),
    coordinationReasons: affected?.reasons ?? [],
  };
}

function doctorAppointment(row: Prisma.AppointmentGetPayload<{ select: typeof doctorAppointmentSelect }>, ctx: AuthenticatedContext, now: Date): DoctorAppointmentDto {
  return {
    ...appointmentSummary(row),
    patientName: row.patient.fullName,
    patientBirthDate: row.patient.birthDate ? formatDateOnlyUtc(row.patient.birthDate) : null,
    doctorId: row.doctorId ?? ctx.userId,
    doctorName: row.doctor?.fullName ?? ctx.fullName,
    isOverdueConfirmed: isOverdueConfirmed(row.status as AppointmentStatus, row.endAt, now),
    isEarlyCompletion: isEarlyCompletion(row.startAt, now),
  };
}

export function appointmentSearch(value?: string | null): Prisma.AppointmentWhereInput {
  const query = value?.trim().slice(0,120);
  if (!query) return {};
  const id = parsePositiveId(query.replace(/^VC[-\s]*/i, "").replace(/^0+(?=\d)/, ""));
  const phone = query.replace(/[\s.()-]/g, "").replace(/^\+84/, "0");
  return { OR: [...(id ? [{ appointmentId: id }] : []), { patient: { fullName: { contains: query, mode: "insensitive" } } }, { patient: { phone: { contains: phone } } }] };
}

export async function getPatientAppointments(
  pagination?: PaginationInput & { tab?: PatientAppointmentTab; query?: string; },
  explicitCtx?: AuthenticatedContext | null
): Promise<PaginatedResult<PatientAppointmentDto> & { upcomingCount: number; historyCount: number; }> {
  const ctx = await requireActiveContext(["PATIENT"], explicitCtx);
  const { page, pageSize, skip, take } = normalizePagination(pagination, 20, 100);
  const now = new Date();
  const tab: PatientAppointmentTab = pagination?.tab ?? "UPCOMING";

  const baseWhere = { patientId: ctx.userId, AND: [appointmentSearch(pagination?.query)] };
  const upcomingWhere = {
    ...baseWhere,
    status: { in: ["PENDING", "CONFIRMED"] },
    endAt: { gte: now },
  };
  const historyWhere = {
    ...baseWhere,
    OR: [
      { status: { in: ["COMPLETED", "CANCELLED"] } },
      { endAt: { lt: now } },
    ],
  };

  const selectedWhere =
    tab === "UPCOMING" ? upcomingWhere : tab === "HISTORY" ? historyWhere : baseWhere;

  const [rows, upcomingCount, historyCount] = await Promise.all([
    db.appointment.findMany({
      where: selectedWhere,
      include: {
        service: true,
        doctor: true,
      },
      orderBy:
        tab === "UPCOMING"
          ? [{ startAt: "asc" }, { appointmentId: "asc" }]
          : [{ startAt: "desc" }, { appointmentId: "desc" }],
      skip,
      take,
    }),
    db.appointment.count({ where: upcomingWhere }),
    db.appointment.count({ where: historyWhere }),
  ]);

  const items = rows.map(row => patientAppointment(row, now));

  const totalItems = tab === "UPCOMING" ? upcomingCount : tab === "HISTORY" ? historyCount : upcomingCount + historyCount;
  const paginated = buildPaginatedResult(items, totalItems, page, pageSize);
  return {
    ...paginated,
    upcomingCount,
    historyCount,
  };
}

export async function getPatientAppointmentById(
  appointmentId: number,
  explicitCtx?: AuthenticatedContext | null
): Promise<PatientAppointmentDto & { history: AppointmentHistoryItemDto[]; }> {
  const ctx = await requireActiveContext(["PATIENT"], explicitCtx);
  const now = new Date();

  const appt = await db.appointment.findUnique({
    where: { appointmentId },
    include: {
      service: true,
      doctor: true,
      history: appointmentHistoryQuery,
    },
  });

  if (!appt || appt.patientId !== ctx.userId) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy lịch hẹn.", 404);
  }

  return {
    ...patientAppointment(appt, now),
    history: appt.history.map((h) =>
      mapAppointmentHistoryRow(
        h,
        appt.startAt,
        appt.endAt,
        h.actorUserId === ctx.userId
          ? h.actor.fullName
          : "Bộ phận Điều phối Phòng khám"
      )
    ),
  };
}

function receptionQueueFilters(now: Date): Record<Exclude<ReceptionQueueTab, "NEEDS_COORDINATION">, Prisma.AppointmentWhereInput> {
  const today = formatClinicIsoDate(now);
  return {
    TODAY_SCHEDULE: { startAt: { gte: getClinicDayStart(today), lt: getClinicDayEndExclusive(today) } },
    CREATED_TODAY_PENDING: { status: "PENDING", history: { some: { oldStatus: null, changedAt: { gte: getClinicDayStart(today), lt: getClinicDayEndExclusive(today) } } } },
    PENDING_UNASSIGNED: { status: "PENDING", doctorId: null, startAt: { gt: now } },
    PENDING_ASSIGNED: { status: "PENDING", doctorId: { not: null }, startAt: { gt: now } },
    OVERDUE_PENDING: { status: "PENDING", startAt: { lte: now } },
    TODAY_CONFIRMED: { status: "CONFIRMED", startAt: { gte: getClinicDayStart(today), lt: getClinicDayEndExclusive(today) } },
    OVERDUE_CONFIRMED: { status: "CONFIRMED", endAt: { lt: now } },
    ALL: {},
  };
}

export async function getReceptionQueueCounts(
  explicitCtx?: AuthenticatedContext | null
): Promise<Record<ReceptionQueueTab, number>> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);
  const filters = receptionQueueFilters(new Date());
  const [counts, affectedMap] = await Promise.all([
    Promise.all(Object.entries(filters).map(async ([tab, where]) => [tab, await db.appointment.count({ where })])),
    receptionCoordination(),
  ]);
  return { ...Object.fromEntries(counts), NEEDS_COORDINATION: affectedMap.size } as Record<ReceptionQueueTab, number>;
}

export async function getReceptionAppointments(
  input?: {
    tab?: ReceptionQueueTab;
    status?: AppointmentStatus | "ALL";
    doctorId?: number | null;
    serviceId?: number | null;
    date?: string | null;
    period?: string;
    query?: string | null;
    page?: number;
    pageSize?: number;
  },
  explicitCtx?: AuthenticatedContext | null,
  maxPageSize = 100
): Promise<PaginatedResult<ReceptionAppointmentDto>> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);
  const { page, pageSize, skip, take } = normalizePagination(input, 20, maxPageSize);
  const now = new Date();
  const affectedMap = await receptionCoordination();
  const tab = input?.tab ?? "ALL";
  const andConditions: Prisma.AppointmentWhereInput[] = [
    tab === "NEEDS_COORDINATION"
      ? { appointmentId: { in: Array.from(affectedMap.keys()) } }
      : receptionQueueFilters(now)[tab],
  ];

  if (input?.status && input.status !== "ALL") {
    andConditions.push({ status: input.status });
  }
  if (input?.doctorId) {
    andConditions.push({ doctorId: input.doctorId });
  }
  if (input?.serviceId) {
    andConditions.push({ serviceId: input.serviceId });
  }
  if (input?.date && isValidIsoDate(input.date)) {
    andConditions.push({
      startAt: {
        gte: input.period === "afternoon" ? addHours(getClinicDayStart(input.date), 12) : getClinicDayStart(input.date),
        lt: input.period === "morning" ? addHours(getClinicDayStart(input.date), 12) : getClinicDayEndExclusive(input.date),
      },
    });
  }
  andConditions.push(appointmentSearch(input?.query));

  const where = { AND: andConditions };

  const orderBy =
    tab === "ALL"
      ? [{ startAt: "desc" as const }, { appointmentId: "desc" as const }]
      : [{ startAt: "asc" as const }, { appointmentId: "asc" as const }];

  const [rows, totalItems] = await Promise.all([
    db.appointment.findMany({
      where,
      include: {
        patient: true,
        service: true,
        doctor: true,
      },
      orderBy,
      skip,
      take,
    }),
    db.appointment.count({ where }),
  ]);

  const items = rows.map(row => receptionAppointment(row, now, affectedMap.get(row.appointmentId)));

  return buildPaginatedResult(items, totalItems, page, pageSize);
}

export async function getReceptionAppointmentById(
  appointmentId: number,
  explicitCtx?: AuthenticatedContext | null
): Promise<ReceptionAppointmentDto> {
  await requireActiveContext(["RECEPTIONIST"], explicitCtx);
  const now = new Date();

  const [appt, affectedMap] = await Promise.all([
    db.appointment.findUnique({
      where: { appointmentId },
      include: {
        patient: true,
        service: true,
        doctor: true,
        history: appointmentHistoryQuery,
      },
    }),
    receptionCoordination(),
  ]);

  if (!appt) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy lịch hẹn.", 404);
  }

  return {
    ...receptionAppointment(appt, now, affectedMap.get(appt.appointmentId)),
    history: appt.history.map((h) =>
      mapAppointmentHistoryRow(h, appt.startAt, appt.endAt)
    ),
  };
}

export async function getDoctorAppointments(
  input?: {
    tab?: DoctorAppointmentTab;
    status?: AppointmentStatus | "ALL";
    serviceId?: number | null;
    date?: string | null;
    query?: string | null;
    page?: number;
    pageSize?: number;
  },
  explicitCtx?: AuthenticatedContext | null,
  maxPageSize = 100
): Promise<PaginatedResult<DoctorAppointmentDto>> {
  const ctx = await requireActiveContext(["DOCTOR"], explicitCtx);
  const { page, pageSize, skip, take } = normalizePagination(input, 20, maxPageSize);
  const now = new Date();
  const todayIso = formatClinicIsoDate(now);
  const todayStart = getClinicDayStart(todayIso);
  const todayEnd = getClinicDayEndExclusive(todayIso);

  const tab = input?.tab ?? "TODAY";
  const tabFilters: Record<DoctorAppointmentTab, Prisma.AppointmentWhereInput> = {
    TODAY: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] }, startAt: { gte: todayStart, lt: todayEnd } },
    UPCOMING: { status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: now } },
    OVERDUE_CONFIRMED: { status: "CONFIRMED", endAt: { lt: now } },
    PENDING: { status: "PENDING" },
    HISTORY: { status: { in: ["COMPLETED", "CANCELLED"] } },
    COMPLETED: { status: "COMPLETED" },
    CANCELLED: { status: "CANCELLED" },
  };
  const andConditions: Prisma.AppointmentWhereInput[] = [{ doctorId: ctx.userId }];
  if (tabFilters[tab]) andConditions.push(tabFilters[tab]);

  if (input?.date && isValidIsoDate(input.date)) {
    andConditions.push({
      startAt: {
        gte: getClinicDayStart(input.date),
        lt: getClinicDayEndExclusive(input.date),
      },
    });
  }

  if (input?.status && input.status !== "ALL") andConditions.push({ status: input.status });
  if (input?.serviceId) andConditions.push({ serviceId: input.serviceId });
  andConditions.push(appointmentSearch(input?.query));
  const where = { AND: andConditions };
  const orderBy =
    tab === "COMPLETED" || tab === "CANCELLED" || tab === "HISTORY"
      ? [{ startAt: "desc" as const }, { appointmentId: "desc" as const }]
      : [{ startAt: "asc" as const }, { appointmentId: "asc" as const }];

  const [rows, totalItems] = await Promise.all([
    db.appointment.findMany({
      where,
      select: doctorAppointmentSelect,
      orderBy,
      skip,
      take,
    }),
    db.appointment.count({ where }),
  ]);

  const items = rows.map(row => doctorAppointment(row, ctx, now));

  return buildPaginatedResult(items, totalItems, page, pageSize);
}

export async function getDoctorAppointmentById(
  appointmentId: number,
  explicitCtx?: AuthenticatedContext | null
): Promise<DoctorAppointmentDto & { history: AppointmentHistoryItemDto[]; }> {
  const ctx = await requireActiveContext(["DOCTOR"], explicitCtx);
  const now = new Date();

  const appt = await db.appointment.findUnique({
    where: { appointmentId },
    select: { ...doctorAppointmentSelect, history: appointmentHistoryQuery },
  });

  if (!appt || appt.doctorId !== ctx.userId) {
    throw new DomainError(
      "FORBIDDEN",
      "Bạn chỉ được phép xem lịch hẹn được phân công trực tiếp cho mình.",
      403
    );
  }

  return {
    ...doctorAppointment(appt, ctx, now),
    history: appt.history.map((h) =>
      mapAppointmentHistoryRow(h, appt.startAt, appt.endAt)
    ),
  };
}
