import { singleSearchParams } from "@/lib/pagination";
import { FormSubmit } from "@/components/form-submit.client";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requireActiveContext } from "@/server/authorization";
import { listAccountsForAdmin } from "@/modules/identity/queries";
import { AccountStatusBadge, RoleBadge } from "@/components/status";
import { PaginationBar } from "@/components/pagination";
import { EmptyStatePanel, FeedbackBanner } from "@/components/feedback";
import { adminDisableAccountAction, adminPermitReactivationAction } from "@/app/(staff)/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminReactivationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireActiveContext(["ADMIN"]);
  const params = singleSearchParams(await searchParams);
  const page = Number(params.page ?? 1) || 1;
  const permitted = params.permitted === "1";
  const error = params.error ?? "";
  const query = params.q?.trim() ?? "";

  const result = await listAccountsForAdmin({ reactivationReview: true, searchQuery: query, page, pageSize: 20 });

  return (
    <div className="space-y-6" >
      <div>
        <h1 className="text-xl font-bold text-[#0B2545]">Mở lại tài khoản</h1>
        <p className="mt-2 text-sm text-slate-600">Cấp hoặc thu hồi quyền để chính chủ xác minh mở lại tài khoản.</p>
      </div>

      {permitted && (
        <FeedbackBanner dialog
          variant="success"
          title="Đã cho phép mở lại tài khoản"
          message="Đã cập nhật quyền mở lại tài khoản."

        />
      )}

      {params.disabled === "1" && <FeedbackBanner dialog variant="success" title="Đã thu hồi quyền mở lại" message="Tài khoản đã bị vô hiệu hóa. Các mã xác minh trước đó không còn hiệu lực." />}
      {error && <FeedbackBanner dialog variant="error" title="Chưa thể cho phép mở lại tài khoản" message={error} />}

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-0 flex-1">
          <label htmlFor="reactivation-search" className="block text-sm font-medium">Tìm tài khoản</label>
          <input id="reactivation-search" name="q" defaultValue={query} placeholder="Tên, số điện thoại hoặc email" className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base" />
        </div>
        <button className="min-h-11 rounded-md bg-[#0A6E63] px-4 font-semibold text-white">Tìm kiếm</button>
        {query && <Link href="/admin/reactivation" className="inline-flex min-h-11 items-center px-2 text-sm underline">Xóa tìm kiếm</Link>}
      </form>

      {result.items.length === 0 ? (
        <EmptyStatePanel title={query ? "Không tìm thấy tài khoản" : "Không có tài khoản nào cần mở lại"} description={query ? "Thử tìm bằng số điện thoại hoặc tên khác." : "Hiển thị tài khoản bị vô hiệu hóa hoặc đang chờ chính chủ xác minh mở lại."} />
      ) : (
        <div className="space-y-3">
          <div className="responsive-table">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Cho phép mở lại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((acc) => (
                  <tr key={acc.accountId} className="hover:bg-slate-50/80">
                    <td data-label="Tài khoản" className="px-4 py-3 font-bold text-[#0B2545]">{acc.fullName}</td>
                    <td data-label="Số điện thoại" className="px-4 py-3 text-slate-700 tabular-nums">{acc.phone}</td>
                    <td data-label="Vai trò" className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {acc.roles.map((r) => (<RoleBadge key={r} role={r} />))}
                      </div>
                    </td>
                    <td data-label="Trạng thái" className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <AccountStatusBadge status={acc.status} />
                        {acc.isReactivationPending && (
                          <span className="rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-semibold text-teal-800">
                            Chờ chính chủ xác minh
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={acc.isReactivationPending ? adminDisableAccountAction : adminPermitReactivationAction}>
                        <input type="hidden" name="accountId" value={acc.accountId} />
                        <input type="hidden" name="returnTo" value="reactivation" />
                        <FormSubmit confirmation={{title: acc.isReactivationPending ? "Thu hồi quyền mở lại?" : "Cho phép mở lại tài khoản?",message: acc.isReactivationPending ? "Hủy các mã xác minh còn hiệu lực. Tài khoản sẽ bị vô hiệu hóa trở lại." : "Cho phép chính chủ đăng nhập bằng mật khẩu hiện có để nhận mã xác minh."}} className={acc.isReactivationPending ? "public-danger gap-2" : "public-primary gap-2"}>
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>{acc.isReactivationPending ? "Thu hồi quyền mở lại" : "Cho phép mở lại"}</span>
                        </FormSubmit>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <PaginationBar page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} pageSize={result.pageSize} buildHref={(tp) => `/admin/reactivation?page=${tp}&q=${encodeURIComponent(query)}`} />
          </div>
        </div>
      )}
    </div>
  );
}
