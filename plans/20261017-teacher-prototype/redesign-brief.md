# Brief giao việc: làm lại giao diện prototype giáo viên cho giống thiết kế, đổi điều hướng

Bạn là worker. Brief này tự đủ: không cần xem ảnh, mọi số đo và màu đều ghi ở dưới. Làm đúng thứ tự mục 6, mỗi bước xong thì tự kiểm rồi mới sang bước sau. Việc nào brief không nói rõ thì chọn cách đơn giản nhất, ghi vào báo cáo, đừng tự đổi nghiệp vụ.

Thư mục làm việc: `design/prototype/` (Vite + React 19 + TypeScript + React Router 7 + CSS Modules). Mọi lệnh `npm` chạy trong thư mục đó. Đường dẫn `src/...` trong brief là `design/prototype/src/...`.

---

## 0. Đọc trước khi làm

1. `AGENTS.md`, `docs/spec.md` (hết), `docs/architecture.md` ở gốc repo. Spec là nguồn chuẩn về nghiệp vụ. Thiết kế lệch spec thì theo spec.
2. Mã hiện tại trong `src/`. Điểm xuất phát đã kiểm: `npm run typecheck` sạch, `npm test` qua 25 test ở 7 file. Sau khi xong phải còn nguyên như vậy (cộng thêm test mới của bạn).

Nguyên nhân người dùng nói "không đúng prototype" (đã đối chiếu mã với thiết kế):

| Hiện tại | Thiết kế |
|---|---|
| `--color-primary` là `#1E43B8` (xanh đậm), dùng cho cả nút nền | Nút nền, tab đang chọn, viền chọn là `#2F5BEA`; `#1E43B8` chỉ dùng làm màu chữ trên nền xanh nhạt `#E8EEFE` |
| Card có viền 1px `#E6E9EE` | Card trắng, không viền, bo 16px |
| Font hệ thống (`-apple-system`) | Plus Jakarta Sans 400/500/600/700 |
| Chip xanh nhạt, cao 44px, bo tròn | Chip thống kê nền `#F6F7F9`, bo 10px, chữ 14px; pill trạng thái 13px/600 theo màu ngữ nghĩa |
| Nhiều CSS tự đặt mã màu cứng, mỗi file một kiểu | Một bộ token duy nhất |
| Desktop: nền trắng gần như phẳng | Desktop: nền canvas `#EAECF1`, khung app bo 16px bên trong (xem 2.4) |

---

## 1. Mục tiêu và tiêu chí nghiệm thu

### 1.1 Mục tiêu
Giao diện giáo viên (mobile < 1024px, desktop ≥ 1024px) khớp thiết kế về nền, màu, chữ, chip, nút, bố cục; điều hướng đổi thành 3 mục **Lớp, Lịch, Cài đặt**, trong mỗi lớp có tab con. Giữ nguyên nghiệp vụ và các bất biến đã làm.

### 1.2 Nghiệm thu (tất cả phải đạt, mỗi mục có cách kiểm)

| # | Tiêu chí | Cách kiểm |
|---|---|---|
| A1 | `npm run typecheck`, `npm run build`, `npm test` sạch, không bỏ qua test | Dán đầu ra cuối vào báo cáo |
| A2 | Không còn mã màu cứng ngoài `tokens.css` | Chạy lệnh ngay dưới bảng: không ra dòng nào (trừ `href="#noi-dung"`; `rgb(... / .06)` trong bóng đổ được phép) |
| A3 | Nền đúng: ở 390px `getComputedStyle(document.body).backgroundColor` = `rgb(246, 247, 249)`; ở 1280px body = `rgb(234, 236, 241)`, khung app = `rgb(246, 247, 249)`, sidebar = `rgb(255, 255, 255)` | Đo bằng trình duyệt |
| A4 | Nút chính ở mọi màn có nền `rgb(47, 91, 234)`; chữ link/nhãn tab con đang chọn đúng token mục 2 | Đo ít nhất: nút "+ Tạo lớp mới", tab con đang chọn, nút "Lưu điểm danh", tab dưới đang chọn |
| A5 | Font áp dụng: `getComputedStyle(body).fontFamily` bắt đầu bằng `"Plus Jakarta Sans"`, và `document.fonts.check('16px "Plus Jakarta Sans"')` trả `true` khi có mạng | Đo bằng trình duyệt |
| A6 | Card không có viền, bo 16px; chip thống kê bo 10px nền `rgb(246, 247, 249)`; pill bo 999px | Đo trên trang `/lop` |
| A7 | Thanh dưới (mobile) có đúng 3 mục Lớp, Lịch, Cài đặt; sidebar (desktop) đúng 3 mục như vậy | Mở 390px và 1280px |
| A8 | Mọi route ở mục 5 mở được ở 390px và 1280px, không lỗi console, không tràn ngang trang (`document.documentElement.scrollWidth <= innerWidth`; riêng bảng điểm được cuộn ngang trong khung của nó) | Mở từng route |
| A9 | Route cũ chuyển hướng đúng (bảng 5.2) | Mở từng route cũ |
| A10 | Mọi nút/ô nhập bấm được cao ≥ 44px | Duyệt bằng script đo (mục 6.12) |
| A11 | Bất biến nghiệp vụ còn nguyên (mục 7.3) | Thử tay từng điểm |

Lệnh cho A2 (chạy trong `design/prototype`):

```bash
grep -rnE "#[0-9a-fA-F]{3,8}([^0-9a-zA-Z-]|$)" src --include='*.css' --include='*.tsx' | grep -v "src/shared/styles/tokens.css"
```

Nếu không có công cụ mở trình duyệt, ghi đúng câu: "Tôi không thể xác minh A3–A10 bằng giao diện vì <lý do>" và đừng tuyên bố khớp thiết kế.

---

## 2. Design tokens

Trích nguyên văn từ `design/export/*.dc.html`. Chỉ `src/shared/styles/tokens.css` được chứa mã màu hex.

### 2.1 Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--color-canvas` | `#EAECF1` | Nền ngoài khung app, chỉ desktop (2.4). Ước lượng từ ảnh thiết kế, không có trong file `.dc.html` |
| `--color-bg` | `#F6F7F9` | Nền trang (mobile), nền khung app (desktop), chip thống kê, ô nhập điểm, vùng soạn nhận xét |
| `--color-surface` | `#FFFFFF` | Card, sidebar, thanh tab dưới, hàng danh sách, ô nhập |
| `--color-border` | `#E6E9EE` | Viền sidebar, viền trên thanh tab dưới, viền dưới tiêu đề bảng, nền rãnh của segmented |
| `--color-divider` | `#EEF0F3` | Đường kẻ giữa các hàng trong card/bảng |
| `--color-input-border` | `#D2D7DF` | Viền ô nhập mặc định, viền nút chọn lại |
| `--color-input-border-strong` | `#B7BEC9` | Viền ô điểm trống (nét đứt) |
| `--color-text` | `#14181F` | Chữ chính |
| `--color-muted` | `#4A5361` | Chữ phụ, nhãn tab chưa chọn, nhãn chip |
| `--color-placeholder` | `#8A93A0` | Placeholder |
| `--color-primary` | `#2F5BEA` | NỀN nút chính, tab con đang chọn, viền chọn (outline 2px), tab dưới đang chọn, nút chọn ngày đang bật |
| `--color-primary-ink` | `#1E43B8` | CHỮ trên nền xanh nhạt, link, nhãn mục sidebar đang chọn |
| `--color-primary-soft` | `#E8EEFE` | Nút phụ, mục sidebar đang chọn, avatar, chip "Có phép" |
| `--color-success` / `-soft` | `#14663F` / `#E7F6EC` | Trạng thái tốt: Có mặt, Đã xong, Sẵn sàng, Đã đồng bộ |
| `--color-warning` / `-soft` | `#8A5300` / `#FFF3D6` | Cần làm, Muộn, Thiếu, Chưa lưu |
| `--color-error` / `-soft` | `#B42318` / `#FDECEC` | Vắng, lỗi, Đăng xuất, nút Hủy buổi |
| `--color-neutral-soft` | `#F0F2F5` | Pill trung tính (Đã nghỉ, Chưa nhập, Đang soạn, Vắng thi, Đã hủy) |
| `--color-on-primary` | `#FFFFFF` | Chữ trên nền `--color-primary` |

### 2.2 Chữ (Plus Jakarta Sans; dự phòng `system-ui, -apple-system, "Segoe UI", sans-serif`)

| Vai trò | Cỡ / đậm | Ghi chú |
|---|---|---|
| h1 trang (mobile / desktop) | 26px / 30px, 700, `letter-spacing:-0.01em`, `line-height:1.15` | |
| h1 trang con có nút quay lại | 22px, 700 | Tạo lớp, Tạo bài kiểm tra, chi tiết buổi, chi tiết bài |
| Dòng nhỏ phía trên h1 (eyebrow) | 14px, 400, `--color-muted` | |
| Tiêu đề card lớp (mobile / desktop) | 18px / 20px, 700 | |
| Tiêu đề card khác | 16–17px, 700 | |
| Tên học sinh trong hàng | 16px, 500 (hàng điểm danh/điểm) hoặc 600 (hàng danh sách) | |
| Thân chữ | 14–15px, 400, `line-height:1.5–1.55` | |
| Nhãn ô nhập, nhãn mục | 14px, 600 | |
| Chip thống kê | 14px; số bên trong in đậm (`<b>`) | |
| Pill trạng thái | 13px, 600 | |
| Nút | 14px (cỡ nhỏ), 15px (vừa), 16px (lớn), luôn 600 | |
| Nhãn tab dưới | 12px, 600 | |
| Nhãn mục sidebar | 15px, 600 | |
| Số lớn trong ô thống kê (mobile / desktop) | 22px / 24px, 700 | |
| Ô nhập điểm | 17px, 700, căn giữa (mobile) / 15px, 700 (bảng desktop) | |
| Chữ nhỏ ghi chú | 13px, `--color-muted` | |

### 2.3 Bo góc, kích thước, khoảng cách

| Thành phần | Giá trị |
|---|---|
| Card | bo 16px; đệm 14px 16px (mobile), 18px 20px (desktop); nền trắng; KHÔNG viền, KHÔNG bóng |
| Hàng danh sách (học sinh, buổi, bài) | bo 14px; đệm 10px 12px; `min-height:52px`; khoảng cách giữa hàng 8px |
| Ô nhập | cao 52px, bo 14px, viền 1.5px `--color-input-border`, đệm ngang 16px, chữ 16px; focus: viền `--color-primary` |
| Nút nhỏ / vừa / lớn | cao 44px bo 12px / cao 48px bo 14px / cao 52px bo 14px và rộng 100% |
| Chip thống kê | bo 10px, đệm 8px 10px, nền `--color-bg` |
| Pill | bo 999px, đệm 5px 10px |
| Avatar chữ cái | tròn 40px (36px trong hàng điểm danh), nền `--color-primary-soft`, chữ `--color-primary-ink` 14px/700 |
| Segmented | rãnh nền `--color-border`, bo 12px, đệm 3px; mục bo 10px, đệm dọc 12px, chữ 15px/600; mục chọn nền trắng chữ `--color-text`; mục chưa chọn chữ `--color-muted` |
| Nút chọn ngày (T2…CN) | bo 12px, cao 44px; chưa chọn nền trắng chữ `--color-text`; đang chọn nền `--color-primary` chữ trắng; 14px/600 |
| Ô thống kê (số + nhãn) | nền trắng, bo 14px, đệm 10px 14px (mobile) / 12px 16px (desktop) |
| Khoảng cách | giữa các khối trong trang 12px (mobile), 18–20px (desktop); lề trái/phải nội dung 20px (mobile), 32px (desktop, đệm trên 28px) |
| Bóng | Thiết kế không có bóng trên card. Chỉ khung app desktop có bóng nhẹ (2.4) |
| Vùng chạm | tối thiểu 44px mọi nút, ô nhập, tab, hàng bấm được |

### 2.4 Nền và khung desktop
Ảnh thiết kế desktop cho thấy: nền ngoài `#EAECF1`, bên trong là khung bo 16px màu `#F6F7F9`, bên trái sidebar trắng 248px. Làm đúng như vậy ở ≥ 1024px; mobile nền `#F6F7F9` toàn màn hình. Đặt phần khung desktop trong MỘT khối `@media (min-width:1024px)` để dễ gỡ nếu người dùng không muốn (xem mục 8.1, giả định G2).

### 2.5 `src/shared/styles/tokens.css` (thay toàn bộ)

```css
:root {
  --font-sans: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;

  --color-canvas: #eaecf1;
  --color-bg: #f6f7f9;
  --color-surface: #ffffff;
  --color-border: #e6e9ee;
  --color-divider: #eef0f3;
  --color-input-border: #d2d7df;
  --color-input-border-strong: #b7bec9;
  --color-text: #14181f;
  --color-muted: #4a5361;
  --color-placeholder: #8a93a0;
  --color-primary: #2f5bea;
  --color-primary-ink: #1e43b8;
  --color-primary-soft: #e8eefe;
  --color-on-primary: #ffffff;
  --color-success: #14663f;
  --color-success-soft: #e7f6ec;
  --color-warning: #8a5300;
  --color-warning-soft: #fff3d6;
  --color-error: #b42318;
  --color-error-soft: #fdecec;
  --color-neutral-soft: #f0f2f5;
  --color-scrim: rgb(20 24 31 / 0.4);

  --radius-card: 16px;
  --radius-row: 14px;
  --radius-control: 14px;
  --radius-button: 12px;
  --radius-chip: 10px;
  --radius-pill: 999px;

  --sidebar-width: 248px;
  --tabbar-height: 68px;
  --tap: 44px;

  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
  font-synthesis: none;
  line-height: 1.5;
}
```

### 2.6 `src/shared/styles/reset.css` (sửa các điểm sau, giữ phần còn lại)

```css
html { background: var(--color-bg); }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 16px;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}
@media (min-width: 1024px) {
  html, body { background: var(--color-canvas); }
}
h1, h2, h3, p { margin: 0; }
h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.15; }
h2 { font-size: 18px; font-weight: 700; }
h3 { font-size: 16px; font-weight: 700; }
@media (min-width: 1024px) { h1 { font-size: 30px; } }
a { color: var(--color-primary-ink); }
:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 3px; }
```
`h1,h2,p` bỏ lề dưới 12px: dùng `gap` của flex/grid để tạo khoảng cách. Giữ `button { min-height:44px }`, `input/select/textarea { min-height:44px }`, `prefers-reduced-motion`.

### 2.7 `index.html`
Thêm vào `<head>` (trước `<title>`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" />
```
Không thêm thư viện, không tải font về repo. Mất mạng thì font hệ thống thay thế, giao diện vẫn dùng được. Ghi trong báo cáo: bản thật phải tự host font (architecture.md mục 3 để font trong `public/`) vì SW chỉ precache khung app và font.

---

## 3. Thành phần dùng chung cần đổi

Tất cả CSS viết nhiều dòng, dễ đọc (nhiều file hiện có là một dòng minify, khó sửa: file CSS nào bạn đụng vào thì viết lại dạng nhiều dòng). Mỗi file tsx ≤ ~250 dòng; tách khi vượt.

### 3.1 `src/shared/ui/`

| File | Việc |
|---|---|
| `ui.module.css` | Viết lại theo CSS mẫu 3.2 |
| `Button.tsx` | Prop `variant`: `primary` (mặc định) \| `secondary` \| `surface` \| `neutral` \| `danger` \| `ghost`; prop `size`: `sm` (44, mặc định) \| `md` (48) \| `lg` (52, rộng 100%). Giữ `type="button"` mặc định |
| `LinkButton.tsx` (TẠO) | Như `Button` nhưng render `<Link>` của react-router, nhận `to`. Dùng cho điều hướng, không đặt `<button>` trong `<a>` |
| `Card.tsx` | Card theo 2.3; prop `selected` thêm `outline:2px solid var(--color-primary)` |
| `Chip.tsx` | ĐỔI NGHĨA: chip thống kê (nền `--color-bg`, bo 10px, 14px), không tương tác, vì thế không cần 44px |
| `Pill.tsx` (TẠO) | Prop `tone`: `neutral` \| `success` \| `warning` \| `error` \| `primary`; theo bảng màu 2.1 |
| `Field.tsx` | `Input` theo 2.3; nhãn 14px/600, khoảng cách nhãn–ô 6px, lỗi chữ `--color-error` 14px; `Field` bỏ `margin-bottom:16px`, khoảng cách do cha quyết định (`gap`) |
| `Segmented.tsx` (TẠO) | Props: `options: {value,label}[]`, `value`, `onChange`, `label` (aria-label). `role="tablist"`, mỗi mục `role="tab"` + `aria-selected`, cao ≥ 44px. Dùng ở chi tiết buổi (Điểm danh \| Nhận xét) |
| `PageHeader.tsx` (TẠO) | Props: `eyebrow?`, `title`, `actions?`, `backTo?` (đường dẫn), `compact?`. Bố cục: hàng flex `align-items:flex-end`, `justify-content:space-between`, `gap:12px`, `flex-wrap:wrap`. Có `backTo` thì hiện nút vuông 44×44 nền trắng, bo 12px, biểu tượng mũi tên trái, `aria-label="Quay lại"`, đứng bên trái, h1 22px |
| `Icon.tsx` (TẠO) | Một component `Icon({name, size=22})` render svg `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`. Tên: `classes`, `calendar`, `settings`, `back`, `chevron-right`, `chevron-down`, `eye`, `more`. Đường vẽ ở 3.3 |
| `EmptyState.tsx` | Nền card trắng, bo 16px, đệm 24px 16px, tiêu đề 16px/700, chữ `--color-muted`, căn giữa |
| `Modal.tsx`, `Sheet.tsx` | Bo 16px (Sheet: 20px 20px 0 0), không viền, nền trắng, `::backdrop` là `--color-scrim`; nút Đóng dùng `variant="secondary"` |
| `index.ts` | Xuất thêm `LinkButton`, `Pill`, `Segmented`, `PageHeader`, `Icon` |

### 3.2 CSS mẫu (rút gọn; viết đủ các biến thể trong `ui.module.css`)

```css
/* Nút */
.button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 0 16px; border: 0; border-radius: var(--radius-button);
  background: var(--color-primary); color: var(--color-on-primary);
  font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer;
}
.md { min-height: 48px; padding: 0 20px; border-radius: var(--radius-control); font-size: 15px; }
.lg { min-height: 52px; width: 100%; border-radius: var(--radius-control); font-size: 16px; }
.secondary { background: var(--color-primary-soft); color: var(--color-primary-ink); }
.surface { background: var(--color-surface); color: var(--color-text); }
.neutral { background: var(--color-bg); color: var(--color-text); }
.danger { background: var(--color-error-soft); color: var(--color-error); }
.ghost { background: transparent; color: var(--color-muted); }

/* Card, hàng, chip, pill */
.card { background: var(--color-surface); border-radius: var(--radius-card); padding: 14px 16px; }
.cardSelected { outline: 2px solid var(--color-primary); }
@media (min-width: 1024px) { .card { padding: 18px 20px; } }
.row {
  display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 10px 12px;
  background: var(--color-surface); border-radius: var(--radius-row);
}
.chip { display: inline-block; padding: 8px 10px; border-radius: var(--radius-chip); background: var(--color-bg); font-size: 14px; }
.pill { display: inline-flex; align-items: center; padding: 5px 10px; border-radius: var(--radius-pill); font-size: 13px; font-weight: 600; white-space: nowrap; }
.pillNeutral { background: var(--color-neutral-soft); color: var(--color-muted); }
.pillSuccess { background: var(--color-success-soft); color: var(--color-success); }
.pillWarning { background: var(--color-warning-soft); color: var(--color-warning); }
.pillError   { background: var(--color-error-soft);   color: var(--color-error); }
.pillPrimary { background: var(--color-primary-soft); color: var(--color-primary-ink); }

/* Ô nhập */
.input {
  width: 100%; min-height: 52px; padding: 0 16px;
  border: 1.5px solid var(--color-input-border); border-radius: var(--radius-control);
  background: var(--color-surface); color: var(--color-text); font-size: 16px;
}
.input::placeholder { color: var(--color-placeholder); }
.input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }
.field { display: grid; gap: 6px; }
.field > label { font-size: 14px; font-weight: 600; }

/* Segmented */
.segmented { display: flex; padding: 3px; border-radius: 12px; background: var(--color-border); }
.segment { flex: 1; min-height: 44px; border: 0; border-radius: 10px; background: transparent; color: var(--color-muted); font-size: 15px; font-weight: 600; }
.segmentOn { background: var(--color-surface); color: var(--color-text); }
```

### 3.3 Đường vẽ biểu tượng (Feather, đã kiểm `viewBox 0 0 24 24`)

| Tên | Nội dung bên trong `<svg>` |
|---|---|
| `classes` | `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>` |
| `calendar` | `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/>` |
| `settings` | `<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>` |
| `back` | `<path d="m15 18-6-6 6-6"/>` |
| `chevron-right` | `<path d="m9 18 6-6-6-6"/>` |
| `chevron-down` | `<path d="m6 9 6 6 6-6"/>` |
| `eye` | `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>` |
| `more` | `<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>` |

### 3.4 `SaveStatus` (`src/shared/SaveStatus/`)
Giữ API (`SaveStatus`, `useSaveStatus`) và nhãn tiếng Việt hiện có. Đổi kiểu thành pill 13px/600 (cùng kích thước `Pill`), tách rõ hai trạng thái trước đây cùng màu:

| Trạng thái | Nhãn (giữ nguyên) | Nền / chữ |
|---|---|---|
| `unsaved` | Chưa lưu | `--color-warning-soft` / `--color-warning` |
| `local` | Đã lưu trên máy | `--color-primary-soft` / `--color-primary-ink` |
| `synced` | Đã đồng bộ | `--color-success-soft` / `--color-success` |
| `error` | Lỗi lưu — vui lòng thử lại | `--color-error-soft` / `--color-error` |

Trạng thái lưu phải luôn thấy được trên mọi màn có dữ liệu có thể sửa (bất biến, mục 7.3).

### 3.5 Hàm dùng chung mới

`src/shared/format/index.ts` thêm (giữ hàm cũ):
- `todayISO(): string` — ngày hiện tại theo giờ máy, dạng `YYYY-MM-DD` (không dùng `toISOString()`, nó trả giờ UTC).
- `formatWeekdayDate(iso: string): string` — `Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"numeric",month:"long"})` trên `new Date(iso+"T12:00:00")`, ví dụ "Thứ Sáu, 16 tháng 10".
- `formatDayMonth(iso: string): string` — "16/10".
- `weekdayNames` — `["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"]` (index = `getDay()`), thay cho mảng cục bộ dùng "CN" ở `ClassListPage`.
- `formatClassSchedule(klass: {weekdays:number[]; time:string}): string` — ví dụ "Thứ Tư, Thứ Sáu · 18:30"; sắp xếp thứ Hai→Chủ nhật.

`src/data/repositories/sessions.ts` thêm:
- `listPlannedSessions(classId?: string): Session[]` — buổi `status === "planned"`, của lớp `active` (nếu có `classId` thì chỉ lớp đó), sắp theo `date` tăng dần.
- `sessionNumber(session: Session): number` — số thứ tự (từ 1) của buổi trong lớp, đếm các buổi không bị hủy, sắp theo ngày. Màn điểm danh hiện tính cách này; đưa về một chỗ.

`src/data/repositories/students.ts` thêm:
- `classAttendanceRate(classId: string): number | null` — chuyên cần chung của lớp: gom bản ghi điểm danh của các buổi `held` thuộc lớp, dùng `attendanceRate` trong `src/data/logic.ts` (có mặt + muộn trên tổng không tính có phép). Chỉ là chuyên cần, KHÔNG phải điểm.

Thêm test cho ba hàm trên vào `src/data/repositories/repositories.test.ts`, theo cách dựng dữ liệu của test hiện có. Không đổi `StoreState`, `types.ts`, `seed.ts` (đổi sẽ cần di trú localStorage).

---

## 4. Từng màn: bố cục, nhãn tiếng Việt, trạng thái

Quy ước chung:
- Shell (mục 5.1) sở hữu lề trang. Trang con KHÔNG tự thêm lề ngang, KHÔNG dùng lề âm. Xoá hết các hack như `margin-inline:-20px!important` trong `AttendancePage.module.css`.
- Trang con là `<section>`, không lồng `<main>` (shell đã có `<main id="noi-dung">`).
- Mobile: một cột; desktop: lưới nêu từng màn.
- Mọi thao tác ghi dùng đúng repository hiện có; UI không gọi `store` trực tiếp.

### 4.1 Đăng nhập `/dang-nhap` (`features/auth/LoginPage.tsx`, tạo `features/auth/auth.module.css`)
Nguồn: `Login.dc.html` (màn đó viết cho phụ huynh; chỉ lấy kiểu, bỏ nội dung phụ huynh).
- Nền `--color-bg`, nội dung căn giữa dọc, đệm 24px (mobile). Desktop: card trắng rộng tối đa 420px căn giữa khung canvas.
- Logo vuông 56×56, bo 16px, nền `--color-primary`, chữ "L" trắng 24px/700. Dưới: "Lớp của cô Lan" 15px/600 `--color-muted`; h1 "Chào mừng trở lại" 28px/700 `letter-spacing:-0.02em`; mô tả 16px `--color-muted`: "Đăng nhập để quản lý lớp, điểm danh và điểm số."
- Ô "Email" và "Mật khẩu" (cao 54px, bo 14px, viền 1.5px `--color-input-border-strong`, chữ 17px). Mật khẩu có nút con mắt 44×44 ở góc phải (`Icon eye`, `aria-label="Hiện mật khẩu"`, đổi `type` password/text).
- Nút "Đăng nhập" cao 54px, bo 14px, nền `--color-primary`, chữ 17px/600, cách ô trên 4px.
- Chân trang 13px `--color-muted`, căn giữa: "Prototype: dùng email và mật khẩu bất kỳ. Dữ liệu chỉ lưu trên máy này."
- BỎ: "Quên mật khẩu?", "Có mã mời từ cô?", dòng "Prototype giáo viên · Mobile/Desktop", thẻ `<code>/dang-nhap</code>`. Giữ thông báo lỗi `role="alert"` và logic `login()`.

### 4.2 Danh sách lớp `/lop` (`features/classes/ClassListPage.tsx`, `classes.module.css`)
Nguồn: `ClassList.dc.html` (mobile), `WebClasses.dc.html` (desktop).

Đầu trang (`PageHeader`):
- Mobile: eyebrow "Xin chào, cô Lan", h1 "Lớp của tôi", bên phải avatar tròn 44px nền `--color-primary-soft` chữ "CL" 14px/700 màu `--color-primary-ink` là `<Link to="/cai-dat" aria-label="Cài đặt">`.
- Desktop: eyebrow "Học kỳ này · {n} lớp đang mở", h1 "Tất cả lớp". Bên phải: ô tìm cao 48px rộng 240px, bo 14px, viền 1.5px `--color-input-border`, placeholder "Tìm lớp hoặc học sinh", `aria-label="Tìm lớp"`; nút "+ Tạo lớp mới" cỡ `md`, nền `--color-primary`. Tìm: so khớp không dấu, không phân biệt hoa thường, theo tên lớp hoặc tên học sinh của lớp (`String.normalize("NFD").replace(/\p{M}/gu,"")`). Ô tìm chỉ có ở desktop.

Mobile, theo thứ tự:
1. Nếu có buổi `planned` hôm nay (từ `listPlannedSessions()` lọc `date === todayISO()`): thẻ xanh nền `--color-primary`, chữ trắng, bo 16px, đệm 14px 16px, hàng flex: trái "Hôm nay · {giờ lớp}" 14px và "{Tên lớp} · Buổi {n}" 18px/700; phải nút trắng cao 44px bo 12px chữ `--color-primary-ink` 14px/600 "Điểm danh" → `/lop/:classId/buoi-hoc/:sessionId`. Không có buổi hôm nay thì không hiện.
2. Danh sách thẻ lớp (cột đơn).
3. Chữ ghi chú 13px `--color-muted`, đệm ngang 4px: "Mỗi lớp có danh sách học sinh, điểm danh, bài kiểm tra và báo cáo riêng."
4. Thanh dưới cố định phía trên tab bar (xem 6.3, `stickyBar`): nút `lg` "+ Tạo lớp mới" → `/lop/moi`.

Desktop: lưới `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px`, rồi card ghi chú (gap 8px): tiêu đề 16px/700 "Mỗi lớp là một không gian riêng"; thân 14px `--color-muted` `line-height:1.55`: "Danh sách học sinh, buổi học, điểm danh, bài kiểm tra, nhận xét và báo cáo đều thuộc về từng lớp. Một học sinh học hai lớp có hai bảng điểm danh và hai bảng điểm tách biệt."

Thẻ lớp (`Card`, `display:flex; flex-direction:column; gap:12px`; lớp đang chọn `getCurrentClassId()` có `selected`):
- Hàng 1: tên lớp (18px mobile / 20px desktop, 700) và một `Pill`.
- Hàng 2: 14px `--color-muted`: `formatClassSchedule(klass) + " · Đã học " + heldSessionCount(klass.id) + " buổi"`. (Thiết kế ghi "18:30 – 20:00 · Buổi 18/24": dữ liệu không có giờ kết thúc và tổng số buổi, xem G3.)
- Hàng 3: các `Chip`: `<b>{n}</b> học sinh` (đang học) và `Chuyên cần <b>{x}%</b>` từ `classAttendanceRate` (làm tròn; `null` thì "Chuyên cần <b>—</b>"). KHÔNG có chip "TB" (bỏ trung bình lớp, spec mục 3.1).
- Hàng 4 (hai nút, `display:flex; gap:8px`): nút lớn bên trái `flex:1` cao 44px, nút "Mở lớp" `secondary` đệm ngang 16px → `/lop/:id/buoi-hoc`.
- Pill và nút trái chọn theo trạng thái. Đặt `overdue` = số buổi `planned` có `date <= todayISO()` của lớp; `today` = buổi `planned` có `date === todayISO()`; `next` = buổi `planned` đầu tiên có `date > todayISO()`:

| Điều kiện | Pill | Nút trái |
|---|---|---|
| Lớp đã lưu trữ | `neutral` "Đã lưu trữ" | Không có nút trái, chỉ "Mở lớp" |
| `overdue > 0` | `warning` "{overdue} việc cần làm" | `primary` "Điểm danh hôm nay" nếu có `today`, ngược lại "Điểm danh buổi {formatDayMonth(buổi quá hạn cũ nhất)}"; → trang chi tiết buổi đó |
| `overdue = 0` và hôm nay có buổi `held` | `success` "Đã xong" | `neutral` "Buổi tiếp: {thứ} {d/m}" (nếu có `next`) |
| Còn lại, có `next` | `neutral` "{thứ ngắn của next} tới", ví dụ "Chủ nhật tới" | `neutral` "Buổi tiếp: {thứ} {d/m}" → trang chi tiết `next` |
| Không có buổi nào sắp tới | `neutral` "Chưa có buổi" | Nút `neutral` bị `disabled` "Chưa có buổi sắp tới" |

- Nút "Sửa lớp" và "Lưu trữ" KHÔNG còn ở thẻ; chuyển vào menu "⋯" của không gian lớp (4.3).
- Trạng thái rỗng (chưa có lớp): `EmptyState` "Chưa có lớp học" + `LinkButton` "Tạo lớp đầu tiên".
- Lỗi (từ repository) hiện `role="alert"` nền `--color-error-soft`, chữ `--color-error`, bo 12px, đệm 10px 12px.

### 4.3 Không gian lớp `/lop/:classId/*` (TẠO `features/class-space/ClassSpaceLayout.tsx` + `classSpace.module.css`)
Đây là route cha bọc các tab con (mục 5). Nó thay cho bộ chọn lớp ở đầu shell.

Phần đầu (chỉ hiện ở route tab gốc, ẩn ở route chi tiết; xem 5.3):
- Hàng 1 (`PageHeader`): nút quay lại (→ `/lop`), giữa là khối tiêu đề, phải là nút tròn 44×44 nền trắng `Icon more` `aria-label="Tuỳ chọn lớp"` mở `Sheet` "Tuỳ chọn lớp" có hai nút: "Sửa lớp" (mở `EditClassModal`, 4.2b) và "Lưu trữ lớp" (`danger`, gọi `archiveClass`, cần mạng: lỗi `requireOnline` hiện trong Sheet). Lớp đã lưu trữ thì ẩn hai nút, hiện chữ "Lớp này đã lưu trữ."
- Khối tiêu đề: eyebrow 14px `--color-muted`: `{n} học sinh · {formatClassSchedule(klass)}`; h1 là tên lớp, một dòng, cắt bằng dấu "…" nếu dài; cạnh h1 có `Icon chevron-down` (18px, `--color-muted`). **Bộ chuyển lớp nhanh:** một `<select aria-label="Chuyển lớp">` phủ kín khối tiêu đề (`position:absolute; inset:0; opacity:0; width:100%; height:100%; min-height:44px`), tạm thời hiện viền focus qua `:focus-within` của khối cha. Chọn lớp khác: `setCurrentClass(id)` rồi `navigate` tới cùng tab ở lớp mới (đường dẫn `/lop/{id}/{phần tab đầu tiên sau classId}`; nếu đang ở tab gốc). Option: tên lớp, thêm " (lưu trữ)" cho lớp đã lưu trữ.
- Hàng 2: thanh tab con (4.3a).

(4.2b) `EditClassModal` (TẠO `features/classes/EditClassModal.tsx`): chuyển nguyên form "Sửa lớp" hiện đang nằm trong `ClassListPage.tsx` (tên lớp, giờ học, ngày học lặp lại, `SaveStatus`, nút "Lưu thay đổi", gọi `updateClass`). Dùng lại logic và nhãn, đổi kiểu theo token: ô ngày là hàng nút chọn ngày T2…CN như trang Tạo lớp (cùng component, xem 4.4). Props: `classId`, `onClose`.

(4.3a) Thanh tab con: `<nav aria-label="Mục của lớp">` gồm 5 `NavLink`: **Buổi học** (`buoi-hoc`), **Bài kiểm tra** (`bai-kiem-tra`), **Điểm** (`diem`), **Học sinh** (`hoc-sinh`), **Báo cáo** (`bao-cao`). Kiểu mỗi tab con (đã có trong thiết kế phần bộ lọc "Tất cả / Chưa nhập / Chưa gửi"): pill cao 44px, đệm ngang 16px, bo 999px, 14px/600, `white-space:nowrap`; chưa chọn nền trắng chữ `--color-text`; đang chọn (`aria-current="page"`) nền `--color-primary` chữ trắng. Thanh `display:flex; gap:8px; overflow-x:auto; scrollbar-width:none`, trên mobile tràn sát mép (`margin:0 -20px; padding:0 20px`) để cuộn ngang được; desktop `margin:0; padding:0`. `NavLink` dùng `end` để `buoi-hoc` không còn sáng khi ở `buoi-hoc/:sessionId` (route chi tiết ẩn thanh nên không cần).

Không gian lớp ở trạng thái lỗi: `classId` không tồn tại → `EmptyState` "Không tìm thấy lớp" + `LinkButton` "Về danh sách lớp".

### 4.4 Tạo lớp `/lop/moi` (`features/classes/NewClassPage.tsx`, `classesForm.module.css`)
Nguồn: `NewClass.dc.html`.
- `PageHeader compact backTo="/lop"`, h1 "Tạo lớp mới". Nội dung cột đơn, gap 16px, rộng tối đa 520px (desktop căn trái trong khung).
- "Tên lớp": ô nhập cao 52px. Placeholder "Ví dụ: IELTS Foundation".
- "Ngày học trong tuần": 7 nút đều nhau `flex:1`, nhãn T2, T3, T4, T5, T6, T7, CN, cao 44px, bo 12px, gap 6px (kiểu 2.3). `aria-pressed`. Tách thành component `WeekdayPicker` (dùng chung với `EditClassModal`).
- "Giờ học": MỘT ô giờ (`type="time"`), nhãn "Giờ bắt đầu" (dữ liệu không có giờ kết thúc, G3).
- "Thang điểm": thiết kế dùng segmented ba mục; vì thang cố định 10 (spec) nên chỉ hiện segmented một mục "10 điểm" đang chọn, `aria-disabled`, kèm chữ 13px `--color-muted` "Thang điểm cố định 10." BỎ các mục "100 điểm", "A – F" và mục "Thêm học sinh vào lớp" (thêm từ lớp khác là "làm sau").
- `SaveStatus` ngay dưới form; thông báo lỗi `role="alert"`.
- Nút `lg` "Tạo lớp" (kiểu stickyBar ở mobile) và `ghost` "Huỷ" cao 48px. Tạo xong → `navigate("/lop", {replace:true})`.

### 4.5 Tab Buổi học `/lop/:classId/buoi-hoc` (TẠO `features/class-space/SessionsTab.tsx`)
Danh sách buổi của lớp, cột đơn, gap 8px, hai nhóm có nhãn nhóm (14px/600 `--color-muted`, đệm trái 4px):
1. "Cần điểm danh và sắp tới": buổi `planned`, `date` tăng dần.
2. "Đã diễn ra": buổi `held` và `cancelled`, `date` giảm dần.

Mỗi buổi là `Link` (hàng 14px, `min-height:56px`) → `/lop/:classId/buoi-hoc/:sessionId`: trái hai dòng: "Buổi {sessionNumber} · {formatWeekdayDate}" 16px/600 (buổi hủy: gạch ngang, `--color-muted`) và 14px `--color-muted` "{giờ lớp} · {số học sinh theo `studentsForSession`} học sinh"; phải `Pill`:

| Trạng thái buổi | Pill |
|---|---|
| `planned`, `date <= hôm nay` | `warning` "Chưa điểm danh" |
| `planned`, `date > hôm nay` | `neutral` "Sắp tới" |
| `held` | `success` "Đã điểm danh" |
| `cancelled` | `error` "Đã hủy" |

Rỗng: `EmptyState` "Lớp chưa có buổi học nào". Lưu ý: buổi tự sinh theo lịch lặp (đã có trong `createClass`); không làm nút thêm buổi.

### 4.6 Chi tiết buổi `/lop/:classId/buoi-hoc/:sessionId` (TẠO `features/class-space/SessionDetailPage.tsx`)
Đây là nơi điểm danh và viết nhận xét sau buổi (tái sử dụng màn hiện có, không viết lại logic).
- `PageHeader compact backTo="/lop/:classId/buoi-hoc"`: eyebrow `{tên lớp} · {giờ lớp}`; h1 "Buổi {n} · {formatWeekdayDate}". Bên phải: nếu buổi `planned`, nút `danger` "Hủy buổi" (`cancelSession`, một chạm, đúng spec "hủy buổi bằng 1 nút"); xong thì quay về danh sách buổi.
- Buổi `cancelled`: chỉ hiện `Pill error` "Buổi đã hủy" và chữ "Không thể điểm danh hoặc nhận xét buổi đã hủy.", không hiện hai panel.
- Còn lại: `Segmented` hai mục "Điểm danh" | "Nhận xét", mặc định Điểm danh. Hiện cả hai panel luôn được mount; panel không chọn gắn thuộc tính `hidden` (để không mất bản nháp điểm danh chưa lưu khi bấm sang tab Nhận xét).
- Đang có thay đổi chưa lưu mà rời trang: dùng `useBlocker` của react-router (đã dùng `createBrowserRouter`) và `window.confirm("Bạn có thay đổi chưa lưu. Rời đi và bỏ thay đổi?")`. Điều kiện "chưa lưu" lấy từ panel điểm danh (báo lên bằng callback `onDirtyChange`).

**`AttendancePanel`** (đổi tên `features/attendance/AttendancePage.tsx` → `AttendancePanel.tsx`; props `{classId, sessionId, onDirtyChange?}`):
- BỎ khỏi panel: bộ chọn buổi (nút ‹ ›, `select` chọn buổi), tiêu đề h1, nút "Hủy buổi" (chuyển lên header chi tiết), thẻ "Các buổi gần đây".
- GIỮ nguyên logic: 4 trạng thái Có mặt → Muộn → Có phép → Vắng (bấm đổi vòng), "Tất cả có mặt", ô giờ đến muộn và ghi chú khi Muộn, lưu cả lô bằng `saveAttendanceBatch`, danh sách học sinh theo `studentsForSession`, `SaveStatus`, cảnh báo vắng 2 buổi liên tiếp (`studentAbsenceWarning`), chú thích "Muộn tính là có đi học · Có phép không bị trừ chuyên cần".
- Trên desktop cũng dùng nút bấm đổi vòng (bỏ `<select>`), nhãn trợ năng `aria-label="{tên}: {trạng thái}. Bấm để đổi"`.
- Bố cục (cả hai khung): dòng tóm tắt "<b>7</b> có mặt · <b>1</b> muộn · <b>1</b> có phép · <b>1</b> vắng" (14px `--color-muted`, số `--color-text`) cùng nút `secondary` "Tất cả có mặt" bên phải; danh sách hàng (mobile: mỗi học sinh một hàng riêng nền trắng bo 14px; desktop: một card trắng chứa các hàng, kẻ ngăn `--color-divider`); chữ gợi ý 13px "Chạm vào trạng thái để đổi: Có mặt → Muộn → Có phép → Vắng"; `stickyBar` ở mobile chứa `SaveStatus` và nút `lg` "Lưu điểm danh"; desktop nút "Lưu điểm danh" `md` nằm ở dòng tóm tắt, bên phải.
- Hàng học sinh: avatar tròn 36px (2 chữ cái cuối của tên), tên 16px/500, nút trạng thái bên phải: `min-width:92px; height:44px; border-radius:12px; border:0; font-size:15px; font-weight:600` với màu: Có mặt `--color-success-soft`/`--color-success`; Muộn `--color-warning-soft`/`--color-warning`; Có phép `--color-primary-soft`/`--color-primary-ink`; Vắng `--color-error-soft`/`--color-error`.
- Thẻ "Cần chú ý": nền trắng bo 16px; tiêu đề "Cần chú ý" 16px/700; nội dung 14px `--color-muted`: "{Tên} vắng ít nhất 2 buổi liên tiếp." (giữ từ ngữ hiện có); không có ai thì "Chưa có học sinh vắng 2 buổi liên tiếp." Đặt dưới danh sách.

**`CommentsPanel`** (đổi tên `features/comments/CommentsPage.tsx` → `CommentsPanel.tsx`; props `{classId, sessionId}`):
- BỎ: tiêu đề h1, `select` chọn buổi. Buổi lấy từ props, thay cho `activeSession`.
- GIỮ nguyên: lọc "Tất cả (n) / Chưa nhập (n) / Chưa gửi (n)", câu mẫu "Tập trung tốt / Cần luyện nghe / Làm bài đầy đủ", Lưu nháp, Lưu và gửi, chỉ xoá bản nháp đã nhớ khi lưu thành công (`draftCache`; không được làm hỏng hành vi này, xem 7.3), công tắc "Mô phỏng mất mạng", `SaveStatus`, nhãn "Đã gửi / Đang soạn / Chưa nhập".
- Lọc: pill cao 44px, đệm ngang 14px, bo 999px, 14px/600; đang chọn nền `--color-primary` chữ trắng; chưa chọn nền trắng chữ `--color-text`.
- Mobile (theo thiết kế): mỗi học sinh một card (bo 16px, đệm 14px 16px); hàng đầu: tên 16px/600 và `Pill` (Đã gửi `success`; Đang soạn `neutral`; Chưa nhập `neutral`). Card đang chọn có `outline:2px solid var(--color-primary)` và MỞ RỘNG NGAY TRONG CARD: vùng soạn (`textarea`, nền `--color-bg`, bo 12px, đệm 12px, `min-height:64px`, 15px, `line-height:1.55`), dòng 13px "Chạm một câu mẫu để chèn vào nhận xét:", các câu mẫu dạng pill `+ {câu}` (nền `--color-primary-soft`, chữ `--color-primary-ink`, đệm 10px 14px, bo 999px, 14px/600), rồi nút. Card chưa chọn chỉ có tên + pill (và dòng xem nhanh nội dung 15px nếu đã có, tối đa 2 dòng).
- Desktop: hai cột (`grid-template-columns: minmax(0,1fr) minmax(0,1.4fr); gap:18px`): trái danh sách, phải card soạn của học sinh đang chọn (nội dung như trên).
- Đổi học sinh khi đang soạn: không được mất chữ (đã có `draftCache`); giữ.

### 4.7 Tab Bài kiểm tra `/lop/:classId/bai-kiem-tra` (TẠO `features/class-space/TestsTab.tsx`)
- Dòng đầu: nút `secondary` "+ Bài mới" → `/lop/:classId/bai-kiem-tra/moi`, căn phải.
- Danh sách `Link` (hàng 14px, cao ≥ 56px), mới nhất trước: trái "{Tên bài}" 16px/600 và "Ngày {d} tháng {m} · Thang 10 điểm" 14px `--color-muted`; phải `Pill`: đủ điểm `success` "Đủ điểm"; còn thiếu `warning` "Còn {k} em chưa có điểm". Tính trên học sinh đang học; "đã có điểm" = có bản ghi điểm với `absent` hoặc `value !== null`.
- Rỗng: `EmptyState` "Chưa có bài kiểm tra" + `LinkButton` "Tạo bài kiểm tra".

### 4.8 Tạo bài kiểm tra `/lop/:classId/bai-kiem-tra/moi` (`features/scores/NewTestPage.tsx`)
Nguồn: `NewTest.dc.html`.
- `PageHeader compact backTo="/lop/:classId/bai-kiem-tra"`, h1 "Tạo bài kiểm tra". Cột đơn gap 18px, rộng tối đa 520px.
- "Tên bài kiểm tra" (ô nhập 52px; placeholder "Ví dụ: Unit 6 Test"), "Ngày kiểm tra" (`type="date"`, mặc định hôm nay), "Thang điểm": segmented một mục "10 điểm" như 4.4.
- BỎ HOÀN TOÀN khối "Hệ số khi tính trung bình" (spec bỏ hệ số).
- Khối thông tin: nền `--color-primary-soft`, bo 14px, đệm 12px 14px, chữ 14px `line-height:1.5` màu `--color-primary-ink`: "Bài kiểm tra mới sẽ xuất hiện trong bảng điểm của lớp. Điểm số từ 0 đến 10." (BỎ câu về phụ huynh.)
- `SaveStatus`; lỗi `role="alert"`.
- Nút `lg` "Tạo bài và nhập điểm" → sau `createTest`, `navigate` tới `/lop/:classId/bai-kiem-tra/:testId` (id của bài vừa tạo); nút `ghost` "Huỷ" → quay về danh sách.

### 4.9 Nhập điểm một bài `/lop/:classId/bai-kiem-tra/:testId` (TẠO `features/scores/TestScoresPage.tsx`)
Nguồn: `Scores.dc.html`. Tách từ `ScoresPage.tsx` hiện có (chế độ mobile "một bài"); tái dùng `scoreDrafts.ts` (giữ file và test của nó), lấy bản nháp theo lớp bằng `draftsForClass`, `entriesForClassTests(drafts, classId, new Set([testId]))` và `clearClassTestDrafts` — đây là phần đã sửa lỗi lưu nhầm lớp, không được viết lại kiểu khác.
- `PageHeader compact backTo="/lop/:classId/bai-kiem-tra"`: eyebrow `{tên lớp}`; h1 = tên bài.
- Card thông tin: trái "{tên bài}" 18px/700 và "Ngày {d} tháng {m} · Thang 10 điểm" 14px `--color-muted`. Dưới: "Đã nhập <b>8/10</b> học sinh" (14px) và, nếu thiếu, `Pill warning` "Còn {k} em chưa có điểm".
- Hàng học sinh (mobile & desktop cùng kiểu, desktop rộng tối đa 720px): nền trắng, bo 14px, `min-height:52px`, đệm 6px 6px 6px 12px, gap 12px: tên (16px/500, `flex:1`), ô điểm, nút bật vắng thi.
  - Ô điểm: `inputmode="decimal"`, rộng 72px, cao 44px, bo 12px, không viền, nền `--color-bg`, chữ 17px/700 căn giữa, `aria-label="Điểm {tên}"`. Đang focus: viền 1.5px `--color-primary`, nền trắng, chữ `--color-primary-ink`; hàng chứa ô đang focus có `outline:2px solid var(--color-primary)` (`:focus-within`). Chưa có điểm: viền nét đứt 1.5px `--color-input-border-strong`, nền trắng, placeholder "–".
  - Nút vắng thi: `aria-pressed`; tắt: nền trong suốt, viền 1.5px `--color-input-border`, chữ `--color-muted`, 14px/600, cao 44px, đệm ngang 12px, bo 12px, nhãn "Vắng thi"; bật: nền `--color-neutral-soft`, chữ `--color-text`, viền trong suốt, và ô điểm được thay bằng chữ "Vắng thi" (không nhập số). Điểm của bài vắng thi và của ô trống KHÔNG tính vào trung bình (đã đúng trong `averageScore`).
- `stickyBar` (mobile) / dòng hành động (desktop, căn phải): `SaveStatus` + nút `lg` "Lưu điểm". Thông báo thành công `role="status"` nền `--color-success-soft`, chữ `--color-success`, bo 12px, đệm 10px 12px; lỗi `role="alert"` nền `--color-error-soft`.
- Kiểm tra giữ nguyên: 0–10, dấu phẩy thập phân, lỗi "Điểm phải từ 0 đến 10.", chỉ lưu dòng thực sự đổi (đoạn `save()` hiện có).
- Rời trang khi còn bản nháp chưa lưu: `useBlocker` + `window.confirm` như 4.6.

### 4.10 Tab Điểm `/lop/:classId/diem` (TẠO `features/class-space/ScoreGridTab.tsx`)
Bảng điểm cả lớp, chỉ đọc (G5). Tách từ chế độ desktop của `ScoresPage.tsx`. Nguồn: `WebScores.dc.html`.
- Card trắng chứa bảng; `overflow-x:auto` trong card (bảng được cuộn ngang trong khung, trang không tràn).
- Cột: **Học sinh** (cố định bên trái khi cuộn: `position:sticky; left:0; background:var(--color-surface)`), mỗi bài một cột, **Trung bình** (cột cuối).
- Tiêu đề cột bài: `Link` tới `/lop/:classId/bai-kiem-tra/:testId`, hai dòng: tên bài (13px/600 `--color-muted`) và ngày "9/10 · thang 10" (13px, 400). KHÔNG ghi "hệ số". Tiêu đề cột 13px/600 `--color-muted` căn giữa, đệm 10px 8px, kẻ dưới 1px `--color-border`.
- Ô điểm: căn giữa, 15px, đệm 6px 8px, kẻ dưới 1px `--color-divider`. Có điểm: số một chữ số thập phân (`formatScore`). Vắng thi: `Pill neutral` "Vắng thi". Chưa nhập: "–" màu `--color-placeholder`.
- Cột Trung bình: `<b>{formatScore(averageScore)}</b>` hoặc "Chưa có điểm" (13px `--color-muted`).
- `min-width` bảng 640px. KHÔNG có hàng "TB lớp", không có hệ số.
- Chân card: 13px `--color-muted`, đệm trên 12px: "Hiển thị {n} học sinh đang học. Trung bình cộng đơn giản; bài vắng thi và chưa nhập không tính."
- Đầu tab: nút `secondary` "+ Bài kiểm tra mới" → `/lop/:classId/bai-kiem-tra/moi`.
- Rỗng (chưa có bài): `EmptyState` "Chưa có bài kiểm tra" + `LinkButton` "Tạo bài kiểm tra".

### 4.11 Tab Học sinh `/lop/:classId/hoc-sinh` (`features/students/StudentsPage.tsx`, `students.module.css`)
Nguồn: `Students.dc.html`, `WebStudents.dc.html`. BỎ mọi thứ mời phụ huynh: chip "Đã vào app / Chờ kích hoạt / Chưa mời", nút Mời / Gửi lại mã / Gửi qua Zalo / Gửi SMS, ô thống kê "phụ huynh đã vào / chưa kích hoạt", cột "Tài khoản", "Lớp đang học".
- Đầu tab: nút `primary` cỡ nhỏ "+ Thêm học sinh" căn phải (mở `Modal` thêm học sinh như hiện có).
- Ba ô thống kê (`display:flex; gap:10px`, mỗi ô `flex:1`, kiểu 2.3): "<số> đang học"; "<số> đã nghỉ" (nhãn 13px "đã nghỉ · giữ lịch sử"); "<số> vắng 2 buổi liền" (số màu `--color-warning` khi > 0), tính bằng `studentAbsenceWarning`.
- Mobile: danh sách hàng 14px: avatar 40px, tên 16px/600, dòng 14px `--color-muted`: "Phụ huynh · {SĐT}" hoặc "Chưa có số điện thoại phụ huynh", dòng 13px "Vào lớp {formatDate}" và nếu đã nghỉ "· Rời lớp {formatDate}". Phải: đã nghỉ → `Pill neutral` "Đã nghỉ"; đang học → nút `neutral` cao 44px "Đánh dấu nghỉ" (mở `Modal` xác nhận như hiện có, nút `danger` "Xác nhận nghỉ học").
- Desktop: card chứa bảng, cột: Học sinh (tên + dòng nhỏ ngày vào/rời), Phụ huynh (SĐT), Chuyên cần (`studentAttendanceRate`, "Chưa có dữ liệu" nếu `null`), Trạng thái (`Pill success` "Đang học" / `neutral` "Đã nghỉ"), cột thao tác (nút "Đánh dấu nghỉ" `neutral`). Tiêu đề cột 13px/600 `--color-muted`, `border-bottom:1px solid var(--color-border)`; ô `padding:10px 8px`, kẻ `--color-divider`; `min-width:620px`.
- Modal "Thêm học sinh": "Họ và tên học sinh", "Số điện thoại phụ huynh (tuỳ chọn)", chú thích 13px "Chỉ lưu số điện thoại trong hồ sơ. Chưa gửi lời mời hoặc tin nhắn.", `SaveStatus`, nút `lg` "Lưu học sinh". Giữ `createStudent`, `markStudentLeft` (ngày nghỉ hôm nay; điểm và điểm danh cũ giữ lại).
- Rỗng: `EmptyState` "Chưa có học sinh" + nút "Thêm học sinh".

### 4.12 Tab Báo cáo `/lop/:classId/bao-cao` (`features/reports/ReportsPage.tsx`, `ReportsPage.module.css`)
Nguồn: `ReportReview.dc.html`, `WebReports.dc.html`. Giữ toàn bộ logic hiện có (`buildMonthlyStudentReport`, `saveReport`, `publishReport`, phát hành hàng loạt, "điểm có cập nhật, cần phát hành lại", bản xem trước in bằng HTML). Chỉ đổi kiểu và bố cục:
- BỎ tiêu đề h1 và nhãn "Báo cáo theo tháng" (đã có tab). Chọn tháng: ô `type="month"` cao 48px kiểu `Input` (nhãn "Chọn tháng"). Thiết kế còn mục "3 tháng gần nhất": thuộc "làm sau" (spec mục 8), không làm (G7).
- Dòng tóm tắt: "Sẵn sàng <b>7/10</b> học sinh" (14px) và `Pill warning` "{k} em còn thiếu".
- Danh sách học sinh: hàng 14px; tên 16px/600; `Pill`: đủ dữ liệu → `success` "Sẵn sàng"; thiếu → `warning` + lý do ngắn ("Thiếu điểm {tên bài}", "Thiếu nhận xét") lấy từ `row.missing`; hàng đang chọn có `outline:2px solid var(--color-primary)`. Dòng nhỏ 13px `--color-muted` "Trung bình {x}/10" hoặc "Chưa có điểm".
- Card chi tiết học sinh đang chọn: bo 16px; hai ô số (`display:flex; gap:10px`, mỗi ô `flex:1`, nền `--color-bg`, bo 12px, đệm 10px 12px; nhãn 13px `--color-muted`, giá trị 18px/700, dòng phụ 13px): "Chuyên cần" `{attendanceCount}/{tổng buổi} buổi` + "{x} vắng · {y} muộn · {z} có phép"; "Điểm trung bình" `{x}/10` + "{k} bài kiểm tra". Rồi "Điểm từng bài", "Nhận xét chung" (danh sách nhận xét đã gửi, như hiện có), cảnh báo "Còn thiếu: …" (nền `--color-warning-soft`, chữ `--color-warning`, bo 12px, đệm 10px 12px), `SaveStatus`, nút giữ nguyên bộ hiện có: "Lưu nháp" (`secondary`), "Xem trước bản in" (`surface`), "Phát hành"/"Phát hành lại" (`primary`), "Phát hành {n} báo cáo đủ dữ liệu" (`secondary`, cuối). Chú thích 13px: "Báo cáo chỉ được phát hành khi bạn bấm Phát hành."
- Desktop: hai cột `grid-template-columns: minmax(0,1.2fr) minmax(0,1fr); gap:18px`, `align-items:start` (danh sách | chi tiết). Mobile: danh sách rồi card chi tiết bên dưới.
- Bản xem trước in (`printSheet`): giữ; đổi kiểu theo token (nền trắng, bo 16px); `@media print` chỉ in tờ này (giữ nếu đã có).

### 4.13 Lịch `/lich` (TẠO `features/schedule/SchedulePage.tsx` + `schedule.module.css`)
Danh sách buổi sắp tới của mọi lớp đang mở, gom theo ngày, CHỈ ĐỌC (không lịch tuần, không dời buổi, không học bù; spec xếp vào "làm sau").
- `PageHeader`: eyebrow "14 ngày tới", h1 "Lịch".
- Nhóm "Chưa điểm danh" (nếu có): các buổi `planned` có `date < hôm nay`, nhãn nhóm màu `--color-warning`. Rồi các ngày từ hôm nay đến hôm nay + 13 ngày, mỗi ngày có buổi là một nhóm: nhãn ngày 14px/600 `--color-muted` "{Hôm nay · | Ngày mai · | ""}{formatWeekdayDate}". Ngày không có buổi thì không hiện.
- Mỗi buổi là `Link` hàng 14px cao ≥ 56px → `/lop/:classId/buoi-hoc/:sessionId`: trái giờ lớp (16px/700, rộng cố định 56px), giữa tên lớp 16px/600 và "Buổi {n} · {số học sinh} học sinh" 14px `--color-muted`, phải `Chip`-kiểu `Pill` theo bảng 4.5 và `Icon chevron-right` 18px `--color-muted`. Sắp theo giờ lớp trong ngày.
- Dùng `listPlannedSessions()`, `getClass`, `sessionNumber`, `studentsForSession` (từ `features/attendance/sessionRoster.ts`), `todayISO`. Buổi đã hủy không hiện.
- Rỗng: `EmptyState` "Không có buổi nào trong 14 ngày tới".
- Ghi chú trong báo cáo: dữ liệu mẫu có ngày cố định (đến 2026-10-20), nên khi ngày máy vượt thì Lịch trống; tạo lớp mới sẽ sinh 28 ngày buổi.

### 4.14 Cài đặt `/cai-dat` (`features/settings/SettingsPage.tsx`, `settings.module.css`)
Nguồn: `Settings.dc.html` (màn viết cho phụ huynh; chỉ lấy kiểu). Giữ nội dung hiện có, đổi kiểu:
- `PageHeader`: eyebrow "Tài khoản giáo viên", h1 "Cài đặt". Không có nút quay lại (đây là mục chính).
- Card hồ sơ: avatar tròn 48px "GV" (16px/700), tên "Giáo viên" 16px/600, email 14px `--color-muted`.
- Card "Trạng thái dữ liệu": "{n} thay đổi đang chờ đồng bộ" hoặc "Mọi thay đổi đã được đồng bộ trên máy này.", `Pill warning` "Đang chờ" / `success` "Đã đồng bộ".
- Card "Dữ liệu mẫu": nút `secondary` "Đặt lại dữ liệu mẫu" (Modal xác nhận như hiện có).
- Đăng xuất: nút `lg` `danger` "Đăng xuất" ở cuối trang (nền `--color-error-soft`, chữ `--color-error`, cao 52px, 16px/600), `disabled` khi còn thay đổi chờ; kèm khối giải thích nền `--color-warning-soft` như hiện có. BẮT BUỘC giữ chặn đăng xuất khi còn thay đổi chưa đồng bộ (`logout()` ném lỗi, nút khoá).
- Trên mobile thanh dưới luôn che mép; chừa đệm dưới đủ (`padding-bottom` của shell).

---

## 5. Điều hướng và route mới

### 5.1 Shell (`src/app/TeacherShell.tsx`, `src/app/shell.module.css`)
Viết lại. Chỉ ba mục chính:

| Nhãn | Đường dẫn | Biểu tượng | Sáng khi |
|---|---|---|---|
| Lớp | `/lop` | `classes` | đường dẫn bắt đầu bằng `/lop` (kể cả `/lop/moi`, `/lop/:id/...`) |
| Lịch | `/lich` | `calendar` | `/lich` |
| Cài đặt | `/cai-dat` | `settings` | `/cai-dat` |

`NavLink` (không `end`) cho cả ba. Bỏ nút "Thêm", `Sheet` "Thêm", `select` "Lớp hiện tại", `extraLinks`, `moreOpen`. `GlobalStatus` giữ (SaveStatus + "{n} thay đổi chờ" + "Đồng bộ mô phỏng").

**Mobile (< 1024px):**
- Cột dọc: hàng trạng thái nhỏ trên cùng (`padding:calc(8px + env(safe-area-inset-top)) 20px 0`, flex hai đầu, 13px) chứa `GlobalStatus` gọn (SaveStatus bên trái, "{n} thay đổi chờ" bên phải; bỏ chữ "Đồng bộ mô phỏng" trên mobile hoặc để `title`), rồi `<main id="noi-dung">` với `padding:12px 20px 16px; display:flex; flex-direction:column; gap:12px; min-width:0`.
- Vỏ: `padding-bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom) + 16px)`.
- Thanh tab dưới cố định (CSS mẫu 6.3). 3 mục `flex:1`.

**Desktop (≥ 1024px):** lưới `var(--sidebar-width) minmax(0,1fr)`; khung theo 2.4. Sidebar: nền trắng, viền phải 1px `--color-border`, đệm 20px 14px, `flex-direction:column; gap:6px`. Trên cùng thương hiệu "Lớp của cô Lan" (18px/700, `--color-primary`, đệm 4px 12px 14px) là `Link` về `/lop`. Ba mục nav: cao 44px, đệm ngang 12px, bo 12px, 15px/600, chữ `--color-muted`; đang chọn nền `--color-primary-soft`, chữ `--color-primary-ink`. Dưới cùng (đẩy xuống bằng `margin-top:auto`) `GlobalStatus` đầy đủ. Nội dung: `padding:28px 32px`, `display:flex; flex-direction:column; gap:20px`.

Giữ liên kết "Đến nội dung" (skip link). Xoá `.classLabel`, `.select`, `.moreLinks` và các CSS không còn dùng.

Đồng bộ lớp hiện tại: giữ `useEffect` gọi `setCurrentClass(classId)` khi mở `/lop/:classId/...` (chuyển vào `ClassSpaceLayout`).

### 5.2 Bảng route (`src/app/router.tsx`)

Giữ `Loading` (Suspense), `Guard`, `RouteError`, trang `/dang-nhap`, `*` → `/lop`. Tất cả trang tải lười (`lazy`).

| Route | Thành phần | Ghi chú |
|---|---|---|
| `/dang-nhap` | `LoginPage` | |
| `/lop` | `ClassListPage` | |
| `/lop/moi` | `NewClassPage` | khai báo TRƯỚC `/lop/:classId` |
| `/lop/:classId` | `ClassSpaceLayout` | route cha, render `<Outlet/>` |
| `/lop/:classId` (index) | chuyển hướng → `buoi-hoc` | `Navigate replace` |
| `/lop/:classId/buoi-hoc` | `SessionsTab` | tab |
| `/lop/:classId/buoi-hoc/:sessionId` | `SessionDetailPage` | `handle: {detail: true}` |
| `/lop/:classId/bai-kiem-tra` | `TestsTab` | tab |
| `/lop/:classId/bai-kiem-tra/moi` | `NewTestPage` | `handle: {detail: true}`; khai báo TRƯỚC `:testId` |
| `/lop/:classId/bai-kiem-tra/:testId` | `TestScoresPage` | `handle: {detail: true}` |
| `/lop/:classId/diem` | `ScoreGridTab` | tab |
| `/lop/:classId/hoc-sinh` | `StudentsPage` | tab |
| `/lop/:classId/bao-cao` | `ReportsPage` | tab |
| `/lich` | `SchedulePage` | |
| `/cai-dat` | `SettingsPage` | |

Route cũ chuyển hướng về route mới (tạo `src/app/RedirectTo.tsx`: component nhận hàm `(params) => string`, dùng `useParams` + `Navigate replace`):

| Route cũ | Chuyển tới |
|---|---|
| `/lop/:classId/diem-danh` | `/lop/:classId/buoi-hoc` |
| `/lop/:classId/nhan-xet` | `/lop/:classId/buoi-hoc` |
| `/lop/:classId/diem/bai-moi` | `/lop/:classId/bai-kiem-tra/moi` |

Lưu ý: `/lop/:classId/diem` GIỮ NGUYÊN đường dẫn nhưng đổi nghĩa (nay là bảng điểm cả lớp); `/lop/:classId/hoc-sinh`, `/lop/:classId/bao-cao`, `/cai-dat` không đổi. `lop/:classId/diem/bai-moi` phải khai báo như redirect riêng, không rơi vào `/diem`.

### 5.3 Phần đầu không gian lớp chỉ hiện ở route tab gốc
`ClassSpaceLayout` dùng `useMatches()`; nếu có match nào có `handle?.detail` thì KHÔNG hiện phần đầu và thanh tab con, chỉ render `<Outlet/>` (trang chi tiết tự có `PageHeader` với nút quay lại). `classId` không tồn tại → `EmptyState` (4.3).

### 5.4 Cách tái sử dụng Điểm danh và Nhận xét
Không viết lại logic. `AttendancePage.tsx` → `AttendancePanel.tsx`, `CommentsPage.tsx` → `CommentsPanel.tsx` (đổi tên bằng `git mv` để giữ lịch sử), đổi thành component nhận props `{classId, sessionId}` (mục 4.6), `SessionDetailPage` render cả hai. Giữ nguyên `sessionRoster.ts`, `studentsForSession` (đã sửa lỗi danh sách học sinh theo ngày của buổi), và logic `draftCache` của nhận xét.

---

## 6. Thứ tự làm việc, từng bước nhỏ

Sau mỗi bước chạy `npm run typecheck` (và `npm test` ở các bước có đụng dữ liệu/logic). Không sang bước sau khi bước trước còn lỗi. Commit không bắt buộc (giữ nguyên chưa commit; người dùng sẽ tự quyết).

**Bước 1 — Token, reset, font.** Thay `tokens.css`, sửa `reset.css`, thêm 3 thẻ `<link>` vào `index.html` (mục 2). `npm run typecheck`. Mở `/dang-nhap`: nền `rgb(246,247,249)`, font Plus Jakarta Sans.

**Bước 2 — Thành phần dùng chung.** Làm mục 3.1, 3.4. Mẹo: vì đổi token `--color-primary` thành màu nền nút, mọi chỗ cũ dùng `var(--color-primary)` làm MÀU CHỮ hoặc viền (liên kết, `.avatar`, chữ nút phụ) phải đổi sang `--color-primary-ink`. Tìm: `grep -rn "color-primary" src`. Chạy `npm run typecheck`.

**Bước 3 — Hàm dùng chung và dữ liệu.** Mục 3.5: `format`, `sessions.ts`, `students.ts`, test trong `repositories.test.ts`. Chạy `npm test`: phải xanh, test mới phải có và qua.

**Bước 4 — Shell và router khung.** Viết `TeacherShell`, `shell.module.css`, `RedirectTo.tsx`; trong `router.tsx` dựng bảng route 5.2 nhưng các thành phần chưa làm (`SessionsTab`, `SessionDetailPage`, `TestsTab`, `ScoreGridTab`, `SchedulePage`, `TestScoresPage`, `ClassSpaceLayout`) tạm trả `<EmptyState title="Đang làm"/>`; trang cũ vẫn dùng tạm. Mở `/lop`, `/lich`, `/cai-dat` ở 390px và 1280px: có 3 mục, nền và khung đúng (A3, A7).

**Bước 5 — Đăng nhập, Danh sách lớp, Tạo lớp, Sửa lớp.** Mục 4.1, 4.2, 4.4, `EditClassModal`, `WeekdayPicker`. Mở lần lượt; thử Tạo lớp rồi quay về `/lop`.

**Bước 6 — Không gian lớp, Buổi học, Chi tiết buổi.** Mục 4.3, 4.5, 4.6 và 5.3, 5.4: `ClassSpaceLayout`, `SessionsTab`, đổi tên và đổi props `AttendancePanel`, `CommentsPanel`, `SessionDetailPage`. Thử: đổi trạng thái điểm danh rồi bấm sang "Nhận xét" và quay lại, bản nháp còn nguyên; lưu; hủy một buổi `planned`.

**Bước 7 — Bài kiểm tra, Nhập điểm, Điểm.** Mục 4.7–4.10: `TestsTab`, `NewTestPage`, `TestScoresPage`, `ScoreGridTab`; xoá `ScoresPage.tsx` khi không còn nơi dùng (chuyển hết nội dung sang hai thành phần mới). Thử tạo bài, nhập điểm, vắng thi, lưu, xem ở tab Điểm.

**Bước 8 — Học sinh, Báo cáo.** Mục 4.11, 4.12.

**Bước 9 — Lịch, Cài đặt.** Mục 4.13, 4.14.

**Bước 10 — Dọn.** Xoá file và CSS không còn dùng (`StubPage.tsx` nếu không còn route dùng, các class CSS cũ trong `shell.module.css`, `ScoresPage.module.css` cũ khi không còn import). Chạy A2 (không còn hex ngoài `tokens.css`).

**Bước 11 — Kiểm toàn bộ bằng lệnh.** `npm run typecheck && npm run build && npm test` đều sạch. Ghi số test.

**Bước 12 — Kiểm bằng trình duyệt ở 390px và 1280px** (`npm run dev`, mở cổng Vite in ra; đăng nhập email/mật khẩu bất kỳ; muốn dữ liệu sạch thì Cài đặt → "Đặt lại dữ liệu mẫu"). Duyệt TẤT CẢ route sau, mỗi route ở cả hai khung: `/dang-nhap`, `/lop`, `/lop/moi`, `/lop/6a/buoi-hoc`, `/lop/6a/buoi-hoc/6a-session-8` (buổi sắp tới) và `/lop/6a/buoi-hoc/6a-session-7` (buổi đã diễn ra), `/lop/6a/bai-kiem-tra`, `/lop/6a/bai-kiem-tra/moi`, `/lop/6a/bai-kiem-tra/6a-test-0`, `/lop/6a/diem`, `/lop/6a/hoc-sinh`, `/lop/6a/bao-cao`, `/lich`, `/cai-dat`, và các route cũ ở bảng 5.2. Với mỗi route: không lỗi console, `scrollWidth <= innerWidth`. Chạy script đo sau trong console của từng trang, mọi phần tử in ra là vi phạm (A10):

```js
[...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=tab]')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); })
  .map(e => e.tagName + ' ' + (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 30)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))
```
Ngoại lệ chấp nhận: liên kết "Đến nội dung" (ẩn ngoài màn hình) và các `input` ẩn (`type=checkbox` đã thay bằng nút). Có vi phạm khác thì sửa.

Đo A3–A6 bằng `getComputedStyle` như bảng 1.2.

Công cụ mở trình duyệt: dùng công cụ nào Pi đã có (ví dụ Chrome DevTools MCP hoặc Playwright cài sẵn trên máy). KHÔNG thêm gói vào `package.json`. Nếu không có, nói thẳng (mục 1.2).

---

## 7. Ràng buộc nghiệp vụ

### 7.1 Lệch thiết kế thì theo spec (đã quyết, không hỏi lại)
- BỎ hệ số điểm ở mọi nơi: màn Tạo bài kiểm tra, tiêu đề cột bảng điểm ("hệ số 2"), câu chú thích "tính theo hệ số".
- BỎ "TB lớp" / điểm trung bình theo lớp trên thẻ lớp và bảng điểm. Chỉ giữ trung bình của TỪNG học sinh (cộng đơn giản, bỏ qua bài vắng thi và chưa nhập). Thang 10 cố định, không segmented "100 điểm / A–F".
- BỎ mọi thứ SMS, OTP, mời phụ huynh, kích hoạt, màn phụ huynh, học phí, chat. Cả chữ "Mời", "Gửi lại mã", "Gửi qua Zalo", "Gửi SMS", "Đã vào app", "Chờ kích hoạt", "phụ huynh đã vào".
- Không thêm tính năng "Làm sau" và "Chưa nên làm" trong spec mục 8: lịch tuần đầy đủ, dời buổi, học bù, thêm học sinh từ lớp khác, chuyển lớp, hồ sơ học sinh chi tiết, báo cáo 3 tháng, nhận xét tổng hợp theo kỳ.

### 7.2 Ràng buộc kỹ thuật
- Không thêm thư viện (kể cả thư viện UI, icon, state, test). Biểu tượng dùng `Icon.tsx`.
- UI không gọi `store` hay `localStorage` trực tiếp; chỉ qua `src/data/repositories`.
- Giao diện tiếng Việt; vùng chạm ≥ 44px; thiết kế một tay trên iPhone (nút hành động chính ở nửa dưới màn hình qua `stickyBar`).
- Không `console.log/error` có SĐT hay nội dung nhận xét. Kiểm: `grep -rn "console\." src` không ra dòng nào.

### 7.3 Bất biến phải còn nguyên (thử tay sau khi xong, ghi kết quả từng dòng vào báo cáo)
1. 4 trạng thái điểm danh Có mặt, Muộn, Có phép, Vắng; Muộn tính là đi học; Có phép không trừ chuyên cần; sửa điểm danh sau khi lưu được, có ghi `changeLogs` (đã có trong repository).
2. Cảnh báo vắng 2 buổi liên tiếp hiện trong màn điểm danh.
3. Trạng thái lưu (Chưa lưu / Đã lưu trên máy / Đã đồng bộ / Lỗi) luôn hiện trên: điểm danh, nhập điểm, nhận xét, tạo bài, tạo lớp, sửa lớp, thêm học sinh, báo cáo.
4. Chặn đăng xuất khi còn thay đổi chưa đồng bộ (Cài đặt). Cách thử: ngắt mạng ở DevTools, sửa một điểm rồi lưu, vào Cài đặt: nút Đăng xuất khoá và có lý do.
5. Học sinh nghỉ: "Đánh dấu nghỉ" đặt `status:"left"` và `leftAt`, KHÔNG xoá điểm danh hay điểm cũ; tab Học sinh vẫn liệt kê em đó với nhãn "Đã nghỉ" và ngày rời lớp.
6. Danh sách điểm danh của một buổi chỉ gồm học sinh đang theo học tại ngày đó (`studentsForSession`); thêm học sinh mới hôm nay rồi lưu điểm danh một buổi cũ KHÔNG gây lỗi "Học sinh không thuộc buổi học này".
7. Bản nháp điểm theo lớp (`scoreDrafts`): sửa điểm lớp A, chưa lưu, sang lớp B, bấm Lưu: không ghi điểm của A vào B (lỗi đã sửa trước đây, đừng làm lại).
8. Chuyển học sinh trong tab Nhận xét khi đang soạn không làm mất chữ; chỉ xoá bản nháp đã nhớ khi lưu thành công.
9. "Gửi nhận xét" và "Phát hành báo cáo" cần mạng (`requireOnline`); mất mạng thì hiện lỗi rõ, không âm thầm bỏ qua.
10. Sửa điểm sau khi báo cáo tháng đã phát hành: báo cáo ghi "Điểm có cập nhật, cần phát hành lại".
11. Không ghi SĐT hay nội dung nhận xét vào log.

---

## 8. Giả định cần người dùng xác nhận

Không tự đổi spec. Ghi lại từng mục này vào báo cáo cuối (mục 10) kèm cách đảo ngược nếu người dùng không đồng ý.

| # | Giả định | Lý do | Cách đảo ngược |
|---|---|---|---|
| G1 | **Báo cáo là tab con thứ năm** của không gian lớp (người dùng chưa nêu chỗ đặt báo cáo tháng; spec bản đầu có báo cáo tháng) | Báo cáo theo lớp và theo tháng, hợp nhất với dữ liệu lớp | Chuyển tab ra mục chính thứ tư hoặc vào Lịch/Cài đặt: đổi `ClassSpaceLayout` và bảng route, không đổi logic |
| G2 | **Khung canvas desktop** `#EAECF1` bao quanh khung app bo 16px (theo ảnh thiết kế; không có trong file `.dc.html`) | Người dùng phàn nàn về nền và gửi ảnh có khung này | Xoá khối `@media (min-width:1024px)` ở 2.4 và dòng `html, body { background: var(--color-canvas) }` trong `reset.css` |
| G3 | Thẻ lớp chỉ ghi giờ bắt đầu và "Đã học N buổi" thay cho "18:30 – 20:00 · Buổi 18/24" | `Class` không có giờ kết thúc và tổng số buổi; thêm trường sẽ đổi `StoreState` và cần di trú dữ liệu | Thêm `endTime`, `totalSessions` vào `types.ts`, `createClass`, `seed.ts` rồi sửa hiển thị |
| G4 | Giữ chip "Chuyên cần x%" ở thẻ lớp, chỉ bỏ "TB" | Spec mục 3.1 cấm trung bình điểm của lớp, không cấm chuyên cần | Bỏ chip trong `ClassListPage` |
| G5 | Tab **Điểm chỉ đọc**; nhập điểm làm ở **Bài kiểm tra → bấm bài** (thiết kế web cho nhập trực tiếp trong bảng) | Yêu cầu của người dùng: tab Bài kiểm tra nhập điểm; một nơi nhập giảm lỗi bản nháp | Thêm ô nhập vào cột bài mới nhất ở `ScoreGridTab` |
| G6 | "Sửa lớp" và "Lưu trữ lớp" nằm trong menu "⋯" ở đầu không gian lớp; thẻ lớp chỉ có hai nút | Thiết kế mới của thẻ lớp không có hai nút này nhưng spec bản đầu yêu cầu sửa/lưu trữ lớp | Đặt lại hai nút vào thẻ lớp |
| G7 | Bỏ "Nhận xét chung của tháng", "Dùng gợi ý làm bản nháp" và mục "3 tháng gần nhất" của màn báo cáo | Spec xếp nhận xét tổng hợp theo kỳ và báo cáo 3 tháng vào "Làm sau"; `Report` không có trường nội dung | Chờ quyết định, cần đổi spec trước |
| G8 | Giữ SĐT phụ huynh làm trường hồ sơ học sinh (hiện đầy đủ, không che số), không gửi lời mời | Spec bản đầu: "Học sinh: thêm (kèm SĐT phụ huynh)"; yêu cầu bỏ mời phụ huynh | Che số ("0903 *** 412") bằng một hàm định dạng nếu người dùng muốn |
| G9 | Đăng nhập dùng Email (giữ như prototype); thiết kế dùng SĐT và là màn của phụ huynh | `login()` hiện nhận email; giáo viên chưa có luồng SĐT trong spec | Đổi nhãn và kiểm tra trong `LoginPage` + `auth.ts` |
| G10 | Hủy buổi một chạm, không hỏi xác nhận | Spec: "hủy buổi bằng 1 nút" | Thêm `Modal` xác nhận trong `SessionDetailPage` |
| G11 | Lịch có thêm nhóm "Chưa điểm danh" (buổi `planned` đã quá ngày) trên đầu danh sách 14 ngày tới | Cần để thể hiện "việc cần làm" trên thẻ lớp; không phải lịch tuần | Bỏ nhóm này |
| G12 | Nhãn tab con "Điểm" (theo người dùng), không dùng "Điểm số"/"Bảng điểm" như thiết kế cũ | Người dùng chỉ định tên | Đổi nhãn một chỗ trong `ClassSpaceLayout` |
| G13 | Tên thương hiệu "Lớp của cô Lan" và "Xin chào, cô Lan" lấy từ thiết kế, là dữ liệu mẫu | Giáo viên chưa có hồ sơ tên trong dữ liệu | Thay bằng tên từ hồ sơ khi có |
| G14 | Không đọc `design/export/Tat ca man hinh.dc.html` (417 KB, bản gộp); 15 file riêng đã đủ nội dung | Người viết brief | — |

Nếu trong lúc làm bạn gặp mâu thuẫn spec hoặc chỗ chưa rõ khác, đừng đoán: ghi vào mục "Giả định mới" của báo cáo và dừng với `NEEDS_CONTEXT` nếu nó chặn việc tiếp theo.

---

## 9. File được sửa, tạo, xoá

Tất cả đường dẫn dưới `design/prototype/`.

**Sửa:** `index.html`; `src/shared/styles/tokens.css`, `reset.css`; `src/shared/ui/{Button,Card,Chip,Field,EmptyState,Modal,Sheet}.tsx`, `ui.module.css`, `index.ts`; `src/shared/SaveStatus/index.tsx`, `SaveStatus.module.css`; `src/shared/format/index.ts`; `src/app/TeacherShell.tsx`, `shell.module.css`, `router.tsx`; `src/data/repositories/sessions.ts`, `students.ts`, `repositories.test.ts`; `src/features/auth/LoginPage.tsx`; `src/features/classes/{ClassListPage.tsx,NewClassPage.tsx,classes.module.css,classesForm.module.css}`; `src/features/students/{StudentsPage.tsx,students.module.css}`; `src/features/settings/{SettingsPage.tsx,settings.module.css}`; `src/features/scores/NewTestPage.tsx`; `src/features/reports/{ReportsPage.tsx,ReportsPage.module.css}`.

**Đổi tên (`git mv`) rồi sửa:** `src/features/attendance/AttendancePage.tsx` → `AttendancePanel.tsx`, `AttendancePage.module.css` → `AttendancePanel.module.css`; `src/features/comments/CommentsPage.tsx` → `CommentsPanel.tsx`, `CommentsPage.module.css` → `CommentsPanel.module.css`.

**Tạo:** `src/shared/ui/{LinkButton,Pill,Segmented,PageHeader,Icon}.tsx`; `src/app/RedirectTo.tsx`; `src/features/auth/auth.module.css`; `src/features/classes/{EditClassModal.tsx,WeekdayPicker.tsx}`; `src/features/class-space/{ClassSpaceLayout.tsx,classSpace.module.css,SessionsTab.tsx,SessionDetailPage.tsx,TestsTab.tsx,ScoreGridTab.tsx}`; `src/features/scores/{TestScoresPage.tsx,scores.module.css}`; `src/features/schedule/{SchedulePage.tsx,schedule.module.css}`. Đặt thêm CSS module cho từng file mới khi cần (tên theo chức năng, không phải nhãn kế hoạch).

**Xoá khi không còn dùng:** `src/features/scores/ScoresPage.tsx`, `ScoresPage.module.css` (nội dung đã chuyển sang `TestScoresPage`, `ScoreGridTab`, `scores.module.css`); `src/app/StubPage.tsx`.

**GIỮ NGUYÊN:** `src/data/{types,store,outbox,seed,logic}.ts`, `src/data/repositories/*` ngoài các thêm ở 3.5, `src/features/scores/scoreDrafts.ts` (+ test), `src/features/attendance/sessionRoster.ts` (+ test), `src/features/reports/reportModel.ts` (+ test), `src/features/classes/classes.test.ts`, `public/`. Test cũ không được sửa để cho qua.

**KHÔNG ĐƯỢC SỬA:** `docs/`, `design/export/`, `design/*.dc.html`, `AGENTS.md`, `CLAUDE.md`, và mọi thứ trong `plans/` ngoại trừ tạo mới `plans/20261017-teacher-prototype/reports/redesign.md`. Không commit, không đẩy lên git. Không sửa `package.json` (không thêm gói).

Quy ước mã: tên file component PascalCase như hiện có; hook camelCase; mỗi file tsx ≤ ~250 dòng; không comment giải thích điều hiển nhiên; không đặt mã kế hoạch hay nhãn review trong comment, tên test, tên hàm.

---

## 10. Báo cáo cuối và Status

Ghi `plans/20261017-teacher-prototype/reports/redesign.md` với các mục:

1. **Tóm tắt** (3–5 câu): đã làm gì, điều hướng mới ra sao.
2. **Kết quả lệnh:** dán nguyên phần đuôi đầu ra của `npm run typecheck`, `npm run build`, `npm test` (số file, số test) và lệnh A2.
3. **File thay đổi:** danh sách sửa, tạo, đổi tên, xoá.
4. **Bảng đối chiếu thiết kế:** mỗi màn một dòng (Đăng nhập, Lớp, Tạo lớp, Buổi học, Chi tiết buổi, Bài kiểm tra, Tạo bài, Nhập điểm, Điểm, Học sinh, Báo cáo, Lịch, Cài đặt, thanh tab dưới, sidebar): khớp / lệch, nếu lệch thì lý do (theo spec hay giới hạn dữ liệu) và mã giả định G tương ứng.
5. **Kiểm bằng trình duyệt:** từng route × 390px/1280px: đã mở chưa, lỗi console, tràn ngang; số liệu A3–A6 đã đo (dán giá trị); đầu ra script A10.
6. **Bất biến 7.3:** từng dòng 1–11 đã thử, kết quả.
7. **Giả định:** bảng G1–G14 đã dùng, cộng "Giả định mới" nếu có.
8. **Điều không xác minh được và vì sao** (ví dụ không có trình duyệt, không có mạng để tải font).
9. **Việc tồn đọng / rủi ro.** Bắt buộc có ghi chú: font tải từ Google Fonts bằng thẻ `<link>` chỉ để prototype; bản thật phải tự host font trong `public/` và precache (architecture.md mục 3, 5).
10. Dòng cuối, đúng khuôn:

```text
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: một hai câu
Concerns/Blockers: tuỳ chọn
```

Chỉ ghi `DONE` khi A1–A11 đều có bằng chứng trong báo cáo. Thiếu bằng chứng (ví dụ không mở được trình duyệt) thì ghi `DONE_WITH_CONCERNS` và nêu rõ phần chưa xác minh.
