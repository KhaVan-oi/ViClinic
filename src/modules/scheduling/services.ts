import "server-only";
import type { z } from "zod";
import { mapAffectedAppointment } from "@/modules/scheduling/impact";

import { DomainError, parseInput } from "@/lib/errors";
import { requireActiveContext } from "@/server/authorization";
import { db } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import {
  createServiceSchema,
  updateServiceSchema,
  ServiceDeactivationImpactDto,
  ServiceDto,
} from "@/modules/scheduling/contracts";

export async function listDoctorsDirectory(): Promise<
  Array<{ userId: number; doctorId: number; fullName: string; }>
> {
  const rows = await db.user.findMany({
    where: {
      roles: {
        some: { role: "DOCTOR" },
      },
    },
    select: {
      userId: true,
      fullName: true,
    },
    orderBy: { userId: "asc" },
  });
  return rows.map((r) => ({
    userId: r.userId,
    doctorId: r.userId,
    fullName: r.fullName,
  }));
}

export async function listPublicServiceCatalog() {
  return db.service.findMany({
    where: { isActive: true },
    select: { serviceId: true, name: true },
    orderBy: { serviceId: "asc" },
  });
}

export async function listPublicDoctorsShowcase() {
  const rows = await db.user.findMany({
    where: {
      roles: { some: { role: "DOCTOR" } },
      doctorServices: { some: { service: { isActive: true } } },
    },
    select: {
      userId: true,
      fullName: true,
      doctorServices: {
        where: { service: { isActive: true } },
        select: { service: { select: { serviceId: true, name: true } } },
        orderBy: { serviceId: "asc" },
      },
    },
    orderBy: { userId: "asc" },
  });
  return rows.map(user => ({
    doctorId: user.userId,
    fullName: user.fullName,
    services: user.doctorServices.map(({ service }) => service),
  }));
}

export async function listBookableServices(): Promise<ServiceDto[]> {
  const rows = await db.service.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { doctorServices: true },
      },
    },
    orderBy: { serviceId: "asc" },
  });

  return rows.map((r) => ({
    serviceId: r.serviceId,
    name: r.name,
    durationMinutes: r.durationMinutes,
    isActive: r.isActive,
    doctorCount: r._count.doctorServices,
  }));
}

export async function listAllServicesForManager(
  explicitCtx?: AuthenticatedContext | null
): Promise<ServiceDto[]> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const now = new Date();

  const [rows, activeCounts] = await Promise.all([
    db.service.findMany({
      include: {
        _count: {
          select: { doctorServices: true },
        },
      },
      orderBy: { serviceId: "asc" },
    }),
    db.appointment.groupBy({
      by: ["serviceId"],
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gt: now },
      },
      _count: { _all: true },
    }),
  ]);

  const countByService = new Map<number, number>(
    activeCounts.map((c) => [c.serviceId, c._count._all])
  );

  return rows.map((r) => ({
    serviceId: r.serviceId,
    name: r.name,
    durationMinutes: r.durationMinutes,
    isActive: r.isActive,
    doctorCount: r._count.doctorServices,
    activeAppointmentCount: countByService.get(r.serviceId) ?? 0,
  }));
}

export async function createService(
  input: z.input<typeof createServiceSchema>,
  explicitCtx?: AuthenticatedContext | null
): Promise<ServiceDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);

  const parsed = parseInput(createServiceSchema, input, "Dữ liệu dịch vụ không hợp lệ.");

  const created = await db.service.create({
    data: {
      name: parsed.name,
      durationMinutes: parsed.durationMinutes,
      isActive: true,
    },
  });

  return {
    serviceId: created.serviceId,
    name: created.name,
    durationMinutes: created.durationMinutes,
    isActive: created.isActive,
    doctorCount: 0,
    activeAppointmentCount: 0,
  };
}

export async function updateService(
  input: z.input<typeof updateServiceSchema>,
  explicitCtx?: AuthenticatedContext | null
): Promise<ServiceDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);

  const parsed = parseInput(updateServiceSchema, input, "Dữ liệu cập nhật dịch vụ không hợp lệ.");

  const existing = await db.service.findUnique({
    where: { serviceId: parsed.serviceId },
  });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy dịch vụ.", 404);
  }

  if (parsed.isActive === false && existing.isActive) {
    return deactivateService({ serviceId: existing.serviceId }, explicitCtx);
  }

  const updated = await db.service.update({
    where: { serviceId: existing.serviceId },
    data: {
      name: parsed.name,
      durationMinutes: parsed.durationMinutes,
      ...(parsed.isActive !== undefined
        ? { isActive: parsed.isActive }
        : {}),
    },
    include: {
      _count: { select: { doctorServices: true } },
    },
  });

  return {
    serviceId: updated.serviceId,
    name: updated.name,
    durationMinutes: updated.durationMinutes,
    isActive: updated.isActive,
    doctorCount: updated._count.doctorServices,
  };
}

export async function previewServiceDeactivationImpact(
  input: { serviceId: number; },
  explicitCtx?: AuthenticatedContext | null
): Promise<ServiceDeactivationImpactDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const now = new Date();

  const service = await db.service.findUnique({
    where: { serviceId: input.serviceId },
  });
  if (!service) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy dịch vụ.", 404);
  }

  const futureActive = await db.appointment.findMany({
    where: {
      serviceId: service.serviceId,
      startAt: { gt: now },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      doctor: true,
    },
    orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
  });

  const affectedAppointments = futureActive.map(appt => mapAffectedAppointment({ ...appt, service }, []));

  return {
    serviceId: service.serviceId,
    serviceName: service.name,
    canDeactivate: affectedAppointments.length === 0,
    futureActiveCount: affectedAppointments.length,
    affectedAppointments,
  };
}

export async function deactivateService(
  input: { serviceId: number; },
  explicitCtx?: AuthenticatedContext | null
): Promise<ServiceDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ service_id: number; }>>`
      SELECT service_id FROM "services" WHERE service_id = ${input.serviceId} FOR UPDATE
    `;
    if (locked.length === 0) {
      throw new DomainError("NOT_FOUND", "Không tìm thấy dịch vụ.", 404);
    }

    const service = await tx.service.findUniqueOrThrow({
      where: { serviceId: input.serviceId },
      include: { _count: { select: { doctorServices: true } } },
    });

    const futureActive = await tx.appointment.findMany({
      where: {
        serviceId: service.serviceId,
        startAt: { gt: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { doctor: true },
      orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
    });

    if (futureActive.length > 0) {
      const affectedAppointments = futureActive.map(appt => mapAffectedAppointment({ ...appt, service }, []));

      throw new DomainError(
        "DEPENDENCY_BLOCKED",
        `Không thể tạm ngưng dịch vụ "${service.name}" vì đang còn ${futureActive.length} lịch hẹn sắp tới. Lễ tân cần liên hệ điều chỉnh hoặc hủy các lịch hẹn này trước.`,
        409,
        {
          serviceId: service.serviceId,
          futureActiveCount: futureActive.length,
          affectedAppointments,
        }
      );
    }

    const updated = await tx.service.update({
      where: { serviceId: service.serviceId },
      data: { isActive: false },
    });

    return {
      serviceId: updated.serviceId,
      name: updated.name,
      durationMinutes: updated.durationMinutes,
      isActive: updated.isActive,
      doctorCount: service._count.doctorServices,
      activeAppointmentCount: 0,
    };
  });
}
