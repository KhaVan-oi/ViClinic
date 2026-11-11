import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import { FormSubmit } from "@/components/form-submit.client";
import { ActionDialog } from "@/components/dialog.client";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { getDoctorCapabilityMatrixForManager, previewDoctorServiceRemovalImpact } from "@/modules/scheduling/doctor-services";
import { ImpactReviewPanel } from "@/modules/scheduling/impact-panel";
import { AccountStatusBadge } from "@/components/status";
import { FeedbackBanner } from "@/components/feedback";
import { managerAssignDoctorServiceAction, managerRemoveDoctorServiceAction } from "@/app/(staff)/manager/actions";

export const dynamic = "force-dynamic";

export default async function ManagerDoctorServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const blockedDoctorId = parsePositiveId(params.blockedDoctorId);
  const blockedServiceId = parsePositiveId(params.blockedServiceId);
  const assigned = params.assigned === "1";
  const removed = params.removed === "1";
  const error = params.error ?? "";
  const query = params.q?.trim() ?? "";

  const [matrix, blockedImpact] = await Promise.all([
    getDoctorCapabilityMatrixForManager(),
    blockedDoctorId && blockedServiceId
      ? previewDoctorServiceRemovalImpact({ doctorId: blockedDoctorId, serviceId: blockedServiceId })
      : Promise.resolve(null),
  ]);
  const visibleDoctors = matrix.doctors.filter(doc => doc.fullName.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));

  return (
    <div className="space-y-6" >
      <div>
        <h1 className="text-2xl font-bold text-[#0B2545]">Phân công dịch vụ cho bác sĩ</h1>
        
      </div>

      {assigned && <FeedbackBanner dialog variant="success" title="Đã phân công chuyên môn" message="Bác sĩ đã được bổ sung dịch vụ khám mới." />}
      {removed && <FeedbackBanner dialog variant="info" title="Đã gỡ phân công" message="Liên kết chuyên môn đã được gỡ bỏ." />}
      {error && !(blockedImpact && !blockedImpact.canRemove) && <FeedbackBanner dialog variant="error" title="Không thể xử lý" message={error} />}
      <form method="GET" className="flex max-w-xl items-end gap-3">
        <div className="min-w-0 flex-1"><label htmlFor="capability-search" className="text-sm font-medium">Tìm bác sĩ</label><input id="capability-search" name="q" type="search" defaultValue={query} placeholder="Nhập tên bác sĩ" className="public-control mt-2" /></div>
        <button type="submit" className="public-primary">Tìm</button>
        {query && <Link href="/manager/doctor-services" className="public-text-link">Xóa lọc</Link>}
      </form>

      {blockedImpact && !blockedImpact.canRemove && (
        <ImpactReviewPanel
          mode="HARD_BLOCK"
          title={`Không thể gỡ dịch vụ "${blockedImpact.serviceName}"`}
          description={`Còn ${blockedImpact.futureActiveCount} lịch hẹn tương lai đang chờ khám bởi bác sĩ này.`}
          resolutionGuidance="Lễ tân cần đổi lịch hẹn sang bác sĩ khác trước khi gỡ chuyên môn."
          affectedAppointments={blockedImpact.affectedAppointments}
          showPatientName={false}

          cancelAction={
            <Link href="/manager/doctor-services" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Đóng bảng kiểm tra
            </Link>
          }
        />
      )}

      <div className="divide-y divide-slate-200 bg-white px-5 sm:px-6">
        {!visibleDoctors.length && <p className="py-8 text-slate-600">Không tìm thấy bác sĩ. Thử tên khác hoặc xóa bộ lọc.</p>}
        {visibleDoctors.map((doc) => (
          <section key={doc.doctorId} className="py-5">
              <span className="flex items-start justify-between gap-4">
                <span className="min-w-0"><strong className="font-semibold">{doc.fullName}</strong><span className="mt-2 block text-sm leading-6 text-slate-600">{matrix.services.filter(service => doc.serviceIds.includes(service.serviceId)).map(service => service.name).join(", ") || "Chưa được phân công dịch vụ"}</span></span>
                <span className="flex shrink-0 flex-col items-end gap-2 text-sm">{doc.accountStatus && doc.accountStatus !== "ACTIVE" && <AccountStatusBadge status={doc.accountStatus} />}</span>
              </span>
            <div className="mt-4"><ActionDialog label="Chỉnh sửa dịch vụ" title={`Dịch vụ phụ trách — ${doc.fullName}`}>
            <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {matrix.services.map((srv) => {
                const isAssigned = doc.serviceIds.includes(srv.serviceId);
                const activeCount = matrix.activeAppointmentCountsByPair[`${doc.doctorId}:${srv.serviceId}`] ?? 0;

                return (
                  <div
                    key={srv.serviceId}

                    className="flex items-center justify-between gap-3 border-t border-slate-200 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0B2545]">{srv.name}</p>
                      <p className="text-sm text-slate-600 tabular-nums">
                        {srv.durationMinutes} phút {isAssigned && `· ${activeCount} lịch đang giữ chỗ`}
                      </p>
                    </div>

                    {isAssigned ? (
                      <form action={managerRemoveDoctorServiceAction}>
                        <input type="hidden" name="doctorId" value={doc.doctorId} />
                        <input type="hidden" name="serviceId" value={srv.serviceId} />
                        <FormSubmit destructive aria-label={`Gỡ ${srv.name} khỏi ${doc.fullName}`} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                          <Trash2 className="h-3 w-3" />
                          <span>Gỡ</span>
                        </FormSubmit>
                      </form>
                    ) : (
                      <form action={managerAssignDoctorServiceAction}>
                        <input type="hidden" name="doctorId" value={doc.doctorId} />
                        <input type="hidden" name="serviceId" value={srv.serviceId} />
                        <FormSubmit aria-label={`Gán ${srv.name} cho ${doc.fullName}`} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#0D8A7C] px-3 py-2 text-sm font-semibold text-[#0A6E63] hover:bg-[#E8F6F8]">
                          <Plus className="h-3 w-3" />
                          <span>Gán</span>
                        </FormSubmit>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
            </ActionDialog></div>
          </section>
        ))}
      </div>
    </div>
  );
}
