# Việc backend-04 (B-4): staging Cloudflare + đo CPU thật

Bạn là worker. Làm trong worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, thư mục `worker/` (nhánh `mvp-backend`, HEAD đã có toàn bộ endpoint, 82/82 test). Đọc: `worker/README.md`, `worker/wrangler.jsonc`, `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/{stack-and-cpu.md,api-spec.md}` (mục 0, 4, 10). Dùng `srcwalk` thay rg/grep/cat.

## Việc
1. Tạo tài nguyên CHỈ tiền tố `qlh-staging-`: D1 `qlh-staging-db`, Worker `qlh-staging-api`. wrangler đã đăng nhập (d1/pages/workers/kv); KHÔNG đăng nhập lại, KHÔNG tạo R2 (token không có quyền, người dùng chưa bật; PDF trả 503 `pdf_storage_unavailable` là đúng). Điền `database_id` thật vào cấu hình staging (commit được, không phải secret).
2. Áp migrations từ xa, deploy Worker staging, đặt secret bằng `wrangler secret put` qua stdin (mã đăng ký sinh ngẫu nhiên, KHÔNG in giá trị ra chat/log/báo cáo; lưu ở `worker/.dev.vars` đã gitignore nếu cần cho smoke test; secret FCM: chưa có, bỏ qua).
3. Smoke test thật qua HTTPS: đăng ký workspace → đăng nhập → tạo lớp → điểm danh → `/me`; che mật khẩu/token trong báo cáo. SĐT giả `+84900000xxx`.
4. Đo CPU thật trên staging: PBKDF2-SHA256 với 100000 vòng và vài mức khác (ví dụ 30000/60000/100000), mỗi mức ≥ 20 lần, nêu trung vị và khoảng min–max (dùng `wrangler tail`/analytics hoặc header đo thời gian trong một route thử TẠM, gỡ route thử sau khi đo và deploy lại). Ký RS256 bằng khoá thử sinh trong Worker (không khoá thật) cũng đo tương tự. Nêu gói Worker đang dùng (Free/Paid) nếu xác định được.
5. Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/impl-b4-staging-report.md`: URL Worker, id D1 (được ghi), lệnh + kết quả, bảng CPU, vấn đề, câu hỏi. Commit thay đổi cấu hình/README trên `mvp-backend` (tiếng Anh, conventional, không nhắc AI), chỉ file bạn sửa. KHÔNG push/merge.

## Ràng buộc
Chỉ staging, không production, không in secret/token/SĐT/mật khẩu thật. Không sửa code miền trong `src/` (trừ route đo tạm đã gỡ). Gặp lỗi quyền/hạ tầng: dừng và báo BLOCKED kèm lỗi (đã che), không đoán.

Kết thúc bằng:
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
