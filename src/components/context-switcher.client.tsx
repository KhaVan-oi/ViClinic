"use client";

import { MIN_BIRTH_DATE_ISO } from "@/config/business";

import { formatClinicIsoDate } from "@/lib/dates";

import { useActionState, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import type { SessionView } from "@/modules/identity/contracts";
import { formatRoleLabel, getHomePathForContext } from "@/config/business";
import { Dialog, DialogContent } from "@/components/dialog.client";
import { FormSubmit } from "@/components/form-submit.client";
import { enablePersonalPatientContextAction, logoutAction, switchContextAction, updateOwnProfileAction } from "@/app/session-actions";

export function ContextSwitcherBar({ session, showHomeLink = false }: { session: SessionView; showHomeLink?: boolean }) {
  const personal = session.activeContext === "PATIENT";
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileResult, saveProfile] = useActionState(
    (_: { error?: string; saved?: boolean } | null, data: FormData) => updateOwnProfileAction(data), null,
  );

  return (
    <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-3">
      {showHomeLink && <Link href={getHomePathForContext(session.activeContext)} className="min-h-11 inline-flex shrink-0 items-center whitespace-nowrap text-sm font-semibold text-[#0A6E63]">
        <span className="sm:hidden">{personal ? "Lịch khám" : "Công việc"}</span><span className="hidden sm:inline">{personal ? "Lịch khám của tôi" : "Vào làm việc"}</span>
      </Link>}

      <button type="button" aria-label="Tài khoản" title="Tài khoản" aria-haspopup="dialog" aria-expanded={accountOpen} onClick={() => setAccountOpen(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-slate-100">
          <UserRound className="h-5 w-5" aria-hidden="true" />
      </button>
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent aria-label="Thông tin tài khoản">
          <h2>Thông tin tài khoản</h2>
          <p className="mt-3 break-words text-base font-semibold">{session.fullName}</p>
          <p className="mt-1 tabular-nums text-slate-600">{session.phone}</p>
          <p className="mt-1 text-slate-600">{formatRoleLabel(session.activeContext)}</p>
          <button type="button" className="public-secondary justify-self-start" onClick={() => {
            setAccountOpen(false);
            setProfileOpen(true);
          }}>Chỉnh sửa thông tin cá nhân</button>
          {session.staffRole && <div className="mt-4 border-t border-slate-200 pt-3">
            {session.hasPatientRole ? [
              { mode: "WORK", label: "Chuyển sang công việc", active: !personal },
              { mode: "PERSONAL", label: "Lịch khám của tôi", active: personal },
            ].filter(item => !item.active).map(item => <form action={switchContextAction} key={item.mode}>
              <input type="hidden" name="mode" value={item.mode} />
              <FormSubmit className="min-h-11 text-[#0A6E63] font-medium">{item.label}</FormSubmit>
            </form>) : <PersonalBookingSetup session={session} />}
          </div>}
          <form action={logoutAction} className="mt-3 border-t border-slate-200 pt-3">
            <FormSubmit className="inline-flex min-h-11 items-center gap-2 text-slate-700"><LogOut className="h-4 w-4" aria-hidden="true" />Đăng xuất</FormSubmit>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent aria-labelledby="personal-profile-title" aria-describedby="personal-profile-description">
          <h2 id="personal-profile-title" className="text-2xl font-semibold">Thông tin cá nhân</h2>
          <p id="personal-profile-description" className="text-sm text-slate-600">Cập nhật thông tin dùng khi đặt lịch và liên hệ.</p>
          <form action={saveProfile} className="space-y-5">
            {profileResult?.error && <p role="alert" className="text-sm text-rose-800">{profileResult.error}</p>}
            {profileResult?.saved && <p role="status" className="text-sm text-[#0A6E63]">Đã lưu thông tin cá nhân.</p>}
            <div><label htmlFor="profile-name" className="text-sm font-medium">Họ và tên</label><input id="profile-name" name="fullName" autoComplete="name" minLength={2} maxLength={120} required defaultValue={session.fullName} className="public-control mt-2" /></div>
            <div><label htmlFor="profile-birth-date" className="text-sm font-medium">Ngày sinh</label><input id="profile-birth-date" name="birthDate" type="date" min={MIN_BIRTH_DATE_ISO} max={formatClinicIsoDate(new Date())} autoComplete="bday" required defaultValue={session.birthDate?.slice(0,10) ?? ""} className="public-control mt-2" /></div>
            <div><label htmlFor="profile-email" className="text-sm font-medium">Email (tùy chọn)</label><input id="profile-email" name="email" type="email" autoComplete="email" maxLength={120} defaultValue={session.email ?? ""} className="public-control mt-2" /></div>
            <p className="text-sm text-slate-600">Số điện thoại đăng nhập: <strong className="tabular-nums">{session.phone}</strong></p>
            <div className="flex justify-end gap-3"><button type="button" className="public-secondary" onClick={() => setProfileOpen(false)}>Đóng</button><FormSubmit className="public-primary">Lưu thay đổi</FormSubmit></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PersonalBookingSetup({ session, nextPath }: { session: SessionView; nextPath?: string | null }) {
  const [open, setOpen] = useState(false);
  const [result, enableAction] = useActionState<{ error: string; } | null, FormData>(
    (_, data) => enablePersonalPatientContextAction(data), null,
  );
  const birthDate = session.birthDate?.slice(0, 10) ?? "";
  return (
        <Dialog open={open} onOpenChange={setOpen}>
          <button type="button" onClick={() => setOpen(true)} className="min-h-11 shrink-0 text-sm font-medium text-[#0A6E63] rounded-md px-3 no-underline hover:bg-slate-100">Đặt lịch cho tôi</button>
          <DialogContent aria-labelledby="enable-personal-patient-modal-title" aria-describedby="enable-personal-patient-description">
            <h2 id="enable-personal-patient-modal-title" className="pr-8 text-xl font-semibold">Đặt lịch khám cho bản thân</h2>
            <p id="enable-personal-patient-description" className="text-sm leading-relaxed text-slate-700">Bổ sung thông tin để đặt lịch cho chính bạn trên cùng tài khoản.</p>
            <form action={enableAction} className="space-y-5">
              {nextPath && <input type="hidden" name="next" value={nextPath} />}
              {result?.error && <p id="personal-context-error" role="alert" className="text-sm text-rose-800">{result.error}</p>}
              {!birthDate ? <div>
                <label htmlFor="p-bd" className="block text-sm font-medium">Ngày sinh</label>
                <input id="p-bd" name="birthDate" type="date" min={MIN_BIRTH_DATE_ISO} max={formatClinicIsoDate(new Date())} required aria-describedby={result?.error ? "personal-context-error" : undefined} className="public-control mt-2 tabular-nums min-w-0" />
              </div> : <input type="hidden" name="birthDate" value={birthDate} />}
              {!session.email && <div>
                <label htmlFor="p-em" className="block text-sm font-medium">Email (tùy chọn)</label>
                <input id="p-em" name="email" type="email" autoComplete="email" maxLength={120} aria-describedby={result?.error ? "personal-context-error" : undefined} className="public-control mt-2 min-w-0" />
              </div>}
              <div className="flex flex-wrap items-center justify-end gap-4">
                <button type="button" onClick={() => setOpen(false)} className="min-h-11 text-sm rounded-md px-3 no-underline hover:bg-slate-100">Để sau</button>
                <FormSubmit className="public-primary">Tiếp tục đặt lịch</FormSubmit>
              </div>
            </form>
          </DialogContent>
        </Dialog>
  );
}
