import { buildEnterConfirmedNotifications, buildRescheduleNotifications, buildCancelNotifications } from "../../src/modules/notifications/contracts";
import { addDays, addHours, addMinutes } from "date-fns";

import { AppointmentStatus } from "../../src/config/business";
import {
  isHalfOpenOverlap,
  parseClinicDateTime,
} from "../../src/lib/dates";
import { SERVICE_DURATION_BY_ID } from "./catalog";
import { getPatientAccountStatus, getPatientUserId } from "./identity";
import {
  DOCTOR_SERVICE_QUOTA_BY_IDX,
  SeedDoctorShiftDef,
  SeedDoctorUnavailabilityDef,
} from "./scheduling";

export const SEED_REFERENCE_DATE = "2026-11-02T10:00:00+07:00";

export interface SeedAppointmentDef {
  appointmentId: number;
  patientId: number;
  serviceId: number;
  doctorId: number | null;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
}

export interface SeedHistoryDef {
  historyId: number;
  appointmentId: number;
  actorUserId: number;
  oldStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus;
  oldDoctorId: number | null;
  newDoctorId: number | null;
  oldStartAt: Date | null;
  newStartAt: Date;
  oldEndAt: Date | null;
  newEndAt: Date;
  changedAt: Date;
  eventOrder: number;
}

export interface SeedNotificationDef {
  notificationId: number;
  recipientUserId: number;
  appointmentId: number;
  content: string;
  createdAt: Date;
}

type LifecycleTemplate =
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6"
  | "L7"
  | "L8"
  | "L9"
  | "L10";

type ExtraHistoryType = "R1" | "R2" | "R3" | "R4" | null;

const SERVICE_STATUS_QUOTA: Record<
  number,
  {
    COMPLETED: number;
    CANCELLED: number;
    CONFIRMED: number;
    PENDING: number;
    PENDING_NULL: number;
  }
> = {
  1: { COMPLETED: 150, CANCELLED: 40, CONFIRMED: 45, PENDING: 45, PENDING_NULL: 15 },
  2: { COMPLETED: 130, CANCELLED: 35, CONFIRMED: 40, PENDING: 35, PENDING_NULL: 10 },
  3: { COMPLETED: 90, CANCELLED: 25, CONFIRMED: 25, PENDING: 30, PENDING_NULL: 10 },
  4: { COMPLETED: 75, CANCELLED: 20, CONFIRMED: 20, PENDING: 25, PENDING_NULL: 5 },
  5: { COMPLETED: 65, CANCELLED: 20, CONFIRMED: 20, PENDING: 15, PENDING_NULL: 5 },
  6: { COMPLETED: 70, CANCELLED: 20, CONFIRMED: 0, PENDING: 0, PENDING_NULL: 0 },
  7: { COMPLETED: 40, CANCELLED: 10, CONFIRMED: 15, PENDING: 15, PENDING_NULL: 5 },
  8: { COMPLETED: 40, CANCELLED: 10, CONFIRMED: 15, PENDING: 15, PENDING_NULL: 10 },
};

interface CuratedAppointmentSpec {
  appointmentId: number;
  caseCode: string;
  patientNumber: number;
  serviceId: number;
  doctorIdx: number | null;
  startAtStr: string;
  endAtStr: string;
  status: AppointmentStatus;
  template: LifecycleTemplate;
  extra: ExtraHistoryType;
}

export const CURATED_APPOINTMENTS: readonly CuratedAppointmentSpec[] = [
  { appointmentId: 1, caseCode: "C01", patientNumber: 381, serviceId: 6, doctorIdx: 9, startAtStr: "2026-10-19 10:00", endAtStr: "2026-10-19 10:45", status: "COMPLETED", template: "L1", extra: null },
  { appointmentId: 2, caseCode: "C02", patientNumber: 381, serviceId: 1, doctorIdx: 1, startAtStr: "2026-10-20 09:00", endAtStr: "2026-10-20 09:30", status: "COMPLETED", template: "L1", extra: "R1" },
  { appointmentId: 3, caseCode: "C03", patientNumber: 382, serviceId: 2, doctorIdx: 5, startAtStr: "2026-10-21 10:00", endAtStr: "2026-10-21 10:30", status: "COMPLETED", template: "L1", extra: "R2" },
  { appointmentId: 4, caseCode: "C04", patientNumber: 596, serviceId: 5, doctorIdx: 8, startAtStr: "2026-10-22 13:00", endAtStr: "2026-10-22 13:30", status: "COMPLETED", template: "L1", extra: "R4" },
  { appointmentId: 5, caseCode: "C05", patientNumber: 390, serviceId: 1, doctorIdx: 1, startAtStr: "2026-10-23 10:00", endAtStr: "2026-10-23 10:30", status: "COMPLETED", template: "L1", extra: null },
  { appointmentId: 6, caseCode: "C06", patientNumber: 390, serviceId: 1, doctorIdx: 5, startAtStr: "2026-10-26 10:00", endAtStr: "2026-10-26 10:30", status: "COMPLETED", template: "L1", extra: null },
  { appointmentId: 421, caseCode: "C07", patientNumber: 101, serviceId: 8, doctorIdx: 4, startAtStr: "2026-10-27 09:00", endAtStr: "2026-10-27 09:30", status: "COMPLETED", template: "L2", extra: null },
  { appointmentId: 422, caseCode: "C08", patientNumber: 102, serviceId: 1, doctorIdx: 1, startAtStr: "2026-10-28 11:00", endAtStr: "2026-10-28 11:30", status: "COMPLETED", template: "L2", extra: null },
  { appointmentId: 661, caseCode: "C09", patientNumber: 383, serviceId: 1, doctorIdx: null, startAtStr: "2026-10-29 11:00", endAtStr: "2026-10-29 11:30", status: "CANCELLED", template: "L3", extra: null },
  { appointmentId: 662, caseCode: "C10", patientNumber: 384, serviceId: 4, doctorIdx: null, startAtStr: "2026-10-29 13:00", endAtStr: "2026-10-29 13:30", status: "CANCELLED", template: "L3", extra: null },
  { appointmentId: 721, caseCode: "C11", patientNumber: 385, serviceId: 2, doctorIdx: 2, startAtStr: "2026-10-27 13:00", endAtStr: "2026-10-27 13:30", status: "CANCELLED", template: "L4", extra: null },
  { appointmentId: 781, caseCode: "C12", patientNumber: 103, serviceId: 4, doctorIdx: 7, startAtStr: "2026-10-28 14:00", endAtStr: "2026-10-28 14:30", status: "CANCELLED", template: "L5", extra: null },
  { appointmentId: 841, caseCode: "C13", patientNumber: 386, serviceId: 2, doctorIdx: 5, startAtStr: "2026-11-02 13:00", endAtStr: "2026-11-02 13:30", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 842, caseCode: "C14", patientNumber: 387, serviceId: 4, doctorIdx: 7, startAtStr: "2026-11-02 09:00", endAtStr: "2026-11-02 09:30", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 843, caseCode: "C15", patientNumber: 388, serviceId: 5, doctorIdx: 8, startAtStr: "2026-11-02 13:30", endAtStr: "2026-11-02 14:00", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 844, caseCode: "C16", patientNumber: 389, serviceId: 7, doctorIdx: 10, startAtStr: "2026-11-02 11:00", endAtStr: "2026-11-02 11:45", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 845, caseCode: "C17", patientNumber: 391, serviceId: 1, doctorIdx: 1, startAtStr: "2026-11-02 14:00", endAtStr: "2026-11-02 14:30", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 846, caseCode: "C18", patientNumber: 391, serviceId: 1, doctorIdx: 1, startAtStr: "2026-11-02 14:30", endAtStr: "2026-11-02 15:00", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 847, caseCode: "C19", patientNumber: 392, serviceId: 7, doctorIdx: 10, startAtStr: "2026-11-02 12:15", endAtStr: "2026-11-02 13:00", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 848, caseCode: "C20", patientNumber: 393, serviceId: 8, doctorIdx: 4, startAtStr: "2026-11-02 15:30", endAtStr: "2026-11-02 16:00", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 849, caseCode: "C21", patientNumber: 394, serviceId: 8, doctorIdx: 4, startAtStr: "2026-11-03 10:00", endAtStr: "2026-11-03 10:30", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 850, caseCode: "C22", patientNumber: 596, serviceId: 1, doctorIdx: 11, startAtStr: "2026-11-09 10:00", endAtStr: "2026-11-09 10:30", status: "CONFIRMED", template: "L6", extra: null },
  { appointmentId: 961, caseCode: "C23", patientNumber: 104, serviceId: 2, doctorIdx: 11, startAtStr: "2026-11-03 11:00", endAtStr: "2026-11-03 11:30", status: "CONFIRMED", template: "L7", extra: null },
  { appointmentId: 962, caseCode: "C24", patientNumber: 105, serviceId: 1, doctorIdx: 12, startAtStr: "2026-11-02 12:00", endAtStr: "2026-11-02 12:30", status: "CONFIRMED", template: "L7", extra: null },
  { appointmentId: 963, caseCode: "C25", patientNumber: 106, serviceId: 5, doctorIdx: 15, startAtStr: "2026-11-03 10:00", endAtStr: "2026-11-03 10:30", status: "CONFIRMED", template: "L7", extra: null },
  { appointmentId: 1021, caseCode: "C26", patientNumber: 395, serviceId: 1, doctorIdx: null, startAtStr: "2026-11-03 10:30", endAtStr: "2026-11-03 11:00", status: "PENDING", template: "L8", extra: null },
  { appointmentId: 1022, caseCode: "C27", patientNumber: 396, serviceId: 8, doctorIdx: null, startAtStr: "2026-12-02 10:00", endAtStr: "2026-12-02 10:30", status: "PENDING", template: "L8", extra: null },
  { appointmentId: 1081, caseCode: "C28", patientNumber: 301, serviceId: 3, doctorIdx: 3, startAtStr: "2026-11-03 11:00", endAtStr: "2026-11-03 11:30", status: "PENDING", template: "L9", extra: null },
  { appointmentId: 1082, caseCode: "C29", patientNumber: 397, serviceId: 1, doctorIdx: 5, startAtStr: "2026-11-02 08:30", endAtStr: "2026-11-02 09:00", status: "PENDING", template: "L9", extra: null },
  { appointmentId: 1083, caseCode: "C30", patientNumber: 302, serviceId: 3, doctorIdx: 3, startAtStr: "2026-11-03 12:00", endAtStr: "2026-11-03 12:30", status: "PENDING", template: "L9", extra: null },
  { appointmentId: 1171, caseCode: "C31", patientNumber: 107, serviceId: 4, doctorIdx: 12, startAtStr: "2026-11-03 11:00", endAtStr: "2026-11-03 11:30", status: "PENDING", template: "L10", extra: null },
  { appointmentId: 1172, caseCode: "C32", patientNumber: 600, serviceId: 8, doctorIdx: 4, startAtStr: "2026-11-09 11:00", endAtStr: "2026-11-09 11:30", status: "PENDING", template: "L10", extra: null },
] as const;

function getTemplateMeta(appointmentId: number): {
  template: LifecycleTemplate;
  status: AppointmentStatus;
  needsDoctor: boolean;
} {
  if (appointmentId <= 420) return { template: "L1", status: "COMPLETED", needsDoctor: true };
  if (appointmentId <= 660) return { template: "L2", status: "COMPLETED", needsDoctor: true };
  if (appointmentId <= 720) return { template: "L3", status: "CANCELLED", needsDoctor: false };
  if (appointmentId <= 780) return { template: "L4", status: "CANCELLED", needsDoctor: true };
  if (appointmentId <= 840) return { template: "L5", status: "CANCELLED", needsDoctor: true };
  if (appointmentId <= 960) return { template: "L6", status: "CONFIRMED", needsDoctor: true };
  if (appointmentId <= 1020) return { template: "L7", status: "CONFIRMED", needsDoctor: true };
  if (appointmentId <= 1080) return { template: "L8", status: "PENDING", needsDoctor: false };
  if (appointmentId <= 1170) return { template: "L9", status: "PENDING", needsDoctor: true };
  return { template: "L10", status: "PENDING", needsDoctor: true };
}

function getInitialPatientQuota(patientNumber: number): number {
  if (patientNumber <= 100) return 0;
  if (patientNumber <= 270) return 1;
  if (patientNumber <= 450) return 2;
  if (patientNumber <= 540) return 3;
  if (patientNumber <= 570) return 4;
  if (patientNumber <= 590) return 8;
  if (patientNumber <= 595) return 22;
  return 2;
}

function getReceptionActorUserId(appointmentId: number, eventOrder: number): number {
  const receptionIndex = ((appointmentId + eventOrder - 2) % 3) + 1;
  return 21000 + receptionIndex;
}

function getAlternativeDoctorId(
  serviceId: number,
  currentDoctorId: number,
  patientId: number
): number {
  for (let dIdx = 1; dIdx <= 15; dIdx++) {
    const candidateId = 20000 + dIdx;
    if (
      candidateId !== currentDoctorId &&
      candidateId !== patientId &&
      (DOCTOR_SERVICE_QUOTA_BY_IDX[dIdx]?.[serviceId] ?? 0) > 0
    ) {
      return candidateId;
    }
  }
  throw new Error(
    `No alternative doctor found for serviceId=${serviceId}, currentDoctorId=${currentDoctorId}`
  );
}

interface InternalAppointmentDraft {
  appointmentId: number;
  template: LifecycleTemplate;
  status: AppointmentStatus;
  needsDoctor: boolean;
  curated: boolean;
  patientNumber: number;
  patientId: number;
  serviceId: number;
  doctorIdx: number | null;
  slotDoctorIdx: number | null;
  doctorId: number | null;
  startAt: Date;
  endAt: Date;
  extra: ExtraHistoryType;
}

export function buildAppointmentsHistoryAndNotifications(input: {
  shifts: SeedDoctorShiftDef[];
  unavailability: SeedDoctorUnavailabilityDef[];
}): {
  appointments: SeedAppointmentDef[];
  history: SeedHistoryDef[];
  notifications: SeedNotificationDef[];
} {
  const demoRef = new Date(SEED_REFERENCE_DATE);

  const drafts = new Map<number, InternalAppointmentDraft>();
  for (let aid = 1; aid <= 1200; aid++) {
    const meta = getTemplateMeta(aid);
    drafts.set(aid, {
      appointmentId: aid,
      template: meta.template,
      status: meta.status,
      needsDoctor: meta.needsDoctor,
      curated: false,
      patientNumber: 0,
      patientId: 0,
      serviceId: 0,
      doctorIdx: null,
      slotDoctorIdx: null,
      doctorId: null,
      startAt: demoRef,
      endAt: demoRef,
      extra: null,
    });
  }

  const remSrvStatus: Record<
    number,
    {
      COMPLETED: number;
      CANCELLED: number;
      CONFIRMED: number;
      PENDING_NULL: number;
      PENDING_DOC: number;
    }
  > = {};
  for (let s = 1; s <= 8; s++) {
    const q = SERVICE_STATUS_QUOTA[s];
    remSrvStatus[s] = {
      COMPLETED: q.COMPLETED,
      CANCELLED: q.CANCELLED,
      CONFIRMED: q.CONFIRMED,
      PENDING_NULL: q.PENDING_NULL,
      PENDING_DOC: q.PENDING - q.PENDING_NULL,
    };
  }

  const remDocSrv: Record<number, Record<number, number>> = {};
  for (let d = 1; d <= 16; d++) {
    remDocSrv[d] = { ...(DOCTOR_SERVICE_QUOTA_BY_IDX[d] ?? {}) };
  }

  const remPatientQuota: Record<number, number> = {};
  for (let p = 1; p <= 600; p++) {
    remPatientQuota[p] = getInitialPatientQuota(p);
  }

  const remPatientS03Quota: Record<number, number> = {};
  for (let p = 271; p <= 370; p++) {
    remPatientS03Quota[p] = p <= 340 ? 2 : 1;
  }

  for (const c of CURATED_APPOINTMENTS) {
    const d = drafts.get(c.appointmentId)!;
    d.curated = true;
    d.patientNumber = c.patientNumber;
    d.patientId = getPatientUserId(c.patientNumber);
    d.serviceId = c.serviceId;
    d.doctorIdx = c.doctorIdx;
    d.slotDoctorIdx = c.doctorIdx;
    d.doctorId = c.doctorIdx !== null ? 20000 + c.doctorIdx : null;
    d.startAt = parseClinicDateTime(c.startAtStr);
    d.endAt = parseClinicDateTime(c.endAtStr);
    d.extra = c.extra;

    remPatientQuota[c.patientNumber] -= 1;
    if (c.serviceId === 3) {
      remPatientS03Quota[c.patientNumber] -= 1;
    }
    if (c.status === "COMPLETED") {
      remSrvStatus[c.serviceId].COMPLETED -= 1;
    } else if (c.status === "CANCELLED") {
      remSrvStatus[c.serviceId].CANCELLED -= 1;
    } else if (c.status === "CONFIRMED") {
      remSrvStatus[c.serviceId].CONFIRMED -= 1;
    } else if (c.status === "PENDING") {
      if (c.doctorIdx === null) {
        remSrvStatus[c.serviceId].PENDING_NULL -= 1;
      } else {
        remSrvStatus[c.serviceId].PENDING_DOC -= 1;
      }
    }
    if (c.doctorIdx !== null) {
      remDocSrv[c.doctorIdx][c.serviceId] -= 1;
    }
  }

  const assignServiceRange = (
    startId: number,
    endId: number,
    key: keyof (typeof remSrvStatus)[1]
  ) => {
    let idx = 0;
    for (let aid = startId; aid <= endId; aid++) {
      const row = drafts.get(aid)!;
      if (row.curated) continue;
      while (remSrvStatus[(idx % 8) + 1][key] <= 0) {
        idx++;
      }
      const s = (idx % 8) + 1;
      row.serviceId = s;
      remSrvStatus[s][key] -= 1;
      idx++;
    }
  };

  assignServiceRange(1, 660, "COMPLETED");
  assignServiceRange(661, 840, "CANCELLED");
  assignServiceRange(841, 1020, "CONFIRMED");
  assignServiceRange(1021, 1080, "PENDING_NULL");
  assignServiceRange(1081, 1200, "PENDING_DOC");

  for (let s = 1; s <= 8; s++) {
    const mappedDocs = Array.from({ length: 16 }, (_, i) => i + 1).filter(
      (d) => (DOCTOR_SERVICE_QUOTA_BY_IDX[d]?.[s] ?? 0) > 0
    );
    let futureBulkNeeded = 0;
    for (let aid = 841; aid <= 1200; aid++) {
      const r = drafts.get(aid)!;
      if (!r.curated && r.serviceId === s && r.needsDoctor) {
        futureBulkNeeded++;
      }
    }

    let ptr = 0;
    for (let aid = 1; aid <= 840; aid++) {
      const r = drafts.get(aid)!;
      if (r.curated || r.serviceId !== s) continue;
      const nonD14Rem = mappedDocs
        .filter((d) => d !== 14)
        .reduce((acc, d) => acc + (remDocSrv[d][s] ?? 0), 0);

      let chosenDoc = 0;
      while (true) {
        const d = mappedDocs[ptr % mappedDocs.length];
        ptr++;
        if ((remDocSrv[d][s] ?? 0) <= 0) continue;
        if (
          d !== 14 &&
          nonD14Rem <= futureBulkNeeded &&
          (remDocSrv[14]?.[s] ?? 0) > 0
        ) {
          continue;
        }
        chosenDoc = d;
        break;
      }
      remDocSrv[chosenDoc][s] -= 1;
      r.slotDoctorIdx = chosenDoc;
      if (r.needsDoctor) {
        r.doctorIdx = chosenDoc;
        r.doctorId = 20000 + chosenDoc;
      } else {
        r.doctorIdx = null;
        r.doctorId = null;
      }
    }

    for (let aid = 841; aid <= 1200; aid++) {
      const r = drafts.get(aid)!;
      if (r.curated || r.serviceId !== s || !r.needsDoctor) continue;
      let chosenDoc = 0;
      while (true) {
        const d = mappedDocs[ptr % mappedDocs.length];
        ptr++;
        if (d === 14) continue;
        if ((remDocSrv[d][s] ?? 0) <= 0) continue;
        chosenDoc = d;
        break;
      }
      remDocSrv[chosenDoc][s] -= 1;
      r.slotDoctorIdx = chosenDoc;
      r.doctorIdx = chosenDoc;
      r.doctorId = 20000 + chosenDoc;
    }
  }

  const isPatientEligible = (
    pNum: number,
    tmpl: LifecycleTemplate,
    doctorId: number | null
  ): boolean => {
    const uid = getPatientUserId(pNum);
    if (doctorId !== null && uid === doctorId) return false;
    const accStatus = getPatientAccountStatus(pNum);
    if (tmpl === "L1" || tmpl === "L3" || tmpl === "L4") {
      return accStatus === "ACTIVE" || accStatus === "DISABLED";
    }
    if (tmpl === "L6" || tmpl === "L8" || tmpl === "L9") {
      return accStatus === "ACTIVE";
    }
    return true;
  };

  let s03Ptr = 0;
  const s03Pool = Array.from({ length: 100 }, (_, i) => 271 + i);
  let otherPtr = 0;
  const otherPool = Array.from({ length: 500 }, (_, i) => 101 + i);

  for (let aid = 1; aid <= 1200; aid++) {
    const r = drafts.get(aid)!;
    if (r.curated) continue;
    const pediatric = r.serviceId === 3;
    const pool = pediatric ? s03Pool : otherPool;
    let guard = 0;
    while (true) {
      const patient = pool[(pediatric ? s03Ptr++ : otherPtr++) % pool.length];
      if (++guard > 10000) {
        throw new Error(`Exhausted ${pediatric ? "S03 patient" : "patient"} search at aid=${aid}`);
      }
      const quota = pediatric
        ? Math.min(remPatientS03Quota[patient] ?? 0, remPatientQuota[patient])
        : remPatientQuota[patient] - (remPatientS03Quota[patient] ?? 0);
      if (quota <= 0 || !isPatientEligible(patient, r.template, r.doctorId)) continue;
      if (pediatric) remPatientS03Quota[patient] -= 1;
      remPatientQuota[patient] -= 1;
      r.patientNumber = patient;
      r.patientId = getPatientUserId(patient);
      break;
    }
  }

  const docBusy = new Map<number, Array<{ startAt: Date; endAt: Date; }>>();
  const patBusy = new Map<number, Array<{ startAt: Date; endAt: Date; }>>();
  const curatedWindows: Array<{ startAt: Date; endAt: Date; }> = [];

  for (let d = 1; d <= 16; d++) {
    docBusy.set(d, []);
  }

  for (const r of drafts.values()) {
    if (!r.curated) continue;
    curatedWindows.push({ startAt: r.startAt, endAt: r.endAt });
    if (r.doctorIdx !== null) {
      docBusy.get(r.doctorIdx)!.push({ startAt: r.startAt, endAt: r.endAt });
    }
    const pList = patBusy.get(r.patientId) ?? [];
    pList.push({ startAt: r.startAt, endAt: r.endAt });
    patBusy.set(r.patientId, pList);
  }

  const isDoctorFree = (doctorIdx: number, startAt: Date, endAt: Date): boolean =>
    !input.unavailability.some(busy => busy.doctorIdx === doctorIdx && isHalfOpenOverlap(startAt, endAt, busy.startAt, busy.endAt)) &&
    !(docBusy.get(doctorIdx) ?? []).some(busy => isHalfOpenOverlap(startAt, endAt, busy.startAt, busy.endAt));

  const isPatientFree = (patientId: number, startAt: Date, endAt: Date): boolean =>
    !(patBusy.get(patientId) ?? []).some(busy => isHalfOpenOverlap(startAt, endAt, busy.startAt, busy.endAt));

  const min20261102 = parseClinicDateTime("2026-11-02 10:15");
  let l8SlotOffset = 0;

  for (let aid = 1; aid <= 1200; aid++) {
    const r = drafts.get(aid)!;
    if (r.curated) continue;
    const durMin = SERVICE_DURATION_BY_ID[r.serviceId];
    const isHist = r.status === "COMPLETED" || r.status === "CANCELLED";

    if (r.doctorIdx !== null || r.template === "L3") {
      const dIdx = r.doctorIdx ?? r.slotDoctorIdx!;
      const docShifts = input.shifts.filter(
        (sh) => sh.doctorIdx === dIdx && sh.isHistorical === isHist
      );
      let placed = false;
      for (const sh of docShifts) {
        let cur = new Date(sh.startAt.getTime());
        if (!isHist && sh.dateStr === "2026-11-02" && cur < min20261102) {
          cur = new Date(min20261102.getTime());
        }
        while (addMinutes(cur, durMin).getTime() <= sh.endAt.getTime()) {
          const endCand = addMinutes(cur, durMin);
          if (
            isDoctorFree(dIdx, cur, endCand) &&
            isPatientFree(r.patientId, cur, endCand)
          ) {
            r.startAt = cur;
            r.endAt = endCand;
            if (r.doctorIdx !== null) {
              docBusy.get(dIdx)!.push({ startAt: cur, endAt: endCand });
            }
            const pList = patBusy.get(r.patientId) ?? [];
            pList.push({ startAt: cur, endAt: endCand });
            patBusy.set(r.patientId, pList);
            placed = true;
            break;
          }
          cur = addMinutes(cur, 15);
        }
        if (placed) break;
      }
      if (!placed) {
        throw new Error(`Could not place appointment aid=${aid} for dIdx=${dIdx}`);
      }
    } else {
      const mappedDocs = Array.from({ length: 15 }, (_, i) => i + 1).filter(
        (d) => d !== 14 && (DOCTOR_SERVICE_QUOTA_BY_IDX[d]?.[r.serviceId] ?? 0) > 0
      );
      const candidateSlots: Array<{ startAt: Date; endAt: Date; }> = [];
      for (const dIdx of mappedDocs) {
        const docShifts = input.shifts.filter(
          (sh) => sh.doctorIdx === dIdx && !sh.isHistorical
        );
        for (const sh of docShifts) {
          let cur = new Date(sh.startAt.getTime());
          if (sh.dateStr === "2026-11-02" && cur < min20261102) {
            cur = new Date(min20261102.getTime());
          }
          while (addMinutes(cur, durMin).getTime() <= sh.endAt.getTime()) {
            const endCand = addMinutes(cur, durMin);
            const hitsCurated = curatedWindows.some((w) =>
              isHalfOpenOverlap(cur, endCand, w.startAt, w.endAt)
            );
            if (!hitsCurated && isDoctorFree(dIdx, cur, endCand)) {
              candidateSlots.push({ startAt: cur, endAt: endCand });
            }
            cur = addMinutes(cur, 15);
          }
        }
      }
      let placed = false;
      for (let i = 0; i < candidateSlots.length; i++) {
        const cand = candidateSlots[(l8SlotOffset + i) % candidateSlots.length];
        if (isPatientFree(r.patientId, cand.startAt, cand.endAt)) {
          r.startAt = cand.startAt;
          r.endAt = cand.endAt;
          const pList = patBusy.get(r.patientId) ?? [];
          pList.push({ startAt: cand.startAt, endAt: cand.endAt });
          patBusy.set(r.patientId, pList);
          l8SlotOffset++;
          placed = true;
          break;
        }
      }
      if (!placed) {
        throw new Error(`Could not place unassigned L8 appointment aid=${aid}`);
      }
    }
  }

  let r1Count = 1;
  let r2Count = 1;
  let r4Count = 1;

  for (let aid = 1; aid <= 420; aid++) {
    const r = drafts.get(aid)!;
    if (r.extra !== null) continue;
    if (r1Count < 50) {
      r.extra = "R1";
      r1Count++;
    } else if (r2Count < 30 && r.serviceId !== 8) {
      r.extra = "R2";
      r2Count++;
    } else if (r4Count < 10) {
      r.extra = "R4";
      r4Count++;
    }
  }
  for (let aid = 1; aid <= 420 && r2Count < 30; aid++) {
    const r = drafts.get(aid)!;
    if (r.extra === null && r.serviceId !== 8) {
      r.extra = "R2";
      r2Count++;
    }
  }

  let r3Count = 0;
  for (let aid = 721; aid <= 780 && r3Count < 20; aid++) {
    const r = drafts.get(aid)!;
    if (r.serviceId !== 8) {
      r.extra = "R3";
      r3Count++;
    }
  }

  return buildSeedLifecycle(drafts, demoRef);
}

function buildSeedLifecycle(drafts: Map<number, InternalAppointmentDraft>, demoRef: Date) {
  const rawHistory: Array<Omit<SeedHistoryDef, "historyId">> = [];
  const rawNotifications: Array<Omit<SeedNotificationDef, "notificationId">> = [];

  let completedOrdinal = 0;

  for (let aid = 1; aid <= 1200; aid++) {
    const r = drafts.get(aid)!;
    const durMin = SERVICE_DURATION_BY_ID[r.serviceId];
    const finalDocId = r.doctorId;
    const finalStart = r.startAt;
    const finalEnd = r.endAt;
    const pushHistory = (event: Pick<SeedHistoryDef, "actorUserId" | "oldStatus" | "newStatus" | "changedAt" | "eventOrder"> & Partial<Omit<SeedHistoryDef, "historyId">>) => {
      rawHistory.push({
        appointmentId: aid,
        oldDoctorId: finalDocId,
        newDoctorId: finalDocId,
        oldStartAt: finalStart,
        newStartAt: finalStart,
        oldEndAt: finalEnd,
        newEndAt: finalEnd,
        ...event,
      });
    };

    type EventChanges = Partial<Pick<SeedHistoryDef, "oldDoctorId" | "newDoctorId" | "oldStartAt" | "newStartAt" | "oldEndAt" | "newEndAt">>;
    const create = (actorUserId: number, newStatus: AppointmentStatus, changedAt: Date, changes: EventChanges = {}) => pushHistory({
      actorUserId, oldStatus: null, newStatus, changedAt, eventOrder: 1,
      oldDoctorId: null, oldStartAt: null, oldEndAt: null, ...changes,
    });
    const confirm = (changedAt: Date, changes: EventChanges = {}) => pushHistory({
      actorUserId: getReceptionActorUserId(aid, 2), oldStatus: "PENDING", newStatus: "CONFIRMED", changedAt, eventOrder: 2, ...changes,
    });
    const reschedule = (changedAt: Date, eventOrder: number, changes: EventChanges) => pushHistory({
      actorUserId: getReceptionActorUserId(aid, eventOrder), oldStatus: "CONFIRMED", newStatus: "CONFIRMED", changedAt, eventOrder, ...changes,
    });
    const complete = (changedAt: Date, eventOrder: number) => pushHistory({
      actorUserId: completedOrdinal % 3 === 0 ? getReceptionActorUserId(aid, eventOrder) : finalDocId!,
      oldStatus: "CONFIRMED", newStatus: "COMPLETED", changedAt, eventOrder,
    });
    const cancel = (actorUserId: number, oldStatus: AppointmentStatus, changedAt: Date, eventOrder: number, changes: EventChanges = {}) => pushHistory({
      actorUserId, oldStatus, newStatus: "CANCELLED", changedAt, eventOrder, ...changes,
    });

    if (r.template === "L1" || r.template === "L4") {
      if (r.template === "L1") completedOrdinal++;
      const tCreate = addDays(finalStart, -7);
      const tConfirm = addDays(finalStart, -4);
      const changedDoctor = r.extra === "R2" || r.extra === "R3";
      const initialDoctor = changedDoctor
        ? getAlternativeDoctorId(r.serviceId, finalDocId!, r.patientId)
        : finalDocId!;
      const initialOffset = r.extra === "R4" ? -60 : r.extra === "R1" || r.extra === "R3" ? -30 : 0;
      const initialStart = addMinutes(finalStart, initialOffset);
      const initialEnd = addMinutes(initialStart, durMin);
      create(r.patientId, "PENDING", tCreate, {
        newDoctorId: initialDoctor, newStartAt: initialStart, newEndAt: initialEnd,
      });
      confirm(tConfirm, {
        oldDoctorId: initialDoctor, newDoctorId: initialDoctor,
        oldStartAt: initialStart, newStartAt: initialStart,
        oldEndAt: initialEnd, newEndAt: initialEnd,
      });
      rawNotifications.push(...buildEnterConfirmedNotifications({
        appointmentId: aid, patientId: r.patientId, doctorId: initialDoctor, startAt: initialStart, createdAt: tConfirm,
      }));

      let eventOrder = 3;
      let previousStart = initialStart;
      let previousEnd = initialEnd;
      const offsets = r.extra === "R4" ? [-30, 0] : initialOffset || changedDoctor ? [0] : [];
      for (const [index, offset] of offsets.entries()) {
        const start = addMinutes(finalStart, offset);
        const end = addMinutes(start, durMin);
        const changedAt = addDays(finalStart, offsets.length === 2 && index === 0 ? -3 : -2);
        reschedule(changedAt, eventOrder++, {
          oldDoctorId: initialDoctor, oldStartAt: previousStart, oldEndAt: previousEnd,
          newStartAt: start, newEndAt: end,
        });
        rawNotifications.push(...buildRescheduleNotifications({
          appointmentId: aid, patientId: r.patientId,
          oldDoctorId: initialDoctor, newDoctorId: finalDocId!,
          oldStartAt: previousStart, newStartAt: start, createdAt: changedAt,
        }));
        previousStart = start;
        previousEnd = end;
      }
      if (r.template === "L1") {
        complete(addMinutes(finalEnd, 15), eventOrder);
      } else {
        const changedAt = addDays(finalStart, -1);
        cancel(r.patientId, "CONFIRMED", changedAt, eventOrder);
        rawNotifications.push(...buildCancelNotifications({
        appointmentId: aid, patientId: r.patientId, doctorId: finalDocId, createdAt: changedAt,
      }));
      }
    } else if (r.template === "L2" || r.template === "L5" || r.template === "L7") {
      const createdAt = r.template === "L7" ? addDays(demoRef, -1) : addDays(finalStart, r.template === "L2" ? -3 : -4);
      create(getReceptionActorUserId(aid, 1), "CONFIRMED", createdAt);
      rawNotifications.push(...buildEnterConfirmedNotifications({
        appointmentId: aid, patientId: r.patientId, doctorId: finalDocId!, startAt: finalStart, createdAt,
      }));
      if (r.template === "L2") {
        completedOrdinal++;
        complete(addMinutes(finalEnd, 15), 2);
      } else if (r.template === "L5") {
        const cancelledAt = addDays(finalStart, -1);
        cancel(getReceptionActorUserId(aid, 2), "CONFIRMED", cancelledAt, 2);
        rawNotifications.push(...buildCancelNotifications({
          appointmentId: aid, patientId: r.patientId, doctorId: finalDocId, createdAt: cancelledAt,
        }));
      }
    } else if (r.template === "L3") {
      const createdAt = addDays(finalStart, -5);
      const cancelledAt = addDays(finalStart, -1);
      create(r.patientId, "PENDING", createdAt, { newDoctorId: null });
      cancel(r.patientId, "PENDING", cancelledAt, 2, { oldDoctorId: null, newDoctorId: null });
      rawNotifications.push(...buildCancelNotifications({
        appointmentId: aid, patientId: r.patientId, doctorId: null, createdAt: cancelledAt,
      }));
    } else if (r.template === "L6") {
      const tCreate = addDays(demoRef, -7);
      const tConfirm = addDays(demoRef, -1);
      create(r.patientId, "PENDING", tCreate);
      confirm(tConfirm);
      rawNotifications.push(...buildEnterConfirmedNotifications({
        appointmentId: aid, patientId: r.patientId, doctorId: finalDocId!, startAt: finalStart, createdAt: tConfirm,
      }));
    } else if (r.template === "L8" || r.template === "L9") {
      const tCreate = addHours(demoRef, -12);
      create(r.patientId, "PENDING", tCreate);
    } else if (r.template === "L10") {
      const tCreate = addHours(demoRef, -6);
      create(getReceptionActorUserId(aid, 1), "PENDING", tCreate);
    }
  }

  rawHistory.sort((a, b) => {
    const dt = a.changedAt.getTime() - b.changedAt.getTime();
    if (dt !== 0) return dt;
    if (a.appointmentId !== b.appointmentId) return a.appointmentId - b.appointmentId;
    return a.eventOrder - b.eventOrder;
  });

  const history: SeedHistoryDef[] = rawHistory.map((h, idx) => ({
    ...h,
    historyId: idx + 1,
  }));

  rawNotifications.sort((a, b) => {
    const dt = a.createdAt.getTime() - b.createdAt.getTime();
    if (dt !== 0) return dt;
    if (a.appointmentId !== b.appointmentId) return a.appointmentId - b.appointmentId;
    return a.recipientUserId - b.recipientUserId;
  });

  const notifications: SeedNotificationDef[] = rawNotifications.map((n, idx) => ({
    appointmentId: n.appointmentId,
    createdAt: n.createdAt,
    recipientUserId: n.recipientUserId,
    content: n.content,
    notificationId: idx + 1,
  }));

  const appointments: SeedAppointmentDef[] = Array.from(drafts.values())
    .sort((a, b) => a.appointmentId - b.appointmentId)
    .map((r) => ({
      appointmentId: r.appointmentId,
      patientId: r.patientId,
      serviceId: r.serviceId,
      doctorId: r.doctorId,
      startAt: r.startAt,
      endAt: r.endAt,
      status: r.status,
    }));

  return { appointments, history, notifications };
}
