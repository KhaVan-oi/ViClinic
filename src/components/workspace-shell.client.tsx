"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PhoneCall, X, BookOpen, CircleHelp, Bell } from "lucide-react";
import { type SessionView } from "@/modules/identity/contracts";
import { type StaffRoleName, formatRoleLabel, getHomePathForContext } from "@/config/business";

import { NAV_BY_ROLE, PATIENT_NAV_ITEMS, type WorkspaceNavItem } from "./navigation";
import { BOOKING_GUIDE_STEPS, BOOKING_FAQS, clinicConfig } from "@/config/clinic";
import { useModalFocus } from "@/components/use-modal-focus";
import { ContextSwitcherBar } from "@/components/context-switcher.client";
import { Dialog, DialogContent } from "@/components/dialog.client";

export function WorkspaceShell({ session, role, kind, children }: {
  session: SessionView;
  role?: StaffRoleName;
  kind: "patient" | "staff";
  children: ReactNode;
}) {
  const navItems: WorkspaceNavItem[] = kind === "staff" && role ? NAV_BY_ROLE[role] : PATIENT_NAV_ITEMS;
  const label = kind === "staff" && role ? formatRoleLabel(role) : "Khám bệnh";
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [help, setHelp] = useState<"guide" | "faq" | null>(null);
  const rootHref = getHomePathForContext(session.activeContext);
  const notificationHref = `${rootHref}/notifications`;
  const open = openPath !== null && openPath === pathname;
  const close = useCallback(() => setOpenPath(null), []);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(open, panel, trigger, close);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => { if (desktop.matches) close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [close]);

  const navigation = [...navItems, { href: notificationHref, label: "Thông báo", Icon: Bell }].filter(item => ["/", "/activate", "/activate/complete", "/activate/verify", "/admin", "/admin/accounts", "/admin/accounts/[accountId]", "/admin/reactivation", "/admin/roles", "/admin/staff/new", "/choose-role", "/doctor", "/login", "/manager", "/patient", "/reactivate", "/reception", "/recover", "/recover/complete", "/recover/verify", "/register", "/register/complete", "/register/verify"].includes(item.href));
  const activeHref = navigation.filter(item => pathname === item.href ||
    (item.href !== rootHref && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  function links() {
    return navigation.map(({ href, label: title, Icon }) => (
      <Link key={href} href={href} onClick={close} title={title}
        aria-current={href === activeHref ? "page" : undefined}
        className={`flex min-h-11 w-full items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${href === activeHref ? "border-[#0D8A7C] text-[#0A6E63]" : "border-transparent text-slate-700 hover:bg-[#F3F8FA]"}`}>
        <Icon className="h-4 w-4" /><span>{title}</span>
      </Link>
    ));
  }
  return (
    <div className={`workspace-shell ${collapsed ? "workspace-collapsed" : ""} ${kind === "staff" ? "workspace-staff" : "workspace-patient"}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:bg-white focus:p-3">Chuyển đến nội dung chính</a>
      <header inert={open} className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex h-[72px] w-full items-center gap-1 px-4 sm:gap-3 sm:px-6 lg:px-8">
          <Link href="/" onNavigate={event => {
            const changed = Array.from(document.forms).some(form => form.method === "post" && Array.from(form.elements).some(field => {
              if (field instanceof HTMLInputElement) {
                if (field.disabled || ["hidden", "submit", "button", "reset"].includes(field.type)) return false;
                return ["checkbox", "radio"].includes(field.type) ? field.checked !== field.defaultChecked : field.value !== field.defaultValue;
              }
              if (field instanceof HTMLTextAreaElement) return !field.disabled && field.value !== field.defaultValue;
              if (field instanceof HTMLSelectElement) {
                const options = Array.from(field.options);
                const hasDefault = options.some(option => option.defaultSelected);
                return !field.disabled && options.some((option, index) => option.selected !== (option.defaultSelected || (!hasDefault && !field.multiple && index === 0)));
              }
              return false;
            }));
            if (changed && !window.confirm("Thông tin chưa được lưu. Bạn muốn rời trang?")) event.preventDefault();
          }} className="flex shrink-0 items-center gap-2" aria-label={`${clinicConfig.displayName} — Trang chủ`} title="Về trang chủ">
            <Image src="/images/brand/logo.webp" alt={clinicConfig.displayName} width={150} height={50} priority className="h-auto w-20 sm:w-32" />
          </Link>
          <p className="hidden border-l border-slate-200 pl-5 text-sm font-medium text-slate-600 lg:block">{clinicConfig.brandFullName}</p>
          <div className="ml-auto min-w-0"><ContextSwitcherBar session={session} /></div>
          <button ref={trigger} type="button" onClick={() => setOpenPath(pathname)}
            aria-label={`Mở menu ${label}`} aria-expanded={open}
            aria-controls="workspace-menu" className="flex min-h-11 min-w-11 items-center justify-center xl:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>
      {open && (
        <div id="workspace-menu" className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={close} aria-hidden="true" />
          <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="workspace-menu-title" tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col gap-6 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 id="workspace-menu-title" className="font-semibold">{label}</h2>
              <button type="button" onClick={close} aria-label="Đóng menu" className="flex min-h-11 min-w-11 items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <nav aria-label={`Menu ${label}`}>{links()}</nav>
            {kind === "patient" && <><div className="flex flex-col gap-2"><button type="button" className="public-secondary" onClick={() => { close(); setHelp("guide"); }}>Hướng dẫn đặt lịch</button><button type="button" className="public-secondary" onClick={() => { close(); setHelp("faq"); }}>Câu hỏi thường gặp</button></div><a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`} className="mt-auto flex min-h-11 items-center gap-2 border-t border-slate-200 pt-4 text-sm tabular-nums"><PhoneCall className="h-4 w-4" />{clinicConfig.hotline}</a></>}
          </div>
        </div>
      )}
      <div className="workspace-body">
        <aside inert={open} className="workspace-rail">
          <div className="workspace-rail-top mb-5 flex min-h-11 items-center justify-between gap-2 px-3"><span className="workspace-role text-base font-semibold">{label}</span><button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} aria-expanded={!collapsed} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-teal-50"><Menu className="h-5 w-5" /></button></div>
          <nav aria-label={`Điều hướng ${label}`}>{links()}</nav>
          {kind === "patient" && <div className="mt-4 border-t border-slate-200 pt-3">{([{key:"guide",title:"Hướng dẫn đặt lịch",Icon:BookOpen},{key:"faq",title:"Câu hỏi thường gặp",Icon:CircleHelp}] as const).map(({key,title,Icon}) => <button key={key} type="button" title={title} onClick={() => setHelp(key)} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-teal-50"><Icon className="h-4 w-4 shrink-0" /><span className="workspace-role">{title}</span></button>)}</div>}
        </aside>
        <main inert={open} id="main-content" className="workspace-main">{children}</main>
      </div>
      {kind === "patient" && <Dialog open={help !== null} onOpenChange={value => { if (!value) setHelp(null); }}><DialogContent aria-label={help === "guide" ? "Hướng dẫn đặt lịch" : "Câu hỏi thường gặp"}><h2 className="text-xl font-semibold">{help === "guide" ? "Hướng dẫn đặt lịch" : "Câu hỏi thường gặp"}</h2>{help === "guide" ? <ol className="space-y-5 text-sm leading-7">{BOOKING_GUIDE_STEPS.map(step => <li key={step.title}><h3 className="font-semibold">{step.title}</h3><p className="mt-1 text-slate-600">{step.description}</p></li>)}</ol> : <div className="divide-y divide-slate-200 text-sm">{BOOKING_FAQS.map(item=><section key={item.question} className="py-4"><h3 className="font-semibold">{item.question}</h3><p className="mt-2 leading-7 text-slate-600">{item.answer}</p></section>)}</div>}</DialogContent></Dialog>}
    </div>
  );
}
