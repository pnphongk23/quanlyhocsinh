# Quy tắc UX v2 (prototype → web/iOS)

Áp dụng cho `design/prototype` và web thật (`src/`). Ba mốc khổ: **mobile < 640px**, **tablet 640–1023px**, **desktop ≥ 1024px**.

## 1. Tầng và mốc

Bốn tầng, tầng dưới không biết tầng trên, tầng trên không tự vẽ lại tầng dưới.

| Tầng | Nơi | Được biết mốc? |
|---|---|---|
| 1 Token | `design/tokens/tokens.{css,json}` → chép `src/shared/styles/tokens.css` | **Có.** Chỉ khối `:root` đổi token mật độ ở `@media (min-width: 640px)` và `@media (min-width: 1024px)` |
| 2 Component cơ bản | `src/shared/ui/` (Button, Field/Input, Card, ListRow, Pill/Badge, Chip, Segmented, Sheet, Modal/Dialog, EmptyState, ActionFooter, PageHeader…) | **Không.** Chỉ dùng `(hover: hover)`, `(pointer: fine)`, `prefers-reduced-motion`, `@container` |
| 3 Khung + mẫu trang | `src/shared/layout/` (AppShell, PageShell, FormPage, MasterDetailPage, ListPage, TablePage, CalendarPage) + `useLayout()` | **Có.** Nơi DUY NHẤT được `@media` theo bề rộng hoặc hỏi khổ màn hình |
| 4 Màn | `src/features/**`, `src/roles/**` | **Không.** Chọn mẫu trang, điền slot; không tự viết header/breadcrumb, không tự dựng khung |

Quy tắc mốc:
- Biến CSS không dùng được trong `@media`, nên số mốc (`640px`, `1024px`) viết trực tiếp và **chỉ** ở tầng 1 (khối `:root`) và tầng 3 (`src/shared/layout/**`).
- Màn hình cần biết khổ (vd. chi tiết dạng push hay sheet) nhận qua prop/slot của mẫu trang, hoặc `useLayout()` của tầng 3 — chỉ cho **hành vi**, không cho style.
- Component cơ bản không được đổi bố cục theo bề rộng; cái gì co giãn theo chỗ chứa thì dùng `@container`.
- Tablet dùng bố cục riêng (rail icon), không phải "mobile rộng" hay "desktop hẹp".
- iPad cảm ứng ở ≥ 1024px nhận bố cục desktop nhưng vùng bấm vẫn 44 (xem mục 3).

Gate UI (áp cho mọi việc UI web; chi tiết ở `ops/decisions.md`):
- **G1 Cấu trúc** (vitest, trong `npm test`): fail khi có `@media` theo bề rộng ngoài `src/shared/layout/**` + `src/shared/styles/tokens.css`; hoặc gọi `useIsDesktop`/`matchMedia` theo bề rộng ngoài `src/shared/layout/**`; hoặc ghi cứng màu (`#hex`, `rgb(`, `hsl(`) / `font-size`, `padding`, `margin`, `gap` số px ngoài token (cho phép `0`, `1px` viền, `%`, `fr`); hoặc file route của màn không render qua `PageShell`/mẫu trang. Ngoại lệ tạm ghi ở `src/test/layoutAllowlist.ts`, chỉ được giảm.
- **G2 Bố cục tự động** (Playwright local, `npm run test:layout`) ở 390×844, 834×1112, 1440×900: không tràn ngang (`scrollWidth ≤ clientWidth`); breadcrumb/tiêu đề/nội dung lệch lề trái ≤ 1px; không vùng trống > 20% bề rộng trong khung nội dung; nút desktop rộng theo nội dung (không nút nào ≥ 90% cột khi không phải ô nhập); vùng bấm ≥ 44 (390/834) và ≥ 36 (1440, pointer fine); không chữ bị cắt; điều hướng đúng (390 tab bar, 834 rail, 1440 sidebar).
- **G3 Ảnh**: mọi trạng thái bị đổi × 3 khổ, lưu `/tmp/qlh-evidence/ql-004/<màn>/<trạng thái>-<khổ>.png` (không commit). Thiếu một khổ = trượt.
- **G4 Reviewer độc lập** (model khác) chấm ảnh 3 khổ theo tài liệu này + phạm vi ảnh hưởng (mọi màn dùng component bị đổi) → PASS.

## 2. Khung và mẫu trang

**Nguyên tắc lề.** Trong khung nội dung, breadcrumb · tiêu đề · hành động · nội dung nằm **cùng một cột trái**, cùng lề trái, `max-width: var(--page-max)`, **không** `margin-inline: auto` cho nội dung. Padding ngang của cột là `--page-x` (16 mobile / 24 tablet / 32 desktop). **Bỏ** quy tắc cũ "trang form/cài đặt: thẻ ≤ 640px căn giữa": form và trang cài đặt dùng cột `max-width: var(--form-max)` **căn trái**, trùng lề tiêu đề.

**Khoảng cách theo mốc** (giá trị nằm ở token, không ghi số trong màn):

| Token | mobile < 640 | tablet 640–1023 | desktop ≥ 1024 |
|---|---|---|---|
| `--page-x` | 16 | 24 | 32 |
| `--page-top` / `--page-bottom` | 12 / 16 | 16 / 20 | 28 / 28 |
| `--title-gap` | 16 | 20 | 24 |
| `--section-gap` | 24 | 28 | 32 |
| `--card-pad` | 16 | 18 | 20 |
| `--card-gap` | 12 | 14 | 16 |
| `--page-gap` | 12 | 16 | 20 |

Thang khoảng cách: 4/8/12/14/16/18/20/24/28/32/48 (`--space-*`). Không dùng số px tự do.

**AppShell.** Một nguồn mục điều hướng duy nhất (`navItems`) dựng cả ba khung:
- mobile (< 640): thanh tab dưới, icon + nhãn, mục đang chọn đổi màu chữ + gạch trên; màn chi tiết ẩn thanh tab (`data-staff-detail`).
- tablet (640–1023): rail icon bên trái, rộng `--rail-w` (72), nhãn ngắn dưới icon, mỗi mục ≥ 44; không có thanh tab dưới.
- desktop (≥ 1024): sidebar `--sidebar-width` (248) — brand, chọn lớp, nhóm mục con của lớp, rồi Lớp · Lịch · Cài đặt.
- Không màn nào tự dựng lại điều hướng; thêm mục = thêm vào `navItems`.

**PageShell.** Slot `breadcrumb?`, `eyebrow?`, `title`, `actions?`, `children`, `backTo?`. Breadcrumb, tiêu đề, hành động và nội dung cùng cột trái; khoảng tiêu đề → nội dung là `--title-gap`. Mobile: breadcrumb thay bằng nút quay lại, hành động đầu trang thu vào hàng tiêu đề hoặc thanh đáy. Tablet/desktop: breadcrumb một dòng, không xuống hàng, không lệch lề.

**FormPage.** Cột form `max-width: var(--form-max)`, căn trái. Trang **Cài đặt (menu hồ sơ + các mục)** và Email/Đổi mật khẩu dùng đúng cột này, không kéo tới `--page-max`. Ô nhập cao `--control-h`, chữ ≥ `--text-base` (16px). Nút cuối form căn phải theo lề form và rộng theo nội dung (tablet/desktop); mobile nút chính ghim đáy (thanh đáy tràn ngang, cộng safe-area).

**MasterDetailPage.** Một mẫu cho "danh sách + chi tiết":
- desktop: `grid-template-columns: minmax(0, 1fr) var(--detail-w)`; panel phải `position: sticky`, `top: var(--page-top)`, không đè lên danh sách.
- tablet: danh sách/bảng giữ một cột, chi tiết là **sheet bên phải** phủ lên (rộng theo nội dung, tối đa ~ nửa màn).
- mobile: chi tiết **push màn mới** hoặc **sheet đáy** (`mobileDetail="push" | "sheet"`); chọn một kiểu cho cả luồng, không trộn.
- Sheet/dialog phủ **lên** thanh tab/rail (`z-index` = `--z-overlay`, cao hơn `--z-tabbar`) và scrim phủ cả khung điều hướng. Thân sheet cuộn riêng; header/footer nền đặc nên nội dung không lộ ra dưới footer; footer cộng `--safe-bottom`.
- Chọn dòng = nền `--state-selected-bg`, không viền.

**ListPage / TablePage / CalendarPage** (goal sau, chỉ để đặt chỗ trong `src/shared/layout`):
- `ListPage`: lưới thẻ `repeat(auto-fill, minmax(300px, 1fr))` qua container query, gap `--card-gap`; mobile một cột.
- `TablePage`: desktop/tablet bảng thật (tablet cuộn ngang **trong khung**, không tràn trang); mobile chuyển thành danh sách `ListRow`.
- `CalendarPage`: desktop lịch tuần + panel buổi bên phải; tablet lịch tuần gọn; mobile danh sách theo ngày.
- Bảng (mọi mốc): cột chữ dài lấy phần dư, cột số/trạng thái theo nội dung (`width: 1%; white-space: nowrap`); không để cột trống > 20% bề rộng. Đổi thứ tự dòng bằng **tay nắm kéo** (icon nhỏ, vùng bấm đủ 44) + menu hàng "Lên/Xuống" (hỗ trợ bàn phím); **không** dùng cặp nút mũi tên to đặt trong hàng.
- Danh sách thẻ (lớp, con): lưới `repeat(auto-fill, minmax(300px, 1fr))`, gap `--card-gap`.
- Thẻ thống kê: gom nhiều số vào một hàng, không để một con số chiếm cả hàng.

**Điểm danh mobile (< 640)** — theo app hiện tại: mỗi em là **một hàng** (avatar chữ tắt 2 chữ cuối của tên, tên wrap được, **MỘT chip trạng thái** bên phải chứa cả hàng, vùng bấm ≥ 44; bấm chip xoay vòng chưa điểm danh → Có mặt → Vắng → Muộn, màu theo `--state-success/pending/error-*`, chưa điểm danh dùng `--color-neutral-soft`). Trên danh sách: hàng tóm tắt "N vắng mặt" (hoặc "Chưa điểm danh N em" khi chưa ai được điểm danh) + nút phụ "Tất cả có mặt"; dưới danh sách: khối "Cần chú ý"; "Lưu điểm danh" ghim đáy (cộng `--safe-bottom`, nằm trên thanh tab). Tablet/desktop giữ bảng 3 nút trạng thái.

**Bộ tiêu chí** là màn chuẩn của `MasterDetailPage` + `TablePage`: desktop bảng (Thứ tự · Tên · Mặc định · BTVN · thao tác), mỗi hàng chỉ hiện "Mặc định: <mức>" theo dữ liệu tiêu chí; không lặp cả ba mức trong bảng. Panel sửa phải sticky khi đang sửa; tablet bảng + panel sheet phải; mobile danh sách + sheet đáy (đổi thứ tự trong sheet). Mỗi bộ chỉ **một** tiêu chí được "Theo chấm BTVN". Ảnh mẫu ở `design/responsive-mock/`.

## 3. Nút

- Desktop/tablet: nút luôn rộng theo nội dung (`width: auto`, `min-width: var(--button-min-w-desktop)`), kể cả `size="lg"`. Không có nút trải hết chiều ngang ở desktop/tablet (trừ ô nhập).
- Nhóm hành động: hành động chính bên phải, phụ ở trái nó (`Huỷ` · `Lưu`); ở cuối form căn phải theo lề form; ở đầu trang nằm cùng hàng tiêu đề.
- Mobile: nút chính ở đáy màn/sheet được tràn ngang như hiện tại; nút trong thẻ theo nội dung. Thanh hành động đáy **luôn ghim đáy màn** (kể cả khi nội dung ngắn) và cộng safe-area; vùng cuộn đệm đáy `--sticky-clearance`. Khi đang dính giữa danh sách dài, thanh nằm đúng `--sticky-bottom`; khi nội dung ngắn hoặc cuộn hết, thanh nằm trong luồng nên cách đáy thêm `--page-bottom` (16px) — chênh lệch đã biết, giữ nguyên để không bỏ đệm trang.
- Ô nhập chữ trên mobile: cỡ chữ ≥ 16px (`--text-base`) để iOS Safari không tự phóng to trang khi focus; không dùng `maximum-scale`/`user-scalable=no`.
- Vùng bấm ≥ 44px mặc định trên mọi thiết bị cảm ứng ở **cả ba mốc** (kể cả iPad dùng bố cục desktop ≥ 1024px); chỉ `@media (pointer: fine)` (chuột/bút) mới dùng ≥ 36px.

## 4. Chuyển động (CSS thuần, không thư viện)
Token (thêm vào `tokens.css`):
```
--dur-fast: 150ms;   /* hover, nhấn, đổi màu */
--dur-base: 200ms;   /* tab, expand, chuyển trang */
--dur-slow: 250ms;   /* sheet, dialog */
--ease-out: cubic-bezier(0.2, 0, 0, 1);     /* vào */
--ease-in: cubic-bezier(0.4, 0, 1, 1);      /* ra */
--ease-standard: cubic-bezier(0.2, 0, 0.2, 1);
```
- Chuyển trang: nội dung mới vào bằng `opacity 0→1` + `translateY(8px→0)` trong `--dur-base` `--ease-out`; không animate trang cũ ra (tránh giật). Trang chi tiết trên mobile (đi sâu): `translateX(16px→0)`.
- Tab (thanh tab lớp, segmented, tab phụ huynh): gạch/nền chỉ báo trượt tới tab mới (`transform` theo vị trí đo bằng JS hoặc `view-transition-name` nếu đơn giản hơn); nội dung tab mới fade 150ms.
- Expand/collapse: dùng `grid-template-rows: 0fr → 1fr` + `opacity`, `--dur-base`; mũi tên xoay 180°.
- Sheet mobile: vào `translateY(100%→0)` `--dur-slow` `--ease-out`, ra `--dur-base` `--ease-in`; nền mờ fade. Dialog desktop: `scale(0.96→1)` + fade. Đóng phải chạy hết animation rồi mới `dialog.close()`.
- Phản hồi nhấn: `transform: scale(0.98)` 100ms cho nút/thẻ bấm được.
- Chỉ animate `transform` và `opacity` (trừ `grid-template-rows` cho expand).
- `@media (prefers-reduced-motion: reduce)`: mọi thời lượng về ~0 (đặt token = `1ms`), không trượt; giữ thay đổi trạng thái tức thì.

## 5. Phân cấp thông tin
- Mỗi màn một tiêu đề chính; dòng phụ (lớp · tháng) phía trên tiêu đề cỡ 13px màu muted.
- Trạng thái (Mới, Đã phát hành, Thiếu dữ liệu) dùng Pill ở cạnh phải hàng, không đè chữ.
  - Ngoại lệ có chủ đích (web, danh sách phiếu ở tab Nhận xét của buổi): hàng có hai nhãn ("Vắng" + trạng thái phiếu) thì nhãn xuống dòng phụ ngay dưới tên, để tên học sinh không bị cắt thành "…"; cả danh sách dùng cùng một cách nên không lệch hàng.

## 6. Trạng thái thành phần
Chỉ dùng token `--state-*` (định nghĩa ở `design/tokens/`), không ghi cứng màu. Một loại thành phần = một cách thể hiện mỗi trạng thái ở mọi màn. Cột hover chỉ có khi `@media (hover: hover)` (component cơ bản bọc đúng như vậy, không theo bề rộng).

| Loại | default | hover (desktop) | pressed | focus-visible | selected | disabled | loading | success | error | empty |
|---|---|---|---|---|---|---|---|---|---|---|
| Nút chính | nền `--color-primary`, chữ `--color-on-primary` | giữ màu | `scale(0.98)` `--dur-press` | `--state-focus-ring` | không áp dụng | nền `--color-neutral-soft`, chữ `--color-muted` | giữ nền + bề rộng, nhãn ẩn, vòng quay | nền `--state-success-bg`, chữ `--state-success-fg`, dấu check + "Đã lưu" | nút về default, lỗi ở dòng/`SaveStatus` bằng `--state-error-*` | không áp dụng |
| Nút phụ | nền `--color-primary-soft`, chữ `--color-primary-ink` | nền `--state-hover-bg` | `scale(0.98)`, nền `--state-pressed-bg` | `--state-focus-ring` | không áp dụng | như nút chính | như nút chính (màu phụ) | như nút chính | như nút chính | không áp dụng |
| Nút nguy hiểm | nền `--state-error-bg`, chữ `--state-error-fg` | nền `--state-pressed-bg` | `scale(0.98)` | `--state-focus-ring` | không áp dụng | như nút chính | giữ màu, nhãn ẩn, vòng quay | không áp dụng (đóng hộp xác nhận) | giữ hộp mở, báo lỗi | không áp dụng |
| Nav item | chữ `--color-muted`, nền trong | nền `--state-hover-bg` | nền `--state-pressed-bg` | `--state-focus-ring` | nền `--state-selected-bg`, chữ `--state-selected-fg`, không viền | `--state-disabled-opacity` | không áp dụng | không áp dụng | không áp dụng | không áp dụng |
| Thẻ chọn được | nền `--color-surface` | nền `--state-hover-bg` | `scale(0.98)` | `--state-focus-ring` | nền `--state-selected-bg`, không viền/outline | `--state-disabled-opacity` | khung xương (nội dung đang tải) | không áp dụng | khối lỗi `--state-error-*` + thử lại | `EmptyState` |
| Chip / Segmented | nền trong / track `--color-border`, chữ `--color-muted` | nền `--state-hover-bg` | `scale(0.98)` | `--state-focus-ring` | nền `--state-selected-bg`, chữ `--state-selected-fg`, không viền | `--state-disabled-opacity`, `aria-disabled` | không áp dụng | không áp dụng | không áp dụng | không áp dụng |
| Hàng danh sách | nền `--color-surface` | nền `--state-hover-bg` | nền `--state-pressed-bg` | `--state-focus-ring` | nền `--state-selected-bg`, không viền | `--state-disabled-opacity` | khung xương | không áp dụng | dòng lỗi `--state-error-*` + thử lại | `EmptyState` `compact` |
| Ô nhập | viền `--color-input-border` | viền `--color-input-border-strong` | không áp dụng | viền `--color-primary` + `--state-focus-ring` | không áp dụng | `--state-disabled-opacity`, nền `--color-neutral-soft` | không áp dụng | không đổi (báo ở nút lưu) | viền `--state-error-fg`, chữ lỗi `--state-error-fg`, giữ giá trị đã nhập | placeholder `--color-placeholder` |
| Ô bảng điểm | nền `--color-surface` | nền `--state-hover-bg` | không áp dụng | `--state-focus-ring` | ô đang sửa: nền `--state-selected-bg` | `--state-disabled-opacity` (buổi khóa) | không áp dụng | không đổi (báo ở `SaveStatus`) | nền `--state-error-bg`, giữ giá trị, báo lỗi | ô trống hiện "–" `--color-placeholder` |
| Dialog / sheet | nền `--color-surface`, scrim `--color-scrim` | không áp dụng | không áp dụng | vòng focus ở nút đầu | không áp dụng | nút khoá theo nút | nút lưu loading, không đóng | chờ hết loading rồi đóng; `SaveStatus` báo | giữ mở + giữ giá trị, nút về default để thử lại | `EmptyState` trong thân |

Quy tắc:
- **Selected = nền, không viền.** Chỉ `--state-selected-bg` + `--state-selected-fg`; không `border`/`outline` để báo đã chọn. Focus-visible là vòng riêng (`--state-focus-ring`), không thay cho selected.
- **Loading tối thiểu 400 ms** (`--dur-loading-min`) cho lưu cục bộ: dữ liệu ghi ngay, chỉ trạng thái `saving` được giữ đủ thời gian để người dùng thấy.
- **Thành công**: nút hiện "Đã lưu" kèm dấu check trong 1,6 s (`--dur-success-hold`) rồi về default. Báo bằng `aria-live="polite"`.
- **Lỗi**: giữ dữ liệu người dùng đã nhập, giữ editor mở, nút về default để thử lại; không tự đóng.
- **Chờ đồng bộ**: dữ liệu đã lưu trên máy nhưng chưa đẩy lên: `SaveStatus` hiện pill "Chờ đồng bộ" (`--state-pending-*`) khi kéo dài hơn 1 s; khi offline hiện "Đã lưu trên máy · sẽ đồng bộ khi có mạng".
- **Empty duy nhất có Mít**: chỉ `EmptyState` (Mít + tiêu đề + mô tả + hành động tuỳ chọn), **một kiểu dùng chung**: nội dung **căn giữa** trong thẻ ở mọi khổ, thẻ không rộng quá `--form-max` (tránh vùng trống > 20% bên trong khối). Khung nhỏ/lọc rỗng dùng `size="compact"` (`--empty-mascot-compact`); mặc định `--empty-mascot`. Không tự viết empty khác, không dùng Mít ở chỗ khác ngoài empty/trạng thái chờ và khung sao của phiếu nhận xét (dáng `sao-0`…`sao-5` theo số sao, cỡ `--empty-mascot-compact`).

## 7. Danh sách việc còn dở
- Mục việc còn dở (vd. "Việc còn dở" ở trang Lớp), đã chốt 2026-10-30, web và iOS giống nhau: mặc định chỉ hiện tối đa 2 việc tính chung mọi nhóm, ưu tiên theo thứ tự Điểm danh → Phiếu → BTVN. Mỗi dòng gồm tiêu đề loại việc và dòng phụ "lớp · ngày". Bên dưới có nút chữ "Xem thêm (N)" với N là tổng số việc còn lại; bấm thì mở danh sách đầy đủ (có thể gộp theo nhóm) và có "Thu gọn" để gập lại.
- "Gán tất cả mặc định" dùng kiểu **Nút phụ** (mục 6): nền `--color-primary-soft`, chữ `--color-primary-ink`.
