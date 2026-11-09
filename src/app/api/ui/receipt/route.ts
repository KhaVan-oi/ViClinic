import { NextRequest } from "next/server";
import JsBarcode from "jsbarcode";
import { requireActiveContext } from "@/server/authorization";
import { db } from "@/server/db";
import { createPdf, pdfResponse } from "@/server/pdf";
import { DomainError, apiErrorResponse } from "@/lib/errors";
import { parsePositiveId } from "@/lib/pagination";
import { formatAppointmentStatusLabel } from "@/config/business";
import { exportTimeSuffix, formatDateOnlyDisplay, formatTimeRange } from "@/lib/dates";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveContext(["PATIENT", "RECEPTIONIST"]);
    const appointmentId = parsePositiveId(request.nextUrl.searchParams.get("id") ?? undefined);
    if (!appointmentId) throw new DomainError("VALIDATION_ERROR", "Mã lịch hẹn không hợp lệ.");
    const appointment = await db.appointment.findFirst({
      where: { appointmentId, ...(ctx.activeContext === "PATIENT" ? { patientId: ctx.userId } : {}) },
      include: { patient: true, doctor: true, service: true },
    });
    if (!appointment) throw new DomainError("NOT_FOUND", "Không tìm thấy lịch hẹn.", 404);
    const now = new Date();
    const code = `VC-${String(appointmentId).padStart(6, "0")}`;
    const { doc, table } = await createPdf("Phiếu hẹn khám", `${code} · ${appointment.service.name}`);
    table([{ content: "Thông tin người khám", colSpan: 2 }, { content: "Thông tin lịch hẹn", colSpan: 2 }], [
      ["Họ và tên", appointment.patient.fullName, "Tình trạng", formatAppointmentStatusLabel(appointment.status)],
      ["Ngày sinh", formatDateOnlyDisplay(appointment.patient.birthDate?.toISOString().slice(0, 10) ?? null), "Ngày, giờ khám", formatTimeRange(appointment.startAt, appointment.endAt)],
      ["Số điện thoại", appointment.patient.phone, "Thời lượng", `${Math.round((appointment.endAt.getTime() - appointment.startAt.getTime()) / 60000)} phút`],
      ["Dịch vụ", appointment.service.name, "Bác sĩ", appointment.doctor?.fullName ?? "Chưa phân công"],
    ]);
    const barcode = { encodings: [] as { data: string }[] };
    const encode = JsBarcode as unknown as (target: typeof barcode, text: string, options: { format: string; displayValue: boolean }) => void;
    encode(barcode, code, { format: "CODE128", displayValue: false });
    const data = barcode.encodings.map(item => item.data).join("");
    const barWidth = 52 / data.length;
    doc.setFillColor("#0b2545");
    for (let index = 0; index < data.length; index++) {
      if (data[index] === "1") doc.rect(143 + index * barWidth, 26, barWidth, 8, "F");
    }
    return pdfResponse(doc, `Phieu-hen-${code}-${exportTimeSuffix(now)}`, now);
  } catch (error) {
    return apiErrorResponse(error, "Không xuất được phiếu hẹn PDF.");
  }
}
