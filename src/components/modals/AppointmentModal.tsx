'use client';

import React, { useState } from 'react';
import { User, Service, Appointment } from '@/types/database';
import { X, Search, UserPlus, Calendar, Clock, AlertCircle } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'BOOK_PENDING' | 'CREATE_CONFIRMED';
  doctors: User[];
  services: Service[];
  patients: User[];
  onSaveAppointment: (appt: Partial<Appointment>, newPatient?: Partial<User>) => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  mode,
  doctors,
  services,
  patients,
  onSaveAppointment,
}) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientBirthDate, setNewPatientBirthDate] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');

  const [selectedServiceId, setSelectedServiceId] = useState<number>(services[0]?.service_id || 1);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchPatient = () => {
    setError(null);
    const found = patients.find((p) => p.phone === searchPhone.trim());
    if (found) {
      setSelectedPatient(found);
      setIsNewPatient(false);
    } else {
      setSelectedPatient(null);
      setIsNewPatient(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!selectedPatient && (!isNewPatient || !newPatientName || !newPatientBirthDate || !searchPhone)) {
      setError('Vui lòng chọn hoặc nhập đầy đủ thông tin bệnh nhân (Họ tên, Ngày sinh, Số điện thoại)');
      return;
    }

    if (mode === 'CREATE_CONFIRMED' && !selectedDoctorId) {
      setError('Tạo lịch CONFIRMED bắt buộc phải gán bác sĩ phụ trách (FR-M02-006)');
      return;
    }

    const selectedService = services.find((s) => s.service_id === Number(selectedServiceId));
    const duration = selectedService?.duration_minutes || 30;

    const startAt = `${date}T${time}:00+07:00`;
    const startMs = new Date(startAt).getTime();
    const endAt = new Date(startMs + duration * 60000).toISOString();

    const apptData: Partial<Appointment> = {
      service_id: Number(selectedServiceId),
      doctor_id: selectedDoctorId ? Number(selectedDoctorId) : null,
      start_at: startAt,
      end_at: endAt,
      status: mode === 'CREATE_CONFIRMED' ? 'CONFIRMED' : 'PENDING',
    };

    let createdPatient: Partial<User> | undefined = undefined;
    if (isNewPatient) {
      createdPatient = {
        full_name: newPatientName,
        phone: searchPhone,
        birth_date: newPatientBirthDate,
        email: newPatientEmail || null,
        role: 'PATIENT',
      };
    } else if (selectedPatient) {
      apptData.patient_id = selectedPatient.user_id;
    }

    onSaveAppointment(apptData, createdPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {mode === 'CREATE_CONFIRMED' ? 'Tạo Lịch Khám Đã Xác Nhận (CONFIRMED)' : 'Đặt Lịch Khám Mới (PENDING)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'CREATE_CONFIRMED'
                ? 'Đã đủ thông tin hồ sơ, bác sĩ và slot. Trạng thái CONFIRMED.'
                : 'Tạo phiếu hẹn PENDING. Bác sĩ là tùy chọn (không tự động gán).'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Patient lookup by phone (FR-M01-005) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Tra cứu hồ sơ bệnh nhân qua Số điện thoại (FR-M01-005)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập số điện thoại bệnh nhân (ví dụ: 0988111222)..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
              <button
                type="button"
                onClick={handleSearchPatient}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Search className="w-4 h-4" /> Tra cứu
              </button>
            </div>

            {selectedPatient && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                <div>
                  <span className="font-bold">{selectedPatient.full_name}</span> ({selectedPatient.phone})
                  <span className="text-slate-500 ml-2">Sinh: {selectedPatient.birth_date}</span>
                </div>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">Hồ sơ sẵn có</span>
              </div>
            )}

            {isNewPatient && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <UserPlus className="w-4 h-4" /> Số điện thoại mới - Tạo nhanh hồ sơ bệnh nhân (chưa cần tài khoản web)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Họ và tên *</label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white mt-1 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Ngày sinh (Bắt buộc) *</label>
                    <input
                      type="date"
                      value={newPatientBirthDate}
                      onChange={(e) => setNewPatientBirthDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white mt-1 text-xs"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-600 font-medium">Email (Tùy chọn)</label>
                    <input
                      type="email"
                      placeholder="email@vidu.vn"
                      value={newPatientEmail}
                      onChange={(e) => setNewPatientEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Service Selection (NO prices!) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              2. Dịch vụ khám
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              {services
                .filter((s) => s.is_active)
                .map((s) => (
                  <option key={s.service_id} value={s.service_id}>
                    {s.name} ({s.duration_minutes} phút)
                  </option>
                ))}
            </select>
          </div>

          {/* Section 3: Doctor Selection (Optional for PENDING, required for CONFIRMED) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Bác sĩ phụ trách {mode === 'CREATE_CONFIRMED' ? '*' : '(Tùy chọn)'}
              </label>
              {mode === 'BOOK_PENDING' && (
                <span className="text-[11px] text-slate-500">
                  {selectedDoctorId ? 'Đã chọn: Sẽ giữ slot khám' : 'Để trống: Không giữ slot & Chưa gán'}
                </span>
              )}
            </div>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              required={mode === 'CREATE_CONFIRMED'}
            >
              <option value="">-- Chưa gán bác sĩ (Chỉ chọn giờ có ít nhất 1 BS phù hợp) --</option>
              {doctors.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.full_name} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Section 4: Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Ngày khám
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Giờ khám
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                mode === 'CREATE_CONFIRMED'
                  ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {mode === 'CREATE_CONFIRMED' ? 'Xác nhận tạo lịch CONFIRMED' : 'Lưu lịch hẹn PENDING'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
