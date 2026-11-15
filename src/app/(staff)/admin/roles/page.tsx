import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import { StaffRoleForm } from "@/app/(staff)/admin/role-form.client";
import { ActionDialog } from "@/components/dialog.client";
import { requireActiveContext } from "@/server/authorization";
import { checkDoctorRoleDependencies } from "@/modules/identity/staff";
import { listStaffUsersForRoleGovernance } from "@/modules/identity/queries";
import { AccountStatusBadge, RoleBadge } from "@/components/status";
import { FeedbackBanner } from "@/components/feedback";
import { STAFF_ROLES, formatRoleLabel } from "@/config/business";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireActiveContext(["ADMIN"]);
  const params = singleSearchParams(await searchParams);
  const updated = params.updated === "1";
  const error = params.error ?? "";
  const blockedUserId = parsePositiveId(params.blockedUserId);
  const query = (await readPrivateSearch("/admin/roles")).toLocaleLowerCase("vi");
  const role = STAFF_ROLES.find(value => value === params.role);

  const [staffUsers, blockedDeps] = await Promise.all([
    listStaffUsersForRoleGovernance(),
    blockedUserId ? checkDoctorRoleDependencies(blockedUserId) : Promise.resolve(null),
  ]);
  const visibleStaff = staffUsers.filter(user => (!role || user.staffRole === role) && (!query || `${user.fullName} ${user.phone}`.toLocaleLowerCase("vi").includes(query)));

  return (
    <div className="space-y-6" >
      <div>
        <h1 className="text-2xl font-semibold text-[#0B2545]">Phân quyền nhân sự</h1>
        
      </div>

      {updated && <FeedbackBanner dialog variant="success" title="Đã cập nhật phân quyền" message="Vai trò mới đã được áp dụng thành công." />}
      <form action={submitPrivateSearch.bind(null, "/admin/roles")} className="workbench-toolbar grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_240px_auto_auto]">
        <label className="min-w-0 flex-1 text-sm font-medium">Tìm nhân sự<input name="q" type="search" defaultValue={query} placeholder="Tên hoặc số điện thoại" className="public-control mt-2" /></label>
        <label className="text-sm font-medium">Vai trò<select name="role" defaultValue={role ?? ""} className="public-control mt-2"><option value="">Tất cả vai trò</option>{STAFF_ROLES.map(value => <option key={value} value={value}>{formatRoleLabel(value)}</option>)}</select></label>
        <button type="submit" className="public-primary">Tìm</button>
        {(query || role) && <button type="submit" name="clear" value="1" formNoValidate className="public-secondary">Xóa lọc</button>}
      </form>
      {!visibleStaff.length && <p className="py-5 text-slate-600">Không tìm thấy nhân sự phù hợp.</p>}

      {error && (
        <FeedbackBanner dialog variant="conflict" title="Chưa thể cập nhật quyền" message={error} >
          {blockedDeps && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-slate-800">
              <div><span className="text-slate-600">Dịch vụ:</span> <strong className="tabular-nums">{blockedDeps.serviceCount}</strong></div>
              <div><span className="text-slate-600">Ca trực:</span> <strong className="tabular-nums">{blockedDeps.futureShiftCount}</strong></div>
              <div><span className="text-slate-600">Lịch bận:</span> <strong className="tabular-nums">{blockedDeps.futureUnavailabilityCount}</strong></div>
              <div><span className="text-slate-600">Lịch hẹn:</span> <strong className="tabular-nums">{blockedDeps.activeAppointmentCount}</strong></div>
            </div>
          )}
        </FeedbackBanner>
      )}

      <div className="responsive-table">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
              <th className="px-4 py-3">Nhân sự</th>
              <th className="px-4 py-3">Vai trò hiện tại</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đổi / Gỡ vai trò</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleStaff.map((u) => (
              <tr key={u.userId} className="hover:bg-slate-50/80">
                <td data-label="Nhân sự">
                  <div className="font-bold text-[#0B2545]">{u.fullName}</div>
                  <div className="text-sm text-slate-600 tabular-nums">{u.phone}</div>
                </td>
                <td data-label="Vai trò hiện tại">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (<RoleBadge key={r} role={r} />))}
                  </div>
                </td>
                <td data-label="Trạng thái">
                  {u.accountStatus ? <AccountStatusBadge status={u.accountStatus} /> : <span>—</span>}
                </td>
                <td>
                  <ActionDialog label="Chỉnh sửa quyền" title={`Quyền của ${u.fullName}`}>
                  <StaffRoleForm user={u} returnTo="roles" />
                  </ActionDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
