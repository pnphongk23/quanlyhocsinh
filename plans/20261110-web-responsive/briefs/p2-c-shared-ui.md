# Packet P2-C · component cơ bản không biết mốc (tầng 2)

Đọc trước `briefs/p2-common.md`.

## Mục tiêu
Component trong `src/shared/ui/` mà 2 luồng dùng có MỘT phiên bản, không `@media` theo bề rộng: Button/LinkButton/buttonClass, Field, Card, Pill, Chip, Segmented, Sheet, Modal, ActionFooter, EmptyState, PageHeader (giữ cho màn chưa chuyển), SaveStatus, Fab, LevelChicks, PullToRefresh.

## Write-set
- `src/shared/ui/**` (gồm `ui.module.css` 8 khối `@media`, `fab.module.css`, `levelChicks.module.css`, `pullToRefresh.module.css`) và test của chúng; `src/shared/motion/motion.module.css`, `src/shared/styles/reset.css` nếu có `@media` bề rộng.
- Token mới: chỉ theo quy định trong p2-common (nhóm `/* component */`, liệt kê trong handback).
KHÔNG sửa `src/shared/layout/**`, `src/app/**`, `src/roles/**` (packet B), `src/features/**`.

## Cách làm
- Khác biệt theo khổ của component: đổi sang token mật độ (đã đổi theo mốc ở `:root`), `@container` (khung chứa đặt `container-type` — nếu cần đặt ở khung thì ghi lại cho packet B/Pha 3, không tự sửa layout), hoặc `(pointer:fine)` cho vùng bấm.
- Nút: desktop rộng theo nội dung, `min-width: var(--button-min-w-desktop)`; "tràn ngang ở đáy mobile" là việc của khung đáy (ActionFooter/FormPage), không phải của Button.
- Sheet/Modal: hành vi đáy/phải/giữa nhận qua prop `placement` (`"bottom"|"right"|"center"`) do mẫu trang truyền vào, không tự đo khổ; sheet trên tab bar/rail (`--z-overlay`), footer nền đặc + safe-area, thân cuộn riêng (đúng mock).
- EmptyState: nội dung căn giữa trong khối, mô tả max-width theo token.
- Giữ nguyên API cũ (prop cũ vẫn chạy) để màn chưa chuyển không vỡ; thêm prop mới khi cần.

## Nghiệm thu
- `grep -nE "@media[^{]*(min|max)-width" src/shared/ui src/shared/motion src/shared/styles/reset.css` → rỗng.
- Ảnh 3 khổ trước/sau của các màn dùng nhiều component này: `/lop`, `/cai-dat`, `/cai-dat/bo-tieu-chi`, chi tiết buổi tab Điểm danh + Nhận xét, `/lich` — không vỡ (so cặp trước/sau, ghi khác biệt có chủ đích). Ảnh `/tmp/qlh-evidence/ql-004/p2/c/`.
- `npm test`, `npm run build` 0 fail.
