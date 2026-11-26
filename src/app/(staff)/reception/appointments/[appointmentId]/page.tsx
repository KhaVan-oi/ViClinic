import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import { FormSubmit } from "@/components/form-submit.client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
} from "lucide-react";
import { isDomainError } from "@/lib/errors";
import { formatClinicIsoDate, isValidIsoDate } from "@/lib/dates";
import { getReceptionAppointmentById } from "@/modules/appointments/queries";
import { getAvailableSlots, listEligibleDoctors, listAvailableDoctorsForAppointment } from "@/modules/scheduling/availability";
import { AppointmentSummaryPanel, AppointmentTimeline } from "@/modules/appointments/views";
import { FeedbackBanner } from "@/components/feedback";
import {
  receptionCancelAppointmentAction,
  receptionCompleteAppointmentAction,
  receptionConfirmAppointmentAction,
  receptionRescheduleAppointmentAction,
} from "@/app/(staff)/reception/actions";
import { ReceptionActionWorkbench } from "@/app/(staff)/reception/appointments/[appointmentId]/workbench.client";
import { listBookableServices } from "@/modules/scheduling/services";

export const dynamic = "force-dynamic";

export default async function ReceptionAppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string; }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { appointmentId } = await params;
  const query = singleSearchParams(await searchParams);
  const id = parsePositiveId(appointmentId);
  if (!id || id <= 0) notFound();

  let appt;
  try {
    appt = await getReceptionAppointmentById(id);
  } catch (err) {
    if (isDomainError(err) && err.statusCode === 404) notFound();
    throw err;
  }

  const now = new Date();
  const minDateIso = formatClinicIsoDate(now);
  const services = await listBookableServices();
  const reschedServiceId = parsePositiveId(query.reschedServiceId) ?? appt.serviceId;

  const currentDoctors = await listEligibleDoctors({
    serviceId: appt.serviceId,
    excludePatientUserId: appt.patientId,
  });
  const confirmDoctors = appt.status === "PENDING" ? await listAvailableDoctorsForAppointment({
    appointmentId: appt.appointmentId,
    startAt: new Date(appt.startAtIso),
    endAt: new Date(appt.endAtIso),
  }, currentDoctors) : [];
  const eligibleDoctors = reschedServiceId === appt.serviceId ? currentDoctors : await listEligibleDoctors({serviceId:reschedServiceId,excludePatientUserId:appt.patientId});

  const apptDateIso = formatClinicIsoDate(new Date(appt.startAtIso));
  const reschedDate =
    query.reschedDate && isValidIsoDate(query.reschedDate)
      ? query.reschedDate
      : apptDateIso >= minDateIso ? apptDateIso : minDateIso;

  const reschedDoctorId =
    query.reschedDoctorId !== undefined
      ? parsePositiveId(query.reschedDoctorId)
      : eligibleDoctors.some(doctor=>doctor.doctorId===appt.doctorId) ? appt.doctorId : null;

  const reschedSlots =
    appt.status === "PENDING" || appt.status === "CONFIRMED"
      ? await getAvailableSlots({
        serviceId: reschedServiceId,
        date: reschedDate,
        doctorId: reschedDoctorId,
        patientId: appt.patientId,
        excludeAppointmentId: appt.appointmentId,
        enforceHorizon: false,
      }, eligibleDoctors)
      : [];

  const created = query.created === "1";
  const confirmed = query.confirmed === "1";
  const rescheduled = query.rescheduled === "1";
  const cancelled = query.cancelled === "1";
  const completed = query.completed === "1";
  const overdueWarning = query.overdueWarning === "1";
  const earlyWarning = query.earlyWarning === "1";
  const warningMsg = query.warningMsg ?? "";
  const pendingDoctorId = query.pendingDoctorId
    ? Number(query.pendingDoctorId)
    : appt.doctorId;
  const error = query.error ?? "";

  return (
    <div className="space-y-6" >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/reception/appointments" className="back-link">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Hàng đợi lịch hẹn</span>
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-3"><Link href={`/reception/patients/${appt.patientId}`} className="public-secondary">
          Hồ sơ người khám bệnh
        </Link>
        <AppointmentTimeline history={appt.history ?? []} /></div>
      </div>

      {created && <FeedbackBanner dialog variant="success" title="Đã tạo lịch hẹn" message="Lịch hẹn đã được lưu. Xem thông tin và trạng thái bên dưới." />}
      {confirmed && <FeedbackBanner dialog variant="success" title="Đã xác nhận" message="Lịch hẹn đã chuyển sang trạng thái Đã xác nhận." />}
      {rescheduled && <FeedbackBanner dialog variant="success" title="Đã cập nhật lịch hẹn" message="Dịch vụ, bác sĩ và giờ khám đã được lưu. Kiểm tra phiếu hẹn bên dưới." />}
      {completed && <FeedbackBanner dialog variant="success" title="Đã hoàn tất" message="Lịch hẹn đã chuyển sang trạng thái Đã hoàn tất." />}
      {cancelled && <FeedbackBanner dialog variant="info" title="Đã hủy" message="Lịch hẹn đã chuyển sang trạng thái Đã hủy." />}
      {error && <FeedbackBanner dialog variant="conflict" title="Không thể xử lý" message={error} />}
      {appt.needsCoordination && (
        <FeedbackBanner variant="warning" title="Lịch hẹn cần điều phối lại" message="Kiểm tra ca trực, lịch bận và yêu cầu từ phòng khám trước khi sắp xếp lại."><p className="font-medium text-[#174954]">{appt.coordinationReasons.map(reason => ({OUTSIDE_SHIFT:"Ngoài ca trực",UNAVAILABILITY_CONFLICT:"Trùng lịch bận",SERVICE_DEACTIVATION:"Dịch vụ ngừng hoạt động",DOCTOR_SERVICE_REMOVAL:"Cần đổi bác sĩ"} as Record<string,string>)[reason] ?? reason).join(" · ")}</p></FeedbackBanner>
      )}

      {overdueWarning && (
          <form action={receptionConfirmAppointmentAction}>
            <input type="hidden" name="appointmentId" value={appt.appointmentId} />
            {pendingDoctorId && <input type="hidden" name="doctorId" value={pendingDoctorId} />}
            <input type="hidden" name="acknowledgeOverdueWarning" value="true" />
            <FormSubmit hideTrigger confirmation={{ title: "Xác nhận lịch đã quá giờ", message: warningMsg, warning: true, openInitially: true }} className="public-warning gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Tiếp tục xác nhận</span>
            </FormSubmit>
          </form>
      )}

      {earlyWarning && (
          <form action={receptionCompleteAppointmentAction}>
            <input type="hidden" name="appointmentId" value={appt.appointmentId} />
            <input type="hidden" name="acknowledgeEarlyWarning" value="true" />
            <FormSubmit hideTrigger confirmation={{ title: "Chưa đến giờ hẹn", message: warningMsg, warning: true, openInitially: true }} className="public-warning gap-2">
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Hoàn tất buổi khám</span>
            </FormSubmit>
          </form>
      )}

      <AppointmentSummaryPanel
        appointmentId={appt.appointmentId}
        status={appt.status}
        serviceName={appt.serviceName}
        serviceDurationMinutes={appt.serviceDurationMinutes}
        doctorName={appt.doctorName}
        slotLabel={appt.slotLabel}
        patientName={appt.patientName}
        patientPhone={appt.patientPhone}
        patientBirthDate={appt.patientBirthDate}
        extraBadges={
          appt.needsCoordination ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
              Cần điều phối
            </span>
          ) : null
        }
      />

      <ReceptionActionWorkbench
        key={`${reschedServiceId}:${reschedDate}:${reschedDoctorId ?? "unassigned"}:${query.action ?? ""}:${query.suggestedStart ?? ""}:${earlyWarning}:${overdueWarning}:${error}`}
        initialAction={error || earlyWarning || overdueWarning ? null : query.reschedDate || query.action === "RESCHEDULE" ? "RESCHEDULE" : query.action === "CANCEL" ? "CANCEL" : null}
        appointmentId={appt.appointmentId}
        status={appt.status}
        summary={<dl className="booking-confirmation"><div><dt>Người khám bệnh</dt><dd>{appt.patientName}</dd></div><div><dt>Dịch vụ khám</dt><dd>{appt.serviceName}</dd></div><div><dt>Giờ hẹn</dt><dd>{appt.slotLabel}</dd></div></dl>}
        serviceName={appt.serviceName}
        doctorId={appt.doctorId}
        eligibleDoctors={eligibleDoctors}
        confirmDoctors={confirmDoctors}
        reschedDate={reschedDate}
        minDateIso={minDateIso}
        reschedDoctorId={reschedDoctorId}
        reschedSlots={reschedSlots}
        services={services}
        currentServiceId={appt.serviceId}
        reschedServiceId={reschedServiceId}
        canChangeService={new Date(appt.startAtIso)>now}
        suggestedStart={query.suggestedStart}
        confirmAction={receptionConfirmAppointmentAction}
        completeAction={receptionCompleteAppointmentAction}
        cancelAction={receptionCancelAppointmentAction}
        rescheduleAction={receptionRescheduleAppointmentAction}
      />

    </div>
  );
}
