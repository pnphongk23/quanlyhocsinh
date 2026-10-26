# Domain Lead · Backend (Cloudflare Worker + D1)

Đọc trước `briefs/50-lead-common.md` (quy tắc chung, bắt buộc). Mảng của bạn: backend `worker/` ở worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (workspace `wks_a9cc7bd377b6447a`, nhánh `mvp-backend`). Đặt mọi worker của mảng vào workspace này.

## Hiện trạng

Pha 1 đang dở: một worker pi vừa bị huỷ giữa chừng. Trong worktree đã có (chưa commit): `worker/` với `wrangler.jsonc`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `migrations/0001_schema.sql`, `0002_triggers.sql`, `src/` (index, middleware/auth, lib/*, `db/*` khung rỗng theo nhóm, `routes/*`), `tests/smoke.test.ts`. Chưa rõ file nào hoàn chỉnh hay hỏng: việc đầu tiên là kiểm tra thật (chạy `npm install`, `npm run typecheck`, `npm test`) và đối chiếu với `plans/20261021-mvp/briefs/40-backend-impl-p1.md` (tiêu chí pha 1; spec ở `plans/20261021-mvp/backend/`, đường dẫn tuyệt đối trong thư mục chính, chỉ đọc).

## Gói việc (bạn chia worker, ranh giới file rõ)

1. **B-1 Hoàn thiện pha 1** theo `briefs/40`: schema 29 bảng khớp `data-model.md`, trigger lịch sử, tầng `db` duy nhất + hàm kiểm quyền, auth đầy đủ (đăng ký workspace, đăng nhập, đổi mật khẩu, cấp mật khẩu tạm theo B-01, `must_change_password`, khoá 5 lần sai, phiên Bearer băm SHA-256, PBKDF2 cấu hình bằng `PBKDF2_ITERATIONS`), test phân quyền theo từng vai trò (Admin, Giáo viên, Trợ giảng, Phụ huynh, chưa đăng nhập, workspace khác, phụ huynh khác). Một worker.
2. **B-2 Endpoint miền** (sau khi B-1 xanh; mỗi nhóm sở hữu `routes/<nhóm>.ts` + `db/<nhóm>.ts` + test của nó, không đụng `routes/index.ts`):
   - B-2a: classes, students (kèm SĐT phụ huynh, sửa SĐT gỡ liên kết cũ, đánh dấu nghỉ), sessions (sinh buổi theo lịch lặp, hủy, buổi lẻ, calendar), attendance (4 trạng thái, sửa sau lưu, lịch sử), cron sinh buổi.
   - B-2b: tests-scores (bài kiểm tra `max`, `archived`, điểm, xoá hẳn/lưu trữ), homework (phần, chấm 3 mức, buổi chấm suy ra khi đọc), comments (phiếu buổi học: sao, ghi chú, gửi, sửa sau gửi), reports (tháng: nháp, phát hành, bản chụp, PDF do client sinh rồi upload hoặc lưu theo spec).
   - B-2c: notifications + devices (device token, FCM HTTP v1 sender có thể bơm `fetch` để test, cache access token trong D1, payload không chứa nhận xét/điểm; không có service account thật nên test bằng mock) và cron liên quan.
3. **B-3 Đồng bộ** (một worker mạnh, `gpt-6.1-sol`): điểm vào sync theo `api-spec.md` mục 6 và `offline-plan.md` (lệnh có UUID, `base_version`, mỗi lệnh một `batch`, xung đột giữ hai giá trị, kéo thay đổi theo cursor, `snapshot_required`), test mất mạng/gửi lại/hai thiết bị.
4. **B-4 Staging** (chỉ khi B-1..B-3 xanh): tạo tài nguyên Cloudflare tiền tố `qlh-staging-` (D1 `qlh-staging-db`, Worker `qlh-staging-api`), áp migrations từ xa, deploy Worker, đặt secret bằng `wrangler secret put` (mã đăng ký, KHÔNG in giá trị), chạy smoke test thật (đăng ký → đăng nhập → tạo lớp → điểm danh), và **đo CPU thật** trên staging: PBKDF2 (nhiều số vòng) và ký RS256 bằng khoá thử sinh trong Worker (không khoá thật), nêu trung vị/khoảng. Báo kết quả về General Lead ngay khi có. Chỉ staging; không production.

## Tiêu chí xong

- `npm run typecheck`, `npm test` xanh trong `worker/`; test phân quyền theo từng vai trò theo `authz-matrix.md` phủ mọi nhóm endpoint.
- Mọi endpoint MVP trong `backend/api-spec.md` có triển khai và ví dụ chạy được; đúng định dạng lỗi/phân trang; không có điểm trung bình, không "vắng thi", không endpoint ngoài MVP.
- Số buổi theo `sessionNumber` (buổi hủy không có số); BTVN/bài kiểm tra/phiếu đúng quy tắc spec mục 4.
- Bundle gzip nêu rõ; không ghi SĐT/mật khẩu/token/nội dung nhận xét vào log.
- Một review tổng thể (codex, ≤ 2 vòng) trước khi báo DONE; sửa BLOCKER/MAJOR.
- Cập nhật `docs/architecture.md` KHÔNG thuộc phạm vi bạn (báo General Lead nếu implement làm lệch thiết kế).

## Câu hỏi mở tạm dùng mặc định

Q1 (quên mật khẩu: đặt lại thủ công), Q3 (mã đăng ký của vận hành), Q8 (PBKDF2 100.000 vòng cấu hình được), Q6/Q15/Q16: theo `api-spec.md` mục 10; không đảo, ghi câu hỏi nếu cần.
