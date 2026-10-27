# Data Dictionary

![Sơ đồ ERD](ERD.png)

## 1. Quy ước chung

| Nội dung | Quy ước |
| --- | --- |
| DBMS | PostgreSQL |
| Khóa chính | `INTEGER` |
| Ngày sinh | `DATE` |
| Thời điểm nghiệp vụ | `TIMESTAMPTZ` |
| Múi giờ hiển thị | `Asia/Ho_Chi_Minh` |
| Khoảng thời gian | Dùng `[start_at, end_at)`; lịch sau có thể bắt đầu đúng lúc lịch trước kết thúc |
| Vai trò | `PATIENT`, `RECEPTIONIST`, `DOCTOR`, `CLINIC_MANAGER`, `ADMIN` |
| Trạng thái account | `PENDING_ACTIVATION`, `ACTIVE`, `DISABLED` |
| Trạng thái appointment | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` |
| Số điện thoại | Bắt buộc, chuẩn hóa trước khi kiểm tra `UNIQUE` và xác thực |

## 2. `users`

Lưu hồ sơ người dùng nghiệp vụ. Patient Profile có thể tồn tại trước khi có account web.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `user_id` | INTEGER | PK | Không | Mã người dùng |
| `full_name` | VARCHAR(120) |  | Không | Họ tên |
| `birth_date` | DATE | Bắt buộc khi `role = PATIENT` | Có | Ngày sinh bệnh nhân |
| `phone` | VARCHAR(20) | UNIQUE | Không | Số điện thoại chính, dùng để xác minh và đăng nhập |
| `email` | VARCHAR(120) |  | Có | Email liên hệ; tùy chọn với Patient |
| `role` | VARCHAR(30) | CHECK theo danh sách role | Không | Vai trò hệ thống |

## 3. `accounts`

Lưu credential và trạng thái account. Một `users` có tối đa một account.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `account_id` | INTEGER | PK | Không | Mã account |
| `user_id` | INTEGER | FK → `users.user_id`, UNIQUE | Không | Chủ account |
| `password_hash` | VARCHAR(255) |  | Có | Mật khẩu đã băm; có thể rỗng khi chờ kích hoạt |
| `status` | VARCHAR(30) | CHECK `PENDING_ACTIVATION` / `ACTIVE` / `DISABLED` | Không | Trạng thái account |

**Quy tắc:** account chỉ chuyển sang `ACTIVE` sau khi số điện thoại được xác minh bằng OTP và người dùng đã đặt mật khẩu. `ACTIVE`/`DISABLED` phải có `password_hash`.

## 4. `services`

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `service_id` | INTEGER | PK | Không | Mã dịch vụ |
| `name` | VARCHAR(120) |  | Không | Tên dịch vụ |
| `duration_minutes` | INTEGER | CHECK `> 0` | Không | Thời lượng khám |
| `is_active` | BOOLEAN | DEFAULT `TRUE` | Không | Có được dùng cho lịch mới hay không |

## 5. `doctor_services`

Quan hệ nhiều-nhiều giữa Doctor và Service.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `doctor_id` | INTEGER | PK, FK → `users.user_id` | Không | Bác sĩ |
| `service_id` | INTEGER | PK, FK → `services.service_id` | Không | Dịch vụ bác sĩ có thể thực hiện |

## 6. `doctor_shifts`

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `shift_id` | INTEGER | PK | Không | Mã ca |
| `doctor_id` | INTEGER | FK → `users.user_id` | Không | Bác sĩ |
| `start_at` | TIMESTAMPTZ |  | Không | Bắt đầu ca |
| `end_at` | TIMESTAMPTZ | CHECK `end_at > start_at` | Không | Kết thúc ca |

Các ca của cùng Doctor không được chồng lấn.

## 7. `doctor_unavailability`

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `unavailability_id` | INTEGER | PK | Không | Mã khoảng không sẵn sàng |
| `doctor_id` | INTEGER | FK → `users.user_id` | Không | Bác sĩ |
| `start_at` | TIMESTAMPTZ |  | Không | Bắt đầu |
| `end_at` | TIMESTAMPTZ | CHECK `end_at > start_at` | Không | Kết thúc |

## 8. `appointments`

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `appointment_id` | INTEGER | PK | Không | Mã lịch hẹn |
| `patient_id` | INTEGER | FK → `users.user_id` | Không | Bệnh nhân |
| `service_id` | INTEGER | FK → `services.service_id` | Không | Dịch vụ |
| `doctor_id` | INTEGER | FK → `users.user_id` | Có | Bác sĩ được gán |
| `start_at` | TIMESTAMPTZ |  | Không | Thời điểm bắt đầu |
| `end_at` | TIMESTAMPTZ | CHECK `end_at > start_at` | Không | Thời điểm kết thúc |
| `status` | VARCHAR(20) | CHECK theo trạng thái appointment | Không | Trạng thái lịch |

**Quy tắc dữ liệu:**
- `end_at` được tính từ `start_at` và thời lượng dịch vụ tại thời điểm tạo lịch; thay đổi duration của Service không làm thay đổi lịch đã tồn tại.
- `CONFIRMED` và `COMPLETED` bắt buộc có `doctor_id`.
- Doctor được gán phải có cặp tương ứng trong `doctor_services` tại thời điểm tạo/xác nhận/đổi lịch.
- `PENDING`/`CONFIRMED` không được overlap theo `patient_id`; lịch có Doctor không được overlap với lịch đang giữ slot của cùng Doctor.
- Kiểm tra conflict và ghi Appointment phải được thực hiện trong cùng transaction để tránh double-book khi có yêu cầu đồng thời.

**Index phục vụ kiểm tra lịch và báo cáo:**
- `(patient_id, start_at, end_at, status)`
- `(doctor_id, start_at, end_at, status)`
- `(doctor_id, status, start_at)`: tối ưu hóa báo cáo thống kê theo bác sĩ và thời gian (NFR-001)

## 9. `appointment_history`

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `history_id` | INTEGER | PK | Không | Mã lịch sử |
| `appointment_id` | INTEGER | FK → `appointments.appointment_id` | Không | Lịch được thay đổi |
| `actor_user_id` | INTEGER | FK → `users.user_id` | Không | Người thực hiện |
| `old_doctor_id` | INTEGER | FK → `users.user_id` | Có | Doctor trước thay đổi |
| `new_doctor_id` | INTEGER | FK → `users.user_id` | Có | Doctor sau thay đổi |
| `changed_at` | TIMESTAMPTZ |  | Không | Thời điểm thay đổi |
| `old_status` | VARCHAR(20) |  | Có | Trạng thái trước thay đổi; NULL khi tạo lịch mới |
| `new_status` | VARCHAR(20) |  | Không | Trạng thái sau |
| `old_start_at` | TIMESTAMPTZ |  | Có | Giờ bắt đầu trước |
| `new_start_at` | TIMESTAMPTZ |  | Có | Giờ bắt đầu sau |
| `old_end_at` | TIMESTAMPTZ |  | Có | Giờ kết thúc trước |
| `new_end_at` | TIMESTAMPTZ |  | Có | Giờ kết thúc sau |

## 10. `notifications`

Lưu thông báo trong ứng dụng liên quan đến lịch hẹn.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Null | Mô tả |
| --- | --- | --- | --- | --- |
| `notification_id` | INTEGER | PK | Không | Mã thông báo |
| `appointment_id` | INTEGER | FK → `appointments.appointment_id` | Không | Lịch liên quan |
| `recipient_user_id` | INTEGER | FK → `users.user_id` | Không | Người nhận |
| `content` | TEXT |  | Không | Nội dung |
| `created_at` | TIMESTAMPTZ |  | Không | Thời điểm tạo |

## 11. Quan hệ chính

- `users` 1 — 0..1 `accounts`.
- Doctor — Service là M:N qua `doctor_services`.
- Patient 1 — N `appointments`.
- Doctor 0..1 — N `appointments` qua `doctor_id`.
- Service 1 — N `appointments`.
- Doctor 1 — N `doctor_shifts` và `doctor_unavailability`.
- Appointment 1 — N `appointment_history` và `notifications`.
- `appointment_history.actor_user_id` và `notifications.recipient_user_id` tham chiếu `users`.

## 12. Quy chuẩn băm mật khẩu (`password_hash`)

Tuân thủ yêu cầu phi chức năng **NFR-012** (Bảo vệ thông tin đăng nhập: không lưu trữ hoặc trả về mật khẩu ở dạng văn bản rõ).

### 12.1. Thuật toán băm (Hashing Algorithm)
Hệ thống sử dụng thuật toán **Bcrypt** (`$2b$`) với hệ số chi phí (Cost Factor / Salt Rounds) tiêu chuẩn là **10** ($2^{10} = 1024$ vòng lặp băm).

**Giải phẫu cấu trúc chuỗi hash Bcrypt (Ví dụ: `$2b$10$tZ92E7c1o3K6eEwW2qR5uuY0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi`):**
- `$2b$`: Định danh thuật toán Bcrypt phiên bản mới nhất.
- `10$`: Hệ số chi phí (Work factor / Cost factor = 10), đảm bảo an toàn trước tấn công dò quét brute-force nhưng vẫn giữ thời gian xử lý đăng nhập $< 100\text{ ms}$.
- `tZ92E7c1o3K6eEwW2qR5uu`: 22 ký tự Salt ngẫu nhiên được sinh tự động (16 bytes mã hóa Base64).
- `Y0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi`: 31 ký tự hàm băm kết quả (Ciphertext).

### 12.2. Cơ chế băm và xác thực ở tầng ứng dụng (Application Layer)
- **Khi tạo / đổi mật khẩu:**
  $$\text{password\_hash} = \text{bcrypt.hash}(\text{plain\_password}, \text{salt\_rounds} = 10)$$
- **Khi người dùng đăng nhập:**
  $$\text{is\_valid} = \text{bcrypt.compare}(\text{input\_plain\_password}, \text{account.password\_hash})$$
- Tuyệt đối không dùng các thuật toán băm một chiều cũ không có salt như MD5, SHA-1 hay SHA-256 thuần túy cho mật khẩu.

### 12.3. Bảng tra cứu tài khoản & mật khẩu mẫu (Seed Data)

Dưới đây là danh sách tài khoản thử nghiệm đã được nạp sẵn trong file `database/seed_data.sql`:

| User ID | Họ và tên | Số điện thoại (Tên đăng nhập) | Vai trò | Trạng thái tài khoản | Mật khẩu kiểm thử (Plaintext) |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **1** | Nguyễn Quản Trị | `0900000001` | `ADMIN` | `ACTIVE` | `Admin@2026` |
| **2** | Trần Quản Lý | `0900000002` | `CLINIC_MANAGER` | `ACTIVE` | `Manager@2026` |
| **3** | Lê Phước Thịnh | `0900000003` | `RECEPTIONIST` | `ACTIVE` | `Letan@2026` |
| **4** | BS. CK1 Trần Văn Tuấn | `0911000001` | `DOCTOR` | `ACTIVE` | `DocTuan#1` |
| **5** | ThS. BS Nguyễn Thị Lan | `0911000002` | `DOCTOR` | `ACTIVE` | `DocLan#2` |
| **6** | BS. CKI Lê Quang Hưng | `0911000003` | `DOCTOR` | `ACTIVE` | `DocHung#3` |
| **7** | ThS. BS Phạm Thanh Mai | `0911000004` | `DOCTOR` | `ACTIVE` | `DocMai#4` |
| **8** | BS. CKII Vũ Hoàng Nam | `0911000005` | `DOCTOR` | `ACTIVE` | `DocNam#5` |
| **9** | Lê Hoài An | `0922000001` | `PATIENT` | `ACTIVE` | `HoaiAn@123` |
| **10** | Phạm Quốc Bình | `0922000002` | `PATIENT` | `ACTIVE` | `QuocBinh@456` |
| **11** | Đỗ Minh Trí | `0922000003` | `PATIENT` | `PENDING_ACTIVATION` | *(Chưa có mật khẩu web - NULL)* |
| **12** | Vũ Minh Khang | `0922000004` | `PATIENT` | `DISABLED` | `KhoaAcc#789` |

