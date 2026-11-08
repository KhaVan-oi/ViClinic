# 3.2. Yêu cầu phi chức năng

### 3.2.1. Yêu cầu về hiệu năng (Performance)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-001 | Thời gian phản hồi báo cáo | Báo cáo FR-M04-001 phải hiển thị kết quả trong dưới 2 giây. |

### 3.2.2. Yêu cầu về bảo mật (Security)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-002 | Kiểm soát truy cập theo vai trò | Mọi yêu cầu ngoài phạm vi các vai trò được gán theo FR-M01-004 phải bị từ chối và không được làm lộ hoặc thay đổi dữ liệu trái quyền. |
| NFR-003 | Giới hạn dữ liệu bệnh nhân | Bác sĩ chỉ truy cập thông tin cần thiết của bệnh nhân có lịch được phân công cho chính bác sĩ đó; dữ liệu bệnh nhân ngoài phạm vi này phải bị từ chối. |
| NFR-004 | Bảo vệ thông tin đăng nhập | Mật khẩu không được lưu hoặc trả về ở dạng văn bản rõ. |
| NFR-005 | Xác minh số điện thoại | OTP dùng để kích hoạt tài khoản, khôi phục mật khẩu hoặc kích hoạt lại tài khoản phải có thời hạn cấu hình được, chỉ dùng một lần, chỉ hợp lệ cho đúng mục đích đã cấp và có giới hạn số lần xác minh sai. OTP sai, hết hạn, đã sử dụng, sai mục đích hoặc vượt giới hạn thử không được phép hoàn tất thao tác tương ứng. |

### 3.2.3. Yêu cầu về độ tin cậy (Reliability)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-006 | Không lưu lịch chồng lấn | Sau thao tác tạo, xác nhận hoặc đổi lịch, không tồn tại hai lịch `PENDING`/`CONFIRMED` bị overlap cho cùng bệnh nhân. Với bác sĩ, `PENDING` đã gán bác sĩ và `CONFIRMED` là các lịch giữ slot và không được overlap. Với hai yêu cầu xung đột đồng thời, tối đa một yêu cầu được ghi thành công. |
| NFR-007 | Đủ dấu vết thay đổi | 100% thay đổi trạng thái, dịch vụ, bác sĩ hoặc thời gian thành công phải có người thực hiện và thời điểm; thao tác bị từ chối không tạo lịch sử. |
| NFR-008 | Thông báo lịch hẹn không phụ thuộc kênh ngoài | Các sự kiện xác nhận, đổi và hủy lịch phải có thông báo trong ứng dụng; email/SMS thông báo lịch hẹn không phải điều kiện để hoàn tất workflow. |

### 3.2.4. Yêu cầu về khả dụng (Usability)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-009 | Thời gian thao tác của lễ tân | Khi đã có đủ thông tin và phương án hợp lệ, lễ tân hoàn tất tạo hoặc đổi lịch trong không quá 60 giây tương tác trên hệ thống. |
| NFR-010 | Hoàn tất workflow | Các luồng đăng nhập, đăng ký/kích hoạt, khôi phục mật khẩu, kích hoạt lại tài khoản, đặt, xác nhận, đổi, hủy và hoàn thành lịch phải thực hiện được từ đầu đến cuối mà không tạo hồ sơ trùng, mất dữ liệu hoặc vi phạm phân quyền/ràng buộc lịch. |
| NFR-011 | Một ứng dụng web | Năm vai trò thực hiện các chức năng của mình trên cùng một ứng dụng web; MVP không yêu cầu ứng dụng mobile native riêng. |
