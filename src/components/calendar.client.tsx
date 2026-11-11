"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import type { EventSourceFunc } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import viLocale from "@fullcalendar/core/locales/vi";
import type { CalendarEventDto } from "@/modules/appointments/contracts";
import { SLOT_GRID_MINUTES, type AppointmentStatus } from "@/config/business";
import { AppointmentStatusBadge } from "@/components/status";
import { Dialog, DialogContent, DialogFooter } from "@/components/dialog.client";
import { formatClinicDateTime } from "@/lib/dates";

export interface FullCalendarWrapperProps {
  initialDate?: string;
  initialSpan?: 3 | 7;
  role?: "PATIENT" | "RECEPTIONIST" | "DOCTOR" | "CLINIC_MANAGER";
  appointmentHrefPrefix?: "/patient/appointments" | "/reception/appointments" | "/doctor/appointments";
  filters?: { doctorId?: number | null; serviceId?: number | null; query?: string; status?: AppointmentStatus | "ALL"; };
}

const EVENT_COLORS = {
  SHIFT: ["#F0F9FF", "#0369A1"],
  UNAVAILABILITY: ["#FFF1F2", "#9F1239"],
  PENDING: ["#EAF1FB", "#234C7B"],
  CONFIRMED: ["#E8F4F6", "#08584F"],
  COMPLETED: ["#F1F5F9", "#334155"],
  CANCELLED: ["#F1F5F9", "#475569"],
};

export function FullCalendarWrapper({ role, initialDate, initialSpan, appointmentHrefPrefix, filters }: FullCalendarWrapperProps) {
  const router = useRouter();
  const calendar = useRef<FullCalendar>(null);
  const request = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const [kind, setKind] = useState<"APPOINTMENT" | "WORK">("APPOINTMENT");
  const [selected, setSelected] = useState<CalendarEventDto | null>(null);
  const [result, setResult] = useState({ loading: true, error: "", count: 0 });
  const span = initialSpan ?? (role === "DOCTOR" ? 7 : 3);
  const { doctorId, serviceId, query, status } = filters ?? {};
  const overview = role !== "PATIENT" && role !== "DOCTOR" && !doctorId;
  useEffect(() => {
    if (!initialSpan && window.matchMedia("(max-width: 639px)").matches) calendar.current?.getApi().changeView("clinicDay");
  }, [initialSpan]);
  useEffect(() => () => { requestId.current++; request.current?.abort(); }, []);
  const loadEvents = useCallback<EventSourceFunc>((range, success, failure) => {
    void (async () => {
    const id = ++requestId.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setResult(previous => ({ ...previous, loading: true, error: "" }));
    const toDate = new Date(Date.parse(range.endStr.slice(0, 10) + "T00:00:00Z") - 86_400_000).toISOString().slice(0, 10);
    const params = new URLSearchParams({ fromDate: range.startStr.slice(0, 10), toDate });
    if (doctorId) params.set("doctorId", String(doctorId));
    if (serviceId) params.set("serviceId", String(serviceId));
    if (query) params.set("query", query);
    if (status && status !== "ALL") params.set("status", status);
    try {
      const response = await fetch("/api/ui/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(params)), signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("calendar");
      const data = await response.json() as { events: CalendarEventDto[]; };
      if (id !== requestId.current) return;
      const visible = data.events.filter(event => kind === "APPOINTMENT" ? event.kind === "APPOINTMENT" : event.kind !== "APPOINTMENT");
      success(visible.map(event => {
        const key = event.kind === "APPOINTMENT" ? event.status ?? "PENDING" : event.kind;
        const [backgroundColor, color] = EVENT_COLORS[key];
        return {
          id: `${event.kind}-${event.appointmentId ?? event.shiftId ?? event.unavailabilityId}-${event.startAtIso}`,
          title: event.title,
          start: formatClinicDateTime(new Date(event.startAtIso), "yyyy-MM-dd'T'HH:mm:ss"),
          end: formatClinicDateTime(new Date(event.endAtIso), "yyyy-MM-dd'T'HH:mm:ss"),
          backgroundColor, borderColor: color, textColor: color, extendedProps: { ...event, priority: event.kind === "APPOINTMENT" ? 0 : event.kind === "UNAVAILABILITY" ? 1 : 2 },
        };
      }));
      setResult({ loading: false, error: "", count: visible.length });
    } catch (error) {
      if (id !== requestId.current) return;
      failure(error instanceof Error ? error : new Error("calendar"));
      calendar.current?.getApi().removeAllEvents();
      setResult({ loading: false, error: "Chưa tải được lịch. Vui lòng thử lại.", count: 0 });
    }
    })();
  }, [doctorId, serviceId, query, status, kind]);
  return (
    <div className="clinic-calendar min-w-0 space-y-4">
      {role !== "PATIENT" && <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Loại lịch">{[{key:"APPOINTMENT",label:"Lịch khám"},{key:"WORK",label:"Ca làm việc và lịch bận"}].map(item => <button key={item.key} type="button" aria-pressed={kind===item.key} onClick={() => {setSelected(null);setKind(item.key as "APPOINTMENT" | "WORK");}} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${kind===item.key ? "bg-teal-700 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}>{item.label}</button>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>{!result.loading && !result.error && <><span className="tabular-nums">{result.count}</span> {role === "PATIENT" ? "lịch hẹn" : "mục"} trong khoảng đang xem</>}</p>
        <button type="button" disabled={result.loading} onClick={() => calendar.current?.getApi().refetchEvents()} className="public-secondary">Tải lại lịch</button>
      </div>
      {result.loading && <p role="status" className="text-sm text-slate-700">Đang tải lịch…</p>}
      {result.error && <p role="alert" className="text-sm text-rose-800">{result.error}</p>}
      {!result.loading && !result.error && !result.count && <p role="status" className="text-sm text-slate-700">Không có lịch trong khoảng đang xem.</p>}
      <div className="min-w-0 bg-white py-4" aria-busy={result.loading}>
        <FullCalendar ref={calendar} plugins={[dayGridPlugin, timeGridPlugin]} initialView={role === "PATIENT" ? "dayGridMonth" : "clinicRange"}
          initialDate={initialDate}
          views={{ clinicRange: { type: overview ? "dayGrid" : "timeGrid", duration: { days: span }, dateAlignment: "day", buttonText: `${span} ngày` }, clinicDay: { type: overview ? "dayGrid" : "timeGrid", duration: { days: 1 }, buttonText: "Ngày" } }}
          timeZone="UTC" now={() => formatClinicDateTime(new Date(), "yyyy-MM-dd'T'HH:mm:ss")} locale={viLocale}
          buttonText={{ today: "Hôm nay", month: "Tháng", week: "Tuần", day: "Ngày" }}
          headerToolbar={{ left: "prev,next today", center: "title", right: role === "PATIENT" ? "dayGridMonth,timeGridWeek,clinicDay" : "dayGridMonth,clinicRange,clinicDay" }}
          dayMaxEvents={5} eventDisplay="block" eventOrder="start,-duration,title" eventOrderStrict={false}
          slotMinTime="07:00:00" slotMaxTime="18:30:00" allDaySlot={false} slotDuration={{ minutes: SLOT_GRID_MINUTES }} slotLabelInterval="01:00:00" eventMinHeight={20} slotEventOverlap={false}
          events={loadEvents} eventInteractive eventClick={info => { if (!result.loading && !result.error) setSelected(info.event.extendedProps as CalendarEventDto); }}
          eventContent={arg => {
            const event = arg.event.extendedProps as CalendarEventDto;
            if (arg.view.type === "dayGridMonth" || overview) return <div className="min-w-0 truncate whitespace-nowrap p-1 text-sm tabular-nums" title={`${event.slotLabel} · ${event.title}`}>{formatClinicDateTime(new Date(event.startAtIso), "HH:mm")} {event.title}</div>;
            return <div className="min-w-0 overflow-hidden p-1 text-sm" title={`${event.slotLabel} · ${event.title}`}>
              <p className="truncate font-medium">{event.title}</p>
            </div>;
          }} height={role === "PATIENT" ? 650 : "auto"} />
      </div>
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent aria-labelledby="calendar-event-title" aria-describedby="calendar-event-time">
          {selected && <>
            <h2 id="calendar-event-title" className="pr-8 text-xl font-semibold">{selected.title}</h2>
            {selected.status && <AppointmentStatusBadge status={selected.status} />}
            <p id="calendar-event-time" className="text-sm tabular-nums">{selected.slotLabel}</p>
            <dl className="space-y-4 border-y border-slate-200 py-4 text-sm">
              {[{ label: "Bác sĩ", value: selected.doctorName }, { label: "Dịch vụ", value: selected.serviceName }, { label: "Thông tin", value: selected.subtitle === selected.doctorName || selected.subtitle === selected.serviceName ? null : selected.subtitle }].filter(item => item.value && item.value !== selected.title).map(item => <div key={item.label}>
                <dt className="text-slate-600">{item.label}</dt><dd className="mt-1 break-words font-medium">{item.value}</dd>
              </div>)}
            </dl>
            <DialogFooter>
              <button type="button" className="public-secondary" onClick={() => setSelected(null)}>Đóng</button>
              {selected.kind === "APPOINTMENT" && selected.appointmentId && appointmentHrefPrefix && <button type="button" className="public-primary"
                onClick={() => { setSelected(null); router.push(`${appointmentHrefPrefix}/${selected.appointmentId}`); }}>Xem chi tiết lịch hẹn</button>}
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
