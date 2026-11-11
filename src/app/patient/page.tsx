import Link from "next/link";
import { requirePatientPageSession } from "@/server/authorization";
import { getPatientAppointments } from "@/modules/appointments/queries";
import { clinicConfig } from "@/config/clinic";
import { PatientAppointmentList } from "@/modules/appointments/views";
import { Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const session = await requirePatientPageSession("/patient");
  if (!session) return null;
  const upcoming = await getPatientAppointments({ page: 1, pageSize: 3, tab: "UPCOMING" });
  return (
    <div className="patient-overview">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="mb-2 break-words text-slate-600">Xin chào, {session.fullName}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Lịch khám của bạn</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/patient/appointments?view=list&tab=HISTORY" className="public-secondary">Lịch khám đã qua</Link>
        <Link href="/patient/book" className="public-primary">Đặt lịch khám</Link>
        </div>
      </header>
      <div className="patient-overview-grid">
        <section aria-labelledby="upcoming-heading" className="appointment-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <h2 id="upcoming-heading" className="text-xl font-semibold">Lịch hẹn sắp tới</h2>
            <Link href="/patient/appointments" className="public-quiet">{upcoming.totalItems > 3 ? `Xem tất cả (${upcoming.totalItems})` : "Mở lịch khám"}</Link>
          </div>
          {upcoming.items.length ? <PatientAppointmentList items={upcoming.items} /> : (
            <div className="space-y-3 py-8">
              <p className="text-slate-600">Bạn chưa có lịch hẹn sắp tới.</p>
              <Link href="/patient/book" className="public-text-link">Chọn dịch vụ và giờ khám</Link>
            </div>
          )}
        </section>
        <aside className="patient-support">
            <Phone className="mb-4 h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Cần hỗ trợ lịch hẹn?</h2>
            <p className="mt-2 text-sm leading-6">Bạn có thể tự đổi lịch đang chờ xác nhận. Liên hệ phòng khám nếu lịch đã xác nhận hoặc cần hủy sát giờ.</p>
            <a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`} className="public-text-link mt-3 tabular-nums">{clinicConfig.hotline}</a>
        </aside>
      </div>
    </div>
  );
}
