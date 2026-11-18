import { PaginationBar } from "@/components/pagination";
import { TZDate } from "@date-fns/tz";
import { CLINIC_TIMEZONE } from "@/config/business";
import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import { endOfMonth, startOfMonth, subMonths, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from "date-fns";
import Link from "next/link";
import { Filter } from "lucide-react";
import { formatDateOnlyDisplay, formatClinicIsoDate } from "@/lib/dates";
import { isDomainError } from "@/lib/errors";
import { getAppointmentReport } from "@/modules/reports/server";
import { FeedbackBanner } from "@/components/feedback";
import { CountChart, DailyTrend } from "@/components/status";
import { ReportTools } from "@/components/report-tools.client";

export const dynamic = "force-dynamic";

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const now = new TZDate(new Date(), CLINIC_TIMEZONE);
  const defaultFromDate = formatClinicIsoDate(startOfMonth(subMonths(now, 1)));
  const defaultToDate = formatClinicIsoDate(endOfMonth(now));

  const fromDate = params.fromDate ?? defaultFromDate;
  const toDate = params.toDate ?? defaultToDate;
  const doctorId = parsePositiveId(params.doctorId);
  const period = (["DAY","WEEK","MONTH","QUARTER"] as const).find(value=>value===params.period) ?? "DAY";
  const ranges = [{label:"Tuần này",start:startOfWeek(now,{weekStartsOn:1}),end:endOfWeek(now,{weekStartsOn:1})},{label:"Tháng này",start:startOfMonth(now),end:endOfMonth(now)},{label:"Quý này",start:startOfQuarter(now),end:endOfQuarter(now)}];

  let report = null;
  let errorMsg = "";

  try {
    report = await getAppointmentReport({ fromDate, toDate, doctorId, period, page: Number(params.page) || 1 });
  } catch (err) {
    errorMsg = isDomainError(err) ? err.message : "Không thể truy vấn báo cáo.";
  }

  const reportViews = [
    { key: "overview", label: "Tổng quan" },
    { key: "services", label: "Theo dịch vụ" },
    { key: "doctors", label: "Theo bác sĩ" },
    { key: "details", label: "Lịch hẹn chi tiết" },
  ];
  const view = reportViews.some(item => item.key === params.view) ? params.view! : "overview";
  const total = report?.metrics.total ?? 0;

  const dailyTable = report && <table className="w-full text-sm"><thead><tr><th className="py-3 text-left">Ngày</th><th className="py-3 text-right">Số lịch</th><th className="py-3 text-right">Đã hủy</th></tr></thead><tbody>{report.byDate.map(row => <tr key={row.label} className="border-t border-slate-200"><td className="py-3 tabular-nums">{formatDateOnlyDisplay(row.label)}</td><td className="py-3 text-right tabular-nums">{row.count}</td><td className="py-3 text-right tabular-nums">{row.cancelled}</td></tr>)}</tbody></table>;

  return (
    <div className="manager-report space-y-6" >

      <div >
        <h1 className="text-2xl font-semibold text-[#0B2545]">Báo cáo lịch hẹn</h1>
        
      </div>

      <form method="GET" action="/manager/reports" className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_minmax(220px,1.5fr)_1fr_auto]">
        <input type="hidden" name="view" value={view} />
        <div>
          <label htmlFor="rep-from" className="block text-sm font-medium text-slate-700">Từ ngày *</label>
          <input id="rep-from" name="fromDate" type="date" required defaultValue={fromDate} className="mt-1 w-full min-h-11 rounded border border-slate-300 bg-white px-3 py-2 text-base tabular-nums focus:border-[#0D8A7C] focus:outline-none min-w-0" />
        </div>
        <div>
          <label htmlFor="rep-to" className="block text-sm font-medium text-slate-700">Đến ngày *</label>
          <input id="rep-to" name="toDate" type="date" required defaultValue={toDate} className="mt-1 w-full min-h-11 rounded border border-slate-300 bg-white px-3 py-2 text-base tabular-nums focus:border-[#0D8A7C] focus:outline-none min-w-0" />
        </div>
        <div>
          <label htmlFor="rep-doctor" className="block text-sm font-medium text-slate-700">Bác sĩ phụ trách</label>
          <select id="rep-doctor" name="doctorId" defaultValue={doctorId ?? ""} className="mt-1 w-full min-h-11 rounded border border-slate-300 bg-white px-3 py-2 text-base focus:border-[#0D8A7C] focus:outline-none min-w-0">
            <option value="">Toàn bộ phòng khám</option>
            {(report?.doctors ?? []).map((d) => (
              <option key={d.userId} value={d.userId}>{d.fullName}</option>
            ))}
          </select>
        </div>
        <label className="text-sm font-medium">Nhóm số liệu<select name="period" defaultValue={period} className="public-control mt-2">{[{value:"DAY",label:"Theo ngày"},{value:"WEEK",label:"Theo tuần"},{value:"MONTH",label:"Theo tháng"},{value:"QUARTER",label:"Theo quý"}].map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <div className="flex items-end">
          <button type="submit" className="public-primary w-full gap-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Xem báo cáo</span>
          </button>
        </div>
      </form>

      <nav aria-label="Khoảng báo cáo nhanh" className="flex flex-wrap gap-3">{ranges.map(range=><Link key={range.label} className="public-secondary" href={`/manager/reports?${new URLSearchParams({fromDate:formatClinicIsoDate(range.start),toDate:formatClinicIsoDate(range.end),view,period,...(doctorId?{doctorId:String(doctorId)}:{})})}`}>{range.label}</Link>)}</nav>

      {errorMsg && (
        <FeedbackBanner dialog variant="error" title="Lỗi tra cứu báo cáo" message={errorMsg} />
      )}

      <nav aria-label="Loại báo cáo" className="flex flex-wrap gap-3">{reportViews.map(item => <Link key={item.key} className={view === item.key ? "public-primary" : "public-secondary"} aria-current={view === item.key ? "page" : undefined} href={`/manager/reports?${new URLSearchParams({ fromDate, toDate, period, view: item.key, ...(doctorId ? { doctorId: String(doctorId) } : {}) })}`}>{item.label}</Link>)}</nav>

      {report && (
        <section className="report-sheet space-y-8 border-y border-slate-200 bg-white px-5 py-6 sm:px-8">
          <div className="report-heading flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-lg font-semibold">{report.doctorName ? "Bác sĩ " + report.doctorName : "Toàn bộ phòng khám"}</h2>
              <p className="mt-1 text-sm tabular-nums text-slate-600">{formatDateOnlyDisplay(report.fromDate)} – {formatDateOnlyDisplay(report.toDate)}</p>
            </div>

          </div>
          <ReportTools query={new URLSearchParams({ fromDate, toDate, period, view, ...(doctorId ? { doctorId: String(doctorId) } : {}) }).toString()} />
          {view === "overview" && <>
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">Số lịch theo kết quả trong khoảng thời gian đã chọn</caption>
            <thead className="border-b border-slate-200 text-slate-600">
              <tr><th scope="col" className="py-3 font-medium">Kết quả</th><th scope="col" className="py-3 text-right font-medium">Số lịch</th><th scope="col" className="py-3 text-right font-medium">Tỷ lệ</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: "pending", label: "Chờ xác nhận", count: report.metrics.pending },
                { id: "confirmed", label: "Đã xác nhận", count: report.metrics.confirmed },
                { id: "completed", label: "Đã hoàn tất", count: report.metrics.completed },
                { id: "cancelled", label: "Đã hủy", count: report.metrics.cancelled },
              ].map(row => (
                <tr key={row.id} >
                  <th scope="row" className="py-4 pr-4 font-medium">{row.label}</th>
                  <td className="py-4 text-right font-semibold tabular-nums">{row.count}</td>
                  <td className="py-4 pl-4 text-right tabular-nums text-slate-600">{total ? (row.count/total*100).toFixed(1) : "0.0"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <DailyTrend rows={report.byPeriod} title={`Lượng lịch hẹn theo ${period === "DAY" ? "ngày" : period === "WEEK" ? "tuần" : period === "MONTH" ? "tháng" : "quý"}`} />
          <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-semibold">Số liệu theo kỳ đã chọn</caption><thead><tr className="border-b border-slate-200"><th className="py-3 font-medium">Ngày bắt đầu kỳ</th><th className="py-3 text-right font-medium">Tổng số lịch</th><th className="py-3 text-right font-medium">Đã hủy</th></tr></thead><tbody>{report.byPeriod.map(row=><tr key={row.label} className="border-b border-slate-100"><td className="py-3 tabular-nums">{formatDateOnlyDisplay(row.label)}</td><td className="py-3 text-right tabular-nums">{row.count}</td><td className="py-3 text-right tabular-nums text-rose-800">{row.cancelled}</td></tr>)}</tbody></table></div>
          </>}
          {view === "details" && <section><h3 className="mb-4 text-lg font-semibold">Lịch hẹn chi tiết</h3><div className="max-h-96 overflow-auto" tabIndex={0} role="region" aria-label="Chi tiết lịch hẹn, cuộn ngang để xem đủ cột"><table className="min-w-[900px] w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr>{["Mã lịch hẹn","Dịch vụ","Bác sĩ","Ngày khám","Giờ khám","Thời lượng","Trạng thái"].map(label=><th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{report.details.map(row=><tr key={row.code} className="border-b border-slate-200">{[row.code,row.service,row.doctor,formatDateOnlyDisplay(row.date),row.time,`${row.duration} phút`,row.status].map((value,index)=><td key={index} className="px-3 py-3">{value}</td>)}</tr>)}</tbody></table></div><PaginationBar page={report.detailPage} totalPages={Math.ceil(report.detailTotal/report.detailPageSize)} totalItems={report.detailTotal} pageSize={report.detailPageSize} buildHref={page => `/manager/reports?${new URLSearchParams({fromDate,toDate,period,view,...(doctorId ? {doctorId:String(doctorId)} : {}),page:String(page)})}`} /></section>}
          {view === "services" && <CountChart title="Lịch hẹn theo dịch vụ" rows={report.byService} />}
          {view === "doctors" && <section><h3 className="mb-4 text-lg font-semibold">Phân bổ lịch theo bác sĩ</h3><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-600"><th className="py-3 font-medium">Bác sĩ</th><th className="py-3 text-right font-medium">Số lịch</th></tr></thead><tbody>{report.byDoctor.map(row => <tr key={row.label} className="border-b border-slate-100"><td className="py-3 pr-4">{row.label}</td><td className="py-3 text-right font-semibold tabular-nums">{row.count}</td></tr>)}</tbody></table></section>}
          {view === "overview" && period !== "DAY" && <section className="border-t border-slate-200 pt-6"><h3 className="mb-4 text-lg font-semibold">Chi tiết theo ngày</h3><div className="max-h-72 overflow-auto">{dailyTable}</div></section>}
        </section>
      )}
    </div>
  );
}
