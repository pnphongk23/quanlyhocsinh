# Báo cáo triển khai backend pha 1 (B-1)

Ngày: 2026-10-21 · Worktree: `mvp-backend` · Phạm vi code: `worker/`

## Đã làm

- Hoàn thiện khung Worker dùng Hono + D1: migrations schema 29 bảng và trigger, thư mục `db` theo nhóm, route nhóm miền dạng stub/mount, lỗi HTTP, xác thực Bearer, chuẩn hoá SĐT, PBKDF2, khóa thử đăng nhập, workspace/role mặc định, `GET /me`, đổi role, đăng xuất/đổi mật khẩu và cấp mật khẩu phụ huynh theo B-01.
- Thêm test DDL (29 bảng, `foreign_key_check`, FK chéo workspace/lớp, trigger lịch sử điểm danh/điểm), auth, authz và fixture dùng chung. Cấu hình Vitest/Miniflare chạy D1 và R2 local.
- Thêm `.gitignore`, `.dev.vars.example`, README, script đo gzip. Binding PDF `REPORT_PDFS` hiện là tùy chọn trong `Env`; cấu hình deploy không khai bucket R2. README và comment Wrangler hướng dẫn tạo `qlh-staging-reports`, bỏ comment binding staging rồi deploy.
- Các nhóm miền B-2a/B-2b/B-3 được các worker khác triển khai song song trong cùng worktree; lỗi test còn lại ở các nhóm này được liệt kê bên dưới.

## Xác minh

| Lệnh | Kết quả |
|---|---|
| `npm run migrate:local` | Áp dụng `0001_schema.sql` và `0002_triggers.sql` thành công trên D1 local. |
| `npx vitest run tests/auth.test.ts tests/ddl.test.ts tests/authz.test.ts tests/smoke.test.ts` | 4 files, 10 tests passed. Bao gồm đếm 29 bảng, FK check rỗng, ca chặn chéo workspace/lớp và trigger lịch sử. |
| `npm run typecheck` | Pass tại lần chạy cuối. |
| `npm test` | 12 files: 9 pass, 3 fail; 19 tests pass, 4 fail. Lỗi nằm ở test miền `reports`, `tests-scores`, `sessions` (scope report kỳ vọng 404 nhưng nhận 200; upload PDF kỳ vọng 200 nhưng nhận 409; tạo test trả 500; bộ sinh buổi kỳ vọng 57 nhưng nhận 114). Các file thuộc nhóm miền do worker khác sở hữu. |
| `npm run bundle:size` | Wrangler dry-run thành công khi cấu hình không khai báo R2; bundle 121.88 KiB, gzip 33.61 KiB. |
| `wrangler dev --local` + `curl` | Sau khi migrate local, register → login → `/v1/me` đều thành công; token/SĐT/mật khẩu không ghi vào báo cáo. |

## Commit

- `e858e4053c3be7c633d4448933953951d518500b` — `feat(worker): finish phase one auth and D1 foundation`
- `3f5890317a7931d9f73c5da3315594db86efaeed` — `feat(worker): bind staging report PDF bucket`
- `950d3b518d98a9d4badf80fce0710f1eb96b72a0` — `fix(worker): make report R2 binding optional`

Các commit chỉ stage đường dẫn thuộc B-1. Không deploy, không tạo tài nguyên Cloudflare, không đăng nhập Wrangler; R2 staging chưa bật và chưa được kiểm chứng với bucket thật.

## Câu hỏi còn mở và giới hạn

- Còn các câu hỏi trong `api-spec.md` mục 10: Q1 khôi phục mật khẩu giáo viên/Admin, Q3 kiểm soát đăng ký, Q4 hạn mật khẩu tạm, Q5 quyền trợ giảng, Q6 điểm thập phân, Q8 cổng CPU PBKDF2/gói Workers, Q10 một học sinh một lớp, Q13 chi tiết nhỏ, Q14 một SĐT nhiều vai trò, Q15 định nghĩa vắng liên tiếp, Q16 cách đánh số buổi. B-01 cho cấp lại mật khẩu phụ huynh đã áp dụng theo mặc định tạm được nêu trong spec.
- Chưa chạy đo CPU staging, kiểm thử FCM đầu cuối, deploy hay thử R2 thật. Bộ test đầy đủ hiện chưa xanh vì bốn lỗi thuộc test nhóm miền nêu ở trên; bộ test B-1 auth/DDL/authz chạy riêng đạt 10/10.

Status: DONE_WITH_CONCERNS
Summary: Nền Worker/D1, auth, phân quyền, migrations và test B-1 đã được triển khai, xác minh tại local và commit trên nhánh `mvp-backend`. Typecheck và test B-1 riêng pass; toàn bộ suite còn bốn lỗi ở test miền do nhóm khác sở hữu, còn deploy/CPU/R2 thật chưa kiểm chứng.
