import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/session";
import { getHomePathForContext } from "@/config/business";
import { WorkspaceShell } from "@/components/workspace-shell.client";
import { PersonalBookingSetup } from "@/components/context-switcher.client";
import { AccessNotice } from "@/components/feedback";
import { FormSubmit } from "@/components/form-submit.client";
import { projectSessionView } from "@/modules/identity/authentication";
import { switchContextAction } from "@/app/session-actions";

export default async function PatientLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/patient");
  const view = projectSessionView(session);
  if (session.activeContext !== "PATIENT") return (
    <AccessNotice title="Đặt lịch khám cho bản thân"
      message={session.hasPatientRole ? "Bạn đang ở trang làm việc. Chuyển sang lịch khám cá nhân để đặt và xem lịch hẹn của mình." : "Bạn có thể dùng tài khoản nhân sự này để đặt lịch cho bản thân. Bổ sung thông tin còn thiếu để tiếp tục."}>
      {session.hasPatientRole ? <form action={switchContextAction}>
        <input type="hidden" name="mode" value="PERSONAL" />
        <FormSubmit className="public-primary">Xem lịch khám của tôi</FormSubmit>
      </form> : <PersonalBookingSetup session={view} />}
      <Link href={getHomePathForContext(session.activeContext)} className="public-text-link">Quay lại trang làm việc</Link>
    </AccessNotice>
  );
  return <WorkspaceShell session={view} kind="patient">{children}</WorkspaceShell>;
}
