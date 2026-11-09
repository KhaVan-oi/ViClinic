import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/errors";
import { isValidIsoDate } from "@/lib/dates";
import { db } from "@/server/db";
import { requireActiveContext } from "@/server/authorization";
import { getAvailableSlots, listEligibleDoctors } from "@/modules/scheduling/availability";

const id = z.number().int().positive().max(2_147_483_647);
const availabilityInput = z.object({
  serviceId: id,
  date: z.string().trim().refine(isValidIsoDate),
  doctorId: id.nullish(),
  patientId: id.nullish(),
  excludeAppointmentId: id.nullish(),
  enforceHorizon: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) {
      return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
    }
    const parsed = availabilityInput.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dịch vụ hoặc ngày khám không hợp lệ." },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const { serviceId, date } = body;

    const ctx = await requireActiveContext(["PATIENT", "DOCTOR", "RECEPTIONIST", "CLINIC_MANAGER"]);
    let effectivePatientId: number | null = null;
    let verifiedExcludeAppointmentId: number | null = null;
    let enforceHorizon = true;

    if (ctx.activeContext === "RECEPTIONIST") {
      effectivePatientId = body.patientId ?? null;
      if (effectivePatientId && !await db.userRole.findUnique({ where: { userId_role: { userId: effectivePatientId, role: "PATIENT" } }, select: { userId: true } })) {
        return NextResponse.json({ error: "Không tìm thấy hồ sơ người khám bệnh." }, { status: 404 });
      }
      if (body.excludeAppointmentId) {
        const appointment = await db.appointment.findUnique({
          where: { appointmentId: body.excludeAppointmentId },
          select: { patientId: true, status: true },
        });
        if (!appointment || !["PENDING", "CONFIRMED"].includes(appointment.status) || (effectivePatientId && effectivePatientId !== appointment.patientId)) {
          return NextResponse.json({ error: "Lịch hẹn không thể đổi hoặc không thuộc người khám bệnh đã chọn." }, { status: 400 });
        }
        effectivePatientId = appointment.patientId;
        verifiedExcludeAppointmentId = body.excludeAppointmentId;
      }
      enforceHorizon = body.enforceHorizon ?? true;
    } else if (ctx.activeContext === "PATIENT") {
      effectivePatientId = ctx.userId;
      if (body.excludeAppointmentId) {
        const appointment = await db.appointment.findFirst({ where: { appointmentId: body.excludeAppointmentId, patientId: ctx.userId, status: "PENDING", startAt: { gt: new Date() } }, select: { appointmentId: true } });
        if (!appointment) return NextResponse.json({ error: "Lịch hẹn không thể tự thay đổi." }, { status: 409 });
        verifiedExcludeAppointmentId = appointment.appointmentId;
      }
    }

    const eligibleDoctors = await listEligibleDoctors({
      serviceId,
      excludePatientUserId: effectivePatientId,
    });
    const slots = await getAvailableSlots({
      serviceId,
      date,
      doctorId: body.doctorId ?? null,
      patientId: effectivePatientId,
      excludeAppointmentId: verifiedExcludeAppointmentId,
      enforceHorizon,
    }, eligibleDoctors);

    return NextResponse.json({
      eligibleDoctors,
      slots,
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
    }
    return apiErrorResponse(err, "Không thể tải danh sách khung giờ khám.");
  }
}
