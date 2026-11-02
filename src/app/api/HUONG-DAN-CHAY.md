# Hướng dẫn chạy API (Đăng nhập + Quản lý tài khoản)

## 1. Yêu cầu
- Node.js ≥ 20
- Project Supabase đã chạy `database/schema.sql`, `database/seed_data.sql`, `database/migrations/001_link_supabase_auth.sql`
- Supabase Dashboard → Authentication → Providers → bật **Phone**

## 2. Cấu hình môi trường
Tạo file `.env.local` ở thư mục gốc (không commit lên GitHub):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
# Chỉ dùng ở server, KHÔNG để lộ ra client
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

Lấy giá trị tại Supabase Dashboard → Project Settings → API.

## 3. Cài đặt & khởi tạo
```powershell
npm install
npm run seed:auth     # tạo user Supabase Auth cho tài khoản seed, mật khẩu: Password@123
```
> Muốn seed lại từ đầu: xoá các user trong Authentication → Users trước.

## 4. Chạy server
```powershell
npm run dev           # mặc định http://localhost:3000
```
Chỉ chạy **một** server. Nếu gặp lỗi 500 dạng `Cannot find module vendor-chunks/...`: dừng hết server, xoá thư mục `.next`, chạy lại.

## 5. Kiểm tra kiểu
```powershell
npm run typecheck
```

## 6. Tài khoản seed (mật khẩu `Password@123`)
Xem số điện thoại theo vai trò trong `database/seed_data.sql` (ADMIN, CLINIC_MANAGER, RECEPTIONIST, DOCTOR, PATIENT).

## 7. Danh sách endpoint

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/auth/login` | Công khai |
| POST | `/api/auth/logout` | Đã đăng nhập |
| POST | `/api/auth/register` | Công khai (bệnh nhân tự đăng ký) |
| POST | `/api/auth/activate` | Công khai (kích hoạt tài khoản PENDING_ACTIVATION) |
| GET/PATCH | `/api/auth/me` | Đã đăng nhập |
| POST | `/api/auth/change-password` | Đã đăng nhập |
| GET/POST | `/api/accounts` | ADMIN, CLINIC_MANAGER (xem), RECEPTIONIST |
| GET/PATCH | `/api/accounts/[id]` | Theo ma trận quyền |
| PATCH | `/api/accounts/[id]/status` | ADMIN |
| POST | `/api/accounts/[id]/reset-password` | ADMIN |

Thiết kế, ma trận quyền, truy xuất yêu cầu: `README.md`.
Lỗi trả về dạng thống nhất: `{ "error": { "code", "message", "details?" } }`.
Ma trận quyền chi tiết: `src/server/permissions.ts`.
