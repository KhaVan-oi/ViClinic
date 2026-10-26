-- =============================================================================
-- HỆ THỐNG QUẢN LÝ LỊCH HẸN PHÒNG KHÁM (CLINIC APPOINTMENT MANAGEMENT SYSTEM)
-- Script: schema.sql
-- Phụ trách thực hiện: Nguyễn Hồng Thiện Nhân (SPM-41)
-- =============================================================================

-- Xóa bảng cũ theo thứ tự phụ thuộc (nếu cần thiết lập lại từ đầu)
DROP TABLE IF EXISTS NOTIFICATIONS CASCADE;
DROP TABLE IF EXISTS APPOINTMENT_HISTORY CASCADE;
DROP TABLE IF EXISTS APPOINTMENTS CASCADE;
DROP TABLE IF EXISTS DOCTOR_SERVICES CASCADE;
DROP TABLE IF EXISTS SERVICES CASCADE;
DROP TABLE IF EXISTS DOCTOR_UNAVAILABILITY CASCADE;
DROP TABLE IF EXISTS DOCTOR_SHIFTS CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;

-- -----------------------------------------------------------------------------
-- 1. BẢNG USERS: Lưu thông tin tài khoản người dùng (Bác sĩ, Bệnh nhân, Nhân viên)
-- -----------------------------------------------------------------------------
CREATE TABLE USERS (
    user_id SERIAL PRIMARY KEY,
    login_identifier VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    birth_date DATE NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(120) NULL,
    role VARCHAR(30) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. BẢNG DOCTOR_SHIFTS: Lưu ca trực định kỳ của bác sĩ
-- -----------------------------------------------------------------------------
CREATE TABLE DOCTOR_SHIFTS (
    shift_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_shifts_doctor FOREIGN KEY (doctor_id) 
        REFERENCES USERS(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_shift_time CHECK (end_at > start_at)
);

-- -----------------------------------------------------------------------------
-- 3. BẢNG DOCTOR_UNAVAILABILITY: Lưu các khoảng thời gian bác sĩ bận đột xuất
-- -----------------------------------------------------------------------------
CREATE TABLE DOCTOR_UNAVAILABILITY (
    unavailability_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_unavailability_doctor FOREIGN KEY (doctor_id) 
        REFERENCES USERS(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_unavailability_time CHECK (end_at > start_at)
);

-- -----------------------------------------------------------------------------
-- 4. BẢNG SERVICES: Danh mục các dịch vụ khám bệnh tại phòng khám
-- -----------------------------------------------------------------------------
CREATE TABLE SERVICES (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    CONSTRAINT chk_duration_positive CHECK (duration_minutes > 0)
);

-- -----------------------------------------------------------------------------
-- 5. BẢNG DOCTOR_SERVICES: Quan hệ nhiều-nhiều giữa bác sĩ và dịch vụ chuyên môn
-- -----------------------------------------------------------------------------
CREATE TABLE DOCTOR_SERVICES (
    doctor_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (doctor_id, service_id),
    CONSTRAINT fk_doc_services_doctor FOREIGN KEY (doctor_id) 
        REFERENCES USERS(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_services_service FOREIGN KEY (service_id) 
        REFERENCES SERVICES(service_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 6. BẢNG APPOINTMENTS: Lưu thông tin lịch hẹn khám
-- Lưu ý: doctor_id cho phép NULL khi trạng thái là 'Pending' (chờ phân bổ)
-- -----------------------------------------------------------------------------
CREATE TABLE APPOINTMENTS (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    doctor_id INTEGER NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) 
        REFERENCES USERS(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) 
        REFERENCES SERVICES(service_id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) 
        REFERENCES USERS(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_appointment_time CHECK (end_at > start_at)
);

-- -----------------------------------------------------------------------------
-- 7. BẢNG APPOINTMENT_HISTORY: Ghi nhận lịch sử và vết thay đổi của lịch hẹn
-- -----------------------------------------------------------------------------
CREATE TABLE APPOINTMENT_HISTORY (
    history_id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    actor_user_id INTEGER NOT NULL,
    old_doctor_id INTEGER NULL,
    new_doctor_id INTEGER NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    old_start_at TIMESTAMP NULL,
    new_start_at TIMESTAMP NULL,
    old_end_at TIMESTAMP NULL,
    new_end_at TIMESTAMP NULL,
    CONSTRAINT fk_history_appointment FOREIGN KEY (appointment_id) 
        REFERENCES APPOINTMENTS(appointment_id) ON DELETE CASCADE,
    CONSTRAINT fk_history_actor FOREIGN KEY (actor_user_id) 
        REFERENCES USERS(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_history_old_doctor FOREIGN KEY (old_doctor_id) 
        REFERENCES USERS(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_history_new_doctor FOREIGN KEY (new_doctor_id) 
        REFERENCES USERS(user_id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 8. BẢNG NOTIFICATIONS: Lưu thông báo phát sinh từ cuộc hẹn gửi đến người dùng
-- -----------------------------------------------------------------------------
CREATE TABLE NOTIFICATIONS (
    notification_id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    recipient_user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_appointment FOREIGN KEY (appointment_id) 
        REFERENCES APPOINTMENTS(appointment_id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) 
        REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- TỐI ƯU HÓA: Tạo chỉ mục tìm kiếm và khóa ngoại thường dùng
-- -----------------------------------------------------------------------------
CREATE INDEX idx_appointments_patient ON APPOINTMENTS(patient_id);
CREATE INDEX idx_appointments_doctor ON APPOINTMENTS(doctor_id);
CREATE INDEX idx_appointments_status ON APPOINTMENTS(status);
CREATE INDEX idx_shifts_doctor_time ON DOCTOR_SHIFTS(doctor_id, start_at, end_at);
CREATE INDEX idx_unavailability_doctor_time ON DOCTOR_UNAVAILABILITY(doctor_id, start_at, end_at);
CREATE INDEX idx_history_appointment ON APPOINTMENT_HISTORY(appointment_id);
CREATE INDEX idx_notifications_recipient ON NOTIFICATIONS(recipient_user_id);