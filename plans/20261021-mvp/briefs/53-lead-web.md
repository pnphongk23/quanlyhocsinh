# Domain Lead · Web (prototype hoàn thiện + bản web thật)

Đọc trước `briefs/50-lead-common.md` (quy tắc chung, bắt buộc). Mảng của bạn có HAI giai đoạn nối tiếp.

## Giai đoạn 0: hoàn thiện prototype (thư mục chính, KHÔNG worktree)

Prototype `design/prototype` đã được người dùng duyệt làm chuẩn cho bản web thật, nhưng giai đoạn Tài khoản (P2) đang dở: một worker pi vừa bị huỷ giữa chừng. Trong thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype` (workspace `wks_5d1bc443eaa9f683`) đã có (chưa commit, lẫn thay đổi chưa commit của người dùng và của giai đoạn P1): màn Tài khoản mới (`features/auth/*`, `settings/ChangePasswordPage`, `data/authAccounts.ts`, sửa `routes.tsx`, `TeacherShell.tsx`, `shared/features.ts`, seed...). Việc: giao MỘT worker (Codex, `full-access`) hoàn thành đúng `plans/20261021-mvp/briefs/31-proto-auth.md` (đọc kèm quy tắc phạm vi ở đầu `plans/20261021-mvp/status.md` và hai thông điệp đã gửi trước đó: chỉ phần MVP; ngoài MVP chỉ ẨN lối vào bằng cờ trong `features.ts`, giữ code/test). Ràng buộc nghiêm: KHÔNG `git checkout/reset/stash/commit/push`, không hoàn tác thay đổi nào, chỉ sửa tại chỗ. Xác minh: `cd design/prototype && npm test` và `npm run build` xanh (bạn tự chạy lại), chụp màn Tài khoản mobile/web so với `plans/20261021-mvp/design/auth-r4/`, sidebar/menu chỉ còn mục MVP cho giáo viên và phụ huynh. Gói này KHÔNG làm song song với worker khác trong cùng thư mục.

## Giai đoạn 1: bản web thật (worktree riêng, sau khi giai đoạn 0 xong; chuẩn bị song song được phần không phụ thuộc)

Tự tạo worktree: `create_workspace` isolation worktree, branch-off từ `main`, `branchName: mvp-web`, `worktreeSlug: mvp-web`, title "MVP web client", path `/Users/phamnhuphong/Git/quanlyhocsinh`. Lưu ý worktree từ `main` KHÔNG có prototype chưa commit: worker đọc prototype bằng đường dẫn tuyệt đối trong thư mục chính và sao chép mã cần dùng vào worktree (không sửa thư mục chính ở giai đoạn này).

Mục tiêu: ứng dụng web/PWA THẬT theo `docs/architecture.md` mục 2, 3, 5, 6 (Vite + React + TypeScript, React Router, CSS Modules, Dexie + outbox idempotent, chia chunk `roles/staff` và `roles/guardian`, thư viện nặng tải lười, JS ban đầu ≤ 200 KB gzip, `src/` ở gốc repo), giao diện và hành vi KHỚP đúng prototype đã duyệt (mobile + desktop; desktop cho giáo viên: Chi tiết lớp, ảnh chuẩn `design/round-4/`; mobile/Tài khoản: `design/auth-r4/`; token xanh `#2F5BEA`). Tái sử dụng mã prototype khi hợp lý (sao chép component, CSS, logic hiển thị), thay lớp dữ liệu localStorage bằng repositories gọi API thật + Dexie + hàng đợi ghi theo `plans/20261021-mvp/backend/api-spec.md` và `offline-plan.md`. Backend do mảng Backend làm song song: bạn làm theo hợp đồng spec với client có kiểu (typed) và máy chủ giả cho test; khi staging API có, General Lead báo URL để nối.

## Gói việc giai đoạn 1 (chia worker, ranh giới file rõ; tối đa 4 song song)

1. **W-1 Nền** (một worker, sở hữu `package.json`, `vite.config`, `src/app`, `src/shared`, `src/data`, `src/i18n`): khung Vite/TS, router, design system (token, thành phần chung sao chép từ prototype), API client + repositories, Dexie + outbox + sync, đăng nhập (Bearer), phân tách chunk theo vai trò, vitest.
2. **W-2 Giáo viên mobile/PWA** (`src/features/{classes,students,sessions,attendance,scores,homework,comments,reports}` phần mobile), **W-3 Giáo viên desktop** (layout desktop Chi tiết lớp: Buổi học 3 tab, Bài kiểm tra, Điểm, Học sinh, Báo cáo), **W-4 Phụ huynh + Tài khoản + Cài đặt + PWA** (guardian app, màn Tài khoản, đổi mật khẩu bắt buộc, chọn vai trò, manifest, service worker precache khung app + font, màn hướng dẫn "Mở bằng Safari", FCM web token qua abstraction, no-op nếu chưa có cấu hình Firebase). W-2..W-4 bắt đầu sau khi W-1 có khung compile được; mỗi worker chỉ sửa thư mục của mình.
3. **W-5 Hoàn thiện + deploy**: test, đo kích thước bundle, deploy Cloudflare Pages staging (`qlh-staging-web`, `wrangler pages deploy`, chỉ staging; cần URL API staging của mảng Backend, hỏi General Lead), chụp so ảnh với thiết kế.

## Tiêu chí xong

- Giai đoạn 0: `npm test` + `npm run build` xanh ở `design/prototype`, Tài khoản khớp ảnh, chỉ còn mục MVP ở mọi menu.
- Giai đoạn 1: `npm run typecheck`, `npm test`, `npm run build` xanh ở worktree; bundle ban đầu ≤ 200 KB gzip (nêu số đo thật); chụp từng màn chính mobile (390 px) và desktop (1360×934) so với ảnh thiết kế, bảng khác biệt còn lại; không điểm trung bình, không "Vắng thi", không bài giảng/học phí/lương/nhân sự/mời/OTP, không SĐT/mật khẩu thật; đăng xuất bị chặn khi còn lệnh chờ; chỉ báo lỗi lưu/đồng bộ, không chip thường trực.
- Một review tổng thể (codex ≤ 2 vòng) trước DONE.
