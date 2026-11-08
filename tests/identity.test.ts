import assert from "node:assert/strict";
import test from "node:test";
import { PASSWORD_PATTERN } from "../src/config/security";
import { sanitizeNextRedirect, resolvePostAuthDestination, buildFilterHref } from "../src/lib/navigation";
import { validateRoleSet, computeDoctorDependencyBlocked, completeRegistrationDetailsSchema } from "../src/modules/identity/contracts";

test("passwords require all four character groups and the approved length", () => {
  const pattern = new RegExp(`^${PASSWORD_PATTERN}$`);
  assert.equal(pattern.test("Aa1!aaaa"), true);
  assert.equal(pattern.test("Aa1!" + "a".repeat(124)), true);
  for (const password of ["Aa1!aaa", "Aa1!" + "a".repeat(125), "aaaaaaa1!", "AAAAAAA1!", "Aaaaaaaa!", "Aaaaaaaa1", "Aa1! aaa"]) {
    assert.equal(pattern.test(password), false);
  }
});

test("post-login navigation rejects external destinations and unrelated workspaces", () => {
  for (const path of ["https://example.com", "//example.com", "/\\example.com", "/login"]) {
    assert.equal(sanitizeNextRedirect(path), null);
  }
  assert.equal(resolvePostAuthDestination("DOCTOR", "/admin/accounts"), "/doctor");
  assert.equal(resolvePostAuthDestination("PATIENT", "/patient/appointments?page=2"), "/patient/appointments?page=2");
});

test("one work role may coexist with a patient profile, but two work roles may not", () => {
  assert.equal(validateRoleSet(["PATIENT", "DOCTOR"]).valid, true);
  assert.equal(validateRoleSet(["PATIENT", "ADMIN"]).valid, true);
  assert.equal(validateRoleSet(["DOCTOR", "RECEPTIONIST"]).valid, false);
  assert.equal(validateRoleSet([]).valid, false);
});

test("each outstanding doctor dependency blocks removing the work role", () => {
  const clear = {serviceCount: 0, futureShiftCount: 0, futureUnavailabilityCount: 0, activeAppointmentCount: 0};
  assert.equal(computeDoctorDependencyBlocked(clear), false);
  for (const key of Object.keys(clear)) assert.equal(computeDoctorDependencyBlocked({...clear, [key]: 1}), true);
});

test("registration rejects a mismatched password confirmation", () => {
  const profile = {fullName: "Nguyễn Văn An", birthDate: "2000-01-01", email: "", password: "Example@123"};
  assert.equal(completeRegistrationDetailsSchema.safeParse({...profile, confirmPassword: "Example@124"}).success, false);
  assert.equal(completeRegistrationDetailsSchema.safeParse({...profile, confirmPassword: profile.password}).success, true);
});

test("filter links preserve pagination and escape values while omitting empty selections", () => {
  const href = buildFilterHref("/reception/appointments", {tab: "ALL", date: "", doctorId: null, serviceId: undefined, page: 2, status: "CONFIRMED", value: "a&b"});
  const url = new URL(href, "https://example.com");
  assert.deepEqual([...url.searchParams], [["page","2"],["status","CONFIRMED"],["value","a&b"]]);
});
