import { requirePatientPageSession } from "@/server/authorization";
import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import Link from "next/link";
import { singleSearchParams } from "@/lib/pagination";
import { getPatientAppointments } from "@/modules/appointments/queries";
import { PatientAppointmentList } from "@/modules/appointments/views";
import { FullCalendarWrapper } from "@/components/calendar.client";
import { PaginationBar } from "@/components/pagination";
import type { PatientAppointmentTab } from "@/modules/appointments/contracts";

export const dynamic = "force-dynamic";

export default async function PatientAppointmentsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!await requirePatientPageSession("/patient/appointments")) return null;
  const params = singleSearchParams(await searchParams);
  const query = await readPrivateSearch("/patient/appointments");
  const list = params.view === "list" || !!params.tab || !!params.page;
  const tabValue = params.tab?.toUpperCase();
  const tab: PatientAppointmentTab = tabValue === "HISTORY" ? "HISTORY" : tabValue === "ALL" ? "ALL" : "UPCOMING";
  const result = list ? await getPatientAppointments({ page: Number(params.page) || 1, pageSize: 20, tab, query }) : null;
  const listHref = (nextTab: PatientAppointmentTab, page = 1) => `/patient/appointments?view=list&tab=${nextTab}&page=${page}`;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Lịch khám của tôi</h1><p className="mt-2 text-sm text-slate-600">Chọn lịch hẹn để xem chi tiết.</p></div>
        <Link href="/patient/book" className="public-primary">Đặt lịch khám</Link>
      </header>
      <nav aria-label="Cách xem lịch khám" className="flex gap-6 border-b border-slate-200">
        {[{ href: "/patient/appointments", label: "Lịch", active: !list }, { href: "/patient/appointments?view=list", label: "Danh sách", active: list }].map(item =>
          <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={`min-h-11 border-b-2 py-3 font-medium ${item.active ? "border-[#0D8A7C] text-[#0A6E63]" : "border-transparent text-slate-600"}`}>{item.label}</Link>
        )}
      </nav>
      <form action={submitPrivateSearch.bind(null, "/patient/appointments")} className="flex flex-wrap items-center gap-3"><input type="hidden" name="view" value="list" /><input type="hidden" name="tab" value="ALL" /><label className="min-w-0 flex-1 text-sm font-medium">Tìm lịch hẹn<input name="query" defaultValue={query} maxLength={120} placeholder="Mã lịch hẹn, số điện thoại hoặc họ tên" className="public-control mt-2" /></label><button className="public-primary self-end">Tìm kiếm</button></form>
      {!result ? <section aria-label="Lịch hẹn theo ngày" className="bg-white p-3 sm:p-6"><FullCalendarWrapper role="PATIENT" appointmentHrefPrefix="/patient/appointments" /></section> : (
        <section aria-label="Danh sách lịch hẹn" className="space-y-5 bg-white p-4 sm:p-6">
          <nav aria-label="Lọc lịch hẹn" className="flex flex-wrap gap-5 border-b border-slate-200 pb-3 text-sm">
            {([{ value: "UPCOMING", label: "Sắp tới", count: result.upcomingCount }, { value: "HISTORY", label: "Đã qua", count: result.historyCount }, { value: "ALL", label: "Tất cả", count: result.upcomingCount + result.historyCount }] as const).map(item =>
              <Link key={item.value} href={listHref(item.value)} aria-current={tab === item.value ? "page" : undefined} className={`min-h-11 inline-flex items-center gap-2 ${tab === item.value ? "font-semibold text-[#0A6E63]" : "text-slate-600"}`}>{item.label}<span className="tabular-nums">({item.count})</span></Link>
            )}
          </nav>
          {result.items.length ? <PatientAppointmentList items={result.items} /> : <div className="space-y-3 py-8"><p className="text-slate-600">Không có lịch hẹn trong mục này.</p><Link href="/patient/book" className="public-text-link">Đặt lịch khám</Link></div>}
          <PaginationBar page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} pageSize={result.pageSize} buildHref={page => listHref(tab, page)} />
        </section>
      )}
    </div>
  );
}
