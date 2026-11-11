import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import { BulkImport } from "@/components/bulk-import.client";
import { ActionDialog } from "@/components/dialog.client";
import { singleSearchParams } from "@/lib/pagination";
import { FormSubmit } from "@/components/form-submit.client";
import { PatientFields } from "@/app/(staff)/reception/patient-fields";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarPlus,
  Search,
  UserPlus,
} from "lucide-react";
import { listPatientsForReception } from "@/modules/patients/server";
import { PaginationBar } from "@/components/pagination";
import { EmptyStatePanel, FeedbackBanner } from "@/components/feedback";
import { receptionCreatePatientAction } from "@/app/(staff)/reception/actions";

export const dynamic = "force-dynamic";

export default async function ReceptionPatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const searchQuery = await readPrivateSearch("/reception/patients");
  const page = Number(params.page ?? 1) || 1;
  const appointments = params.appointments === "upcoming" || params.appointments === "none" ? params.appointments : undefined;
  const error = params.error ?? "";
  const defaultPhone = params.phone ?? "";

  const result = await listPatientsForReception({ searchQuery, appointments, page, pageSize: 20 });

  return (
    <div className="space-y-6" >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B2545]">Danh sách người khám bệnh</h1>
          
        </div>
      </div>

      {error && (
        <FeedbackBanner dialog variant="conflict" title="Không thể tạo thông tin" message={error} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
      <ActionDialog label="Thêm người khám bệnh" title="Thêm người khám bệnh" className="public-primary">
        <form action={receptionCreatePatientAction} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <input type="hidden" name="returnTo" value="patients" />
          <PatientFields prefix="create-patient" values={{ phone: defaultPhone }} />
          <div className="flex items-end">
            <FormSubmit className="public-primary w-full">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Tạo người khám bệnh</span>
            </FormSubmit>
          </div>
        </form>
      </ActionDialog><div className="flex flex-wrap items-center gap-3">        <BulkImport kind="patients" />
        <a className="public-secondary" href={`/api/ui/export?${new URLSearchParams({kind:"patients",...(appointments?{appointments}:{})})}`}>Xuất hồ sơ theo bộ lọc</a>
</div></div>

      <form action={submitPrivateSearch.bind(null, "/reception/patients")} className="workbench-toolbar flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="pat-q" className="block text-sm font-bold text-slate-600">Tìm kiếm theo Tên, SĐT hoặc Email</label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600" />
            <input id="pat-q" name="q" type="text" defaultValue={searchQuery} placeholder="Nhập từ khóa tra cứu..." className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-base text-[#0B2545] focus:border-[#0D8A7C] focus:outline-none min-h-11 min-w-0" />
          </div>
        </div>

        <label className="text-sm font-medium">Lịch hẹn<select name="appointments" defaultValue={appointments ?? ""} className="public-control mt-2"><option value="">Tất cả</option><option value="upcoming">Có lịch sắp tới</option><option value="none">Chưa từng đặt lịch</option></select></label>
        <button type="submit" className="public-primary">
          <Search className="h-3.5 w-3.5" />
          <span>Tìm kiếm</span>
        </button>
      </form>

      {result.items.length === 0 ? (
        <EmptyStatePanel title="Không tìm thấy người khám bệnh phù hợp" description="Thử đổi từ khóa hoặc tạo mới thông tin người khám bệnh ở trên." />
      ) : (
        <div className="space-y-3">
          <div className="responsive-table">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3">Ngày sinh</th>
                  <th className="px-4 py-3">Lịch hẹn</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((pat) => (
                  <tr key={pat.userId} className="transition hover:bg-slate-50/80">
                    <td data-label="Người khám bệnh" className="px-4 py-3 font-bold text-[#0B2545]">{pat.fullName}</td>
                    <td data-label="Số điện thoại" className="px-4 py-3 text-slate-700 tabular-nums">{pat.phone}</td>
                    <td data-label="Ngày sinh" className="px-4 py-3 text-slate-600 tabular-nums">{pat.birthDate?.split("-").reverse().join("/") ?? "—"}</td>
                    <td data-label="Số lịch hẹn" className="px-4 py-3 font-semibold text-slate-700 tabular-nums">{pat.appointmentCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link href={`/reception/appointments/new?patientId=${pat.userId}`} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-[#0A6E63] hover:underline">
                          <CalendarPlus className="h-3 w-3" />
                          <span>Đặt lịch</span>
                        </Link>
                        <Link href={`/reception/patients/${pat.userId}`} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm text-slate-600 hover:underline">
                          <span>Chi tiết</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <PaginationBar
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.totalItems}
              pageSize={result.pageSize}
              buildHref={(targetPage) => `/reception/patients?appointments=${appointments ?? ""}&page=${targetPage}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
