"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revokeCurrentSession, getCurrentSession, switchSessionContext } from "@/server/session";
import { type RoleName } from "@/config/business";
import { enablePersonalPatientForCurrentStaff } from "@/modules/identity/staff";
import { resolvePostAuthDestination } from "@/lib/navigation";
import { isDomainError } from "@/lib/errors";
import { requireAuthenticated } from "@/server/authorization";
import { db, mapDatabaseConstraintError } from "@/server/db";
import { updatePatientBasicProfileSchema } from "@/modules/patients/contracts";

export async function updateOwnProfileAction(formData: FormData): Promise<{ error?: string; saved?: boolean }> {
  const session = await requireAuthenticated();
  const profile = updatePatientBasicProfileSchema.omit({ userId: true }).safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    birthDate: String(formData.get("birthDate") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? ""),
  });
  if (!profile.success) return { error: profile.error.issues[0]?.message ?? "Thông tin chưa hợp lệ." };
  try {
  await db.user.update({ where: { userId: session.userId }, data: {
    fullName: profile.data.fullName,
    birthDate: profile.data.birthDate ? new Date(`${profile.data.birthDate}T00:00:00Z`) : null,
    email: profile.data.email || null,
  } }).catch(mapDatabaseConstraintError);
  } catch (error) { return { error: isDomainError(error) ? error.message : "Không thể cập nhật hồ sơ." }; }
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function switchContextAction(formData: FormData) {
  const targetMode = String(formData.get("mode") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim() || null;
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  let targetRole: RoleName;
  if (targetMode === "PERSONAL") {
    targetRole = "PATIENT";
  } else {
    targetRole = session.staffRole ?? session.activeContext;
  }

  const updated = await switchSessionContext(targetRole);
  revalidatePath("/", "layout");
  redirect(resolvePostAuthDestination(updated.activeContext, nextPath));
}

export async function enablePersonalPatientContextAction(formData: FormData) {
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  try {
    await enablePersonalPatientForCurrentStaff(
      {
        birthDate: birthDate || null,
        email: email || null,
      },
      session
    );
  } catch (error) {
    if (isDomainError(error)) return { error: error.message };
    throw error;
  }

  const updated = await switchSessionContext("PATIENT");
  revalidatePath("/", "layout");
  redirect(resolvePostAuthDestination(updated.activeContext, String(formData.get("next") ?? "")));
}

export async function logoutAction() {
  await revokeCurrentSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
