"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, PhoneCall, X } from "lucide-react";
import { BOOKING_GUIDE_STEPS, clinicConfig } from "@/config/clinic";
import { type SessionView } from "@/modules/identity/contracts";
import { useModalFocus } from "@/components/use-modal-focus";
import { ContextSwitcherBar } from "@/components/context-switcher.client";
import { Dialog, DialogContent } from "@/components/dialog.client";

const navigation = [
  { href: "/services", label: "Dịch vụ khám" },
  { href: "/doctors", label: "Bác sĩ" },
  { href: "#lien-he-footer", label: "Liên hệ" },
];

export function PublicHeaderClient({ session }: { session: SessionView | null; }) {
  const pathname = usePathname();
  const [guideOpen, setGuideOpen] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath !== null && openPath === pathname;
  const close = useCallback(() => setOpenPath(null), []);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(open, panel, trigger, close);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const resize = () => { if (desktop.matches) close(); };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, [close]);

  function links() {
    return <>{navigation.map(({ href, label }) => (
      <Link key={href} href={href} onClick={close}
        aria-current={pathname === href ? "page" : undefined}
        className={`flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${pathname === href ? "border-[#0D8A7C] text-[#0A6E63]" : "border-transparent text-slate-700 hover:text-[#0A6E63]"}`}>
        {label}
      </Link>
    ))}<button type="button" onClick={() => { close(); setGuideOpen(true); }} className="flex min-h-11 items-center px-3 text-sm font-medium text-slate-700 hover:text-[#0A6E63]">Hướng dẫn đặt lịch</button></>;
  }
  function actions() {
    return session ? (
      <ContextSwitcherBar session={session} showHomeLink />
    ) : (
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/login" onClick={close} className="inline-flex min-h-11 items-center text-sm font-semibold">Đăng nhập</Link>
        <Link href="/login?next=/patient/book" onClick={close} className="public-primary">Đặt lịch khám</Link>
      </div>
    );
  }
  return (
    <header className="public-header sticky top-0 z-30 border-b border-slate-200 bg-white">
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}><DialogContent aria-label="Hướng dẫn đặt lịch"><h2 className="mb-5 text-xl font-semibold">Hướng dẫn đặt lịch</h2><ol className="space-y-5 text-sm leading-7">{BOOKING_GUIDE_STEPS.map(step => <li key={step.title}><h3 className="font-semibold">{step.title}</h3><p className="mt-1 text-slate-600">{step.description}</p></li>)}</ol></DialogContent></Dialog>
      <div inert={open}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label={clinicConfig.displayName} className="flex shrink-0 items-center gap-2">
            <Image src="/images/brand/logo.webp" alt={clinicConfig.displayName} width={180} height={60} priority className={session ? "h-auto w-20 sm:w-36" : "h-auto w-40 sm:w-44"} />
          </Link>
          <nav aria-label="Điều hướng chính" className="public-main-navigation">{links()}</nav>
          <div className={session ? "min-w-0 flex-1 xl:flex-none" : "hidden min-w-0 xl:block"}>{actions()}</div>
          <button ref={trigger} type="button" onClick={() => setOpenPath(pathname)}
            aria-expanded={open} aria-controls="public-navigation" aria-label="Mở menu điều hướng"
            className="flex min-h-11 min-w-11 items-center justify-center xl:hidden"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      {open && (
        <div id="public-navigation" className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={close} />
          <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="public-menu-title" tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col gap-6 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 id="public-menu-title" className="text-lg font-semibold">{clinicConfig.displayName}</h2>
              <button type="button" onClick={close} aria-label="Đóng menu" className="flex min-h-11 min-w-11 items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <nav aria-label="Điều hướng di động">{links()}</nav>
            <div className="mt-auto space-y-5 border-t border-slate-200 pt-5">
              {!session && actions()}
              <a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`} className="flex min-h-11 items-center gap-2 text-sm tabular-nums"><PhoneCall className="h-4 w-4" />{clinicConfig.hotline}</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

