/**
 * ViClinic Database Types
 * Generated according to database/schema.sql and doc/database-design/Data_Dictionary.md
 */

export type UserRole = 
  | 'PATIENT'
  | 'RECEPTIONIST'
  | 'DOCTOR'
  | 'CLINIC_MANAGER'
  | 'ADMIN';

export type AccountStatus = 
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'DISABLED';

export type AppointmentStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface User {
  user_id: number;
  full_name: string;
  birth_date: string | null; // DATE (YYYY-MM-DD), required for PATIENT
  phone: string;             // UNIQUE
  email: string | null;
  role: UserRole;
}

export interface Account {
  account_id: number;
  user_id: number;
  password_hash: string | null;
  status: AccountStatus;
}

export interface DoctorShift {
  shift_id: number;
  doctor_id: number;
  start_at: string; // ISO 8601 TIMESTAMPTZ
  end_at: string;   // ISO 8601 TIMESTAMPTZ, end_at > start_at
}

export interface DoctorUnavailability {
  unavailability_id: number;
  doctor_id: number;
  start_at: string; // ISO 8601 TIMESTAMPTZ
  end_at: string;   // ISO 8601 TIMESTAMPTZ, end_at > start_at
}

export interface Service {
  service_id: number;
  name: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface DoctorService {
  doctor_id: number;
  service_id: number;
}

export interface Appointment {
  appointment_id: number;
  patient_id: number;
  service_id: number;
  doctor_id: number | null; // Nullable for PENDING; required for CONFIRMED/COMPLETED
  start_at: string;        // ISO 8601 TIMESTAMPTZ
  end_at: string;          // ISO 8601 TIMESTAMPTZ
  status: AppointmentStatus;
}

export interface AppointmentHistory {
  history_id: number;
  appointment_id: number;
  actor_user_id: number;
  old_doctor_id: number | null;
  new_doctor_id: number | null;
  changed_at: string;
  old_status: AppointmentStatus | null;
  new_status: AppointmentStatus;
  old_start_at: string | null;
  new_start_at: string | null;
  old_end_at: string | null;
  new_end_at: string | null;
}

export interface Notification {
  notification_id: number;
  appointment_id: number;
  recipient_user_id: number;
  content: string;
  created_at: string;
}

// Extended types for API and UI rendering
export interface AffectedAppointment extends Appointment {
  patient_name?: string;
  patient_phone?: string;
  doctor_name?: string;
  service_name?: string;
  conflict_reason: 'SHIFT_REMOVED' | 'UNAVAILABILITY_OVERLAP' | 'OUTSIDE_SHIFT';
}
