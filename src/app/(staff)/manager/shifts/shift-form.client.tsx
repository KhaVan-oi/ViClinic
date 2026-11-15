"use client";

import { FormSubmit } from "@/components/form-submit.client";
import { managerCreateShiftAction } from "@/app/(staff)/manager/actions";

export function ShiftForm({
  doctors,
  doctorId,
  date,
  startTime,
  endTime,
}: {
  doctors: { doctorId: number; fullName: string }[];
  doctorId?: number | null;
  date: string;
  startTime: string;
  endTime: string;
}) {
  return (
    <form
      action={managerCreateShiftAction}
      className="grid gap-5 sm:grid-cols-2"
    >
      <label className="text-sm font-medium sm:col-span-2">
        Bác sĩ
        <select
          name="doctorId"
          required
          defaultValue={doctorId ?? ""}
          className="public-control mt-2"
        >
          <option value="" disabled>Chọn bác sĩ</option>
          {doctors.map((doctor) => (
            <option key={doctor.doctorId} value={doctor.doctorId}>
              {doctor.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Ngày làm việc
        <input
          name="date"
          type="date"
          required
          defaultValue={date}
          className="public-control mt-2"
        />
      </label>
      <label className="text-sm font-medium">
        Giờ bắt đầu
        <input
          name="startTime"
          type="time"
          aria-label="Giờ bắt đầu ca trực"
          required
          defaultValue={startTime}
          className="public-control mt-2"
        />
      </label>
      <label className="text-sm font-medium">
        Giờ kết thúc
        <input
          name="endTime"
          type="time"
          aria-label="Giờ kết thúc ca trực"
          required
          defaultValue={endTime}
          className="public-control mt-2"
        />
      </label>
      <div className="flex justify-end border-t border-slate-200 pt-4 sm:col-span-2">
        <FormSubmit
          className="public-primary"

        >
          Lưu lịch trực
        </FormSubmit>
      </div>
    </form>
  );
}
