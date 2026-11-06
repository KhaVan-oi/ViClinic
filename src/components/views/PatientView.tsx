'use client';

import React, { useState } from 'react';
import { User, Appointment, Service } from '@/types/database';
import { 
  Calendar, 
  Clock, 
  PlusCircle, 
  XCircle, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Stethoscope
} from 'lucide-react';

interface PatientViewProps {
  currentPatient: User;
  appointments: Appointment[];
  doctors: User[];
  services: Service[];
  onOpenBooking: () => void;
  onCancelAppointment: (apptId: number) => void;
}

export const PatientView: React.FC<PatientViewProps> = ({
  currentPatient,
  appointments,
  doctors,
  services,
  onOpenBooking,
  onCancelAppointment,
}) => {
  const patientAppointments = appointments.filter((a) => a.patient_id === currentPatient.user_id);

  // Check if cancellation is allowed (at least 2 hours before start_at, FR-M02-010)
  const canPatientCancel = (startAt: string): { allowed: boolean; reason?: string } => {
    const now = Date.now();
    const apptTime = new Date(startAt).getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (apptTime - now < twoHoursMs) {
      return {
        allowed: false,
        reason: 'Theo quy định y tế (FR-M02-010), bệnh nhân chỉ được tự hủy khi còn cách giờ khám ít nhất 2 giờ. Trong vòng 2 giờ cuối, vui lòng liên hệ Lễ tân qua hotline để hỗ trợ.',
      };
    }
    return { allowed: true };
  };

  const handlePatientCancel = (appt: Appointment) => {
    const check = canPatientCancel(appt.start_at);
    if (!check.allowed) {
      alert(check.reason);
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn hủy lịch khám #${appt.appointment_id}?`)) {
      onCancelAppointment(appt.appointment_id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Cổng Bệnh Nhân Trực Tuyến</h2>
            <span className="bg-sky-50 text-sky-700 text-xs font-bold px-2 py-0.5 rounded border border-sky-200">
              Bệnh nhân
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chào mừng {currentPatient.full_name} • Ngày sinh: {currentPatient.birth_date} • SĐT: {currentPatient.phone}
          </p>
        </div>

        <button
          onClick={onOpenBooking}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-sky-200 transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Đặt lịch khám mới (UF-03)
        </button>
      </div>

      {/* Booking Rules Reminder */}
      <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 space-y-1.5">
        <div className="font-bold flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-sky-600" />
          Quy định y tế khi đặt và hủy lịch (FR-M02-003, FR-M02-010):
        </div>
        <ul className="list-disc list-inside text-[11px] text-sky-800 space-y-1">
          <li>Phiếu hẹn đặt trực tuyến có trạng thái <strong>PENDING</strong>. Bác sĩ là tùy chọn (nếu chọn bác sĩ sẽ được giữ slot).</li>
          <li>Lễ tân sẽ liên hệ hoặc tiếp nhận để chuyển sang <strong>CONFIRMED</strong>.</li>
          <li><strong>Quy định hủy:</strong> Bạn được tự hủy lịch khi còn ít nhất 2 giờ trước giờ khám. Trong 2 giờ cuối, chỉ Lễ tân mới có thẩm quyền hủy.</li>
        </ul>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Lịch Hẹn Của Tôi</h3>
          <span className="text-xs text-slate-500">{patientAppointments.length} lịch khám</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-4">Mã lịch</th>
                <th className="py-3 px-4">Dịch vụ khám</th>
                <th className="py-3 px-4">Bác sĩ phụ trách</th>
                <th className="py-3 px-4">Thời gian khám</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patientAppointments.map((appt) => {
                const service = services.find((s) => s.service_id === appt.service_id);
                const doctor = doctors.find((d) => d.user_id === appt.doctor_id);
                const cancelCheck = canPatientCancel(appt.start_at);

                return (
                  <tr key={appt.appointment_id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-bold text-slate-800">#{appt.appointment_id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{service?.name}</div>
                      <div className="text-slate-400 text-[11px]">{service?.duration_minutes} phút</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {doctor ? (
                        <div className="font-semibold text-sky-800">{doctor.full_name}</div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán bác sĩ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {appt.start_at.substring(11, 16)} - {appt.end_at.substring(11, 16)}
                      </div>
                      <div className="text-slate-400 text-[11px]">{appt.start_at.substring(0, 10)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {appt.status === 'PENDING' && (
                        <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-semibold border border-amber-200 text-[11px]">
                          PENDING (Chờ xác nhận)
                        </span>
                      )}
                      {appt.status === 'CONFIRMED' && (
                        <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full font-semibold border border-sky-200 text-[11px]">
                          CONFIRMED (Đã xác nhận)
                        </span>
                      )}
                      {appt.status === 'COMPLETED' && (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200 text-[11px]">
                          COMPLETED (Đã khám xong)
                        </span>
                      )}
                      {appt.status === 'CANCELLED' && (
                        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold border border-slate-200 text-[11px]">
                          CANCELLED (Đã hủy)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                        <div>
                          {cancelCheck.allowed ? (
                            <button
                              onClick={() => handlePatientCancel(appt)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Hủy lịch
                            </button>
                          ) : (
                            <span
                              className="text-slate-400 text-[11px] italic cursor-help"
                              title="Dưới 2 giờ trước khám: Chỉ Lễ tân có quyền hủy (FR-M02-010)"
                            >
                              Khóa hủy (&lt; 2h)
                            </span>
                          )}
                        </div>
                      )}
                      {(appt.status === 'COMPLETED' || appt.status === 'CANCELLED') && (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {patientAppointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Bạn chưa có lịch khám nào. Hãy bấm "Đặt lịch khám mới" để đăng ký.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
