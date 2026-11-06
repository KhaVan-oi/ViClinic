'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  UserRole, 
  Appointment, 
  DoctorShift, 
  DoctorUnavailability, 
  AffectedAppointment, 
  Notification,
  AccountStatus
} from '@/types/database';
import { mockUsers, mockServices, initialMockAppointments, mockNotifications } from '@/lib/mockData';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { Header } from '@/components/Header';
import { ReceptionistView } from '@/components/views/ReceptionistView';
import { DoctorView } from '@/components/views/DoctorView';
import { ManagerView } from '@/components/views/ManagerView';
import { AdminView } from '@/components/views/AdminView';
import { PatientView } from '@/components/views/PatientView';
import { AppointmentModal } from '@/components/modals/AppointmentModal';
import { RescheduleModal } from '@/components/modals/RescheduleModal';
import { ShiftModal } from '@/components/modals/ShiftModal';
import { UnavailabilityModal } from '@/components/modals/UnavailabilityModal';

export default function HomePage() {
  // Current active role & user
  const [currentRole, setCurrentRole] = useState<UserRole>('RECEPTIONIST');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [services] = useState(mockServices);
  const [appointments, setAppointments] = useState<Appointment[]>(initialMockAppointments);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // Doctor schedule state connected to API
  const [shifts, setShifts] = useState<DoctorShift[]>([]);
  const [unavailabilities, setUnavailabilities] = useState<DoctorUnavailability[]>([]);
  const [affectedAppointments, setAffectedAppointments] = useState<AffectedAppointment[]>([]);

  // Modals state
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [appointmentModalMode, setAppointmentModalMode] = useState<'BOOK_PENDING' | 'CREATE_CONFIRMED'>('BOOK_PENDING');
  
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<DoctorShift | null>(null);

  const [unavailabilityModalOpen, setUnavailabilityModalOpen] = useState(false);

  // Load shifts, unavailability, and affected appointments from APIs
  const fetchDoctorScheduleData = async () => {
    try {
      const [shiftsRes, unavailRes, affectedRes] = await Promise.all([
        fetch('/api/doctor-shifts'),
        fetch('/api/doctor-unavailability'),
        fetch('/api/doctor-schedule/affected-appointments'),
      ]);

      if (shiftsRes.ok) {
        const json = await shiftsRes.json();
        setShifts(json.data || []);
      }
      if (unavailRes.ok) {
        const json = await unavailRes.json();
        setUnavailabilities(json.data || []);
      }
      if (affectedRes.ok) {
        const json = await affectedRes.json();
        setAffectedAppointments(json.data || []);
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu lịch bác sĩ:', err);
    }
  };

  useEffect(() => {
    fetchDoctorScheduleData();
  }, []);

  // Determine current user based on active role
  const currentUser = users.find((u) => u.role === currentRole) || users[2]; // Default to receptionist
  const doctors = users.filter((u) => u.role === 'DOCTOR');
  const patients = users.filter((u) => u.role === 'PATIENT');

  // Handlers for Appointments
  const handleSaveAppointment = (apptData: Partial<Appointment>, newPatient?: Partial<User>) => {
    let patientId = apptData.patient_id;

    if (newPatient) {
      const newUserId = users.length + 10;
      const createdUser: User = {
        user_id: newUserId,
        full_name: newPatient.full_name || 'Bệnh nhân mới',
        phone: newPatient.phone || '',
        birth_date: newPatient.birth_date || '1990-01-01',
        email: newPatient.email || null,
        role: 'PATIENT',
      };
      setUsers([...users, createdUser]);
      patientId = newUserId;
    }

    const newAppt: Appointment = {
      appointment_id: appointments.length + 1001,
      patient_id: patientId || 9,
      service_id: apptData.service_id || 1,
      doctor_id: apptData.doctor_id ?? null,
      start_at: apptData.start_at || new Date().toISOString(),
      end_at: apptData.end_at || new Date().toISOString(),
      status: apptData.status || 'PENDING',
    };

    setAppointments([newAppt, ...appointments]);

    // System Notification (FR-M03-003)
    const newNotif: Notification = {
      notification_id: notifications.length + 1,
      appointment_id: newAppt.appointment_id,
      recipient_user_id: newAppt.patient_id,
      content: `Lịch khám #${newAppt.appointment_id} đã được tạo thành công ở trạng thái ${newAppt.status}.`,
      created_at: new Date().toISOString(),
    };
    setNotifications([newNotif, ...notifications]);
  };

  const handleConfirmPending = (apptId: number, doctorId: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.appointment_id === apptId ? { ...a, doctor_id: doctorId, status: 'CONFIRMED' } : a))
    );

    // Notification (FR-M03-003)
    const notif: Notification = {
      notification_id: notifications.length + 1,
      appointment_id: apptId,
      recipient_user_id: 3,
      content: `Lịch khám #${apptId} đã được Lễ tân xác nhận và chuyển sang trạng thái CONFIRMED.`,
      created_at: new Date().toISOString(),
    };
    setNotifications([notif, ...notifications]);
  };

  const handleCompleteAppointment = (apptId: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.appointment_id === apptId ? { ...a, status: 'COMPLETED' } : a))
    );
  };

  const handleCancelAppointment = (apptId: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.appointment_id === apptId ? { ...a, status: 'CANCELLED' } : a))
    );

    // Remove from affected if it was affected
    setAffectedAppointments((prev) => prev.filter((a) => a.appointment_id !== apptId));

    // Notification (FR-M03-003)
    const notif: Notification = {
      notification_id: notifications.length + 1,
      appointment_id: apptId,
      recipient_user_id: 3,
      content: `Lịch khám #${apptId} đã bị hủy. Hệ thống ghi nhận trạng thái CANCELLED.`,
      created_at: new Date().toISOString(),
    };
    setNotifications([notif, ...notifications]);
  };

  const handleConfirmReschedule = (
    apptId: number,
    newDoctorId: number | null,
    newStartAt: string,
    newEndAt: string
  ) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.appointment_id === apptId
          ? { ...a, doctor_id: newDoctorId, start_at: newStartAt, end_at: newEndAt }
          : a
      )
    );

    // Re-evaluate affected appointments
    fetchDoctorScheduleData();

    // Notification (FR-M03-003)
    const notif: Notification = {
      notification_id: notifications.length + 1,
      appointment_id: apptId,
      recipient_user_id: 3,
      content: `Lịch khám #${apptId} đã được đổi giờ khám/bác sĩ thành công (UF-05). Giữ nguyên mã lịch #${apptId}.`,
      created_at: new Date().toISOString(),
    };
    setNotifications([notif, ...notifications]);
  };

  // Doctor Schedule API calls (UF-14)
  const handleSaveShift = async (data: {
    doctor_id: number;
    start_at: string;
    end_at: string;
    shift_id?: number;
  }) => {
    try {
      const isEdit = !!data.shift_id;
      const url = isEdit ? `/api/doctor-shifts/${data.shift_id}` : '/api/doctor-shifts';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: data.doctor_id,
          start_at: data.start_at,
          end_at: data.end_at,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { success: false, message: json.error || 'Lỗi khi lưu ca' };
      }

      await fetchDoctorScheduleData();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    try {
      const res = await fetch(`/api/doctor-shifts/${shiftId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchDoctorScheduleData();
      } else {
        const json = await res.json();
        alert(json.error || 'Lỗi khi xóa ca làm việc');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Doctor Unavailability API calls (UF-15)
  const handleSaveUnavailability = async (data: {
    doctor_id: number;
    start_at: string;
    end_at: string;
  }) => {
    try {
      const res = await fetch('/api/doctor-unavailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        return { success: false, message: json.error || 'Lỗi khi lưu' };
      }

      await fetchDoctorScheduleData();
      return {
        success: true,
        affected: json.affected_appointments || [],
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const handleDeleteUnavailability = async (unavailId: number) => {
    try {
      const res = await fetch(`/api/doctor-unavailability/${unavailId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchDoctorScheduleData();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Admin user operations
  const handleAddStaffUser = (user: Partial<User>, initialStatus: AccountStatus) => {
    const newId = users.length + 1;
    const staff: User = {
      user_id: newId,
      full_name: user.full_name || '',
      phone: user.phone || '',
      birth_date: null,
      email: user.email || null,
      role: user.role || 'RECEPTIONIST',
    };
    setUsers([...users, staff]);
  };

  const handleChangeUserRole = (userId: number, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
    );
  };

  const handleToggleUserStatus = (userId: number, currentStatus: AccountStatus) => {
    // Handled in AdminView
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Persistent Role Switcher Bar */}
      <RoleSwitcher currentRole={currentRole} onRoleChange={(role) => setCurrentRole(role)} />

      {/* 2. Brand & Session Header */}
      <Header currentUser={currentUser} notifications={notifications} />

      {/* 3. Main Dynamic Role Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentRole === 'RECEPTIONIST' && (
          <ReceptionistView
            appointments={appointments}
            doctors={doctors}
            services={services}
            patients={patients}
            affectedAppointments={affectedAppointments}
            onOpenBooking={() => {
              setAppointmentModalMode('BOOK_PENDING');
              setAppointmentModalOpen(true);
            }}
            onOpenCreateConfirmed={() => {
              setAppointmentModalMode('CREATE_CONFIRMED');
              setAppointmentModalOpen(true);
            }}
            onOpenReschedule={(appt) => {
              setRescheduleTarget(appt);
              setRescheduleModalOpen(true);
            }}
            onConfirmPending={handleConfirmPending}
            onCompleteAppointment={handleCompleteAppointment}
            onCancelAppointment={handleCancelAppointment}
          />
        )}

        {currentRole === 'DOCTOR' && (
          <DoctorView
            currentDoctor={currentUser}
            shifts={shifts}
            unavailabilities={unavailabilities}
            appointments={appointments}
            patients={patients}
            services={services}
            onOpenUnavailabilityModal={() => setUnavailabilityModalOpen(true)}
            onDeleteUnavailability={handleDeleteUnavailability}
            onCompleteAppointment={handleCompleteAppointment}
          />
        )}

        {currentRole === 'CLINIC_MANAGER' && (
          <ManagerView
            shifts={shifts}
            doctors={doctors}
            services={services}
            appointments={appointments}
            onOpenCreateShift={() => {
              setShiftToEdit(null);
              setShiftModalOpen(true);
            }}
            onOpenEditShift={(shift) => {
              setShiftToEdit(shift);
              setShiftModalOpen(true);
            }}
            onDeleteShift={handleDeleteShift}
          />
        )}

        {currentRole === 'ADMIN' && (
          <AdminView
            users={users}
            onAddStaffUser={handleAddStaffUser}
            onChangeUserRole={handleChangeUserRole}
            onToggleUserStatus={handleToggleUserStatus}
          />
        )}

        {currentRole === 'PATIENT' && (
          <PatientView
            currentPatient={currentUser}
            appointments={appointments}
            doctors={doctors}
            services={services}
            onOpenBooking={() => {
              setAppointmentModalMode('BOOK_PENDING');
              setAppointmentModalOpen(true);
            }}
            onCancelAppointment={handleCancelAppointment}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">ViClinic Healthcare Management System • Chuẩn hóa FR & ERD</p>
          <p>© 2026 ViClinic. Tech Stack: Next.js (React), TypeScript, Tailwind CSS, Supabase / PostgreSQL, Zod.</p>
        </div>
      </footer>

      {/* Global Modals */}
      <AppointmentModal
        isOpen={appointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
        mode={appointmentModalMode}
        doctors={doctors}
        services={services}
        patients={patients}
        onSaveAppointment={handleSaveAppointment}
      />

      <RescheduleModal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        appointment={rescheduleTarget}
        doctors={doctors}
        services={services}
        patients={patients}
        onConfirmReschedule={handleConfirmReschedule}
      />

      <ShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        shiftToEdit={shiftToEdit}
        doctors={doctors}
        onSaveShift={handleSaveShift}
      />

      <UnavailabilityModal
        isOpen={unavailabilityModalOpen}
        onClose={() => setUnavailabilityModalOpen(false)}
        doctor={currentUser}
        onSaveUnavailability={handleSaveUnavailability}
      />
    </div>
  );
}
