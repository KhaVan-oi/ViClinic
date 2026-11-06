import { 
  DoctorShift, 
  DoctorUnavailability, 
  AffectedAppointment, 
  Appointment, 
  User, 
  Service 
} from '@/types/database';

// Initial Seed Data aligned with database/seed_data.sql
export const initialDoctors: User[] = [
  { user_id: 4, full_name: 'BS. CK1 Trần Văn Tuấn', birth_date: '1980-06-12', phone: '0911000001', email: 'tuan.tran@viclinic.vn', role: 'DOCTOR' },
  { user_id: 5, full_name: 'ThS. BS Nguyễn Thị Lan', birth_date: '1985-09-24', phone: '0911000002', email: 'lan.nguyen@viclinic.vn', role: 'DOCTOR' },
  { user_id: 6, full_name: 'BS. CK2 Lê Hoàng Nam', birth_date: '1978-03-18', phone: '0911000003', email: 'nam.le@viclinic.vn', role: 'DOCTOR' },
  { user_id: 7, full_name: 'BS. Phạm Quỳnh Hoa', birth_date: '1990-11-05', phone: '0911000004', email: 'hoa.pham@viclinic.vn', role: 'DOCTOR' },
  { user_id: 8, full_name: 'BS. Đặng Minh Khang', birth_date: '1988-08-30', phone: '0911000005', email: 'khang.dang@viclinic.vn', role: 'DOCTOR' },
];

export const initialServices: Service[] = [
  { service_id: 1, name: 'Khám Tổng Quát Nội Khoa', duration_minutes: 30, is_active: true },
  { service_id: 2, name: 'Khám Chuyên Khoa Tim Mạch', duration_minutes: 45, is_active: true },
  { service_id: 3, name: 'Khám Chuyên Khoa Nhi', duration_minutes: 30, is_active: true },
  { service_id: 4, name: 'Siêu Âm Màu 4D & Doppler', duration_minutes: 30, is_active: true },
  { service_id: 5, name: 'Dịch vụ ngừng áp dụng (Lưu kho)', duration_minutes: 60, is_active: false },
];

// Helper to construct ISO strings relative to current date
const todayStr = new Date().toISOString().split('T')[0];

let shiftsData: DoctorShift[] = [
  { shift_id: 1, doctor_id: 4, start_at: `${todayStr}T08:00:00+07:00`, end_at: `${todayStr}T12:00:00+07:00` },
  { shift_id: 2, doctor_id: 4, start_at: `${todayStr}T13:30:00+07:00`, end_at: `${todayStr}T17:30:00+07:00` },
  { shift_id: 3, doctor_id: 5, start_at: `${todayStr}T08:00:00+07:00`, end_at: `${todayStr}T12:00:00+07:00` },
  { shift_id: 4, doctor_id: 6, start_at: `${todayStr}T08:00:00+07:00`, end_at: `${todayStr}T12:00:00+07:00` },
  { shift_id: 5, doctor_id: 6, start_at: `${todayStr}T13:30:00+07:00`, end_at: `${todayStr}T17:30:00+07:00` },
  { shift_id: 6, doctor_id: 7, start_at: `${todayStr}T08:00:00+07:00`, end_at: `${todayStr}T16:00:00+07:00` },
  { shift_id: 7, doctor_id: 8, start_at: `${todayStr}T08:00:00+07:00`, end_at: `${todayStr}T12:00:00+07:00` },
];

let unavailabilityData: DoctorUnavailability[] = [
  { unavailability_id: 1, doctor_id: 4, start_at: `${todayStr}T15:00:00+07:00`, end_at: `${todayStr}T16:00:00+07:00` }
];

let appointmentsData: Appointment[] = [
  { appointment_id: 101, patient_id: 9, service_id: 2, doctor_id: 4, start_at: `${todayStr}T08:30:00+07:00`, end_at: `${todayStr}T09:15:00+07:00`, status: 'CONFIRMED' },
  { appointment_id: 102, patient_id: 10, service_id: 2, doctor_id: 4, start_at: `${todayStr}T15:00:00+07:00`, end_at: `${todayStr}T15:45:00+07:00`, status: 'CONFIRMED' }, // In conflict with unavailability
  { appointment_id: 103, patient_id: 11, service_id: 3, doctor_id: 5, start_at: `${todayStr}T09:00:00+07:00`, end_at: `${todayStr}T09:30:00+07:00`, status: 'CONFIRMED' },
  { appointment_id: 104, patient_id: 9, service_id: 1, doctor_id: 6, start_at: `${todayStr}T10:00:00+07:00`, end_at: `${todayStr}T10:30:00+07:00`, status: 'PENDING' },
  { appointment_id: 105, patient_id: 10, service_id: 1, doctor_id: null, start_at: `${todayStr}T14:00:00+07:00`, end_at: `${todayStr}T14:30:00+07:00`, status: 'PENDING' }, // No doctor, not holding slot
];

let nextShiftId = 100;
let nextUnavailabilityId = 100;

export class DoctorScheduleService {
  /**
   * Check if a proposed shift overlaps with any existing shifts for the same doctor.
   * Ràng buộc: "Các ca của cùng một bác sĩ không được chồng lấn (overlapping)" (FR-M03-001)
   */
  static checkShiftOverlap(
    doctorId: number, 
    startAt: string, 
    endAt: string, 
    excludeShiftId?: number
  ): DoctorShift | null {
    const newStart = new Date(startAt).getTime();
    const newEnd = new Date(endAt).getTime();

    const conflictingShift = shiftsData.find(shift => {
      if (shift.doctor_id !== doctorId) return false;
      if (excludeShiftId && shift.shift_id === excludeShiftId) return false;

      const existingStart = new Date(shift.start_at).getTime();
      const existingEnd = new Date(shift.end_at).getTime();

      // Overlap condition: start_at < existing_end_at AND end_at > existing_start_at
      return newStart < existingEnd && newEnd > existingStart;
    });

    return conflictingShift || null;
  }

  /**
   * Determine affected appointments when shifts change or doctor declares unavailability (FR-M03-004)
   * Only checks appointments with status PENDING (assigned to doctor) or CONFIRMED.
   */
  static findAffectedAppointments(doctorId?: number): AffectedAppointment[] {
    const affected: AffectedAppointment[] = [];

    const activeAppointments = appointmentsData.filter(appt => 
      (appt.status === 'PENDING' && appt.doctor_id !== null) || appt.status === 'CONFIRMED'
    );

    for (const appt of activeAppointments) {
      if (!appt.doctor_id) continue;
      if (doctorId && appt.doctor_id !== doctorId) continue;

      const apptStart = new Date(appt.start_at).getTime();
      const apptEnd = new Date(appt.end_at).getTime();

      // Check 1: Does this appointment overlap with any unavailability period of the doctor?
      const unavailConflict = unavailabilityData.find(u => {
        if (u.doctor_id !== appt.doctor_id) return false;
        const uStart = new Date(u.start_at).getTime();
        const uEnd = new Date(u.end_at).getTime();
        return apptStart < uEnd && apptEnd > uStart;
      });

      if (unavailConflict) {
        const doctor = initialDoctors.find(d => d.user_id === appt.doctor_id);
        const service = initialServices.find(s => s.service_id === appt.service_id);
        affected.push({
          ...appt,
          doctor_name: doctor?.full_name || `Bác sĩ #${appt.doctor_id}`,
          service_name: service?.name || `Dịch vụ #${appt.service_id}`,
          conflict_reason: 'UNAVAILABILITY_OVERLAP'
        });
        continue;
      }

      // Check 2: Does this appointment fall completely within one of the doctor's shifts?
      const insideValidShift = shiftsData.some(shift => {
        if (shift.doctor_id !== appt.doctor_id) return false;
        const shiftStart = new Date(shift.start_at).getTime();
        const shiftEnd = new Date(shift.end_at).getTime();
        return shiftStart <= apptStart && shiftEnd >= apptEnd;
      });

      if (!insideValidShift) {
        const doctor = initialDoctors.find(d => d.user_id === appt.doctor_id);
        const service = initialServices.find(s => s.service_id === appt.service_id);
        affected.push({
          ...appt,
          doctor_name: doctor?.full_name || `Bác sĩ #${appt.doctor_id}`,
          service_name: service?.name || `Dịch vụ #${appt.service_id}`,
          conflict_reason: 'OUTSIDE_SHIFT'
        });
      }
    }

    return affected;
  }

  // --- Doctor Shifts Methods (UF-14 / FR-M03-001) ---

  static getShifts(filters?: { doctor_id?: number; date?: string; from_date?: string; to_date?: string }): DoctorShift[] {
    return shiftsData.filter(shift => {
      if (filters?.doctor_id && shift.doctor_id !== filters.doctor_id) {
        return false;
      }
      if (filters?.date) {
        const shiftDate = shift.start_at.substring(0, 10);
        if (shiftDate !== filters.date) return false;
      }
      return true;
    }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }

  static createShift(data: { doctor_id: number; start_at: string; end_at: string }) {
    // 1. Verify doctor exists and has DOCTOR role
    const doctor = initialDoctors.find(d => d.user_id === data.doctor_id && d.role === 'DOCTOR');
    if (!doctor) {
      throw new Error(`Bác sĩ với ID ${data.doctor_id} không tồn tại hoặc không có vai trò DOCTOR.`);
    }

    // 2. Overlap check (FR-M03-001)
    const conflict = this.checkShiftOverlap(data.doctor_id, data.start_at, data.end_at);
    if (conflict) {
      throw new Error(`Ca làm việc bị trùng lặp với ca đã có (Mã ca: #${conflict.shift_id}, từ ${conflict.start_at} đến ${conflict.end_at}).`);
    }

    const newShift: DoctorShift = {
      shift_id: ++nextShiftId,
      doctor_id: data.doctor_id,
      start_at: data.start_at,
      end_at: data.end_at,
    };

    shiftsData.push(newShift);

    // Identify affected appointments
    const affectedAppointments = this.findAffectedAppointments(data.doctor_id);

    return {
      shift: newShift,
      affected_appointments: affectedAppointments,
    };
  }

  static updateShift(shiftId: number, data: { doctor_id?: number; start_at?: string; end_at?: string }) {
    const index = shiftsData.findIndex(s => s.shift_id === shiftId);
    if (index === -1) {
      throw new Error(`Không tìm thấy ca làm việc với ID ${shiftId}`);
    }

    const currentShift = shiftsData[index];
    const doctorId = data.doctor_id || currentShift.doctor_id;
    const startAt = data.start_at || currentShift.start_at;
    const endAt = data.end_at || currentShift.end_at;

    // Check overlap
    const conflict = this.checkShiftOverlap(doctorId, startAt, endAt, shiftId);
    if (conflict) {
      throw new Error(`Thời gian cập nhật bị trùng lặp với ca làm việc khác (Mã ca: #${conflict.shift_id}).`);
    }

    const updatedShift: DoctorShift = {
      ...currentShift,
      doctor_id: doctorId,
      start_at: startAt,
      end_at: endAt,
    };

    shiftsData[index] = updatedShift;

    // Identify affected appointments
    const affectedAppointments = this.findAffectedAppointments(doctorId);

    return {
      shift: updatedShift,
      affected_appointments: affectedAppointments,
    };
  }

  static deleteShift(shiftId: number) {
    const index = shiftsData.findIndex(s => s.shift_id === shiftId);
    if (index === -1) {
      throw new Error(`Không tìm thấy ca làm việc với ID ${shiftId}`);
    }

    const deleted = shiftsData[index];
    shiftsData.splice(index, 1);

    // Determine affected appointments for this doctor after shift deletion (FR-M03-004)
    const affectedAppointments = this.findAffectedAppointments(deleted.doctor_id);

    return {
      deleted_shift: deleted,
      affected_appointments: affectedAppointments,
    };
  }

  // --- Doctor Unavailability Methods (UF-15 / FR-M03-002) ---

  static getUnavailability(filters?: { doctor_id?: number }): DoctorUnavailability[] {
    return unavailabilityData.filter(u => {
      if (filters?.doctor_id && u.doctor_id !== filters.doctor_id) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }

  static createUnavailability(data: { doctor_id: number; start_at: string; end_at: string }) {
    const doctor = initialDoctors.find(d => d.user_id === data.doctor_id);
    if (!doctor) {
      throw new Error(`Bác sĩ với ID ${data.doctor_id} không tồn tại.`);
    }

    const newUnavail: DoctorUnavailability = {
      unavailability_id: ++nextUnavailabilityId,
      doctor_id: data.doctor_id,
      start_at: data.start_at,
      end_at: data.end_at,
    };

    unavailabilityData.push(newUnavail);

    // Identify affected appointments
    const affectedAppointments = this.findAffectedAppointments(data.doctor_id);

    return {
      unavailability: newUnavail,
      affected_appointments: affectedAppointments,
    };
  }

  static deleteUnavailability(unavailabilityId: number) {
    const index = unavailabilityData.findIndex(u => u.unavailability_id === unavailabilityId);
    if (index === -1) {
      throw new Error(`Không tìm thấy khoảng bận với ID ${unavailabilityId}`);
    }

    const deleted = unavailabilityData[index];
    unavailabilityData.splice(index, 1);

    const affectedAppointments = this.findAffectedAppointments(deleted.doctor_id);

    return {
      deleted_unavailability: deleted,
      affected_appointments: affectedAppointments,
    };
  }
}
