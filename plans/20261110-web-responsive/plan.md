# QL-004 · Web responsive 3 mốc + gate UI

- size: L · owner: Tech Lead (QL-004) · PM 7d280065
- nhánh: `feat/web-responsive-layout` (từ develop 6969ec6), worktree `~/Git/qlh-wt/web-responsive`
- đích: PR vào develop. Không merge, không deploy, không test trên dev/staging/prod. Chỉ `src/`, `design/`, `scripts/`, `plans/`, `ops/`.

## 1. Outcome / ràng buộc / không làm

**Outcome.** Mọi màn web đúng bố cục ở 3 khổ, không màn nào tự viết `@media` theo bề rộng. Bộ tiêu chí trên desktop: tiêu đề, breadcrumb, nội dung cùng một lề trái; bảng tiêu chí + panel sửa bên phải; không còn thẻ 640 căn giữa, không nút mũi tên kiểu mobile.

**Quyết định của chủ (2026-11-10, nguyên văn):** "Đồng ý với 3 mốc tablet, desktop và mobile với 3 tầng design như bạn nói. Cũng đồng ý với các component cơ bản share. Cái này bạn cần tự làm để cho nó reuse lại tối đa nhé. Đòng ý rồi. Làm đi, tuân thủ đúng paseo ops playbook nhé."

**Đổi phạm vi (chủ 2026-11-10, nguyên văn):** "giao cho thằng techlead mới, hãy làm chuẩn luồng cài đặt + điểm danh trước, để lấy làm chuẩn + bài học trước nhé, rồi mới áp dụng sau."
→ Đợt này CHỈ 2 luồng, cả 3 khổ 390/834/1440:
- **Cài đặt**: `/cai-dat` (SettingsPage), `/cai-dat/doi-mat-khau` (ChangePasswordPage), Email (EmailSettings), `/cai-dat/bo-tieu-chi` (CriteriaSetSettingsPage). `/cai-dat/nhan-su` chỉ đi qua khung mới, nội dung chưa chuyển (allowlist).
- **Điểm danh**: chi tiết buổi → tab Điểm danh (`SessionDetailPage`/`SessionDetailDesktop` khung + `AttendancePanel`/`AttendanceDesktop` gộp một). Các tab khác của chi tiết buổi (Nhận xét, BTVN, Điểm) nằm trong khung mới nhưng nội dung chưa chuyển (allowlist).
- Pha 2 chỉ dựng phần 2 luồng cần: AppShell, PageShell, `FormPage`, `MasterDetailPage`, `useLayout()`, component cơ bản mà 2 luồng dùng. `ListPage`/`TablePage`/`CalendarPage` để goal sau (chỉ mô tả trong rules.md).
- Kết thúc: `lessons.md` (chạy tốt gì, gate nào bắt lỗi gì, chỗ phải sửa rules/component, ước lượng công màn còn lại) → handback PM. Màn khác là goal sau, chủ duyệt riêng.

**Không làm.** Không chuyển Lớp, Lịch, Điểm số, Học sinh, Báo cáo, Nhân sự, phụ huynh. Không đổi nghiệp vụ, dữ liệu, API, iOS, worker. Không thêm tính năng. Không đổi màu/chữ thương hiệu.

## 2. Hiện trạng (develop 6969ec6, đo)

- `@media` theo bề rộng: 40 × `(min-width:1024px)`, 8 × `(max-width:1023px)`, thêm 420/560/720/767/768/1279/1439 rải trong ~35 file CSS (`src/features/**`, `src/shared/ui/ui.module.css` 8 chỗ, `src/app/shell.module.css`, `src/roles/guardian`).
- `rules.md` mục 1: "thẻ ≤640 căn giữa vùng nội dung" mâu thuẫn với "căn trái theo lề sidebar" → nguồn của lỗi Bộ tiêu chí (`criteriaSetSettings.module.css` `.listPanel { width:min(100%,var(--form-max)); margin-inline:auto }`).
- Khung: `src/app/shell.module.css` gộp tab bar mobile + sidebar desktop; không có tablet. Mỗi màn tự dựng header/breadcrumb (`PageHeader` ở `shared/ui`, Bộ tiêu chí tự viết `.breadcrumb`).
- Màn còn tách bố cục bằng JS `useIsDesktop()` (`src/shared/hooks/useIsDesktop`): SettingsPage, ChangePasswordPage, CriteriaSetSettingsPage, AttendancePanel (→ AttendanceDesktop), SessionDetailPage, ClassSpaceLayout, TestsTab, CommentTicketSheet. Đây là `@media` trá hình: G1 phải chặn.
- Có sẵn để dùng lại: `scripts/ui-audit-capture.mjs` (Playwright + `page.route("**/v1/**")` dữ liệu mẫu), test quét CSS `src/test/cssMedia.ts`, test hover postcss, `check-bundle.mjs`.

## 3. Kiến trúc chốt

| Tầng | Nơi | Được biết mốc? |
|---|---|---|
| 1 Token | `design/tokens/tokens.{css,json}` → chép `src/shared/styles/tokens.css` | Có: chỉ khối `:root` đổi token mật độ ở 640 / 1024 |
| 2 Component cơ bản | `src/shared/ui/` (Button, Field/Input, Card, ListRow, Pill/Badge, Chip, Segmented, Sheet, Modal/Dialog, EmptyState, ActionFooter…) | Không. Chỉ `(hover:hover)`, `(pointer:fine)`, `prefers-reduced-motion`, `@container` |
| 3 Khung + mẫu trang | `src/shared/layout/` (mới): `AppShell`, `PageShell`, `ListPage`, `MasterDetailPage`, `FormPage`, `TablePage`, `CalendarPage` | Có, nơi DUY NHẤT |
| 4 Màn | `src/features/**`, `src/roles/**` | Không. Chọn mẫu, điền slot |

**Mốc:** mobile `< 640px` · tablet `640–1023px` · desktop `≥ 1024px`. CSS không dùng biến trong `@media` nên số viết trực tiếp, chỉ ở tầng 1 và 3.

**Token mật độ (đổi theo mốc trong `:root`):** `--page-x` 16/24/32, `--page-top`, `--title-gap` 16/20/24, `--section-gap` 24/28/32, `--card-pad` 16/18/20, `--card-gap` 12/14/16, `--tap` 44 (cảm ứng mọi khổ) và 36 chỉ khi `(pointer:fine)`. Thêm token bố cục: `--page-max` (desktop 1200), `--form-max` (giữ 640, nhưng căn trái), `--detail-w` (380 desktop), `--rail-w` (72), `--sidebar-width` (giữ), `--bp-tablet`/`--bp-desktop` chỉ để tài liệu (không dùng trong `@media`).

**AppShell:** một mảng mục điều hướng (`navItems`) → mobile tab bar dưới; tablet rail icon bên trái (nhãn ngắn dưới icon, ≥44); desktop sidebar (giữ chọn lớp + nhóm con như hiện tại). Màn chi tiết mobile ẩn tab bar như cũ (`data-staff-detail`).

**PageShell:** slot `breadcrumb?`, `eyebrow?`, `title`, `actions?`, `children`, `backTo?` (mobile). Breadcrumb, tiêu đề, hành động, nội dung chung một cột trái, `max-width: var(--page-max)`, không `margin-inline:auto` cho nội dung. Mobile: breadcrumb thay bằng nút quay lại; hành động đầu trang thu vào hàng tiêu đề hoặc thanh đáy.

**Mẫu trang:**
- `ListPage`: lưới thẻ `auto-fill minmax(300px,1fr)` (container query), mobile một cột.
- `MasterDetailPage`: desktop `minmax(0,1fr) var(--detail-w)` panel phải sticky; tablet: chi tiết là sheet bên phải (hoặc push nếu chủ chọn); mobile: push màn chi tiết hoặc bottom sheet (prop `mobileDetail="push"|"sheet"`).
- `FormPage`: cột form `max-width: var(--form-max)` CĂN TRÁI cùng lề tiêu đề; nút cuối form căn phải theo lề form, desktop nút rộng theo nội dung; mobile nút chính ghim đáy.
- `TablePage`: desktop bảng thật; tablet bảng cuộn ngang trong khung (không tràn trang); mobile thành danh sách `ListRow`.
- `CalendarPage`: desktop lịch tuần + panel buổi; tablet lịch tuần gọn; mobile danh sách theo ngày.

**Bộ tiêu chí (mẫu chuẩn):** `MasterDetailPage` + `TablePage`: desktop bảng tiêu chí (Thứ tự · Tên · Mức · BTVN · thao tác) + panel sửa bên phải sticky; đổi thứ tự bằng kéo thả có tay nắm + phím (↑/↓ trong menu hàng) thay nút mũi tên lớn; tablet bảng + panel sheet phải; mobile danh sách + sheet đáy, đổi thứ tự trong sheet.

## 4. Gate UI (ghi vào `ops/decisions.md`, áp cho mọi việc UI web từ nay)

- **G1 Cấu trúc** (vitest, chạy trong `npm test`): fail khi (a) `@media` theo bề rộng (`min-width|max-width|width`) ngoài `src/shared/layout/**` + `src/shared/styles/tokens.css`, hoặc gọi `useIsDesktop`/`matchMedia` theo bề rộng ngoài `src/shared/layout/**` (màn cần biết khổ thì nhận qua slot/prop của mẫu trang, hoặc `useLayout()` của tầng 3 — chỉ cho hành vi như push vs sheet, không cho style); (b) ghi cứng màu (`#hex`, `rgb(`, `hsl(`), `font-size` / `padding` / `margin` / `gap` số px ngoài token (cho phép `0`, `1px` viền, `%`, `fr`); (c) file route của màn không render qua `PageShell`/mẫu trang. Danh sách cho phép tạm `src/test/layoutAllowlist.ts`: chỉ được giảm (test so với số đếm ghi trong file).
- **G2 Bố cục tự động** (Playwright local, `npm run test:layout`, dữ liệu `page.route` cố định: ngắn/dài/tên dài/rỗng/đang tải/lỗi) ở 390×844, 834×1112, 1440×900: không tràn ngang (`scrollWidth ≤ clientWidth`); breadcrumb/tiêu đề/nội dung lệch lề trái ≤ 1px; không vùng trống > 20% bề rộng BÊN TRONG một khối (thẻ, bảng, hàng, lưới cột) — phần lề phải sau cột `FormPage` (`--form-max`, căn trái) là chủ đích, không tính; control cùng loại trong một danh sách thẳng cột (lệch x ≤ 1px); sheet/dialog mở thì footer không bị tab bar/rail đè và thân sheet không lộ dưới footer; nút desktop rộng theo nội dung (không nút nào ≥ 90% cột khi không phải ô nhập); vùng bấm ≥ 44 (390/834) / ≥ 36 (1440, pointer fine); không chữ bị cắt (`scrollWidth > clientWidth` trên phần tử chữ không có `title`); điều hướng: 390 tab bar, 834 rail, 1440 sidebar.
- **G3 Ảnh**: mọi trạng thái bị đổi × 3 khổ, lưu `/tmp/qlh-evidence/ql-004/<màn>/<trạng thái>-<khổ>.png` (không commit). Thiếu một khổ = trượt.
- **G4 Reviewer độc lập** (model khác, codex sol medium/high) chấm ảnh 3 khổ theo `rules.md` + phạm vi ảnh hưởng (mọi màn dùng component bị đổi) → PASS.
- Thêm: `npm test` + `npm run build` (gồm check-bundle) 0 fail; `:hover` bọc `(hover:hover)`; ô nhập ≥ 16px.

## 5. Pha

### Pha 1 — chuẩn và ảnh mẫu (dừng chờ chủ duyệt)
1. Dev A (packet `briefs/p1-rules-tokens-mock.md`): viết lại `design/ux-v2/rules.md` theo 4 tầng + 3 mốc (bỏ "căn giữa"); token mật độ/bố cục 3 mốc vào `design/tokens/tokens.{css,json}` + README (mốc mới); mock tĩnh `design/responsive-mock/` (HTML + CSS chỉ dùng `design/tokens/tokens.css`, dữ liệu giả cứng trong HTML) gồm AppShell (tab bar / rail / sidebar) và các màn của 2 luồng: Cài đặt (menu), Đổi mật khẩu (FormPage), Bộ tiêu chí (danh sách + panel sửa / sheet; trạng thái: danh sách thường, đang sửa, rỗng, tên dài), Điểm danh (danh sách em + trạng thái; ngắn/dài/tên dài, chưa điểm danh, đã đủ); script Playwright chụp 390/834/1440 → `/tmp/qlh-evidence/ql-004/mock/`.
2. TL soi ảnh (qua sub-agent nén ảnh), gửi PM `NEEDS_DECISION` kèm đường dẫn ảnh. Chưa chép token sang `src/` cho tới khi chủ duyệt.

### Pha 2 — khung, component, gate (chỉ phần 2 luồng cần)
- Dev B: `src/shared/layout/` (AppShell một nguồn `navItems`, PageShell, `FormPage`, `MasterDetailPage`, `useLayout()`) + tách `shell.module.css`; chép token.
- Dev C: gỡ `@media` bề rộng khỏi component `src/shared/ui/**` mà 2 luồng dùng (Button, Field, Card, Sheet, Modal, ActionFooter, PageHeader→thay bằng PageShell, Segmented, Pill, EmptyState), đổi sang `@container` hoặc đẩy lên mẫu trang, giữ API.
- Dev D: G1 (vitest) + G2 (`scripts/layout-gate.mjs` dựa `ui-audit-capture.mjs`, route của 2 luồng) + allowlist khởi điểm = mọi màn ngoài 2 luồng.
- B và C song song (file không chồng); D sau B.

### Pha 3 — chuyển 2 luồng
1. Bộ tiêu chí (chuẩn mẫu MasterDetail).
2. Cài đặt: menu, Đổi mật khẩu, Email (FormPage).
3. Điểm danh: khung chi tiết buổi + gộp `AttendancePanel`/`AttendanceDesktop` thành một component đi qua mẫu trang.
Mỗi bước: G1–G3. Cuối: G4 reviewer (phạm vi ảnh hưởng gồm cả màn ngoài 2 luồng dùng component bị đổi) → `lessons.md` → mở PR vào develop → handback PM.

### Chủ duyệt mock (2026-11-11, "okay hết")
- Bố cục 3 khổ như mock; sắp xếp tiêu chí: tay kéo + menu "…" Lên/Xuống.
- Tablet: editor tiêu chí là sheet phải; Điểm danh bỏ panel Tóm tắt.
- Lề ngang mobile 16px; cột bảng tiêu chí chỉ "Mặc định: <mức>".
- Điểm danh mobile giữ như cũ: MỘT chip trạng thái, chạm để đổi vòng.

### Ghi chú Pha 2 → Pha 3 (TL soi ảnh gộp `f3b1dbf`)
- Tablet editor tiêu chí: sheet phải đúng, nhưng Huỷ/Lưu nhỏ và xếp dọc → sửa khi chuyển Bộ tiêu chí.
- `src/roles/guardian/*.module.css` còn `@media` bề rộng: ngoài 2 luồng, nằm trong allowlist.

## 6. Rủi ro
- Đổi component dùng chung ảnh hưởng mọi màn → G2 chạy toàn bộ route, G4 review phạm vi.
- iPad cảm ứng ở 1024+ nhận sidebar nhưng vùng bấm vẫn 44 (`pointer:fine` mới 36).
- Container query: Safari iOS ≥ 16 hỗ trợ; PWA iPhone đang dùng iOS 17+ (chấp nhận).
- Màn bảng điểm có cột kéo rộng (`--grid-*`) — giữ hành vi, chỉ dời `@media` lên `TablePage`.
- Rollback: một nhánh, PR chưa merge.
