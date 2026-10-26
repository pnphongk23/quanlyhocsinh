# Plan · Báo cáo theo khoảng buổi + Quên mật khẩu qua email

Brief 82 · 2026-10-24 · PLAN_DRAFT

## 1. Dữ liệu (D1, chuỗi tuần tự)
- `0004_report_batches.sql`: bảng `report_batches(id, workspace_id, class_id, from_session_id, to_session_id, from_key, to_key, created_by, created_at, version)`; `from_key/to_key` = `date||' '||start_time` (số buổi tính động nên lưu theo mốc thời gian). Dựng lại `reports` (bỏ `UNIQUE(student_id,month)`, thêm `batch_id NOT NULL`, `month` thành cột cũ nullable, `UNIQUE(batch_id,student_id)`); `report_publications` thêm `batch_id`; tạo lại trigger change_log, bất biến, republish (theo khoảng thay tháng). Dữ liệu cũ: mỗi (lớp, tháng) ⇒ 1 batch `from_key='YYYY-MM-01 00:00'`, `to_key='YYYY-MM-31 23:59'`, session id NULL; bản chụp cũ giữ nguyên.
- `0005_account_email.sql`: `users.email` (nullable, chữ thường, ≤254); `password_reset_tokens(id, user_id, token_hash UNIQUE, created_at, expires_at, used_at)`; `test_mailbox(id, to_email, subject, body, created_at)` chỉ cho chế độ thử.

## 2. API (đổi hợp đồng ⇒ contract-changes.md mục 2026-10-24)
Báo cáo (`comments_reports`; phụ huynh chỉ bản đã phát hành của con):
- `POST /classes/:id/report-batches {id?, from_session_id, to_session_id}` → 201 batch + nháp cho học sinh đang học trong khoảng (`enrolled_at ≤ to`, `left_at` NULL hoặc ≥ from). Lỗi: `invalid_range`, `session_cancelled`, 404. Cho trùng khoảng.
- `GET /classes/:id/report-batches` → đợt kèm số buổi, ngày, đếm trạng thái.
- `GET /report-batches/:id/reports`; `GET /reports/:id/preview`; `PUT /reports/:id {general_comment}`; `POST /reports/:id/publish`; `POST /report-batches/:id/publish` (cả lớp). Số liệu: buổi `status<>'cancelled'` trong khoảng; bản chụp chứa nhãn "Buổi a–b · dd/mm–dd/mm".
- `GET /students/:id/reports` giữ, item thêm `batch_id`, khoảng; con trỏ theo `to_key`.
- Endpoint cũ theo `month` trả 410 `endpoint_retired`. Sync: entity mới `report_batch`; `report`/`report_publication` thêm `batch_id`, `month` có thể null (phá vỡ với client cũ, iOS làm sau).

Mật khẩu:
- `POST /auth/register*` nhận `email` tùy chọn. `GET /me` trả `email`. `PUT /me/email {email|null, current_password}`: đề xuất bắt nhập mật khẩu hiện tại để phiên bị lộ không cài email chiếm tài khoản (GL phủ quyết được).
- `POST /auth/password-reset/lookup {phone}` → `{account, has_email, email_masked}` (`t***@gmail.com`).
- `POST /auth/password-reset/request {phone, email}` → 202 khi khớp; `email_mismatch` 422; `no_email` 409. Không lưu email mới.
- `POST /auth/password-reset/confirm {token, new_password}` → đổi mật khẩu, thu hồi mọi phiên, vô hiệu token khác; `token_invalid` (hết hạn/đã dùng/sai) 400.
- Token 32 byte, lưu SHA-256, 30 phút, một lần. Link `${RESET_LINK_BASE}/dat-lai-mat-khau#token=…` (fragment, không vào log). Throttle lookup+request: SĐT 5/15 phút, IP 20/15 phút; confirm theo IP.

## 3. Gửi mail khi chưa có miền
`MailSender` trong `lib/mail.ts`. `MAIL_MODE`: `cloudflare` (khi có miền), `test` (staging: ghi `test_mailbox`, chỉ đọc bằng `wrangler d1 execute`, cron xoá sau 1 giờ), `disabled` (503 `mail_unavailable`). Log không có email/token/SĐT.

## 4. Worker và write-set (không trùng file)
- W1 sonnet · backend báo cáo: 0004, `db/reports.ts`, `routes/reports.ts`, `db/sync-read.ts`, `tests/reports*.test.ts`.
- W2 sonnet · backend tài khoản (song song W1): 0005, `db/password-reset.ts`, `lib/mail.ts`, `routes/auth.ts`, `db/auth.ts`, `types.ts`, `wrangler.jsonc`, `cron` dọn, `tests/password-reset.test.ts`.
- W3 sonnet · web báo cáo (sau W1): `data/repositories/reports.ts`, `data/reportModel.ts`, `data/types.ts`, `api/mapping.ts`, `features/reports/*`, `roles/guardian/*`.
- W4 sonnet · web tài khoản (sau W2, ∥ W3): `features/auth/*`, `features/settings/*`, `data/auth/*`, route mới trong `app/`.
- W5 sonnet · prototype (∥ từ đầu, thư mục chính, không commit): ReportsPage, popup xem trước, phụ huynh, Cài đặt email, Quên/Đặt mật khẩu.
- Luna: ảnh 390/1280 + E2E staging. Codex luna: 1 review, ≤2 vòng. Thứ tự: W1∥W2∥W5 → W3∥W4.

## 5. mvp-web
Làm trên worktree + nhánh riêng `feat/reports-email` tách từ HEAD `mvp-web` (cây chung đang có thay đổi dở); GL gộp.

## 6. Rủi ro (kiểm theo brief mục 4)
- Dựng lại `reports` (FK, trigger): thử migration trên bản sao staging cục bộ trước.
- Phá vỡ sync iOS cũ (`month` null).
- Lookup lộ tồn tại tài khoản: spec chấp nhận, có throttle.

## 7. GL duyệt 2026-10-24 (thắng các mục trên)
- `report.month`, `report_publication.month` luôn điền (đợt mới = tháng của buổi kết thúc), không null; GET cũ theo month giữ nếu rẻ, chỉ tạo/sửa/phát hành theo month trả 410.
- `MAIL_MODE=test` chỉ khi `ENVIRONMENT=staging`, khác thì 503 `mail_unavailable`; thiếu cấu hình = disabled.
- PUT /me/email bắt mật khẩu hiện tại: duyệt.
- Web: email nhớ trên máy theo SĐT, chỉ điền khi SĐT nhập trùng. Link đặt lại luôn mở web `/dat-lai-mat-khau`.
- Backend làm thẳng trên mvp-backend; web tách nhánh sau khi GL báo deploy UI xong.

## 8. Deploy staging và lùi (GL yêu cầu 2026-10-24)
- Staging D1 mới áp 0001–0002. Đợt này áp 0003 → 0004 → 0005 (diễn tập trên bản export: sạch, số đếm khớp, hash snapshot khớp).
- 0003 (commit 58e5665, "expose assigned teacher name to guardians") chỉ có 4 trigger ghi `change_log` cho lớp khi đổi gán lớp/vai trò/tên giáo viên: `change_log_member_class_ai`, `change_log_member_class_ad`, `change_log_membership_teacher_au`, `change_log_user_teacher_au`. `teacher_name` tính lúc đọc, nên thiếu 0003 không hở quyền; chỉ làm client phụ huynh đang sync thấy tên giáo viên cũ tới khi lớp đổi.
- Trước khi áp: `npx wrangler d1 time-travel info qlh-staging-db --env staging` ghi bookmark + giờ vào báo cáo deploy; ghi version Worker đang chạy (`wrangler deployments list --env staging`).
- Thứ tự: áp migration (`wrangler d1 migrations apply qlh-staging-db --remote --env staging`) → deploy Worker từ worktree sạch đúng commit → web.
- Lùi (DB + Worker cùng lúc, vì Worker cũ ghi `reports` không có `batch_id` sẽ lỗi trên schema mới): `npx wrangler d1 time-travel restore qlh-staging-db --bookmark=<bookmark> --env staging` rồi `npx wrangler rollback <version cũ> --env staging`. Mất mọi ghi sau bookmark; chỉ dùng khi lỗi chặn.
- Kiểm migration (GL): trước và sau deploy chạy `npx wrangler d1 migrations list qlh-staging-db --remote --env staging`; báo GL danh sách "chưa áp": trước = 0003, 0004, 0005; sau = rỗng. Ghi cả hai vào handback deploy.
