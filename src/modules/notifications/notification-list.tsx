import "server-only";
import Link from "next/link";
import { getNotificationsForUser, getUnreadNotificationCount } from "./server";
import { PaginationBar } from "@/components/pagination";
import { ArrowUpRight } from "lucide-react";
import type { NotificationItemDto } from "@/modules/notifications/contracts";
import { EmptyStatePanel } from "@/components/feedback";
import { formatClinicDateTime } from "@/lib/dates";
import { MarkAllNotificationsRead, NotificationReadLink } from "@/components/notification-bell.client";

export async function NotificationFeedList({ items, appointmentHrefPrefix, compact = false }: {
  items: NotificationItemDto[];
  appointmentHrefPrefix: string;
  compact?: boolean;
}) {
  if (!items.length) return <EmptyStatePanel title="Chưa có thông báo" description="Các cập nhật về lịch hẹn sẽ xuất hiện tại đây." />;
  const groups = Map.groupBy(items, item => formatClinicDateTime(new Date(item.createdAtIso), "dd/MM/yyyy"));
  return <div className="space-y-7">{Array.from(groups, ([date, notifications]) => <section key={date} aria-label={`Thông báo ngày ${date}`}>
    <h2 className="mb-3 text-sm font-medium tabular-nums text-slate-600">{date}</h2>
    <ul className="divide-y divide-[#DFE9E4] overflow-hidden rounded-md bg-white">
      {notifications.map(item => <li key={item.notificationId}>
        <NotificationReadLink id={item.notificationId} readAt={item.readAtIso} href={appointmentHrefPrefix.startsWith("/manager") ? "/manager/calendar" : appointmentHrefPrefix.startsWith("/admin") ? "/admin" : `${appointmentHrefPrefix}/${item.appointmentId}`} className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-[#EAF3EE] focus-visible:bg-[#EAF3EE] ${compact ? "" : "sm:px-6"}`}>
          <time dateTime={item.createdAtIso} className="col-start-2 row-start-1 text-sm tabular-nums text-slate-600">{formatClinicDateTime(new Date(item.createdAtIso), "HH:mm")}</time>
          <div className="col-start-1 row-start-1 min-w-0"><h3 className="break-words">{item.serviceName}</h3><p className="mt-2 break-words text-sm leading-relaxed text-slate-600">{item.content}</p></div>
          <span className="col-span-2 inline-flex min-h-8 items-center gap-2 text-sm font-medium text-[#087568]">Xem lịch hẹn <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
        </NotificationReadLink>
      </li>)}
    </ul>
  </section>)}</div>;
}

export async function NotificationsPage({ params, role }: { params: Record<string, string | undefined>; role: "patient" | "doctor" | "reception" | "manager" | "admin" }) {
  const [result, unread] = await Promise.all([
    getNotificationsForUser({ page: Number(params.page) || 1, pageSize: 20, unreadOnly: params.unread === "1" }),
    getUnreadNotificationCount(),
  ]);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold">Thông báo</h1><MarkAllNotificationsRead until={new Date().toISOString()} disabled={!unread} /></header>
    <nav aria-label="Lọc thông báo" className="flex gap-3">
      <Link href={`/${role}/notifications`} className={params.unread !== "1" ? "public-primary" : "public-secondary"} aria-current={params.unread !== "1" ? "page" : undefined}>Tất cả</Link>
      <Link href={`/${role}/notifications?unread=1`} className={params.unread === "1" ? "public-primary" : "public-secondary"} aria-current={params.unread === "1" ? "page" : undefined}>Chưa đọc</Link>
    </nav>
    <NotificationFeedList items={result.items} appointmentHrefPrefix={`/${role}/appointments`} />
    <PaginationBar page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} pageSize={result.pageSize} buildHref={page => `/${role}/notifications?page=${page}${params.unread === "1" ? "&unread=1" : ""}`} />
  </div>;
}
