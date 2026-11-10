"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Dialog, DialogContent } from "@/components/dialog.client";

const FEEDBACK = {
  info: { color: "text-slate-700", surface: "border-slate-200 bg-[#f3f7f8]", title: "Thông tin" },
  success: { color: "text-[#175c50]", surface: "border-[#d5e5df] bg-[#edf6f3]", title: "Đã hoàn tất" },
  warning: { color: "text-[#174954]", surface: "border-[#cbdce0] bg-[#eef4f5]", title: "Cần lưu ý" },
  error: { color: "text-rose-900", surface: "border-rose-200 bg-rose-50", title: "Không thể hoàn tất" },
  conflict: { color: "text-rose-900", surface: "border-rose-200 bg-rose-50", title: "Cần xử lý trước khi tiếp tục" },
};

export function FeedbackBanner({ variant, title, message, children, className, dialog = false }: {
  variant: keyof typeof FEEDBACK;
  title?: string;
  message: string;
  children?: ReactNode;
  className?: string;
  dialog?: boolean;
}) {
  const router = useRouter();
  const { color, surface, title: defaultTitle } = FEEDBACK[variant];
  const feedbackKey = `${variant}:${title}:${message}`;
  const [dismissed, setDismissed] = useState("");
  function close() {
    setDismissed(feedbackKey);
    if (!dialog) return;
    const url = new URL(location.href);
    for (const key of ["error", "created", "updated", "confirmed", "cancelled", "completed", "rescheduled", "createdPatient", "roleUpdated", "permitted", "reused", "disabled", "assigned", "removed", "deactivated", "changeBlocked"]) url.searchParams.delete(key);
    if (url.href !== location.href) router.replace(url.pathname + url.search, { scroll: false });
  }
  if (dialog) return (
    <Dialog open={dismissed !== feedbackKey} onOpenChange={open => { if (!open) close(); }}>
      <DialogContent aria-label={title ?? defaultTitle}>
        <h2 className={cn("pr-10 text-xl font-semibold", variant === "error" || variant === "conflict" ? "text-rose-800" : "text-[#0b2545]")}>{title ?? defaultTitle}</h2>
        {message && message !== title && <p className="text-sm leading-7 text-slate-700">{message}</p>}
        {children}
        <div className="flex justify-end"><button type="button" className="public-primary" onClick={close}>Đã hiểu</button></div>
      </DialogContent>
    </Dialog>
  );
  if (dismissed === feedbackKey) return null;
  return (
    <div role={variant === "error" || variant === "conflict" ? "alert" : "status"} className={cn("min-w-0 max-w-full space-y-2 rounded-md border p-4 text-sm", surface, color, className)}>
      <p className="font-semibold leading-relaxed">{title ?? defaultTitle}</p>
      {message && message !== title && <p className="max-w-[65ch] leading-relaxed">{message}</p>}
      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
export function EmptyStatePanel({ title, description, action }: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-3 border-y border-slate-200 py-8">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="max-w-xl text-sm leading-relaxed text-slate-700">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export function AccessNotice({ title, message, children }: {
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F8FA] px-4 py-10">
      <section className="w-full max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-base leading-relaxed text-slate-700">{message}</p>
        <div className="flex flex-wrap items-center gap-4">{children}</div>
      </section>
    </main>
  );
}
