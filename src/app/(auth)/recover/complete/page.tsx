import { singleSearchParams } from "@/lib/pagination";
import { CompleteAccountForm, verifiedPhoneForCompletion } from "@/app/(auth)/verification";
import { completePasswordRecoveryWithProofAction } from "@/app/(auth)/actions";

export default async function RecoverCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const verifiedPhone = await verifiedPhoneForCompletion("recover");
  const params = singleSearchParams(await searchParams);
  const error = params.error ?? "";

  return (
    <CompleteAccountForm phone={verifiedPhone} title="Tạo mật khẩu mới" error={error} action={completePasswordRecoveryWithProofAction} submitLabel="Lưu mật khẩu mới" recovery>

    </CompleteAccountForm>
  );
}
