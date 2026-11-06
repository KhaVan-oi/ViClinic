'use client';

import React, { useState } from 'react';
import { User, Notification } from '@/types/database';
import { Bell, User as UserIcon, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  notifications: Notification[];
}

export const Header: React.FC<HeaderProps> = ({ currentUser, notifications }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">Quản trị viên</span>;
      case 'CLINIC_MANAGER':
        return <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">Quản lý phòng khám</span>;
      case 'DOCTOR':
        return <span className="bg-sky-100 text-sky-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-sky-200">Bác sĩ chuyên khoa</span>;
      case 'RECEPTIONIST':
        return <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">Lễ tân tiếp đón</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">Bệnh nhân</span>;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-[41px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">ViClinic</span>
              <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-sky-200">Y tế số</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Hệ thống điều phối lịch khám & ca trực bác sĩ</p>
          </div>
        </div>

        {/* Right tools: Notifications & User profile */}
        <div className="flex items-center gap-4">
          {/* Notifications bell (FR-M03-003) */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors"
              title="Thông báo hệ thống"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* Notification popup */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-semibold text-slate-800 text-sm">Thông báo hệ thống (FR-M03-003)</h4>
                  <span className="text-xs bg-sky-100 text-sky-800 font-medium px-2 py-0.5 rounded-full">{notifications.length} mới</span>
                </div>
                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.notification_id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        {n.content.includes('CẢNH BÁO') ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span>Lịch #{n.appointment_id}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{n.created_at.split('T')[1].substring(0, 5)}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{n.content}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Không có thông báo mới</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User badge */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{currentUser.full_name}</span>
                {getRoleBadge(currentUser.role)}
              </div>
              <span className="text-xs text-slate-500">{currentUser.phone}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
