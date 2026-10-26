# ux-01 · Nền chuyển động + UI dùng chung + shell giáo viên

Đọc `ux-00-common.md` trước. Dev server cổng 5192. Ảnh: `design/prototype-shots/ux-v2/after/motion/`.

## Phạm vi file
`src/shared/styles/*`, `src/shared/ui/*` (trừ `Mascot.tsx`), thư mục mới `src/shared/motion/*`, `src/app/TeacherShell.tsx`, `src/app/shell.module.css`. Không sửa `src/features/**`, `src/roles/**`, `src/app/routes.tsx` (worker khác giữ).

## Việc
1. `tokens.css`: thêm token chuyển động ở rules.md mục 4; `reset.css`: khối `prefers-reduced-motion` chung đặt token = 1ms.
2. `src/shared/motion/`: 
   - `PageTransition` (bọc `<Outlet/>` hoặc children, key theo pathname): vào fade + translateY 8px; biến thể `detail` translateX 16px dùng cho trang đi sâu (đọc `handle.detail` của route nếu tiện, hoặc prop).
   - `Collapse` (`open`, children): `grid-template-rows 0fr↔1fr` + opacity; `inert`/`aria-hidden` khi đóng.
   - Lớp CSS dùng lại: `.pressable` (scale 0.98 khi nhấn), `.chevron` xoay khi `[aria-expanded=true]`, `.fadeIn`.
   - Export qua `src/shared/motion/index.ts`. Viết test nhỏ cho Collapse (render mở/đóng, aria).
3. `Modal`/`Sheet`: animation mở (sheet trượt lên mobile, dialog scale+fade desktop, backdrop fade) và ĐÓNG (chạy xong mới `dialog.close()`; reduced-motion đóng ngay). Không đổi API props.
4. `Segmented` và thanh tab dùng chung (nếu ở shared/ui): chỉ báo trượt giữa các mục.
5. `Button`: ở ≥ 1024px mọi size rộng theo nội dung (`.lg` `width:auto`). Thêm prop tuỳ chọn `block` để ép tràn ngang khi thật cần (mobile footer). Kiểm các chỗ dùng `size="lg"` trong features vẫn ổn trên mobile (chỉ đọc, không sửa features; liệt kê chỗ cần chỉnh vào báo cáo).
6. Shell giáo viên: vùng nội dung `max-width: 1200px` theo rules mục 1; bọc Outlet bằng `PageTransition`; mục sidebar có transition nền 150ms.

## Xong khi
Test + build xanh; ảnh mobile+desktop sau ở thư mục trên (ít nhất: lớp, buổi học mở sheet nhận xét mobile, dialog desktop); ghi chú cách xem chuyển động trong báo cáo (GIF nếu chụp được bằng screencast/ffmpeg, không bắt buộc).
