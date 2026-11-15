import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isDomainError } from "@/lib/errors";
import { getPatientAppointmentById } from "@/modules/appointments/queries";
import { AppointmentSummaryPanel, AppointmentTimeline } from "@/modules/appointments/views";
import { FeedbackBanner } from "@/components/feedback";
import { patientCancelAppointmentAction } from "@/app/patient/actions";
import { PatientCancelSection } from "@/app/patient/appointments/[appointmentId]/cancel-form.client";
import { requirePatientPageSession } from "@/server/authorization";

export const dynamic = "force-dynamic";

export default async function PatientAppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string; }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { appointmentId } = await params;
  const query = singleSearchParams(await searchParams);
  const id = parsePositiveId(appointmentId);
  if (!id || id <= 0) {
    notFound();
  }

  let appt;
  const session = await requirePatientPageSession(`/patient/appointments/${id}`);
  if (!session) return null;
  try {
    appt = await getPatientAppointmentById(id,session);
  } catch (err) {
    if (isDomainError(err) && err.statusCode === 404) {
      notFound();
    }
    throw err;
  }

  const created = query.created === "1";
  const cancelled = query.cancelled === "1";
  const error = query.error ?? "";

  return (
    <div
      className="space-y-6"

    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/patient/appointments"
          className="back-link"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Về lịch khám</span>
        </Link>

        <AppointmentTimeline history={appt.history} showActorRoleBadges={false} />
      </div>

      {created && (
        <FeedbackBanner dialog
          variant="success"
          title="Đã gửi yêu cầu đặt lịch"
          message="Lễ tân sẽ kiểm tra và xác nhận. Bạn có thể theo dõi tại mục Thông báo."

        />
      )}

      {cancelled && (
        <FeedbackBanner dialog
          variant="info"
          title="Đã hủy lịch hẹn"
          message="Khung giờ này không còn được giữ cho bạn."

        />
      )}
      {query.rescheduled === "1" && <FeedbackBanner dialog variant="success" title="Đã thay đổi lịch hẹn" message="Phòng khám sẽ liên hệ để xác nhận thông tin mới." />}
      {query.changeBlocked === "1" && <FeedbackBanner dialog variant="warning" title="Cần phòng khám hỗ trợ" message="Lịch hẹn này không thể tự thay đổi. Vui lòng gọi 1900 0091 để được hỗ trợ." />}

      {error && (
        <FeedbackBanner dialog
          variant="error"
          title="Không thể hoàn tất thao tác"
          message={error}

        />
      )}

      <h1 className="text-2xl font-bold">Chi tiết lịch hẹn</h1>

      <AppointmentSummaryPanel
        allowSave
        actions={(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
          <PatientCancelSection
            key={`${appt.appointmentId}:${error}:${appt.status}`}
            appointmentId={appt.appointmentId}
            appointmentLabel={`${appt.serviceName} · ${appt.slotLabel}`}
            canSelfCancel={appt.canSelfCancel}
            canSelfChange={appt.status === "PENDING" && new Date(appt.startAtIso) > new Date()}
            cancelAction={patientCancelAppointmentAction}
          />
        )}
        appointmentId={appt.appointmentId}
        status={appt.status}
        serviceName={appt.serviceName}
        serviceDurationMinutes={appt.serviceDurationMinutes}
        doctorName={appt.doctorName}
        slotLabel={appt.slotLabel}
        patientName={session.fullName}
        patientPhone={session.phone}
        patientBirthDate={session.birthDate?.toISOString().slice(0,10)}
      />

    </div>
  );
}
