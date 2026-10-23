# iOS-28 · Smoke UI phụ huynh trên staging (chỉ đọc)

Ngày: 2026-10-23 · Nhánh `mvp-ios` · HEAD ban đầu `f2041a3`.

## 1. Build và simulator

- Build Staging ký ad-hoc cho iPhone 16 bằng `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`, DerivedData `/tmp/qlh-dd-i28`: `BUILD SUCCEEDED`.
- Project chỉ có scheme `QuanLyLop`; `Staging` là build configuration. Lệnh đầu thử scheme `Staging` dừng trước compile; chạy lại với scheme `QuanLyLop` và configuration `Staging` thành công.
- Đã erase simulator iPhone 16, cài và mở app. Không sửa mã app, không ghi/đổi dữ liệu staging.

## 2. Đăng nhập và đối chiếu API

- Đọc đúng mục phụ huynh hai con theo brief. Tổng cộng 2 lần đăng nhập thành công: 1 API (`POST /auth/login`, HTTP 200) và 1 UI. Không có lần thử đăng nhập lại.
- Flow đăng nhập Maestro ban đầu trả lỗi ở assertion `Lớp của tôi` (tiêu đề giáo viên); phiên phụ huynh đã vào app. Flow đọc-only riêng xác nhận tab `Tổng quan` và tiếp tục chụp màn hình.
- GET `/me`, danh sách buổi lớp, attendance từng con, reports từng con, slips theo buổi và publication #4 đều trả HTTP 200.
- GET buổi lớp: 14/10 là Buổi 1, 16/10 là Buổi 2; cả hai buổi `held`. GET attendance cho mỗi con có đúng hai dòng ngày 14/10 và 16/10, cả hai `present`. GET slips cho mỗi con có phiếu của hai buổi; phiếu mới nhất thuộc Buổi 2, 2 sao.
- Con A không có publication tháng 10. Con B có `publication_count=4`; publication mới nhất là #4. Snapshot #4: chuyên cần `present=2, late=0, excused=0, absent=0, held_sessions=2`; điểm 14/15 và 85/100; sao `three=2, two=0, one=0`; BTVN: Luyện đọc `excellent=0, done=1, not_done=0`, Luyện từ vựng `excellent=1, done=0, not_done=0`.

## 3. Kết quả theo màn hình

| Màn hình | Hồ sơ | Kỳ vọng từ GET | Hiển thị thực tế | Kết quả |
|---|---|---|---|---|
| Tổng quan | Con A | 2/2 buổi có mặt; nhận xét mới nhất Buổi 2 | `Đi học 2/2`; nhận xét mới nhất ghi Buổi 2, 2 sao | Khớp |
| Điểm danh tháng 10 | Con A | 14/10 Buổi 1 và 16/10 Buổi 2, cả hai có mặt | Đủ hai ngày và trạng thái có mặt | Khớp |
| Báo cáo tháng 10 | Con A | Không có publication | Hiện “Cô chưa phát hành báo cáo tháng này” | Khớp |
| Tổng quan | Con B | 2/2 buổi có mặt; nhận xét mới nhất Buổi 2 | `Đi học 2/2`; nhận xét mới nhất ghi Buổi 2, 2 sao | Khớp |
| Điểm danh tháng 10 | Con B | 14/10 Buổi 1 và 16/10 Buổi 2, cả hai có mặt | Đủ hai ngày và trạng thái có mặt | Khớp |
| Báo cáo tháng 10 | Con B | Publication #4; chuyên cần 2/2; điểm 14/15, 85/100; BTVN như trên | Báo cáo tháng 10 hiện nội dung, chuyên cần 2/2, hai bài kiểm tra và bảng BTVN. Điểm hiển thị `14.0/15`, `85.0/100`. Ảnh lưu phần bảng BTVN; đối chiếu bằng OCR không xác nhận chắc từng ô số gắn với đúng hàng. | Có nội dung; lệch định dạng điểm; ô số BTVN cần xem ảnh để xác nhận |

## 4. Ảnh sạch

OCR không phát hiện SĐT trong các ảnh đã lưu.

- [Tổng quan con A](screens/i28/guardian-overview-a.png)
- [Điểm danh con A](screens/i28/guardian-attendance-a.png)
- [Báo cáo con A](screens/i28/guardian-report-a.png)
- [Tổng quan con B](screens/i28/guardian-overview-b.png)
- [Điểm danh con B](screens/i28/guardian-attendance-b.png)
- [Báo cáo con B](screens/i28/guardian-report-b.png)
- [Bảng BTVN con B](screens/i28/guardian-report-b-homework.png)
- [Điểm chi tiết con B](screens/i28/guardian-report-b-details.png)

## 5. Dọn dẹp và trạng thái

- Không chụp hoặc giữ ảnh chứa SĐT. Simulator iPhone 16 đã được erase + shutdown sau smoke. Đã xóa DerivedData `/tmp/qlh-dd-i28` và dữ liệu API/UI tạm.
- Không nhập điểm, phát hành báo cáo hay thay đổi dữ liệu staging.

Status: DONE_WITH_CONCERNS
