import assert from "node:assert/strict";
import test from "node:test";
import { createOrReuseStaffSchema, completeRegistrationDetailsSchema } from "../src/modules/identity/contracts";
import { patientContextInputSchema } from "../src/modules/patients/contracts";
import { birthDateSchema } from "../src/lib/profile";

test("birth dates start at 1900-01-01", () => {
  assert.equal(birthDateSchema.safeParse("1899-12-31").success, false);
  assert.equal(birthDateSchema.safeParse("0001-01-01").success, false);
  assert.equal(birthDateSchema.safeParse("1900-01-01").success, true);
});

const profile = { fullName: "Nguyễn Văn An", birthDate: "2000-02-29", email: "", phone: "0901234567" };

test("staff, registration and reception reject future birth dates", () => {
  const futureProfile = { ...profile, birthDate: "2999-01-01" };
  assert.equal(createOrReuseStaffSchema.safeParse({ ...futureProfile, staffRole: "DOCTOR" }).success, false);
  assert.equal(patientContextInputSchema.safeParse(futureProfile).success, false);
  assert.equal(completeRegistrationDetailsSchema.safeParse({ ...futureProfile, password: "Example@123", confirmPassword: "Example@123" }).success, false);
});

test("optional email respects the database length at every profile boundary", () => {
  const email = `${"a".repeat(60)}@${"b".repeat(60)}.com`;
  assert.equal(createOrReuseStaffSchema.safeParse({ ...profile, email, staffRole: "DOCTOR" }).success, false);
  assert.equal(patientContextInputSchema.safeParse({ ...profile, email }).success, false);
});

test("valid leap date and blank email remain accepted", () => {
  assert.equal(createOrReuseStaffSchema.safeParse({ ...profile, staffRole: "DOCTOR" }).success, true);
  assert.equal(patientContextInputSchema.safeParse(profile).success, true);
  assert.equal(patientContextInputSchema.safeParse({ ...profile, birthDate: "2001-02-29" }).success, false);
});
