import "server-only";
import { mapAffectedAppointment } from "@/modules/scheduling/impact";

import { DomainError } from "@/lib/errors";
import { requireActiveContext } from "@/server/authorization";
import { db } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { doctorServicePairSchema, DoctorServiceRemovalImpactDto } from "@/modules/scheduling/contracts";

export interface DoctorCapabilityMatrixDto {
  doctors: Array<{
    doctorId: number;
    fullName: string;
    accountStatus: string | null;
    serviceIds: number[];
  }>;
  services: Array<{
    serviceId: number;
    name: string;
    durationMinutes: number;
    isActive: boolean;
  }>;
  activeAppointmentCountsByPair: Record<string, number>;
}

export async function getDoctorCapabilityMatrixForManager(
  explicitCtx?: AuthenticatedContext | null
): Promise<DoctorCapabilityMatrixDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const now = new Date();

  const [doctorUsers, services, mappings, activeCounts] = await Promise.all([
    db.user.findMany({
      where: {
        roles: { some: { role: "DOCTOR" } },
      },
      include: {
        account: true,
      },
      orderBy: { userId: "asc" },
    }),
    db.service.findMany({
      orderBy: { serviceId: "asc" },
    }),
    db.doctorService.findMany(),
    db.appointment.groupBy({
      by: ["doctorId", "serviceId"],
      where: {
        doctorId: { not: null },
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gt: now },
      },
      _count: { _all: true },
    }),
  ]);

  const servicesByDoc = new Map<number, number[]>();
  for (const m of mappings) {
    const arr = servicesByDoc.get(m.doctorId) ?? [];
    arr.push(m.serviceId);
    servicesByDoc.set(m.doctorId, arr);
  }

  const activeAppointmentCountsByPair: Record<string, number> = {};
  for (const c of activeCounts) {
    if (c.doctorId !== null) {
      activeAppointmentCountsByPair[`${c.doctorId}:${c.serviceId}`] = c._count._all;
    }
  }

  return {
    doctors: doctorUsers.map((u) => ({
      doctorId: u.userId,
      fullName: u.fullName,
      accountStatus: u.account?.status ?? null,
      serviceIds: (servicesByDoc.get(u.userId) ?? []).sort((a, b) => a - b),
    })),
    services: services.map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      isActive: s.isActive,
    })),
    activeAppointmentCountsByPair,
  };
}

export async function assignDoctorService(
  input: { doctorId: number; serviceId: number; },
  explicitCtx?: AuthenticatedContext | null
): Promise<{ doctorId: number; serviceId: number; }> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);

  const parsed = doctorServicePairSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("VALIDATION_ERROR", "Cặp Bác sĩ - Dịch vụ không hợp lệ.");
  }

  const [doctorRole, service] = await Promise.all([
    db.userRole.findUnique({
      where: {
        userId_role: {
          userId: parsed.data.doctorId,
          role: "DOCTOR",
        },
      },
    }),
    db.service.findUnique({
      where: { serviceId: parsed.data.serviceId },
    }),
  ]);

  if (!doctorRole) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Người dùng được chọn không có vai trò Bác sĩ."
    );
  }
  if (!service) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy dịch vụ.", 404);
  }

  await db.doctorService.upsert({
    where: {
      doctorId_serviceId: {
        doctorId: parsed.data.doctorId,
        serviceId: parsed.data.serviceId,
      },
    },
    update: {},
    create: {
      doctorId: parsed.data.doctorId,
      serviceId: parsed.data.serviceId,
    },
  });

  return {
    doctorId: parsed.data.doctorId,
    serviceId: parsed.data.serviceId,
  };
}

export async function previewDoctorServiceRemovalImpact(
  input: { doctorId: number; serviceId: number; },
  explicitCtx?: AuthenticatedContext | null
): Promise<DoctorServiceRemovalImpactDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const now = new Date();

  const [doctor, service, futureActive] = await Promise.all([
    db.user.findUnique({ where: { userId: input.doctorId } }),
    db.service.findUnique({ where: { serviceId: input.serviceId } }),
    db.appointment.findMany({
      where: {
        doctorId: input.doctorId,
        serviceId: input.serviceId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gt: now },
      },
      orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
    }),
  ]);

  if (!doctor || !service) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy bác sĩ hoặc dịch vụ.", 404);
  }

  const affectedAppointments = futureActive.map(appt => mapAffectedAppointment({ ...appt, service, doctor }, []));

  return {
    doctorId: doctor.userId,
    doctorName: doctor.fullName,
    serviceId: service.serviceId,
    serviceName: service.name,
    canRemove: affectedAppointments.length === 0,
    futureActiveCount: affectedAppointments.length,
    affectedAppointments,
  };
}

export async function removeDoctorService(
  input: { doctorId: number; serviceId: number; },
  explicitCtx?: AuthenticatedContext | null
): Promise<{ doctorId: number; serviceId: number; removed: true; }> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);
  const now = new Date();

  const parsed = doctorServicePairSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("VALIDATION_ERROR", "Cặp Bác sĩ - Dịch vụ không hợp lệ.");
  }

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT service_id FROM services WHERE service_id = ${parsed.data.serviceId} FOR UPDATE`;
    const [doctor, service, futureActive] = await Promise.all([
      tx.user.findUnique({ where: { userId: parsed.data.doctorId } }),
      tx.service.findUnique({ where: { serviceId: parsed.data.serviceId } }),
      tx.appointment.findMany({
        where: {
          doctorId: parsed.data.doctorId,
          serviceId: parsed.data.serviceId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { gt: now },
        },
        orderBy: [{ startAt: "asc" }, { appointmentId: "asc" }],
      }),
    ]);

    if (!doctor || !service) {
      throw new DomainError("NOT_FOUND", "Không tìm thấy bác sĩ hoặc dịch vụ.", 404);
    }

    if (futureActive.length > 0) {
      const affectedAppointments = futureActive.map(appt => mapAffectedAppointment({ ...appt, service, doctor }, []));

      throw new DomainError(
        "DEPENDENCY_BLOCKED",
        `Không thể gỡ dịch vụ "${service.name}" khỏi Bác sĩ ${doctor.fullName} vì đang còn ${futureActive.length} lịch hẹn tương lai đang hoạt động.`,
        409,
        {
          doctorId: doctor.userId,
          serviceId: service.serviceId,
          futureActiveCount: futureActive.length,
          affectedAppointments,
        }
      );
    }

    await tx.doctorService.deleteMany({
      where: {
        doctorId: parsed.data.doctorId,
        serviceId: parsed.data.serviceId,
      },
    });

    return {
      doctorId: parsed.data.doctorId,
      serviceId: parsed.data.serviceId,
      removed: true,
    };
  });
}
