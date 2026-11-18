import Link from "next/link";
import { getManagerDashboardSummary } from "@/modules/appointments/dashboards";
import { AppointmentStatusBadge } from "@/components/status";
import { formatClinicDateTime, getClinicDayStart } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ManagerHomePage() {
  const summary = await getManagerDashboardSummary();
  const shifts = summary.todayShifts.length ? summary.todayShifts : summary.upcomingShifts;
  const shiftGroups = Map.groupBy(shifts, shift => shift.slotLabel);
  const statuses = [
    ["Chờ xác nhận", summary.pendingCount],
    ["Đã xác nhận", summary.confirmedCount],
    ["Đã hoàn tất", summary.completedCount],
    ["Đã hủy", summary.cancelledCount],
  ] as const;
  return (
    <div className="space-y-8" >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545]">Điều hành phòng khám</h1>
          <p className="mt-2 text-sm text-slate-600 tabular-nums">{formatClinicDateTime(getClinicDayStart(summary.todayIso), "dd/MM/yyyy")} · {summary.todayAppointmentsCount} lịch hẹn hôm nay</p>
        </div>
        <Link href="/manager/shifts" className="public-primary">Quản lý ca làm việc</Link>
      </header>
      <section aria-labelledby="manager-impact-heading" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="manager-impact-heading" className="text-lg font-bold">Lịch hẹn cần điều phối <span className="tabular-nums">({summary.affectedCount})</span></h2>
          <Link href="/manager/calendar" className="public-quiet">Xem lịch phòng khám</Link>
        </div>
        {summary.affectedItems.length ? (
          <ul className="mt-3 divide-y divide-slate-200">
            {summary.affectedItems.map(item => (
              <li key={item.appointmentId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-semibold">{item.serviceName}</p>
                  <p className="mt-1 text-sm tabular-nums">{item.slotLabel}</p>
                  <p className="mt-1 text-sm text-slate-600">Bác sĩ: {item.doctorName ?? "Chưa phân công"}</p>
                </div>
                <AppointmentStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-slate-600">Không có lịch hẹn bị ảnh hưởng bởi ca làm việc hoặc lịch bận.</p>}
      </section>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="manager-shifts-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="manager-shifts-heading" className="text-lg font-bold">{summary.todayShifts.length ? "Ca làm việc hôm nay" : "Ca làm việc sắp tới"}</h2>
            <Link href="/manager/shifts" className="public-quiet">Xem tất cả</Link>
          </div>
          {shifts.length ? (
            <ul className="mt-2 divide-y divide-slate-200 bg-white px-5">
              {[...shiftGroups].map(([slot, names]) => (
                <li key={slot} className="space-y-3 py-5">
                  <h3 className="font-semibold tabular-nums">{slot}</h3>
                  <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{names.map(shift => <li key={shift.shiftId}>{shift.doctorName}</li>)}</ul>
                </li>
              ))}
            </ul>
          ) : <p className="py-4 text-sm text-slate-600">Chưa có ca làm việc. Thêm ca để mở thời gian đặt lịch.</p>}
        </section>
        <section aria-labelledby="manager-summary-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="manager-summary-heading" className="text-lg font-bold">Tình hình lịch hẹn</h2>
            <Link href="/manager/reports" className="public-quiet">Xem báo cáo</Link>
          </div>
          <p className="text-sm text-slate-600">Tất cả thời gian</p>
          <dl className="mt-3 divide-y divide-slate-200">
            {statuses.map(([label, count]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><dt>{label}</dt><dd className="font-semibold tabular-nums">{count}</dd></div>)}
          </dl>
          <div className="mt-5 space-y-2 border-t border-slate-300 pt-4 text-sm">
            <Link href="/manager/services" className="flex min-h-11 items-center justify-between gap-4 text-[#174954] transition-colors rounded-md px-3.5 hover:bg-slate-100"><span>Dịch vụ đang nhận lịch</span><span className="font-semibold tabular-nums">{summary.activeServicesCount} / {summary.activeServicesCount + summary.inactiveServicesCount}</span></Link>
            <Link href="/manager/doctor-services" className="flex min-h-11 items-center justify-between gap-4 text-[#174954] transition-colors rounded-md px-3.5 hover:bg-slate-100"><span>Phân công dịch vụ cho bác sĩ</span><span className="font-semibold tabular-nums">{summary.activeDoctorsCount} bác sĩ</span></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
