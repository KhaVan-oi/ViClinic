import "server-only";
import type { z } from "zod";

import {
  formatClinicDate,
  formatClinicIsoDate,
  formatClinicTime,
  parseClinicDateTime,
} from "@/lib/dates";
import { DomainError, parseInput } from "@/lib/errors";
import { requireActiveContext } from "@/server/authorization";
import { db, mapDatabaseConstraintError, type DbTransactionClient } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import {
  shiftInputSchema,
  updateShiftInputSchema,
  ShiftDto,
  ScheduleImpactPreviewDto,
  unavailabilityInputSchema,
  UnavailabilityDto,
} from "@/modules/scheduling/contracts";
import { previewShiftChangeImpactInternal as previewShiftImpactInternal, previewUnavailabilityImpactInternal } from "@/modules/scheduling/impact";

async function lockDoctorServices(tx: DbTransactionClient, doctorId: number) {
  await tx.$queryRaw`
    SELECT s.service_id FROM services s JOIN doctor_services ds ON ds.service_id = s.service_id
    WHERE ds.doctor_id = ${doctorId} ORDER BY s.service_id FOR UPDATE OF s
  `;
}

function parseScheduleInterval(input: { date: string; startTime: string; endTime: string }, message: string) {
  const startAt = parseClinicDateTime(`${input.date} ${input.startTime}`);
  const endAt = parseClinicDateTime(`${input.date} ${input.endTime}`);
  if (endAt.getTime() <= startAt.getTime()) throw new DomainError("VALIDATION_ERROR", message);
  return { startAt, endAt };
}

async function requireDoctorRole(client: DbTransactionClient, doctorId: number, message: string) {
  const role = await client.userRole.findUnique({ where: { userId_role: { userId: doctorId, role: "DOCTOR" } } });
  if (!role) throw new DomainError("VALIDATION_ERROR", message);
}

function scheduleTimeFields(row: {
  doctorId: number;
  startAt: Date;
  endAt: Date;
  doctor: { fullName: string; };
}) {
  return {
    doctorId: row.doctorId,
    doctorName: row.doctor.fullName,
    dateIso: formatClinicIsoDate(row.startAt),
    dateLabel: formatClinicDate(row.startAt),
    startTimeLabel: formatClinicTime(row.startAt),
    endTimeLabel: formatClinicTime(row.endAt),
    startAtIso: row.startAt.toISOString(),
    endAtIso: row.endAt.toISOString(),
  };
}

function mapShiftToDto(row: Parameters<typeof scheduleTimeFields>[0] & { shiftId: number }): ShiftDto {
  return { shiftId: row.shiftId, ...scheduleTimeFields(row) };
}

export async function listShiftsForManager(
  filter?: {
    doctorId?: number | null;
    fromDate?: string;
    toDate?: string;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<ShiftDto[]> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const rows = await db.doctorShift.findMany({
    where: {
      ...(filter?.doctorId ? { doctorId: filter.doctorId } : {}),
      ...(filter?.fromDate
        ? { startAt: { gte: parseClinicDateTime(`${filter.fromDate} 00:00`) } }
        : {}),
      ...(filter?.toDate
        ? { endAt: { lte: parseClinicDateTime(`${filter.toDate} 23:59`) } }
        : {}),
    },
    include: {
      doctor: true,
    },
    orderBy: [{ startAt: "asc" }, { doctorId: "asc" }],
  });

  return rows.map(mapShiftToDto);
}

export async function previewShiftImpact(
  input: {
    shiftId?: number;
    doctorId: number;
    date: string;
    startTime: string;
    endTime: string;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<ScheduleImpactPreviewDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  if (input.shiftId) {
    const existing = await db.doctorShift.findUnique({
      where: { shiftId: input.shiftId },
    });
    if (!existing) {
      throw new DomainError("NOT_FOUND", "Không tìm thấy ca làm việc.", 404);
    }
    return previewShiftImpactInternal({
      shiftId: existing.shiftId,
      doctorId: existing.doctorId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    });
  }
  return previewShiftImpactInternal(input);
}

export async function createShift(
  input: z.input<typeof shiftInputSchema>,
  explicitCtx?: AuthenticatedContext | null
): Promise<ShiftDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);

  const parsed = parseInput(shiftInputSchema, input, "Dữ liệu ca làm việc không hợp lệ.");

  const { startAt, endAt } = parseScheduleInterval(parsed, "Giờ kết thúc ca làm việc phải lớn hơn giờ bắt đầu.");
  await requireDoctorRole(db, parsed.doctorId, "Người dùng được chọn không có vai trò Bác sĩ.");

  const overlapping = await db.doctorShift.findFirst({
    where: {
      doctorId: parsed.doctorId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { shiftId: true },
  });

  if (overlapping) {
    throw new DomainError(
      "SHIFT_OVERLAP_CONFLICT",
      "Ca làm việc mới bị chồng lấn với một ca làm việc đã tồn tại của bác sĩ này.",
      409
    );
  }

  try {
    const created = await db.doctorShift.create({
      data: {
        doctorId: parsed.doctorId,
        startAt,
        endAt,
      },
      include: { doctor: true },
    });

    return mapShiftToDto(created);
  } catch (err) {
    mapDatabaseConstraintError(err);
  }
}

export async function updateShift(
  input: z.input<typeof updateShiftInputSchema>,
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  shift: ShiftDto;
  impact: ScheduleImpactPreviewDto;
}> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);

  const parsed = parseInput(updateShiftInputSchema, input, "Dữ liệu cập nhật ca làm việc không hợp lệ.");

  return db.$transaction(async (tx) => {
    await lockDoctorServices(tx, parsed.doctorId);
    const existing = await tx.doctorShift.findUnique({
      where: { shiftId: parsed.shiftId },
    });
    if (!existing) {
      throw new DomainError("NOT_FOUND", "Không tìm thấy ca làm việc.", 404);
    }
  
    if (existing.doctorId !== parsed.doctorId) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Không thể chuyển ca làm việc sang bác sĩ khác khi chỉnh sửa ca. Vui lòng tạo ca mới cho bác sĩ tương ứng.",
        400
      );
    }
  
    await requireDoctorRole(tx, existing.doctorId, "Người dùng gắn với ca làm việc này hiện không còn vai trò Bác sĩ.");
    const { startAt, endAt } = parseScheduleInterval(parsed, "Giờ kết thúc ca làm việc phải lớn hơn giờ bắt đầu.");

    const overlapping = await tx.doctorShift.findFirst({
      where: {
        doctorId: existing.doctorId,
        shiftId: { not: existing.shiftId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { shiftId: true },
    });
  
    if (overlapping) {
      throw new DomainError(
        "SHIFT_OVERLAP_CONFLICT",
        "Khung giờ cập nhật bị chồng lấn với một ca làm việc khác của bác sĩ này.",
        409
      );
    }
  
    const impact = await previewShiftImpactInternal({
      shiftId: existing.shiftId,
      doctorId: existing.doctorId,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
    }, tx);
  
    if (impact.hasImpact && !parsed.acknowledgeImpact) {
      throw new DomainError(
        "CONFIRMATION_REQUIRED",
        `Thay đổi ca làm việc này ảnh hưởng đến ${impact.affectedCount} lịch hẹn đang hoạt động. Vui lòng xem danh sách lịch cần điều chỉnh và xác nhận trước khi lưu.`,
        409,
        { impact }
      );
    }
  
    try {
      const updated = await tx.doctorShift.update({
        where: { shiftId: existing.shiftId },
        data: {
          startAt,
          endAt,
        },
        include: { doctor: true },
      });
  
      return {
        shift: mapShiftToDto(updated),
        impact,
      };
    } catch (err) {
      mapDatabaseConstraintError(err);
    }
  });
}

function mapUnavailabilityToDto(row: Parameters<typeof scheduleTimeFields>[0] & { unavailabilityId: number }): UnavailabilityDto {
  return { unavailabilityId: row.unavailabilityId, ...scheduleTimeFields(row) };
}

export async function listOwnUnavailabilities(
  explicitCtx?: AuthenticatedContext | null
): Promise<UnavailabilityDto[]> {
  const ctx = await requireActiveContext(["DOCTOR"], explicitCtx);

  const rows = await db.doctorUnavailability.findMany({
    where: { doctorId: ctx.userId },
    include: { doctor: true },
    orderBy: [{ startAt: "desc" }, { unavailabilityId: "desc" }],
  });

  return rows.map(mapUnavailabilityToDto);
}

export async function previewUnavailabilityImpact(
  input: {
    date: string;
    startTime: string;
    endTime: string;
  },
  explicitCtx?: AuthenticatedContext | null
): Promise<ScheduleImpactPreviewDto> {
  const ctx = await requireActiveContext(["DOCTOR"], explicitCtx);
  return previewUnavailabilityImpactInternal({
    doctorId: ctx.userId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
  });
}

export async function createUnavailability(
  input: z.input<typeof unavailabilityInputSchema>,
  explicitCtx?: AuthenticatedContext | null
): Promise<{
  unavailability: UnavailabilityDto;
  impact: ScheduleImpactPreviewDto;
}> {
  const ctx = await requireActiveContext(["DOCTOR"], explicitCtx);

  const parsed = parseInput(unavailabilityInputSchema, input, "Dữ liệu khai báo lịch bận không hợp lệ.");

  const { startAt, endAt } = parseScheduleInterval(parsed, "Giờ kết thúc khoảng bận phải lớn hơn giờ bắt đầu.");

  return db.$transaction(async (tx) => {
    await lockDoctorServices(tx, ctx.userId);
    const impact = await previewUnavailabilityImpactInternal({
      doctorId: ctx.userId,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
    }, tx);
  
    if (impact.hasImpact && !parsed.acknowledgeImpact) {
      throw new DomainError(
        "CONFIRMATION_REQUIRED",
        `Khoảng thời gian báo bận này trùng với ${impact.affectedCount} lịch hẹn đang hoạt động được phân công cho bạn. Vui lòng xem xét danh sách lịch bị ảnh hưởng và xác nhận để Lễ tân điều phối.`,
        409,
        { impact }
      );
    }
  
    const created = await tx.doctorUnavailability.create({
      data: {
        doctorId: ctx.userId,
        startAt,
        endAt,
      },
      include: { doctor: true },
    });
  
    return {
      unavailability: mapUnavailabilityToDto(created),
      impact,
    };
  });
}
