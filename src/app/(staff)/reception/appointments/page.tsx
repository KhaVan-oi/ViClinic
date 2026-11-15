import { buildFilterHref } from "@/lib/navigation";
import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import { singleSearchParams, parsePositiveId } from "@/lib/pagination";
import { APPOINTMENT_STATUSES } from "@/config/business";

import Link from "next/link";
import { CalendarPlus, Filter, Search } from "lucide-react";
import { type ReceptionQueueTab } from "@/modules/appointments/contracts";
import { getReceptionAppointments, getReceptionQueueCounts } from "@/modules/appointments/queries";
import { listBookableServices, listDoctorsDirectory } from "@/modules/scheduling/services";
import { ReceptionAppointmentTable } from "@/modules/appointments/views";
import { PaginationBar } from "@/components/pagination";

export const dynamic = "force-dynamic";

const QUEUE_GROUPS: { label: string; items: { key: ReceptionQueueTab; label: string }[] }[] = [
  { label: "Trong ngày", items: [
    { key: "TODAY_SCHEDULE", label: "Lịch khám hôm nay" },
    { key: "CREATED_TODAY_PENDING", label: "Mới đặt, chờ xác nhận" },
    { key: "TODAY_CONFIRMED", label: "Lịch hôm nay đã xác nhận" },
  ] },
  { label: "Tiếp nhận", items: [
    { key: "PENDING_UNASSIGNED", label: "Chưa phân công bác sĩ" },
    { key: "PENDING_ASSIGNED", label: "Đã chọn bác sĩ, chờ xác nhận" },
    { key: "OVERDUE_PENDING", label: "Đã quá giờ, chưa xác nhận" },
  ] },
  { label: "Theo dõi", items: [
    { key: "NEEDS_COORDINATION", label: "Cần điều phối lại" },
    { key: "OVERDUE_CONFIRMED", label: "Đã quá giờ, chưa hoàn tất" },
    { key: "ALL", label: "Tất cả lịch hẹn" },
  ] },
];
const QUEUE_TABS = QUEUE_GROUPS.flatMap(group => group.items);

export default async function ReceptionAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const rawTab = (params.tab ?? "").toUpperCase().replace(/-/g, "_");
  const tab: ReceptionQueueTab =
    rawTab === "UNASSIGNED"
      ? "PENDING_UNASSIGNED"
      : rawTab === "ASSIGNED"
        ? "PENDING_ASSIGNED"
        : rawTab === "OVERDUE"
          ? "OVERDUE_PENDING"
          : rawTab === "TODAY"
            ? "TODAY_SCHEDULE"
            : QUEUE_TABS.some((t) => t.key === rawTab)
              ? (rawTab as ReceptionQueueTab)
              : "TODAY_SCHEDULE";
  const status = APPOINTMENT_STATUSES.find(value => value === params.status) ?? "ALL";
  const doctorId = parsePositiveId(params.doctorId);
  const serviceId = parsePositiveId(params.serviceId);
  const date = params.date ?? "";
  const period = params.period ?? "day";
  const query = await readPrivateSearch("/reception/appointments");
  const page = Number(params.page ?? 1) || 1;

  const [counts, result, services, doctors] = await Promise.all([
    getReceptionQueueCounts(),
    getReceptionAppointments({ tab, status, doctorId, serviceId, period, date: date || null, query: query || null, page, pageSize: 20 }),
    listBookableServices(),
    listDoctorsDirectory(),
  ]);

  const buildFilterUrl = (overrides: Record<string, string | number | null>) =>
    buildFilterHref("/reception/appointments", {tab, status, doctorId, serviceId, date, period, page: 1, ...overrides});

  return (
    <div className="space-y-6" >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#0B2545]">Hàng đợi lịch hẹn</h1>
          
        </div>

        <div className="flex flex-wrap items-center gap-3">
      <a className="public-secondary" href={`/api/ui/export?${new URLSearchParams({kind:"appointments",tab,status,date,period,...(doctorId?{doctorId:String(doctorId)}:{}),...(serviceId?{serviceId:String(serviceId)}:{})})}`}>Xuất lịch hẹn theo bộ lọc</a>
        <Link
          href="/reception/appointments/new"

          className="public-primary inline-flex shrink-0 gap-2"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Đặt lịch tại quầy</span>
        </Link>
        </div>
      </div>

      <nav aria-label="Lọc lịch hẹn" className="queue-navigation">
        {QUEUE_GROUPS.map(group => <section key={group.label}>
          <h2>{group.label}</h2>
          {group.items.map(item => <Link key={item.key}
            aria-current={tab === item.key ? "page" : undefined}
            href={buildFilterUrl({tab: item.key, page: 1})}>
            <span>{item.label}</span><span className="tabular-nums">{counts[item.key]}</span>
          </Link>)}
        </section>)}
      </nav>

      <form action={submitPrivateSearch.bind(null, "/reception/appointments")} className="workbench-toolbar">
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="status" value={status} />
        <div className="appointment-filter-grid">
          <div className="appointment-filter-search">
            <label htmlFor="rec-query" className="block text-sm font-bold text-slate-600">Tìm lịch hẹn</label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600" />
              <input id="rec-query" name="query" type="text" defaultValue={query} placeholder="Mã lịch hẹn, số điện thoại hoặc họ tên" className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-base text-[#0B2545] focus:border-[#0D8A7C] focus:outline-none min-h-11 min-w-0" />
            </div>
          </div>

          <div>
            <label htmlFor="rec-doctor" className="block text-sm font-bold text-slate-600">Bác sĩ</label>
            <select id="rec-doctor" name="doctorId" defaultValue={doctorId ?? ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-base text-[#0B2545] focus:border-[#0D8A7C] focus:outline-none min-h-11 min-w-0">
              <option value="">Tất cả bác sĩ</option>
              {doctors.map((d) => (
                <option key={d.doctorId} value={d.doctorId}>{d.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rec-service" className="block text-sm font-bold text-slate-600">Dịch vụ</label>
            <select id="rec-service" name="serviceId" defaultValue={serviceId ?? ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-base text-[#0B2545] focus:border-[#0D8A7C] focus:outline-none min-h-11 min-w-0">
              <option value="">Tất cả dịch vụ</option>
              {services.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="appointment-filter-date">
            <div className="min-w-0 flex-1">
              <label htmlFor="rec-date" className="block text-sm font-bold text-slate-600">Ngày</label>
              <input id="rec-date" name="date" type="date" defaultValue={date} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-base text-[#0B2545] tabular-nums focus:border-[#0D8A7C] focus:outline-none min-h-11 min-w-0" />
            </div>
            <button type="submit" className="public-primary shrink-0 whitespace-nowrap">
              <Filter className="h-3 w-3" />
              <span>Lọc</span>
            </button>
          </div>
        </div>
        {(query || date || doctorId || serviceId || status !== "ALL") && <div className="mt-4 flex justify-end"><button type="submit" name="clear" value="1" className="public-secondary">Xóa bộ lọc</button></div>}
      </form>

      <div className="space-y-3">
        <ReceptionAppointmentTable items={result.items} />
        <div className="bg-white">
          <PaginationBar
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.totalItems}
            pageSize={result.pageSize}
            buildHref={(targetPage) => buildFilterUrl({ page: targetPage })}
          />
        </div>
      </div>
    </div>
  );
}
