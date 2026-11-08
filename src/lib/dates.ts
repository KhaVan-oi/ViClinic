import { addDays, addMinutes, format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { CLINIC_TIMEZONE, SLOT_GRID_MINUTES } from "@/config/business";
import { DomainError } from "@/lib/errors";

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseClinicDateTime(dateTimeStr: string): Date {
  const normalized = dateTimeStr.trim().replace(" ", "T");
  if (!isValidIsoDate(normalized.slice(0, 10)) ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(normalized)) {
    throw new DomainError("VALIDATION_ERROR", "Ngày hoặc giờ không hợp lệ.");
  }
  if (normalized.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized);
  }
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  return new Date(`${withSeconds}+07:00`);
}

export function parseDateOnlyUtc(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m || !isValidIsoDate(dateStr.trim())) {
    throw new DomainError("VALIDATION_ERROR", "Ngày không hợp lệ.");
  }
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
}

export function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getClinicDayStart(dateStr: string): Date {
  parseDateOnlyUtc(dateStr);
  return new Date(`${dateStr.trim()}T00:00:00.000+07:00`);
}

export function getClinicDayEndExclusive(dateStr: string): Date {
  const start = getClinicDayStart(dateStr);
  return addDays(start, 1);
}

export function toClinicTzDate(date: Date): TZDate {
  return new TZDate(date.getTime(), CLINIC_TIMEZONE);
}

export function formatClinicDateTime(date: Date, pattern = "dd/MM/yyyy HH:mm"): string {
  return format(toClinicTzDate(date), pattern);
}

export function formatClinicDate(date: Date, pattern = "dd/MM/yyyy"): string {
  return format(toClinicTzDate(date), pattern);
}

export function formatClinicIsoDate(date: Date): string {
  return format(toClinicTzDate(date), "yyyy-MM-dd");
}

export function formatClinicTime(date: Date): string {
  return format(toClinicTzDate(date), "HH:mm");
}

const VI_WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

export function formatVietnameseWeekdayShort(dateOrIso: Date | string): string {
  const d =
    typeof dateOrIso === "string" ? getClinicDayStart(dateOrIso) : dateOrIso;
  const tz = toClinicTzDate(d);
  return VI_WEEKDAYS_SHORT[tz.getDay()] ?? "T2";
}

export function formatDayMonthShort(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export function isHalfOpenOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function isIntervalContained(
  innerStart: Date,
  innerEnd: Date,
  outerStart: Date,
  outerEnd: Date
): boolean {
  return (
    innerStart.getTime() >= outerStart.getTime() &&
    innerEnd.getTime() <= outerEnd.getTime()
  );
}

export function generateCandidateGridSlots(
  shiftStart: Date,
  shiftEnd: Date,
  durationMinutes: number,
  gridMinutes = SLOT_GRID_MINUTES
): Array<{ startAt: Date; endAt: Date; }> {
  const slots: Array<{ startAt: Date; endAt: Date; }> = [];
  let cursor = new Date(shiftStart.getTime());
  const rem = cursor.getUTCMinutes() % gridMinutes;
  if (rem !== 0) {
    cursor = addMinutes(cursor, gridMinutes - rem);
  }
  while (addMinutes(cursor, durationMinutes).getTime() <= shiftEnd.getTime()) {
    const endAt = addMinutes(cursor, durationMinutes);
    slots.push({ startAt: new Date(cursor.getTime()), endAt });
    cursor = addMinutes(cursor, gridMinutes);
  }
  return slots;
}

export function formatTimeRange(startAt: Date, endAt: Date): string {
  return `${formatClinicDate(startAt)} · ${formatClinicTime(startAt)}–${formatClinicTime(endAt)}`;
}

export function formatTimestamp(date: Date): string {
  return formatClinicDateTime(date, "dd/MM/yyyy HH:mm");
}

export function exportTimeSuffix(date = new Date()): string {
  return formatClinicDateTime(date, "yyyyMMdd-HHmmss");
}

export function formatExportTime(date = new Date()): string {
  return formatClinicDateTime(date, "dd/MM/yyyy HH:mm:ss");
}


type TimeInterval = { startAt: Date; endAt: Date };

export function subtractBusyIntervals(shift: TimeInterval, busy: TimeInterval[]): TimeInterval[] {
  const available: TimeInterval[] = [];
  let cursor = shift.startAt.getTime();
  const end = shift.endAt.getTime();
  for (const interval of [...busy].sort((a, b) => a.startAt.getTime() - b.startAt.getTime())) {
    const start = Math.max(cursor, interval.startAt.getTime());
    const stop = Math.min(end, interval.endAt.getTime());
    if (stop <= cursor || start >= end) continue;
    if (start > cursor) available.push({ startAt: new Date(cursor), endAt: new Date(start) });
    cursor = Math.max(cursor, stop);
  }
  if (cursor < end) available.push({ startAt: new Date(cursor), endAt: new Date(end) });
  return available;
}


export function formatDateOnlyDisplay(value: string | null | undefined, fallback = "Chưa có"): string {
  return value && isValidIsoDate(value) ? formatClinicDate(parseDateOnlyUtc(value)) : fallback;
}
