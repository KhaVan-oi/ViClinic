import { MIN_BIRTH_DATE_ISO } from "@/config/business";

import { formatClinicIsoDate } from "@/lib/dates";
import type { ReceptionPatientSummaryDto } from "@/modules/patients/contracts";

const fields = [
  { name: "phone", label: "Số điện thoại", type: "tel", autoComplete: "tel" },
  { name: "fullName", label: "Họ và tên", type: "text", autoComplete: "name" },
  { name: "birthDate", label: "Ngày sinh", type: "date", autoComplete: "bday" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
] as const;

export function PatientFields({ values = {}, prefix, readOnlyPhone = false }: {
  values?: Partial<Pick<ReceptionPatientSummaryDto, "phone" | "fullName" | "birthDate" | "email">>;
  prefix: string;
  readOnlyPhone?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map(field => {
        const id = `${prefix}-${field.name.toLowerCase()}`;
        return (
          <label key={field.name} htmlFor={id} className="block text-sm font-medium text-slate-700">
            {field.label}{field.name === "email" ? " (tùy chọn)" : " *"}
            <input id={id} name={field.name} type={field.type} min={field.type === "date" ? MIN_BIRTH_DATE_ISO : undefined} max={field.type === "date" ? formatClinicIsoDate(new Date()) : undefined} autoComplete={field.autoComplete}
              required={field.name !== "email"} defaultValue={values[field.name] ?? ""}
              readOnly={field.name === "phone" && readOnlyPhone}
              maxLength={field.name === "fullName" || field.name === "email" ? 120 : undefined}
              className="mt-2 min-h-11 w-full rounded border border-slate-300 bg-white px-3 py-2 text-base read-only:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#0A6E63] min-w-0" />
            {field.name === "phone" && readOnlyPhone && <span className="mt-1 block text-sm font-normal text-slate-600">Số điện thoại đăng nhập không thể đổi tại đây.</span>}
          </label>
        );
      })}
    </div>
  );
}
