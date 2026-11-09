import "server-only";

import { formatTimestamp } from "@/lib/dates";
import { NotificationDraft, NotificationItemDto } from "@/modules/notifications/contracts";
import { db, DbTransactionClient } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { requireActiveContext } from "@/server/authorization";

import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
  PaginationInput,
} from "@/lib/pagination";

export { buildEnterConfirmedNotifications, buildRescheduleNotifications, buildCancelNotifications } from "./contracts";

export async function persistAppointmentNotifications(
  tx: DbTransactionClient,
  drafts: NotificationDraft[]
): Promise<void> {
  if (drafts.length === 0) return;
  await tx.notification.createMany({ data: drafts });
}

export function visibleNotifications(ctx: AuthenticatedContext) {
  return {
    recipientUserId: ctx.userId,
    ...(ctx.activeContext === "PATIENT" ? { NOT: { content: { startsWith: "Yêu cầu điều phối:" } } } : {}),
    appointment: ctx.activeContext === "PATIENT" ? { patientId: ctx.userId } : { patientId: { not: ctx.userId } },
  };
}

export async function getUnreadNotificationCount(explicitCtx?: AuthenticatedContext | null): Promise<number> {
  const ctx = await requireActiveContext(["PATIENT", "DOCTOR", "RECEPTIONIST", "CLINIC_MANAGER", "ADMIN"], explicitCtx);
  return db.notification.count({ where: { ...visibleNotifications(ctx), readAt: null } });
}

export async function getNotificationsForUser(
  pagination?: PaginationInput & { unreadOnly?: boolean },
  explicitCtx?: AuthenticatedContext | null
): Promise<PaginatedResult<NotificationItemDto>> {
  const ctx = await requireActiveContext(["PATIENT", "DOCTOR", "RECEPTIONIST", "CLINIC_MANAGER", "ADMIN"], explicitCtx);
  const { page, pageSize, skip, take } = normalizePagination(pagination, 25, 100);

  const whereClause = {
    ...visibleNotifications(ctx),
    ...(pagination?.unreadOnly ? { readAt: null } : {}),
  };

  const [rows, totalItems] = await Promise.all([
    db.notification.findMany({
      where: whereClause,
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { notificationId: "desc" }],
      skip,
      take,
    }),
    db.notification.count({ where: whereClause }),
  ]);

  const items: NotificationItemDto[] = rows.map((r) => ({
    notificationId: r.notificationId,
    appointmentId: r.appointmentId,
    content: r.content,
    createdAtIso: r.createdAt.toISOString(),
    readAtIso: r.readAt?.toISOString() ?? null,
    createdAtLabel: formatTimestamp(r.createdAt),
    appointmentStatus: r.appointment.status,
    serviceName: r.appointment.service.name,
  }));

  return buildPaginatedResult(items, totalItems, page, pageSize);
}
