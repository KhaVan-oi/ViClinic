-- =============================================================================
-- DỮ LIỆU MẪU HỆ THỐNG (SEED DATA)
-- Phục vụ kiểm thử NFR-001 / NFR-010: Đúng 5 bác sĩ và chuẩn 1.000 lịch hẹn
-- Đảm bảo tính idempotent, 100% khớp chuyên môn DOCTOR_SERVICES và không overlap
-- =============================================================================

-- Làm sạch dữ liệu trước khi nạp để bảo đảm tính idempotent
TRUNCATE TABLE NOTIFICATIONS,
APPOINTMENT_HISTORY,
APPOINTMENTS,
DOCTOR_SERVICES,
SERVICES,
DOCTOR_UNAVAILABILITY,
DOCTOR_SHIFTS,
ACCOUNTS,
USERS RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 1. DANH SÁCH NGƯỜI DÙNG (USERS): Đủ 5 vai trò
-- Ràng buộc birth_date bắt buộc khi role = 'PATIENT' (chk_patient_birth_date)
-- -----------------------------------------------------------------------------
INSERT INTO
    USERS (
        user_id,
        full_name,
        birth_date,
        phone,
        email,
        role
    )
VALUES
    -- Quản trị viên & Quản lý
    (
        1,
        'Nguyễn Quản Trị',
        '1985-01-10',
        '0900000001',
        'admin@viclinic.vn',
        'ADMIN'
    ),
    (
        2,
        'Trần Quản Lý',
        '1987-05-15',
        '0900000002',
        'manager@viclinic.vn',
        'CLINIC_MANAGER'
    ),
    -- Lễ tân
    (
        3,
        'Lê Phước Thịnh',
        '1996-03-20',
        '0900000003',
        'lephuocthinh@viclinic.vn',
        'RECEPTIONIST'
    ),

-- Đủ 5 bác sĩ phụ trách chuyên môn (ID từ 4 đến 8)
(
    4,
    'BS. CK1 Trần Văn Tuấn',
    '1980-06-12',
    '0911000001',
    'tuan.tran@viclinic.vn',
    'DOCTOR'
),
(
    5,
    'ThS. BS Nguyễn Thị Lan',
    '1985-09-24',
    '0911000002',
    'lan.nguyen@viclinic.vn',
    'DOCTOR'
),
(
    6,
    'BS. CKI Lê Quang Hưng',
    '1979-11-03',
    '0911000003',
    'hung.le@viclinic.vn',
    'DOCTOR'
),
(
    7,
    'ThS. BS Phạm Thanh Mai',
    '1988-02-18',
    '0911000004',
    'mai.pham@viclinic.vn',
    'DOCTOR'
),
(
    8,
    'BS. CKII Vũ Hoàng Nam',
    '1975-08-30',
    '0911000005',
    'nam.vu@viclinic.vn',
    'DOCTOR'
),

-- Bệnh nhân bình thường (ACTIVE)
(
    9,
    'Lê Hoài An',
    '2001-02-15',
    '0922000001',
    'hoaian@gmail.com',
    'PATIENT'
),
(
    10,
    'Phạm Quốc Bình',
    '1998-09-30',
    '0922000002',
    'quocbinh@gmail.com',
    'PATIENT'
),
-- Bệnh nhân tạo tại quầy (PENDING_ACTIVATION)
(
    11,
    'Đỗ Minh Trí',
    '1995-12-05',
    '0922000003',
    'minhtri@gmail.com',
    'PATIENT'
),
-- Bệnh nhân bị khóa tài khoản (DISABLED)
(
    12,
    'Vũ Minh Khang',
    '1992-07-18',
    '0922000004',
    'vuminhkhang92@gmail.com',
    'PATIENT'
);

SELECT setval(
        'users_user_id_seq', (
            SELECT MAX(user_id)
            FROM USERS
        )
    );

-- -----------------------------------------------------------------------------
-- 2. TÀI KHOẢN XÁC THỰC (ACCOUNTS)
-- ACTIVE / DISABLED bắt buộc có password_hash; PENDING_ACTIVATION cho phép NULL
-- -----------------------------------------------------------------------------
INSERT INTO
    ACCOUNTS (
        user_id,
        password_hash,
        status
    )
VALUES (
        1,
        '$2b$10$tZ92E7c1o3K6eEwW2qR5uuY0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi',
        'ACTIVE'
    ),
    (
        2,
        '$2b$10$wN35R9u7z1K8qQwO1tP4eeY3mO6bU8iK5.l7vR9cT1hG3k5oJ9vMa',
        'ACTIVE'
    ),
    (
        3,
        '$2b$10$xL12Y8v9z3M5rRyP3wQ6uuZ4nP7cV0jL7.m9wS1dU3iH5l7pJ1vNa',
        'ACTIVE'
    ),
    (
        4,
        '$2b$10$kP45T1w3z5O7tTzR5yS8uuA6pS9eX2lM9.o1yU3fW5kI7n9rL3vPa',
        'ACTIVE'
    ),
    (
        5,
        '$2b$10$mR67V3y5z7Q9vVbT7zU0uuB8rU1gZ4nO1.q3zW5hY7mK9p1tN5vRa',
        'ACTIVE'
    ),
    (
        6,
        '$2b$10$oT89X5z7z9S1xXdF9aW2uuC0tW3ib6pQ3.s5bY7jA9oM1r3vP7vTa',
        'ACTIVE'
    ),
    (
        7,
        '$2b$10$qV01Z7b9z1U3zZfH1bY4uuD2vY5kd8rS5.u7dZ9lC1qO3t5xR9vVa',
        'ACTIVE'
    ),
    (
        8,
        '$2b$10$sX23B9d1z3W5bBhJ3cZ6uuE4xZ7mf0tU7.w9fZ1nD3sQ5v7zT1vXa',
        'ACTIVE'
    ),
    (
        9,
        '$2b$10$uZ45D1f3z5Y7dDjL5d08uuF6zB9nh2vW9.y1hB3pE5uS7x9bV3vZa',
        'ACTIVE'
    ),
    (
        10,
        '$2b$10$wA67F3h5z7A9fFlN7e20uuG8bC1pj4xY1.03jD5rG7wU9z1dX5vba',
        'ACTIVE'
    ),
    (
        11,
        NULL,
        'PENDING_ACTIVATION'
    ),
    (
        12,
        '$2b$10$yC89H5j7z9C1hHpP9g42uuI0dE3rl6zZ3.25lF7tI9yW1b3fZ7vda',
        'DISABLED'
    );

-- -----------------------------------------------------------------------------
-- 3. DANH MỤC DỊCH VỤ KHÁM (SERVICES)
-- -----------------------------------------------------------------------------
INSERT INTO
    SERVICES (
        service_id,
        name,
        duration_minutes,
        is_active
    )
VALUES (
        1,
        'Khám Tổng Quát Nội Khoa',
        30,
        TRUE
    ),
    (
        2,
        'Khám Chuyên Khoa Tim Mạch',
        45,
        TRUE
    ),
    (
        3,
        'Khám Chuyên Khoa Nhi',
        30,
        TRUE
    ),
    (
        4,
        'Tư Vấn Dinh Dưỡng Chuyên Sâu',
        30,
        TRUE
    ),
    (
        5,
        'Dịch Vụ Khám Cũ Ngừng Áp Dụng',
        60,
        FALSE
    );

SELECT setval(
        'services_service_id_seq', (
            SELECT MAX(service_id)
            FROM SERVICES
        )
    );

-- -----------------------------------------------------------------------------
-- 4. PHÂN BỔ DỊCH VỤ CHO 5 BÁC SĨ (DOCTOR_SERVICES)
-- -----------------------------------------------------------------------------
INSERT INTO
    DOCTOR_SERVICES (doctor_id, service_id)
VALUES (4, 1),
    (4, 2), -- BS. Tuấn: Tổng quát (1), Tim mạch (2)
    (5, 1),
    (5, 4), -- BS. Lan:  Tổng quát (1), Dinh dưỡng (4)
    (6, 1),
    (6, 2), -- BS. Hưng: Tổng quát (1), Tim mạch (2)
    (7, 1),
    (7, 3), -- BS. Mai:  Tổng quát (1), Nhi (3)
    (8, 1),
    (8, 4);
-- BS. Nam:  Tổng quát (1), Dinh dưỡng (4)

-- -----------------------------------------------------------------------------
-- 5. CA TRỰC THEO NGÀY CỦA BÁC SĨ (DOCTOR_SHIFTS)
-- Bổ sung ca trực ngày 01/11/2026 khớp với lịch mẫu 851 của BS Tuấn
-- -----------------------------------------------------------------------------
INSERT INTO
    DOCTOR_SHIFTS (doctor_id, start_at, end_at)
VALUES (
        4,
        '2026-11-01 08:00:00+07',
        '2026-11-01 12:00:00+07'
    ),
    (
        4,
        '2026-11-02 08:00:00+07',
        '2026-11-02 12:00:00+07'
    ),
    (
        4,
        '2026-11-02 13:30:00+07',
        '2026-11-02 17:30:00+07'
    ),
    (
        5,
        '2026-11-02 08:00:00+07',
        '2026-11-02 12:00:00+07'
    ),
    (
        6,
        '2026-11-02 08:00:00+07',
        '2026-11-02 12:00:00+07'
    ),
    (
        7,
        '2026-11-03 08:00:00+07',
        '2026-11-03 12:00:00+07'
    ),
    (
        8,
        '2026-11-03 13:30:00+07',
        '2026-11-03 17:30:00+07'
    );

-- -----------------------------------------------------------------------------
-- 6. LỊCH BẬN ĐỘT XUẤT CỦA BÁC SĨ (DOCTOR_UNAVAILABILITY)
-- -----------------------------------------------------------------------------
INSERT INTO
    DOCTOR_UNAVAILABILITY (doctor_id, start_at, end_at)
VALUES (
        4,
        '2026-11-02 10:00:00+07',
        '2026-11-02 11:00:00+07'
    );

-- -----------------------------------------------------------------------------
-- 7. SINH CHÍNH XÁC 1.000 LỊCH HẸN TRÊN 5 BÁC SĨ (NFR-001 / NFR-010)
-- 700 COMPLETED, 150 CANCELLED, 100 CONFIRMED, 50 PENDING (25 ca chưa gán BS)
-- Đảm bảo:
--  - 100% bác sĩ có cặp tương ứng trong DOCTOR_SERVICES
--  - end_at tính động theo duration_minutes của dịch vụ
--  - Không overlap lịch active trên cùng bệnh nhân / bác sĩ (NFR-004)
--  - Khớp chính xác với APPOINTMENT_HISTORY và NOTIFICATIONS mẫu
-- -----------------------------------------------------------------------------
WITH
    doc_service_map (
        pair_idx,
        doctor_id,
        service_id
    ) AS (
        VALUES (0, 4, 1), -- BS. Tuấn: Tổng Quát (30p)
            (1, 4, 2), -- BS. Tuấn: Tim Mạch (45p)
            (2, 5, 1), -- BS. Lan:  Tổng Quát (30p)
            (3, 5, 4), -- BS. Lan:  Dinh Dưỡng (30p)
            (4, 6, 1), -- BS. Hưng: Tổng Quát (30p)
            (5, 6, 2), -- BS. Hưng: Tim Mạch (45p)
            (6, 7, 1), -- BS. Mai:  Tổng Quát (30p)
            (7, 7, 3), -- BS. Mai:  Nhi (30p)
            (8, 8, 1), -- BS. Nam:  Tổng Quát (30p)
            (9, 8, 4) -- BS. Nam:  Dinh Dưỡng (30p)
    ),
    raw_appointments AS (
        SELECT
            s AS appointment_id,
            CASE
                WHEN s = 701 THEN 10 -- Khớp APPOINTMENT_HISTORY: BN Phạm Quốc Bình hủy
                WHEN s = 851 THEN 9 -- Khớp APPOINTMENT_HISTORY: BN Lê Hoài An đặt lịch
                ELSE 9 + ((s - 1) % 4) -- Luân phiên phân bổ cho các bệnh nhân ID 9..12
            END AS patient_id,
            CASE
                WHEN s = 701 THEN 4
                WHEN s = 851 THEN 4
                WHEN s > 975 THEN NULL -- 25 ca PENDING chưa phân bổ bác sĩ
                ELSE m.doctor_id
            END AS doctor_id,
            CASE
                WHEN s = 701 THEN 1
                WHEN s = 851 THEN 1
                WHEN s > 975 THEN 1 + ((s - 1) % 4)
                ELSE m.service_id
            END AS service_id,
            CASE
                WHEN s <= 700 THEN
                -- 700 lịch COMPLETED trong quá khứ (từ 01/08/2026)
                TIMESTAMPTZ '2026-08-01 08:00:00+07' + (
                    ((s - 1) / 10) * INTERVAL '1 day'
                ) + (
                    ((s - 1) % 10) * INTERVAL '50 minutes'
                )
                WHEN s <= 850 THEN
                -- 150 lịch CANCELLED
                CASE
                    WHEN s = 701 THEN TIMESTAMPTZ '2026-08-16 14:00:00+07'
                    ELSE TIMESTAMPTZ '2026-08-17 08:30:00+07' + (
                        ((s - 702) / 6) * INTERVAL '1 day'
                    ) + (
                        ((s - 702) % 6) * INTERVAL '1 hour'
                    )
                END
                WHEN s <= 950 THEN
                -- 100 lịch CONFIRMED trong tháng 11/2026 (không overlap)
                CASE
                    WHEN s = 851 THEN TIMESTAMPTZ '2026-11-01 08:00:00+07'
                    ELSE TIMESTAMPTZ '2026-11-01 08:00:00+07' + (
                        ((s - 851) / 5) * INTERVAL '1 day'
                    ) + (
                        CASE (s - 851) % 5
                            WHEN 0 THEN INTERVAL '0 hours'
                            WHEN 1 THEN INTERVAL '1 hour'
                            WHEN 2 THEN INTERVAL '2 hours'
                            WHEN 3 THEN INTERVAL '5 hours 30 minutes'
                            ELSE INTERVAL '6 hours 30 minutes'
                        END
                    )
                END
                ELSE
                -- 50 lịch PENDING (không overlap)
                TIMESTAMPTZ '2026-11-21 08:00:00+07' + (
                    ((s - 951) / 5) * INTERVAL '1 day'
                ) + (
                    CASE (s - 951) % 5
                        WHEN 0 THEN INTERVAL '0 hours'
                        WHEN 1 THEN INTERVAL '1 hour'
                        WHEN 2 THEN INTERVAL '2 hours'
                        WHEN 3 THEN INTERVAL '5 hours 30 minutes'
                        ELSE INTERVAL '6 hours 30 minutes'
                    END
                )
            END AS start_at,
            CASE
                WHEN s <= 700 THEN 'COMPLETED'
                WHEN s <= 850 THEN 'CANCELLED'
                WHEN s <= 950 THEN 'CONFIRMED'
                ELSE 'PENDING'
            END AS status
        FROM generate_series(1, 1000) AS s
            LEFT JOIN doc_service_map m ON m.pair_idx = ((s - 1) % 10)
    )
INSERT INTO
    APPOINTMENTS (
        appointment_id,
        patient_id,
        service_id,
        doctor_id,
        start_at,
        end_at,
        status
    )
SELECT r.appointment_id, r.patient_id, r.service_id, r.doctor_id, r.start_at,
    -- Tính end_at chuẩn xác theo duration_minutes của từng dịch vụ
    r.start_at + (
        srv.duration_minutes * INTERVAL '1 minute'
    ) AS end_at, r.status
FROM
    raw_appointments r
    JOIN SERVICES srv ON srv.service_id = r.service_id;

SELECT setval(
        'appointments_appointment_id_seq', (
            SELECT MAX(appointment_id)
            FROM APPOINTMENTS
        )
    );

-- -----------------------------------------------------------------------------
-- 8. TRUY VẾT LỊCH SỬ THAY ĐỔI MẪU (APPOINTMENT_HISTORY)
-- Khởi tạo ban đầu có old_status = NULL
-- Khớp hoàn hảo với thông tin của appointment 851 và 701
-- -----------------------------------------------------------------------------
INSERT INTO
    APPOINTMENT_HISTORY (
        history_id,
        appointment_id,
        actor_user_id,
        old_doctor_id,
        new_doctor_id,
        changed_at,
        old_status,
        new_status,
        old_start_at,
        new_start_at,
        old_end_at,
        new_end_at
    )
VALUES (
        1,
        851,
        9,
        NULL,
        4,
        TIMESTAMPTZ '2026-10-25 09:00:00+07',
        NULL,
        'PENDING',
        NULL,
        TIMESTAMPTZ '2026-11-01 08:00:00+07',
        NULL,
        TIMESTAMPTZ '2026-11-01 08:30:00+07'
    ),
    (
        2,
        851,
        3,
        4,
        4,
        TIMESTAMPTZ '2026-10-25 09:30:00+07',
        'PENDING',
        'CONFIRMED',
        TIMESTAMPTZ '2026-11-01 08:00:00+07',
        TIMESTAMPTZ '2026-11-01 08:00:00+07',
        TIMESTAMPTZ '2026-11-01 08:30:00+07',
        TIMESTAMPTZ '2026-11-01 08:30:00+07'
    ),
    (
        3,
        701,
        10,
        4,
        4,
        TIMESTAMPTZ '2026-08-16 10:00:00+07',
        'CONFIRMED',
        'CANCELLED',
        TIMESTAMPTZ '2026-08-16 14:00:00+07',
        TIMESTAMPTZ '2026-08-16 14:00:00+07',
        TIMESTAMPTZ '2026-08-16 14:30:00+07',
        TIMESTAMPTZ '2026-08-16 14:30:00+07'
    );

SELECT setval(
        'appointment_history_history_id_seq', (
            SELECT MAX(history_id)
            FROM APPOINTMENT_HISTORY
        )
    );

-- -----------------------------------------------------------------------------
-- 9. THÔNG BÁO IN-APP MẪU (NOTIFICATIONS)
-- Khớp hoàn hảo với thông tin của appointment 851 và 701
-- -----------------------------------------------------------------------------
INSERT INTO
    NOTIFICATIONS (
        notification_id,
        appointment_id,
        recipient_user_id,
        content,
        created_at
    )
VALUES (
        1,
        851,
        9,
        'Lịch hẹn khám của bạn vào lúc 08:00 ngày 01/11/2026 đã được xác nhận thành công.',
        TIMESTAMPTZ '2026-10-25 09:30:00+07'
    ),
    (
        2,
        851,
        4,
        'Bác sĩ có lịch hẹn mới từ bệnh nhân Lê Hoài An lúc 08:00 ngày 01/11/2026.',
        TIMESTAMPTZ '2026-10-25 09:30:00+07'
    ),
    (
        3,
        701,
        4,
        'Bệnh nhân Phạm Quốc Bình đã hủy lịch hẹn ngày 16/08/2026.',
        TIMESTAMPTZ '2026-08-16 10:00:00+07'
    );

SELECT setval(
        'notifications_notification_id_seq', (
            SELECT MAX(notification_id)
            FROM NOTIFICATIONS
        )
    );

SELECT setval(
        'notifications_notification_id_seq', (
            SELECT MAX(notification_id)
            FROM NOTIFICATIONS
        )
    );