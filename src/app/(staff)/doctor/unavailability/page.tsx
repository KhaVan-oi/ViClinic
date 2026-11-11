import { BulkImport } from "@/components/bulk-import.client";
import { singleSearchParams } from "@/lib/pagination";
import Link from "next/link";
import { formatClinicIsoDate, isValidIsoDate } from "@/lib/dates";
import { isDomainError } from "@/lib/errors";
import { listOwnUnavailabilities, previewUnavailabilityImpact } from "@/modules/scheduling/shifts";
import { ImpactReviewPanel } from "@/modules/scheduling/impact-panel";
import { EmptyStatePanel, FeedbackBanner } from "@/components/feedback";
import { FormSubmit } from "@/components/form-submit.client";
import { doctorCreateUnavailabilityAction } from "@/app/(staff)/doctor/actions";

export const dynamic = "force-dynamic";

export default async function DoctorUnavailabilityPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const date = params.date && isValidIsoDate(params.date) ? params.date : formatClinicIsoDate(new Date());
  const startTime = params.startTime ?? "09:00";
  const endTime = params.endTime ?? "11:00";
  const unavailabilities = await listOwnUnavailabilities();
  let preview = null;
  let error = params.error ?? "";
  if (params.preview === "1") {
    try {
      preview = await previewUnavailabilityImpact({ date, startTime, endTime });
    } catch (cause) {
      if (!isDomainError(cause)) throw cause;
      error = cause.message;
    }
  }
  const fields = [
    { name: "date", id: "unav-date", label: "Ngày bận", type: "date", value: date },
    { name: "startTime", id: "unav-start", label: "Từ giờ", type: "time", value: startTime },
    { name: "endTime", id: "unav-end", label: "Đến giờ", type: "time", value: endTime },
  ];
  return (
    <div className="space-y-8" >
      <header>
        <h1 className="text-2xl font-semibold">Đăng ký lịch bận</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">Ngừng nhận lịch trong khoảng bận. Các lịch hẹn đã có được giữ nguyên để Lễ tân điều phối.</p>
        <div className="mt-4"><BulkImport kind="unavailable" /></div>
      </header>
      {params.created === "1" && <FeedbackBanner dialog variant="success" title="Đã ghi nhận lịch bận" message="Khoảng thời gian bận đã được lưu." />}
      {error && <FeedbackBanner dialog variant="error" title="Không thể lưu lịch bận" message={error} />}
      {preview?.hasImpact ? (
        <ImpactReviewPanel mode="SOFT_PREVIEW" title={`Khoảng bận ảnh hưởng ${preview.affectedCount} lịch hẹn`}
          description="Lễ tân cần liên hệ người khám bệnh để sắp xếp lại các lịch này. Lịch chưa tự động thay đổi."
          resolutionGuidance="Kiểm tra danh sách trước khi xác nhận. Bạn cũng có thể quay lại chọn khoảng thời gian khác."
          affectedAppointments={preview.affectedAppointments} showPatientName
          confirmAction={<form action={doctorCreateUnavailabilityAction}>
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="startTime" value={startTime} />
            <input type="hidden" name="endTime" value={endTime} />
            <input type="hidden" name="acknowledgeImpact" value="true" />
            <FormSubmit className="public-primary">Xác nhận lưu lịch bận</FormSubmit>
          </form>}
          cancelAction={<Link href={`/doctor/unavailability?${new URLSearchParams({ date, startTime, endTime })}`} className="public-secondary">Chọn lại thời gian</Link>}
        />
      ) : (
        <section aria-labelledby="unavailability-form-heading" className="space-y-5 bg-white p-5 sm:p-6">
          <h2 id="unavailability-form-heading" className="text-lg font-semibold">Khoảng thời gian bận</h2>
          <form action={doctorCreateUnavailabilityAction} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {fields.map(field => <div key={field.name}>
              <label htmlFor={field.id} className="block text-sm font-medium">{field.label}</label>
              <input id={field.id} name={field.name} type={field.type} required defaultValue={field.value}
                className="public-control mt-2 tabular-nums" />
            </div>)}
            <div className="flex items-end"><FormSubmit confirmation={{"title":"Báo không sẵn sàng","message":"Ghi nhận khoảng thời gian bận? Lịch hẹn hiện có sẽ được giữ để lễ tân điều phối."}} >Lưu khoảng bận</FormSubmit></div>
          </form>
        </section>
      )}
      <section aria-labelledby="unavailability-list-heading" className="space-y-4">
        <h2 id="unavailability-list-heading" className="text-lg font-semibold tabular-nums">Lịch bận đã đăng ký ({unavailabilities.length})</h2>
        {!unavailabilities.length ? <EmptyStatePanel title="Chưa có lịch bận" description="Các khoảng thời gian bạn đăng ký sẽ xuất hiện tại đây." /> : (
          <ul className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
            {unavailabilities.map(item => <li key={item.unavailabilityId} className="flex flex-wrap justify-between gap-x-8 gap-y-2 py-4">
              <span className="font-medium tabular-nums">{item.dateLabel}</span>
              <span className="tabular-nums">{item.startTimeLabel}–{item.endTimeLabel}</span>
            </li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
