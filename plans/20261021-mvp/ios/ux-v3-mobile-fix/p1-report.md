# P1 — khung màn + điều hướng (giáo viên)

Commit `4558146` (nhánh mvp-ios, chưa push). Build/test trên bản sao `/tmp/qlh-ux3-p1/`.

## File sửa
- AuthFlowView: bỏ NavigationStack ngoài + nút avatar nổi; Cài đặt truyền `isRootTab`.
- AuthSettingsView: `isRootTab` ⇒ large title hệ thống, không backRow/onClose, topPadding 0. Logic đăng xuất/đổi mật khẩu/offline không đổi. Phụ huynh (onClose) giữ nguyên.
- TeacherRootView: `TabView` hệ thống (tabItem, icon+nhãn cũ), mỗi tab một NavigationStack, path giữ nguyên; Lớp/Cài đặt fallback large title; bỏ header tự dựng + nút avatar ở danh sách lớp (còn dòng "Xin chào").
- TeacherScheduleView: large title "Lịch".
- TeacherClassDetailView: navigationTitle(tên lớp) inline, nút "…" ở toolbar, tab nội dung dưới nav bar; bỏ safeAreaPadding/toolbar hidden. Tạo lớp: title inline + back hệ thống.
- TeacherSessionDetailView: title "Buổi n · dd/MM" inline, "…" toolbar, dòng "lớp · ngày giờ" + tab dưới nav bar.
- TestsTabView: danh sách bọc TeacherScroll + padding token; TestScoresView/TestEditorView dùng nav chuẩn (title inline, "…" toolbar).
- MonthlyReportView: bọc TeacherScroll + padding token.
- Không thêm chuỗi mới (dùng lại khoá sẵn có) ⇒ không có Navigation.xcstrings; Localizable.xcstrings không đụng.
- `TeacherTabBar` giữ lại vì DemoScreens (DEBUG harness) còn dùng.

## Kiểm thử
`xcodebuild test` (Staging, iPhone 16, ad-hoc): 160 tests, 1 skipped, 0 failures, TEST SUCCEEDED. Không phải sửa test.

## Ảnh sau (app thật) — `shots/after-p1/`
iPhone 16 và SE 3: Lớp, Lịch, Cài đặt, chi tiết lớp (Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo), buổi học, tạo lớp (`iPhone16-*.png`, `SE3-*.png`). SE đăng nhập bằng Maestro, 1 lần submit thật.

## Còn lại / lệch proposal
- Tab Điểm (ScoreGridTabView) chưa bọc khung (P2): nội dung tràn dưới nav bar trên SE (`SE3-lop-diem.png`).
- Tab bar hệ thống vẫn hiện ở màn con (đúng HIG); nút "Tạo lớp" sticky nằm sát tab bar, nên xem lại ở P3.
- Menu "…" lớp vẫn là overlay tự dựng TeacherOptionsMenu (chỉ đổi vị trí kích hoạt); có thể đổi sang Menu hệ thống sau.
- Chưa xem lại thủ công từng ảnh SE ngoài Lớp/Lịch/Cài đặt/Điểm.
- DemoScreens harness (DEBUG) vẫn bọc scroll riêng cho Tests/Report ⇒ lồng scroll trong harness, không ảnh hưởng app thật.
