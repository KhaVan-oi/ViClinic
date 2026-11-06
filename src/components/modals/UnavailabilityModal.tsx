'use client';

import React, { useState } from 'react';
import { User, DoctorUnavailability, AffectedAppointment } from '@/types/database';
import { X, AlertCircle, Clock, AlertTriangle } from 'lucide-react';

interface UnavailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: User;
  onSaveUnavailability: (data: { doctor_id: number; start_at: string; end_at: string }) => Promise<{ success: boolean; message?: string; affected?: AffectedAppointment[] }>;
}

export const UnavailabilityModal: React.FC<UnavailabilityModalProps> = ({
  isOpen,
  onClose,
  doctor,
  onSaveUnavailability,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [affectedList, setAffectedList] = useState<AffectedAppointment[] | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startAt = `${date}T${startTime}:00+07:00`;
    const endAt = `${date}T${endTime}:00+07:00`;

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    setLoading(true);
    const res = await onSaveUnavailability({
      doctor_id: doctor.user_id,
      start_at: startAt,
      end_at: endAt,
    });
    setLoading(false);

    if (res.success) {
      if (res.affected && res.affected.length > 0) {
        setAffectedList(res.affected);
      } else {
        onClose();
      }
    } else {
      setError(res.message || 'Lỗi khi ghi nhận không sẵn sàng.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Đánh Dấu Khoảng Không Sẵn Sàng (UF-15)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bác sĩ {doctor.full_name} • Báo bận hoặc nghỉ đột xuất (FR-M03-002)
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {affectedList ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Đã ghi nhận! Có {affectedList.length} lịch hẹn bị xung đột (FR-M03-004)</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Hệ thống tuân thủ nghiêm ngặt quy tắc y tế: <strong>KHÔNG tự động hủy hoặc gán lại bác sĩ</strong>. Danh sách dưới đây đã được chuyển sang giao diện điều phối của Lễ tân để liên hệ bệnh nhân xử lý thủ công.
              </p>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {affectedList.map((appt) => (
                <div key={appt.appointment_id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Lịch #{appt.appointment_id}</span> ({appt.start_at.substring(11, 16)})
                    <div className="text-slate-500">{appt.service_name}</div>
                  </div>
                  <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                    Cần Lễ tân đổi lịch
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Ngày bận / không sẵn sàng *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Từ giờ *
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
                  Đến giờ *
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

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600">
              Khoảng thời gian này sẽ được loại trừ khi hệ thống tính khung giờ trống cho bệnh nhân đặt lịch (FR-M03-002).
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
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-sky-200"
              >
                {loading ? 'Đang lưu...' : 'Xác nhận khoảng bận'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
