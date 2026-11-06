'use client';

import React, { useState } from 'react';
import { Appointment, User, Service, AffectedAppointment } from '@/types/database';
import { 
  Calendar, 
  Clock, 
  UserCheck, 
  PlusCircle, 
  CheckCircle, 
  RotateCcw, 
  XCircle, 
  AlertTriangle, 
  Search,
  Filter,
  Check
} from 'lucide-react';

interface ReceptionistViewProps {
  appointments: Appointment[];
  doctors: User[];
  services: Service[];
  patients: User[];
  affectedAppointments: AffectedAppointment[];
  onOpenBooking: () => void;
  onOpenCreateConfirmed: () => void;
  onOpenReschedule: (appt: Appointment) => void;
  onConfirmPending: (apptId: number, doctorId: number) => void;
  onCompleteAppointment: (apptId: number) => void;
  onCancelAppointment: (apptId: number) => void;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({
  appointments,
  doctors,
  services,
  patients,
  affectedAppointments,
  onOpenBooking,
  onOpenCreateConfirmed,
  onOpenReschedule,
  onConfirmPending,
  onCompleteAppointment,
  onCancelAppointment,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorAssignId, setDoctorAssignId] = useState<{ [key: number]: number }>({});

  const filteredAppointments = appointments.filter((appt) => {
    if (statusFilter !== 'ALL' && appt.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const patient = patients.find((p) => p.user_id === appt.patient_id);
      const doc = doctors.find((d) => d.user_id === appt.doctor_id);
      const sName = services.find((s) => s.service_id === appt.service_id)?.name.toLowerCase();
      const matchPatient = patient?.full_name.toLowerCase().includes(term) || patient?.phone.includes(term);
      const matchDoc = doc?.full_name.toLowerCase().includes(term);
      const matchId = appt.appointment_id.toString().includes(term);
      return matchPatient || matchDoc || sName?.includes(term) || matchId;
    }
    return true;
  });

  const getStatusBadge = (status: Appointment['status'], hasDoctor: boolean) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            PENDING {hasDoctor ? '(Giữ slot)' : '(Chưa giữ slot)'}
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <CheckCircle className="w-3 h-3 text-sky-500" />
            CONFIRMED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-500" />
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-400" />
            CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Quản Lý & Điều Phối Lịch Khám</h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded border border-emerald-200">
              Lễ tân tiếp đón
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Điều phối lịch khám 4 trạng thái chuẩn: <strong>PENDING, CONFIRMED, COMPLETED, CANCELLED</strong>. Không tạo hàng đợi hay số thứ tự.
          </p>
        </div>

        {/* Two distinct creation buttons as required */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenBooking}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:border-slate-400"
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            Đặt lịch khám (PENDING)
          </button>

          <button
            onClick={onOpenCreateConfirmed}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-sky-200 transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            Tạo lịch khám đã xác nhận (CONFIRMED)
          </button>
        </div>
      </div>

      {/* Affected Appointments Warning Panel (FR-M03-004) */}
      {affectedAppointments.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">
                  CẢNH BÁO ĐIỀU PHỐI: Có {affectedAppointments.length} lịch hẹn bị xung đột lịch bác sĩ (FR-M03-004)
                </h3>
                <span className="text-xs text-amber-800 font-semibold bg-amber-200/70 px-2 py-0.5 rounded">
                  Hệ thống không tự gán lại
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Bác sĩ đã đổi ca hoặc khai báo thời gian bận. Vui lòng liên hệ bệnh nhân để chọn bác sĩ khác hoặc đổi sang khung giờ phù hợp.
              </p>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {affectedAppointments.map((item) => (
                  <div key={item.appointment_id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Lịch #{item.appointment_id}</span>
                      <span className="text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                        {item.conflict_reason === 'UNAVAILABILITY_OVERLAP' ? 'Trùng giờ bận của BS' : 'Ngoài ca trực'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <div>BS: <span className="font-medium text-slate-800">{item.doctor_name}</span></div>
                      <div>Giờ: {item.start_at.substring(11, 16)} - {item.end_at.substring(11, 16)} ({item.start_at.substring(0, 10)})</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => onOpenReschedule(item)}
                        className="flex-1 py-1 text-center bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Đổi bác sĩ / giờ
                      </button>
                      <button
                        onClick={() => onCancelAppointment(item.appointment_id)}
                        className="py-1 px-2.5 text-center bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Hủy lịch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên bệnh nhân, SĐT, bác sĩ, mã lịch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>
          {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Tất cả trạng thái' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3.5 px-4">Mã & Bệnh nhân</th>
                <th className="py-3.5 px-4">Dịch vụ</th>
                <th className="py-3.5 px-4">Bác sĩ phụ trách</th>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Trạng thái (4 loại)</th>
                <th className="py-3.5 px-4 text-right">Thao tác điều phối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.map((appt) => {
                const patient = patients.find((p) => p.user_id === appt.patient_id);
                const doctor = doctors.find((d) => d.user_id === appt.doctor_id);
                const service = services.find((s) => s.service_id === appt.service_id);
                const hasDoctor = appt.doctor_id !== null;

                return (
                  <tr key={appt.appointment_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* ID & Patient */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">#{appt.appointment_id}</div>
                      <div className="font-semibold text-slate-700">{patient?.full_name || `Bệnh nhân #${appt.patient_id}`}</div>
                      <div className="text-slate-400 text-[11px]">{patient?.phone}</div>
                    </td>

                    {/* Service (NO prices!) */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{service?.name || `Dịch vụ #${appt.service_id}`}</div>
                      <div className="text-slate-400 text-[11px]">{service?.duration_minutes} phút</div>
                    </td>

                    {/* Doctor */}
                    <td className="py-3.5 px-4">
                      {doctor ? (
                        <div>
                          <div className="font-semibold text-sky-800">{doctor.full_name}</div>
                          <div className="text-slate-400 text-[11px]">{doctor.phone}</div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-slate-400 italic">Chưa gán</span>
                          {/* Quick assign doctor for PENDING */}
                          {appt.status === 'PENDING' && (
                            <select
                              value={doctorAssignId[appt.appointment_id] || ''}
                              onChange={(e) =>
                                setDoctorAssignId({
                                  ...doctorAssignId,
                                  [appt.appointment_id]: Number(e.target.value),
                                })
                              }
                              className="text-[11px] border border-slate-300 rounded px-1.5 py-1 bg-white text-slate-700"
                            >
                              <option value="">Gán bác sĩ...</option>
                              {doctors.map((d) => (
                                <option key={d.user_id} value={d.user_id}>
                                  {d.full_name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {appt.start_at.substring(11, 16)} - {appt.end_at.substring(11, 16)}
                      </div>
                      <div className="text-slate-400 text-[11px]">{appt.start_at.substring(0, 10)}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(appt.status, hasDoctor)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* PENDING -> CONFIRMED */}
                        {appt.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              const docId = appt.doctor_id || doctorAssignId[appt.appointment_id];
                              if (!docId) {
                                alert('Vui lòng chọn bác sĩ để xác nhận lịch!');
                                return;
                              }
                              onConfirmPending(appt.appointment_id, docId);
                            }}
                            className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                            title="Xác nhận lịch và giữ slot"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Xác nhận
                          </button>
                        )}

                        {/* CONFIRMED -> COMPLETED */}
                        {appt.status === 'CONFIRMED' && (
                          <button
                            onClick={() => onCompleteAppointment(appt.appointment_id)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                            title="Hoàn tất khám"
                          >
                            <Check className="w-3.5 h-3.5" /> Hoàn thành
                          </button>
                        )}

                        {/* Reschedule on same appointment ID */}
                        {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                          <button
                            onClick={() => onOpenReschedule(appt)}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                            title="Đổi bác sĩ hoặc giờ khám"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Đổi lịch
                          </button>
                        )}

                        {/* Cancel: Receptionist can cancel PENDING and CONFIRMED */}
                        {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn hủy lịch khám #${appt.appointment_id}?`)) {
                                onCancelAppointment(appt.appointment_id);
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                            title="Hủy lịch hẹn"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Hủy
                          </button>
                        )}

                        {/* COMPLETED and CANCELLED have NO cancel button */}
                        {(appt.status === 'COMPLETED' || appt.status === 'CANCELLED') && (
                          <span className="text-slate-400 text-xs italic">Đã khóa</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Không tìm thấy lịch hẹn nào phù hợp bộ lọc
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
