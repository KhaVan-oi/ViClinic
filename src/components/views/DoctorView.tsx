'use client';

import React, { useState } from 'react';
import { User, DoctorShift, DoctorUnavailability, Appointment, Service } from '@/types/database';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  PlusCircle, 
  Trash2, 
  Stethoscope,
  Check
} from 'lucide-react';

interface DoctorViewProps {
  currentDoctor: User;
  shifts: DoctorShift[];
  unavailabilities: DoctorUnavailability[];
  appointments: Appointment[];
  patients: User[];
  services: Service[];
  onOpenUnavailabilityModal: () => void;
  onDeleteUnavailability: (unavailId: number) => void;
  onCompleteAppointment: (apptId: number) => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  currentDoctor,
  shifts,
  unavailabilities,
  appointments,
  patients,
  services,
  onOpenUnavailabilityModal,
  onDeleteUnavailability,
  onCompleteAppointment,
}) => {
  const doctorShifts = shifts.filter((s) => s.doctor_id === currentDoctor.user_id);
  const doctorUnavail = unavailabilities.filter((u) => u.doctor_id === currentDoctor.user_id);
  const doctorAppointments = appointments.filter(
    (a) => a.doctor_id === currentDoctor.user_id && (a.status === 'CONFIRMED' || a.status === 'COMPLETED')
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-sm">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">{currentDoctor.full_name}</h2>
              <span className="bg-sky-50 text-sky-700 text-xs font-bold px-2 py-0.5 rounded border border-sky-200">
                Bác sĩ phụ trách
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              SĐT: {currentDoctor.phone} • Email: {currentDoctor.email}
            </p>
          </div>
        </div>

        {/* Action: Mark unavailability (UF-15) */}
        <div>
          <button
            onClick={onOpenUnavailabilityModal}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-amber-200 transition-all"
          >
            <Clock className="w-4 h-4" />
            Đánh dấu khoảng không sẵn sàng (UF-15)
          </button>
        </div>
      </div>

      {/* Grid: 2 columns: Shifts & Unavailability, Assigned Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Shifts & Unavailability Schedule */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shifts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" /> Ca làm việc chính thức
              </h3>
              <span className="text-xs text-slate-400 font-medium">{doctorShifts.length} ca</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ca trực do Quản lý phòng khám thiết lập theo ngày (FR-M03-001).
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {doctorShifts.map((shift) => (
                <div key={shift.shift_id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">
                      {shift.start_at.substring(11, 16)} - {shift.end_at.substring(11, 16)}
                    </div>
                    <div className="text-slate-500 text-[11px]">{shift.start_at.substring(0, 10)}</div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                    Đã duyệt
                  </span>
                </div>
              ))}
              {doctorShifts.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">Chưa có ca trực nào được phân</div>
              )}
            </div>
          </div>

          {/* Unavailability Periods (UF-15) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" /> Khoảng bận / không sẵn sàng
              </h3>
              <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                {doctorUnavail.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Thời gian bận được loại trừ khi tính khung giờ trống cho bệnh nhân.
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {doctorUnavail.map((unavail) => (
                <div key={unavail.unavailability_id} className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-900">
                      {unavail.start_at.substring(11, 16)} - {unavail.end_at.substring(11, 16)}
                    </div>
                    <div className="text-amber-700 text-[11px]">{unavail.start_at.substring(0, 10)}</div>
                  </div>
                  <button
                    onClick={() => onDeleteUnavailability(unavail.unavailability_id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                    title="Xóa khoảng bận"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {doctorUnavail.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">Không có khoảng bận nào</div>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Today's Patient Queue / Appointments & Complete Action (UF-08) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Danh Sách Bệnh Nhân Được Phân Công Khám</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bác sĩ trực tiếp ghi nhận hoàn tất khám (UF-08 / FR-M02-009)
              </p>
            </div>
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {doctorAppointments.length} bệnh nhân
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-3">Mã lịch</th>
                  <th className="py-3 px-3">Bệnh nhân</th>
                  <th className="py-3 px-3">Dịch vụ</th>
                  <th className="py-3 px-3">Thời gian khám</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctorAppointments.map((appt) => {
                  const patient = patients.find((p) => p.user_id === appt.patient_id);
                  const service = services.find((s) => s.service_id === appt.service_id);

                  return (
                    <tr key={appt.appointment_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-bold text-slate-800">#{appt.appointment_id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{patient?.full_name}</div>
                        <div className="text-slate-400 text-[11px]">{patient?.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-700">{service?.name}</div>
                        <div className="text-slate-400 text-[11px]">{service?.duration_minutes} phút</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {appt.start_at.substring(11, 16)} - {appt.end_at.substring(11, 16)}
                      </td>
                      <td className="py-3 px-3">
                        {appt.status === 'CONFIRMED' ? (
                          <span className="bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-semibold border border-sky-200 text-[11px]">
                            CONFIRMED
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 text-[11px]">
                            COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {appt.status === 'CONFIRMED' ? (
                          <button
                            onClick={() => onCompleteAppointment(appt.appointment_id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs flex items-center gap-1 ml-auto"
                          >
                            <Check className="w-3.5 h-3.5" /> Hoàn tất khám (UF-08)
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã xong
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {doctorAppointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Chưa có lịch hẹn nào gán cho bác sĩ trong hôm nay
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
