'use client';

import React, { useState } from 'react';
import { Appointment, User, Service } from '@/types/database';
import { X, Calendar, Clock, ArrowRight, AlertCircle } from 'lucide-react';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  doctors: User[];
  services: Service[];
  patients: User[];
  onConfirmReschedule: (appointmentId: number, newDoctorId: number | null, newStartAt: string, newEndAt: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  appointment,
  doctors,
  services,
  patients,
  onConfirmReschedule,
}) => {
  if (!isOpen || !appointment) return null;

  const currentDoctor = doctors.find((d) => d.user_id === appointment.doctor_id);
  const currentPatient = patients.find((p) => p.user_id === appointment.patient_id);
  const currentService = services.find((s) => s.service_id === appointment.service_id);

  const initialDate = appointment.start_at.substring(0, 10);
  const initialTime = appointment.start_at.includes('T')
    ? appointment.start_at.split('T')[1].substring(0, 5)
    : '08:00';

  const [newDoctorId, setNewDoctorId] = useState<number | ''>(appointment.doctor_id || '');
  const [newDate, setNewDate] = useState<string>(initialDate);
  const [newTime, setNewTime] = useState<string>(initialTime);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (appointment.status === 'CONFIRMED' && !newDoctorId) {
      setError('Lịch CONFIRMED bắt buộc phải có bác sĩ được gán.');
      return;
    }

    const duration = currentService?.duration_minutes || 30;
    const startAt = `${newDate}T${newTime}:00+07:00`;
    const startMs = new Date(startAt).getTime();
    const endAt = new Date(startMs + duration * 60000).toISOString();

    onConfirmReschedule(
      appointment.appointment_id,
      newDoctorId ? Number(newDoctorId) : null,
      startAt,
      endAt
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Đổi Bác Sĩ Hoặc Giờ Khám (UF-05)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật ca hoặc bác sĩ trên cùng một lịch • Giữ nguyên mã lịch #{appointment.appointment_id}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span>Bệnh nhân: <strong className="text-slate-800">{currentPatient?.full_name || `Bệnh nhân #${appointment.patient_id}`}</strong></span>
              <span className="font-semibold text-sky-700">{currentService?.name}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
              <span>Hiện tại: {currentDoctor?.full_name || 'Chưa gán bác sĩ'}</span>
              <span>{appointment.start_at.substring(0, 16).replace('T', ' ')}</span>
            </div>
          </div>

          {/* New Doctor Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Bác sĩ mới {appointment.status === 'CONFIRMED' ? '*' : '(Tùy chọn)'}
            </label>
            <select
              value={newDoctorId}
              onChange={(e) => setNewDoctorId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              required={appointment.status === 'CONFIRMED'}
            >
              <option value="">-- Giữ nguyên hoặc chưa gán bác sĩ --</option>
              {doctors.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.full_name} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          {/* New Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Ngày khám mới
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Giờ khám mới
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              />
            </div>
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-sky-200 flex items-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" /> Xác nhận đổi lịch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
