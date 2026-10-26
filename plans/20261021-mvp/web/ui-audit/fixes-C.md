# fixes-C: phụ huynh + tài khoản + PWA (2026-10-23)

Ranh giới file: `src/roles/guardian/**`, `src/roles/account/**`, `src/features/{auth,settings,pwa}/**`. Không commit.

## Đã sửa
| ID | File | Thay đổi | Cách kiểm |
|---|---|---|---|
| C-01 | `features/settings/SettingsPage.tsx` | Mobile, vai phụ huynh: dùng `PageHeader backTo="/ph"` (nút 44px, cùng hàng tiêu đề như màn con). Nhân sự giữ nguyên. | Test `account.test.tsx` (link "Quay lại" → `/ph`); ảnh `after/C/390x844/v2/022-settings-main.png` |
| C-02 | `guardian/guardian.module.css` | Gap thẻ trong danh sách (`navRows`, `rowList`, `statRow`, `timeline`, `classAside/Sessions`, `sessionCols`) → `--card-gap` (12 mobile / 16 desktop); `.page` → `--page-gap`; `.classLayout` → `--title-gap`. Bỏ ghi đè `--page-gap` trong shell. | Ảnh 390 home: khoảng cách giữa thẻ 12px |
| C-03 | `guardian.module.css`, `guardianShell.module.css` | Padding thẻ/hàng `12px 16px` → `--row-pad-y --card-pad` (desktop 20 thống nhất); gap desktop theo `--card-gap` | Ảnh 1440 home |
| C-04 | `guardianShell.module.css`, `guardian.module.css` | Chip và nút quay lại cùng cách mép trên `--page-top` (12px + safe-area); hàng đầu màn con căn `flex-start` để nút không lệch 4px theo dòng phụ. Màn con trước đây bỏ cả safe-area-top, nay có. | Ảnh 390 scores/settings so với home |
| C-06 | `auth/RolePickerPage.tsx`, `auth/LoginPage.tsx`, `auth/landingPath.ts` (mới) | Theo quyết định GL: từ 2 vai mới hiện màn chọn; 1 vai vào thẳng (nếu server chưa có `active_membership_id` thì màn chọn tự chọn vai duy nhất); 0 vai → `/ph` (màn chưa có con). Câu "có hơn một vai trò" chỉ hiện khi ≥ 2. Nguyên nhân gốc: `LoginPage` chỉ xét `memberships.length === 1`, 0 vai rơi vào màn chọn. | 5 test mới trong `account.test.tsx` (0, 1 có active, 1 chưa active, ≥ 2, picker với 0 vai) |
| C-07 | `auth/auth.module.css` | Chấm quy tắc mật khẩu thành vòng viền `--color-input-border-strong` (thấy rõ trên nền), đạt thì thành tick xanh như cũ | Ảnh register/đổi mật khẩu |
| C-13 | `auth/auth.module.css` | Nút disabled: nền `--color-input-border`, chữ `--color-muted` (đọc được) | Ảnh đổi mật khẩu 390, settings 1440 |
| C-09 | `guardian.module.css` | `text-wrap: balance` cho `.statLabel`, không đổi chữ | Ảnh 375 home |
| C-21 (mới) | `auth/auth.module.css` | Link "Quên mật khẩu?" và "Tạo tài khoản" mobile cao 24/19px → 44px (`--tap`); desktop 36px (`--tap-desktop`); "Quay lại đăng nhập" desktop 23 → 36px. Đo DOM ở 390/375/1440. | Đo `getBoundingClientRect` |
| C-22 (mới) | `auth/auth.module.css` | Quên mật khẩu desktop: hộp hướng dẫn trắng trên thẻ trắng bị thụt 18px → bỏ padding trên desktop | Ảnh 1440 forgot-password |
| C-23 (mới) | `pwa/pwa.module.css` | Khung "Thêm vào Màn hình chính" (bước 3) tràn ngang ở 390/375 → cho xuống dòng; thêm `--safe-top/left/right` cho sheet và nút cố định (trước đó không chừa tai thỏ); z-index 1000 → `--z-toast`, 1 → `--z-raised`; lề → `--page-x` | Ảnh 390/375 pwa |
| Token | cả 7 file css của C | Cỡ chữ 12/13/14/16/18/22/26 → `--text-*`; gap 4–48 → `--space-*`; z-index → `--z-*`. Giá trị hiển thị giữ nguyên. | `npm run build`, ảnh sau |

## Không phải lỗi / không sửa
- **C-05 `/pwa`**: không phải route. `PwaGuideGate` là cổng bọc `<Outlet/>` (`src/app/routes.tsx:12`), chỉ hiện khi UA là in-app browser hoặc iPhone chưa cài. "Không tìm thấy màn hình" là route `*` đúng hành vi. Đã mở giao diện hướng dẫn (UA Instagram, bộ chụp `pwa-guide`) và kiểm lề, vùng bấm (nút 48px), safe-area: sửa ở C-23. Khung của trang 404: "Cần team T".
- **C-08**: nút mũi tên tháng đã là 44×44 (`.monthSwitch button`), hai mũi tên mờ vì cả hai disabled (fixture chỉ có 1 tháng); đủ rõ khi bật. Không sửa.
- **C-10**: chuỗi trong `src/data/logic.ts` đúng nguyên văn spec ("🌟. Chưa"); khoảng trắng là do glyph emoji. Không sửa.
- **C-06 (fixture)**: ảnh picker mới đã có 2 vai (Quản trị viên, Giáo viên); ảnh cũ với 1 vai là lỗi logic thật, đã sửa ở trên.

## Thấp, ghi lại (chưa sửa)
- C-11 breadcrumb "Tài khoản" vs tiêu đề "Tài khoản của tôi" (đổi chữ).
- C-12 hai lối "Quay lại đăng nhập" ở màn Quên mật khẩu desktop.
- C-14 thẻ điểm/báo cáo desktop kéo đủ 896px (cần quyết định bố cục).
- Đăng nhập: bấm "Đăng nhập" khi ô trống vẫn gọi server (không kiểm tra phía client). Thêm kiểm tra là đổi hành vi nên không làm.

## Cần team khác
- **T** `src/data/auth/index.ts` `authFailureMessage`: lỗi không phải `ApiError` hiện nguyên `error.message` tiếng Anh (ảnh có "Cannot read properties of undefined (reading 'id')" khi máy chủ giả trả `{}`). Nên trả câu tiếng Việt chung.
- **T** `src/shared/ui/ui.module.css` `.pageHeaderMain { align-items: center }`: nút quay lại lệch xuống 4px khi tiêu đề có dòng phụ. Phụ huynh đã tự căn `flex-start` trong `guardian.module.css`; màn khác dùng `PageHeader` có eyebrow có thể cần cùng sửa.
- **T** trang `*` ("Không tìm thấy màn hình", `src/app/routes.tsx:26`) không có khung/token.
- **Bộ chụp** `scripts/ui-audit-capture.mjs`: luôn ghi `inventory.md` chung và tiêu đề đổi thành "after" dù chỉ chụp team C (hàng team C đã thay bằng ảnh sau; hàng A/B/T giữ nguyên). `--out` thêm thư mục `<phase>/` nên `--out .../after/` tạo `after/after/C` (đã chuyển thành `after/C`).

## Kiểm
- `npm run typecheck` xanh. `npx vitest run`: 35 file pass, 1 skipped; 281 test pass, 1 skipped (gồm thay đổi đang dở của A/B/T). `npm run build` exit 0 (bundle check qua `check-bundle.mjs`).
- Ảnh sau: `plans/20261021-mvp/web/shots/ui-audit/after/C/<viewport>/v2/` (390, 375, 430, 1440; đăng nhập/đăng ký/quên mật khẩu chụp ở ngữ cảnh chưa đăng nhập).
- Chưa kiểm: iPhone thật (safe-area chỉ qua `env()`), bàn phím ảo che nút, tên dài tiếng Việt, sheet "Chọn con" ở 1440.
