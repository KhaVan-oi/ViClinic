"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, PendingDialog } from "@/components/dialog.client";
import type { AffectedAppointmentPreviewItemDto } from "@/modules/scheduling/contracts";
import { AppointmentStatusBadge } from "@/components/status";
import {
  previewAffectedAppointment,
  sendCoordinationRequest,
  getCoordinationRequestState,
} from "@/modules/scheduling/coordination-actions";

const REASON_LABELS: Record<string, string> = {
  OUTSIDE_SHIFT: "Ngoài ca trực",
  UNAVAILABILITY_CONFLICT: "Trùng lịch bận",
  SERVICE_DEACTIVATION: "Dịch vụ ngừng hoạt động",
  DOCTOR_SERVICE_REMOVAL: "Gỡ phân công dịch vụ",
};

export function ImpactReviewPanel({
  mode,
  title,
  description,
  resolutionGuidance,
  affectedAppointments,
  showPatientName = false,
  confirmAction,
  cancelAction,
}: {
  mode: "HARD_BLOCK" | "SOFT_PREVIEW";
  title: string;
  description: string;
  resolutionGuidance: string;
  affectedAppointments: AffectedAppointmentPreviewItemDto[];
  showPatientName?: boolean;
  confirmAction?: ReactNode;
  cancelAction?: ReactNode;
}) {
  const blocked = mode === "HARD_BLOCK";
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<Awaited<
    ReturnType<typeof previewAffectedAppointment>
  > | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [result, setResult] = useState<{ message: string; error: boolean } | null>(null);
  const [sent, setSent] = useState(false);
  const previewRequest = useRef(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  useEffect(() => {
    let active = true;
    getCoordinationRequestState(affectedAppointments.map(item => item.appointmentId)).then(value => { if (active) setSent(value); }).catch(() => {});
    return () => { active = false; };
  }, [affectedAppointments]);
  function closePreview() {
    previewRequest.current++;
    setSelectedId(null);
    setSelected(null);
    setLoadingPreview(false);
  }
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        className="public-secondary"
        onClick={() => { setResult(null); setOpen(true); }}
      >
        Xem {affectedAppointments.length} lịch hẹn bị ảnh hưởng
      </button>
      <Dialog open={open && !sending && selectedId === null} onOpenChange={value => { if (!sending) setOpen(value); }}>
        <DialogContent aria-labelledby={titleId} className="max-w-2xl">
          {!result ? <>
          <div role="alert" className="flex items-start gap-3">
            <div className="min-w-0 space-y-2">
              <p
                className={`font-semibold ${blocked ? "text-rose-800" : "text-[#174954]"}`}
              >
                {blocked
                  ? "Chưa thể thực hiện thay đổi"
                  : "Cần xác nhận trước khi thay đổi"}
              </p>
              <h2 id={titleId} className="pr-8 text-lg font-semibold">
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                {description}
              </p>
            </div>
          </div>
          <p className="text-sm font-medium tabular-nums">
            {affectedAppointments.length} lịch hẹn liên quan
          </p>
          <ul
            aria-label="Lịch hẹn bị ảnh hưởng"
            tabIndex={0}
            className="max-h-80 divide-y divide-slate-200 overflow-y-auto pr-4 text-sm"
          >
            {affectedAppointments.map((appt, index) => (
              <li
                key={appt.appointmentId}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 space-y-1 break-words">
                  <button
                    type="button"
                    className="public-text-link tabular-nums"
                    onClick={async () => {
                      const request = ++previewRequest.current;
                      setSelectedId(appt.appointmentId);
                      setLoadingPreview(true);
                      setSelected(null);
                      try {
                        const preview = await previewAffectedAppointment(appt.appointmentId);
                        if (request === previewRequest.current) setSelected(preview);
                      } catch {
                        if (request === previewRequest.current) setSelected({
                          error:
                            "Không tải được lịch hẹn. Kiểm tra kết nối và đăng nhập lại nếu cần.",
                        });
                      } finally {
                        if (request === previewRequest.current) setLoadingPreview(false);
                      }
                    }}
                  >
                    {index + 1}. VC-
                    {String(appt.appointmentId).padStart(6, "0")} · Xem chi tiết
                  </button>
                  <p className="font-semibold">{appt.serviceName}</p>
                  <p className="tabular-nums">{appt.timeRangeLabel}</p>
                  {appt.doctorName && <p>Bác sĩ: {appt.doctorName}</p>}
                  {showPatientName && appt.patientName && (
                    <p>Người khám bệnh: {appt.patientName}</p>
                  )}
                  {!!appt.reasons.length && (
                    <p className="text-slate-700">
                      {appt.reasons
                        .map(
                          (reason) =>
                            REASON_LABELS[reason] ?? "Cần điều phối lại",
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
                <AppointmentStatusBadge status={appt.status} />
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
            {resolutionGuidance}
          </p>
          {!confirmSend ? (
            <div aria-label="Thao tác với lịch bị ảnh hưởng" className="flex flex-col gap-3 border-t border-slate-200 pt-4 [&>form>button]:w-full sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:[&>form>button]:w-auto">
              {!blocked && cancelAction}
            <button
              type="button"
              className="public-secondary"
              disabled={sent}
              onClick={() => setConfirmSend(true)}
            >
              {sent ? "Đã gửi điều phối" : "Yêu cầu điều phối"}
            </button>
              {!blocked && confirmAction}
            </div>
          ) : (
            <section
              className="space-y-3 border-t border-slate-200 pt-4"
              aria-label="Xác nhận chuyển điều phối"
            >
              <p>
                Gửi yêu cầu kiểm tra {affectedAppointments.length} lịch hẹn cho
                lễ tân? Việc gửi yêu cầu không tự đổi hoặc hủy lịch hẹn.
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse sm:justify-start">
                <button
                  type="button"
                  disabled={sending}
                  className="public-primary"
                  onClick={async () => {
                    setSending(true);
                    try {
                      const response = await sendCoordinationRequest(
                        affectedAppointments.map((item) => item.appointmentId),
                        title,
                      );
                      setResult({ error: Boolean(response.error), message: response.error ??
                          `Đã gửi yêu cầu điều phối ${response.sent} lịch hẹn.` });
                      if (!response.error) { setConfirmSend(false); setSent(true); }
                    } catch {
                      setResult({ error: true, message: "Không gửi được yêu cầu. Kiểm tra kết nối và thử lại." });
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  Xác nhận gửi
                </button>
                <button
                  type="button"
                  disabled={sending}
                  className="public-secondary"
                  onClick={() => setConfirmSend(false)}
                >
                  Quay lại
                </button>
              </div>
            </section>
          )}
          </> : <>
            <h2 id={titleId} className={`pr-8 text-xl font-semibold ${result.error ? "text-rose-800" : "text-[#0B2545]"}`}>{result.error ? "Chưa gửi được yêu cầu" : "Đã chuyển cho lễ tân"}</h2>
            <p className="text-sm leading-7 text-slate-700">{result.message}</p>
            <div className="flex justify-end"><button type="button" className="public-primary" onClick={() => setResult(null)}>Quay lại danh sách</button></div>
          </>}
        </DialogContent>
      </Dialog>
      <Dialog open={selectedId !== null} onOpenChange={value => { if (!value) closePreview(); }}>
        <DialogContent aria-label="Chi tiết lịch hẹn">
          <h2 className="text-xl font-semibold">Chi tiết lịch hẹn</h2>
          {loadingPreview && <p role="status" className="text-sm text-slate-600">Đang tải lịch hẹn…</p>}
          {selected && (
            <section
              className="space-y-3"
              aria-label="Thông tin lịch hẹn"
            >
              {selected.error ? (
                <p role="alert">{selected.error}</p>
              ) : (
                selected.appointment && (
                  <>
                    <h3 className="font-semibold tabular-nums">
                      Phiếu hẹn VC-
                      {String(selected.appointment.appointmentId).padStart(
                        6,
                        "0",
                      )}
                    </h3>
                    <AppointmentStatusBadge
                      status={selected.appointment.status}
                    />
                    <p>{selected.appointment.service}</p>
                    <p className="tabular-nums">{selected.appointment.slot}</p>
                    <p>Bác sĩ: {selected.appointment.doctor}</p>
                    {selected.appointment.patient && (
                      <p>Người khám bệnh: {selected.appointment.patient}</p>
                    )}
                    {selected.appointment.phone && (
                      <p>Số điện thoại: {selected.appointment.phone}</p>
                    )}
                  </>
                )
              )}
              <button
                type="button"
                onClick={closePreview}
                className="public-secondary"
              >
                Quay lại danh sách
              </button>
            </section>
          )}
        </DialogContent>
      </Dialog>
      <PendingDialog open={sending} label="Đang chuyển yêu cầu cho lễ tân…" />
    </>
  );
}
