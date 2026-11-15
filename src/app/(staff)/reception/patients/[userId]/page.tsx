
import { formatDateOnlyDisplay } from "@/lib/dates";
import { singleSearchParams, parsePositiveId } from "@/lib/pagination";

import { FormSubmit } from "@/components/form-submit.client";
import { ActionDialog } from "@/components/dialog.client";
import { PatientFields } from "@/app/(staff)/reception/patient-fields";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarPlus,
  Save,
} from "lucide-react";
import { getReceptionPatientDetail } from "@/modules/patients/server";
import { AppointmentStatusBadge, RoleBadge } from "@/components/status";
import { EmptyStatePanel, FeedbackBanner } from "@/components/feedback";
import { receptionUpdatePatientAction } from "@/app/(staff)/reception/actions";

export const dynamic = "force-dynamic";

export default async function ReceptionPatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { userId } = await params;
  const query = singleSearchParams(await searchParams);
  const id = parsePositiveId(userId);
  if (!id || id <= 0) {
    notFound();
  }

  const patient = await getReceptionPatientDetail(id);
  if (!patient) {
    notFound();
  }

  const created = query.created === "1";
  const updated = query.updated === "1";
  const error = query.error ?? "";

  return (
    <div
      className="space-y-6"

    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/reception/patients"
          className="back-link"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Về danh sách người khám</span>
        </Link>

        <Link
          href={`/reception/appointments/new?patientId=${patient.userId}`}

          className="public-primary gap-2"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Đặt lịch tại quầy</span>
        </Link>
      </div>

      {created && (
        <FeedbackBanner dialog
          variant="success"
          title="Đã lưu thông tin người khám bệnh mới"
          message={`Thông tin người khám bệnh ${patient.fullName} đã được lưu vào hệ thống.`}

        />
      )}

      {updated && (
        <FeedbackBanner dialog
          variant="success"
          title="Đã cập nhật thông tin cơ bản"
          message="Đã lưu họ tên, ngày sinh và email của người khám bệnh."

        />
      )}



      <div className="space-y-5 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-sm font-bold text-[#0A6E63]">
              Thông tin Người khám bệnh
            </span>
            <h1 className="mt-0.5 text-lg font-bold text-[#0B2545]">
              {patient.fullName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {patient.roles.map((r) => (
              <RoleBadge key={r} role={r} />
            ))}

          </div>
        </div>

        <dl className="grid gap-5 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-600">Số điện thoại</dt><dd className="mt-1 font-medium tabular-nums">{patient.phone}</dd></div>
          <div><dt className="text-slate-600">Ngày sinh</dt><dd className="mt-1 tabular-nums">{formatDateOnlyDisplay(patient.birthDate, "Chưa cung cấp")}</dd></div>
          <div><dt className="text-slate-600">Email</dt><dd className="mt-1 break-all">{patient.email ?? "Chưa cung cấp"}</dd></div>
        </dl>
        <ActionDialog label="Chỉnh sửa thông tin" title="Thông tin người khám bệnh" defaultOpen={Boolean(error)}>
      {error && (
        <FeedbackBanner
          variant="conflict"
          title="Không thể cập nhật thông tin người khám bệnh"
          message={error}

        />
      )}
          <form
            action={receptionUpdatePatientAction}

            className="mt-4 space-y-4"
          >
            <input type="hidden" name="userId" value={patient.userId} />
            <PatientFields prefix="edit-patient" values={patient} readOnlyPhone />

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <FormSubmit

                className="public-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Lưu cập nhật thông tin cơ bản</span>
              </FormSubmit>
            </div>
          </form>
        </ActionDialog>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#0B2545]">
          Lịch sử đặt lịch của người khám bệnh ({patient.appointments.length})
        </h2>

        {patient.appointments.length === 0 ? (
          <EmptyStatePanel
            title="Người khám bệnh chưa có lịch hẹn nào"
            description="Nhấn nút 'Đặt lịch tại quầy cho người khám bệnh này' ở góc trên để đặt lịch mới."
          />
        ) : (
          <div className="responsive-table">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                  <th className="px-4 py-3">Dịch vụ khám</th>
                  <th className="px-4 py-3">Bác sĩ phụ trách</th>
                  <th className="px-4 py-3">Khung giờ hẹn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patient.appointments.map((appt) => (
                  <tr key={appt.appointmentId} className="hover:bg-slate-50/70">
                    <td data-label="Dịch vụ" className="px-4 py-3 font-semibold text-[#0B2545]">
                      {appt.serviceName}
                    </td>
                    <td data-label="Bác sĩ" className="px-4 py-3 text-slate-600">
                      {appt.doctorName ?? "Chưa chỉ định"}
                    </td>
                    <td data-label="Giờ khám" className="px-4 py-3 text-slate-600 tabular-nums">
                      {appt.startAtLabel}
                    </td>
                    <td data-label="Trạng thái" className="px-4 py-3">
                      <AppointmentStatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/reception/appointments/${appt.appointmentId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-[#0B2545] hover:border-[#0D8A7C]"
                      >
                        <span>Điều phối</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
