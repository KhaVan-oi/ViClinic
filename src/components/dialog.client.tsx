"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useModalFocus } from "@/components/use-modal-focus";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => { },
});
const subscribeToMount = () => () => {};

export function Dialog({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
    },
    [onOpenChange]
  );

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <div
      className={cn(
        "dialog-shade fixed inset-0 z-50 bg-[#0B2545]/40",
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(DialogContext);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement>(null);
  const mounted = React.useSyncExternalStore(subscribeToMount, () => true, () => false);
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  useModalFocus(open && mounted, panelRef, triggerRef, close, true);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <DialogOverlay />
      <div
        ref={element => {
          panelRef.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          "dialog-surface relative z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-lg gap-5 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-6 text-left text-base font-normal leading-relaxed text-[#0B2545] shadow-xl [&>h2]:pr-10 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:leading-snug",
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0A6E63]"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Đóng</span>
        </button>
      </div>
    </div>, document.body
  );
});

DialogContent.displayName = "DialogContent";

export function ActionDialog({ label, title, children, destructive = false, icon, className, defaultOpen = false }: { label: string; title: string; children: React.ReactNode; destructive?: boolean; icon?: React.ReactNode; className?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const titleId = React.useId();
  return <Dialog open={open} onOpenChange={setOpen}>
    <button type="button" aria-label={label} onClick={() => setOpen(true)} className={className ?? (destructive ? "public-danger" : "public-secondary gap-2")}>{icon}{!icon && label}</button>
    <DialogContent aria-labelledby={titleId} className="max-w-3xl"><h2 id={titleId} className="pr-10 text-xl font-semibold">{title}</h2>{children}</DialogContent>
  </Dialog>;
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-2",
        className
      )}
      {...props}
    />
  );
}

DialogFooter.displayName = "DialogFooter";


export function PendingDialog({ open, label }: { open: boolean; label: string }) {
  return <Dialog open={open}>
    <DialogContent aria-label={label} className="[&>button]:hidden">
      <div role="status" className="flex items-center gap-4"><span aria-hidden="true" className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-[#0A6E63] motion-reduce:animate-none" /><p className="font-medium">{label}</p></div>
    </DialogContent>
  </Dialog>;
}
