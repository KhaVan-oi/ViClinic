# ViClinic

Next.js · React · TypeScript

## Môi trường

- Node.js 24
- pnpm 12.16.1

## Cài đặt

```sh
pnpm install --frozen-lockfile
```

## Database local

PostgreSQL 18, cổng 5432. Thay đường dẫn bin theo thư mục cài đặt.

```powershell
& "F:\PostgreSQL\18\bin\psql.exe" -h localhost -U postgres -d postgres
```

Chạy từng dòng trong psql:

```sql
CREATE ROLE viclinic LOGIN PASSWORD 'ViClinicLocal2026';
CREATE DATABASE viclinic OWNER viclinic;
\connect viclinic
CREATE EXTENSION IF NOT EXISTS btree_gist;
\quit
```

Tạo .env từ .env.example, cập nhật DATABASE_URL. Sinh OTP_HMAC_SECRET:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

db:seed xóa dữ liệu hiện có và nạp dữ liệu demo. Không chạy lại trên database cần giữ dữ liệu.

## Chạy ứng dụng

```sh
pnpm build
pnpm start
```

URL: http://localhost:3000. Dừng bằng Ctrl+C.

## Kiểm tra

```sh
pnpm typecheck
pnpm lint
```

## Phạm vi hiện tại

- Khởi tạo ứng dụng và toàn bộ tài liệu final
- Database, migration init và seed

doc/ chứa thiết kế final của toàn hệ thống; phạm vi code hiện tại là các phần liệt kê ở trên. Các module còn lại được bổ sung qua PR tiếp theo.

## Dừng PostgreSQL trên Windows

CMD Administrator:

```cmd
net stop postgresql-x64-18
```

Bật lại bằng net start postgresql-x64-18. Dừng dịch vụ không xóa database.
