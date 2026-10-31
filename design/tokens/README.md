# Design token

Nguồn chuẩn: `tokens.css` và `tokens.json` (cùng giá trị, sửa cả hai). `ios-mapping.md` ghi token tương ứng trong `Tokens.swift`.

## Đồng bộ
- Web: chép từ dòng `:root {` đến hết file của `tokens.css` sang `src/shared/styles/tokens.css`, giữ ba khối `@font-face` ở đầu file đó.
- Prototype: chép cùng khối sang `design/prototype/src/shared/styles/tokens.css`.
- Mốc khổ: mobile < 1024px, desktop >= 1024px (biến CSS không dùng được trong `@media`, nên viết `1024px` trực tiếp).

## Thay đổi so với token cũ
Màu thương hiệu, bo góc và chuyển động giữ nguyên. Trạng thái dùng nền mềm với chữ đậm; thẻ trạng thái có token nền, viền và chữ riêng. Thẻ lớp được chọn dùng token accent riêng để giữ độ tương phản.

| Thêm | Lý do |
|---|---|
| `--text-*`, `--leading-*`, `--weight-*` | Thay cỡ chữ ghi cứng |
| `--space-*` (2…48) và token theo vai trò `--page-x/top/bottom/gap`, `--title-gap`, `--section-gap`, `--card-gap`, `--card-pad`, `--row-pad-y` | Lề ngang lẫn 12/16/20/24; chốt 20 mobile / 32 desktop |
| `--content-max`, `--form-max`, `--guardian-max` | Bề rộng nội dung |
| `--radius-sheet` | Bo góc sheet 20 |
| `--shadow-sm/menu/frame/fab`, `--focus-ring` | Bóng ghi cứng |
| `--z-raised/sticky/tabbar/fab/menu/overlay/toast` | Thay z-index tự do 1…1000 |
| `--tap-desktop`, `--control-h`, `--button-h-*`, `--button-min-w-desktop` | Kích thước nút/ô nhập |
| `--safe-*`, `--tabbar-total`, `--sticky-bottom`, `--sticky-clearance` | Safe-area PWA; `--tabbar-total` = 0 trên desktop. `--sticky-clearance` là đệm đáy vùng cuộn khi có thanh hành động dính (`--sticky-bottom` + `--page-bottom`), thanh nằm trong luồng nên chiều cao thanh đã tính sẵn; nhờ vậy mép thanh không đè dòng cuối khi cuộn hết trên iPhone có safe-area |
| `--fab-*`, `--fab-pad`, `:root[data-has-fab]` | FAB neo màn hình và chừa đáy nội dung |
| `--dur-press` | Thay 100ms ghi cứng |
| `--state-selected-*`, `--state-hover-bg`, `--state-pressed-bg`, `--state-focus-ring`, `--state-disabled-opacity`, `--state-success-*`, `--state-error-*`, `--state-pending-*` | Trạng thái thành phần dùng chung; bảng ở `design/ux-v2/rules.md` mục 6 |
| `--color-on-accent`, `--state-selected-accent-*` | Chữ trắng và chip tối trong thẻ lớp được chọn trên nền accent; không đổi màu chọn chung của nav, lịch và chip |
| `--card-success-*`, `--card-error-*`, `--card-pending-*` | Nền mềm, viền và chữ đậm cho card/banner trạng thái lớn |
| `--dur-loading-min` 400ms, `--dur-success-hold` 1600ms, `--dur-error-hold` 4800ms | Loading tối thiểu, thời gian giữ "Đã lưu" và thông báo lỗi của "Tải lại" |
| `--dialog-action-gap`, `--textarea-min`, `--chip-grid-min`, `--date-col`, `--row-chevron-size` | Khoảng nút hộp xác nhận, kích thước nhập nhiều dòng, chip, cột ngày và mũi tên cuối dòng |
| `--empty-mascot` 96px, `--empty-mascot-compact` 56px | Cỡ Mít trong `EmptyState` |
| `--criteria-check-size` 20px, `--criteria-check-icon-size` 12px, `--comment-star-size` 24px | Kích thước tick tiêu chí và sao trong phiếu nhận xét |
| `--textarea-min` 200px, `--chip-grid-min` 132px, `--date-col` 64px, `--row-chevron-size` 12px | Hộp dán nhiều dòng, chip tên ở "Theo tiêu chí", cột ngày thẻ buổi học phụ huynh, mũi tên cuối thẻ dòng (thêm cho iOS, web chưa bắt buộc dùng) |
| `--grid-col-name-min/max`, `--grid-col-test-max`, `--grid-cell-input-min`, `--grid-resize-step` | Độ rộng cột và bước kéo của bảng điểm |

| Đổi | Trước → sau |
|---|---|
| Mốc FAB đổi vị trí | 900px → 1024px |
| z-index FAB | 9 → `--z-fab` (30) |
| Tab dưới | `--tabbar-height` + safe-area → `--tabbar-total` |
| `--state-selected/success/error/pending-*` | Nền mềm + chữ đậm cho trạng thái; thẻ lớp được chọn dùng `--state-selected-accent-*`; card dùng cặp token `--card-*-*` nền mềm + viền/chữ đậm |

**Bản chép web và prototype đã đồng bộ trong worktree `mvp-web`; mapping iOS là tài liệu, chưa áp dụng vào `Tokens.swift`.**
