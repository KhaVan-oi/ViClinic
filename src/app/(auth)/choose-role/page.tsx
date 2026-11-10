import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/session";
import { getHomePathForContext, formatRoleLabel } from "@/config/business";
import { singleSearchParams } from "@/lib/pagination";
import { sanitizeNextRedirect } from "@/lib/navigation";
import { switchContextAction } from "@/app/session-actions";
import { FormSubmit } from "@/components/form-submit.client";
import { PersonalBookingSetup } from "@/components/context-switcher.client";
import { projectSessionView } from "@/modules/identity/authentication";

export const dynamic = "force-dynamic";

export default async function ChooseRolePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const next = sanitizeNextRedirect(singleSearchParams(await searchParams).next);
  if (!session.staffRole) redirect(next?.startsWith("/patient/") ? next : getHomePathForContext(session.activeContext));
  if (!session.hasPatientRole) return <div className="space-y-5"><h1 className="text-2xl font-semibold">Đặt lịch khám cho bản thân</h1><p className="text-sm leading-relaxed text-slate-700">Hoàn tất hồ sơ người khám bệnh để đặt lịch bằng tài khoản hiện có.</p><PersonalBookingSetup session={projectSessionView(session)} nextPath={next} /></div>;
  const options = [
    { mode: "PERSONAL", title: "Lịch khám của tôi", description: "Đặt lịch khám và xem các lịch hẹn của bản thân." },
    { mode: "WORK", title: `Làm việc với vai trò ${formatRoleLabel(session.staffRole)}`, description: "Tiếp tục các công việc tại phòng khám." },
  ];
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Bạn muốn làm gì?</h1>
        <p className="text-sm leading-relaxed text-slate-700">Bạn có thể dùng tài khoản này để làm việc tại phòng khám hoặc đặt lịch cho bản thân.</p>
      </header>
      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {options.map(option => <form key={option.mode} action={switchContextAction} className="space-y-2 py-5">
          <input type="hidden" name="mode" value={option.mode} />
          {next && <input type="hidden" name="next" value={next} />}
          <FormSubmit className="public-secondary">{option.title}</FormSubmit>
          <p className="text-sm text-slate-700">{option.description}</p>
        </form>)}
      </div>
    </div>
  );
}
