import { singleSearchParams, parsePositiveId } from "@/lib/pagination";
import { FormSubmit } from "@/components/form-submit.client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { isDomainError } from "@/lib/errors";
import { getDoctorAppointmentById } from "@/modules/appointments/queries";
import { AppointmentSummaryPanel, AppointmentTimeline } from "@/modules/appointments/views";
import { FeedbackBanner } from "@/components/feedback";
import { doctorCompleteAppointmentAction } from "@/app/(staff)/doctor/actions";

export const dynamic = "force-dynamic";

export default async function DoctorAppointmentDetailPage({ params, searchParams }: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { appointmentId } = await params;
  const query = singleSearchParams(await searchParams);
  const id = parsePositiveId(appointmentId);
  if (!id) notFound();
  let appt;
  try {
    appt = await getDoctorAppointmentById(id);
  }
  catch (error) {
    if (!isDomainError(error) || ![403, 404].includes(error.statusCode)) throw error;
    return (
      <div className="space-y-4">
        <FeedbackBanner variant="error" title="Không xem được lịch hẹn" message={error.message} />
        <Link href="/doctor/appointments" className="back-link">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Về danh sách ca khám
        </Link>
      </div>
    );
  }
  const canComplete = appt.status === "CONFIRMED";
  const earlyWarning = query.earlyWarning === "1" && appt.isEarlyCompletion && canComplete;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/doctor/appointments" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Về danh sách ca khám</Link><AppointmentTimeline history={appt.history} /></div>
    {query.completed === "1" && appt.status === "COMPLETED" && <FeedbackBanner dialog variant="success" title="Đã hoàn tất buổi khám" message="Trạng thái lịch hẹn đã được cập nhật." />}
    {query.error && <FeedbackBanner dialog variant="error" title="Chưa hoàn tất được buổi khám" message={query.error} />}
    <AppointmentSummaryPanel
      appointmentId={appt.appointmentId} status={appt.status}
      serviceName={appt.serviceName} serviceDurationMinutes={appt.serviceDurationMinutes}
      doctorName={appt.doctorName} slotLabel={appt.slotLabel}
      patientName={appt.patientName} patientBirthDate={appt.patientBirthDate}
      actions={canComplete && <form action={doctorCompleteAppointmentAction}>
        <input type="hidden" name="appointmentId" value={appt.appointmentId} />
        <input type="hidden" name="acknowledgeEarlyWarning" value={String(earlyWarning)} />
        <FormSubmit key={String(earlyWarning)} className="public-primary gap-2" confirmation={{
          title: earlyWarning ? "Chưa đến giờ hẹn" : "Hoàn tất buổi khám",
          message: earlyWarning ? "Lịch hẹn chưa đến giờ bắt đầu. Chỉ tiếp tục nếu người khám bệnh đã thực sự khám xong." : "Xác nhận người khám bệnh đã khám xong?",
          label: earlyWarning ? "Xác nhận đã khám xong" : "Xác nhận",
          warning: earlyWarning, openInitially: earlyWarning,
          details: <dl className="space-y-3 border-y border-slate-200 py-4 text-sm">
            {[
              ["Người khám bệnh", appt.patientName],
              ["Dịch vụ khám", appt.serviceName],
              ["Giờ hẹn", appt.slotLabel],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-600">{label}</dt>
                <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>,
        }}><CheckCheck className="h-4 w-4" aria-hidden="true" />Đánh dấu đã hoàn tất</FormSubmit>
      </form>}
    />
  </div>;
}
