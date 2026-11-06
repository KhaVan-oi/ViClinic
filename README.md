# ViClinic — Clinic Appointment Management System

Hệ thống Quản lý Lịch hẹn Phòng khám Đa khoa quy mô nhỏ.  

---

## 1. Cấu trúc Tài liệu Đặc tả

Toàn bộ tài liệu đặc tả yêu cầu và thiết kế nghiệp vụ được quản lý tập trung trong thư mục [`doc/`](doc/):

- **[doc/FR.md](doc/FR.md):** Đặc tả Yêu cầu Chức năng (Functional Requirements) gồm 4 Module chính (M01 - M04).
- **[doc/NFR.md](doc/NFR.md):** Đặc tả Yêu cầu Phi chức năng (Non-Functional Requirements) về hiệu năng, bảo mật, độ tin cậy.
- **[doc/User_Flow.md](doc/User_Flow.md):** Quy ước vòng đời trạng thái lịch hẹn, danh mục sơ đồ luồng người dùng và Ma trận truy vết (Traceability Matrix).
- **[doc/user-flow/](doc/user-flow/):** Chứa toàn bộ mã nguồn sơ đồ PlantUML (`*.puml`) và ảnh kết quả (`*.png`) độc lập từ `UF-00` đến `UF-15`.
- **[doc/database-design/](doc/database-design/):** Thiết kế Cơ sở dữ liệu gồm Sơ đồ [ERD.puml](doc/database-design/ERD.puml), [ERD.png](doc/database-design/ERD.png) và Từ điển dữ liệu ([Data_Dictionary.md](doc/database-design/Data_Dictionary.md)).

---

## 2. Hướng dẫn Xem & Preview Sơ đồ PlantUML (`*.puml`)

Các file `.puml` trong `doc/user-flow/` đã được thiết kế hoàn toàn độc lập, có thể mở xem trực tiếp trên Visual Studio Code.

### Cài đặt Extension
Cài đặt extension hỗ trợ preview trên VS Code:
- **Khuyến nghị:** **Plan UML** (ID: `justuskarlsson.plan-uml`) — Hỗ trợ xem preview tương tác nhanh, trực quan.
- *Tùy chọn khác:* **PlantUML** (ID: `jebbs.plantuml`).

### Cách mở Preview
1. Mở file `.puml` cần xem trong thư mục `doc/user-flow/`.
2. Mở khung xem trước:
   - **Với Plan UML:** Bấm biểu tượng **Preview** ở góc trên bên phải thanh editor tab (hoặc nhấn `Ctrl + Shift + P` rồi chọn `Plan UML: Open Preview`).
   - **Với PlantUML (jebbs):** Nhấn phím tắt `Alt + D`.