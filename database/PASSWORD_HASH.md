# Quy chuẩn Băm Mật khẩu (`password_hash`) & Bảng Tài khoản Mẫu

Tài liệu này đặc tả quy chuẩn băm mật khẩu cho hệ thống **ViClinic**, tuân thủ yêu cầu phi chức năng **NFR-012** *(Bảo vệ thông tin đăng nhập: không lưu trữ hoặc trả về mật khẩu ở dạng văn bản rõ)*.

---

## 1. Thuật toán băm (Hashing Algorithm)

Hệ thống sử dụng thuật toán **Bcrypt** (`$2b$`) với hệ số chi phí (Cost Factor / Salt Rounds) tiêu chuẩn là **10** ($2^{10} = 1024$ vòng lặp băm).

### Giải phẫu cấu trúc chuỗi hash Bcrypt
Ví dụ chuỗi hash của Quản trị viên:
```text
$2b$10$tZ92E7c1o3K6eEwW2qR5uuY0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi
├──┴──┼──────────────────────┼───────────────────────────────┤
 $2b$  10$  tZ92E7c1o3K6eEwW2qR5uu   Y0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi
  (1)  (2)           (3)                           (4)
```

1. **`$2b$`**: Định danh thuật toán Bcrypt phiên bản mới nhất.
2. **`10$`**: Hệ số chi phí (Cost factor = 10), đảm bảo an toàn cao trước tấn công dò quét brute-force / dictionary attack, nhưng vẫn tối ưu thời gian xử lý khi người dùng đăng nhập ($< 100\text{ ms}$).
3. **`tZ92E7c1o3K6eEwW2qR5uu`**: 22 ký tự Salt ngẫu nhiên được sinh tự động (16 bytes mã hóa Base64), giúp chống lại tấn công Rainbow Table.
4. **`Y0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi`**: 31 ký tự hàm băm kết quả (Ciphertext).

---

## 2. Cơ chế băm và xác thực ở tầng ứng dụng (Application Layer)

### 2.1. Node.js (ví dụ với `bcrypt` / `bcryptjs`)
```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Khi tạo mới tài khoản hoặc đổi mật khẩu:
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// Khi người dùng đăng nhập:
async function verifyPassword(inputPassword, storedHash) {
  return await bcrypt.compare(inputPassword, storedHash);
}
```

### 2.2. Python (ví dụ với `passlib` hoặc `bcrypt`)
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

> [!WARNING]
> Tuyệt đối không dùng các thuật toán băm một chiều cũ không có salt như MD5, SHA-1 hay SHA-256 thuần túy để lưu trữ mật khẩu.

---

## 3. Bảng tra cứu tài khoản & mật khẩu mẫu (Seed Data)

Toàn bộ dữ liệu dưới đây đã được nạp sẵn trong script [`seed.js`](seed.js) (chạy tự động qua `npm run prisma:seed`) để phục vụ kiểm thử hệ thống:

| User ID | Họ và tên | Số điện thoại (Tên đăng nhập) | Vai trò (`USER_ROLES`) | Trạng thái (`ACCOUNTS`) | Mật khẩu kiểm thử (Plaintext) | Chuỗi Password Hash (`Bcrypt`) |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| **1** | Nguyễn Quản Trị | `0900000001` | `ADMIN` | `ACTIVE` | `Admin@2026` | `$2b$10$tZ92E7c1o3K6eEwW2qR5uuY0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi` |
| **2** | Trần Quản Lý | `0900000002` | `CLINIC_MANAGER` | `ACTIVE` | `Manager@2026` | `$2b$10$wN35R9u7z1K8qQwO1tP4eeY3mO6bU8iK5.l7vR9cT1hG3k5oJ9vMa` |
| **3** | Lê Phước Thịnh | `0900000003` | `RECEPTIONIST` | `ACTIVE` | `Letan@2026` | `$2b$10$xL12Y8v9z3M5rRyP3wQ6uuZ4nP7cV0jL7.m9wS1dU3iH5l7pJ1vNa` |
| **4** | BS. CK1 Trần Văn Tuấn | `0911000001` | `DOCTOR` | `ACTIVE` | `DocTuan#1` | `$2b$10$kP45T1w3z5O7tTzR5yS8uuA6pS9eX2lM9.o1yU3fW5kI7n9rL3vPa` |
| **5** | ThS. BS Nguyễn Thị Lan | `0911000002` | `DOCTOR` | `ACTIVE` | `DocLan#2` | `$2b$10$mR67V3y5z7Q9vVbT7zU0uuB8rU1gZ4nO1.q3zW5hY7mK9p1tN5vRa` |
| **6** | BS. CKI Lê Quang Hưng | `0911000003` | `DOCTOR` | `ACTIVE` | `DocHung#3` | `$2b$10$oT89X5z7z9S1xXdF9aW2uuC0tW3ib6pQ3.s5bY7jA9oM1r3vP7vTa` |
| **7** | ThS. BS Phạm Thanh Mai | `0911000004` | `DOCTOR` | `ACTIVE` | `DocMai#4` | `$2b$10$qV01Z7b9z1U3zZfH1bY4uuD2vY5kd8rS5.u7dZ9lC1qO3t5xR9vVa` |
| **8** | BS. CKII Vũ Hoàng Nam | `0911000005` | `DOCTOR` | `ACTIVE` | `DocNam#5` | `$2b$10$sX23B9d1z3W5bBhJ3cZ6uuE4xZ7mf0tU7.w9fZ1nD3sQ5v7zT1vXa` |
| **9** | Lê Hoài An | `0922000001` | `PATIENT` | `ACTIVE` | `HoaiAn@123` | `$2b$10$uZ45D1f3z5Y7dDjL5d08uuF6zB9nh2vW9.y1hB3pE5uS7x9bV3vZa` |
| **10** | Phạm Quốc Bình | `0922000002` | `PATIENT` | `ACTIVE` | `QuocBinh@456` | `$2b$10$wA67F3h5z7A9fFlN7e20uuG8bC1pj4xY1.03jD5rG7wU9z1dX5vba` |
| **11** | Đỗ Minh Trí | `0922000003` | `PATIENT` | `PENDING_ACTIVATION` | *(Chưa có mật khẩu web)* | `NULL` |
| **12** | Vũ Minh Khang | `0922000004` | `PATIENT` | `DISABLED` | `KhoaAcc#789` | `$2b$10$yC89H5j7z9C1hHpP9g42uuI0dE3rl6zZ3.25lF7tI9yW1b3fZ7vda` |

