"use client";

import { MIN_BIRTH_DATE_ISO } from "@/config/business";

import { useState, type ReactNode } from "react";
import { adminChangeStaffRoleAction } from "./actions";
import { FormSubmit } from "@/components/form-submit.client";
import { STAFF_ROLES, formatRoleLabel, type StaffRoleName } from "@/config/business";
import { formatClinicIsoDate } from "@/lib/dates";

export function StaffRoleForm({ user, returnTo, children }: {
  user: { userId: number; accountId: number | null; staffRole: StaffRoleName | null; hasPatientRole: boolean; birthDate: string | null };
  returnTo: "account" | "roles";
  children?: ReactNode;
}) {
  const [nextRole, setNextRole] = useState(user.staffRole ?? "");
  return <form action={adminChangeStaffRoleAction} className="grid gap-5">
    <input type="hidden" name="userId" value={user.userId} />
    <input type="hidden" name="accountId" value={user.accountId ?? 0} />
    <input type="hidden" name="returnTo" value={returnTo} />
    <label className="text-sm font-medium">Vai trò công việc
      <select name="nextStaffRole" value={nextRole} onChange={event => setNextRole(event.target.value)} className="public-control mt-2">
        <option value="">Không có vai trò nhân sự</option>
        {STAFF_ROLES.map(role => <option key={role} value={role}>{formatRoleLabel(role)}</option>)}
      </select>
    </label>
    {!user.birthDate && <label className="text-sm font-medium">Ngày sinh
      <input type="date" name="birthDate" required min={MIN_BIRTH_DATE_ISO} max={formatClinicIsoDate(new Date())} className="public-control mt-2" />
    </label>}
    {user.hasPatientRole && <input type="hidden" name="keepPatientRole" value="true" />}
    <label className="inline-flex items-center gap-3 text-sm">
      <input type="checkbox" name="keepPatientRole" value="true" defaultChecked={user.hasPatientRole} disabled={user.hasPatientRole} className="h-4 w-4" />
      Cho phép đặt lịch cho bản thân
    </label>
    {user.staffRole === "DOCTOR" && nextRole !== "DOCTOR" && children}
    <div className="flex justify-end"><FormSubmit className="public-primary">Lưu thay đổi</FormSubmit></div>
  </form>;
}
