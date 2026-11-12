# Design token

Nguồn chuẩn: `tokens.css` và `tokens.json` (cùng giá trị, sửa cả hai). `ios-mapping.md` ghi token tương ứng trong `Tokens.swift`.

## Đồng bộ
- Web: chép từ dòng `:root {` đến hết file của `tokens.css` sang `src/shared/styles/tokens.css`, giữ ba khối `@font-face` ở đầu file đó.
- Prototype: chép cùng khối sang `design/prototype/src/shared/styles/tokens.css`.
- Mốc khổ: mobile < 640px, tablet 640–1023px, desktop ≥ 1024px. `:root` (mobile) là mặc định, khối `@media (min-width: 640px)` là tablet, `@media (min-width: 1024px)` là desktop. Biến CSS không dùng được trong `@media` nên số mốc viết trực tiếp; chỉ tầng token và `src/shared/layout` được dùng `@media` theo bề rộng. `--bp-tablet` / `--bp-desktop` chỉ để tài liệu. Token `tablet`/`desktop` trong `tokens.json` là bản ghi lại hai khối ghi đè đó.

## Thay đổi so với token cũ
Màu thương hiệu, bo góc và chuyển động giữ nguyên. Trạng thái dùng nền mềm với chữ đậm; thẻ trạng thái có token nền, viền và chữ riêng. Thẻ lớp được chọn dùng token accent riêng để giữ độ tương phản.

| Thêm | Lý do |
|---|---|
| `--text-*`, `--leading-*`, `--weight-*` | Thay cỡ chữ ghi cứng |
| `--space-*` (2…48) và token theo vai trò `--page-x/top/bottom/gap`, `--title-gap`, `--section-gap`, `--card-gap`, `--card-pad`, `--row-pad-y` | Lề ngang lẫn 12/16/20/24; mật độ ba mốc: mobile 16/12/16/24/12/16, tablet 24/16/20/28/14/18, desktop 32/28/28/32/16/20 |
| `--space-14`, `--space-18`, `--space-28` | Giá trị mật độ tablet (14/18/28) phải có trong thang trước khi dùng |
| `--page-max` 1200px, `--detail-w` 380px, `--rail-w` 72px | Cột nội dung căn trái, panel chi tiết desktop, rail icon tablet; `--content-max` giữ làm bí danh của `--page-max` |
| `--content-max`, `--form-max`, `--guardian-max` | Bề rộng nội dung |
| `--radius-sheet` | Bo góc sheet 20 |
| `--shadow-sm/menu/frame/fab`, `--focus-ring` | Bóng ghi cứng |
| `--z-raised/sticky/tabbar/fab/menu/overlay/toast` | Thay z-index tự do 1…1000 |
| `--tap-desktop`, `--control-h`, `--button-h-*`, `--button-min-w-desktop` | Kích thước nút/ô nhập |
| `--safe-*`, `--tabbar-total`, `--sticky-bottom`, `--sticky-clearance` | Safe-area PWA; `--tabbar-total` = 0 trên desktop. `--sticky-clearance` là đệm đáy vùng cuộn khi có thanh hành động dính (`--sticky-bottom` + `--page-bottom`), thanh nằm trong luồng nên chiều cao thanh đã tính sẵn; nhờ vậy mép thanh không đè dòng cuối khi cuộn hết trên iPhone có safe-area |
| `--fab-*`, `--fab-pad`, `:root[data-has-fab]` | FAB neo màn hình và chừa đáy nội dung |
| `--dur-press` | Thay 100ms ghi cứng |
| `--state-selected-*`, `--state-hover-bg`, `--state-pressed-bg`, `--state-focus-ring`, `--state-disabled-opacity`, `--state-success-*`, `--state-error-*`, `--state-pending-*` | Trạng thái thành phần dùng chung; bảng ở `design/ux-v2/rules.md` mục 6 |
| `--color-star` | Một màu sao dùng chung cho danh sách, phiếu nhận xét (cũ và 3 mức) và màn phụ huynh |
| `--color-on-accent`, `--state-selected-accent-*` | Chữ trắng và chip tối trong thẻ lớp được chọn trên nền accent; không đổi màu chọn chung của nav, lịch và chip |
| `--card-success-*`, `--card-error-*`, `--card-pending-*`, `--card-info-*` | Nền mềm, viền và chữ đậm cho card/banner trạng thái lớn |
| `--dur-loading-min` 400ms, `--dur-success-hold` 1600ms, `--dur-error-hold` 4800ms | Loading tối thiểu, thời gian giữ "Đã lưu" và thông báo lỗi của "Tải lại" |
| `--dialog-action-gap`, `--textarea-min`, `--chip-grid-min`, `--date-col`, `--row-chevron-size` | Khoảng nút hộp xác nhận, kích thước nhập nhiều dòng, chip, cột ngày và mũi tên cuối dòng |
| `--empty-mascot` 96px, `--empty-mascot-compact` 56px | Cỡ Mít trong `EmptyState` |
| `--criteria-check-size` 20px, `--criteria-check-icon-size` 12px, `--comment-star-size` 24px | Kích thước tick tiêu chí và sao trong phiếu nhận xét |
| `--level-row-icon-size` 20px, `--level-row-label-min` 9rem, `--level-chick-size` 28px | Icon, nhãn và cỡ đầu gà của phiếu 3 mức (thử nghiệm sau cờ) |
| `--focus-ring-offset` 1px | Khoảng cách vòng focus của ô/nút |
| `--textarea-min` 200px, `--chip-grid-min` 132px, `--date-col` 64px, `--row-chevron-size` 12px | Hộp dán nhiều dòng, chip tên ở "Theo tiêu chí", cột ngày thẻ buổi học phụ huynh, mũi tên cuối thẻ dòng (thêm cho iOS, web chưa bắt buộc dùng) |
| `--grid-col-name-min/max`, `--grid-col-test-max`, `--grid-cell-input-min`, `--grid-resize-step` | Độ rộng cột và bước kéo của bảng điểm |

| Đổi | Trước → sau |
|---|---|
| Mốc khổ | 2 mốc (mobile < 1024, desktop ≥ 1024) → 3 mốc (mobile < 640, tablet 640–1023, desktop ≥ 1024) |
| `--page-x` mobile | 20px → 16px (tablet 24, desktop 32 như cũ) |
| `--title-gap`, `--section-gap`, `--card-pad`, `--card-gap` | 16/24/16/12 chỉ hai mốc → ba mốc 16-20-24 / 24-28-32 / 16-18-20 / 12-14-16 |
| `--tabbar-total` | 0 chỉ ở desktop → 0 ở tablet và desktop (tablet dùng rail, không có thanh tab dưới) |
| `--page-top`, `--page-bottom`, `--page-gap` | 12/16/12 (mobile) và 28/28/20 (desktop) → thêm mốc tablet 16/20/16 |
| Cột nội dung trang form | thẻ ≤ 640 căn giữa → cột `--form-max` CĂN TRÁI cùng lề tiêu đề/breadcrumb |
| Mốc FAB đổi vị trí | 900px → 1024px |
| z-index FAB | 9 → `--z-fab` (30) |
| Tab dưới | `--tabbar-height` + safe-area → `--tabbar-total` |
| `--state-selected/success/error/pending-*` | Nền mềm + chữ đậm cho trạng thái; thẻ lớp được chọn dùng `--state-selected-accent-*`; card dùng cặp token `--card-*-*` nền mềm + viền/chữ đậm |

**Bản chép web và prototype đã đồng bộ trong worktree `mvp-web`; mapping iOS là tài liệu, chưa áp dụng vào `Tokens.swift`.**

**QL-004 Pha 1 (2026-11-10):** ba mốc và token mật độ mới chỉ nằm ở `design/tokens/` (bản chuẩn) — chưa chép sang `src/shared/styles/tokens.css` và `design/prototype/src/shared/styles/tokens.css` vì đang chờ chủ duyệt ảnh mẫu. Pha 2 chép đúng khối `:root` + hai khối `@media` như mục "Đồng bộ" ở trên.
