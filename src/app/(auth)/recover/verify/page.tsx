import { readAuthPhone } from "@/server/auth-navigation";
import { singleSearchParams } from "@/lib/pagination";
import { redirect } from "next/navigation";
import { VerificationPage } from "@/app/(auth)/verification";
import { verifyPasswordRecoveryOtpAction, requestPasswordRecoveryFormAction } from "@/app/(auth)/actions";

export default async function RecoverVerifyPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const phone = (await readAuthPhone());
  if (!phone) redirect("/recover");
  return <VerificationPage phone={phone} basePath="/recover" title="Xác minh để khôi phục mật khẩu"
    sent={params.sent === "1"} error={params.error ?? ""} notice={params.notice ?? ""}
    verifyAction={verifyPasswordRecoveryOtpAction} resendAction={requestPasswordRecoveryFormAction} />;
}
