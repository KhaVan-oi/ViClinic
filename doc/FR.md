# 3.1. Yêu cầu chức năng

### 3.1.1. Module Xác thực và phân quyền (M01)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M01-001 | Đăng ký tài khoản bệnh nhân | Bệnh nhân đăng ký bằng số điện thoại và xác minh số điện thoại bằng OTP trước khi kích hoạt tài khoản. Nếu số điện thoại đã thuộc người dùng hiện có, hệ thống dùng lại đúng người dùng đó thay vì tạo trùng; người dùng hoàn tất các thông tin bệnh nhân còn thiếu trên cùng hồ sơ. Nếu chưa có hồ sơ, bệnh nhân cung cấp họ tên, ngày sinh; email là tùy chọn. | Cao |
| FR-M01-002 | Tạo và quản lý tài khoản nhân viên | Quản trị viên tạo hoặc gán vai trò nhân viên cho Lễ tân, Bác sĩ hoặc Quản lý phòng khám bằng họ tên, số điện thoại và vai trò; email có thể bổ sung. Nếu số điện thoại đã thuộc người dùng hiện có thì hệ thống dùng lại người dùng đó, không tạo trùng. Tài khoản mới chỉ được kích hoạt sau khi nhân viên xác minh số điện thoại bằng OTP và đặt mật khẩu. Quản trị viên được đổi vai trò nhân viên, vô hiệu hóa và cho phép kích hoạt lại tài khoản; kích hoạt lại yêu cầu chính chủ xác minh OTP. | Cao |
| FR-M01-003 | Đăng nhập | Người dùng có tài khoản đang hoạt động đăng nhập bằng số điện thoại và mật khẩu; đăng nhập thông thường không yêu cầu OTP. Đăng nhập thất bại nếu thông tin không đúng hoặc tài khoản chưa được kích hoạt/đã bị vô hiệu hóa. | Cao |
| FR-M01-004 | Giới hạn dữ liệu theo vai trò | Hệ thống chỉ cho xem và thao tác dữ liệu đúng phạm vi vai trò được gán. Bệnh nhân quản lý lịch của mình; Bác sĩ xem lịch được phân công và thông tin cần thiết của bệnh nhân có lịch với mình; Lễ tân quản lý hồ sơ cơ bản và lịch hẹn; Quản lý phòng khám quản lý vận hành/báo cáo; Quản trị viên quản lý tài khoản và vai trò. | Cao |
| FR-M01-005 | Quản lý hồ sơ bệnh nhân | Lễ tân tra cứu bệnh nhân bằng số điện thoại. Nếu hồ sơ tồn tại thì dùng/cập nhật hồ sơ đó; nếu chưa có, lễ tân được tạo hồ sơ gồm họ tên, ngày sinh, số điện thoại và email tùy chọn ngay trong thao tác đặt lịch. Hồ sơ do lễ tân tạo chưa bắt buộc có tài khoản web. | Cao |
| FR-M01-006 | Khôi phục mật khẩu | Người dùng có tài khoản `ACTIVE` được khôi phục mật khẩu bằng số điện thoại, xác minh OTP và đặt mật khẩu mới. OTP sai, hết hạn hoặc đã sử dụng không được phép đổi mật khẩu. Luồng khôi phục không kích hoạt tài khoản `PENDING_ACTIVATION` và không mở lại tài khoản `DISABLED`. | Cao |

### 3.1.2. Module Quản lý lịch hẹn và chống trùng giờ (M02)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M02-001 | Quản lý dịch vụ và năng lực bác sĩ | Quản lý phòng khám tạo, cập nhật hoặc ngừng sử dụng dịch vụ, cấu hình thời lượng khám và gán bác sĩ có thể thực hiện từng dịch vụ theo quan hệ nhiều-nhiều. | Cao |
| FR-M02-002 | Xem bác sĩ và khung giờ trống | Bệnh nhân và lễ tân xem dịch vụ đang hoạt động, bác sĩ phù hợp và các khung giờ có thể đặt. Nếu không chọn bác sĩ, hệ thống chỉ cho chọn thời điểm còn ít nhất một bác sĩ phù hợp có thể tiếp nhận và không tự gán bác sĩ. | Cao |
| FR-M02-003 | Đặt lịch hẹn | Bệnh nhân đã đăng nhập hoặc lễ tân tạo lịch bằng hồ sơ bệnh nhân, dịch vụ, thời gian và bác sĩ tùy chọn. Thời gian phải ở tương lai, không quá 30 ngày và thỏa các quy tắc về lịch bệnh nhân, năng lực bác sĩ và khung giờ làm việc. Lịch hợp lệ được tạo ở trạng thái `PENDING`. | Cao |
| FR-M02-004 | Giữ slot và không tự gán bác sĩ | Hệ thống không tự chọn bác sĩ. Lịch `PENDING` chưa có bác sĩ không giữ slot; lịch `PENDING` đã có bác sĩ giữ slot của bác sĩ đó. | Cao |
| FR-M02-005 | Gán bác sĩ và xác nhận | Lễ tân xác nhận lịch `PENDING`. Nếu lịch chưa có bác sĩ, lễ tân phải chọn một bác sĩ phù hợp; hệ thống kiểm tra lại điều kiện lịch trước khi chuyển sang `CONFIRMED`. | Cao |
| FR-M02-006 | Tạo lịch đã xác nhận | Lễ tân được tạo trực tiếp lịch `CONFIRMED` khi đã có hồ sơ bệnh nhân, dịch vụ, bác sĩ và thời gian hợp lệ. Các điều kiện về năng lực, ca làm việc và xung đột lịch phải được kiểm tra trước khi lưu. | Trung bình |
| FR-M02-007 | Chặn trùng lịch | Hệ thống không cho phép hai lịch `PENDING`/`CONFIRMED` của cùng bệnh nhân bị chồng lấn và không cho phép một bác sĩ có hai lịch đang giữ slot bị chồng lấn. Quy tắc áp dụng khi tạo, xác nhận và đổi lịch. | Cao |
| FR-M02-008 | Ràng buộc khung giờ của lịch hẹn | Lịch có bác sĩ chỉ hợp lệ khi toàn bộ thời lượng khám nằm trong ca làm việc và không giao với khoảng thời gian bác sĩ không sẵn sàng. Không bắt buộc khoảng đệm giữa hai lịch liền nhau. | Cao |
| FR-M02-009 | Hoàn thành lịch hẹn | Bác sĩ được gán hoặc lễ tân được chuyển lịch `CONFIRMED` sang `COMPLETED` khi ghi nhận buổi khám thực tế đã hoàn tất. Hệ thống không tự chuyển lịch sang `COMPLETED` chỉ vì đã qua thời gian dự kiến; `COMPLETED` là trạng thái kết thúc. | Cao |
| FR-M02-010 | Hủy lịch | Bệnh nhân được hủy lịch `PENDING`/`CONFIRMED` của mình trước giờ khám ít nhất 2 giờ. Trong 2 giờ cuối, lễ tân có thể hỗ trợ hủy. Lịch `COMPLETED` hoặc `CANCELLED` không được hủy lại. | Cao |
| FR-M02-011 | Đổi bác sĩ hoặc giờ khám | Lễ tân được đổi bác sĩ hoặc thời gian trên cùng một lịch đang ở trạng thái `PENDING` hoặc `CONFIRMED`. Hệ thống kiểm tra lại các điều kiện lịch trước khi cập nhật; nếu không hợp lệ thì dữ liệu cũ được giữ nguyên. | Cao |
| FR-M02-012 | Ghi lịch sử thay đổi | Hệ thống ghi người thực hiện, thời điểm và giá trị trước/sau khi thay đổi trạng thái, bác sĩ hoặc thời gian dự kiến của lịch hẹn thành công. Thao tác bị từ chối không tạo lịch sử. | Cao |
| FR-M02-013 | Xem lịch hẹn | Bệnh nhân xem lịch của mình; Bác sĩ xem lịch được phân công; Lễ tân xem lịch và hồ sơ cơ bản phục vụ điều phối; Quản lý phòng khám xem dữ liệu lịch phục vụ vận hành và báo cáo. | Cao |

### 3.1.3. Module Quản lý lịch bác sĩ và thông báo nội bộ (M03)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M03-001 | Quản lý ca làm việc | Quản lý phòng khám tạo và sửa ca làm việc của bác sĩ theo ngày và khoảng giờ. Các ca của cùng một bác sĩ không được chồng lấn; MVP không yêu cầu mẫu ca lặp tự động theo tuần. | Cao |
| FR-M03-002 | Đánh dấu không sẵn sàng | Bác sĩ được đánh dấu ngày hoặc khoảng thời gian không sẵn sàng. Dữ liệu này được dùng khi tính khung giờ trống; việc sửa ca làm việc chính thức thuộc quyền Quản lý phòng khám. | Cao |
| FR-M03-003 | Gửi thông báo trong hệ thống | Hệ thống tạo thông báo trong ứng dụng khi lịch được xác nhận, đổi bác sĩ/thời gian hoặc bị hủy. Người nhận gồm bệnh nhân và bác sĩ liên quan theo từng sự kiện; không có nhắc lịch tự động trước giờ khám trong MVP. | Trung bình |
| FR-M03-004 | Xử lý lịch bị ảnh hưởng bởi lịch bác sĩ | Khi thay đổi ca hoặc thời gian không sẵn sàng làm một lịch `CONFIRMED` không còn phù hợp, hệ thống xác định lịch bị ảnh hưởng để lễ tân đổi hoặc hủy. Hệ thống không tự động phân bổ lại lịch. | Cao |

### 3.1.4. Module Báo cáo thống kê cơ bản (M04)

| Mã yêu cầu | Tên yêu cầu | Mô tả chi tiết | Độ ưu tiên |
| --- | --- | --- | --- |
| FR-M04-001 | Xem báo cáo lịch hẹn | Quản lý phòng khám xem tổng số lịch, số lịch `COMPLETED` và số lịch `CANCELLED`, có thể lọc theo bác sĩ hoặc khoảng thời gian. Vai trò khác không truy cập chức năng báo cáo. | Trung bình |
