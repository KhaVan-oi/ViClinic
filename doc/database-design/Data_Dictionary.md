# Data Dictionary

### 1. Quy ước dữ liệu

| Nội dung | Quy ước |
| --- | --- |
| Khóa chính | `INTEGER` |
| Ngày sinh | `DATE` |
| Thời điểm | `DATETIME` |
| Trạng thái lịch hẹn | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` |
| Vai trò người dùng | `PATIENT`, `RECEPTIONIST`, `DOCTOR`, `CLINIC_MANAGER`, `ADMIN` |

### 2. Bảng `users`

Lưu tài khoản và thông tin cơ bản của người dùng.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `user_id` | INTEGER | PK | Không | Mã người dùng |
| `login_identifier` | VARCHAR(100) | UNIQUE | Không | Định danh dùng để đăng nhập |
| `password_hash` | VARCHAR(255) |  | Không | Mật khẩu đã được băm |
| `full_name` | VARCHAR(120) |  | Không | Họ tên người dùng |
| `birth_date` | DATE | Bắt buộc với Patient | Có | Ngày sinh bệnh nhân |
| `phone` | VARCHAR(20) | UNIQUE với Patient | Có | Số điện thoại liên hệ; bắt buộc với Patient |
| `email` | VARCHAR(120) |  | Có | Email liên hệ |
| `role` | VARCHAR(30) |  | Không | Vai trò người dùng |

### 3. Bảng `services`

Lưu danh mục dịch vụ khám.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `service_id` | INTEGER | PK | Không | Mã dịch vụ |
| `name` | VARCHAR(120) |  | Không | Tên dịch vụ |
| `duration_minutes` | INTEGER | `> 0` | Không | Thời lượng khám tính bằng phút |

### 4. Bảng `doctor_services`

Lưu các dịch vụ mà bác sĩ có thể thực hiện.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `doctor_id` | INTEGER | PK, FK → `users.user_id` | Không | Bác sĩ |
| `service_id` | INTEGER | PK, FK → `services.service_id` | Không | Dịch vụ bác sĩ có thể thực hiện |

Khóa chính của bảng là cặp (`doctor_id`, `service_id`).

### 5. Bảng `doctor_shifts`

Lưu ca làm việc của bác sĩ.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `shift_id` | INTEGER | PK | Không | Mã ca làm việc |
| `doctor_id` | INTEGER | FK → `users.user_id` | Không | Bác sĩ của ca |
| `start_at` | DATETIME |  | Không | Thời điểm bắt đầu ca |
| `end_at` | DATETIME | `end_at > start_at` | Không | Thời điểm kết thúc ca |

### 6. Bảng `doctor_unavailability`

Lưu khoảng thời gian bác sĩ không sẵn sàng khám.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `unavailability_id` | INTEGER | PK | Không | Mã khoảng không sẵn sàng |
| `doctor_id` | INTEGER | FK → `users.user_id` | Không | Bác sĩ |
| `start_at` | DATETIME |  | Không | Thời điểm bắt đầu không sẵn sàng |
| `end_at` | DATETIME | `end_at > start_at` | Không | Thời điểm kết thúc không sẵn sàng |

### 7. Bảng `appointments`

Lưu thông tin lịch hẹn.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `appointment_id` | INTEGER | PK | Không | Mã lịch hẹn |
| `patient_id` | INTEGER | FK → `users.user_id` | Không | Bệnh nhân đặt lịch |
| `service_id` | INTEGER | FK → `services.service_id` | Không | Dịch vụ khám |
| `doctor_id` | INTEGER | FK → `users.user_id` | Có | Bác sĩ được chọn hoặc được gán; có thể rỗng khi lịch đang Pending |
| `start_at` | DATETIME |  | Không | Thời điểm bắt đầu khám |
| `end_at` | DATETIME | `end_at > start_at` | Không | Thời điểm kết thúc khám |
| `status` | VARCHAR(20) | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` | Không | Trạng thái hiện tại của lịch hẹn |

### 8. Bảng `appointment_history`

Lưu lịch sử thay đổi trạng thái, bác sĩ hoặc thời gian của lịch hẹn.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `history_id` | INTEGER | PK | Không | Mã lịch sử |
| `appointment_id` | INTEGER | FK → `appointments.appointment_id` | Không | Lịch hẹn được thay đổi |
| `actor_user_id` | INTEGER | FK → `users.user_id` | Không | Người thực hiện thay đổi |
| `changed_at` | DATETIME |  | Không | Thời điểm thay đổi |
| `old_status` | VARCHAR(20) |  | Không | Trạng thái trước thay đổi |
| `new_status` | VARCHAR(20) |  | Không | Trạng thái sau thay đổi |
| `old_doctor_id` | INTEGER | FK → `users.user_id` | Có | Bác sĩ trước thay đổi |
| `new_doctor_id` | INTEGER | FK → `users.user_id` | Có | Bác sĩ sau thay đổi |
| `old_start_at` | DATETIME |  | Có | Thời điểm bắt đầu trước thay đổi |
| `new_start_at` | DATETIME |  | Có | Thời điểm bắt đầu sau thay đổi |
| `old_end_at` | DATETIME |  | Có | Thời điểm kết thúc trước thay đổi |
| `new_end_at` | DATETIME |  | Có | Thời điểm kết thúc sau thay đổi |

### 9. Bảng `notifications`

Lưu thông báo nội bộ liên quan đến lịch hẹn.

| Thuộc tính | Kiểu dữ liệu | Khóa / Ràng buộc | Cho phép rỗng | Mô tả |
| --- | --- | --- | --- | --- |
| `notification_id` | INTEGER | PK | Không | Mã thông báo |
| `recipient_user_id` | INTEGER | FK → `users.user_id` | Không | Người nhận thông báo |
| `appointment_id` | INTEGER | FK → `appointments.appointment_id` | Không | Lịch hẹn liên quan |
| `content` | TEXT |  | Không | Nội dung thông báo |
| `created_at` | DATETIME |  | Không | Thời điểm tạo thông báo |
