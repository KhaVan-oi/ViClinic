import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import Link from "next/link";
import { ACCOUNT_STATUSES, ALL_ROLES, formatAccountStatusLabel, formatRoleLabel } from "@/config/business";
import { singleSearchParams } from "@/lib/pagination";
import { requireActiveContext } from "@/server/authorization";
import { listAccountsForAdmin } from "@/modules/identity/queries";
import { AccountStatusBadge } from "@/components/status";
import { PaginationBar } from "@/components/pagination";
import { EmptyStatePanel } from "@/components/feedback";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireActiveContext(["ADMIN"]);
  const params = singleSearchParams(await searchParams);
  const searchQuery = await readPrivateSearch("/admin/accounts");
  const status = ACCOUNT_STATUSES.find(value => value === params.status) ?? "ALL";
  const role = ALL_ROLES.find(value => value === params.role) ?? "ALL";
  const result = await listAccountsForAdmin({ searchQuery, status, role, page: Number(params.page ?? 1), pageSize: 20 });
  const buildUrl = (page: number) => `/admin/accounts?${new URLSearchParams({ status, role, page: String(page) })}`;
  return (
    <div className="space-y-7" >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Tài khoản</h1><p className="mt-2 text-sm tabular-nums text-slate-700">{result.totalItems} kết quả</p></div>
        <Link href="/admin/staff/new" className="public-primary">Thêm nhân sự</Link>
      </header>
      <form action={submitPrivateSearch.bind(null, "/admin/accounts")} className="workbench-toolbar grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="text-sm font-medium">Tên, số điện thoại hoặc email
          <input name="q" type="search" defaultValue={searchQuery} className="public-control mt-2 min-w-0" />
        </label>
        <label className="text-sm font-medium">Trạng thái
          <select name="status" defaultValue={status} className="public-control mt-2 min-w-0">
            <option value="ALL">Tất cả trạng thái</option>
            {ACCOUNT_STATUSES.map(value => <option key={value} value={value}>{formatAccountStatusLabel(value)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Vai trò
          <select name="role" defaultValue={role} className="public-control mt-2 min-w-0">
            <option value="ALL">Tất cả vai trò</option>
            {ALL_ROLES.map(value => <option key={value} value={value}>{formatRoleLabel(value)}</option>)}
          </select>
        </label>
        <div className="flex min-h-11 items-center gap-4">
          <button type="submit" className="public-primary">Lọc</button>
          {(searchQuery || status !== "ALL" || role !== "ALL") && <button type="submit" name="clear" value="1" formNoValidate className="public-secondary">Xóa bộ lọc</button>}
        </div>
      </form>
      {!result.items.length ? <EmptyStatePanel title="Không tìm thấy tài khoản" description="Thử thay đổi hoặc xóa bộ lọc để xem lại danh sách." /> : (
        <div role="region" aria-label="Danh sách tài khoản" tabIndex={0} className="responsive-table">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-300 text-slate-700">
              {["Họ và tên", "Số điện thoại", "Vai trò", "Trạng thái", "Chi tiết"].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {result.items.map(account => <tr key={account.accountId} >
                <td data-label="Tài khoản" className="min-w-0"><p className="font-semibold">{account.fullName}</p>{account.email && <p className="mt-1 break-words text-slate-700">{account.email}</p>}</td>
                <td data-label="Số điện thoại" className="tabular-nums">{account.phone}</td>
                <td data-label="Vai trò">{account.roles.map(formatRoleLabel).join(" · ")}</td>
                <td data-label="Trạng thái"><AccountStatusBadge status={account.status} />{account.isReactivationPending && <p className="mt-2 text-slate-700">Đã cho phép mở lại tài khoản</p>}</td>
                <td><Link href={`/admin/accounts/${account.accountId}`} aria-label={`Xem tài khoản ${account.fullName}`} className="inline-flex min-h-11 items-center font-medium text-[#0A6E63] underline underline-offset-4">Xem chi tiết</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      <PaginationBar page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} pageSize={result.pageSize} buildHref={buildUrl} />
    </div>
  );
}
