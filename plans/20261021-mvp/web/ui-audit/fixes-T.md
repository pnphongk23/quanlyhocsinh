# fixes-T: token chung, UI dùng chung, FAB (2026-10-23)

## Nguyên nhân FAB (đã xác minh trên Chrome, 390×844)
`.page` chạy `pageIn ... both`; sau animation `getComputedStyle(.page).transform` = `matrix(1,0,0,1,0,0)` (không phải `none`) nên `.page` thành containing block của `position: fixed`. Trước sửa FAB nằm ở y=632 (neo theo khung trang, đè thẻ), sau sửa y=708 = 844 − 64 (tab) − 16 − 56, x=314 = 390 − 20 − 56. Desktop 1440×844: (1360, 764) = cách phải/đáy 24.

## Thay đổi
| File | Trước → sau | Lý do / token |
|---|---|---|
| `design/tokens/*` | Bản nháp → `tokens.css` + `tokens.json` + `ios-mapping.md` + `README.md`; thêm `--text-3xl`, `--text-control`, `--page-gap`, `--page-bottom`, `--fab-pad` + `:root[data-has-fab]` | Nguồn chuẩn |
| `src/shared/styles/tokens.css` | Chép khối `:root`/`@media` từ nguồn chuẩn, giữ `@font-face` | Đồng bộ |
| `src/shared/ui/Fab.tsx` | Render trong `.page` → `createPortal` ra `document.body`; set `data-has-fab` trên `<html>` khi mount | Thoát containing block; chừa đáy |
| `src/shared/ui/fab.module.css` | right 20/bottom tabbar+16, z 9, 56px, bóng cứng, mốc 900px → `--fab-right/--fab-bottom`, `--z-fab`, `--fab-size`, `--shadow-fab`; bỏ media 900px | Mốc 1024 nằm trong token |
| `src/app/shell.module.css` | `.staffContent` padding `12 20 16` / `28 32` → `--page-top --page-x calc(--page-bottom + --fab-pad)`; gap → `--page-gap`; z tabbar 10 → `--z-tabbar`, menu 12 → `--z-menu`, skip 20 → `--z-toast`; bóng → `--shadow-frame/--shadow-menu`; tab dưới `calc(64px + safe)` → `--tabbar-total`; cỡ chữ → `--text-*`; media 900 → 1024 (shell legacy) | Lề = `--page-x`, thang z |
| `src/shared/ui/ui.module.css` | Khoảng cách, cỡ chữ, chiều cao nút/ô nhập, bo sheet/segment, focus ring, z-index segment → token; card padding ngang → `--card-pad`. Desktop: `.button:not(.block){width:fit-content}`, `min-width: --button-min-w-desktop`; `.dialogFooter` desktop xếp hàng, căn phải | Nút không bị stretch trong cột flex/grid; chỉ `block` tràn ngang. Chiều cao nút desktop giữ 44 (không đổi hình) |
| `src/shared/motion/motion.module.css` | `--page-gap, 12px` → `--page-gap`; 100ms → `--dur-press` | |
| `src/shared/styles/reset.css` | h1/h2/h3/body, 44px → `--text-*`, `--weight-bold`, `--leading-tight`, `--tap`; reduced-motion thêm `--dur-press` | |
| `src/shared/SaveStatus/SaveStatus.module.css` | 13px → `--text-sm` | |
| `src/shared/ui/Fab.test.tsx` (mới) | Test: FAB là con của `body`, không nằm trong `main`/`.page`; `data-has-fab` gắn/gỡ; tokens có `:root[data-has-fab]{--fab-pad}`; `.staffContent` có `--fab-pad`; fab css chỉ token | |

Thay đổi hình có chủ ý (sửa lỗi): vị trí FAB; nút desktop không bị kéo dài; hàng nút hộp thoại desktop căn phải. Màu, bo góc, chuyển động giữ nguyên.

## Kiểm
- `npm run typecheck` xanh. `npm test`: 34 file pass, 1 skipped; 272 test pass, 1 skipped. `npm run build` exit 0, JS gzip 170 799 B + CSS gzip 10 187 B (< 200 KB).
- Ảnh sau (dữ liệu giả của seed test): `plans/20261021-mvp/web/shots/ui-audit/after/T/fab-students-390-{top,bottom}.png`, `fab-students-1440-{top,bottom}.png`. Cuộn đáy 390: nút ⋯ cuối y=612–656, FAB y=708, không chồng, ⋯ bấm được. Desktop 1440 trang Học sinh dùng nút ở header, không có FAB.
- Chưa kiểm trên iPhone thật (safe-area chỉ qua `env()`).

## Giá trị cứng còn lại ở `src/features/**` (cho team A/B/C)
- z-index tự do: AttendancePanel:330 (5), CommentsPanel:195 (5), :220 (6), :504 (9), classes/dialogs:4 (8), :54 (9), scores/TestsDesktop:56 (9), scores/scores.module:371 (5), pwa:3 (1000), HomeworkPanel:414 (40); thêm các `z-index: 1/2/3`. Đổi sang `--z-raised/--z-sticky/--z-menu/--z-overlay/--z-toast`.
- Khoảng 1600 giá trị `px` trong css features (lề 10/12/14/16/24, cỡ chữ 11/13/15/17…): thay bằng `--space-*`, `--page-x`, `--text-*` khi trùng giá trị; số lẻ (10, 14, 6, 5) giữ hoặc báo lead.
- Còn breakpoint khác 1024 trong features (khác 900): cần kiểm theo từng file; mobile/desktop chuẩn là 1024.
- Bóng `box-shadow` ghi cứng (vd. pwa 0 12px 40px) → `--shadow-*` nếu khớp.
- Nơi nào tự cộng chừa đáy cho FAB (padding-bottom ~88px) nên bỏ: shell đã cộng `--fab-pad`.

# Vòng 2

## API cho team A (đáy dính, chừa đáy): A-01, A-02, A-03, A-11, A-12, A-14, A-15
- **`<ActionFooter>`** (`src/shared/ui`, `import { ActionFooter } from "../../shared/ui"`): hàng nút chính ở đáy trang form. Mobile: `position: sticky; bottom: var(--sticky-bottom)` (= `--tabbar-total`, nằm trên tab dưới), nút xếp dọc, `margin-top: auto` đẩy xuống đáy trang flex-column, nền `--color-bg`. Desktop: trong luồng, căn phải, nút theo nội dung. Dùng: `<ActionFooter><Button size="lg" type="submit">Tạo lớp</Button></ActionFooter>`.
- **Token**: `--sticky-bottom` cho footer dính tự viết (thay `calc(var(--tabbar-height) + env(safe-area-inset-bottom))` và `bottom: 0` ở `AttendancePanel`, `CommentsPanel`, `scores.module`, `editClassSchedule`); `--content-min-h` (mobile: `100dvh - --tabbar-total - --page-top - --page-bottom`) cho `min-height` của trang form, thay `calc(100dvh - var(--tabbar-height) - ... - 28px)` ở `classesForm.module.css`.
- Footer sticky nằm trong luồng nên danh sách phía trên tự dừng trên footer; không cần thêm padding đáy riêng. Nếu footer cao (banner lỗi + nút), gom banner vào trong `ActionFooter` để cùng dính.
- **Chẩn đoán T-05/A-01** (đo ở harness 390×844, không banner): nút "Tạo lớp" y=704–756, tab y=780 → không che. Ảnh before bị che vì banner "Lỗi lưu" của máy chủ giả thêm ~40px vào đầu `.staffContent` còn `min-height` của `.page` trong `classesForm.module.css` không tính padding shell và banner, nên trang tràn xuống dưới tab. A thay `min-height` bằng `--content-min-h` và dùng `ActionFooter`. Đã kiểm `ActionFooter` ở 390×844 (3 trường) và 375×667 (12 trường, cuộn): nút dính y=543–595, tab y=603.

## Thay đổi
| ID | File | Trước → sau | Lý do |
|---|---|---|---|
| T-01, T-02, B-01 | `src/app/shell.module.css` | `.staffMobileSaveStatus{display:none}` (0,1,0) → `.staffDesktop > .staffMobileSaveStatus` (0,2,0); `.staffSidebar{grid-column:1;grid-row:1}`, `.staffContent{grid-column:2;grid-row:1}` | **Gốc:** `.pill{display:inline-flex}` của SaveStatus nằm trong chunk CSS nạp sau `index.css` ở bản build, thắng `display:none` cùng độ ưu tiên. Khi lỗi lưu, bản mobile hiện, thành ô lưới đầu tiên và đẩy sidebar sang cột 2, nội dung ép vào 248px. Không phải hồi quy của 0c06a7c (SaveStatus chỉ đổi font-size); phụ thuộc thứ tự CSS. B-01 "menu lớp mở sẵn" cùng gốc: sidebar bị đẩy vào cột nội dung, `[role=listbox]` không có trong DOM mặc định |
| T-05 | `src/shared/ui/ActionFooter.tsx` (mới), `ui.module.css`, `index.ts`; token `--sticky-bottom`, `--content-min-h` (cả `design/tokens/tokens.css` và `src/shared/styles/tokens.css`) | Cơ chế chung như mục API | |
| A-16, C-13 | `ui.module.css` `.button:disabled` | reset `opacity: .6` trên chữ trắng/nền xanh → nền `--color-neutral-soft`, chữ `--color-muted` (≈6.7:1), `opacity: 1`, `cursor: not-allowed`; `ghost` giữ nền trong suốt | Đọc được, vẫn nhìn ra disabled. Đã đo: màu chữ rgb(74,83,97), nền rgb(240,242,245), opacity 1 |
| C-05 | `src/app/StatusPage.tsx` (mới), `routes.tsx`, `shell.module.css` `.statusPage` | `<main>` trần với link gạch chân → `EmptyState` trong khung căn giữa + `LinkButton` "Về trang đầu" (cả "Không tìm thấy" và "Không thể mở màn hình") | Dùng token và component chung. Phần "`/pwa` không phải màn hướng dẫn" thuộc C/lead (route `/pwa` chưa có) |

Kiểm: sau sửa ở 1440×900 khi có lỗi lưu, kể cả khi ép CSS SaveStatus nạp sau: sidebar (16,16,248,868), nội dung (264,16,1160,868), bản mobile `display: none`; không có menu lớp trong DOM. Không lỗi: cùng toạ độ. Ảnh: `after/T/r2-shell-1440-ok.png`, `r2-shell-1440-error.png`, `r2-shell-1440-error-late-css.png`, `r2-action-footer-390-n3.png`, `r2-action-footer-375-n12.png`, `r2-button-disabled-390.png`, `r2-not-found-390.png`.
Test mới: `ActionFooter.test.tsx` (footer dùng `--sticky-bottom`, shell desktop ẩn bản mobile + đặt cột lưới, disabled không opacity). `npm run typecheck` xanh; `npm test` 35 file pass/1 skipped, 276 test pass/1 skipped; `npm run build` exit 0, JS gzip lớn nhất 170 006 B (< 200 KB).

## Không thuộc T / bỏ qua
- T-03, T-04, B-02 → B. T-06..T-09 → A. C-07, C-08: chưa kiểm vì không dùng component chung của T trong ảnh; báo lại nếu cần.
- Chưa xác minh trên iPhone thật (safe-area, `100dvh` khi thanh địa chỉ co giãn).

# Vòng 3

| Mục | File | Trước → sau | Lý do |
|---|---|---|---|
| 1 | `src/data/auth/index.ts` `authFailureMessage` | Lỗi không phải `ApiError` trả `error.message` gốc (vd "Failed to fetch") → "Không thể kết nối. Hãy kiểm tra mạng rồi thử lại." | Không lộ chi tiết kỹ thuật, tiếng Việt |
| 1 | `src/data/auth/authFailureMessage.test.ts` (mới) | Test: `TypeError`, chuỗi, `undefined` → câu chung, không chứa "fetch"/"TypeError"; `ApiError` vẫn ánh xạ theo mã | |
| 1 | `src/features/auth/account.test.tsx` (ngoài ranh giới, chỉ test, 2 dòng) | Mock đăng nhập sai ném `Error("Số điện thoại hoặc mật khẩu chưa đúng.")` dựa vào hành vi cũ (lộ nguyên message) → ném `ApiError(401, invalid_credentials)` như client thật | Test cũ phụ thuộc đúng lỗi vừa sửa; C/lead rà lại nếu cần |
| 2 | `src/shared/ui/PageHeader.tsx`, `ui.module.css` | Nút quay lại `align-items: center` theo cả khối (lệch 4px khi có `eyebrow`) → khi có `eyebrow`, `align-items: flex-start` và `margin-top` tính từ `--text-md × --leading-base + --space-2 + (--h1-size × --leading-tight − --tap)/2`; `--h1-size` theo `--text-2xl`/`--text-3xl` (desktop)/`--text-xl` (compact) | Nút căn theo dòng tiêu đề chính. Đo trên Chrome: chênh lệch tâm nút và tâm `h1` = 0 ở 4 biến thể (không phụ, có phụ, compact có phụ, compact) tại 390 và 1440. Ảnh `after/T/r3-page-header-390.png` |
| 3 | `src/app/routes.tsx` | Route `*` đã dùng `StatusPage` từ vòng 2 (`Không tìm thấy màn hình`), không cần sửa. Đã kiểm trên Chrome `/zzz-khong-co`: có khung, `EmptyState` và nút "Về trang đầu" | Ảnh C chụp trước vòng 2 |

Cho C: phần tự căn lại nút quay lại trong `guardian.module.css`: grep `backButton|pageHeaderMain|PageHeader` trong `src/roles/guardian/*.css` không có kết quả, nên có thể phần căn lại nằm ở file khác hoặc đã gỡ; nếu còn offset thủ công thì gỡ vì `PageHeader` đã tự căn.

Kiểm: `npm run typecheck` xanh; `npm test` 36 file pass/1 skipped, 284 test pass/1 skipped; `npm run build` exit 0.

# Vòng 4

Nút lùi nền trắng của `PageHeader` (Điểm số, Tạo bài kiểm tra, mobile 390): **không sửa mã**, quy tắc của lead đã đúng ở `PageHeader`.

Đo `getBoundingClientRect` trên Chrome (harness dữ liệu giả), mép trái vùng bấm 44px so với `--page-x`:
| Route | 390 (`--page-x` 20) | 1440 (`--page-x` 32, nội dung bắt đầu x=264) |
|---|---|---|
| `/lop/6a/bai-kiem-tra/moi` | box x=20 | box x=296 = 264+32 |
| `/lop/6a/bai-kiem-tra/6a-test-1` | box x=20 | box x=296 |
| `/lop/moi` | box x=20 | box x=524 (form căn giữa `max-width` 640, chủ ý) |

Mũi tên nằm trong tile trắng 44px (icon 22px căn giữa, glyph `m15 18-6-6 6-6` chiếm phần giữa), nên mũi tên ở x≈39–42 là do tile, không phải lề thừa: `.backButton` không có `margin`/`padding` ngang, `.pageHeaderMain` không có `padding`. Giữ nền trắng (đã duyệt, `ui.module.css`). Header lớp có mũi tên x≈20 là do A cố ý lùi tile (box x=4, `padding-inline: calc(--page-x - --space-16)`, xem A-09), nên hai kiểu header khác nhau theo thiết kế: tile trắng thì mép tile theo `--page-x`, header lớp trong suốt thì glyph theo `--page-x`.

Nếu lead muốn glyph (không phải tile) thẳng x=20 trên cả tile trắng, cần `margin-left: calc(var(--space-16) - var(--page-x))`-kiểu lùi tile ra ngoài lề hoặc thu tile, tức đổi hình đã duyệt; chưa làm.
Ảnh: `after/T/r4-back-390.png`, `r4-back-1440.png`. `npx vitest run src/shared` xanh.

# Vòng 5

| Mục | File | Trước → sau | Kiểm |
|---|---|---|---|
| B-26 gốc | `src/shared/motion/motion.module.css` `.page`, `.pageDetail` | `animation: … both` → `… backwards` (giữ keyframes, thời lượng, easing) | Sau animation `getComputedStyle(.page).transform === "none"` (trước: `matrix(1,0,0,1,0,0)` làm `.page` thành containing block). Phần tử `position: fixed; inset: 0` đặt trong `.page` phủ đúng viewport 390×844 và 1440×900 (kể cả vùng sidebar). Animation vẫn chạy (`getAnimations()` = 1, `pageIn`) |
| B-33 | `src/shared/ui/ui.module.css` `.sheet` | Desktop (≥1024) cũng dính đáy, bo 20 trên → `margin-bottom: auto`, `border-radius: var(--radius-card)` | Chrome: 390 sheet (0,736,390×108) bo `20px 20px 0 0`, giữ nguyên; 1440 sheet (460,384,520×132) căn giữa, bo 16px |
| test | `src/shared/motion/pageTransition.test.ts` (mới) | Khoá fill-mode `backwards`, cấm `both` ở `.page`/`.pageDetail` | |

Cách né riêng còn lại, không gỡ: `Fab` vẫn dùng `createPortal` ra `document.body` (cần vì còn đặt `data-has-fab`; giữ cũng an toàn nếu sau này tổ tiên khác có transform). Không có Modal/Sheet nào khác dùng portal; `dialog` dùng top layer nên không bị ảnh hưởng. Còn các lớp `position: fixed` tự viết trong `src/features` (`CommentsPanel` 216/502, `HomeworkPanel` 412, `classes/dialogs` 2, `pwa` 2/126) nay neo đúng viewport; nếu A/B từng bù lệch do neo theo trang thì có thể gỡ.
Kiểm: `npm run typecheck` xanh; `npm test` 37 file pass/1 skipped, 285 test pass/1 skipped; `npm run build` exit 0. Ảnh: `after/T/r5-sheet-390.png`, `r5-sheet-1440.png`.
