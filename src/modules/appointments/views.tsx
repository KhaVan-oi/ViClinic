import { readPrivateSearch, submitPrivateSearch } from "@/server/private-search";
import { type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { clinicConfig } from "@/config/clinic";
import { ArrowUpRight } from "lucide-react";
import { ActionDialog } from "@/components/dialog.client";
import { AppointmentCode } from "@/components/appointment-code.client";
import { PdfDownloadButton } from "@/components/pdf-download.client";
import {
  type DoctorAppointmentDto,
  type ReceptionAppointmentDto,
  type AppointmentHistoryItemDto,
  type PatientAppointmentDto,
} from "@/modules/appointments/contracts";
import { AppointmentStatusBadge } from "@/components/status";
import { EmptyStatePanel } from "@/components/feedback";
import { type AppointmentStatus, APPOINTMENT_STATUSES, formatAppointmentStatusLabel, formatRoleLabel } from "@/config/business";
import { formatDateOnlyDisplay, formatClinicIsoDate, isValidIsoDate } from "@/lib/dates";
import { parsePositiveId } from "@/lib/pagination";
import { requireActiveContext } from "@/server/authorization";
import { listDoctorsDirectory, listBookableServices } from "@/modules/scheduling/services";
import { FullCalendarWrapper } from "@/components/calendar.client";

export async function StaffCalendarPage({ role, params }: {
  role: "RECEPTIONIST" | "DOCTOR" | "CLINIC_MANAGER";
  params: Record<string, string | undefined>;
}) {
  await requireActiveContext([role]);
  const directory = role !== "DOCTOR";
  const [doctors, services] = directory ? await Promise.all([listDoctorsDirectory(), listBookableServices()]) : [[], []];
  const fromDate = params.fromDate && isValidIsoDate(params.fromDate) ? params.fromDate : formatClinicIsoDate(new Date());
  const span: 3 | 7 = params.days === "3" ? 3 : params.days === "7" ? 7 : role === "DOCTOR" ? 7 : 3;
  const doctorId = directory ? parsePositiveId(params.doctorId) : null;
  const serviceId = directory ? parsePositiveId(params.serviceId) : null;
  const status = APPOINTMENT_STATUSES.find(value => value === params.status) ?? "ALL";
  const section = role === "DOCTOR" ? "doctor" : role === "RECEPTIONIST" ? "reception" : "manager";
  const query = await readPrivateSearch(`/${section}/calendar`);
  const fields = [
    { name: "days", label: "Khung hiển thị", value: String(span), options: [{ value: "3", label: "3 ngày liên tiếp" }, { value: "7", label: "7 ngày liên tiếp" }] },
    ...(directory ? [
      { name: "doctorId", label: "Bác sĩ", value: String(doctorId ?? ""), options: [{ value: "", label: "Tất cả bác sĩ" }, ...doctors.map(doctor => ({ value: String(doctor.doctorId), label: doctor.fullName }))] },
      { name: "serviceId", label: "Dịch vụ", value: String(serviceId ?? ""), options: [{ value: "", label: "Tất cả dịch vụ" }, ...services.map(service => ({ value: String(service.serviceId), label: service.name }))] },
    ] : []),
    { name: "status", label: "Trạng thái lịch hẹn", value: status, options: [{ value: "ALL", label: "Tất cả trạng thái" }, ...APPOINTMENT_STATUSES.map(value => ({ value, label: formatAppointmentStatusLabel(value) }))] },
  ];
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">{role === "DOCTOR" ? "Lịch làm việc của tôi" : role === "RECEPTIONIST" ? "Lịch điều phối khám" : "Lịch phòng khám"}</h1><p className="mt-2 text-sm text-slate-600">{role === "RECEPTIONIST" ? "Tra cứu theo bác sĩ, dịch vụ hoặc số điện thoại người khám bệnh." : "Xem ca làm việc, lịch bận và lịch hẹn theo ngày."}</p></header>
      <form action={submitPrivateSearch.bind(null, `/${section}/calendar`)} className="grid items-end gap-4 bg-white p-5 sm:grid-cols-2 xl:grid-cols-3">
        <label htmlFor="calendar-date" className="text-sm font-medium">Từ ngày<input id="calendar-date" name="fromDate" type="date" required defaultValue={fromDate} className="public-control mt-2 tabular-nums" /></label>
        {fields.map(field => <label key={field.name} htmlFor={`calendar-${field.name}`} className="text-sm font-medium">{field.label}<select id={`calendar-${field.name}`} name={field.name} defaultValue={field.value} className="public-control mt-2">{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
        <label htmlFor="calendar-query" className="text-sm font-medium">Tìm lịch hẹn<input id="calendar-query" name="query" type="search" maxLength={120} defaultValue={query} placeholder="Mã lịch hẹn, số điện thoại hoặc họ tên" className="public-control mt-2" /></label>
        <button type="submit" className="public-primary justify-self-start">Xem lịch</button>
      </form>
      <FullCalendarWrapper key={`${fromDate}-${span}-${doctorId}-${serviceId}-${status}-${query}`} initialDate={fromDate} initialSpan={params.days ? span : undefined} filters={{ doctorId, serviceId, status, query: query }} role={role} appointmentHrefPrefix={role === "CLINIC_MANAGER" ? undefined : role === "DOCTOR" ? "/doctor/appointments" : "/reception/appointments"} />
    </div>
  );
}

function AppointmentTable({ columns, rows }: {
  columns: string[];
  rows: { id: number; href: string; cells: ReactNode[]; action: string }[];
}) {
  return (
    <div className="responsive-table" role="region" aria-label="Danh sách lịch hẹn" tabIndex={0}>
      <table>
        <thead><tr>{columns.map(label => <th key={label} scope="col">{label}</th>)}<th scope="col">Thao tác</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          {row.cells.map((cell, index) => <td key={columns[index]} data-label={columns[index]}>{cell}</td>)}
          <td><Link href={row.href} className="public-text-link gap-2">{row.action}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

export function ReceptionAppointmentTable({ items }: { items: ReceptionAppointmentDto[] }) {
  if (!items.length) return <EmptyStatePanel title="Không có lịch hẹn khớp bộ lọc" description="Chọn hàng đợi khác hoặc xóa bộ lọc." />;
  return <AppointmentTable columns={["Người khám bệnh", "Dịch vụ", "Bác sĩ", "Giờ khám", "Trạng thái"]} rows={items.map(appt => ({
    id: appt.appointmentId,
    href: `/reception/appointments/${appt.appointmentId}`,
    action: appt.status === "COMPLETED" || appt.status === "CANCELLED" ? "Xem phiếu hẹn" : "Điều phối",
    cells: [
      <div key="patient"><strong>{appt.patientName}</strong><p className="mt-1 tabular-nums text-slate-600">{appt.patientPhone}</p></div>,
      <div key="service">{appt.serviceName}<p className="mt-1 tabular-nums text-slate-600">{appt.serviceDurationMinutes} phút</p></div>,
      appt.doctorName ?? "Chưa phân công",
      <span key="time" className="appointment-table-time"><span>{appt.slotLabel.split(" · ")[0]}</span><span>{appt.slotLabel.split(" · ").slice(1).join(" · ")}</span></span>,
      <div key="status" className="space-y-2"><AppointmentStatusBadge status={appt.status} />
        {appt.needsCoordination && <p className="text-rose-800">Cần điều phối</p>}
        {appt.isOverduePending && <p className="text-amber-800">Đã quá giờ, chưa xác nhận</p>}
        {appt.isOverdueConfirmed && <p className="text-slate-600">Đã quá giờ, chưa hoàn tất</p>}
      </div>,
    ],
  }))} />;
}

export function DoctorAppointmentTable({ items }: { items: DoctorAppointmentDto[] }) {
  if (!items.length) return <EmptyStatePanel title="Không có ca khám khớp bộ lọc" description="Chọn nhóm lịch khác hoặc điều chỉnh nội dung tìm kiếm và ngày khám." />;
  return <AppointmentTable columns={["Người khám bệnh", "Ngày sinh", "Dịch vụ", "Giờ khám", "Trạng thái"]} rows={items.map(appt => ({
    id: appt.appointmentId,
    href: `/doctor/appointments/${appt.appointmentId}`,
    action: "Xem ca khám",
    cells: [
      <strong key="patient">{appt.patientName}</strong>,
      <span key="birth" className="tabular-nums">{formatDateOnlyDisplay(appt.patientBirthDate)}</span>,
      appt.serviceName,
      <span key="time" className="appointment-table-time"><span>{appt.slotLabel.split(" · ")[0]}</span><span>{appt.slotLabel.split(" · ").slice(1).join(" · ")}</span></span>,
      <div key="status" className="space-y-2"><AppointmentStatusBadge status={appt.status} />{appt.isOverdueConfirmed && <p className="text-slate-600">Đã quá giờ, chưa hoàn tất</p>}</div>,
    ],
  }))} />;
}

export function AppointmentSummaryPanel({
  appointmentId, status, serviceName, serviceDurationMinutes, doctorName, slotLabel,
  patientName, patientBirthDate, patientPhone, extraBadges, actions, allowSave = false,
}: {
  appointmentId?: number;
  status: AppointmentStatus;
  serviceName: string;
  serviceDurationMinutes: number;
  doctorName: string | null;
  slotLabel: string;
  patientName?: string;
  patientBirthDate?: string | null;
  patientPhone?: string;
  extraBadges?: ReactNode;
  actions?: ReactNode;
  allowSave?: boolean;
}) {
  const birthDate = patientBirthDate ? formatDateOnlyDisplay(patientBirthDate) : undefined;
  const fields = [
    { label: "Người khám bệnh", value: patientName },
    { label: "Ngày sinh", value: birthDate },
    { label: "Số điện thoại", value: patientPhone },
    { label: "Ngày khám", value: slotLabel.split(" · ")[0] },
    { label: "Giờ khám", value: slotLabel.split(" · ").slice(1).join(" · ") },
    { label: "Thời lượng dự kiến", value: `${serviceDurationMinutes} phút` },
    { label: "Bác sĩ phụ trách", value: doctorName ?? "Chưa phân công", warning: !doctorName },
  ].filter(field => field.value);
  return <div><section id={`appointment-receipt-${appointmentId}`} className="appointment-receipt">
    <div className="grid gap-5 border-b border-slate-200 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div><Image src="/images/brand/logo.webp" alt="ViClinic" width={180} height={64} className="h-auto w-40" /><div className="mt-4 text-sm text-slate-600"><p className="font-semibold text-slate-900">{clinicConfig.brandFullName}</p><p className="mt-1">{clinicConfig.address}</p></div></div>
      <div className="text-right"><p className="text-lg font-semibold sm:text-xl">Phiếu hẹn khám</p>{appointmentId && <><p className="mt-1 text-sm font-semibold tabular-nums text-green-800">{`VC-${String(appointmentId).padStart(6,"0")}`}</p><AppointmentCode appointmentId={appointmentId} /></>}</div>
    </div>
    <header className="appointment-receipt-header"><h2 className="text-xl font-semibold">Dịch vụ khám: {serviceName}</h2><div className="flex flex-wrap items-center gap-3"><span className="text-sm text-slate-600">Tình trạng:</span><AppointmentStatusBadge status={status} />{extraBadges && <span className="receipt-internal">{extraBadges}</span>}</div></header>
    <dl className="appointment-receipt-fields">{fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd className={field.warning ? "text-rose-800" : undefined}>{field.value}</dd></div>)}</dl>
  </section>{(allowSave || actions) && <div className="appointment-actions mt-4 flex flex-wrap items-center justify-end gap-3">{allowSave && appointmentId && <PdfDownloadButton href={`/api/ui/receipt?id=${appointmentId}`} />}{actions}</div>}</div>;
}

export function AppointmentTimeline({ history, showActorRoleBadges = true }: {
  history: AppointmentHistoryItemDto[];
  showActorRoleBadges?: boolean;
}) {
  return (
    <ActionDialog label="Lịch sử cập nhật" title="Lịch sử lịch hẹn" className="public-quiet">
      {!history.length && <p className="text-sm text-slate-600">Chưa có thay đổi nào.</p>}
      <ol className="divide-y divide-slate-200">
        {history.map(item => (
          <li key={item.historyId} className="space-y-2 py-4 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-medium">
                {!item.oldStatus ? "Tạo lịch hẹn" : item.oldStatus !== item.newStatus ? `${formatAppointmentStatusLabel(item.oldStatus)} → ${formatAppointmentStatusLabel(item.newStatus)}` : "Cập nhật lịch hẹn"}
              </p>
              <time dateTime={item.changedAtIso} className="text-sm tabular-nums text-slate-600">{item.changedAtLabel}</time>
            </div>
            <p className="text-sm text-slate-600">
              {item.actorName}
              {showActorRoleBadges && item.actorRoles.length > 0 && ` · ${item.actorRoles.filter(role => role !== "PATIENT" || item.actorRoles.length === 1).map(formatRoleLabel).join(", ")}`}
            </p>
            {item.oldDoctorId !== item.newDoctorId && (
              <p className="text-sm">Bác sĩ: {item.oldDoctorName ?? "Chưa phân công"} → {item.newDoctorName ?? "Chưa phân công"}</p>
            )}
            {item.oldServiceName && item.newServiceName && item.oldServiceName !== item.newServiceName && <p className="text-sm">Dịch vụ: {item.oldServiceName} → {item.newServiceName}</p>}
            {item.oldSlotLabel !== null && item.oldSlotLabel !== item.newSlotLabel && (
              <p className="text-sm tabular-nums">Thời gian: {item.oldSlotLabel} → {item.newSlotLabel}</p>
            )}
          </li>
        ))}
      </ol>
    </ActionDialog>
  );
}

export function PatientAppointmentList({
  items,
}: {
  items: PatientAppointmentDto[];
}) {
  return (
    <ul className="divide-y divide-slate-200">
      {items.map((appt) => (
        <li
          key={appt.appointmentId}

          className="grid min-w-0 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="min-w-0 space-y-2">
            <p className="font-semibold text-[#0B2545] tabular-nums">
              {appt.slotLabel}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="text-base font-semibold">{appt.serviceName}</h3>
              <AppointmentStatusBadge status={appt.status} />
            </div>
            <p className="text-sm text-slate-600">
              {appt.doctorName ?? "Bác sĩ sẽ được Lễ tân phân công"}
            </p>
          </div>
          <Link
            href={`/patient/appointments/${appt.appointmentId}`}

            aria-label={`Xem lịch hẹn ${appt.serviceName}, ${appt.slotLabel}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-[#0A6E63] hover:bg-[#E8F4F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D8A7C]"
          >
            Xem chi tiết
          </Link>
        </li>
      ))}
    </ul>
  );
}
