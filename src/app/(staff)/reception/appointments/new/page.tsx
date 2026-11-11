import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import { singleSearchParams } from "@/lib/pagination";
import Link from "next/link";
import { addDays } from "date-fns";
import { BOOKING_HORIZON_DAYS } from "@/config/business";
import { formatDateOnlyDisplay, formatClinicIsoDate, isValidIsoDate } from "@/lib/dates";
import { isDomainError } from "@/lib/errors";
import { findPatientByPhone, getReceptionPatientDetail } from "@/modules/patients/server";
import { getAvailableSlots, listEligibleDoctors } from "@/modules/scheduling/availability";
import { listBookableServices } from "@/modules/scheduling/services";
import { EmptyStatePanel, FeedbackBanner } from "@/components/feedback";
import { FormSubmit } from "@/components/form-submit.client";
import { PatientFields } from "@/app/(staff)/reception/patient-fields";
import { SlotFilters } from "./slot-filters.client";
import { receptionCreateConfirmedAppointmentAction, receptionCreatePendingAppointmentAction, receptionCreatePatientAction } from "@/app/(staff)/reception/actions";

export const dynamic = "force-dynamic";

export default async function ReceptionNewAppointmentPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const now = new Date();
  const minDate = formatClinicIsoDate(now);
  const maxDate = formatClinicIsoDate(addDays(now, BOOKING_HORIZON_DAYS));
  const phone = await readPrivateSearch("/reception/appointments/new");
  const patientId = Number(params.patientId);
  let patient = null;
  let normalizedPhone = phone;
  let lookupFailed = false;
  let error = params.error ?? "";
  try {
    if (Number.isSafeInteger(patientId) && patientId > 0) patient = await getReceptionPatientDetail(patientId);
    else if (phone) {
      const result = await findPatientByPhone({ phone });
      patient = result.patient;
      normalizedPhone = result.normalizedPhone;
    }
  } catch (cause) {
    if (!isDomainError(cause)) throw cause;
    lookupFailed = true;
    error = cause.message;
  }
  const readyPatient = patient?.hasPatientRole && patient.birthDate ? patient : null;
  const services = await listBookableServices();
  const service = services.find(item => item.serviceId === Number(params.serviceId)) ?? services[0];
  const doctors = service && readyPatient ? await listEligibleDoctors({ serviceId: service.serviceId, excludePatientUserId: readyPatient.userId }) : [];
  const unassigned = params.doctorId === "unassigned";
  const doctorId = unassigned ? null : doctors.find(item => item.doctorId === Number(params.doctorId))?.doctorId ?? null;
  const date = params.date && isValidIsoDate(params.date) ? params.date : minDate;
  const slots = service && readyPatient ? await getAvailableSlots({
    serviceId: service.serviceId, date, doctorId, patientId: readyPatient.userId,
  }, doctors) : [];
  const control = "mt-2 min-h-11 w-full min-w-0 border border-slate-400 bg-white px-3 text-base tabular-nums";
  return (
    <div className="max-w-5xl space-y-7" >
      <header className="space-y-3">
        <Link href="/reception/appointments" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Quay lại hàng đợi</Link>
        <h1 className="text-2xl font-semibold">Đặt lịch khám tại quầy</h1>
      </header>
      {params.createdPatient === "1" && <FeedbackBanner dialog variant="success" title="Đã lưu hồ sơ người khám bệnh" message="Tiếp tục chọn dịch vụ và giờ khám." />}
      {error && <FeedbackBanner dialog variant="error" title="Chưa thể hoàn tất thao tác" message={error} />}
      <div className="space-y-8 bg-white px-4 py-6 sm:px-7">
        <section aria-labelledby="reception-patient-heading" className="space-y-5">
          <h2 id="reception-patient-heading" className="public-section-title text-xl">Người khám bệnh</h2>
          <form action={submitPrivateSearch.bind(null, "/reception/appointments/new")} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="lookup-phone" className="text-sm font-medium">Số điện thoại</label>
              <input id="lookup-phone" name="lookupPhone" type="tel" required autoComplete="tel" defaultValue={phone || patient?.phone || ""} className={control} />
            </div>
            <button type="submit" className="public-primary">Tìm người khám bệnh</button>
          </form>
          {readyPatient ? (
            <div className="flex flex-wrap items-start justify-between gap-4 border-y border-slate-200 py-4 text-sm">
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
                <div><dt className="text-slate-600">Người khám bệnh</dt><dd className="mt-1 font-semibold">{readyPatient.fullName}</dd></div>
                <div><dt className="text-slate-600">Số điện thoại</dt><dd className="mt-1 tabular-nums">{readyPatient.phone}</dd></div>
                <div><dt className="text-slate-600">Ngày sinh</dt><dd className="mt-1 tabular-nums">{readyPatient.birthDate?.split("-").reverse().join("/")}</dd></div>
              </dl>
              <Link href={`/reception/patients/${readyPatient.userId}`} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Xem hồ sơ</Link>
            </div>
          ) : !lookupFailed && (phone || patient) ? (
            <section className="space-y-4 border-t border-slate-200 pt-5">
              <h3 className="text-lg font-semibold">{patient ? "Bổ sung thông tin để đặt lịch" : "Tạo hồ sơ người khám bệnh"}</h3>
              <p className="text-sm text-slate-700">{patient ? "Đã có hồ sơ với số điện thoại này. Bổ sung thông tin còn thiếu để tiếp tục đặt lịch." : `Chưa tìm thấy hồ sơ cho số ${normalizedPhone}. Nhập thông tin để tiếp tục.`}</p>
              <form action={receptionCreatePatientAction} className="space-y-4">
                <input type="hidden" name="returnTo" value="booking" />
                <PatientFields prefix="quick-patient" values={patient ?? { phone: normalizedPhone }} />
                <FormSubmit className="public-primary">Lưu hồ sơ và tiếp tục</FormSubmit>
              </form>
            </section>
          ) : null}
        </section>
        {readyPatient && (!services.length ? <EmptyStatePanel title="Chưa có dịch vụ nhận lịch" description="Kiểm tra dịch vụ với Quản lý phòng khám trước khi đặt lịch." /> : (
          <section aria-labelledby="reception-schedule-heading" className="space-y-6 border-t border-slate-200 pt-7">
            <h2 id="reception-schedule-heading" className="public-section-title text-xl">Dịch vụ và thời gian khám</h2>
            <SlotFilters key={`${readyPatient.userId}:${service?.serviceId}:${doctorId}:${date}`} results={<>

            <p className="text-sm leading-6 text-slate-700">{service?.name} · Thời lượng thăm khám dự kiến: <strong className="tabular-nums text-teal-900">{service?.durationMinutes} phút</strong></p>
            {!slots.length ? <EmptyStatePanel title="Không còn giờ khám phù hợp" description="Chọn bác sĩ hoặc ngày khám khác." /> : (
              <form action={doctorId ? receptionCreateConfirmedAppointmentAction : receptionCreatePendingAppointmentAction} className="space-y-5 border-t border-slate-200 pt-5">
                <input type="hidden" name="patientId" value={readyPatient.userId} />
                <input type="hidden" name="serviceId" value={service?.serviceId ?? ""} />
                <input type="hidden" name="doctorId" value={doctorId ?? ""} />
                <input type="hidden" name="date" value={date} />
                {[{ label: "Buổi sáng", afternoon: false }, { label: "Buổi chiều", afternoon: true }].map(group => {
                  const items = slots.filter(slot => (Number(slot.startTimeLabel.slice(0, 2)) >= 12) === group.afternoon);
                  return !!items.length && <fieldset key={group.label}>
                    <legend className="mb-3 font-semibold">{group.label}</legend>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {items.map(slot => <label key={slot.startAtIso} className="flex min-h-11 cursor-pointer items-center gap-2 border border-slate-300 px-3 py-2 text-sm tabular-nums focus-within:outline-2 focus-within:outline-[#0D8A7C] has-[:checked]:border-[#0D8A7C] has-[:checked]:bg-[#E8F4F6]">
                        <input type="radio" name="startAtIso" disabled={Boolean(slot.patientConflicts?.length)} value={slot.startAtIso} required className="h-4 w-4 shrink-0 accent-[#0D8A7C]" />
                        <span className="min-w-0"><span className="block whitespace-nowrap">{slot.startTimeLabel}–{slot.endTimeLabel}</span>
                        {Boolean(slot.patientConflicts?.length) && <span className="block text-xs leading-5 text-slate-600">Trùng lịch: {slot.patientConflicts?.map(item => `VC-${String(item.appointmentId).padStart(6,"0")} (${item.startTimeLabel}–${item.endTimeLabel})`).join(", ")}</span>}
                        </span>
                      </label>)}
                    </div>
                  </fieldset>;
                })}
                <p className="text-sm leading-relaxed text-slate-700">{doctorId ? "Lịch hẹn được xác nhận trực tiếp với bác sĩ đã chọn." : "Yêu cầu được lưu chờ xác nhận. Lễ tân phân công bác sĩ sau."}</p>
                <FormSubmit confirmation={{ title: doctorId ? "Xác nhận lịch hẹn tại quầy" : "Gửi yêu cầu chờ phân công", selectedTimeField: "startAtIso", message: doctorId ? "Xác nhận đặt lịch với bác sĩ đã chọn?" : "Gửi yêu cầu đặt lịch chờ phân công bác sĩ?", details: <dl className="booking-confirmation">
                  <div><dt>Người khám</dt><dd>{readyPatient.fullName}<small>{readyPatient.phone}</small></dd></div>
                  <div><dt>Dịch vụ</dt><dd>{service?.name}</dd></div>
                  <div><dt>Bác sĩ</dt><dd>{doctors.find(item => item.doctorId === doctorId)?.fullName ?? "Phân công sau"}</dd></div>
                  <div><dt>Ngày khám</dt><dd className="tabular-nums">{formatDateOnlyDisplay(date)}</dd></div>
                </dl> }} className="public-primary">{doctorId ? "Xác nhận lịch hẹn tại quầy" : "Gửi yêu cầu chờ phân công"}</FormSubmit>
              </form>
            )}
            </>}>

              <input type="hidden" name="patientId" value={readyPatient.userId} />
                <div><label htmlFor="rec-new-service" className="text-sm font-medium">Dịch vụ khám</label>
                  <select id="rec-new-service" name="serviceId" defaultValue={service?.serviceId} className={control}>
                    {services.map(item => <option key={item.serviceId} value={item.serviceId}>{item.name}</option>)}
                  </select>
                </div>
                <div><label htmlFor="rec-new-doctor" className="text-sm font-medium">Bác sĩ phụ trách</label>
                  <select id="rec-new-doctor" name="doctorId" defaultValue={doctorId ?? "unassigned"} className={control}>
                    <option value="unassigned">Lễ tân phân công sau</option>
                    {doctors.map(item => <option key={item.doctorId} value={item.doctorId}>{item.fullName}</option>)}
                  </select>
                </div>
                <div><label htmlFor="rec-new-date" className="text-sm font-medium">Ngày khám</label>
                  <input id="rec-new-date" name="date" type="date" min={minDate} max={maxDate} required defaultValue={date} className={control} />
                </div>
            </SlotFilters>
          </section>
        ))}
      </div>
    </div>
  );
}
