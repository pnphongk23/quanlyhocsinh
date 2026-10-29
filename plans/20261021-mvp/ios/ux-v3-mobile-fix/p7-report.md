# P7: sửa màn chi tiết buổi học GV theo phản hồi người dùng

Commit: `113730b` (7 mục) và một commit sửa token sau review-sol-4 (xem `git log` trên mvp-ios). Không push, không add 4 file của người dùng.
Test (/tmp/qlh-ux3-p7, Staging, iPhone 16), chạy lại sau khi sửa token: **160 tests, 1 skipped, 0 failures**, TEST SUCCEEDED.

## Việc đã làm (7 mục)
1. `TeacherTextTabs`: bỏ nền, gạch 3px primary dưới mục chọn, giữ cuộn ngang và trait selected.
2. Bỏ dòng phụ. Nút `info.circle` ở toolbar (≥44pt, accessibilityLabel) mở `TeacherSessionInfoSheet`: lớp, ngày, giờ, người dạy.
3. Bỏ thẻ Người dạy khỏi tab Điểm danh.
4. Bỏ dòng hướng dẫn vuốt. Nhãn trạng thái là `Menu` + `Picker` có chevron, a11y label và value. Lưu qua `update(...)` như cũ.
5. Thẻ Cần chú ý ẩn khi rỗng. Có `TeacherFeatureData.studentsNeedingAttention` và assertion trong `TeacherFeatureTests`.
6. Nút Lưu ghim đáy bằng `safeAreaInset` trong `TeacherAttendanceView`, danh sách tự cuộn. Chuỗi mới ở `Teacher.xcstrings`.
7. `.toolbar(.hidden, for: .tabBar)` ở chi tiết lớp và chi tiết buổi.

## Sửa theo review-sol-4
- **V1:** `SE3-02-menu-trang-thai.png` chụp lại. Flow chờ chữ "Có phép" hiện rồi mới chụp. Đã xem ảnh: menu 4 mục mở thật trên SE 3, và file khác `SE3-01` (so sánh byte). Báo cáo trước ghi "menu mở ở cả hai máy" là sai với SE 3 cho tới lần chụp lại này.
- **V3 token:** không còn literal mới. Thêm `AppMetrics.hairline` (1) và `AppMetrics.pillChevronSize` (10) trong `Tokens.swift`. Spacing và padding 8 dùng `TeacherMetrics.listGap`. Card ở sheet dùng `AppMetrics.cardPaddingHorizontal/Vertical`.
- **G1 ảnh app thật:** iPhone 16 còn phiên GV staging sẵn (không đăng nhập mới). Maestro chỉ chạm, không nhập chữ. Không bấm Lưu điểm danh, không đổi dữ liệu. Ảnh `shots/after-session-fb/real-iPhone16-01..08`: gốc Lớp (tab bar hiện), chi tiết lớp (tab bar ẩn), Điểm danh đầu và cuối (nút Lưu ghim), menu trạng thái mở, sheet info, back về chi tiết lớp (tab bar vẫn ẩn), back về gốc (tab bar hiện lại). Đã mở xem `04`, `05`, `07`, `08`; `01`, `02`, `03`, `06` được Maestro chụp thành công nhưng tôi chưa mở xem. Hành vi push và back (hiện lại tab bar ở gốc) đã kiểm trong app thật qua `07` và `08`.
- **Ảnh app thật trên iPhone SE (3rd gen):** simulator SE 3 đã có phiên GV staging sẵn, không đăng nhập (không dùng Maestro login). Cài build `/tmp/qlh-ux3-p7`, chạy flow `real2.yaml` (cùng chuỗi như iPhone 16, chỉ chạm, không nhập chữ). Không bấm Lưu điểm danh, không đổi dữ liệu. Ảnh `shots/after-session-fb/real-SE3-01..10`. Đã mở xem `02`–`10`; `01` Maestro chụp thành công nhưng tôi chưa mở xem (`08` cho thấy cùng màn gốc Lớp).
  - `02`: chi tiết lớp, tab bar ẩn, gạch chỉ báo ở "Buổi học". Ảnh chụp giữa lúc chuyển cảnh nên nội dung lệch sang phải.
  - `03`, `05`: Điểm danh đầu và cuối, nút "Lưu điểm danh" ghim đáy, thanh tab bar ẩn, không có thẻ Người dạy, không có dòng hướng dẫn vuốt, không có thẻ Cần chú ý (không có HS cần chú ý).
  - `04`: menu 4 mục (Có mặt có dấu chọn, Vắng, Muộn, Có phép) mở thật.
  - `06`: sheet "Thông tin buổi học" gồm Lớp, Ngày, Giờ, Người dạy (GV chính "Cô Hương (demo)", Trợ giảng "Không có").
  - `07`: back về chi tiết lớp, tab bar vẫn ẩn. `08`: back về gốc, tab bar hiện lại.
  - `09`, `10` (thêm): tab Nhận xét và Bài tập về nhà đang chọn, gạch chỉ báo đúng tab. Chỉ chụp, không nhập.
  - Tab Nhận xét và Bài tập về nhà chỉ chụp trên SE 3, chưa chụp trên iPhone 16.

## Quyết định đã chốt (24/10)
- **Trạng thái điểm danh:** giữ 4 trạng thái theo spec, menu hiện tại đúng, không đổi mã.
- **Người dạy trong sheet:** dùng đúng nguồn của thẻ Người dạy cũ, không đổi schema hay API. Giới hạn:
  - GV chính là tên tài khoản đang đăng nhập (`data.displayName`).
  - Trợ giảng chưa có nguồn dữ liệu, luôn hiện "Không có".
  - Chưa có nhánh "chưa phân công".

## Giới hạn
- Chưa chụp buổi đã hủy, buổi chưa tới ngày, ảnh bàn phím, và trạng thái Lưu thành công hay lỗi.
- Chưa kiểm push sâu (Tạo bài kiểm tra) có giữ tab bar ẩn không, và Lịch → buổi → back.
- Ảnh app thật có trên cả iPhone 16 (01–08) và SE 3 (01–10). Ảnh iPhone 16 `01`, `02`, `03`, `06` và SE 3 `01` chưa được mở xem.
- "Đã lưu trên máy" luôn hiện dưới nút Lưu là hành vi có từ trước, lệch spec mục 5.3, chưa sửa.
- Ảnh harness `after-session-fb/*` (không có tiền tố `real-`) dùng dữ liệu tổng hợp, không phải app thật.
