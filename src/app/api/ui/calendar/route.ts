import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/errors";
import { getCalendarEventsForRole } from "@/modules/appointments/dashboards";
import { APPOINTMENT_STATUSES } from "@/config/business";
import { isValidIsoDate } from "@/lib/dates";

const optionalId = z.coerce.number().int().positive().max(2_147_483_647).optional();
const calendarInput = z.object({
  fromDate: z.string().refine(isValidIsoDate),
  toDate: z.string().refine(isValidIsoDate),
  doctorId: optionalId,
  serviceId: optionalId,
  query: z.string().max(120).optional(),
  status: z.enum([...APPOINTMENT_STATUSES, "ALL"]).optional(),
}).refine(value => value.fromDate <= value.toDate && Date.parse(value.toDate) - Date.parse(value.fromDate) <= 366 * 86_400_000);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = calendarInput.safeParse({
      fromDate: searchParams.get("fromDate"),
      toDate: searchParams.get("toDate") ?? searchParams.get("fromDate"),
      doctorId: searchParams.get("doctorId") || undefined,
      serviceId: searchParams.get("serviceId") || undefined,
      query: searchParams.get("query") || searchParams.get("patientPhone") || undefined,
      status: searchParams.get("status") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Khoảng ngày truy vấn lịch không hợp lệ." },
        { status: 400 }
      );
    }

    const events = await getCalendarEventsForRole(parsed.data);

    return NextResponse.json({ events });
  } catch (err) {
    return apiErrorResponse(err, "Không thể tải dữ liệu lịch.");
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  try {
    const parsed = calendarInput.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Bộ lọc lịch không hợp lệ." }, { status: 400 });
    const events = await getCalendarEventsForRole(parsed.data);
    return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return apiErrorResponse(err, "Không thể tải dữ liệu lịch.", 400);
  }
}
