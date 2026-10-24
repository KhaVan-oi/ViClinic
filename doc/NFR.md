# 3.2. Yêu cầu phi chức năng

### 3.2.1. Yêu cầu về hiệu năng (Performance)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-001 | Thời gian báo cáo lịch hẹn | Dưới 2 giây, tính từ lúc gửi yêu cầu đến khi hiển thị đủ số lịch, số lịch hoàn thành và số lịch hủy. Đo trên bộ dữ liệu demo 1.000 lịch hẹn của 5 bác sĩ trong môi trường chạy local. Áp dụng FR-M04-001. |

### 3.2.2. Yêu cầu về bảo mật (Security)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-002 | Từ chối truy cập trái quyền | Trong bộ thử, mọi yêu cầu xem hoặc sửa ngoài phạm vi FR-M01-004 đều bị từ chối. Không có dữ liệu được trả về và không có bản ghi bị thay đổi. Bộ thử gồm năm vai trò và các chức năng bị cấm của từng vai trò. |
| NFR-003 | Giới hạn thông tin bệnh nhân | Bác sĩ chỉ nhận thông tin cần thiết của bệnh nhân có lịch với mình. Tài khoản bác sĩ mở một bệnh nhân không có lịch với bác sĩ đó thì không thấy hồ sơ. Áp dụng FR-M01-004. |
| NFR-012 | Bảo vệ thông tin đăng nhập | Mật khẩu người dùng không được lưu trực tiếp ở dạng văn bản rõ trong dữ liệu của hệ thống. Khi kiểm tra dữ liệu lưu trữ local, không thể đọc lại trực tiếp mật khẩu ban đầu. |

### 3.2.3. Yêu cầu về độ tin cậy (Reliability)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-004 | Không lưu lịch chồng lấn | Bộ thử tạo, xác nhận và đổi lịch, gồm trùng một phần, trùng toàn bộ và hai yêu cầu đồng thời vào cùng slot của một bác sĩ hoặc cùng thời gian của một bệnh nhân. Chỉ lịch hợp lệ được lưu. Dữ liệu đã lưu không có hai lịch Pending hoặc Confirmed của cùng bác sĩ hoặc cùng bệnh nhân bị trùng giờ. Áp dụng FR-M02-004, FR-M02-007 và FR-M02-011. |
| NFR-005 | Đủ dấu vết thay đổi | 100% thay đổi trạng thái, bác sĩ hoặc giờ khám thành công trong bộ thử có người thực hiện và thời điểm. Thao tác bị từ chối không thêm bản ghi lịch sử. Áp dụng FR-M02-012. |
| NFR-006 | Luồng cốt lõi không phụ thuộc kênh ngoài | Đặt, xác nhận, đổi, hủy và xem báo cáo hoàn tất khi không gửi email hoặc SMS. Thông báo kiểm bằng thông báo trong ứng dụng theo FR-M03-003. |

### 3.2.4. Yêu cầu về khả dụng (Usability)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-007 | Thời gian thao tác của lễ tân | Tạo hoặc dời một lịch xong trong không quá 60 giây tương tác trên hệ thống, tính từ khi lễ tân đã có đủ thông tin và phương án. Không tính thời gian gọi điện hoặc chờ bệnh nhân. Áp dụng FR-M02-003, FR-M02-006 và FR-M02-011. |
| NFR-008 | Hoàn tất workflow | Một kịch bản đặt, xác nhận, đổi hoặc hủy, rồi xem lịch và báo cáo chạy hết. Không mất dữ liệu lịch, không lưu lịch chồng lấn, không truy cập trái quyền và không dừng giữa luồng. Áp dụng FR-M02-003 đến FR-M02-013 và FR-M04-001. |
| NFR-009 | Một ứng dụng web | Năm vai trò thực hiện được yêu cầu chức năng của mình trên cùng một ứng dụng web chạy local, sử dụng dữ liệu lưu trữ local phục vụ demo. Không cần ứng dụng mobile riêng để hoàn tất các FR trong `FR.md`. |

### 3.2.5. Yêu cầu về khả năng mở rộng (Scalability)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-010 | Quy mô kiểm chứng MVP | NFR-001 được kiểm trên đúng 1.000 lịch hẹn và 5 bác sĩ. Bộ này là cấu hình kiểm thử cho phạm vi bài tập, không phải cam kết cho quy mô triển khai thực tế lớn hơn. |

### 3.2.6. Yêu cầu về bảo trì (Maintainability)

| Mã | Nội dung yêu cầu | Chỉ tiêu cụ thể |
| --- | --- | --- |
| NFR-011 | Theo dõi lỗi đến khi xử lý | Mỗi lỗi phát hiện khi kiểm tra các FR được ghi mã, mô tả và kết quả xử lý. Lỗi chỉ đóng khi có kết quả xử lý kiểm lại được. |
