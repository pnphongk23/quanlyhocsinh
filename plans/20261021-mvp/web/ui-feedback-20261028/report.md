# Báo cáo brief 101: sửa giao diện web mobile

Commit mvp-web 339a2b8 (chưa push). Deploy staging: e860bae7-2fdd-48ee-901a-e1900ec522e1, bundle `index-DjqM5lYc.js` (curl `/` khớp `dist`). Rollback: 9de88c02-50d4-4c90-a8e7-b5400df20289.
Gate: tsc sạch, vitest 713 pass / 0 fail (4 skip), build đạt.

## Sửa
1. Màn Sửa lịch học: "Quay lại" thành nút chevron `BackButton` (cùng kiểu `PageHeader`), `shared/ui/BackButton.tsx`.
2. Ô nhập: `.input` thêm `min-width:0`, `appearance:none`, `display:block`; `.field` `min-width:0`; `::-webkit-date-and-time-value` căn trái (lỗi tràn/căn giữa của ô giờ/ngày trên iOS Safari). Áp cho mọi ô giờ/ngày (thêm buổi lẻ, bài kiểm tra, lớp mới).
3. Focus: hộp thoại tự focus chính nó (`tabindex=-1`, không outline) thay vì nút đầu tiên, ở `useAnimatedDialog` và hộp Sửa lịch học. Bàn phím vẫn Tab được. Sheet có `initialFocusRef` giữ nguyên.
4. Sheet Sửa lớp: `Modal` truyền `sheet` (bám đáy, bo hai góc trên). Cùng lỗi nên áp thêm cho Sửa bài kiểm tra và Thêm học sinh. Sheet không footer chừa safe-area đáy. Chromium: khoảng hở đáy 246px → 0.
5. Sửa lớp: Huỷ (ghost, trái) + Lưu thay đổi (chính, phải) chia đôi hàng, cách `--space-8`, cả mobile và desktop căn phải.
6. "Lưu lịch" khi chưa thay đổi: đã dùng đúng token disabled (`--color-neutral-soft` + chữ `--color-muted`, rules.md mục 6); giữ nguyên, ngoài ra nhãn "Chưa có thay đổi để lưu." đã đứng cạnh nút.

## Không tái hiện / lưu ý
- FAB "+": hit-test cho thấy lớp phủ nằm trên FAB (FAB bị làm tối cùng scrim); không phải z-index sai. Không đổi.
- Vòng focus và ô giờ tràn chỉ có trên Safari iOS; Chromium (iPhone 13, 390×844) không tái hiện ở bản trước. Bản sửa dựa trên hành vi đã biết của Safari, chưa xác nhận trên simulator iPhone (chưa dùng slot simulator).

## Ảnh
`before/` và `after/` (390×844): 00-class, 01-menu, 02-sua-lop-sheet, 03-sua-lich-hoc. Script: `capture.mjs`. Tài khoản smoke, ảnh không có SĐT.

Status: DONE_WITH_CONCERNS
Summary: Sáu mục đã sửa và deploy; kiểm bằng Chromium, chưa kiểm trên Safari iOS thật.
Concerns/Blockers: mục 2 và 3 cần người dùng mở lại trên iPhone để xác nhận.
