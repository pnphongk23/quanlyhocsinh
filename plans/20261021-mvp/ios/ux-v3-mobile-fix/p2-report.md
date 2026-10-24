# P2 — tab Điểm

## File sửa
`ios/QuanLyLop/Features/Scores/ScoreGridTabView.swift`: bọc TeacherScroll + padding token + nền; bảng dùng hằng `Grid` (headerHeight 64, rowHeight 52, nameWidth 128, testWidth 112) cho cả cột tên và cột bài nên hàng thẳng nhau; monospacedDigit; tên bài lineLimit 2; lề phải 8 sau cột cuối. Hành vi (chạm ô → focus học sinh, HS nghỉ xếp sau, nút mới, empty state) giữ nguyên; không thêm chuỗi.

## Kiểm thử
xcodebuild test (Staging, iPhone 16, ad-hoc, /tmp/qlh-ux3-p2): 160 tests, 1 skipped, 0 failures, TEST SUCCEEDED.

## Ảnh (app thật, lớp 6A: 8 HS đang học + 3 đã nghỉ) — shots/after-p2/
iPhone16 / SE3 × {lop-diem-top, lop-diem-cuoi-doc, lop-diem-cuoi-ngang}. Đã xem: không chồng nav/status bar, tên và điểm thẳng hàng, cột cuối không bị cắt (có lề phải), hàng cuối và chú thích không bị tab bar che khi cuộn hết.

## Còn lại
Lớp demo chỉ có 2 cột bài; chưa thử bảng ≥4 cột. Đầu trang (chưa cuộn) hàng cuối nằm dưới tab bar nổi — bình thường vì cuộn được.
