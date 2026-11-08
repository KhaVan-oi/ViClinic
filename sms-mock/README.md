# SMS mock

Package: `@relay-works/sms-dev@2.1.0`, khai báo trong `devDependencies`. Lệnh cài dependency tại [README chính](../README.md) bao gồm package này.

## Cài riêng package SMS

Thư mục: `ViClinic/`.

```sh
pnpm add -D @relay-works/sms-dev@2.1.0
```

## Khởi động

```sh
pnpm sms
```

Hộp thư: http://localhost:4000. Dừng bằng `Ctrl+C`.

## Kết nối từ ViClinic

Biến môi trường trong `.env`:

```dotenv
SMS_API_BASE_URL="http://localhost:4001"
```

Endpoint gửi tin nhắn:

```http
POST http://localhost:4001/v1/messages
Content-Type: application/json

{
  "to": "+84912345678",
  "body": "[ViClinic] Ma xac thuc cua ban la 123456. Hieu luc trong 5 phut."
}
```

## File @relay-works__sms-dev@2.1.0.patch

Bản vá dùng `dirname()` thay thao tác cắt đường dẫn theo dấu `/` để xác định thư mục giao diện trên Windows. API và nội dung tin nhắn giữ nguyên.

pnpm áp dụng bản vá qua `patchedDependencies` trong [pnpm-workspace.yaml](../pnpm-workspace.yaml).
