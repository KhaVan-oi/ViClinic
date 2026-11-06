-- =============================================================================
-- HỆ THỐNG QUẢN LÝ LỊCH HẸN PHÒNG KHÁM (CLINIC APPOINTMENT MANAGEMENT SYSTEM)
-- Script: schema.sql (Tạo mới từ đầu toàn bộ bảng và chỉ mục)
-- Phụ trách: Nguyễn Hồng Thiện Nhân (SPM-41)
-- =============================================================================

-- Xóa các bảng cũ theo thứ tự phụ thuộc để bảo đảm tính idempotent
DROP TABLE IF EXISTS NOTIFICATIONS CASCADE;

DROP TABLE IF EXISTS APPOINTMENT_HISTORY CASCADE;

DROP TABLE IF EXISTS APPOINTMENTS CASCADE;

DROP TABLE IF EXISTS DOCTOR_SERVICES CASCADE;

DROP TABLE IF EXISTS SERVICES CASCADE;

DROP TABLE IF EXISTS DOCTOR_UNAVAILABILITY CASCADE;

DROP TABLE IF EXISTS DOCTOR_SHIFTS CASCADE;

DROP TABLE IF EXISTS ACCOUNTS CASCADE;

DROP TABLE IF EXISTS USERS CASCADE;

-- -----------------------------------------------------------------------------
-- 1. BẢNG USERS: Quản lý hồ sơ định danh người dùng
-- Đăng nhập bằng số điện thoại duy nhất (phone NOT NULL, UNIQUE)
-- Ràng buộc birth_date bắt buộc khi role = 'PATIENT' (Data_Dictionary mục 2)
-- -----------------------------------------------------------------------------
CREATE TABLE USERS (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    birth_date DATE NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(120) NULL,
    role VARCHAR(30) NOT NULL CHECK (
        role IN (
            'PATIENT',
            'RECEPTIONIST',
            'DOCTOR',
            'CLINIC_MANAGER',
            'ADMIN'
        )
    ),
    CONSTRAINT chk_patient_birth_date CHECK (
        role <> 'PATIENT'
        OR birth_date IS NOT NULL
    )
);

-- -----------------------------------------------------------------------------
-- 2. BẢNG ACCOUNTS: Xác thực tài khoản đăng nhập web
-- password_hash cho phép NULL khi tài khoản ở trạng thái PENDING_ACTIVATION (FR-M01-005)
-- ACTIVE / DISABLED bắt buộc phải có password_hash (Data_Dictionary mục 3)
-- -----------------------------------------------------------------------------
CREATE TABLE ACCOUNTS (
    account_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN (
            'PENDING_ACTIVATION',
            'ACTIVE',
            'DISABLED'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES USERS (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_account_password_hash CHECK (
        status = 'PENDING_ACTIVATION'
        OR password_hash IS NOT NULL
    )
);

-- -----------------------------------------------------------------------------
-- 3. BẢNG DOCTOR_SHIFTS: Ca trực làm việc theo ngày của bác sĩ
-- -----------------------------------------------------------------------------
CREATE TABLE DOCTOR_SHIFTS (
    shift_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_shifts_doctor FOREIGN KEY (doctor_id) REFERENCES USERS (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_shift_time CHECK (end_at > start_at)
);

-- -----------------------------------------------------------------------------
-- 4. BẢNG DOCTOR_UNAVAILABILITY: Lịch bận hoặc nghỉ đột xuất của bác sĩ
-- -----------------------------------------------------------------------------
CREATE TABLE DOCTOR_UNAVAILABILITY (
    unavailability_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_unavailability_doctor FOREIGN KEY (doctor_id) REFERENCES USERS (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_unavailability_time CHECK (end_at > start_at)
);

-- -----------------------------------------------------------------------------
-- 5. BẢNG SERVICES: Danh mục dịch vụ khám
-- -----------------------------------------------------------------------------
CREATE TABLE SERVICES (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_duration_positive CHECK (duration_minutes > 0)
);

-- -----------------------------------------------------------------------------
-- 6. BẢNG DOCTOR_SERVICES: Mối quan hệ giữa bác sĩ và dịch vụ chuyên môn
-- -----------------------------------------------------------------------------
CREATE TABLE DOCTOR_SERVICES (
    doctor_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (doctor_id, service_id),
    CONSTRAINT fk_doc_services_doctor FOREIGN KEY (doctor_id) REFERENCES USERS (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_services_service FOREIGN KEY (service_id) REFERENCES SERVICES (service_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 7. BẢNG APPOINTMENTS: Lưu lịch hẹn khám
-- CONFIRMED và COMPLETED bắt buộc phải có doctor_id
-- -----------------------------------------------------------------------------
CREATE TABLE APPOINTMENTS (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    doctor_id INTEGER NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (
        status IN (
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED'
        )
    ),
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES USERS (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) REFERENCES SERVICES (service_id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES USERS (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_appointment_time CHECK (end_at > start_at),
    CONSTRAINT chk_appointment_doctor_required CHECK (
        status NOT IN ('CONFIRMED', 'COMPLETED')
        OR doctor_id IS NOT NULL
    )
);

-- -----------------------------------------------------------------------------
-- 8. BẢNG APPOINTMENT_HISTORY: Truy vết thay đổi lịch hẹn (Audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE APPOINTMENT_HISTORY (
    history_id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    actor_user_id INTEGER NOT NULL,
    old_doctor_id INTEGER NULL,
    new_doctor_id INTEGER NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    old_status VARCHAR(20) NULL CHECK (
        old_status IS NULL
        OR old_status IN (
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED'
        )
    ),
    new_status VARCHAR(20) NOT NULL CHECK (
        new_status IN (
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED'
        )
    ),
    old_start_at TIMESTAMPTZ NULL,
    new_start_at TIMESTAMPTZ NULL,
    old_end_at TIMESTAMPTZ NULL,
    new_end_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_history_appointment FOREIGN KEY (appointment_id) REFERENCES APPOINTMENTS (appointment_id) ON DELETE CASCADE,
    CONSTRAINT fk_history_actor FOREIGN KEY (actor_user_id) REFERENCES USERS (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_history_old_doctor FOREIGN KEY (old_doctor_id) REFERENCES USERS (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_history_new_doctor FOREIGN KEY (new_doctor_id) REFERENCES USERS (user_id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 9. BẢNG NOTIFICATIONS: Lưu thông báo in-app gửi đến người dùng
-- -----------------------------------------------------------------------------
CREATE TABLE NOTIFICATIONS (
    notification_id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    recipient_user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_appointment FOREIGN KEY (appointment_id) REFERENCES APPOINTMENTS (appointment_id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES USERS (user_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- CHỈ MỤC TỐI ƯU BÁO CÁO (NFR-001) VÀ CHỐNG TRÙNG LỊCH (OVERLAP)
-- (Lưu ý: ACCOUNTS(user_id) đã có Unique Index ngầm định do UNIQUE constraint)
-- -----------------------------------------------------------------------------
CREATE INDEX idx_appointments_doc_status_start ON APPOINTMENTS (doctor_id, status, start_at);

CREATE INDEX idx_appointments_pat_time_status ON APPOINTMENTS (
    patient_id,
    start_at,
    end_at,
    status
);

CREATE INDEX idx_appointments_doc_time_status ON APPOINTMENTS (
    doctor_id,
    start_at,
    end_at,
    status
);

CREATE INDEX idx_shifts_doctor_time ON DOCTOR_SHIFTS (doctor_id, start_at, end_at);

CREATE INDEX idx_unavailability_doctor_time ON DOCTOR_UNAVAILABILITY (doctor_id, start_at, end_at);

CREATE INDEX idx_history_appointment ON APPOINTMENT_HISTORY (appointment_id);

CREATE INDEX idx_notifications_recipient ON NOTIFICATIONS (recipient_user_id);