"use client";
import type { AvailableSlotDto } from "@/modules/scheduling/contracts";

export type BookingPeriod = "morning" | "afternoon" | null;

export function BookingTimePicker({ slots, period, onPeriodChange, value, onChange, disabled = false, blockConflicts = false }: {
  slots: AvailableSlotDto[];
  period: BookingPeriod;
  onPeriodChange: (period: BookingPeriod) => void;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  blockConflicts?: boolean;
}) {
  const groups = [
    { key: "morning", label: "Buổi sáng", slots: slots.filter(slot => slot.startTimeLabel < "12:00") },
    { key: "afternoon", label: "Buổi chiều", slots: slots.filter(slot => slot.startTimeLabel >= "12:00") },
  ] as const;
  const selected = groups.find(group => group.key === period);
  return <div className="space-y-4">
    <fieldset><legend className="mb-3 text-sm font-semibold">Chọn buổi khám</legend>
      <div className="grid grid-cols-2 gap-3">{groups.map(group =>
        <button key={group.key} type="button" disabled={disabled || !group.slots.length} aria-pressed={period === group.key} className={period === group.key ? "public-primary" : "public-secondary"} onClick={() => { onPeriodChange(group.key); onChange(""); }}>{group.label}</button>
      )}</div>
    </fieldset>
    {!selected ? <p className="text-sm text-slate-600">Chọn buổi để xem giờ khám còn trống.</p> :
      <fieldset><legend className="mb-3 text-sm font-semibold">{selected.label}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{selected.slots.map(slot =>
          <label key={slot.startAtIso} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums has-[:checked]:border-[#0D8A7C] has-[:checked]:bg-[#E8F4F6] focus-within:outline-2 focus-within:outline-[#0D8A7C] has-[:disabled]:opacity-60">
            <input type="radio" name="startAtIso" value={slot.startAtIso} required disabled={disabled || (blockConflicts && Boolean(slot.patientConflicts?.length))} checked={value === slot.startAtIso} onChange={() => onChange(slot.startAtIso)} className="h-4 w-4 shrink-0 accent-[#0D8A7C]" />
            <span className="min-w-0"><span className="block whitespace-nowrap">{slot.startTimeLabel}–{slot.endTimeLabel}</span>
              {blockConflicts && Boolean(slot.patientConflicts?.length) && <span className="block text-xs leading-5 text-slate-600">Trùng lịch: {slot.patientConflicts?.map(item => "VC-" + String(item.appointmentId).padStart(6, "0") + " (" + item.startTimeLabel + "–" + item.endTimeLabel + ")").join(", ")}</span>}
            </span>
          </label>
        )}</div>
      </fieldset>}
  </div>;
}
