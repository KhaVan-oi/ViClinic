import { buildFilterHref } from "@/lib/navigation";
import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import { singleSearchParams } from "@/lib/pagination";
import Link from "next/link";
import { Filter } from "lucide-react";
import { type DoctorAppointmentTab } from "@/modules/appointments/contracts";
import { getDoctorAppointments } from "@/modules/appointments/queries";
import { DoctorAppointmentTable } from "@/modules/appointments/views";
import { PaginationBar } from "@/components/pagination";

export const dynamic = "force-dynamic";

const DOCTOR_TABS: Array<{ key: DoctorAppointmentTab; label: string; }> = [
  { key: "TODAY", label: "Lịch khám hôm nay" },
  { key: "UPCOMING", label: "Sắp tới" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "OVERDUE_CONFIRMED", label: "Quá giờ, chưa hoàn tất" },
  { key: "HISTORY", label: "Lịch sử" },
];

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const tab = DOCTOR_TABS.find(item => item.key === params.tab)?.key ?? "TODAY";
  const date = params.date ?? "";
  const query = await readPrivateSearch("/doctor/appointments");
  const page = Number(params.page ?? 1) || 1;

  const result = await getDoctorAppointments({
    tab,
    date: date || null,
    query,
    page,
    pageSize: 20,
  });

  const buildUrl = (overrides: Record<string, string | number | null>) =>
    buildFilterHref("/doctor/appointments", {tab, date, page: 1, ...overrides});

  return (
    <div className="space-y-6" >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Danh sách ca khám</h1>
        <div className="flex flex-wrap gap-3">
          <a className="public-secondary" href={`/api/ui/export?${new URLSearchParams({kind:"appointments",tab,date})}`}>Xuất lịch hẹn</a>
          <a className="public-secondary" href="/api/ui/export?kind=patients">Xuất người khám bệnh phụ trách</a>
        </div>
      </header>
      <form action={submitPrivateSearch.bind(null, "/doctor/appointments")} className="workbench-toolbar doctor-appointment-filter">
        <input type="hidden" name="tab" value={tab} />
        <label htmlFor="doctor-query">Tìm lịch hẹn
          <input id="doctor-query" name="query" defaultValue={query} maxLength={120} placeholder="Mã lịch hẹn, số điện thoại hoặc họ tên" className="public-control mt-2 w-full" />
        </label>
        <label htmlFor="doctor-date">Ngày khám
          <input id="doctor-date" name="date" type="date" defaultValue={date} className="public-control mt-2 w-full tabular-nums" />
        </label>
        <div className="flex flex-wrap gap-3"><button type="submit" className="public-primary"><Filter className="h-4 w-4" />Tìm lịch hẹn</button>
          {(query || date) && <button type="submit" name="clear" value="1" className="public-secondary">Xóa bộ lọc</button>}</div>
      </form>
      <nav aria-label="Bộ lọc lịch hẹn Bác sĩ" className="appointment-tabs">
        {DOCTOR_TABS.map(item => <Link key={item.key} aria-current={tab === item.key ? "page" : undefined}
          href={buildUrl({tab: item.key, page: 1})}>{item.label}</Link>)}
      </nav>

      <div className="space-y-3">
        <DoctorAppointmentTable items={result.items} />
        <div>
          <PaginationBar
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.totalItems}
            pageSize={result.pageSize}
            buildHref={(targetPage) => buildUrl({ page: targetPage })}
          />
        </div>
      </div>
    </div>
  );
}
