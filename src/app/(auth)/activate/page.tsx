import { readAuthPhone } from "@/server/auth-navigation";
import { singleSearchParams } from "@/lib/pagination";
import { requestActivationOtpFormAction } from "@/app/(auth)/actions";
import { PhoneVerificationEntry } from "@/app/(auth)/verification";

export default async function PhoneEntryPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  return <PhoneVerificationEntry id="act-phone" title="Kích hoạt tài khoản" description="Nhập số điện thoại nhân sự đã được phòng khám đăng ký." phone={(await readAuthPhone())} error={params.error ?? ""} action={requestActivationOtpFormAction} />;
}
