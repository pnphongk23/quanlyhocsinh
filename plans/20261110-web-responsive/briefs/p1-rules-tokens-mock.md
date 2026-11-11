# Packet P1 · rules.md + token 3 mốc + mock 2 luồng (QL-004)

Đọc trước: `/Users/phamnhuphong/.claude/paseo-ops/dev.md`, `AGENTS.md`, `CLAUDE.md`, `plans/20261110-web-responsive/plan.md` (đặc biệt mục 1, 3, 4), `design/ux-v2/rules.md`, `design/tokens/README.md`, `design/tokens/tokens.css`.

Làm trong worktree `/Users/phamnhuphong/Git/qlh-wt/web-responsive` (nhánh `feat/web-responsive-layout`). Không đụng main repo `~/Git/quanlyhocsinh`.

## Mục tiêu
Tạo chuẩn và ảnh mẫu để CHỦ duyệt trước khi code màn thật. Chỉ 2 luồng: Cài đặt (gồm Bộ tiêu chí nhận xét) và Điểm danh.

## File được sửa / tạo
- `design/ux-v2/rules.md` (viết lại mục 1 + thêm mục "Tầng và mốc"; giữ nguyên mục 4–7 trừ chỗ nói mốc)
- `design/tokens/tokens.css`, `design/tokens/tokens.json`, `design/tokens/README.md`
- mới: `design/responsive-mock/**` (HTML/CSS tĩnh + script chụp)
KHÔNG sửa `src/**`, `design/prototype/**`, iOS, worker. Không chép token sang `src/` (đợi chủ duyệt).

## Yêu cầu
1. **rules.md**: 4 tầng (token / component cơ bản / khung+mẫu trang / màn) đúng plan mục 3; mốc mobile <640, tablet 640–1023, desktop ≥1024; chỉ tầng token và `src/shared/layout` được `@media` theo bề rộng hoặc `useIsDesktop`; component chỉ `(hover:hover)`, `(pointer:fine)`, reduced-motion, `@container`. Bỏ câu "thẻ ≤640 căn giữa": form/cài đặt căn TRÁI cùng lề tiêu đề, `max-width: var(--form-max)`. Breadcrumb–tiêu đề–nội dung cùng lề trái. Mô tả AppShell (tab bar / rail / sidebar, một nguồn mục điều hướng), PageShell, FormPage, MasterDetailPage (desktop 2 cột panel phải sticky; tablet panel thành sheet phải; mobile push hoặc sheet đáy); ListPage/TablePage/CalendarPage ghi ngắn là "goal sau". Ghi gate G1–G4 (plan mục 4). Vùng bấm 44 cảm ứng, 36 chỉ `(pointer:fine)`. Ô nhập ≥16px.
2. **Token** (sửa cả .css và .json cùng giá trị): token mật độ đổi theo 3 mốc trong `:root` (`--page-x` 16/24/32, `--title-gap` 16/20/24, `--section-gap` 24/28/32, `--card-pad` 16/18/20, `--card-gap` 12/14/16, các token đang đổi ở 1024 thì xếp lại theo 3 mốc); thêm `--page-max` 1200px, `--detail-w` 380px, `--rail-w` 72px; `--form-max` giữ. Thêm giá trị mới vào thang `--space-*` nếu cần (28, 18, 14) trước khi dùng. README: cập nhật dòng "Mốc khổ" và bảng thay đổi.
3. **Mock** `design/responsive-mock/index.html` (+ `mock.css`), CSS CHỈ dùng biến từ `../tokens/tokens.css` (link trực tiếp), không ghi cứng màu/cỡ chữ/khoảng cách. Mỗi màn là một trang (hoặc `?screen=` / `#hash`) để chụp riêng:
   - `settings` — menu Cài đặt (hồ sơ, đổi mật khẩu, email, nhân sự, bộ tiêu chí).
   - `password` — Đổi mật khẩu (FormPage: form căn trái, nút Lưu căn phải cuối form, desktop rộng theo nội dung, mobile ghim đáy).
   - `criteria`, `criteria-editing`, `criteria-empty`, `criteria-long` — Bộ tiêu chí: desktop bảng (Thứ tự · Tên · 3 mức · BTVN · thao tác) + panel sửa phải sticky khi đang sửa; đổi thứ tự bằng tay nắm kéo (icon nhỏ) + menu hàng "Lên/Xuống", KHÔNG nút mũi tên 44px; tablet bảng + panel sheet phải; mobile danh sách + sheet đáy. Breadcrumb "Cài đặt › Bộ tiêu chí nhận xét" cùng lề trái với tiêu đề và bảng, cùng một dòng.
   - `attendance`, `attendance-long`, `attendance-done` — chi tiết buổi tab Điểm danh: header buổi (lớp · ngày · giờ), tab buổi, danh sách em với trạng thái Có mặt/Vắng/Muộn (segmented), nút "Tất cả có mặt"; desktop bảng gọn + panel tóm tắt phải; tablet một cột rộng; mobile danh sách + thanh hành động ghim đáy. Có tên dài (≥40 ký tự) không bị cắt cụt mất nghĩa.
   - Khung: 390 tab bar dưới, 834 rail icon trái, 1440 sidebar.
   Tham khảo màn thật để giữ nội dung/nhãn: `src/features/settings/*`, `src/features/comments/CriteriaSetSettingsPage.tsx`, `src/features/attendance/*`, `src/features/class-space/SessionDetail*.tsx`, `src/app/shell.module.css`.
4. **Chụp**: `design/responsive-mock/capture.mjs` (Playwright đã có trong devDependencies) mở file mock qua `file://` hoặc `npx vite preview`/http local, chụp mỗi màn × 390×844, 834×1112, 1440×900 (full page) vào `/tmp/qlh-evidence/ql-004/mock/<màn>-<khổ>.png`. Script cũng in số đo: tràn ngang (scrollWidth > clientWidth), lệch lề trái breadcrumb/tiêu đề/nội dung, vùng bấm < 44 (390/834).

## Nghiệm thu
- `node design/responsive-mock/capture.mjs` chạy exit 0, tạo đủ 10 màn × 3 khổ = 30 ảnh, không tràn ngang, lệch lề ≤1px.
- `grep` trong `design/responsive-mock/*.css`: không `#hex`/`rgb(`/số px cỡ chữ-khoảng cách ngoài `var(--…)` (cho phép `0`, `1px` viền, `%`, `fr`).
- tokens.css và tokens.json cùng giá trị (tự kiểm bằng script nhỏ hoặc so tay, ghi cách kiểm).
- Tự xem lại ảnh (nén nhỏ trước khi xem), sửa lỗi bố cục thấy được trước khi báo.
- Không commit. Ảnh không vào repo.

## Cấm
env/printenv/set/ps/pgrep -fl/lsof; đọc/in `~/.config/qlh/*`, token, secret; `pkill -f`/`pgrep -f`/`killall` (dừng đúng PID mình tạo); test trên dev/staging/prod; push.
Giới hạn: ~90 phút. Kẹt quá 3 lần cùng một lỗi → BLOCKED kèm mô tả.

## Handback (≤10 dòng)
`DONE | BLOCKED` · file đã đổi · lệnh + kết quả · thư mục ảnh · điểm chưa chắc cần TL quyết.
