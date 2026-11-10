import { singleSearchParams, parsePositiveId } from "@/lib/pagination";
import { isValidIsoDate, formatClinicIsoDate, formatDayMonthShort, formatVietnameseWeekdayShort } from "@/lib/dates";
import { addDays } from "date-fns";
import { requirePatientPageSession } from "@/server/authorization";
import { redirect, notFound } from "next/navigation";
import { getPatientAppointmentById } from "@/modules/appointments/queries";
import { isDomainError } from "@/lib/errors";
import { BOOKING_HORIZON_DAYS } from "@/config/business";

import { getAvailableSlots, listEligibleDoctors } from "@/modules/scheduling/availability";
import { listBookableServices } from "@/modules/scheduling/services";
import { FeedbackBanner } from "@/components/feedback";
import { PatientBookingWorkbench, type QuickDateOption } from "@/app/patient/book/booking-form.client";

export const dynamic = "force-dynamic";

export default async function PatientBookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const session = await requirePatientPageSession("/patient/book");
  if (!session) return null;
  const now = new Date();
  const editingId = params.appointmentId ? parsePositiveId(params.appointmentId) : null;
  if (params.appointmentId && !editingId) notFound();
  let editing = null;
  try { editing = editingId ? await getPatientAppointmentById(editingId) : null; }
  catch (error) { if (isDomainError(error) && error.statusCode === 404) notFound(); throw error; }
  if (editing && (editing.status !== "PENDING" || new Date(editing.startAtIso) <= now)) redirect(`/patient/appointments/${editing.appointmentId}?changeBlocked=1`);
  const minDateIso = formatClinicIsoDate(now);
  const maxDateIso = formatClinicIsoDate(addDays(now, BOOKING_HORIZON_DAYS));

  const services = await listBookableServices();
  const selectedServiceId =
    Number(params.serviceId ?? editing?.serviceId ?? 0) || services[0]?.serviceId || 0;
  const selectedService =
    services.find((s) => s.serviceId === selectedServiceId) ?? services[0];

  const selectedDate =
    params.date && isValidIsoDate(params.date)
      ? params.date
      : editing ? formatClinicIsoDate(new Date(editing.startAtIso)) : minDateIso;

  const requestedDoctorId =
    params.doctorId !== undefined
      ? parsePositiveId(params.doctorId)
      : editing?.doctorId ?? null;

  const error = params.error ?? "";

  const quickDates: QuickDateOption[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i);
    const iso = formatClinicIsoDate(d);
    return {
      iso,
      weekdayShort: i === 0 ? "H.Nay" : formatVietnameseWeekdayShort(iso),
      dayMonth: formatDayMonthShort(iso),
    };
  });

  const eligibleDoctors = selectedService ? await listEligibleDoctors({
    serviceId: selectedService.serviceId, excludePatientUserId: session?.userId ?? null,
  }) : [];
  const selectedDoctorId = eligibleDoctors.some((doctor) => doctor.doctorId === requestedDoctorId)
    ? requestedDoctorId : null;
  const availableSlots = selectedService ? await getAvailableSlots({
    serviceId: selectedService.serviceId, date: selectedDate,
    doctorId: selectedDoctorId, patientId: session?.userId ?? null, enforceHorizon: true,
    excludeAppointmentId: editing?.appointmentId,
  }, eligibleDoctors) : [];

  return (
    <div className="space-y-6" >
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#0B2545] sm:text-3xl">
          {editing ? "Thay đổi lịch hẹn" : "Đặt lịch khám trực tuyến"}
        </h1>
        
      </div>

      {error && (
        <FeedbackBanner dialog
          variant="error"
          title="Không thể đặt lịch hẹn"
          message={error}

        />
      )}

      <PatientBookingWorkbench
        appointmentId={editing?.appointmentId}
        services={services}
        initialServiceId={selectedService?.serviceId ?? 0}
        initialDate={selectedDate}
        initialDoctorId={selectedDoctorId}
        minDateIso={minDateIso}
        maxDateIso={maxDateIso}
        quickDates={quickDates}
        initialDoctors={eligibleDoctors}
        initialSlots={availableSlots}
        patientName={session?.fullName ?? "Người khám bệnh"}
        patientPhone={session?.phone ?? ""}
      />
    </div>
  );
}
