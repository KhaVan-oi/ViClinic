import { parseClinicDateTime } from "../../src/lib/dates";

export interface SeedDoctorServiceDef {
  doctorId: number;
  serviceId: number;
}

export interface SeedDoctorShiftDef {
  shiftId: number;
  doctorId: number;
  doctorIdx: number;
  dateStr: string;
  isHistorical: boolean;
  startAt: Date;
  endAt: Date;
}

export interface SeedDoctorUnavailabilityDef {
  unavailabilityId: number;
  code: string;
  doctorId: number;
  doctorIdx: number;
  startAt: Date;
  endAt: Date;
}

export const DOCTOR_SERVICE_QUOTA_BY_IDX: Record<number, Record<number, number>> = {
  1: { 1: 90 },
  2: { 2: 80 },
  3: { 3: 70 },
  4: { 8: 70 },
  5: { 1: 45, 2: 40 },
  6: { 1: 10, 3: 70 },
  7: { 2: 35, 4: 40 },
  8: { 1: 10, 5: 65 },
  9: { 2: 10, 6: 60 },
  10: { 1: 20, 7: 55 },
  11: { 1: 60, 2: 10, 3: 10 },
  12: { 1: 10, 4: 45, 5: 20 },
  13: { 2: 35, 6: 30, 7: 10 },
  14: { 1: 10, 2: 10, 3: 10, 4: 50 },
  15: { 1: 10, 2: 10, 5: 30, 7: 10 },
  16: {},
};

export const HISTORICAL_DATES = [
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
  "2026-10-22",
  "2026-10-26",
  "2026-10-27",
  "2026-10-28",
  "2026-10-29",
] as const;

export const FUTURE_DATES = [
  "2026-11-02",
  "2026-11-03",
  "2026-11-09",
  "2026-12-02",
] as const;

const RAW_UNAVAILABILITY: ReadonlyArray<[string, number, string, string]> = [
  ["U01", 1, "2026-10-20 14:00", "2026-10-20 15:00"],
  ["U02", 1, "2026-11-09 13:00", "2026-11-09 14:00"],
  ["U03", 2, "2026-10-21 10:30", "2026-10-21 11:30"],
  ["U04", 2, "2026-12-02 14:00", "2026-12-02 15:00"],
  ["U05", 3, "2026-10-22 13:00", "2026-10-22 14:00"],
  ["U06", 3, "2026-11-09 14:00", "2026-11-09 15:00"],
  ["U07", 4, "2026-10-26 11:00", "2026-10-26 12:00"],
  ["U08", 4, "2026-11-09 13:30", "2026-11-09 14:30"],
  ["U09", 5, "2026-10-27 14:00", "2026-10-27 15:00"],
  ["U10", 5, "2026-12-02 13:00", "2026-12-02 14:00"],
  ["U11", 6, "2026-10-19 15:00", "2026-10-19 16:00"],
  ["U12", 6, "2026-11-09 15:00", "2026-11-09 16:00"],
  ["U13", 7, "2026-10-20 15:30", "2026-10-20 16:30"],
  ["U14", 7, "2026-12-02 15:00", "2026-12-02 16:00"],
  ["U15", 8, "2026-10-21 14:00", "2026-10-21 15:00"],
  ["U16", 8, "2026-11-09 15:00", "2026-11-09 16:00"],
  ["U17", 9, "2026-10-22 13:00", "2026-10-22 14:00"],
  ["U18", 9, "2026-12-02 14:00", "2026-12-02 15:00"],
  ["U19", 10, "2026-10-26 15:00", "2026-10-26 16:00"],
  ["U20", 11, "2026-10-27 14:30", "2026-10-27 15:30"],
  ["U21", 12, "2026-10-28 13:30", "2026-10-28 14:30"],
  ["U22", 13, "2026-11-09 14:30", "2026-11-09 15:30"],
  ["U23", 14, "2026-10-29 14:00", "2026-10-29 15:00"],
  ["U24", 15, "2026-12-02 14:00", "2026-12-02 15:00"],
];

export function buildSchedulingSeedData(): {
  doctorServices: SeedDoctorServiceDef[];
  doctorShifts: SeedDoctorShiftDef[];
  doctorUnavailability: SeedDoctorUnavailabilityDef[];
} {
  const doctorServices: SeedDoctorServiceDef[] = [];
  for (let dIdx = 1; dIdx <= 16; dIdx++) {
    const doctorId = 20000 + dIdx;
    const mapping = DOCTOR_SERVICE_QUOTA_BY_IDX[dIdx] ?? {};
    for (const srvKey of Object.keys(mapping).map(Number).sort((a, b) => a - b)) {
      if ((mapping[srvKey] ?? 0) > 0) {
        doctorServices.push({ doctorId, serviceId: srvKey });
      }
    }
  }

  const doctorShifts: SeedDoctorShiftDef[] = [];
  let shiftId = 1;
  for (let dIdx = 1; dIdx <= 16; dIdx++) {
    if (dIdx === 16) continue;
    const doctorId = 20000 + dIdx;
    let startClock = "08:30";
    let endClock = "16:30";
    if (dIdx >= 1 && dIdx <= 5) {
      startClock = "08:00";
      endClock = "16:00";
    } else if (dIdx >= 6 && dIdx <= 10) {
      startClock = "09:00";
      endClock = "17:00";
    }
    const dates =
      dIdx === 14
        ? [...HISTORICAL_DATES]
        : [...HISTORICAL_DATES, ...FUTURE_DATES];

    for (const dateStr of dates) {
      doctorShifts.push({
        shiftId: shiftId++,
        doctorId,
        doctorIdx: dIdx,
        dateStr,
        isHistorical: (HISTORICAL_DATES as readonly string[]).includes(dateStr),
        startAt: parseClinicDateTime(`${dateStr} ${startClock}`),
        endAt: parseClinicDateTime(`${dateStr} ${endClock}`),
      });
    }
  }

  const doctorUnavailability: SeedDoctorUnavailabilityDef[] = RAW_UNAVAILABILITY.map(
    ([code, doctorIdx, sStr, eStr], index) => ({
      unavailabilityId: index + 1,
      code,
      doctorId: 20000 + doctorIdx,
      doctorIdx,
      startAt: parseClinicDateTime(sStr),
      endAt: parseClinicDateTime(eStr),
    })
  );

  return { doctorServices, doctorShifts, doctorUnavailability };
}
