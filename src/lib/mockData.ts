import { User, Service, Appointment, Notification } from '@/types/database';

export const mockUsers: User[] = [
  { user_id: 1, full_name: 'Nguyễn Quản Trị', birth_date: '1985-01-10', phone: '0900000001', email: 'admin@viclinic.vn', role: 'ADMIN' },
  { user_id: 2, full_name: 'Trần Quản Lý', birth_date: '1987-05-15', phone: '0900000002', email: 'manager@viclinic.vn', role: 'CLINIC_MANAGER' },
  { user_id: 3, full_name: 'Lê Phước Thịnh', birth_date: '1996-03-20', phone: '0900000003', email: 'lephuocthinh@viclinic.vn', role: 'RECEPTIONIST' },
  { user_id: 4, full_name: 'BS. CK1 Trần Văn Tuấn', birth_date: '1980-06-12', phone: '0911000001', email: 'tuan.tran@viclinic.vn', role: 'DOCTOR' },
  { user_id: 5, full_name: 'ThS. BS Nguyễn Thị Lan', birth_date: '1985-09-24', phone: '0911000002', email: 'lan.nguyen@viclinic.vn', role: 'DOCTOR' },
  { user_id: 6, full_name: 'BS. CK2 Lê Hoàng Nam', birth_date: '1978-03-18', phone: '0911000003', email: 'nam.le@viclinic.vn', role: 'DOCTOR' },
  { user_id: 7, full_name: 'BS. Phạm Quỳnh Hoa', birth_date: '1990-11-05', phone: '0911000004', email: 'hoa.pham@viclinic.vn', role: 'DOCTOR' },
  { user_id: 8, full_name: 'BS. Đặng Minh Khang', birth_date: '1988-08-30', phone: '0911000005', email: 'khang.dang@viclinic.vn', role: 'DOCTOR' },
  { user_id: 9, full_name: 'Nguyễn Văn An', birth_date: '1992-04-10', phone: '0988111222', email: 'an.nguyen@gmail.com', role: 'PATIENT' },
  { user_id: 10, full_name: 'Hoàng Thị Mai', birth_date: '1995-08-22', phone: '0977333444', email: 'mai.hoang@gmail.com', role: 'PATIENT' },
  { user_id: 11, full_name: 'Lê Quang Huy', birth_date: '2001-12-05', phone: '0966555666', email: 'huy.le@gmail.com', role: 'PATIENT' },
];

export const mockServices: Service[] = [
  { service_id: 1, name: 'Khám Tổng Quát Nội Khoa', duration_minutes: 30, is_active: true },
  { service_id: 2, name: 'Khám Chuyên Khoa Tim Mạch', duration_minutes: 45, is_active: true },
  { service_id: 3, name: 'Khám Chuyên Khoa Nhi', duration_minutes: 30, is_active: true },
  { service_id: 4, name: 'Siêu Âm Màu 4D & Doppler', duration_minutes: 30, is_active: true },
  { service_id: 5, name: 'Dịch vụ ngừng áp dụng (Lưu trữ)', duration_minutes: 60, is_active: false },
];

// Helper date
const today = new Date().toISOString().split('T')[0];

export const initialMockAppointments: Appointment[] = [
  {
    appointment_id: 1001,
    patient_id: 9,
    service_id: 2,
    doctor_id: 4,
    start_at: `${today}T08:30:00+07:00`,
    end_at: `${today}T09:15:00+07:00`,
    status: 'CONFIRMED',
  },
  {
    appointment_id: 1002,
    patient_id: 10,
    service_id: 2,
    doctor_id: 4,
    start_at: `${today}T15:00:00+07:00`,
    end_at: `${today}T15:45:00+07:00`,
    status: 'CONFIRMED', // Conflits with unavailability 15:00-16:00
  },
  {
    appointment_id: 1003,
    patient_id: 11,
    service_id: 3,
    doctor_id: 5,
    start_at: `${today}T09:00:00+07:00`,
    end_at: `${today}T09:30:00+07:00`,
    status: 'CONFIRMED',
  },
  {
    appointment_id: 1004,
    patient_id: 9,
    service_id: 1,
    doctor_id: 6,
    start_at: `${today}T10:00:00+07:00`,
    end_at: `${today}T10:30:00+07:00`,
    status: 'PENDING', // PENDING with doctor: holds slot!
  },
  {
    appointment_id: 1005,
    patient_id: 10,
    service_id: 1,
    doctor_id: null,
    start_at: `${today}T14:00:00+07:00`,
    end_at: `${today}T14:30:00+07:00`,
    status: 'PENDING', // PENDING without doctor: does not hold slot, shows "Chưa gán"
  },
  {
    appointment_id: 1006,
    patient_id: 11,
    service_id: 4,
    doctor_id: 7,
    start_at: `${today}T07:30:00+07:00`,
    end_at: `${today}T08:00:00+07:00`,
    status: 'COMPLETED',
  },
  {
    appointment_id: 1007,
    patient_id: 9,
    service_id: 3,
    doctor_id: 5,
    start_at: `${today}T16:00:00+07:00`,
    end_at: `${today}T16:30:00+07:00`,
    status: 'CANCELLED',
  },
];

export const mockNotifications: Notification[] = [
  {
    notification_id: 1,
    appointment_id: 1001,
    recipient_user_id: 9,
    content: 'Lịch hẹn #1001 chuyên khoa Tim Mạch đã được xác nhận vào lúc 08:30 hôm nay.',
    created_at: `${today}T07:45:00+07:00`,
  },
  {
    notification_id: 2,
    appointment_id: 1002,
    recipient_user_id: 3,
    content: 'CẢNH BÁO: Lịch hẹn #1002 bị xung đột với giờ bận của BS. CK1 Trần Văn Tuấn. Lễ tân vui lòng điều phối đổi lịch.',
    created_at: `${today}T08:00:00+07:00`,
  },
];
