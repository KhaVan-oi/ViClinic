import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { normalizePagination } from "@/lib/pagination";
import { getClinicDayEndExclusive, getClinicDayStart, formatClinicIsoDate } from "@/lib/dates";
import { db } from "@/server/db";
import { AuthenticatedContext } from "@/server/session";
import { requireActiveContext } from "@/server/authorization";
import { DomainError, parseInput } from "@/lib/errors";
import { formatTimeRange } from "@/lib/dates";
import { formatAppointmentStatusLabel } from "@/config/business";

import { reportFilterSchema, type ReportFilterInput, type AppointmentReportDto } from "./contracts";

export async function getAppointmentReport(
  input: ReportFilterInput,
  explicitCtx?: AuthenticatedContext | null
): Promise<AppointmentReportDto> {
  await requireActiveContext(["CLINIC_MANAGER"], explicitCtx);

  const parsed = parseInput(reportFilterSchema, input, "Bộ lọc báo cáo không hợp lệ.");

  const { fromDate, toDate, doctorId } = parsed;
  const fromStart = getClinicDayStart(fromDate);
  const toExclusive = getClinicDayEndExclusive(toDate);

  const baseWhere = {
    startAt: {
      gte: fromStart,
      lt: toExclusive,
    },
    ...(doctorId ? { doctorId } : {}),
  };

  const { page: detailPage } = normalizePagination({ page: input.page }, 50, 50);
  const detailPageSize = input.exportDetails ? 5000 : 50;
  const [doctorRows, details, aggregates] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [{ roles: { some: { role: "DOCTOR" } } }, { doctorAppointments: { some: baseWhere } }],
      },
      select: {
        userId: true,
        fullName: true,
      },
      orderBy: { userId: "asc" },
    }),
    db.appointment.findMany({where:baseWhere,select:{appointmentId:true,serviceId:true,doctorId:true,startAt:true,endAt:true,status:true,doctor:{select:{fullName:true}},service:{select:{name:true}}},orderBy:[{startAt:"asc"},{appointmentId:"asc"}],skip: input.exportDetails ? 0 : (detailPage - 1) * detailPageSize, take: detailPageSize + (input.exportDetails ? 1 : 0)}),
    db.$queryRaw<{serviceId:number;doctorId:number|null;serviceName:string;doctorName:string|null;day:string;status:string;count:number}[]>(Prisma.sql`
      SELECT a.service_id AS "serviceId", a.doctor_id AS "doctorId", s.name AS "serviceName", u.full_name AS "doctorName",
        to_char(a.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day, a.status, count(*)::int AS count
      FROM appointments a JOIN services s ON s.service_id=a.service_id LEFT JOIN users u ON u.user_id=a.doctor_id
      WHERE a.start_at >= ${fromStart} AND a.start_at < ${toExclusive}
        ${doctorId ? Prisma.sql`AND a.doctor_id = ${doctorId}` : Prisma.empty}
      GROUP BY a.service_id, a.doctor_id, s.name, u.full_name, day, a.status
    `),
  ]);
  if (input.exportDetails && details.length>5000) throw new DomainError("VALIDATION_ERROR","Có hơn 5.000 lịch hẹn. Thu hẹp khoảng ngày hoặc chọn bác sĩ trước khi xuất báo cáo.",400);

  const selectedDoctor = doctorId
    ? doctorRows.find((d) => d.userId === doctorId) ?? null
    : null;
  if (doctorId && !selectedDoctor) {
    throw new DomainError("NOT_FOUND", "Không tìm thấy bác sĩ trong báo cáo đã chọn.", 404);
  }
  const services = new Map<number,{label:string;count:number;cancelled:number}>();
  const doctors = new Map<number | null,{label:string;count:number;cancelled:number}>();
  const dates = new Map<string,{count:number;cancelled:number}>();
  const metrics = {total:0,completed:0,cancelled:0,pending:0,confirmed:0};
  for (const row of aggregates) {
    const service = services.get(row.serviceId) ?? {label:row.serviceName,count:0,cancelled:0};
    const doctor = doctors.get(row.doctorId) ?? {label:row.doctorName ?? "Chưa phân công",count:0,cancelled:0};
    const day = row.day;
    const date = dates.get(day) ?? {count:0,cancelled:0};
    service.count += row.count; doctor.count += row.count; date.count += row.count; metrics.total += row.count;
    if (row.status === "COMPLETED") metrics.completed += row.count;
    if (row.status === "CANCELLED") {metrics.cancelled += row.count;date.cancelled += row.count;service.cancelled += row.count;doctor.cancelled += row.count;}
    if (row.status === "PENDING") metrics.pending += row.count;
    if (row.status === "CONFIRMED") metrics.confirmed += row.count;
    services.set(row.serviceId,service);doctors.set(row.doctorId,doctor);dates.set(day,date);
  }
  const days = Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86400000) + 1;
  const byDate = days > 366 ? [...dates].map(([label, value]) => ({ label, ...value })).sort((a,b) => a.label.localeCompare(b.label)) : Array.from({ length: days }, (_,index) => { const label = new Date(Date.parse(fromDate) + index * 86400000).toISOString().slice(0,10); return { label, ...(dates.get(label) ?? {count:0,cancelled:0}) }; });
  if (days > 366) {
    for (let index = byDate.length - 1; index > 0; index--) {
      const previous = Date.parse(byDate[index - 1].label);
      const next = Date.parse(byDate[index].label);
      if (next - previous <= 86400000) continue;
      const gapDays = [...new Set([previous + 86400000, next - 86400000])];
      byDate.splice(index, 0, ...gapDays.map(day => ({ label: new Date(day).toISOString().slice(0,10), count: 0, cancelled: 0 })));
    }
  }
  const periods = new Map<string,{label:string;count:number;cancelled:number}>();
  for (const row of byDate) {
    let label = row.label;
    if (parsed.period === "MONTH") label = label.slice(0,7)+"-01";
    if (parsed.period === "QUARTER") label = `${label.slice(0,4)}-${String(Math.floor((Number(label.slice(5,7))-1)/3)*3+1).padStart(2,"0")}-01`;
    if (parsed.period === "WEEK") { const date = new Date(label+"T00:00:00Z");date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);label=date.toISOString().slice(0,10); }
    const group = periods.get(label) ?? {label,count:0,cancelled:0};group.count+=row.count;group.cancelled+=row.cancelled;periods.set(label,group);
  }

  return {
    fromDate,
    toDate,
    doctorId: doctorId ?? null,
    doctorName: selectedDoctor?.fullName ?? null,
    metrics,
    doctors: doctorRows,
    byService: [...services.values()].sort((a,b) => b.count-a.count || a.label.localeCompare(b.label,"vi")),
    byDoctor: [...doctors.values()].sort((a,b) => b.count-a.count || a.label.localeCompare(b.label,"vi")),
    byDate,
    period: parsed.period,
    byPeriod: [...periods.values()],
    detailTotal: metrics.total, detailPage, detailPageSize,
    details: details.map(row=>({code:`VC-${String(row.appointmentId).padStart(6,"0")}`,service:row.service.name,doctor:row.doctor?.fullName ?? "Cần phân công",slot:formatTimeRange(row.startAt,row.endAt),date:formatClinicIsoDate(row.startAt),time:formatTimeRange(row.startAt,row.endAt).split(" · ").slice(1).join(" · "),duration:Math.round((row.endAt.getTime()-row.startAt.getTime())/60000),status:formatAppointmentStatusLabel(row.status)})),
  };
}
