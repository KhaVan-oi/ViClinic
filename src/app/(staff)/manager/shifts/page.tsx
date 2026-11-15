import { BulkImport } from "@/components/bulk-import.client";
import { ActionDialog } from "@/components/dialog.client";
import { ShiftForm } from "./shift-form.client";
import { singleSearchParams, parsePositiveId, normalizePagination } from "@/lib/pagination";
import { PaginationBar } from "@/components/pagination";

import { FormSubmit } from "@/components/form-submit.client";
import Link from "next/link";
import { CheckCircle2, Filter } from "lucide-react";
import { formatDateOnlyDisplay, formatClinicIsoDate, isValidIsoDate, getClinicDayStart } from "@/lib/dates";
import { addDays } from "date-fns";
import { isDomainError } from "@/lib/errors";
import { listDoctorsDirectory } from "@/modules/scheduling/services";
import { listShiftsForManager, previewShiftImpact } from "@/modules/scheduling/shifts";
import { ImpactReviewPanel } from "@/modules/scheduling/impact-panel";
import { EmptyStatePanel, FeedbackBanner } from "@/components/feedback";
import { managerUpdateShiftAction } from "@/app/(staff)/manager/actions";

export const dynamic = "force-dynamic";

export default async function ManagerShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const now = new Date();
  const doctorIdFilter = parsePositiveId(params.doctorId);
  const fromDate = isValidIsoDate(params.fromDate ?? "") ? params.fromDate! : (params.editShiftId || params.previewShiftId) && isValidIsoDate(params.date ?? "") ? params.date! : formatClinicIsoDate(now);
  const toDate = isValidIsoDate(params.toDate ?? "") && params.toDate! >= fromDate ? params.toDate! : formatClinicIsoDate(addDays(getClinicDayStart(fromDate), 6));
  const weekHref = (offset: number) => `/manager/shifts?${new URLSearchParams({ fromDate: formatClinicIsoDate(addDays(getClinicDayStart(fromDate), offset)), toDate: formatClinicIsoDate(addDays(getClinicDayStart(fromDate), offset + 6)), ...(doctorIdFilter ? { doctorId: String(doctorIdFilter) } : {}) })}`;
  const previewShiftId = parsePositiveId(params.previewShiftId);
  const previewDate = params.date ?? fromDate;
  const previewStartTime = params.startTime ?? "08:00";
  const previewEndTime = params.endTime ?? "12:00";

  const created = params.created === "1";
  const updated = params.updated === "1";
  let error = params.error ?? "";

  const [doctors, shifts] = await Promise.all([
    listDoctorsDirectory(),
    listShiftsForManager({ doctorId: doctorIdFilter, fromDate, toDate }),
  ]);
  const {pageSize, page: requestedPage} = normalizePagination({page: Number(params.page), pageSize: 20}, 20, 20);
  const editedIndex = shifts.findIndex(shift => shift.shiftId === Number(params.editShiftId));
  const totalPages = Math.max(1, Math.ceil(shifts.length / pageSize));
  const page = editedIndex >= 0 ? Math.floor(editedIndex / pageSize) + 1 : Math.min(requestedPage, totalPages);
  const visibleShifts = shifts.slice((page - 1) * pageSize, page * pageSize);
  const shiftDates = [...new Set(visibleShifts.map(shift => shift.dateIso))];
  const pageHref = (target: number) => `/manager/shifts?${new URLSearchParams({fromDate, toDate, page: String(target), ...(doctorIdFilter ? {doctorId: String(doctorIdFilter)} : {})})}`;
  let impactPreview = null;
  if (previewShiftId && doctorIdFilter) {
    try {
      impactPreview = await previewShiftImpact({
        shiftId: previewShiftId,
        doctorId: doctorIdFilter,
        date: previewDate,
        startTime: previewStartTime,
        endTime: previewEndTime,
      });
    } catch (cause) {
      if (!isDomainError(cause)) throw cause;
      error = cause.message;
    }
  }

  return (
    <div className="space-y-6" >
      <div>
        <h1 className="text-2xl font-semibold text-[#0B2545]">Ca làm việc</h1>
        <p className="mt-2 text-sm text-slate-600 tabular-nums">{shifts.length} ca trong khoảng {formatDateOnlyDisplay(fromDate)}–{formatDateOnlyDisplay(toDate)}</p>
      </div>

      {created && <FeedbackBanner dialog variant="success" title="Đã thêm ca làm việc" message="Ca trực mới đã được lưu thành công." />}
      {updated && <FeedbackBanner dialog variant="success" title="Đã cập nhật ca làm việc" message="Ca trực đã được cập nhật thành công." />}
      {error && !shifts.some(shift => shift.shiftId === Number(params.editShiftId)) && <FeedbackBanner dialog variant="conflict" title="Không thể lưu ca trực" message={error} />}

      {impactPreview && impactPreview.hasImpact && previewShiftId && doctorIdFilter && (
        <ImpactReviewPanel
          mode="SOFT_PREVIEW"
          title={`Ảnh hưởng tới ${impactPreview.affectedCount} lịch hẹn đang hoạt động`}
          description="Các lịch dưới đây nằm ngoài ca trực mới. Sau khi lưu, Lễ tân cần sắp xếp lại; lịch hẹn không tự đổi giờ hoặc trạng thái."
          resolutionGuidance="Xem xét danh sách lịch hẹn và xác nhận cập nhật nếu tiếp tục thay đổi ca trực."
          affectedAppointments={impactPreview.affectedAppointments}
          showPatientName={false}

          confirmAction={
            <form action={managerUpdateShiftAction}>
              <input type="hidden" name="shiftId" value={previewShiftId} />
              <input type="hidden" name="doctorId" value={doctorIdFilter} />
              <input type="hidden" name="date" value={previewDate} />
              <input type="hidden" name="startTime" value={previewStartTime} />
              <input type="hidden" name="endTime" value={previewEndTime} />
              <input type="hidden" name="acknowledgeImpact" value="true" />
              <FormSubmit className="public-danger">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Xác nhận cập nhật</span>
              </FormSubmit>
            </form>
          }
          cancelAction={
            <Link href={`/manager/shifts${doctorIdFilter ? `?doctorId=${doctorIdFilter}` : ""}`} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Hủy thay đổi
            </Link>
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4"><ActionDialog label="Thêm ca trực mới" title="Thêm ca trực" className="public-primary">
        <ShiftForm doctors={doctors} doctorId={doctorIdFilter} date={previewDate} startTime={previewStartTime} endTime={previewEndTime} />
      </ActionDialog><BulkImport kind="shifts" /></div>

      <form method="GET" action="/manager/shifts" className="workbench-toolbar flex flex-wrap items-end gap-3">
        <div><label htmlFor="shift-from" className="block text-sm font-medium">Từ ngày</label><input id="shift-from" type="date" name="fromDate" defaultValue={fromDate} required className="public-control mt-2" /></div>
        <div><label htmlFor="shift-to" className="block text-sm font-medium">Đến ngày</label><input id="shift-to" type="date" name="toDate" defaultValue={toDate} min={fromDate} required className="public-control mt-2" /></div>
        <div className="w-full sm:w-72">
          <label htmlFor="filter-shift-doctor-select" className="block text-sm font-bold text-slate-600">Lọc theo Bác sĩ</label>
          <select id="filter-shift-doctor-select" name="doctorId" defaultValue={doctorIdFilter ?? ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-base text-[#0B2545] focus:border-[#0D8A7C] focus:outline-none min-h-11 min-w-0">
            <option value="">Tất cả bác sĩ ({doctors.length})</option>
            {doctors.map((d) => (
              <option key={d.doctorId} value={d.doctorId}>{d.fullName}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="public-primary">
          <Filter className="h-3.5 w-3.5" />
          <span>Lọc</span>
        </button>
      </form>
      <nav aria-label="Chuyển tuần ca làm việc" className="flex justify-between gap-4 text-sm font-medium text-[#0A6E63]">
        <Link href={weekHref(-7)} className="min-h-11 inline-flex items-center">← Tuần trước</Link>
        <Link href="/manager/shifts" className="min-h-11 inline-flex items-center">Tuần hiện tại</Link>
        <Link href={weekHref(7)} className="min-h-11 inline-flex items-center">Tuần sau →</Link>
      </nav>

      {shifts.length === 0 ? (
        <EmptyStatePanel title="Chưa có ca trực nào khớp bộ lọc" description="Dùng biểu mẫu bên trên để phân ca trực mới." />
      ) : (
        <div className="space-y-5">
          {shiftDates.map(day => <section key={day} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <h2 className="bg-slate-50 px-5 py-4 font-semibold tabular-nums">{formatDateOnlyDisplay(day)}</h2>
            <div className="divide-y divide-slate-200">
          {visibleShifts.filter(shift => shift.dateIso === day).map((sh) => (
            <div key={sh.shiftId} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <span className="grid min-w-0 gap-2">
                  <strong className="font-medium">{sh.doctorName}</strong>
                  <span className="text-sm tabular-nums text-slate-600">{sh.dateLabel} · {sh.startTimeLabel}–{sh.endTimeLabel}</span>
                </span>
              <ActionDialog label="Chỉnh sửa ca trực" title={`Ca trực — ${sh.doctorName}`} defaultOpen={Number(params.editShiftId) === sh.shiftId}>
              {error && Number(params.editShiftId) === sh.shiftId && <FeedbackBanner variant="conflict" title="Không thể lưu ca trực" message={error} />}
              <form action={managerUpdateShiftAction} className="grid max-w-3xl gap-4 border-t border-slate-100 py-5 sm:grid-cols-4">
                <input type="hidden" name="shiftId" value={sh.shiftId} />
                <input type="hidden" name="doctorId" value={sh.doctorId} />
                {[
                  { name: "date", type: "date", value: Number(params.editShiftId) === sh.shiftId ? params.date ?? sh.dateIso : sh.dateIso, label: "Ngày trực" },
                  { name: "startTime", type: "time", value: Number(params.editShiftId) === sh.shiftId ? params.startTime ?? sh.startTimeLabel : sh.startTimeLabel, label: "Bắt đầu" },
                  { name: "endTime", type: "time", value: Number(params.editShiftId) === sh.shiftId ? params.endTime ?? sh.endTimeLabel : sh.endTimeLabel, label: "Kết thúc" },
                ].map(field => (
                  <label key={field.name} className="text-sm text-slate-700">
                    {field.label}
                    <input name={field.name} type={field.type} required defaultValue={field.value}

                      className="mt-2 min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-base tabular-nums min-w-0" />
                  </label>
                ))}
                <FormSubmit className="min-h-11 self-end rounded bg-[#0A6E63] px-4 py-2 text-sm font-semibold text-white">Lưu thay đổi</FormSubmit>
              </form>
              </ActionDialog>
            </div>
          ))}
            </div>
          </section>)}
        </div>
      )}
      <PaginationBar page={page} pageSize={pageSize} totalPages={totalPages} totalItems={shifts.length} buildHref={pageHref} />
    </div>
  );
}
