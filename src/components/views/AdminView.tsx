'use client';

import React, { useState } from 'react';
import { User, UserRole, AccountStatus } from '@/types/database';
import { 
  Shield, 
  UserCheck, 
  UserPlus, 
  KeyRound, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle,
  Key
} from 'lucide-react';

interface AdminViewProps {
  users: User[];
  onAddStaffUser: (user: Partial<User>, initialStatus: AccountStatus) => void;
  onChangeUserRole: (userId: number, newRole: UserRole) => void;
  onToggleUserStatus: (userId: number, currentStatus: AccountStatus) => void;
}

interface AccountStateMap {
  [userId: number]: {
    status: AccountStatus;
    passwordSet: boolean;
  };
}

export const AdminView: React.FC<AdminViewProps> = ({
  users,
  onAddStaffUser,
  onChangeUserRole,
  onToggleUserStatus,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('RECEPTIONIST');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Initial account states matching seed data
  const [accountStates, setAccountStates] = useState<AccountStateMap>({
    1: { status: 'ACTIVE', passwordSet: true },
    2: { status: 'ACTIVE', passwordSet: true },
    3: { status: 'ACTIVE', passwordSet: true },
    4: { status: 'ACTIVE', passwordSet: true },
    5: { status: 'ACTIVE', passwordSet: true },
    6: { status: 'ACTIVE', passwordSet: true },
    7: { status: 'ACTIVE', passwordSet: true },
    8: { status: 'ACTIVE', passwordSet: true },
    9: { status: 'ACTIVE', passwordSet: true },
    10: { status: 'ACTIVE', passwordSet: true },
    11: { status: 'ACTIVE', passwordSet: true },
  });

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newPhone) return;

    onAddStaffUser(
      {
        full_name: newFullName,
        phone: newPhone,
        email: newEmail || null,
        role: newRole,
      },
      'PENDING_ACTIVATION'
    );

    setOtpNotice(`Đã tạo tài khoản nhân viên ${newFullName} (${newRole}). Trạng thái PENDING_ACTIVATION: Đã gửi mã OTP đến số ${newPhone} để nhân viên xác thực và đặt mật khẩu (UF-11).`);
    setShowAddModal(false);
    setNewFullName('');
    setNewPhone('');
    setNewEmail('');
  };

  const handleSimulateOTPActivate = (userId: number, name: string) => {
    setAccountStates((prev) => ({
      ...prev,
      [userId]: { status: 'ACTIVE', passwordSet: true },
    }));
    setOtpNotice(`Nhân viên ${name} đã xác minh OTP thành công và thiết lập mật khẩu an toàn. Tài khoản đã chuyển sang ACTIVE (UF-11).`);
  };

  const handleToggleStatus = (userId: number) => {
    const current = accountStates[userId]?.status || 'ACTIVE';
    const nextStatus: AccountStatus = current === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    setAccountStates((prev) => ({
      ...prev,
      [userId]: {
        status: nextStatus,
        passwordSet: prev[userId]?.passwordSet ?? true,
      },
    }));

    onToggleUserStatus(userId, current);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Quản Trị Người Dùng & Phân Quyền (RBAC)</h2>
            <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded border border-purple-200">
              Quản trị viên
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị viên tạo tài khoản nhân viên (Lễ tân, Bác sĩ, Quản lý). Nhân viên OTP rồi mới đặt mật khẩu (UF-11). Quản trị viên đổi vai trò và vô hiệu hóa tài khoản (DISABLED / ACTIVE).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-purple-200 self-start md:self-auto transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Tạo tài khoản nhân viên mới (UF-11)
        </button>
      </div>

      {/* OTP Notification Toast */}
      {otpNotice && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <span>{otpNotice}</span>
          </div>
          <button onClick={() => setOtpNotice(null)} className="text-purple-600 font-bold hover:underline">
            Đóng
          </button>
        </div>
      )}

      {/* Users & Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <th className="py-3 px-4">Mã</th>
              <th className="py-3 px-4">Họ và tên</th>
              <th className="py-3 px-4">Số điện thoại</th>
              <th className="py-3 px-4">Vai trò (RBAC)</th>
              <th className="py-3 px-4">Trạng thái tài khoản</th>
              <th className="py-3 px-4 text-right">Thao tác quản trị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const acc = accountStates[u.user_id] || { status: 'ACTIVE', passwordSet: true };
              const isStaff = u.role !== 'PATIENT';

              return (
                <tr key={u.user_id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4 font-bold text-slate-800">#{u.user_id}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{u.full_name}</div>
                    <div className="text-slate-400 text-[11px]">{u.email || 'Không có email'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{u.phone}</td>
                  <td className="py-3.5 px-4">
                    {/* RBAC Role Selector */}
                    {isStaff ? (
                      <select
                        value={u.role}
                        onChange={(e) => onChangeUserRole(u.user_id, e.target.value as UserRole)}
                        className="text-xs border border-purple-200 bg-purple-50/50 rounded-lg px-2 py-1 font-semibold text-purple-900"
                      >
                        <option value="RECEPTIONIST">RECEPTIONIST (Lễ tân)</option>
                        <option value="DOCTOR">DOCTOR (Bác sĩ)</option>
                        <option value="CLINIC_MANAGER">CLINIC_MANAGER (Quản lý)</option>
                        <option value="ADMIN">ADMIN (Quản trị viên)</option>
                      </select>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-full text-[11px]">
                        PATIENT (Bệnh nhân)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {acc.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE (Đang hoạt động)
                      </span>
                    )}
                    {acc.status === 'DISABLED' && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-semibold px-2.5 py-1 rounded-full border border-rose-200 text-[11px]">
                        <Lock className="w-3.5 h-3.5" /> DISABLED (Đã vô hiệu hóa)
                      </span>
                    )}
                    {acc.status === 'PENDING_ACTIVATION' && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-full border border-amber-200 text-[11px]">
                        <Key className="w-3.5 h-3.5" /> PENDING_ACTIVATION
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {acc.status === 'PENDING_ACTIVATION' && (
                        <button
                          onClick={() => handleSimulateOTPActivate(u.user_id, u.full_name)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                          title="Xác thực OTP và đặt mật khẩu"
                        >
                          <KeyRound className="w-3 h-3" /> OTP kích hoạt (UF-11)
                        </button>
                      )}

                      {acc.status !== 'PENDING_ACTIVATION' && (
                        <button
                          onClick={() => handleToggleStatus(u.user_id)}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 ${
                            acc.status === 'ACTIVE'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {acc.status === 'ACTIVE' ? (
                            <>
                              <Lock className="w-3 h-3" /> Vô hiệu hóa
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" /> Kích hoạt lại (UF-13)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Staff Modal (UF-11) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-800">
              Tạo Tài Khoản Nhân Viên Phòng Khám (UF-11)
            </h3>
            <p className="text-xs text-slate-500">
              Tài khoản sẽ được tạo ở trạng thái PENDING_ACTIVATION. Nhân viên nhận OTP qua số điện thoại để đặt mật khẩu đăng nhập.
            </p>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lê Văn Khoa"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                <input
                  type="text"
                  placeholder="0911223344"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email (Tùy chọn)</label>
                <input
                  type="email"
                  placeholder="khoa.le@viclinic.vn"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai trò nhân viên (RBAC) *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="RECEPTIONIST">RECEPTIONIST (Lễ tân)</option>
                  <option value="DOCTOR">DOCTOR (Bác sĩ)</option>
                  <option value="CLINIC_MANAGER">CLINIC_MANAGER (Quản lý phòng khám)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                >
                  Tạo tài khoản PENDING_ACTIVATION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
