import assert from "node:assert/strict";
import test from "node:test";
import { buildEnterConfirmedNotifications, buildRescheduleNotifications, buildCancelNotifications } from "../src/modules/notifications/contracts";

const createdAt = new Date("2030-01-01T00:00:00Z");
const startAt = new Date("2030-01-02T02:00:00Z");
const booking = {appointmentId: 42, patientId: 1, doctorId: 2, startAt, createdAt};
const change = {appointmentId: 42, patientId: 1, oldDoctorId: 2, newDoctorId: 2, oldStartAt: startAt, newStartAt: startAt, createdAt};
const recipients = (drafts: {recipientUserId: number}[]) => drafts.map(row => row.recipientUserId);

test("confirmation notifies both patient and assigned doctor in clinic time", () => {
  const drafts = buildEnterConfirmedNotifications(booking);
  assert.deepEqual(recipients(drafts), [1,2]);
  assert.match(drafts[0].content, /02\/01\/2030 09:00/);
  assert.ok(drafts.every(row => row.appointmentId === 42 && row.createdAt === createdAt));
});

test("an unchanged booking produces no reschedule messages", () => {
  assert.deepEqual(buildRescheduleNotifications(change), []);
});

test("doctor reassignment informs the patient, former doctor and new doctor", () => {
  assert.deepEqual(recipients(buildRescheduleNotifications({...change,newDoctorId: 3})), [1,2,3]);
  assert.deepEqual(recipients(buildRescheduleNotifications({...change,newDoctorId: null})), [1,2]);
  assert.deepEqual(recipients(buildRescheduleNotifications({...change,oldDoctorId: null,newDoctorId: 3})), [1,3]);
});

test("service changes notify each affected recipient once", () => {
  const drafts = buildRescheduleNotifications({...change,serviceChanged: true});
  assert.deepEqual(recipients(drafts), [1,2]);
  assert.ok(drafts.every(row => row.content.includes("đổi dịch vụ")));
});

test("time changes notify the patient and current doctor", () => {
  assert.deepEqual(recipients(buildRescheduleNotifications({...change,newStartAt: new Date("2030-01-02T03:00:00Z")})), [1,2]);
});

test("cancellation without an assigned doctor still notifies the patient", () => {
  assert.deepEqual(recipients(buildCancelNotifications(booking)), [1,2]);
  assert.deepEqual(recipients(buildCancelNotifications({...booking,doctorId: null})), [1]);
});
