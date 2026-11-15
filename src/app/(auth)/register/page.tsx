import { readAuthPhone } from "@/server/auth-navigation";
import { singleSearchParams } from "@/lib/pagination";
import { startPatientRegistrationAction } from "@/app/(auth)/actions";
import { PhoneVerificationEntry } from "@/app/(auth)/verification";

export default async function PhoneEntryPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  return <PhoneVerificationEntry id="reg-phone" title="Đăng ký tài khoản" description="Nhận mã xác minh qua SMS để bắt đầu." phone={(await readAuthPhone())} error={params.error ?? ""} action={startPatientRegistrationAction} />;
}
