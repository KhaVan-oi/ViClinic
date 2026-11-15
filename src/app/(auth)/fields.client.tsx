"use client";

import { MIN_BIRTH_DATE_ISO } from "@/config/business";

import { formatClinicIsoDate, formatDateOnlyDisplay } from "@/lib/dates";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { PASSWORD_PATTERN, PASSWORD_RULE_MESSAGE } from "@/config/security";
import {
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
} from "lucide-react";

export function RegistrationCompletionForm({action, phone, profile, children}: {
  action: (data: FormData) => Promise<void> | void;
  phone: string;
  profile: {fullName: string; birthDate: string; email: string} | null;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(!profile || !profile.birthDate);
  const [confirmed, setConfirmed] = useState(false);
  const [values, setValues] = useState(profile ?? {fullName: "", birthDate: "", email: ""});
  const form = useRef<HTMLFormElement>(null);
  const fields = [{name: "fullName", label: "Họ và tên", type: "text"}, {name: "birthDate", label: "Ngày sinh", type: "date"}, {name: "email", label: "Email (không bắt buộc)", type: "email"}] as const;
  return <form ref={form} action={action} className="space-y-5" onSubmit={event => {
    if (!confirmed) {event.preventDefault();setConfirmed(true);}
  }}>
    <input type="hidden" name="phone" value={phone} />
    {!confirmed && profile && <p className="text-sm leading-6">Bạn đã có hồ sơ khám bệnh. Vui lòng kiểm tra thông tin trước khi tạo tài khoản.</p>}
    <div hidden={confirmed}>
      {editing ? <div className="space-y-4">{fields.map(field => <label key={field.name} className="block text-sm font-medium">{field.label}
        <input name={field.name} type={field.type} min={field.type === "date" ? MIN_BIRTH_DATE_ISO : undefined} max={field.type === "date" ? formatClinicIsoDate(new Date()) : undefined} required={field.name !== "email"} maxLength={field.name === "fullName" ? 120 : undefined} value={values[field.name]} onChange={event => setValues({...values, [field.name]: event.target.value})} className="auth-profile-input" />
      </label>)}</div> : <dl className="space-y-4">{fields.map(field => <div key={field.name}><dt className="text-sm text-slate-600">{field.label}</dt><dd className="mt-1 font-semibold">{field.name === "birthDate" ? formatDateOnlyDisplay(values.birthDate) : values[field.name] || "Chưa có"}</dd><input type="hidden" name={field.name} value={values[field.name]} /></div>)}</dl>}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {!editing && <button type="button" className="public-secondary" onClick={() => setEditing(true)}>Điều chỉnh thông tin</button>}
        <button type="button" className="public-primary" onClick={() => {if(form.current?.reportValidity()) {setConfirmed(true);setEditing(false);}}}>Xác nhận thông tin</button>
      </div>
    </div>
    {confirmed && <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3"><p className="font-medium">{values.fullName}</p><button type="button" className="public-text-link" onClick={() => setConfirmed(false)}>Xem lại thông tin</button></div>{children}</>}
  </form>;
}

export function PhoneInput({ id, defaultValue = "" }: { id: string; defaultValue?: string }) {
  const [national, setNational] = useState(defaultValue.replace(/^(\+84|84|0)/, ""));
  return <div className="mt-2 flex min-w-0 items-stretch overflow-hidden rounded-md border border-[#B5CCC4] bg-white focus-within:outline-2 focus-within:outline-[#0D8A7C]">
    <span aria-label="Mã quốc gia Việt Nam" className="flex w-20 shrink-0 items-center justify-center border-r border-[#D6E4DE] text-base tabular-nums">+84</span>
    <input type="hidden" name="phone" value={national ? `+84${national}` : ""} />
    <input id={id} type="tel" autoComplete="tel-national" inputMode="tel" required value={national} onChange={event => setNational(event.target.value.replace(/[\s.()-]/g, "").replace(/^(\+84|0)/, ""))} pattern="[1-9][0-9]{8}" maxLength={12} placeholder="Nhập số điện thoại" className="min-h-12 min-w-0 flex-1 bg-white px-3 text-base tabular-nums outline-none" />
  </div>;
}

export function PasswordInput({
  id,
  name,
  placeholder,
  required = true,
  minLength,
  autoComplete,
  describedBy,

}: {
  id: string;
  name: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: "new-password" | "current-password";
  describedBy?: string;

}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1.5">
      <Lock
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#486581]"
        aria-hidden="true"
      />
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete ?? (minLength ? "new-password" : "current-password")}
        aria-describedby={describedBy}
        required={required}
        minLength={minLength}
        maxLength={128}
        pattern={minLength ? PASSWORD_PATTERN : undefined}
        onInvalid={event => { if (minLength) event.currentTarget.setCustomValidity(PASSWORD_RULE_MESSAGE); }}
        onInput={event => event.currentTarget.setCustomValidity("")}
        placeholder={placeholder}

        className="w-full rounded-xl border border-[#CBD8E2] bg-white py-2.5 pl-10 pr-10 text-base text-[#0B2545] placeholder:text-[#486581] transition focus:border-[#0D8A7C] focus:ring-2 focus:ring-[#0D8A7C]/15 focus:outline-none min-h-11 min-w-0"
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
        className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-[#486581] hover:text-[#0B2545]"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

interface OtpInputProps {
  name?: string;
  phone: string;
  resendAction: (formData: FormData) => Promise<void> | void;
  disabled?: boolean;

}

export function OtpInput({
  name = "otpCode",
  phone,
  resendAction,
  disabled = false,

}: OtpInputProps) {
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function resend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const data = new FormData();
      data.set("phone", phone);
      await resendAction(data);
      setCooldown(60);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} name={name} type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required disabled={disabled} autoComplete="one-time-code" aria-label="Mã xác minh gồm 6 chữ số" placeholder="Nhập 6 chữ số" className="min-h-12 w-full rounded-md border border-slate-400 bg-white px-4 text-center text-xl tabular-nums focus:border-[#0D8A7C]" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
        <span>Chưa nhận được mã?</span>
        <button type="button" onClick={resend} disabled={disabled || cooldown > 0 || isResending} className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#0A6E63] disabled:text-slate-600">
          <RefreshCw className={isResending ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
          <span className="tabular-nums">{isResending ? "Đang gửi…" : cooldown > 0 ? "Gửi lại sau " + cooldown + " giây" : "Gửi lại mã"}</span>
        </button>
      </div>
    </div>
  );
}

export { FormSubmit as AuthSubmit } from "@/components/form-submit.client";
