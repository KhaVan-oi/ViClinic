
import { formatDateOnlyDisplay } from "@/lib/dates";
import Link from "next/link";
import { getDoctorDashboardSummary } from "@/modules/appointments/dashboards";
import { DoctorAppointmentTable } from "@/modules/appointments/views";
import { AppointmentStatusBadge } from "@/components/status";

export const dynamic = "force-dynamic";

export default async function DoctorHomePage() {
  const summary = await getDoctorDashboardSummary();
  const next = summary.nextAppointment;
  return (
    <div className="space-y-8" >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Lịch khám hôm nay</h1>
          <p className="mt-2 text-sm tabular-nums text-slate-700">{formatDateOnlyDisplay(summary.todayIso)}</p>
        </div>
        <Link href="/doctor/unavailability" className="public-secondary">Đăng ký lịch bận</Link>
      </header>
      {summary.overdueConfirmedCount > 0 && <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#e8f2f4] p-5"><div><h2 className="font-semibold text-[#174954]">Lịch đã qua giờ cần cập nhật</h2><p className="mt-1 text-sm text-[#174954] tabular-nums">{summary.overdueConfirmedCount} lịch hẹn đang chờ ghi nhận kết quả.</p></div><Link href="/doctor/appointments?tab=OVERDUE_CONFIRMED" className="public-secondary">Kiểm tra lịch hẹn</Link></section>}
      {next && <section aria-labelledby="doctor-next-heading" className="appointment-surface space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="doctor-next-heading" className="text-xl font-semibold">Lịch hẹn tiếp theo</h2>
          <div className="flex flex-wrap items-center gap-3"><AppointmentStatusBadge status={next.status} />
        <Link href={`/doctor/appointments/${next.appointmentId}`} className="public-primary">Xem chi tiết lịch hẹn</Link>
          </div>
        </div>
        <dl className="grid min-w-0 gap-5 sm:grid-cols-2">
          <div><dt className="text-sm text-slate-600">Người khám bệnh</dt><dd className="mt-2 font-semibold">{next.patientName}</dd>
            <dd className="mt-1 text-sm tabular-nums text-slate-700">Ngày sinh: {next.patientBirthDate?.split("-").reverse().join("/") ?? "Chưa cập nhật"}</dd></div>
          <div><dt className="text-sm text-slate-600">Thời gian</dt><dd className="mt-2 font-semibold tabular-nums">{next.slotLabel}</dd></div>
          <div><dt className="text-sm text-slate-600">Dịch vụ</dt><dd className="mt-2 font-semibold">{next.serviceName}</dd></div>
          <div><dt className="text-sm text-slate-600">Thời lượng dự kiến</dt><dd className="mt-2 font-semibold tabular-nums">{next.serviceDurationMinutes} phút</dd></div>
        </dl>
      </section>}
      <section aria-labelledby="doctor-work-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="doctor-work-heading" className="text-lg font-semibold">Ca trực và lịch phân công</h2>
          <Link href="/doctor/calendar" className="public-quiet">Xem lịch làm việc</Link>
        </div>
        {summary.todayShifts.length ? <ul className="divide-y divide-slate-200 text-sm tabular-nums">
          {summary.todayShifts.map(shift => <li key={shift.shiftId} className="py-2">{shift.slotLabel}</li>)}
        </ul> : <p className="text-sm text-slate-700">Bạn không có ca trực hôm nay.</p>}
        <nav className="flex flex-wrap gap-x-8 gap-y-2 border-y border-slate-200 py-3" aria-label="Lọc lịch phân công">
          {[{ tab: "TODAY", label: "Hôm nay", count: summary.todayCount },
          { tab: "UPCOMING", label: "Sắp tới", count: summary.upcomingCount },
          { tab: "OVERDUE_CONFIRMED", label: "Chờ hoàn tất", count: summary.overdueConfirmedCount }].map(item => (
            <Link key={item.tab} href={`/doctor/appointments?tab=${item.tab}`} className="public-text-link gap-3">{item.label}<span className="tabular-nums">({item.count})</span></Link>
          ))}
        </nav>
        <DoctorAppointmentTable items={summary.todayAppointments.slice(0, 6)} />
      </section>
    </div>
  );
}
