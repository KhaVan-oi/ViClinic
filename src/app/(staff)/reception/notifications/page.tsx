import { singleSearchParams } from "@/lib/pagination";
import { NotificationsPage } from "@/modules/notifications/notification-list";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <NotificationsPage role="reception" params={singleSearchParams(await searchParams)} />;
}
