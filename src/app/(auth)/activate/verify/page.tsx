import { readAuthPhone } from "@/server/auth-navigation";
import { singleSearchParams } from "@/lib/pagination";
import { redirect } from "next/navigation";
import { VerificationPage } from "@/app/(auth)/verification";
import { verifyActivationOtpAction, requestActivationOtpFormAction } from "@/app/(auth)/actions";

export default async function ActivateVerifyPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const phone = (await readAuthPhone());
  if (!phone) redirect("/activate");
  return <VerificationPage phone={phone} basePath="/activate" title="Xác minh để kích hoạt"
    sent={params.sent === "1"} error={params.error ?? ""}
    verifyAction={verifyActivationOtpAction} resendAction={requestActivationOtpFormAction} />;
}
