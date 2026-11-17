import { requirePatientPageSession } from "@/server/authorization";
import { singleSearchParams } from "@/lib/pagination";
import { NotificationsPage } from "@/modules/notifications/notification-list";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!await requirePatientPageSession("/patient/notifications")) return null;
  return <NotificationsPage role="patient" params={singleSearchParams(await searchParams)} />;
}
