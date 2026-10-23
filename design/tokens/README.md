# Design token

Nguồn chuẩn: `tokens.css` và `tokens.json` (cùng giá trị, sửa cả hai). `ios-mapping.md` ghi token tương ứng trong `Tokens.swift`.

## Đồng bộ
- Web: chép từ dòng `:root {` đến hết file của `tokens.css` sang `src/shared/styles/tokens.css`, giữ ba khối `@font-face` ở đầu file đó.
- Prototype: chép cùng khối sang `design/prototype/src/shared/styles/tokens.css`.
- Mốc khổ: mobile < 1024px, desktop >= 1024px (biến CSS không dùng được trong `@media`, nên viết `1024px` trực tiếp).

## Thay đổi so với token cũ
Màu, bo góc, chuyển động giữ nguyên giá trị.

| Thêm | Lý do |
|---|---|
| `--text-*`, `--leading-*`, `--weight-*` | Thay cỡ chữ ghi cứng |
| `--space-*` (2…48) và token theo vai trò `--page-x/top/bottom/gap`, `--title-gap`, `--section-gap`, `--card-gap`, `--card-pad`, `--row-pad-y` | Lề ngang lẫn 12/16/20/24; chốt 20 mobile / 32 desktop |
| `--content-max`, `--form-max`, `--guardian-max` | Bề rộng nội dung |
| `--radius-sheet` | Bo góc sheet 20 |
| `--shadow-sm/menu/frame/fab`, `--focus-ring` | Bóng ghi cứng |
| `--z-raised/sticky/tabbar/fab/menu/overlay/toast` | Thay z-index tự do 1…1000 |
| `--tap-desktop`, `--control-h`, `--button-h-*`, `--button-min-w-desktop` | Kích thước nút/ô nhập |
| `--safe-*`, `--tabbar-total` | Safe-area PWA; `--tabbar-total` = 0 trên desktop |
| `--fab-*`, `--fab-pad`, `:root[data-has-fab]` | FAB neo màn hình và chừa đáy nội dung |
| `--dur-press` | Thay 100ms ghi cứng |
| `--state-selected-*`, `--state-hover-bg`, `--state-pressed-bg`, `--state-focus-ring`, `--state-disabled-opacity`, `--state-success-*`, `--state-error-*`, `--state-pending-*` | Trạng thái thành phần dùng chung; bảng ở `design/ux-v2/rules.md` mục 6. Giá trị lấy từ token màu có sẵn |
| `--dur-loading-min` 400ms, `--dur-success-hold` 1600ms | Loading tối thiểu và thời gian giữ "Đã lưu" |
| `--empty-mascot` 96px, `--empty-mascot-compact` 56px | Cỡ Mít trong `EmptyState` |

| Đổi | Trước → sau |
|---|---|
| Mốc FAB đổi vị trí | 900px → 1024px |
| z-index FAB | 9 → `--z-fab` (30) |
| Tab dưới | `--tabbar-height` + safe-area → `--tabbar-total` |
