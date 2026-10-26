# P6 — ảnh lỗi Báo cáo GV + harness đổi mật khẩu

Commit: 49153d8 (không push). Build/test ở /tmp/qlh-ux3-p6 (Staging, iPhone 16): **160 tests, 1 skipped, 0 failures** (cần xcodegen trong bản sao, nếu không thiếu 4 test RestoreSessionOffline).

## Mục
1. Ảnh lỗi Báo cáo: cờ demo `reports-error` render **MonthlyReportView thật** (TeacherErrorBanner thật) với danh sách 10 HS tổng hợp. `MonthlyReportView.init` thêm `seedError` (mặc định nil) và `onChange(studentID)` bỏ qua lần chọn đầu từ rỗng (không xoá thông báo khi vừa chọn HS mặc định). `I4FeatureStore` thêm init DEBUG `init(demoClasses:…)` (quyền đọc/ghi báo cáo, không store/mạng). Chuỗi lỗi dài (5 dòng SE, 4 dòng iPhone 16) ở Teacher.xcstrings, khoá `reports.demo.error.long`; không đụng Localizable.xcstrings.
   Ảnh: shots/after-p6/{iPhone16,SE3}-gv-bao-cao-loi.png. Banner đọc đủ, padding 16/12 token, không chồng status/tab bar; nội dung bên dưới cuộn được (TeacherScroll, đệm đáy).
2. Harness đổi mật khẩu: DemoAuthFlow dùng cùng shell như AuthFlowView.teacherShell (navigationDestination + isPushed:true trong stack Cài đặt).

## Giới hạn
- Lỗi được đặt qua seed, không phải do lưu thật thất bại (không tạo lỗi thật không cần đăng nhập). Đường gán lỗi thật không đổi.
- Trên SE, dòng tóm tắt "0 đã phát hành" xuống dòng ("đã phát / hành"): quan sát, chưa sửa (ngoài phạm vi).
- Chưa chạy lại Maestro flow 09 / không chụp luồng push đổi mật khẩu trong harness (chỉ build + test).
- Không kiểm cuộn thật bằng thao tác; dựa vào ScrollView hiện có.
