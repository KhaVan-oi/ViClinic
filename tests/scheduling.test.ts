import assert from "node:assert/strict";
import test from "node:test";
import { generateCandidateGridSlots, isHalfOpenOverlap, subtractBusyIntervals } from "../src/lib/dates";
import { isWithinBookingHorizon, isValidSlotGridStart, isDoctorSlotValidInMemory, detectAppointmentScheduleDisruption, createServiceSchema } from "../src/modules/scheduling/contracts";

test("booking slots fit entirely inside a shift and adjacent appointments do not overlap", () => {
  const start = new Date("2030-01-01T08:00:00+07:00");
  const end = new Date("2030-01-01T09:00:00+07:00");
  const slots = generateCandidateGridSlots(start, end, 45);
  assert.equal(slots.length, 2);
  assert.equal(slots[1].endAt.getTime(), end.getTime());
  assert.equal(isHalfOpenOverlap(start, end, end, new Date(end.getTime() + 30 * 60000)), false);
});

test("work calendar splits shifts around merged busy intervals without changing original times", () => {
  const at = (hour: number) => new Date(Date.UTC(2030, 0, 1, hour));
  const shift = { startAt: at(8), endAt: at(17) };
  const busy = [{ startAt: at(9), endAt: at(11) }, { startAt: at(10), endAt: at(12) }, { startAt: at(15), endAt: at(16) }];
  assert.deepEqual(subtractBusyIntervals(shift, busy), [
    { startAt: at(8), endAt: at(9) }, { startAt: at(12), endAt: at(15) }, { startAt: at(16), endAt: at(17) },
  ]);
  assert.deepEqual(subtractBusyIntervals(shift, [{ startAt: at(7), endAt: at(18) }]), []);
  assert.deepEqual(subtractBusyIntervals(shift, [{ startAt: at(17), endAt: at(18) }]), [shift]);
  assert.deepEqual(shift, { startAt: at(8), endAt: at(17) });
});

const at = (hour: number, minute = 0) => new Date(Date.UTC(2030, 0, 1, hour, minute));
const availability = {startAt: at(9), endAt: at(10), shifts: [{startAt: at(8), endAt: at(17)}], unavailabilities: [], activeAppointments: []};

test("availability rejects time outside a shift, during leave, or overlapping a booking", () => {
  assert.equal(isDoctorSlotValidInMemory(availability).valid, true);
  assert.equal(isDoctorSlotValidInMemory({...availability, shifts: []}).reason, "OUTSIDE_SHIFT");
  assert.equal(isDoctorSlotValidInMemory({...availability, unavailabilities: [{startAt: at(9,30), endAt: at(10,30)}]}).reason, "UNAVAILABILITY_CONFLICT");
  assert.equal(isDoctorSlotValidInMemory({...availability, activeAppointments: [{startAt: at(8,30), endAt: at(9,30)}]}).reason, "DOCTOR_OVERLAP_CONFLICT");
  assert.equal(isDoctorSlotValidInMemory({...availability, activeAppointments: [{startAt: at(10), endAt: at(11)}]}).valid, true);
});

test("booking horizon includes the last clinic day, excluding now and the next day", () => {
  const now = new Date("2030-01-01T08:00:00+07:00");
  assert.equal(isWithinBookingHorizon(now, now), false);
  assert.equal(isWithinBookingHorizon(new Date("2030-01-31T23:59:59+07:00"), now), true);
  assert.equal(isWithinBookingHorizon(new Date("2030-02-01T00:00:00+07:00"), now), false);
});

test("slot starts respect the minute grid and reject sub-minute offsets", () => {
  assert.equal(isValidSlotGridStart(at(9,15)), true);
  assert.equal(isValidSlotGridStart(at(9,16)), false);
  assert.equal(isValidSlotGridStart(new Date(at(9).getTime()+1)), false);
});

test("schedule changes report all disruption reasons without changing the booking", () => {
  const appointment = {startAt: at(9), endAt: at(10), doctorShifts: [], doctorUnavailabilities: [{startAt: at(9), endAt: at(11)}]};
  assert.deepEqual(detectAppointmentScheduleDisruption(appointment), ["OUTSIDE_SHIFT", "UNAVAILABILITY_CONFLICT"]);
  assert.equal(appointment.startAt.getTime(), at(9).getTime());
});

test("service duration must be a positive whole number", () => {
  for (const durationMinutes of [0,-1,2.5]) assert.equal(createServiceSchema.safeParse({name: "Khám Nội", durationMinutes}).success, false);
  assert.equal(createServiceSchema.safeParse({name: "Khám Nội", durationMinutes: 30}).success, true);
});
