import { singleSearchParams } from "@/lib/pagination";
import { CompleteAccountForm, verifiedPhoneForCompletion } from "@/app/(auth)/verification";
import { completeActivationWithProofAction } from "@/app/(auth)/actions";

export default async function ActivateCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const verifiedPhone = await verifiedPhoneForCompletion("activate");
  const params = singleSearchParams(await searchParams);
  const error = params.error ?? "";

  return (
    <CompleteAccountForm phone={verifiedPhone} title="Thiết lập mật khẩu" error={error} action={completeActivationWithProofAction} submitLabel="Kích hoạt tài khoản">

    </CompleteAccountForm>
  );
}
