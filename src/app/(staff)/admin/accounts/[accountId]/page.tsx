
import { formatDateOnlyDisplay } from "@/lib/dates";
import { StaffRoleForm } from "@/app/(staff)/admin/role-form.client";
import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import { ActionDialog } from "@/components/dialog.client";
import { FormSubmit } from "@/components/form-submit.client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { requireActiveContext } from "@/server/authorization";
import { getAdminAccountDetailById } from "@/modules/identity/queries";
import { AccountStatusBadge, RoleBadge } from "@/components/status";
import { FeedbackBanner } from "@/components/feedback";
import { adminDisableAccountAction, adminPermitReactivationAction } from "@/app/(staff)/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminAccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string; }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireActiveContext(["ADMIN"]);
  const { accountId } = await params;
  const query = singleSearchParams(await searchParams);
  const id = parsePositiveId(accountId);
  if (!id || id <= 0) notFound();

  const acc = await getAdminAccountDetailById(id);
  if (!acc) notFound();

  const created = query.created === "1";
  const reused = query.reused === "1";
  const roleUpdated = query.roleUpdated === "1";
  const disabled = query.disabled === "1";
  const permitted = query.permitted === "1";
  const error = query.error ?? "";
  const deps = acc.doctorDependencies;

  return (
    <div className="space-y-6" >
      <div className="flex items-center justify-between">
        <Link href="/admin/accounts" className="back-link">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Danh sách tài khoản</span>
        </Link>
      </div>

      {created && (
        <FeedbackBanner dialog
          variant={query.activationDelivery === "failed" ? "info" : "success"}
          title={reused ? "Đã liên kết vai trò" : "Đã tạo tài khoản"}
          message={acc.isReactivationPending ? "Hồ sơ đã được cập nhật. Chính chủ đăng nhập bằng mật khẩu hiện có để xác minh mở lại tài khoản." : query.activationDelivery === "failed" ? "Tài khoản đã được tạo. Chưa gửi được mã kích hoạt; nhân sự có thể yêu cầu mã tại trang Kích hoạt tài khoản." : acc.status === "PENDING_ACTIVATION" ? `OTP kích hoạt đã được gửi tới ${acc.phone}.` : `Hồ sơ ${acc.fullName} đã được cập nhật.`}

        />
      )}
      {roleUpdated && <FeedbackBanner dialog variant="success" title="Đã cập nhật vai trò" message="Phân quyền mới đã được áp dụng." />}
      {disabled && <FeedbackBanner dialog variant="info" title="Đã vô hiệu hóa" message="Tài khoản đã bị vô hiệu hóa." />}
      {permitted && <FeedbackBanner dialog variant="success" title="Đã cho phép mở lại tài khoản" message="Đã cập nhật quyền mở lại tài khoản." />}
      {error && <FeedbackBanner dialog variant="conflict" title="Không thể xử lý" message={error} />}

      <section className="bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">{acc.fullName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {acc.roles.map((r) => (<RoleBadge key={r} role={r} />))}
            <AccountStatusBadge status={acc.status} />
          </div>
        </div>

        <dl className="grid gap-6 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-slate-600">Số điện thoại</dt>
            <dd className="mt-0.5 text-sm font-bold text-[#0B2545] tabular-nums">{acc.phone}</dd>
          </div>
          <div>
            <dt className="text-slate-600">Ngày sinh</dt>
            <dd className="mt-0.5 text-sm font-bold text-[#0B2545] tabular-nums">{formatDateOnlyDisplay(acc.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-600">Email</dt>
            <dd className="mt-0.5 font-semibold break-words">{acc.email ?? "Chưa có"}</dd>
          </div>
        </dl>
      </section>


      <div className="flex flex-wrap items-center justify-end gap-3">
        <ActionDialog label="Thay đổi vai trò" title="Thay đổi vai trò">
          <StaffRoleForm user={acc} returnTo="account">
      {deps && (
        <section

          className={`border-t p-5 space-y-4 ${deps.hasBlockingDependencies ? "border-[#bed4d9] bg-[#e8f2f4]" : "border-emerald-200 bg-emerald-50/60"
            }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className={`h-4 w-4 ${deps.hasBlockingDependencies ? "text-[#174954]" : "text-emerald-800"}`} />
            <h2 className="text-xs font-bold text-[#0B2545]">Ràng buộc vai trò Bác sĩ</h2>
          </div>
          <p className="text-xs text-slate-600">
            {deps.hasBlockingDependencies
              ? "Bác sĩ đang có dữ liệu vận hành phụ thuộc. Cần giải phóng các liên kết trước khi đổi hoặc gỡ vai trò:"
              : "Bác sĩ không có dữ liệu ràng buộc. Có thể tự do thay đổi vai trò."}
          </p>
          <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4 text-sm">
            {[
              { label: "Dịch vụ liên kết", count: deps.serviceCount },
              { label: "Ca trực tương lai", count: deps.futureShiftCount },
              { label: "Lịch bận tương lai", count: deps.futureUnavailabilityCount },
              { label: "Lịch hẹn hoạt động", count: deps.activeAppointmentCount },
            ].map((d) => (
              <div key={d.label}>
                <dt className="text-slate-700">{d.label}</dt>
                <dd className="mt-1 text-base font-semibold tabular-nums">{d.count}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

          </StaffRoleForm>

        </ActionDialog>

          {acc.status === "DISABLED" ? (
              <form action={adminPermitReactivationAction} >
                <input type="hidden" name="accountId" value={acc.accountId} />
                <input type="hidden" name="returnTo" value="account" />
                <FormSubmit confirmation={{title:"Cho phép mở lại tài khoản?",message:"Cho phép chính chủ đăng nhập để nhận mã xác minh. Tài khoản chưa được mở ngay.",label:"Cho phép mở lại"}} className="public-primary gap-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Cho phép mở lại tài khoản</span>
                </FormSubmit>
              </form>
          ) : (
              <form action={adminDisableAccountAction} >
                <input type="hidden" name="accountId" value={acc.accountId} />
                <FormSubmit destructive confirmation={{title: acc.isReactivationPending ? "Thu hồi quyền mở lại tài khoản" : "Vô hiệu hóa tài khoản", message: "Chặn đăng nhập và hủy các mã xác minh còn hiệu lực. Dữ liệu và lịch hẹn được giữ nguyên."}} className="public-danger gap-2">
                  <Ban className="h-4 w-4" />
                  <span>{acc.isReactivationPending ? "Thu hồi quyền mở lại" : "Vô hiệu hóa tài khoản"}</span>
                </FormSubmit>
              </form>
          )}
      </div>
    </div>
  );
}
