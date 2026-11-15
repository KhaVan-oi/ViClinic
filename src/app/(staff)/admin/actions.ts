"use server";

import { type StaffRoleName } from "@/config/business";
import { changeStaffRole, createOrReuseStaff } from "@/modules/identity/staff";
import { disableAccount, permitReactivation } from "@/modules/identity/accounts";
import { createSafeAction, encodeActionError } from "@/server/actions";

export const adminCreateStaffAction = createSafeAction({
  parse: (formData) => ({
    phone: String(formData.get("phone") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    staffRole: String(formData.get("staffRole") ?? "RECEPTIONIST") as StaffRoleName,
    includePatientRole: formData.get("includePatientRole") === "true",
  }),
  handler: async (input) => {
    return await createOrReuseStaff({
      ...input,
      birthDate: input.birthDate || null,
      email: input.email || null,
    });
  },
  revalidatePaths: ["/admin", "/admin/accounts", "/admin/roles"],
  redirectTo: (res) =>
    `/admin/accounts/${res.accountId}?created=1&reused=${res.reusedIdentity ? "1" : "0"}${res.activationOtpSent === false ? "&activationDelivery=failed" : ""}`,
  onErrorRedirect: (err, input) =>
    `/admin/staff/new?phone=${encodeURIComponent(
      input.phone
    )}&fullName=${encodeURIComponent(input.fullName)}&birthDate=${encodeURIComponent(input.birthDate)}&email=${encodeURIComponent(input.email)}&staffRole=${encodeURIComponent(input.staffRole)}&includePatientRole=${input.includePatientRole}&error=${encodeActionError(err)}`,
});

export const adminChangeStaffRoleAction = createSafeAction({
  parse: (formData) => {
    const nextStaffRoleRaw = String(formData.get("nextStaffRole") ?? "").trim();
    return {
      userId: Number(formData.get("userId") ?? 0),
      accountId: Number(formData.get("accountId") ?? 0),
      nextStaffRole: nextStaffRoleRaw ? (nextStaffRoleRaw as StaffRoleName) : null,
      keepPatientRole: formData.get("keepPatientRole") === "true",
      birthDate: String(formData.get("birthDate") ?? "").trim() || undefined,
      returnTo: String(formData.get("returnTo") ?? "account").trim(),
    };
  },
  handler: async ({ userId, nextStaffRole, keepPatientRole, birthDate }) => {
    return await changeStaffRole({ userId, nextStaffRole, keepPatientRole, birthDate });
  },
  revalidatePaths: ["/admin", "/admin/accounts", "/admin/roles"],
  redirectTo: (_, input) => {
    if (input.returnTo === "roles") {
      return `/admin/roles?updated=1&userId=${input.userId}`;
    }
    return `/admin/accounts/${input.accountId}?roleUpdated=1`;
  },
  onErrorRedirect: (err, input) => {
    if (input.returnTo === "roles") {
      return `/admin/roles?error=${encodeActionError(err)}&blockedUserId=${input.userId}`;
    }
    return `/admin/accounts/${input.accountId}?error=${encodeActionError(err)}`;
  },
});

export const adminDisableAccountAction = createSafeAction({
  parse: (formData) => ({
    accountId: Number(formData.get("accountId") ?? 0),
    returnTo: String(formData.get("returnTo") ?? "account"),
  }),
  handler: async ({ accountId }) => {
    return await disableAccount({ accountId });
  },
  revalidatePaths: ["/admin", "/admin/accounts", "/admin/reactivation"],
  redirectTo: (_, { accountId, returnTo }) => returnTo === "reactivation" ? "/admin/reactivation?disabled=1" : `/admin/accounts/${accountId}?disabled=1`,
  onErrorRedirect: (err, { accountId }) =>
    `/admin/accounts/${accountId}?error=${encodeActionError(err)}`,
});

export const adminPermitReactivationAction = createSafeAction({
  parse: (formData) => ({
    accountId: Number(formData.get("accountId") ?? 0),
    returnTo: String(formData.get("returnTo") ?? "account").trim(),
  }),
  handler: async ({ accountId }) => {
    return await permitReactivation({ accountId });
  },
  revalidatePaths: ["/admin", "/admin/accounts", "/admin/reactivation"],
  redirectTo: (res, input) => {
    const dest =
      input.returnTo === "reactivation"
        ? `/admin/reactivation`
        : `/admin/accounts/${input.accountId}`;
    return `${dest}?permitted=1&phone=${encodeURIComponent(res.phone)}`;
  },
  onErrorRedirect: (err, input) => {
    const dest =
      input.returnTo === "reactivation"
        ? `/admin/reactivation`
        : `/admin/accounts/${input.accountId}`;
    return `${dest}?error=${encodeActionError(err)}`;
  },
});
