import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionAppointment, canPatientSelfCancel, canCompleteAppointment, confirmAppointmentSchema, completeAppointmentSchema } from "../src/modules/appointments/contracts";

test("appointments must be confirmed before completion and terminal states stay closed", () => {
  assert.equal(canTransitionAppointment("PENDING", "COMPLETED"), false);
  assert.equal(canTransitionAppointment("CONFIRMED", "COMPLETED"), true);
  for (const status of ["COMPLETED", "CANCELLED"] as const) {
    assert.equal(canTransitionAppointment(status, "CONFIRMED"), false);
  }
});

test("only the assigned doctor or reception can complete a confirmed appointment", () => {
  assert.equal(canCompleteAppointment({ actorRole: "DOCTOR", actorUserId: 2, doctorId: 1, status: "CONFIRMED" }).allowed, false);
  assert.equal(canCompleteAppointment({ actorRole: "DOCTOR", actorUserId: 1, doctorId: 1, status: "CONFIRMED" }).allowed, true);
  assert.equal(canCompleteAppointment({ actorRole: "RECEPTIONIST", actorUserId: 2, doctorId: 1, status: "CONFIRMED" }).allowed, true);
  assert.equal(canCompleteAppointment({ actorRole: "ADMIN", actorUserId: 2, doctorId: 1, status: "CONFIRMED" }).allowed, false);
});

test("patients can cancel at the two-hour boundary, not within it", () => {
  const start = new Date("2030-01-01T10:00:00+07:00");
  assert.equal(canPatientSelfCancel("CONFIRMED", start, new Date("2030-01-01T08:00:00+07:00")).allowed, true);
  assert.equal(canPatientSelfCancel("CONFIRMED", start, new Date("2030-01-01T08:00:01+07:00")).allowed, false);
});

test("warning acknowledgement rejects strings instead of treating false as consent", () => {
  for (const schema of [confirmAppointmentSchema, completeAppointmentSchema]) {
    const key = schema === confirmAppointmentSchema ? "acknowledgeOverdueWarning" : "acknowledgeEarlyWarning";
    assert.equal(schema.safeParse({appointmentId: 1, [key]: "false"}).success, false);
    assert.equal(schema.safeParse({appointmentId: 1, [key]: false}).success, true);
  }
});
