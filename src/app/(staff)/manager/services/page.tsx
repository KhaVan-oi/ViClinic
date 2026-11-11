import { BulkImport } from "@/components/bulk-import.client";
import { ActionDialog } from "@/components/dialog.client";
import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import { FormSubmit } from "@/components/form-submit.client";
import Link from "next/link";
import { listAllServicesForManager, previewServiceDeactivationImpact } from "@/modules/scheduling/services";
import { ImpactReviewPanel } from "@/modules/scheduling/impact-panel";
import { FeedbackBanner } from "@/components/feedback";
import { managerCreateServiceAction, managerDeactivateServiceAction, managerUpdateServiceAction } from "@/app/(staff)/manager/actions";

export const dynamic = "force-dynamic";

export default async function ManagerServicesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const blockedId = parsePositiveId(params.blockedServiceId);
  const [services, impact] = await Promise.all([
    listAllServicesForManager(),
    blockedId ? previewServiceDeactivationImpact({ serviceId: blockedId }) : null,
  ]);
  return (
    <div className="space-y-8" >
      <header>
        <h1 className="text-2xl font-bold">Dịch vụ khám</h1>
        
      </header>
      {params.created === "1" && <FeedbackBanner dialog variant="success" title="Đã thêm dịch vụ" message="Bạn có thể phân công bác sĩ cho dịch vụ này." />}
      {params.updated === "1" && <FeedbackBanner dialog variant="success" title="Đã cập nhật dịch vụ" message="Thông tin đã được lưu." />}
      {params.deactivated === "1" && <FeedbackBanner dialog variant="info" title="Đã ngừng dịch vụ" message="Dịch vụ không còn xuất hiện trong danh mục đặt lịch." />}
      {params.error && !(impact && !impact.canDeactivate) && <FeedbackBanner dialog variant="error" title="Không thể xử lý" message={params.error} />}
      {impact && !impact.canDeactivate && (
        <ImpactReviewPanel
          mode="HARD_BLOCK"
          title={`Không thể ngừng dịch vụ “${impact.serviceName}”`}
          description={`Còn ${impact.futureActiveCount} lịch hẹn tương lai sử dụng dịch vụ này.`}
          resolutionGuidance="Lễ tân cần điều phối các lịch hẹn này trước khi ngừng dịch vụ."
          affectedAppointments={impact.affectedAppointments}
          showPatientName={false}

          cancelAction={<Link href="/manager/services" className="public-text-link">Đóng bảng kiểm tra</Link>}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4"><ActionDialog label="Thêm dịch vụ" title="Thêm dịch vụ" className="public-primary">
        <form action={managerCreateServiceAction} className="mt-5 grid max-w-3xl items-end gap-5 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label className="space-y-2 text-sm font-semibold">
            <span className="block">Tên dịch vụ</span>
            <input name="name" required className="public-control min-w-0" />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span className="block">Thời lượng (phút)</span>
            <input name="durationMinutes" type="number" min={1} step={1} required defaultValue={30} className="public-control tabular-nums min-w-0" />
          </label>
          <FormSubmit className="public-primary">Thêm dịch vụ</FormSubmit>
        </form>
      </ActionDialog><BulkImport kind="services" /></div>
      <div className="bg-white px-5 sm:px-7">
        {services.map(service => (
          <article key={service.serviceId} className="border-b border-slate-200 py-6 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{service.name}</h2>
                <p className="mt-2 text-sm tabular-nums text-slate-600">
                  {service.durationMinutes} phút · {service.doctorCount ?? 0} bác sĩ · {service.activeAppointmentCount ?? 0} lịch hẹn đang hoạt động
                </p>
              </div>
              <p className="text-sm font-medium text-slate-700">
                {service.isActive ? "Đang tiếp nhận" : "Đã ngừng"}
              </p>
            </div>
            <ActionDialog label="Chỉnh sửa dịch vụ" title={`Chỉnh sửa ${service.name}`} className="public-secondary mt-3">
              <form action={managerUpdateServiceAction} className="mt-4 grid max-w-3xl items-end gap-5 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                <input type="hidden" name="serviceId" value={service.serviceId} />
                <label className="space-y-2 text-sm font-semibold">
                  <span className="block">Tên dịch vụ</span>
                  <input name="name" required defaultValue={service.name} className="public-control min-w-0" />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  <span className="block">Thời lượng (phút)</span>
                  <input name="durationMinutes" type="number" min={1} step={1} required defaultValue={service.durationMinutes} className="public-control tabular-nums min-w-0" />
                </label>
                <FormSubmit className="public-primary">Lưu thay đổi</FormSubmit>
              </form>
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="mb-3 max-w-2xl text-sm text-slate-600">
                  {service.isActive ? "Ngừng dịch vụ sẽ ẩn dịch vụ khỏi danh mục đặt lịch. Các lịch hẹn tương lai phải được xử lý trước." : "Mở lại để dịch vụ xuất hiện trong danh mục đặt lịch."}
                </p>
                <form action={service.isActive ? managerDeactivateServiceAction : managerUpdateServiceAction}>
                  <input type="hidden" name="serviceId" value={service.serviceId} />
                  {!service.isActive && <>
                    <input type="hidden" name="name" value={service.name} />
                    <input type="hidden" name="durationMinutes" value={service.durationMinutes} />
                    <input type="hidden" name="isActive" value="true" />
                  </>}
                  <FormSubmit destructive={service.isActive} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                    {service.isActive ? "Ngừng tiếp nhận dịch vụ" : "Mở lại dịch vụ"}
                  </FormSubmit>
                </form>
              </div>
            </ActionDialog>
          </article>
        ))}
      </div>
    </div>
  );
}
