import "server-only";

import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/session";
import { getHomePathForContext, formatRoleLabel, type StaffRoleName } from "@/config/business";
import { projectSessionView } from "@/modules/identity/authentication";
import { switchContextAction } from "@/app/session-actions";
import { WorkspaceShell } from "@/components/workspace-shell.client";
import { AccessNotice } from "@/components/feedback";
import { FormSubmit } from "@/components/form-submit.client";

const LOGIN_DESTINATIONS: Record<StaffRoleName, string> = {
  RECEPTIONIST: "/reception/appointments",
  DOCTOR: "/doctor/appointments",
  CLINIC_MANAGER: "/manager/services",
  ADMIN: "/admin/accounts",
};

export async function StaffRoleLayoutGuard({ requiredRole, children }: {
  requiredRole: StaffRoleName;
  children: ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${LOGIN_DESTINATIONS[requiredRole]}`);
  if (session.activeContext !== requiredRole) {
    const canSwitch = session.staffRole === requiredRole;
    const role = formatRoleLabel(requiredRole);
    return (
      <AccessNotice title={canSwitch ? "Chuyển sang trang làm việc" : "Bạn không có quyền xem trang này"}
        message={canSwitch ? `Bạn đang xem lịch khám cá nhân. Chuyển sang trang làm việc để sử dụng các chức năng dành cho ${role}.` : `Trang này dành cho ${role}. Bạn có thể quay lại trang của mình.`}>
        {canSwitch && <form action={switchContextAction}>
          <input type="hidden" name="mode" value="WORK" />
          <FormSubmit className="public-primary">Vào trang làm việc</FormSubmit>
        </form>}
        <Link href={getHomePathForContext(session.activeContext)} className="public-text-link">Quay lại trang của tôi</Link>
      </AccessNotice>
    );
  }
  return <WorkspaceShell session={projectSessionView(session)} role={requiredRole} kind="staff">{children}</WorkspaceShell>;
}
