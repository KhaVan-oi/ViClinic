# 3.1. Yêu cầu chức năng

### 3.1.1. Module Xác thực và phân quyền (M01)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M01-001 | Đăng ký tài khoản bệnh nhân | Hệ thống cho phép bệnh nhân tự tạo tài khoản. Trường bắt buộc gồm họ tên, ngày sinh và số điện thoại. Email là tùy chọn. Số điện thoại phải chưa gắn với tài khoản nào. Thiếu trường bắt buộc hoặc số điện thoại đã tồn tại thì hệ thống không tạo tài khoản. Tài khoản được lưu với vai trò Bệnh nhân và dùng được để đăng nhập. | Cao |
| FR-M01-002 | Tạo tài khoản nhân viên | Hệ thống cho phép quản trị viên đã đăng nhập tạo tài khoản nhân viên và gán một vai trò: Lễ tân, Bác sĩ hoặc Quản lý phòng khám. Người không phải quản trị viên không tạo được tài khoản nhân viên. Tài khoản sau khi tạo đăng nhập được và chỉ có quyền của vai trò được gán. | Cao |
| FR-M01-003 | Đăng nhập | Hệ thống cho phép năm vai trò đăng nhập bằng tài khoản đã tạo. Đăng nhập thành công thì hệ thống áp dụng đúng vai trò đã gán. Tài khoản không tồn tại hoặc thông tin đăng nhập không đúng thì hệ thống từ chối và không mở chức năng. | Cao |
| FR-M01-004 | Giới hạn dữ liệu theo vai trò | Hệ thống chỉ trả về và chỉ cho sửa dữ liệu đúng phạm vi vai trò đang đăng nhập. Bệnh nhân chỉ thấy lịch của mình. Bác sĩ chỉ thấy thông tin cần thiết của bệnh nhân có lịch với mình. Lễ tân xem và sửa hồ sơ cơ bản cùng dữ liệu lịch hẹn. Quản lý phòng khám xem dữ liệu vận hành và báo cáo, không sửa hồ sơ bệnh nhân. Quản trị viên quản lý tài khoản và vai trò, không tạo, sửa hoặc hủy lịch hẹn. Yêu cầu ngoài phạm vi vai trò bị từ chối. | Cao |

### 3.1.2. Module Quản lý lịch hẹn và chống trùng giờ (M02)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M02-001 | Quản lý dịch vụ và năng lực bác sĩ | Hệ thống cho phép quản lý phòng khám tạo và cập nhật dịch vụ, gồm thời lượng, và gán mỗi bác sĩ với một hoặc nhiều dịch vụ. Quan hệ bác sĩ và dịch vụ là nhiều-nhiều. Người không phải quản lý không sửa được danh mục. Thời lượng dùng cho MVP: khám tổng quát 30 phút, khám chuyên khoa cơ bản 45 phút. | Cao |
| FR-M02-002 | Lọc bác sĩ theo dịch vụ | Hệ thống chỉ hiển thị bác sĩ được gán với dịch vụ mà bệnh nhân hoặc lễ tân đang chọn. Dịch vụ chưa có bác sĩ thì danh sách bác sĩ rỗng. Bác sĩ không thực hiện dịch vụ đó không xuất hiện. | Cao |
| FR-M02-003 | Đặt lịch hẹn | Hệ thống cho phép bệnh nhân hoặc lễ tân tạo lịch hẹn từ bệnh nhân, dịch vụ, thời điểm và thông tin liên hệ. Bác sĩ là tùy chọn. Thời điểm phải nằm trong tương lai và không quá 30 ngày. Hệ thống kiểm tra ca, thời lượng và trùng lịch trước khi lưu. Thiếu thông tin bắt buộc, thời điểm ở quá khứ, quá 30 ngày, hoặc khoảng khám không nằm trọn trong ca thì hệ thống không tạo lịch. | Cao |
| FR-M02-004 | Giữ slot và không tự gán bác sĩ | Hệ thống không tự chọn bác sĩ. Lịch không chọn bác sĩ được lưu ở trạng thái Pending và chưa chiếm slot của bác sĩ nào. Lịch Pending đã chọn bác sĩ thì giữ slot của bác sĩ đó. Slot đã được lịch khác giữ thì hệ thống không tạo thêm lịch với bác sĩ đó. | Cao |
| FR-M02-005 | Gán bác sĩ và xác nhận | Hệ thống cho phép lễ tân gán bác sĩ còn slot hợp lệ, đúng dịch vụ, cho lịch đang Pending, rồi chuyển lịch đó sang Confirmed. Chỉ lễ tân được thực hiện bước xác nhận này. Bác sĩ hoặc giờ không hợp lệ thì lịch không sang Confirmed. Sau khi xác nhận, slot của bác sĩ vẫn được giữ. | Cao |
| FR-M02-006 | Tạo lịch đã xác nhận | Hệ thống cho phép lễ tân tạo lịch trực tiếp ở trạng thái Confirmed khi đã có bệnh nhân, dịch vụ, bác sĩ và thời gian hợp lệ. Hệ thống kiểm tra slot rồi lưu Confirmed và giữ slot. Bác sĩ hoặc thời gian không hợp lệ thì không lưu lịch Confirmed. | Trung bình |
| FR-M02-007 | Chặn trùng lịch | Hệ thống từ chối lịch làm một bác sĩ bị trùng giờ, và từ chối hai lịch đang hiệu lực của cùng một bệnh nhân bị trùng giờ. So sánh áp dụng khi tạo, xác nhận và đổi lịch, gồm trùng một phần và trùng toàn bộ, với các lịch Pending và Confirmed. Lịch Cancelled không chiếm slot. Slot đã giữ không hiển thị là slot trống. | Cao |
| FR-M02-008 | Ràng buộc khung giờ của lịch hẹn | Hệ thống chỉ nhận lịch có bác sĩ khi cả khoảng khám, tính theo thời lượng dịch vụ, nằm trọn trong ca của bác sĩ đó. Khoảng khám vượt khỏi ca thì không lưu. Hệ thống không bắt buộc khoảng đệm giữa hai lịch liền nhau. | Cao |
| FR-M02-009 | Chuyển trạng thái hoàn thành | Hệ thống cho phép bác sĩ được gán hoặc lễ tân chuyển lịch đang Confirmed sang Completed. Vai trò khác không chuyển được. Completed là trạng thái kết thúc: không hủy và không xác nhận lại. | Cao |
| FR-M02-010 | Hủy lịch | Hệ thống cho phép hủy lịch đang Pending hoặc Confirmed và giải phóng slot. Bệnh nhân hủy lịch của mình khi còn ít nhất 2 giờ trước giờ khám. Lễ tân hủy được cả trong vòng 2 giờ đó. Bệnh nhân không tự hủy khi còn dưới 2 giờ. Không hủy lịch Completed hoặc Cancelled. Sau khi hủy, lịch ở trạng thái kết thúc Cancelled. | Cao |
| FR-M02-011 | Đổi bác sĩ hoặc giờ khám | Hệ thống cho phép lễ tân đổi bác sĩ hoặc thời gian trên cùng một lịch chưa ở trạng thái kết thúc. Hệ thống kiểm tra lại ca, trùng lịch và năng lực dịch vụ trước khi lưu. Nếu hợp lệ, mã lịch không đổi, slot cũ được nhả và slot mới được giữ. Nếu bác sĩ hoặc giờ mới không hợp lệ, bản ghi không đổi và không giữ Confirmed cho phương án mới. | Cao |
| FR-M02-012 | Ghi lịch sử thay đổi | Hệ thống lưu trạng thái trước và sau, thời điểm và người thực hiện mỗi lần lịch hẹn đổi trạng thái, bác sĩ hoặc giờ và thao tác đó thành công. Thao tác bị từ chối thì không thêm bản ghi lịch sử. | Cao |

### 3.1.3. Module Quản lý lịch bác sĩ và thông báo nội bộ (M03)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M03-001 | Quản lý ca làm việc | Hệ thống cho phép quản lý phòng khám tạo và sửa ca làm việc của bác sĩ theo từng ngày và khung giờ cụ thể. Mỗi ca gắn với một bác sĩ, một ngày và một khoảng giờ. Hệ thống không tạo ca từ mẫu lặp theo tuần. | Cao |
| FR-M03-002 | Đánh dấu không sẵn sàng | Hệ thống cho phép bác sĩ đã đăng nhập đánh dấu không sẵn sàng trên một ngày hoặc một ca. Trạng thái này được dùng khi kiểm tra chỗ trống. Bác sĩ không sửa được giờ của ca chính thức. Việc sửa ca thuộc về quản lý phòng khám. | Cao |
| FR-M03-003 | Gửi thông báo trong hệ thống | Hệ thống tạo thông báo trong ứng dụng sau khi xác nhận, đổi bác sĩ hoặc giờ, hoặc hủy được lưu thành công. Xác nhận gửi cho bệnh nhân và bác sĩ được gán. Đổi bác sĩ hoặc giờ gửi cho bệnh nhân và các bác sĩ liên quan. Hủy gửi cho bệnh nhân và bác sĩ được gán. Lễ tân không nhận thông báo cho thao tác do chính lễ tân thực hiện. Hệ thống không gửi nhắc lịch tự động trước giờ khám. | Trung bình |

### 3.1.4. Module Báo cáo thống kê cơ bản (M04)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M04-001 | Xem báo cáo lịch hẹn | Hệ thống cho phép quản lý phòng khám xem số lịch, số lịch hoàn thành và số lịch hủy, lọc theo bác sĩ hoặc theo khoảng thời gian. Số liệu khớp với các lịch đã lưu trong bộ lọc đã chọn. Vai trò không có quyền báo cáo không xem được thống kê này. | Trung bình |
