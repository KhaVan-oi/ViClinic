"use client";

import { BookingTimePicker } from "@/components/booking-time-picker.client";
import Link from "next/link";
import { BOOKING_HORIZON_DAYS } from "@/config/business";
import { Dialog, DialogContent } from "@/components/dialog.client";
import { FormSubmit } from "@/components/form-submit.client";

import { useEffect, useRef, useState, useTransition } from "react";
import { type AvailableSlotDto, type EligibleDoctorDto, type ServiceDto } from "@/modules/scheduling/contracts";
import { formatDateOnlyDisplay, isValidIsoDate } from "@/lib/dates";
import { patientBookAppointmentAction, patientRescheduleAppointmentAction } from "@/app/patient/actions";

type AvailabilityState = { doctors: EligibleDoctorDto[]; } & (
  | { status: "ready"; slots: AvailableSlotDto[]; }
  | { status: "loading"; }
  | { status: "error"; message: string; }
);

export interface QuickDateOption {
  iso: string;
  weekdayShort: string;
  dayMonth: string;
}

export function PatientBookingWorkbench({
  appointmentId,
  services,
  initialServiceId,
  initialDate,
  initialDoctorId,
  minDateIso,
  maxDateIso,
  quickDates,
  initialDoctors,
  initialSlots,
  patientName,
  patientPhone,
}: {
  appointmentId?: number;
  services: ServiceDto[];
  initialServiceId: number;
  initialDate: string;
  initialDoctorId: number | null;
  minDateIso: string;
  maxDateIso: string;
  quickDates: QuickDateOption[];
  initialDoctors: EligibleDoctorDto[];
  initialSlots: AvailableSlotDto[];
  patientName: string;
  patientPhone: string;
}) {
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [date, setDate] = useState(initialDate);
  const [doctorChoice, setDoctorChoice] = useState<number | "choose" | null>(initialDoctorId);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "ready", doctors: initialDoctors, slots: initialSlots });
  const [selectedStartAtIso, setSelectedStartAtIso] = useState("");
  const [conflictOpen, setConflictOpen] = useState(false);
  const [period, setPeriod] = useState<"morning" | "afternoon" | null>(null);
  const doctorId = typeof doctorChoice === "number" ? doctorChoice : null;
  const chooseDoctor = doctorChoice !== null;
  const { doctors } = availability;
  const slots = availability.status === "ready" ? availability.slots : [];
  const loading = availability.status === "loading";
  const error = availability.status === "error" ? availability.message : null;
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { requestId.current++; request.current?.abort(); }, []);
  const service = services.find((item) => item.serviceId === serviceId);
  const selectedSlot = slots.find(
    (slot) => slot.startAtIso === selectedStartAtIso,
  );
  const needsDoctor = chooseDoctor && doctorId === null;
  const controlClass =
    "mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D8A7C]";

  async function refresh(next: {
    serviceId: number;
    date: string;
    doctorId: number | null;
  }) {
    const id = ++requestId.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setAvailability(previous => ({ status: "loading", doctors: previous.doctors }));
    setSelectedStartAtIso("");
    setPeriod(null);
    try {
      const response = await fetch("/api/ui/availability", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, enforceHorizon: true, excludeAppointmentId: appointmentId }),
      });
      if (!response.ok) throw new Error("availability");
      const data = (await response.json()) as {
        eligibleDoctors: EligibleDoctorDto[];
        slots: AvailableSlotDto[];
      };
      if (id !== requestId.current) return;
      setAvailability({ status: "ready", doctors: data.eligibleDoctors, slots: data.slots });
    } catch {
      if (id === requestId.current)
        setAvailability(previous => ({ status: "error", doctors: previous.doctors, message: "Không tải được giờ khám. Vui lòng thử lại." }));
    }
  }

  function changeDate(value: string) {
    if (
      !isValidIsoDate(value) ||
      value < minDateIso ||
      value > maxDateIso
    )
      return;
    setDate(value);
    void refresh({ serviceId, date: value, doctorId });
  }

  return (
    <div className="booking-sheet">
      <div className="space-y-8">
        <div className="booking-grid">
          <section
            aria-labelledby="booking-service-heading"
            className="booking-service-zone"
          >
            <h2
              id="booking-service-heading"
              className="text-xl font-semibold"
            >
              Dịch vụ và bác sĩ
            </h2>
            <div>
              <label htmlFor="book-service" className="text-sm font-semibold">
                Dịch vụ khám
              </label>
              <select
                id="book-service"

                value={serviceId}
                disabled={pending}
                className={controlClass}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setServiceId(value);
                  setDoctorChoice(chooseDoctor ? "choose" : null);
                  void refresh({ serviceId: value, date, doctorId: null });
                }}
              >
                {services.map((item) => (
                  <option key={item.serviceId} value={item.serviceId}>
                    {item.name}
                  </option>
                ))}
              </select>
              {service && <p className="mt-3 text-sm leading-6 text-slate-700 tabular-nums">Thời lượng thăm khám dự kiến: <strong className="text-teal-900">{service.durationMinutes} phút</strong></p>}
            </div>
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-semibold">
                Bạn muốn chọn bác sĩ như thế nào?
              </legend>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
                <input
                  type="radio"
                  name="doctorChoice"
                  checked={!chooseDoctor}
                  disabled={pending}
                  className="mt-1 h-4 w-4 accent-[#0D8A7C]"
                  onChange={() => {
                    setDoctorChoice(null);
                    void refresh({ serviceId, date, doctorId: null });
                  }}
                />
                <span>
                  Để phòng khám sắp xếp
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
                <input
                  type="radio"
                  name="doctorChoice"
                  checked={chooseDoctor}
                  disabled={pending}
                  className="mt-1 h-4 w-4 accent-[#0D8A7C]"
                  onChange={() => {
                    setDoctorChoice("choose");
                    setSelectedStartAtIso("");
                  }}
                />
                <span>Tôi đã biết bác sĩ muốn khám</span>
              </label>
            </fieldset>
            {chooseDoctor && (
              <div>
                <label htmlFor="book-doctor" className="text-sm font-semibold">
                  Chọn bác sĩ
                </label>
                <select
                  id="book-doctor"

                  value={doctorId ?? ""}
                  disabled={loading || pending}
                  className={controlClass}
                  onChange={(event) => {
                    const value = event.target.value
                      ? Number(event.target.value)
                      : null;
                    setDoctorChoice(value ?? "choose");
                    void refresh({ serviceId, date, doctorId: value });
                  }}
                >
                  <option value="" disabled hidden>Chọn bác sĩ</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.doctorId} value={doctor.doctorId}>
                      {doctor.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>
          <section
            aria-labelledby="booking-date-heading"
            className="booking-date-zone"
          >
            <h2
              id="booking-date-heading"
              className="text-xl font-semibold"
            >
              Ngày khám
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {quickDates.map((day) => (
                <button
                  key={day.iso}
                  type="button"
                  disabled={pending}
                  aria-pressed={day.iso === date}
                  onClick={() => changeDate(day.iso)}
                  className={`min-h-14 rounded-lg border px-1 py-2 tabular-nums ${day.iso === date ? "border-[#0D8A7C] bg-[#0A6E63] text-white" : "border-slate-200 hover:border-[#0D8A7C]"}`}
                >
                  <span className="block text-sm">{day.weekdayShort}</span>
                  <span className="block font-semibold">{day.dayMonth}</span>
                </button>
              ))}
            </div>
            <div className="max-w-xs">
              <label htmlFor="book-date" className="text-sm font-semibold">
                Ngày khác{" "}
                <span className="font-normal text-slate-600">
                  (trong {BOOKING_HORIZON_DAYS} ngày tới)
                </span>
              </label>
              <input
                id="book-date"

                type="date"
                min={minDateIso}
                max={maxDateIso}
                value={date}
                disabled={pending}
                onChange={(event) => changeDate(event.target.value)}
                className={`${controlClass} tabular-nums`}
              />
            </div>
          </section>
          <section
            aria-labelledby="booking-time-heading"
            aria-busy={loading}
            className="booking-time-zone"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="booking-time-heading"
                className="text-xl font-semibold"
              >
                Giờ khám
              </h2>
              <button
                type="button"

                disabled={loading || pending}
                onClick={() => void refresh({ serviceId, date, doctorId })}
                className="min-h-11 px-2 text-sm font-semibold text-[#0A6E63] disabled:opacity-50"
              >
                Tải lại giờ khám
              </button>
            </div>
            {loading ? (
              <p role="status" className="py-5 text-slate-600">
                Đang tìm giờ khám còn trống…
              </p>
            ) : error ? (
              <div
                role="alert"
                className="bg-[#e8f2f4] p-4"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void refresh({ serviceId, date, doctorId })}
                  className="mt-2 min-h-11 font-semibold underline"
                >
                  Thử lại
                </button>
              </div>
            ) : needsDoctor ? (
              <p className="py-5 text-slate-600">
                Chọn bác sĩ để xem giờ khám.
              </p>
            ) : slots.length === 0 ? (
              <div className="py-5">
                <p className="font-semibold">Chưa có giờ khám còn trống.</p>
                <p className="mt-2 text-sm text-slate-600">
                  Thử ngày khác hoặc để phòng khám sắp xếp bác sĩ.
                </p>
              </div>
            ) : (
              <form
                action={(form) =>
                  startTransition(async () => {
                    await (appointmentId ? patientRescheduleAppointmentAction : patientBookAppointmentAction)(form);
                  })
                }

                className="space-y-6"
              >
                <input type="hidden" name="serviceId" value={serviceId} />
                {appointmentId && <input type="hidden" name="appointmentId" value={appointmentId} />}
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="doctorId" value={doctorId ?? ""} />
                <BookingTimePicker slots={slots} period={period} onPeriodChange={setPeriod} value={selectedStartAtIso} disabled={pending} onChange={value => { setSelectedStartAtIso(value); setConflictOpen(Boolean(slots.find(slot => slot.startAtIso === value)?.patientConflicts?.length)); }} />
                {Boolean(selectedSlot?.patientConflicts?.length) && <p role="status" className="rounded-md bg-[#eef3f5] p-4 text-sm leading-6">Khung giờ này trùng lịch hẹn của bạn. Chọn giờ khác hoặc xem lại lịch đã đặt.</p>}
                <Dialog open={conflictOpen} onOpenChange={setConflictOpen}><DialogContent aria-label="Trùng lịch hẹn"><h2>Khung giờ này trùng lịch của bạn</h2><p className="text-sm leading-6">Bạn có lịch hẹn dưới đây. Hãy chọn giờ khác hoặc xem lại lịch đã đặt trước khi tiếp tục.</p><ul className="divide-y divide-slate-200">{selectedSlot?.patientConflicts?.map(item => <li key={item.appointmentId} className="space-y-2 py-3"><p className="font-semibold">{item.serviceName}</p><p className="text-sm tabular-nums">VC-{String(item.appointmentId).padStart(6,"0")} · {item.startTimeLabel}–{item.endTimeLabel}</p><Link href={`/patient/appointments/${item.appointmentId}`} className="public-secondary">Xem lịch hẹn</Link></li>)}</ul><div className="flex justify-end"><button type="button" className="public-primary" onClick={() => {setConflictOpen(false);setSelectedStartAtIso("");}}>Chọn giờ khác</button></div></DialogContent></Dialog>
                <div className="space-y-4 border-t border-slate-200 pt-5">
                  <p className="min-h-12 text-sm text-slate-600" aria-live="polite">
                    {selectedSlot
                      ? `Đã chọn ${selectedSlot.startTimeLabel}–${selectedSlot.endTimeLabel}. Phòng khám sẽ liên hệ để xác nhận lịch hẹn.`
                      : "Chọn giờ khám để tiếp tục."}
                  </p>
                  <FormSubmit confirmation={{ title: appointmentId ? "Xác nhận thay đổi lịch hẹn" : "Xác nhận yêu cầu đặt lịch", message: appointmentId ? "Thông tin mới sẽ thay thế lịch hẹn hiện tại. Phòng khám sẽ liên hệ để xác nhận." : "Hãy kiểm tra kỹ thông tin trước khi đặt lịch. Phòng khám sẽ liên hệ để xác nhận lịch hẹn.", warning:true, label: appointmentId ? "Xác nhận thay đổi" : "Xác nhận đặt lịch", details: selectedSlot && (
                    <dl className="booking-confirmation">
                      <div><dt>Người khám</dt><dd>{patientName}</dd></div><div><dt>Số điện thoại</dt><dd>{patientPhone}</dd></div>
                      <div><dt>Dịch vụ</dt><dd>{service?.name}</dd></div>
                      <div><dt>Bác sĩ</dt><dd>{doctorId ? doctors.find(item => item.doctorId === doctorId)?.fullName : "Phòng khám sắp xếp"}</dd></div>
                      <div><dt>Ngày khám</dt><dd className="tabular-nums">{formatDateOnlyDisplay(date)}</dd></div>
                      <div><dt>Giờ khám</dt><dd className="tabular-nums">{selectedSlot.startTimeLabel}–{selectedSlot.endTimeLabel}</dd></div>
                    </dl>
                  ) }}

                    disabled={!selectedSlot || Boolean(selectedSlot.patientConflicts?.length) || pending || loading}
                    className="min-h-12 w-full rounded-lg bg-[#0A6E63] px-5 text-base font-semibold text-white hover:bg-[#0A6E63] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 sm:w-auto"
                  >
                    {pending ? "Đang gửi yêu cầu…" : appointmentId ? "Lưu thay đổi" : "Gửi yêu cầu đặt lịch"}
                  </FormSubmit>
                </div>
              </form>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
