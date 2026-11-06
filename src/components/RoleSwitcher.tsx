'use client';

import React from 'react';
import { UserRole } from '@/types/database';
import { UserCheck, Shield, Stethoscope, Briefcase, HeartHandshake } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onRoleChange }) => {
  const roles: { role: UserRole; label: string; icon: any; desc: string }[] = [
    { role: 'RECEPTIONIST', label: 'Lễ Tân', icon: UserCheck, desc: 'Điều phối & Lịch khám' },
    { role: 'DOCTOR', label: 'Bác Sĩ', icon: Stethoscope, desc: 'Lịch làm việc & Khám' },
    { role: 'CLINIC_MANAGER', label: 'Quản Lý', icon: Briefcase, desc: 'Phân ca & Báo cáo' },
    { role: 'ADMIN', label: 'Quản Trị Viên', icon: Shield, desc: 'Tài khoản & Phân quyền' },
    { role: 'PATIENT', label: 'Bệnh Nhân', icon: HeartHandshake, desc: 'Đặt lịch trực tuyến' },
  ];

  return (
    <aside aria-label="Role Switcher" className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-slate-200">CHẾ ĐỘ PROTOTYPE THEO VAI TRÒ:</span>
          <span className="text-xs text-slate-400 hidden md:inline">(Chuyển đổi góc nhìn phân quyền RBAC y tế)</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = currentRole === r.role;
            return (
              <button
                key={r.role}
                onClick={() => onRoleChange(r.role)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={r.desc}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
