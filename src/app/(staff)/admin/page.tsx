import { STAFF_ROLES, formatRoleLabel } from "@/config/business";
import Link from "next/link";
import { requireActiveContext } from "@/server/authorization";
import { getAdminDashboardSummary } from "@/modules/identity/queries";
import { RoleBadge } from "@/components/status";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireActiveContext(["ADMIN"]);
  const summary = await getAdminDashboardSummary();
  const distribution = [
    {label:"Đang hoạt động",count:summary.activeAccounts,color:"#0b7c6d",href:"/admin/accounts?status=ACTIVE"},
    {label:"Chờ kích hoạt",count:summary.pendingActivationCount,color:"#b77907",href:"/admin/accounts?status=PENDING_ACTIVATION"},
    {label:"Đã vô hiệu hóa",count:summary.disabledCount,color:"#be3455",href:"/admin/reactivation"},
  ];
  const total = Math.max(1,summary.totalAccounts);
  const accountGroups = [
    { label: "Chờ kích hoạt", accounts: summary.pendingAccounts.slice(0, 5), href: "/admin/accounts?status=PENDING_ACTIVATION" },
    { label: "Đã vô hiệu hóa", accounts: summary.disabledAccounts.slice(0, 5), href: "/admin/reactivation" },
  ];
  return (
    <div className="space-y-8" >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545]">Tài khoản và phân quyền</h1>
        </div>
        <Link href="/admin/staff/new" className="public-primary">Thêm nhân sự</Link>
      </header>
      <section className="grid items-center gap-6 rounded-lg bg-white p-6 sm:grid-cols-[180px_minmax(0,1fr)]" aria-label="Tình trạng tài khoản">
        <svg viewBox="0 0 160 160" className="mx-auto w-44" role="img" aria-label="Tỷ lệ tài khoản đang hoạt động, chờ kích hoạt và đã vô hiệu hóa"><circle cx="80" cy="80" r="60" fill="none" stroke="#edf2f4" strokeWidth="14" />{distribution.map((item,index) => <circle key={item.label} cx="80" cy="80" r="60" fill="none" stroke={item.color} strokeWidth="14" pathLength="100" strokeDasharray={`${item.count/total*100} 100`} strokeDashoffset={-distribution.slice(0,index).reduce((sum,row) => sum+row.count,0)/total*100} transform="rotate(-90 80 80)" />)}<text x="80" y="78" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0b2545">{summary.totalAccounts}</text><text x="80" y="100" textAnchor="middle" fontSize="12" fill="#526579">tài khoản</text></svg>
        <div><h2 className="mb-4 text-lg font-semibold">Tình trạng tài khoản</h2><ul className="divide-y divide-slate-200">{distribution.map(item => <li key={item.label}><Link href={item.href} className="flex min-h-14 items-center justify-between gap-4 rounded px-2 text-sm transition-colors hover:bg-slate-50"><span className="flex items-center gap-3"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{background:item.color}} />{item.label}</span><strong className="text-xl tabular-nums" style={{color:item.color}}>{item.count}</strong></Link></li>)}</ul></div>
      </section>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        {accountGroups.map(group => (
          <section key={group.label}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{group.label}</h2>
              <Link href={group.href} className="public-quiet">Xem tất cả</Link>
            </div>
            {group.accounts.length ? (
              <ul className="mt-2 divide-y divide-slate-200 bg-white px-5">
                {group.accounts.map(account => (
                  <li key={account.accountId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-[#0B2545]">{account.fullName}</p>
                      <p className="mt-1 text-sm text-slate-600 tabular-nums">{account.phone}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {account.roles.map(role => <RoleBadge key={role} role={role} />)}
                      <Link href={`/admin/accounts/${account.accountId}`} aria-label={`Xem tài khoản ${account.fullName}`} className="public-secondary">Chi tiết</Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="py-4 text-sm text-slate-600">Không có tài khoản trong nhóm này.</p>}
          </section>
        ))}
      </div>
      <section className="bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Nhân sự theo vai trò</h2>
          <Link href="/admin/roles" className="public-quiet">Quản lý phân quyền</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {STAFF_ROLES.map(role => <Link key={role} href={`/admin/accounts?role=${role}`} className="flex min-h-16 items-center justify-between gap-6 rounded-md border-b border-slate-200 px-4 py-4 hover:bg-slate-50"><span className="font-medium">{formatRoleLabel(role)}</span><strong className="text-xl font-semibold tabular-nums">{summary.staffCountByRole[role]}</strong></Link>)}
        </div>
      </section>
    </div>
  );
}
