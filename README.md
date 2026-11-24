# Cài đặt môi trường

## Node.js 24

### Windows

```cmd
winget install --id OpenJS.NodeJS.LTS -e --version 24.22.1 --interactive
```

`winget` yêu cầu **App Installer** (Microsoft Store). Mở CMD mới sau khi cài Node.js.

### macOS

Homebrew:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Thiết lập PATH theo mục **Next steps** của Homebrew.

```sh
brew install node@24
printf '\nexport PATH="%s/opt/node@24/bin:$PATH"\n' "$(brew --prefix)" >> ~/.zprofile
source ~/.zprofile
```

### Linux (Ubuntu/Debian)

```sh
sudo apt update
sudo apt install -y curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

Kiểm tra:

```sh
node --version
npm --version
```

## pnpm

### Windows

```cmd
npm install --global pnpm@12.16.1
pnpm --version
```

### Linux/macOS

```sh
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
npm install --global pnpm@12.16.1
pnpm --version
```

PATH cho zsh (macOS):

```sh
printf '\nexport PATH="$HOME/.npm-global/bin:$PATH"\n' >> ~/.zprofile
```

PATH cho bash (Linux):

```sh
printf '\nexport PATH="$HOME/.npm-global/bin:$PATH"\n' >> ~/.bashrc
```

## PostgreSQL 18

### Windows

```cmd
winget install --id PostgreSQL.PostgreSQL.18 -e --interactive
```

Thành phần: **PostgreSQL Server**, **Command Line Tools**; **pgAdmin 4** tùy chọn. Bỏ chọn **Stack Builder**. Giữ cổng `5432`, đặt mật khẩu cho role `postgres`, giữ Locale `DEFAULT`.

Các lệnh Windows bên dưới dùng thư mục cài mặc định `C:\Program Files\PostgreSQL\18`. Nếu cài tại `F:\PostgreSQL\18`, thay đường dẫn tương ứng.

### macOS

```sh
brew install postgresql@18
printf '\nexport PATH="%s/opt/postgresql@18/bin:$PATH"\n' "$(brew --prefix)" >> ~/.zprofile
source ~/.zprofile
brew services start postgresql@18
pg_isready -h localhost -p 5432
```

### Linux (Ubuntu/Debian)

```sh
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-18
sudo systemctl enable --now postgresql
pg_isready -h localhost -p 5432
```

# Cài đặt ViClinic

Thư mục làm việc: `ViClinic/` (chứa `package.json`).

## 1. Tạo database

### Windows

Khởi động dịch vụ nếu chưa chạy. CMD (Administrator):

```cmd
net start postgresql-x64-18
```

CMD:

```cmd
"C:\Program Files\PostgreSQL\18\bin\pg_isready.exe" -h localhost -p 5432
```

`pg_isready` trả về `accepting connections` khi server sẵn sàng. Tên dịch vụ: `services.msc` → PostgreSQL → **Properties** → **Service name**.

Kết nối bằng role `postgres`; nhập mật khẩu đã đặt khi cài:

```cmd
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5432 -U postgres -d postgres
```

### macOS

```sh
psql -d postgres
```

### Linux (Ubuntu/Debian)

```sh
sudo -u postgres psql
```

### Tạo tài khoản và database

Lệnh SQL trong `psql`:

```sql
CREATE ROLE viclinic LOGIN PASSWORD 'ViClinicLocal2026';
CREATE DATABASE viclinic OWNER viclinic;
\connect viclinic
CREATE EXTENSION IF NOT EXISTS btree_gist;
\quit
```

## 2. Cài package

```sh
pnpm install --frozen-lockfile
```

Dependency bao gồm SMS mock. Cấu hình API: [sms-mock/README.md](sms-mock/README.md).

## 3. Cấu hình

Tạo `.env` nếu chưa tồn tại.

### Windows

```cmd
copy .env.example .env
```

### Linux/macOS

```sh
cp .env.example .env
```

### Cấu hình kết nối và OTP

Sinh khóa HMAC cho OTP và token xác minh:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Gán kết quả vào `OTP_HMAC_SECRET` trong `.env`:

```dotenv
DATABASE_URL="postgresql://viclinic:ViClinicLocal2026@localhost:5432/viclinic?schema=public"
OTP_HMAC_SECRET="CHUOI_VUA_TAO"
SESSION_COOKIE_NAME="viclinic_session"
SMS_API_BASE_URL="http://localhost:4001"
```

`DATABASE_URL` phải khớp role, mật khẩu, cổng và database đã tạo. Giữ nguyên `OTP_HMAC_SECRET` giữa các lần chạy. `.env` không được commit.

## 4. Khởi tạo bảng và dữ liệu

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

- `db:generate`: sinh Prisma Client từ `prisma/schema.prisma`.
- `db:migrate`: tạo bảng và áp dụng ràng buộc trong `prisma/migrations`.
- `db:seed`: xóa dữ liệu hiện có, tạo tài khoản, dịch vụ, ca trực và lịch hẹn theo ngày chạy.

**`db:seed` xóa dữ liệu tại `DATABASE_URL`.** Seed không chạy khi khởi động ứng dụng.

### Xóa dữ liệu và tạo lại

Dừng website và kiểm tra `DATABASE_URL` trước khi xóa dữ liệu.

Giữ schema, nạp lại dữ liệu:

```sh
pnpm db:seed
```

Tạo lại schema và dữ liệu:

```sh
pnpm exec prisma migrate reset
pnpm db:seed
```

**`migrate reset` xóa schema và áp dụng lại migration.** Xác nhận tại terminal.

## 5. Chạy hệ thống

Hai terminal tại `ViClinic/`.

Cửa sổ 1 — SMS:

```sh
pnpm sms
```

Cửa sổ 2 — website:

```sh
pnpm build
pnpm start
```

- Website: http://localhost:3000
- Hộp thư OTP: http://localhost:4000

OTP hiển thị trong hộp thư theo số điện thoại, không gửi đến mạng di động. Dùng mã mới nhất.

## 6. Dừng toàn bộ hệ thống

1. Website: `Ctrl+C`.
2. SMS: `Ctrl+C`.
3. Dừng dịch vụ PostgreSQL theo hệ điều hành.

CMD: nhập `Y` tại `Terminate batch job (Y/N)?`.

### Windows

CMD (Administrator):

```cmd
net stop postgresql-x64-18
sc query postgresql-x64-18
```

Trạng thái sau khi dừng: `STOPPED`.

### macOS

```sh
brew services stop postgresql@18
brew services list
```

### Linux (Ubuntu/Debian)

```sh
sudo systemctl stop postgresql
sudo systemctl status postgresql --no-pager
```

### Kiểm tra website và SMS đã dừng

```sh
curl --connect-timeout 3 http://localhost:3000
curl --connect-timeout 3 http://localhost:4000
curl --connect-timeout 3 http://localhost:4001/health
```

Sau khi dừng, cả ba cổng trả lỗi kết nối. Dừng dịch vụ không xóa dữ liệu PostgreSQL hoặc `.env`.

## 7. Chạy lại

### Windows

CMD (Administrator):

```cmd
net start postgresql-x64-18
```

### macOS

```sh
brew services start postgresql@18
```

### Linux (Ubuntu/Debian)

```sh
sudo systemctl start postgresql
```

### Website và SMS

Hai terminal tại `ViClinic/`:

Cửa sổ 1:

```sh
pnpm sms
```

Cửa sổ 2:

```sh
pnpm start
```

Sau khi cập nhật mã nguồn: cài dependency theo lockfile rồi chạy `pnpm build`. Không chạy seed khi cần giữ dữ liệu.

# Xử lý lỗi cài đặt

| Lỗi | Cách xử lý |
| --- | --- |
| Không tìm thấy `node` hoặc `pnpm` | Mở cửa sổ lệnh mới; kiểm tra PATH theo phần cài công cụ. |
| PostgreSQL không kết nối được | Khởi động dịch vụ, kiểm tra cổng `5432` và `DATABASE_URL`. |
| `password authentication failed` | Kiểm tra role và mật khẩu trong `DATABASE_URL`. Mật khẩu role `viclinic` khác mật khẩu `postgres` đặt trong bộ cài. |
| Role/database đã tồn tại | Bỏ qua lệnh `CREATE` tương ứng và kiểm tra kết nối trước khi migrate. |
| `Invalid environment configuration` | Kiểm tra `.env`; khóa `OTP_HMAC_SECRET` phải có ít nhất 32 ký tự. |
| Thiếu Prisma Client hoặc bảng dữ liệu | Chạy `pnpm db:generate` rồi `pnpm db:migrate`. |
| Không tìm thấy bản build | Chạy `pnpm build` trước `pnpm start`. |
| `EADDRINUSE` tại `3000`, `4000`, `4001` | Dừng phiên website/SMS cũ trong cửa sổ đang chạy, rồi khởi động lại. |
| Không nhận được OTP | Kiểm tra cửa sổ SMS, `SMS_API_BASE_URL`, endpoint `http://localhost:4001/health` và số điện thoại trong hộp thư. |

# Kiểm tra

## Unit test

Chạy tại `ViClinic/` sau khi cài dependency. Unit test không sử dụng PostgreSQL, SMS hoặc trình duyệt.

Toàn bộ test:

```sh
pnpm test
```

Theo module:

```sh
pnpm exec tsx --test tests/appointments.test.ts
pnpm exec tsx --test tests/identity.test.ts
pnpm exec tsx --test tests/patients.test.ts
pnpm exec tsx --test tests/scheduling.test.ts
pnpm exec tsx --test tests/notifications.test.ts
pnpm exec tsx --test tests/reports.test.ts
pnpm test:pdf
```

| File | Phạm vi |
| --- | --- |
| `appointments.test.ts` | Vòng đời lịch hẹn, quyền hoàn tất, thời hạn hủy, xác nhận cảnh báo |
| `identity.test.ts` | Mật khẩu, tổ hợp vai trò, ràng buộc bác sĩ, chuyển trang sau đăng nhập |
| `patients.test.ts` | Ngày sinh, email, dữ liệu hồ sơ |
| `scheduling.test.ts` | Khung giờ, lịch bận, trùng lịch, thời hạn đặt lịch, dịch vụ |
| `notifications.test.ts` | Người nhận khi xác nhận, đổi dịch vụ, đổi bác sĩ, đổi giờ và hủy |
| `reports.test.ts` | Khoảng ngày, ngày hợp lệ, cách nhóm báo cáo |
| `pdf/export.test.ts` | Ô gộp, dữ liệu chuỗi/số, phân trang và response tải PDF |

Runner: `node:test`; assertion: `node:assert/strict`. Mỗi test so sánh kết quả hoặc lỗi của hàm trong `src/` với giá trị mong đợi.

`ok`: đạt; `not ok`: thất bại. Mã thoát `0` và `fail 0` xác nhận lượt chạy thành công. Khi thất bại, output ghi tên test, vị trí và sai lệch assertion.

Phạm vi: quy tắc nghiệp vụ và validation. Bộ test này không bao gồm kiểm thử tích hợp database, giao diện hoặc concurrency.

Test PDF dùng font và logo trong `public/`, tạo dữ liệu trong bộ nhớ, không ghi file. Các thao tác cần kiểm tra trên trình duyệt sau khi build:

- Mở danh sách, chi tiết, đặt lịch và thông báo bệnh nhân khi đã đăng xuất: chuyển về đăng nhập.
- Đổi bác sĩ, ngày hoặc dịch vụ tại quầy: giờ và nút đặt lịch cũ bị khóa trong lúc tải.
- Sửa biểu mẫu rồi bấm logo: hủy xác nhận để ở lại, đồng ý để về trang chủ.
- Xuất phiếu hẹn và báo cáo nhiều trang: kiểm tra dấu tiếng Việt, logo, lề và ngắt trang.

## Kiểm tra mã nguồn

```sh
pnpm lint
pnpm typecheck
pnpm build
```

`lint`: quy tắc mã nguồn; `typecheck`: kiểu TypeScript; `build`: biên dịch ứng dụng, yêu cầu cấu hình `.env` và Prisma Client.

# Tài khoản

Mật khẩu sau khi seed: **`Demo@12345`**. Tài khoản nhiều vai trò: chọn **Làm việc** để truy cập khu vực nhân sự.

| Vai trò | Số điện thoại |
| --- | --- |
| Người khám bệnh, có nhiều lịch hẹn | `0908000593` |
| Bác sĩ | `0917000001` |
| Lễ tân | `0917100001` |
| Quản lý | `0917200001` |
| Quản trị viên | `0917300001` |
