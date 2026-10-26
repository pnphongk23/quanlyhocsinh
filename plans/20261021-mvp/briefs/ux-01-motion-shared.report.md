# Báo cáo ux-01 · Nền chuyển động + UI dùng chung + shell giáo viên

Status: DONE_WITH_CONCERNS

## Thay đổi theo file (design/prototype/src)
- `shared/styles/tokens.css`: thêm `--dur-fast/base/slow`, `--ease-out/in/standard`.
- `shared/styles/reset.css`: trong `prefers-reduced-motion` đặt 3 token `--dur-*` = 1ms (giữ khối tắt animation/transition cũ).
- `shared/motion/` (mới): `PageTransition` (prop `detail`, key theo pathname, bọc `<Outlet/>`; khoảng cách khối lấy từ `--page-gap` của vùng chứa), `Collapse` (`open`; `aria-hidden` + `inert` khi đóng), `useSlideIndicator` (đo mục `[aria-selected=true]`/`[aria-current]`, đặt `--ind-x/w/h/top`), `motionClass` (`pressable`, `chevron`, `fadeIn`, `indicator`, `indicatorReady`), `index.ts`, `Collapse.test.tsx` (2 test, renderToStaticMarkup vì môi trường test là node).
- `shared/ui/useAnimatedDialog.ts` (mới) dùng trong `Modal.tsx`, `Sheet.tsx`: mở `showModal()`; đóng đặt `data-closing`, chờ `animationend` (dự phòng 400ms) rồi `close()`; reduced-motion hoặc không có animation thì đóng ngay. API props không đổi.
- `shared/ui/ui.module.css`: keyframes dialog (scale+fade), sheet (mobile trượt lên/xuống), backdrop fade; nút có phản hồi nhấn scale 0.98; `.lg` ở ≥1024px `width:auto`, `min-width:96px`; `.block`; thumb của Segmented.
- `shared/ui/Button.tsx`: thêm prop `block`.
- `shared/ui/Segmented.tsx`: chỉ báo (thumb) trượt giữa các mục.
- `shared/ui/ui.module.css` (`.pageHeaderMain`): `align-items: center` để nút quay lại thẳng hàng với tiêu đề (lead bổ sung). Chưa chụp ảnh kiểm chứng riêng.
- `app/TeacherShell.tsx`: `<Outlet/>` → `<PageTransition/>`; mobile dùng biến thể `detail` khi đường dẫn > 2 đoạn.
- `app/shell.module.css`: nội dung desktop `max-width:1200px`, `--page-gap`, mục sidebar transition nền 150ms + hover.

## Kiểm
- `npm test`: 545 xanh, 1 đỏ: `guardianRender.test.tsx` "buổi giao bài mới nhất…" (thuộc ux-03, không phải của tôi). Trước đó chạy lần đầu 542/542 xanh.
- `npm run build`: xanh.
- Playwright (cổng 5192): sheet nhận xét mobile mở được, Segmented desktop có thumb trượt; reduced-motion đóng dialog ngay. Chưa kiểm xong: đóng có animation (probe `data-closing` đọc None sau 80ms, chưa rõ do hết animation sớm hay do cách đo) và dialog desktop, vì bị ngắt giữa chừng. Cần ai đó xem lại bằng mắt.

## Ảnh
`design/prototype-shots/ux-v2/after/motion/`: `m|d-lop`, `m|d-buoi-hoc`, `m|d-nhan-xet-tab`, `m-dialog-open`, `m|d-dialog-mid-open` (`d-dialog-*` là lần chụp cũ, không phải dialog; bỏ qua). Chưa có ảnh dialog desktop và `*-modal-*`.

## Việc còn lại / cho features
- Thanh tab lớp (features) chưa có chỉ báo trượt: dùng `useSlideIndicator` + `motionClass.indicator` (container `position:relative`).
- `LinkButton` chưa có `block`; `size="lg"` ở mobile vẫn 100% nên không đổi. Desktop mọi `size="lg"` (≈45 chỗ trong features, vd. footer sheet/dialog, form) giờ rộng theo nội dung; chỗ nào cần tràn ngang thì thêm `block`.
- Patch riêng của ux-02 ở trang Tạo lớp cho nút quay lại có thể thừa sau khi sửa PageHeader; chưa kiểm.
- Chevron/expand trong features chưa dùng `Collapse`/`.chevron`.

## Cho web/iOS
- Chỉ animate transform/opacity; token 150/200/250ms; reduced-motion = ngay lập tức.
- Đóng sheet/dialog phải chạy hết animation ra rồi mới đóng; mở lại giữa chừng huỷ đóng.
- Chuyển trang: chỉ animate trang mới vào (translateY 8; trang đi sâu mobile translateX 16).
- Desktop: nút theo nội dung, min-width 96; nút tràn ngang chỉ khi chủ động (`block`).
- Tiêu đề trang có nút quay lại: căn giữa dọc nút và khối tiêu đề.
