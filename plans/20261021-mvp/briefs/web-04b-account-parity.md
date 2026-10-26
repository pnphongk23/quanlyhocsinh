# Việc W-4b: hoàn tất đối chiếu giao diện màn Tài khoản (tiếp việc W-4 bị dừng giữa chừng)

Worker thay thế (codex hết hạn mức đến 18:19). Làm TIẾP trong worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`). Đọc: `briefs/web-04-account-pwa.md`, `briefs/web-common-ui.md` (Quy tắc UI), `web/w4-report.md`, `briefs/74-decisions-20261022-b.md`. Thư mục chính chỉ đọc (ngoại lệ: `web/w4-report.md` và ảnh `web/shots/w4/` ở `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/`). Không push/merge/checkout/reset/stash; không `git add -A`; không sửa `design/prototype`; không tạo agent; dùng `srcwalk`.

## Hiện trạng (đã kiểm)
W-4 đã commit `2d9002a`. Còn thay đổi CHƯA commit của W-4 trong: `src/features/auth/{RegisterPage,RolePickerPage}.tsx`, `src/features/auth/registerGuardian.module.css` (mới), `src/features/settings/{ChangePasswordPage,SettingsPage}.tsx`, `src/test/w4-auth-server.mjs`. `typecheck` sạch và `npm test` 156 đạt tại thời điểm này. Các thay đổi này là sửa cho khớp prototype hiện tại (Hồ sơ, ô chỉ đọc, +84, tên con ở vai trò phụ huynh) nhưng chưa kiểm ảnh.

## Làm
1. Rà `git diff` các file trên; GIỮ phần đưa Cài đặt/Đổi mật khẩu/Chọn vai trò sát prototype. BỎ phần đăng ký PHỤ HUYNH (bộ chuyển "Giáo viên | Phụ huynh" trong `RegisterPage.tsx`, `registerGuardian.module.css`): quyết định của GL là đăng ký phụ huynh và màn phụ huynh làm SAU CÙNG theo prototype mới, cùng lúc với guardian; đợt này `RegisterPage` chỉ đăng ký giáo viên giống bản đã commit. Nếu `RolePickerPage` có sửa liên quan phụ huynh ngoài việc hiển thị tên con/nhãn, giữ lại những gì prototype có, nhưng chọn vai trò phụ huynh vẫn đi tới màn khung của phụ huynh như hiện tại.
2. Tên con ở thẻ vai trò phụ huynh (Cài đặt, Chọn vai trò): lấy từ dữ liệu có sẵn qua `src/data` (memberships/snapshot). Nếu payload thiếu, KHÔNG bịa: ghi vào báo cáo mục "Cần W-1" kèm đề xuất chính xác (trường nào, ở endpoint nào).
3. Chụp lại đúng từng màn (kiểm tên file khớp màn: login, register, forgot, role, settings, change-password; desktop 1360×934 và mobile 390×844), prototype từ `design/prototype` (chạy `npm run dev` cổng khác 5173/5181, tắt khi xong; prototype có thể đã đổi: chụp bản hiện tại) và bản thật; đặt cạnh nhau, liệt kê MỌI khác biệt nhìn thấy (khoảng cách, cỡ chữ, tiêu đề, biểu tượng, chữ), sửa hết (sao chép JSX/CSS module sát hơn). Bảng khác biệt trong `web/w4-report.md` chỉ để lại khác biệt đã được duyệt hoặc do dữ liệu/ API (ví dụ tên con chờ W-1).
4. `npm run typecheck`, `npm test`, `npm run build` xanh (dán số, JS ban đầu gzip). Commit file của bạn (`fix(web): align account screens with prototype`). Không đưa `plans/` của worktree vào commit.

Kết thúc: Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT + 2 câu.
