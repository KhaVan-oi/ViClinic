INSERT INTO USERS (user_id, login_identifier, password_hash, full_name, birth_date, phone, email, role) VALUES
(1, 'admin_staff', '$2b$12$eD9Xk7m...hashedpwd1', 'Lễ Tân Tuyết Mai', '1995-04-12', '0901234567', 'tuyetmai@clinic.vn', 'Staff'),
(2, 'dr_tuan',     '$2b$12$eD9Xk7m...hashedpwd2', 'BS. CK1 Trần Văn Tuấn', '1982-08-20', '0912345678', 'tuantran@clinic.vn', 'Doctor'),
(3, 'dr_lan',      '$2b$12$eD9Xk7m...hashedpwd3', 'ThS. BS Nguyễn Thị Lan', '1988-11-05', '0923456789', 'lannguyen@clinic.vn', 'Doctor'),
(4, 'patient_an',   '$2b$12$eD9Xk7m...hashedpwd4', 'Lê Hoài An', '2001-02-15', '0934567890', 'hoaian@gmail.com', 'Patient'),
(5, 'patient_binh', '$2b$12$eD9Xk7m...hashedpwd5', 'Phạm Quốc Bình', '1998-09-30', '0945678901', 'quocbinh@gmail.com', 'Patient');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM USERS));

INSERT INTO SERVICES (service_id, name, duration_minutes) VALUES
(1, 'Khám Tổng Quát Nội Khoa', 30),
(2, 'Khám Chuyên Khoa Tim Mạch', 45),
(3, 'Tư Vấn Dinh Dưỡng Chuyên Sâu', 30),
(4, 'Nội Soi Tiêu Hóa', 60);

SELECT setval('services_service_id_seq', (SELECT MAX(service_id) FROM SERVICES));

INSERT INTO DOCTOR_SERVICES (doctor_id, service_id) VALUES
(2, 1),
(2, 2),
(3, 1),
(3, 3);

INSERT INTO DOCTOR_SHIFTS (shift_id, doctor_id, start_at, end_at) VALUES
(1, 2, '2026-11-02 08:00:00', '2026-11-02 12:00:00'),
(2, 2, '2026-11-02 13:30:00', '2026-11-02 17:30:00'),
(3, 3, '2026-11-02 08:00:00', '2026-11-02 12:00:00'),
(4, 3, '2026-11-03 08:00:00', '2026-11-03 12:00:00');

SELECT setval('doctor_shifts_shift_id_seq', (SELECT MAX(shift_id) FROM DOCTOR_SHIFTS));

INSERT INTO DOCTOR_UNAVAILABILITY (unavailability_id, doctor_id, start_at, end_at) VALUES
(1, 2, '2026-11-02 10:00:00', '2026-11-02 11:00:00');

SELECT setval('doctor_unavailability_unavailability_id_seq', (SELECT MAX(unavailability_id) FROM DOCTOR_UNAVAILABILITY));

INSERT INTO APPOINTMENTS (appointment_id, patient_id, service_id, doctor_id, start_at, end_at, status) VALUES
(1, 4, 1, 2, '2026-11-02 08:30:00', '2026-11-02 09:00:00', 'Confirmed'),
(2, 5, 3, NULL, '2026-11-03 09:00:00', '2026-11-03 09:30:00', 'Pending'),
(3, 4, 2, 2, '2026-10-25 09:00:00', '2026-10-25 09:45:00', 'Completed'),
(4, 5, 1, 3, '2026-11-02 09:00:00', '2026-11-02 09:30:00', 'Cancelled');

SELECT setval('appointments_appointment_id_seq', (SELECT MAX(appointment_id) FROM APPOINTMENTS));

INSERT INTO APPOINTMENT_HISTORY (
    history_id, appointment_id, actor_user_id, old_doctor_id, new_doctor_id, 
    changed_at, old_status, new_status, old_start_at, new_start_at, old_end_at, new_end_at
) VALUES
(1, 1, 4, NULL, NULL, '2026-10-27 10:00:00', 'Created', 'Pending', NULL, '2026-11-02 08:30:00', NULL, '2026-11-02 09:00:00'),
(2, 1, 1, NULL, 2, '2026-10-27 10:30:00', 'Pending', 'Confirmed', '2026-11-02 08:30:00', '2026-11-02 08:30:00', '2026-11-02 09:00:00', '2026-11-02 09:00:00'),
(3, 4, 5, 3, 3, '2026-10-28 14:00:00', 'Confirmed', 'Cancelled', '2026-11-02 09:00:00', '2026-11-02 09:00:00', '2026-11-02 09:30:00', '2026-11-02 09:30:00');

SELECT setval('appointment_history_history_id_seq', (SELECT MAX(history_id) FROM APPOINTMENT_HISTORY));

INSERT INTO NOTIFICATIONS (notification_id, appointment_id, recipient_user_id, content, created_at) VALUES
(1, 1, 4, 'Lịch hẹn khám Tổng Quát của bạn vào lúc 08:30 ngày 02/11/2026 đã được BS. Trần Văn Tuấn xác nhận tiếp nhận.', '2026-10-27 10:30:00'),
(2, 1, 2, 'Bạn có lịch hẹn mới từ bệnh nhân Lê Hoài An lúc 08:30 ngày 02/11/2026.', '2026-10-27 10:30:00'),
(3, 2, 5, 'Yêu cầu đặt hẹn dịch vụ Tư Vấn Dinh Dưỡng ngày 03/11/2026 đang chờ hệ thống xếp bác sĩ phụ trách.', '2026-10-28 08:15:00'),
(4, 4, 3, 'Bệnh nhân Phạm Quốc Bình đã hủy lịch hẹn khám ngày 02/11/2026.', '2026-10-28 14:00:00');

SELECT setval('notifications_notification_id_seq', (SELECT MAX(notification_id) FROM NOTIFICATIONS));