import { NextRequest } from "next/server";
import { z } from "zod";
import { requireActiveContext } from "@/server/authorization";
import { db } from "@/server/db";
import { getNotificationsForUser, getUnreadNotificationCount, visibleNotifications } from "@/modules/notifications/server";
import { apiErrorResponse } from "@/lib/errors";

const roles = ["PATIENT", "DOCTOR", "RECEPTIONIST", "CLINIC_MANAGER", "ADMIN"] as const;
const inputSchema = z.union([
  z.object({ id: z.number().int().positive() }).strict(),
  z.object({ until: z.string().datetime() }).strict(),
]);

function failure(error: unknown) {
  if (error instanceof SyntaxError) return Response.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  return apiErrorResponse(error, "Không thể xử lý thông báo. Vui lòng thử lại.");
}

export async function GET() {
  try {
    const ctx = await requireActiveContext(roles);
    const [preview, unread] = await Promise.all([
      getNotificationsForUser({ page: 1, pageSize: 5 }, ctx),
      getUnreadNotificationCount(ctx),
    ]);
    return Response.json({ items: preview.items, unread, now: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
    const ctx = await requireActiveContext(roles);
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
    const now = new Date();
    await db.notification.updateMany({
      where: {
        ...visibleNotifications(ctx), readAt: null,
        ...("id" in input.data ? { notificationId: input.data.id } : { createdAt: { lte: new Date(Math.min(Date.parse(input.data.until), now.getTime())) } }),
      },
      data: { readAt: now },
    });
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
