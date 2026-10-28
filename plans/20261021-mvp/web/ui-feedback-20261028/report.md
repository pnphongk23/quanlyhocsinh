# Báo cáo brief 101: sửa giao diện web mobile

Commit mvp-web 339a2b8 và c16d1f1 (chưa push). Deploy staging cuối: 6b088f5e-1c84-46e8-ab43-d5f1bf778800, bundle `index-DHAOfYyN.js` (curl `/` khớp `dist`). Rollback bản 1.0 trước brief 101: 9de88c02-50d4-4c90-a8e7-b5400df20289.
Gate: tsc sạch, vitest 713 pass / 0 fail (4 skip), build đạt. Một lần chạy có 1 test fail, chạy lại thì pass hết (nghi flaky, chưa xác định test).

## Sửa
1. Màn Sửa lịch học: "Quay lại" thành nút chevron `BackButton` (cùng kiểu `PageHeader`), `shared/ui/BackButton.tsx`.
2. Ô nhập: `.input` thêm `min-width:0`, `appearance:none`, `display:block`; `.field` `min-width:0`; `::-webkit-date-and-time-value` căn trái (lỗi tràn/căn giữa của ô giờ/ngày trên iOS Safari). Áp cho mọi ô giờ/ngày (thêm buổi lẻ, bài kiểm tra, lớp mới).
3. Focus: hộp thoại tự focus chính nó (`tabindex=-1`, không outline) thay vì nút đầu tiên, ở `useAnimatedDialog` và hộp Sửa lịch học. Bàn phím vẫn Tab được. Sheet có `initialFocusRef` giữ nguyên.
4. Sheet Sửa lớp: `Modal` truyền `sheet` (bám đáy, bo hai góc trên). Cùng lỗi nên áp thêm cho Sửa bài kiểm tra và Thêm học sinh. Sheet không footer chừa safe-area đáy. Chromium: khoảng hở đáy 246px → 0.
5. Sửa lớp: Huỷ (ghost, trái) + Lưu thay đổi (chính, phải) chia đôi hàng, cách `--space-8`, cả mobile và desktop căn phải.
6. "Lưu lịch" khi chưa thay đổi: đã dùng đúng token disabled (`--color-neutral-soft` + chữ `--color-muted`, rules.md mục 6); giữ nguyên, ngoài ra nhãn "Chưa có thay đổi để lưu." đã đứng cạnh nút.

## Kiểm chứng trên Safari iOS (simulator iPhone 16, iOS 26.1, Maestro đăng nhập tài khoản smoke của lane web)
- Sheet Sửa lớp: bám đáy, không ring ở "Đóng", "Huỷ" (trái) và "Lưu thay đổi" (phải) cách nhau. Đạt.
- Sửa lịch học: nút quay lại chevron, không ring khi mở. Đạt.
- Ô giờ: lần đầu nằm trong lề nhưng chữ dính mép trên và ô cao hơn (do `::-webkit-date-and-time-value`); sửa thêm `display:flex; align-items:center` cho ô giờ/ngày (c16d1f1), deploy lại, chụp lại: chữ giữa ô, trong lề. Đạt.
- FAB "+": nằm dưới lớp phủ (Chromium hit-test), không đổi.
- Simulator đã shutdown; slot nhả.

## Ảnh
`before/` và `after/` (Chromium 390×844); `after/ios-safari-02-sua-lop-sheet.png`, `after/ios-safari-03-sua-lich-hoc.png` (Safari iOS): 00-class, 01-menu, 02-sua-lop-sheet, 03-sua-lich-hoc. Script: `capture.mjs`. Tài khoản smoke, ảnh không có SĐT.

Status: DONE
Summary: Sáu mục đã sửa, deploy và kiểm trên Safari iOS simulator.
Concerns/Blockers: không (simulator không phải iPhone thật, nhưng cùng WebKit).
