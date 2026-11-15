import { formatClinicIsoDate } from "@/lib/dates";
import { MIN_BIRTH_DATE_ISO } from "@/config/business";
import { BulkImport } from "@/components/bulk-import.client";
import { singleSearchParams } from "@/lib/pagination";
import Link from "next/link";
import { STAFF_ROLES, formatRoleLabel } from "@/config/business";
import { requireActiveContext } from "@/server/authorization";
import { FeedbackBanner } from "@/components/feedback";
import { FormSubmit } from "@/components/form-submit.client";
import { adminCreateStaffAction } from "@/app/(staff)/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminCreateStaffPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireActiveContext(["ADMIN"]);
  const params = singleSearchParams(await searchParams);
  const fields = [
    { name: "phone", label: "Số điện thoại", type: "tel", required: true, complete: "tel", id: "staff-phone-input" },
    { name: "fullName", label: "Họ và tên", type: "text", required: true, complete: "name", id: "staff-fullname-input" },
    { name: "birthDate", label: "Ngày sinh", type: "date", required: true, complete: "bday", id: "staff-birthdate-input" },
    { name: "email", label: "Email (tùy chọn)", type: "email", required: false, complete: "email", id: "staff-email-input" },
  ];
  return (
    <div className="max-w-3xl space-y-7" >
      <header className="space-y-3">
        <Link href="/admin/accounts" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Quay lại tài khoản</Link>
        <h1 className="text-2xl font-semibold">Thêm nhân sự</h1>
        <BulkImport kind="staff" />
      </header>
      {params.error && <FeedbackBanner dialog variant="error" title="Không thể thêm nhân sự" message={params.error} />}
      <form action={adminCreateStaffAction} className="space-y-7 bg-white p-5 sm:p-7">
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-5 text-lg font-semibold">Thông tin nhân sự</legend>
          {fields.map(field => <div key={field.name}>
            <label htmlFor={field.id} className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</label>
            <input id={field.id} name={field.name} type={field.type} min={field.type === "date" ? MIN_BIRTH_DATE_ISO : undefined} max={field.type === "date" ? formatClinicIsoDate(new Date()) : undefined} required={field.required} defaultValue={params[field.name] ?? ""}
              autoComplete={field.complete} maxLength={field.name === "fullName" || field.name === "email" ? 120 : undefined}
              className={`public-control mt-2 ${field.type === "tel" || field.type === "date" ? "tabular-nums" : ""}`} />
          </div>)}
        </fieldset>
        <fieldset className="space-y-5 border-t border-slate-200 pt-5">
          <legend className="pr-3 text-lg font-semibold">Phạm vi sử dụng</legend>
          <div>
            <label htmlFor="staff-role-select" className="text-sm font-medium">Vai trò công việc</label>
            <select id="staff-role-select" name="staffRole" required defaultValue={STAFF_ROLES.find(role => role === params.staffRole) ?? "RECEPTIONIST"} className="public-control mt-2 min-w-0">
              {STAFF_ROLES.map(role => <option key={role} value={role}>{formatRoleLabel(role)}</option>)}
            </select>
          </div>
          <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" name="includePatientRole" value="true" defaultChecked={params.includePatientRole === "true"} className="mt-1 h-4 w-4 shrink-0 accent-[#0D8A7C]" />
            <span>Thêm hồ sơ người khám bệnh để nhân sự tự đặt lịch khám cá nhân</span>
          </label>
        </fieldset>
        <FormSubmit className="public-primary" confirmation={{title:"Lưu nhân sự",message:"Tạo hoặc bổ sung vai trò trên hồ sơ của số điện thoại đã nhập? Tài khoản mới cần xác minh trước khi sử dụng."}}>Lưu nhân sự</FormSubmit>
      </form>
    </div>
  );
}
