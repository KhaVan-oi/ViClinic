'use client';

import React, { useState } from 'react';
import { User, DoctorShift } from '@/types/database';
import { X, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftToEdit?: DoctorShift | null;
  doctors: User[];
  onSaveShift: (data: { doctor_id: number; start_at: string; end_at: string; shift_id?: number }) => Promise<{ success: boolean; message?: string }>;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  shiftToEdit,
  doctors,
  onSaveShift,
}) => {
  const isEditing = !!shiftToEdit;
  const today = new Date().toISOString().split('T')[0];

  const [doctorId, setDoctorId] = useState<number>(shiftToEdit ? shiftToEdit.doctor_id : doctors[0]?.user_id || 4);
  const [shiftDate, setShiftDate] = useState<string>(
    shiftToEdit ? shiftToEdit.start_at.substring(0, 10) : today
  );
  const [startTime, setStartTime] = useState<string>(
    shiftToEdit ? shiftToEdit.start_at.split('T')[1].substring(0, 5) : '08:00'
  );
  const [endTime, setEndTime] = useState<string>(
    shiftToEdit ? shiftToEdit.end_at.split('T')[1].substring(0, 5) : '12:00'
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startAt = `${shiftDate}T${startTime}:00+07:00`;
    const endAt = `${shiftDate}T${endTime}:00+07:00`;

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError('Giờ kết thúc ca phải sau giờ bắt đầu ca.');
      return;
    }

    setLoading(true);
    const res = await onSaveShift({
      doctor_id: Number(doctorId),
      start_at: startAt,
      end_at: endAt,
      shift_id: shiftToEdit?.shift_id,
    });
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.message || 'Lỗi khi lưu ca làm việc.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {isEditing ? 'Sửa Ca Làm Việc Bác Sĩ (UF-14)' : 'Tạo Ca Làm Việc Mới (UF-14)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân ca theo ngày • Tuyệt đối không được chồng lấn thời gian cùng bác sĩ (FR-M03-001)
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Bác sĩ trực *
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(Number(e.target.value))}
              disabled={isEditing}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-slate-100"
            >
              {doctors.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.full_name} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Ngày phân ca *
            </label>
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Bắt đầu ca *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Kết thúc ca *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              />
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl text-xs text-sky-800 space-y-1">
            <p className="font-semibold">Quy tắc nghiệp vụ FR-M03-001 & FR-M03-004:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-sky-700">
              <li>Hệ thống sẽ từ chối nếu thời gian ca trùng hoặc giao nhau với ca khác của cùng bác sĩ.</li>
              <li>Nếu thay đổi ca làm rớt lịch đã hẹn, hệ thống chuyển danh sách cho Lễ tân điều phối; không tự hủy hay đổi giờ.</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-indigo-200"
            >
              {loading ? 'Đang kiểm tra...' : isEditing ? 'Lưu thay đổi ca' : 'Tạo ca làm việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
