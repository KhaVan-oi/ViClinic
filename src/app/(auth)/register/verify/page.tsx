import { readAuthPhone } from "@/server/auth-navigation";
import { singleSearchParams } from "@/lib/pagination";
import { redirect } from "next/navigation";
import { VerificationPage } from "@/app/(auth)/verification";
import { verifyRegistrationOtpAction, resendRegistrationOtpAction } from "@/app/(auth)/actions";

export default async function RegisterVerifyPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const phone = (await readAuthPhone());
  if (!phone) redirect("/register");
  return <VerificationPage phone={phone} basePath="/register" title="Xác minh số điện thoại"
    sent={params.sent === "1"} error={params.error ?? ""}
    verifyAction={verifyRegistrationOtpAction} resendAction={resendRegistrationOtpAction} />;
}
