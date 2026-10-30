# Quy tắc UX v2 (prototype → web/iOS)

Áp dụng cho `design/prototype`. Mốc khổ: mobile < 1024px, desktop ≥ 1024px (giữ mốc hiện có).

## 1. Bố cục desktop
- Vùng nội dung (bên phải sidebar) có `max-width: 1200px`, căn trái theo lề sidebar, padding ngang 32px. Trang form/cài đặt đơn lẻ: thẻ ≤ 640px căn giữa vùng nội dung.
- Danh sách thẻ (lớp, con): lưới `repeat(auto-fill, minmax(300px, 1fr))`, gap 16px.
- Danh sách + chi tiết: khi chọn một mục mà chi tiết ngắn (báo cáo, bài kiểm tra, học sinh) thì dùng hai cột `minmax(0,1fr) 380px`; panel phải dính (`position: sticky; top: 24px`).
- Bảng: cột chữ dài lấy phần dư, cột số/trạng thái theo nội dung (`width: 1%; white-space: nowrap`). Không để cột trống > 20% bề rộng.
- Thẻ thống kê: gom nhiều số vào một hàng; không để một con số chiếm cả hàng.

## 2. Nút
- Desktop: nút luôn rộng theo nội dung (`width: auto`, `min-width: 96px`), kể cả `size="lg"`. Không có nút trải hết chiều ngang ở desktop.
- Nhóm hành động: hành động chính bên phải, phụ ở trái nó (`Huỷ` · `Lưu`); ở cuối form căn phải theo lề form; ở đầu trang nằm cùng hàng tiêu đề.
- Mobile: nút chính ở đáy màn/sheet được tràn ngang như hiện tại; nút trong thẻ theo nội dung.
- Vùng bấm ≥ 44px trên mobile, ≥ 36px trên desktop.

## 3. Khoảng cách
- Thang 4/8/12/16/24/32/48. Trong thẻ 16 (mobile) / 20 (desktop); giữa thẻ 12 / 16; giữa khối trang 24 / 32.
- Tiêu đề trang cách nội dung 16 (mobile) / 24 (desktop).

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

## 6. Trạng thái thành phần
Chỉ dùng token `--state-*` (định nghĩa ở `design/tokens/`), không ghi cứng màu. Một loại thành phần = một cách thể hiện mỗi trạng thái ở mọi màn.

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
- **Empty duy nhất có Mít**: chỉ `EmptyState` (Mít + tiêu đề + mô tả + hành động tuỳ chọn). Khung nhỏ/lọc rỗng dùng `size="compact"` (`--empty-mascot-compact`); mặc định `--empty-mascot`. Không tự viết empty khác, không dùng Mít ở chỗ khác ngoài empty/trạng thái chờ và khung sao của phiếu nhận xét (dáng `sao-0`…`sao-5` theo số sao, cỡ `--empty-mascot-compact`).

## 7. Danh sách việc còn dở
- Mục việc còn dở (vd. "Việc còn dở" ở trang Lớp), đã chốt 2026-10-30, web và iOS giống nhau: mặc định chỉ hiện tối đa 2 việc tính chung mọi nhóm, ưu tiên theo thứ tự Điểm danh → Phiếu → BTVN. Mỗi dòng gồm tiêu đề loại việc và dòng phụ "lớp · ngày". Bên dưới có nút chữ "Xem thêm (N)" với N là tổng số việc còn lại; bấm thì mở danh sách đầy đủ (có thể gộp theo nhóm) và có "Thu gọn" để gập lại.
- "Gán tất cả mặc định" dùng kiểu **Nút phụ** (mục 6): nền `--color-primary-soft`, chữ `--color-primary-ink`.
