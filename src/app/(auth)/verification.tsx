import "server-only";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REGISTRATION_PROOF_COOKIE_NAME, verifyAuthProofToken, ACTIVATION_PROOF_COOKIE_NAME, RECOVERY_PROOF_COOKIE_NAME } from "@/modules/identity/proof";
import { ReactNode } from "react";
import { FormSubmit } from "@/components/form-submit.client";
import { PasswordInput, PhoneInput, RegistrationCompletionForm } from "./fields.client";
import { PASSWORD_MIN_LENGTH } from "@/config/security";
import { FeedbackBanner } from "@/components/feedback";
import { AuthSubmit, OtpInput } from "./fields.client";

type FormAction = (formData: FormData) => Promise<void> | void;

export function PhoneVerificationEntry({ title, description, phone, error, action, id }: {
  id: string;
  title: string;
  description: string;
  phone: string;
  error: string;
  action: FormAction;
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-sm text-slate-600">Bước 1 trên 3</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </header>
      {error && <FeedbackBanner variant="error" title="Chưa thể gửi mã xác minh" message={error} />}
      <form action={action} className="space-y-5">
        <div>
          <label htmlFor={id} className="block text-sm font-medium">Số điện thoại</label>
          <PhoneInput id={id} defaultValue={phone} />
        </div>
        <FormSubmit className="public-primary w-full" pendingLabel="Đang gửi mã…">Gửi mã xác minh</FormSubmit>
      </form>
      <Link href="/login" className="public-text-link">Về đăng nhập</Link>
    </div>
  );
}

const COMPLETION_PROOFS = {
  register: { cookie: REGISTRATION_PROOF_COOKIE_NAME, scope: "REGISTRATION" },
  activate: { cookie: ACTIVATION_PROOF_COOKIE_NAME, scope: "ACTIVATION" },
  recover: { cookie: RECOVERY_PROOF_COOKIE_NAME, scope: "RECOVERY" },
} as const;

export async function verifiedPhoneForCompletion(route: keyof typeof COMPLETION_PROOFS): Promise<string> {
  const proof = COMPLETION_PROOFS[route];
  const token = (await cookies()).get(proof.cookie)?.value;
  const restart = `/${route}?error=${encodeURIComponent("Vui lòng xác minh lại số điện thoại để tiếp tục.")}`;
  if (token) {
    try {
      return verifyAuthProofToken(token, proof.scope).phone;
    } catch {
      redirect(restart);
    }
  }
  redirect(restart);
}

export function CompleteAccountForm({ phone, title, error, action, submitLabel, recovery = false, children, registrationProfile }: {
  phone: string;
  title: string;
  error: string;
  action: FormAction;
  submitLabel: string;
  recovery?: boolean;
  children?: ReactNode;
  registrationProfile?: {fullName: string; birthDate: string; email: string} | null;
}) {
  const fields = <>{children}
    <div><label htmlFor="account-password" className="block text-sm font-medium">Mật khẩu mới</label><PasswordInput id="account-password" name={recovery ? "newPassword" : "password"} minLength={PASSWORD_MIN_LENGTH} placeholder="Nhập mật khẩu mới" autoComplete="new-password" /></div>
    <div><label htmlFor="account-confirm-password" className="block text-sm font-medium">Nhập lại mật khẩu</label><PasswordInput id="account-confirm-password" name={recovery ? "confirmNewPassword" : "confirmPassword"} minLength={PASSWORD_MIN_LENGTH} placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" /></div>
    <FormSubmit confirmation={{title: submitLabel, message: "Xác nhận lưu thông tin và mật khẩu đã nhập?"}} className="public-primary w-full">{submitLabel}</FormSubmit>
  </>;
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-sm text-slate-600">Bước 3 trên 3</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      <p className="border-y border-slate-200 py-4 text-sm">
        Số điện thoại đã xác minh: <strong className="tabular-nums">{phone}</strong>
      </p>
      {error && <FeedbackBanner variant="error" title="Chưa thể hoàn tất" message={error} />}
      {registrationProfile !== undefined ? <RegistrationCompletionForm action={action} phone={phone} profile={registrationProfile}>{fields}</RegistrationCompletionForm> : <form action={action} className="space-y-5"><input type="hidden" name="phone" value={phone} />{fields}</form>}
    </div>
  );
}

export function VerificationPage({ phone, basePath, title, sent, error, notice, verifyAction, resendAction }: {
  phone: string;
  basePath: "/register" | "/activate" | "/recover" | "/login";
  title: string;
  sent: boolean;
  error: string;
  notice?: string;
  verifyAction: FormAction;
  resendAction: FormAction;
}) {
  const backHref = `${basePath}?phone=${encodeURIComponent(phone)}`;
  return (
    <div className="space-y-6" >
      <header>
        {basePath !== "/login" && <p className="mb-2 text-sm text-slate-600">Bước 2 trên 3</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">Nhập mã gồm 6 chữ số trong tin nhắn SMS.</p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4 text-sm">
        <p>Gửi tới <strong className="tabular-nums">{phone}</strong></p>
        <Link href={backHref} className="font-medium text-[#0A6E63] hover:underline">Đổi số điện thoại</Link>
      </div>
      {notice && <FeedbackBanner variant="info" title="Thông báo khôi phục" message={notice} />}
      {sent && !notice && <FeedbackBanner variant="info" title="Đã gửi mã xác minh" message={`Mã mới đã được gửi tới ${phone}.`}
      />}
      {error && <FeedbackBanner variant="error" title="Chưa thể xác minh" message={error}
      />}
      <form action={verifyAction} className="space-y-5">
        <input type="hidden" name="phone" value={phone} />
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Mã xác minh</legend>
          <OtpInput name="otpCode" phone={phone} resendAction={resendAction}
          />
        </fieldset>
        <AuthSubmit label="Xác minh và tiếp tục" pendingLabel="Đang xác minh…" />
      </form>
      <Link href={backHref} className="public-text-link">{basePath === "/login" ? "Về đăng nhập" : "Quay lại"}</Link>
    </div>
  );
}
