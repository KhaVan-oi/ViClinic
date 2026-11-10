import { singleSearchParams } from "@/lib/pagination";
import { CompleteAccountForm, verifiedPhoneForCompletion } from "@/app/(auth)/verification";
import { completeRegistrationAction } from "@/app/(auth)/actions";
import { db } from "@/server/db";

export default async function RegisterCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const verifiedPhone = await verifiedPhoneForCompletion("register");
  const params = singleSearchParams(await searchParams);
  const error = params.error ?? "";
  const existing = await db.user.findUnique({where: {phone: verifiedPhone}, select: {fullName: true, birthDate: true, email: true}});

  return (
    <CompleteAccountForm phone={verifiedPhone} title="Hoàn tất đăng ký" error={error} action={completeRegistrationAction} submitLabel="Tạo tài khoản" registrationProfile={existing ? {fullName: existing.fullName, birthDate: existing.birthDate?.toISOString().slice(0,10) ?? "", email: existing.email ?? ""} : null} />
  );
}
