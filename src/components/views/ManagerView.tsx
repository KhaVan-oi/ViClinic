'use client';

import React, { useState } from 'react';
import { User, DoctorShift, Service, Appointment } from '@/types/database';
import { 
  Calendar, 
  Clock, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  BarChart3, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Filter,
  Layers
} from 'lucide-react';

interface ManagerViewProps {
  shifts: DoctorShift[];
  doctors: User[];
  services: Service[];
  appointments: Appointment[];
  onOpenCreateShift: () => void;
  onOpenEditShift: (shift: DoctorShift) => void;
  onDeleteShift: (shiftId: number) => void;
}

export const ManagerView: React.FC<ManagerViewProps> = ({
  shifts,
  doctors,
  services,
  appointments,
  onOpenCreateShift,
  onOpenEditShift,
  onDeleteShift,
}) => {
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'SERVICES' | 'REPORTS'>('SHIFTS');

  // Filter for shifts
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | 'ALL'>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filter for reports (FR-M04-001)
  const [reportDoctorId, setReportDoctorId] = useState<number | 'ALL'>('ALL');

  const filteredShifts = shifts.filter((s) => {
    if (selectedDoctorId !== 'ALL' && s.doctor_id !== selectedDoctorId) return false;
    if (selectedDate && s.start_at.substring(0, 10) !== selectedDate) return false;
    return true;
  });

  // Calculate standard reports strictly as FR-M04-001 requires
  const reportAppointments = appointments.filter((a) => {
    if (reportDoctorId !== 'ALL' && a.doctor_id !== reportDoctorId) return false;
    return true;
  });

  const totalAppts = reportAppointments.length;
  const completedCount = reportAppointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelledCount = reportAppointments.filter((a) => a.status === 'CANCELLED').length;
  const confirmedCount = reportAppointments.filter((a) => a.status === 'CONFIRMED').length;
  const pendingCount = reportAppointments.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Tab Navigation for Manager */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('SHIFTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SHIFTS'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Quản Lý Ca Làm Việc Bác Sĩ (UF-14)
        </button>
        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SERVICES'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Danh Mục Dịch Vụ Khám (UF-02)
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'REPORTS'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Báo Cáo Thống Kê Cơ Bản (FR-M04-001)
        </button>
      </div>

      {/* TAB 1: Doctor Shifts Management (UF-14) */}
      {activeTab === 'SHIFTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Phân Ca Làm Việc Bác Sĩ (FR-M03-001)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý phòng khám tạo và sửa ca theo ngày. Ca cùng một bác sĩ không được chồng lấn. Không áp dụng ca lặp tự động.
              </p>
            </div>
            <button
              onClick={onOpenCreateShift}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-200 transition-all self-start md:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Thêm ca làm việc mới
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Ngày phân ca:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Lọc theo bác sĩ:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">Tất cả bác sĩ ({doctors.length})</option>
                {doctors.map((d) => (
                  <option key={d.user_id} value={d.user_id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shifts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Mã ca</th>
                  <th className="py-3 px-4">Bác sĩ phụ trách</th>
                  <th className="py-3 px-4">Ngày trực</th>
                  <th className="py-3 px-4">Khoảng thời gian</th>
                  <th className="py-3 px-4">Quy tắc nghiệp vụ</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShifts.map((shift) => {
                  const doctor = doctors.find((d) => d.user_id === shift.doctor_id);

                  return (
                    <tr key={shift.shift_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-800">#{shift.shift_id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-indigo-900">{doctor?.full_name}</div>
                        <div className="text-slate-400 text-[11px]">{doctor?.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {shift.start_at.substring(0, 10)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                          {shift.start_at.substring(11, 16)} - {shift.end_at.substring(11, 16)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                          Không chồng lấn
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenEditShift(shift)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Sửa ca làm việc"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa ca #${shift.shift_id} của ${doctor?.full_name}?`)) {
                                onDeleteShift(shift.shift_id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa ca làm việc"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredShifts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Không có ca làm việc nào trong ngày này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Service Catalog (NO PRICES as requested) */}
      {activeTab === 'SERVICES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">Danh Mục Dịch Vụ Khám Y Khoa</h2>
            <p className="text-xs text-slate-500 mt-1">
              Phòng khám không lưu giá tiền hay thu thanh toán trên hệ thống. Dịch vụ gồm Tên, Thời lượng khám và Trạng thái áp dụng (UF-02).
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Mã DV</th>
                  <th className="py-3 px-4">Tên dịch vụ</th>
                  <th className="py-3 px-4">Thời lượng chuẩn</th>
                  <th className="py-3 px-4">Trạng thái áp dụng</th>
                  <th className="py-3 px-4">Quyền hạn quản lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((srv) => (
                  <tr key={srv.service_id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-800">#{srv.service_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{srv.name}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">{srv.duration_minutes} phút</td>
                    <td className="py-3 px-4">
                      {srv.is_active ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200 text-[11px]">
                          Đang áp dụng
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold border border-slate-200 text-[11px]">
                          Ngừng áp dụng
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      Quản lý phòng khám điều chỉnh (FR-M02-001)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Basic Reporting (FR-M04-001 strictly: Total, Completed, Cancelled) */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Báo Cáo Thống Kê Cơ Bản (FR-M04-001)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Chỉ dành riêng cho Quản lý phòng khám. Báo cáo thống kê: Tổng số lịch, số COMPLETED, số CANCELLED.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Lọc theo bác sĩ:</span>
              <select
                value={reportDoctorId}
                onChange={(e) => setReportDoctorId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">Tất cả bác sĩ</option>
                {doctors.map((d) => (
                  <option key={d.user_id} value={d.user_id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exact KPI Metric Cards strictly per FR-M04-001 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* 1. Tổng số lịch */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Tổng số lịch hẹn</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-extrabold text-slate-800">{totalAppts}</div>
              <div className="text-[11px] text-slate-400">
                Toàn bộ lịch trong hệ thống ({confirmedCount} CONFIRMED, {pendingCount} PENDING)
              </div>
            </div>

            {/* 2. Số lịch COMPLETED */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm space-y-2 bg-gradient-to-br from-white to-emerald-50/30">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <span>Số lịch COMPLETED</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-700">{completedCount}</div>
              <div className="text-[11px] text-emerald-600">Đã được bác sĩ/lễ tân hoàn thành khám</div>
            </div>

            {/* 3. Số lịch CANCELLED */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-sm space-y-2 bg-gradient-to-br from-white to-rose-50/30">
              <div className="flex items-center justify-between text-rose-700 text-xs font-semibold uppercase tracking-wider">
                <span>Số lịch CANCELLED</span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl font-extrabold text-rose-700">{cancelledCount}</div>
              <div className="text-[11px] text-rose-600">Lịch bị hủy bởi bệnh nhân hoặc lễ tân</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
