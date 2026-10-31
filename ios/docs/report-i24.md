# iOS-24 · Smoke staging chỉ đọc (phụ huynh + giáo viên)

Ngày: 2026-10-23 · Nhánh `mvp-ios` · iOS-23 commit `8f7ccba`.

## Build và thiết bị

- `xcodegen generate`: OK.
- Build một lần scheme Staging cho iPhone 16, ký ad-hoc (`CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`, DerivedData `/tmp/qlh-dd-i24`): `BUILD SUCCEEDED`, không có lỗi compiler.
- Cài và mở app thành công trên simulator iPhone 16. Không sửa mã app.

## Phụ huynh

- Tài khoản phụ huynh hai con: một lần đăng nhập UI thành công. Trước đó đã thử một `POST /auth/login` riêng để lấy token đối chiếu; request trả HTTP 403. Không thử lại để giữ giới hạn tối đa hai lần đăng nhập cho tài khoản này. Không có token để gọi GET đối chiếu.
- Dashboard tải được, không thấy `Không tải được dữ liệu của con`. Hai chip con hiện ra; chạm đổi sang con còn lại và dashboard đổi nội dung.
- Tab Điểm danh của cả hai con mở được, không hiện lỗi tải. Tháng 10 hiển thị 0 có mặt, 0 muộn, 0 có phép, 0 vắng và “Chưa có buổi học nào trong tháng này”.
- Tab Báo cáo của cả hai con mở được, không hiện lỗi tải. Cả hai đều báo “Cô chưa phát hành báo cáo tháng này”; không có BTVN hoặc publication tháng 10 để kiểm tra và không thấy `publication_count=3`.

Ảnh đã xem và không có SĐT: [tổng quan](screens/i24/guardian-overview.png), [đổi con](screens/i24/guardian-child-switch.png), [điểm danh con A](screens/i24/guardian-attendance-a.png), [điểm danh con B](screens/i24/guardian-attendance-b.png), [báo cáo con A](screens/i24/guardian-report-a.png), [báo cáo con B](screens/i24/guardian-report-b.png).

## Giáo viên

- Một lần đăng nhập UI thành công; màn Lớp của tôi tải được. Mở lớp 6A, danh sách bài kiểm tra và lưới điểm đều hiển thị; không thấy `Không tải được dữ liệu đã lưu`.
- Màn Báo cáo mở được, không thấy lỗi giải mã. Kỳ hiện tại của simulator là tháng 12/2026, danh sách báo 0/8 sẵn sàng, 8 thiếu dữ liệu, 0 đã phát hành. Đã mở xem trước tháng 12; preview hiển thị 0/0 buổi, 0/0 bài và chưa có phiếu/BTVN được gửi.
- Đã thử mở bộ chọn kỳ qua accessibility label và tọa độ, nhưng menu tháng không hiện; không thể chọn tháng 10 để xem publication. Vì vậy chưa xác minh được preview của báo cáo tháng có publication.

Ảnh đã xem và không có SĐT: [danh sách bài kiểm tra](screens/i24/teacher-tests.png), [lưới điểm](screens/i24/teacher-score-grid.png), [danh sách báo cáo tháng hiện tại](screens/i24/teacher-report-list-current-month.png), [preview tháng hiện tại](screens/i24/teacher-report-preview-current-month.png).

## Giới hạn và dọn dẹp

- Giao diện phụ huynh hiện chỉ có năm tab và không có lối vào Cài đặt/Đăng xuất. Để chuyển tài khoản, đã erase simulator cục bộ thay cho đăng xuất UI; đây là lệch quy trình được yêu cầu. Tài khoản đa vai trò trong file credentials bị dùng nhầm một lần trước khi phân biệt với tài khoản phụ huynh hai con; lần đó là một đăng nhập UI riêng, không ghi dữ liệu nghiệp vụ.
- Số lượt đăng nhập: tài khoản phụ huynh hai con 2 lần (API HTTP 403 + UI thành công); giáo viên 1 lần UI; tài khoản đa vai trò 1 lần UI. Không nhập điểm, không phát hành báo cáo, không thay đổi dữ liệu staging theo nghiệp vụ.
- Simulator đã erase và shutdown; `/tmp/qlh-dd-i24` cùng flow, log và ảnh tạm đã được dọn. Chỉ giữ báo cáo này và ảnh sạch trong `ios/docs/screens/i24/`.

Status: DONE_WITH_CONCERNS
