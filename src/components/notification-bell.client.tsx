"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PendingDialog } from "./dialog.client";
import { Bell, X } from "lucide-react";
import type { NotificationItemDto } from "@/modules/notifications/contracts";

type Preview = { items: NotificationItemDto[]; unread: number; now: string };

async function markRead(id?: number, until?: string) {
  try {
  const response = await fetch('/api/ui/notifications', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify(id ? { id } : { until }),
  });
  if (response.ok) window.dispatchEvent(new Event('viclinic-notification-read'));
  return response.ok;
  } catch { return false; }
}

export function MarkAllNotificationsRead({ until, disabled }: { until: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function markAll() {
    setPending(true);
    setError(false);
    const saved = await markRead(undefined, until);
    setPending(false);
    if (saved) router.refresh();
    else setError(true);
  }
  return <div className="space-y-2">
    <PendingDialog open={pending} label="Đang cập nhật thông báo…" />
    <button type="button" className="public-secondary" disabled={disabled || pending} onClick={() => void markAll()}>Đánh dấu đã đọc tất cả</button>
    {error && <p role="alert" className="text-sm text-rose-800">Chưa cập nhật được thông báo. Vui lòng thử lại.</p>}
  </div>;
}

export function NotificationReadLink({ id, readAt, href, className, children }: { id: number; readAt: string | null; href: string; className: string; children: ReactNode }) {
  return <Link href={href} className={`${className} ${readAt ? "bg-white font-normal" : "bg-[#edf6f5] font-semibold text-[#174954] [&_p]:text-[#174954]"}`} onClick={() => { void markRead(id); }}>{children}</Link>;
}

export function NotificationBell({ href, userKey }: { href: string; userKey: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0);
  const invalidateRequests = useCallback(() => { requestId.current++; }, []);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const response = await fetch('/api/ui/notifications', { cache: 'no-store' });
      if (!response.ok) throw new Error("notifications");
      const data = await response.json();
      if (id === requestId.current) {setPreview(data); setError("");}
    } catch { if (id === requestId.current) setError("Chưa tải được thông báo. Thử lại."); }
  }, []);
  useEffect(() => {
    function update() { void load(); }
    update();
    window.addEventListener("viclinic-notification-read",update);window.addEventListener("focus",update);
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => {invalidateRequests();clearInterval(timer);window.removeEventListener("viclinic-notification-read",update);window.removeEventListener("focus",update);};
  }, [load, userKey, invalidateRequests]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const unread = preview?.unread ?? 0;
  return <div className="relative" onKeyDown={event => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ""}`} aria-expanded={open} aria-controls="notification-preview" onClick={() => { setOpen(value => !value); void load(); }} className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-slate-100">
      <Bell className={`h-5 w-5 ${unread ? "notification-ring" : ""}`} aria-hidden="true" />
      {unread > 0 && <span className="absolute right-0 top-0 min-w-5 rounded-full bg-rose-700 px-1 text-center text-xs font-bold leading-5 text-white tabular-nums" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <div ref={panel} id="notification-preview" role="region" aria-label="Thông báo gần đây" className="notification-preview">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3"><h2 className="text-lg font-semibold">Thông báo</h2><button type="button" aria-label="Đóng thông báo" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="flex h-11 w-11 items-center justify-center"><X className="h-4 w-4" /></button></div>
      {error ? <button type="button" onClick={() => void load()} className="p-5 text-sm text-rose-800">{error}</button> : !preview ? <p role="status" className="p-5 text-sm">Đang tải thông báo…</p> : !preview.items.length ? <p className="p-5 text-sm text-slate-600">Chưa có thông báo mới.</p> : <ul className="max-h-[min(60dvh,420px)] divide-y divide-slate-200 overflow-y-auto">{preview.items.map(item => {
        const unseen = !item.readAtIso;
        return <li key={item.notificationId}><Link href={href.startsWith("/manager") || href.startsWith("/admin") ? href : `${href.replace(/\/notifications$/, "/appointments")}/${item.appointmentId}`} onClick={() => { void markRead(item.notificationId); setOpen(false); }} className={`block space-y-2 px-5 py-4 hover:bg-teal-50 ${unseen ? "bg-[#edf6f5] font-semibold text-[#174954]" : "bg-white font-normal"}`}><span className="flex items-start gap-2"><span className="min-w-0 break-words text-sm">{item.content}</span>{unseen && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-700" aria-label="Chưa đọc" />}</span><time dateTime={item.createdAtIso} className="block text-xs font-normal tabular-nums text-slate-600">{item.createdAtLabel}</time></Link></li>;
      })}</ul>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3"><Link href={href} onClick={() => setOpen(false)} className="public-text-link">Xem tất cả</Link>{unread > 0 && preview && <MarkAllNotificationsRead until={preview.now} disabled={false} />}</div>
    </div>}
  </div>;
}
