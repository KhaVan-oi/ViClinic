# User Flow

Các sơ đồ được lưu bằng PlantUML (`.puml`). File `.puml` là source chính; PNG chỉ là bản preview được render từ source tương ứng.

## 1. Sơ đồ hệ thống

![Sơ đồ hệ thống](user-flow/hethong.png)

[PlantUML source](user-flow/hethong.puml)

State hiện có:
- Pending: lịch đang chờ xác nhận; nếu đã chọn bác sĩ thì giữ chỗ của bác sĩ đó, nếu chưa chọn bác sĩ thì chưa giữ chỗ bác sĩ
- Confirmed: lịch đã được lễ tân xác nhận và có bác sĩ phụ trách
- Completed: lịch đã khám xong
- Cancelled: lịch đã hủy và không còn giữ chỗ

## 2. Sơ đồ chuẩn bị masterdata và ca làm việc

![Sơ đồ chuẩn bị](user-flow/02-chuan-bi.png)

[PlantUML source](user-flow/02-chuan-bi.puml)

## 3. Sơ đồ đặt lịch

![Sơ đồ đặt lịch](user-flow/03-dat-lich.png)

[PlantUML source](user-flow/03-dat-lich.puml)

## 4. Sơ đồ xác nhận lịch

![Sơ đồ xác nhận](user-flow/04-xac-nhan.png)

[PlantUML source](user-flow/04-xac-nhan.puml)

## 5. Sơ đồ đổi lịch

![Sơ đồ đổi](user-flow/05-doi.png)

[PlantUML source](user-flow/05-doi.puml)

## 6. Sơ đồ hủy lịch

![Sơ đồ hủy](user-flow/06-huy.png)

[PlantUML source](user-flow/06-huy.puml)

## 7. Sơ đồ lễ tân tạo lịch hẹn

![Sơ đồ tạo thẳng](user-flow/07-tao-thang.png)

[PlantUML source](user-flow/07-tao-thang.puml)

## 8. Sơ đồ đóng lịch và báo cáo

![Sơ đồ đóng lịch và báo cáo](user-flow/08-dong-lich-va-bao-cao.png)

[PlantUML source](user-flow/08-dong-lich-va-bao-cao.puml)
