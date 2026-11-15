import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { singleSearchParams } from "@/lib/pagination";
import { REACTIVATION_LOGIN_COOKIE_NAME, verifyReactivationLoginProof } from "@/modules/identity/proof";
import { VerificationPage } from "@/app/(auth)/verification";
import { completeReactivationFormAction, resendReactivationOtpFormAction } from "@/app/(auth)/actions";

export default async function LoginVerificationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = singleSearchParams(await searchParams);
  let phone: string;
  try {
    const token = (await cookies()).get(REACTIVATION_LOGIN_COOKIE_NAME)?.value ?? "";
    phone = (await verifyReactivationLoginProof(token)).phone;
  } catch { redirect("/login"); }
  return <VerificationPage phone={phone} basePath="/login" title="Xác nhận đăng nhập" error={params.error ?? ""} sent={params.sent === "1"} verifyAction={completeReactivationFormAction} resendAction={resendReactivationOtpFormAction} />;
}
