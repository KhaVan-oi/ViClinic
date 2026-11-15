import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import { requireActiveContext } from "@/server/authorization";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { formatClinicDateTime, getClinicDayEndExclusive, getClinicDayStart, isValidIsoDate } from "@/lib/dates";
import { singleSearchParams, normalizePagination } from "@/lib/pagination";
import { formatAppointmentStatusLabel } from "@/config/business";
import { PaginationBar } from "@/components/pagination";

export const dynamic = "force-dynamic";

export default async function ReceptionHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireActiveContext(["RECEPTIONIST"]);
  const params = singleSearchParams(await searchParams);
  const actor = await readPrivateSearch("/reception/history");
  const { page, pageSize, skip, take } = normalizePagination({ page: Number(params.page) || 1, pageSize: 25 }, 25, 25);
  const from = params.from && isValidIsoDate(params.from) ? params.from : "";
  const to = params.to && isValidIsoDate(params.to) ? params.to : "";
  const types = { ALL: "Tất cả thao tác", CREATED: "Tạo lịch hẹn", STATUS: "Chuyển trạng thái", TIME: "Đổi thời gian", DOCTOR: "Đổi bác sĩ", SERVICE: "Đổi dịch vụ" };
  const type = Object.hasOwn(types, params.type ?? "") ? params.type as keyof typeof types : "ALL";
  const fields = db.appointmentHistory.fields;
  const where: Prisma.AppointmentHistoryWhereInput = {
    ...(type === "SERVICE" ? {oldServiceId:{not:null},newServiceId:{not:null},NOT:{oldServiceId:{equals:fields.newServiceId}}} : {}),
    ...(from || to ? { changedAt: { ...(from ? { gte: getClinicDayStart(from) } : {}), ...(to ? { lt: getClinicDayEndExclusive(to) } : {}) } } : {}),
    ...(actor ? { actor: { fullName: { contains: actor.slice(0, 120), mode: "insensitive" } } } : {}),
    ...(type === "CREATED" ? { oldStatus: null } : type === "STATUS" ? { oldStatus: { not: null }, NOT: { oldStatus: { equals: fields.newStatus } } } : type === "TIME" ? { oldStartAt: { not: null }, NOT: { oldStartAt: { equals: fields.newStartAt } } } : type === "DOCTOR" ? { oldStatus: { not: null }, OR: [{ oldDoctorId: null, newDoctorId: { not: null } }, { oldDoctorId: { not: null }, newDoctorId: null }, { oldDoctorId: { not: null }, newDoctorId: { not: null }, NOT: { oldDoctorId: { equals: fields.newDoctorId } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.appointmentHistory.findMany({ where, select: { historyId: true, appointmentId: true, changedAt: true, oldStatus: true, newStatus: true, oldDoctorId: true, newDoctorId: true, oldStartAt: true, newStartAt: true, actor: { select: { fullName: true } }, oldDoctor: { select: { fullName: true } }, newDoctor: { select: { fullName: true } }, oldService:{select:{name:true}},newService:{select:{name:true}}, appointment: { select: { service: { select: { name: true } } } } }, orderBy: [{ changedAt: "desc" }, { historyId: "desc" }], skip, take }),
    db.appointmentHistory.count({ where }),
  ]);
  const href = (target: number) => `/reception/history?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([,value]) => value !== undefined)) as Record<string,string>, page: String(target) })}`;
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-semibold">Lịch sử lịch hẹn</h1><p className="mt-2 text-sm text-slate-600">Tra cứu các lần tạo, xác nhận, đổi và hủy lịch hẹn.</p></header>
    <form action={submitPrivateSearch.bind(null, "/reception/history")} className="grid gap-4 rounded-lg bg-white p-5 sm:grid-cols-2 xl:grid-cols-5">
      <label className="text-sm font-medium">Từ ngày<input name="from" type="date" defaultValue={from} className="public-control mt-2" /></label>
      <label className="text-sm font-medium">Đến ngày<input name="to" type="date" min={from || undefined} defaultValue={to} className="public-control mt-2" /></label>
      <label className="text-sm font-medium">Loại thao tác<select name="type" defaultValue={type} className="public-control mt-2">{Object.entries(types).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-medium">Người thực hiện<input name="actor" defaultValue={actor} maxLength={120} placeholder="Nhập họ và tên" className="public-control mt-2" /></label>
      <div className="flex items-end gap-4"><button className="public-primary">Tra cứu</button><button type="submit" name="clear" value="1" formNoValidate className="public-secondary">Đặt lại</button></div>
    </form>
    <section className="rounded-lg bg-white px-5 sm:px-6" aria-label="Kết quả lịch sử"><p className="border-b border-slate-200 py-4 text-sm tabular-nums">{total} thao tác phù hợp</p><ol className="divide-y divide-slate-200">{rows.map(row => <li key={row.historyId} className="grid gap-3 py-5 lg:grid-cols-[170px_minmax(0,1fr)]"><time className="text-sm tabular-nums text-slate-600" dateTime={row.changedAt.toISOString()}>{formatClinicDateTime(row.changedAt,"dd/MM/yyyy HH:mm")}</time><div className="min-w-0 space-y-2"><p className="font-semibold">{row.actor.fullName} <span className="font-normal text-slate-600">· VC-{String(row.appointmentId).padStart(6,"0")}</span></p><p className="text-sm">{row.appointment.service.name}</p><ul className="space-y-1 text-sm text-slate-700">{row.oldStatus === null ? <li>Tạo lịch hẹn · {formatAppointmentStatusLabel(row.newStatus)}</li> : row.oldStatus !== row.newStatus && <li>{formatAppointmentStatusLabel(row.oldStatus)} → {formatAppointmentStatusLabel(row.newStatus)}</li>}{row.oldService && row.newService && row.oldService.name !== row.newService.name && <li>Dịch vụ: {row.oldService.name} → {row.newService.name}</li>}{row.oldStatus !== null && row.oldDoctorId !== row.newDoctorId && <li>Bác sĩ: {row.oldDoctor?.fullName ?? "Chưa phân công"} → {row.newDoctor?.fullName ?? "Chưa phân công"}</li>}{row.oldStartAt && row.newStartAt && row.oldStartAt.getTime() !== row.newStartAt.getTime() && <li className="tabular-nums">Giờ hẹn: {formatClinicDateTime(row.oldStartAt,"dd/MM HH:mm")} → {formatClinicDateTime(row.newStartAt,"dd/MM HH:mm")}</li>}</ul></div></li>)}</ol>{!rows.length && <p className="py-8 text-slate-600">Không có thao tác phù hợp. Thử đổi bộ lọc.</p>}</section>
    <PaginationBar page={page} pageSize={pageSize} totalPages={Math.max(1,Math.ceil(total/pageSize))} totalItems={total} buildHref={href} />
  </div>;
}
