"use client";

import { formatDateOnlyDisplay } from "@/lib/dates";

import { BookingTimePicker } from "@/components/booking-time-picker.client";
import { useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/dialog.client";
import type { EligibleDoctorDto, AvailableSlotDto, ServiceDto } from "@/modules/scheduling/contracts";
import { FormSubmit } from "@/components/form-submit.client";
import { suggestNearestAppointment } from "@/app/(staff)/reception/actions";
import { useRouter } from "next/navigation";
import { PdfDownloadButton } from "@/components/pdf-download.client";

type Action = "PRIMARY" | "RESCHEDULE" | "CANCEL";
type FormAction = (data: FormData) => Promise<void> | void;

export function ReceptionActionWorkbench({ initialAction, appointmentId, status, serviceName,
  doctorId, summary, eligibleDoctors, confirmDoctors, reschedDate, minDateIso, reschedDoctorId,
  reschedSlots, suggestedStart, services, currentServiceId, reschedServiceId, canChangeService, confirmAction, completeAction, cancelAction, rescheduleAction,
}: {
  initialAction: Action | null;
  summary: ReactNode;
  appointmentId: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  serviceName: string;
  doctorId: number | null;
  eligibleDoctors: EligibleDoctorDto[];
  confirmDoctors: EligibleDoctorDto[];
  reschedDate: string;
  minDateIso: string;
  reschedDoctorId: number | null;
  reschedSlots: AvailableSlotDto[];
  services: ServiceDto[];
  currentServiceId: number;
  reschedServiceId: number;
  canChangeService: boolean;
  suggestedStart?: string;
  confirmAction: FormAction;
  completeAction: FormAction;
  cancelAction: FormAction;
  rescheduleAction: FormAction;
}) {
  const [action, setAction] = useState(initialAction);
  const [reviewing, setReviewing] = useState(false);
  const [selectedStart, setSelectedStart] = useState(suggestedStart ?? "");
  const suggestedSlot = reschedSlots.find(slot => slot.startAtIso === suggestedStart);
  const suggestedPeriod = suggestedSlot ? (suggestedSlot.startTimeLabel < "12:00" ? "morning" : "afternoon") : null;
  const [period, setPeriod] = useState<"morning" | "afternoon" | null>(suggestedPeriod);
  const [selectionChanged, setSelectionChanged] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [chosenService, setChosenService] = useState(reschedServiceId);
  const suggestionRequest = useRef(0);
  const router = useRouter();
  const selectedSlot = reschedSlots.find(slot => slot.startAtIso === selectedStart);
  const selectedService = services.find(service => service.serviceId === reschedServiceId);

  function changeAction(next: Action | null) {
    suggestionRequest.current++;
    setSuggesting(false);
    setAction(next);
    setReviewing(false);
    setSelectionChanged(false);
    setChosenService(reschedServiceId);
    setSelectedStart(suggestedStart ?? "");
    setPeriod(suggestedPeriod);
    setSuggestionError("");
  }
  const pdfButton = <PdfDownloadButton href={`/api/ui/receipt?id=${appointmentId}`} />;
  if (status !== "PENDING" && status !== "CONFIRMED") return <div className="flex justify-end">{pdfButton}</div>;
  const primary = status === "PENDING" ? "Xác nhận lịch hẹn" : "Hoàn tất lịch hẹn";
  const title = action === "PRIMARY" ? primary : action === "RESCHEDULE" ? "Đổi lịch hẹn" : "Hủy lịch hẹn";
  const control = "public-control mt-2 tabular-nums";
  return (
    <section className="space-y-6 border-t border-slate-200 py-6">
      <div className="flex flex-wrap items-center justify-end gap-3" aria-label="Thao tác lịch hẹn">
        <button type="button" onClick={() => changeAction("RESCHEDULE")} className="public-warning">Điều chỉnh lịch hẹn</button>
        <button type="button" onClick={() => changeAction("CANCEL")} className="public-danger">Hủy lịch hẹn</button>
        {pdfButton}
        <button type="button" onClick={() => changeAction("PRIMARY")} className="public-primary">{primary}</button>
      </div>
      <Dialog open={action !== null} onOpenChange={open => { if (!open) changeAction(null); }}>
        <DialogContent aria-label={title} className="max-w-3xl">
        <h2 className="pr-10 text-xl font-semibold">{title}</h2>
        {summary}
      {action === "PRIMARY" && (status === "PENDING" ? (
        <form action={confirmAction} className="max-w-xl space-y-5">
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <label className="block text-sm font-medium">Bác sĩ phụ trách · {serviceName}
            <select name="doctorId" required defaultValue={confirmDoctors.some(doctor => doctor.doctorId === doctorId) ? doctorId! : ""} className={control}>
              <option value="" disabled>Chọn bác sĩ</option>
              {confirmDoctors.map(doctor => <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.fullName}</option>)}
            </select>
          </label>
          {confirmDoctors.length ? <FormSubmit className="public-primary">Xác nhận lịch hẹn</FormSubmit> : <div className="space-y-3"><p className="text-sm text-slate-700">Không có bác sĩ phù hợp vào giờ hẹn này.</p><button type="button" onClick={() => changeAction("RESCHEDULE")} className="public-text-link min-h-11">Chọn giờ khám khác</button></div>}
        </form>
      ) : (
        <form action={completeAction} className="max-w-xl space-y-5">
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <p className="text-sm text-slate-700">Ghi nhận buổi khám đã hoàn tất.</p>
          <FormSubmit className="public-primary">Xác nhận hoàn tất</FormSubmit>
        </form>
      ))}
      {action === "RESCHEDULE" && <div className="space-y-6">
        <div hidden={reviewing} className="rounded-md bg-slate-50 p-4"><button type="button" disabled={suggesting} className="public-secondary" onClick={async () => { const request = ++suggestionRequest.current; setSuggesting(true); setSuggestionError(""); try { const result = await suggestNearestAppointment(appointmentId, chosenService); if (request !== suggestionRequest.current) return; if (result.href) router.replace(result.href); else setSuggestionError(result.error ?? "Chưa tìm được lịch phù hợp."); } catch { if (request === suggestionRequest.current) setSuggestionError("Không tìm được lịch. Vui lòng thử lại."); } finally { if (request === suggestionRequest.current) setSuggesting(false); } }}>Gợi ý lịch gần nhất</button>{suggesting && <p role="status" className="mt-2 text-sm text-slate-600">Đang tìm giờ phù hợp…</p>}<p className="mt-2 text-sm text-slate-600">Ưu tiên giờ sớm nhất, sau đó chọn bác sĩ có ít lịch hơn trong ngày. Kiểm tra và xác nhận trước khi lưu.</p>{suggestionError && <p role="alert" className="mt-2 text-sm text-rose-800">{suggestionError}</p>}</div>
        <form hidden={reviewing} method="GET" action={`/reception/appointments/${appointmentId}`} onChange={() => setSelectionChanged(true)} className={reviewing ? "hidden" : "grid max-w-3xl items-end gap-4 sm:grid-cols-3"}>
          <input type="hidden" name="action" value="RESCHEDULE" />
          <label className="text-sm font-medium sm:col-span-3">Dịch vụ khám<select name="reschedServiceId" value={chosenService} disabled={!canChangeService} className={control} onChange={event=>{setChosenService(Number(event.target.value));const doctor=event.currentTarget.form?.elements.namedItem("reschedDoctorId");if(doctor instanceof HTMLSelectElement) doctor.value="";}}>{services.map(service=><option key={service.serviceId} value={service.serviceId}>{service.name}</option>)}</select>{!canChangeService && <span className="mt-2 block text-sm text-slate-600">Đã đến giờ khám, không thể đổi dịch vụ.</span>}</label>
          {!canChangeService && <input type="hidden" name="reschedServiceId" value={currentServiceId} />}
          <label className="text-sm font-medium">Ngày mới
            <input name="reschedDate" type="date" min={minDateIso} required defaultValue={reschedDate} className={control} />
          </label>
          <label className="text-sm font-medium">Bác sĩ
            <select name="reschedDoctorId" defaultValue={reschedDoctorId ?? ""} className={control}>
              <option value="">{status === "PENDING" ? "Cần phân công" : "Chọn bác sĩ phù hợp"}</option>
              {eligibleDoctors.map(doctor => <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.fullName}</option>)}
            </select>
          </label>
          <button type="submit" className="public-secondary">Tìm giờ trống</button>
        </form>
        {selectionChanged ? <p role="status" className="rounded-md bg-slate-100 p-4 text-sm">Bấm “Tìm giờ trống” để cập nhật giờ khám theo lựa chọn mới.</p> : !reschedSlots.length ? <p className="border-y border-slate-200 py-5 text-sm text-slate-700">Không có giờ trống phù hợp. Chọn ngày hoặc bác sĩ khác rồi tìm lại.</p> : (
          <form action={rescheduleAction} onSubmit={event => { if (!reviewing) { event.preventDefault(); setReviewing(true); } }} className="max-w-3xl space-y-5">
            {status === "CONFIRMED" && !reschedDoctorId && <p role="alert" className="text-sm text-rose-800">Lịch đã xác nhận cần bác sĩ phụ trách. Chọn bác sĩ rồi tìm giờ trống, hoặc dùng gợi ý lịch gần nhất.</p>}
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <input type="hidden" name="doctorId" value={reschedDoctorId ?? ""} />
            <input type="hidden" name="serviceId" value={reschedServiceId} />
            <input type="hidden" name="reschedDate" value={reschedDate} />
            <div hidden={reviewing}><BookingTimePicker slots={reschedSlots} period={period} onPeriodChange={setPeriod} value={selectedStart} onChange={setSelectedStart} blockConflicts /></div>
            {reviewing && <section aria-label="Kiểm tra thay đổi" className="space-y-4">
              <h3 className="font-semibold">Kiểm tra thông tin mới</h3>
              <dl className="booking-confirmation">
                <div><dt>Dịch vụ</dt><dd>{selectedService?.name ?? serviceName}</dd></div>
                <div><dt>Thời lượng dự kiến</dt><dd>{selectedService?.durationMinutes} phút</dd></div>
                <div><dt>Bác sĩ</dt><dd>{eligibleDoctors.find(doctor => doctor.doctorId === reschedDoctorId)?.fullName ?? "Cần phân công"}</dd></div>
                <div><dt>Ngày khám</dt><dd>{formatDateOnlyDisplay(reschedDate)}</dd></div>
                <div><dt>Giờ khám</dt><dd>{selectedSlot?.startTimeLabel}–{selectedSlot?.endTimeLabel}</dd></div>
              </dl>
            </section>}
            <div className="flex flex-wrap justify-end gap-3">
              {reviewing && <button type="button" className="public-secondary" onClick={() => setReviewing(false)}>Chỉnh sửa lại</button>}
              <FormSubmit disabled={!selectedSlot || Boolean(selectedSlot.patientConflicts?.length) || (status === "CONFIRMED" && !reschedDoctorId)} className={reviewing ? "public-warning" : "public-primary"}>
                {reviewing ? "Xác nhận thay đổi" : "Kiểm tra thay đổi"}
              </FormSubmit>
            </div>
          </form>
        )}
      </div>}
      {action === "CANCEL" && <form action={cancelAction} className="max-w-xl space-y-5">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <p className="text-sm font-medium leading-relaxed text-rose-800">Lịch hẹn sẽ bị hủy và không thể khôi phục.</p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={() => changeAction(null)} className="public-secondary">Giữ lịch hẹn</button>
          <FormSubmit destructive className="public-danger">Xác nhận hủy lịch</FormSubmit>
        </div>
      </form>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
