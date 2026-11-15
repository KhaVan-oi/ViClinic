import { readAuthPhone } from "@/server/auth-navigation";
import { singleSearchParams } from "@/lib/pagination";
import { requestPasswordRecoveryFormAction } from "@/app/(auth)/actions";
import { PhoneVerificationEntry } from "@/app/(auth)/verification";

export default async function PhoneEntryPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  return <PhoneVerificationEntry id="rec-req-phone" title="Quên mật khẩu" description="Nhận mã qua số điện thoại đã đăng ký." phone={(await readAuthPhone())} error={params.error ?? ""} action={requestPasswordRecoveryFormAction} />;
}
