"use client";

import { useState } from "react";
import Link from "next/link";
import { FormSubmit } from "@/components/form-submit.client";
import { Dialog, DialogContent } from "@/components/dialog.client";

export function PatientCancelSection({ appointmentId, appointmentLabel, canSelfCancel, canSelfChange, cancelAction }: {
  appointmentId: number;
  appointmentLabel: string;
  canSelfCancel: boolean;
  canSelfChange: boolean;
  cancelAction: (data: FormData) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  return (
    <>
      {canSelfChange ? <Link href={`/patient/book?appointmentId=${appointmentId}`} className="public-warning">Thay đổi lịch hẹn</Link> : <button type="button" className="public-warning" onClick={() => setChangeOpen(true)}>Thay đổi lịch hẹn</button>}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}><DialogContent aria-label="Không thể tự đổi lịch hẹn"><h2 className="pr-8 text-xl font-semibold text-rose-800">Cần phòng khám hỗ trợ</h2><p className="text-sm leading-6">Lịch hẹn đã được xác nhận hoặc đã đến giờ khám. Vui lòng liên hệ phòng khám để thay đổi dịch vụ, bác sĩ hoặc thời gian.</p><a className="public-danger" href="tel:19000091">Liên hệ ngay</a></DialogContent></Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="public-danger">Hủy lịch hẹn</button>
        <DialogContent aria-labelledby="patient-cancel-title" aria-describedby="patient-cancel-description">
          <h2 id="patient-cancel-title" className="pr-8 text-2xl font-semibold text-rose-800">{canSelfCancel ? "Hủy lịch hẹn này?" : "Không thể hoàn tất thao tác"}</h2>
          <p className="border-y border-slate-200 py-4 font-medium tabular-nums">{appointmentLabel}</p>
          <p id="patient-cancel-description" className="text-sm leading-6 text-rose-800">{canSelfCancel ? "Lịch hẹn sẽ bị hủy và không thể khôi phục." : "Bạn không thể tự hủy lịch hẹn sát giờ. Gọi phòng khám 1900 0091 để được hỗ trợ."}</p>
          {canSelfCancel ? <form action={cancelAction} className="space-y-5">
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <div className="flex flex-wrap justify-end gap-4">
              <button type="button" className="public-secondary" onClick={() => setOpen(false)}>Giữ lịch hẹn</button>
              <FormSubmit className="min-h-11 rounded-md bg-rose-800 px-5 text-sm font-semibold text-white hover:bg-rose-900">Xác nhận hủy</FormSubmit>
            </div>
          </form> : <a className="public-danger justify-self-end" href="tel:19000091">Liên hệ ngay</a>}
        </DialogContent>
      </Dialog>
    </>
  );
}
