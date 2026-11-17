import { singleSearchParams } from "@/lib/pagination";
import { NotificationsPage } from "@/modules/notifications/notification-list";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <NotificationsPage params={singleSearchParams(await searchParams)} role="admin" />;
}
