# Báo cáo triển khai B-2b

Status: DONE_WITH_CONCERNS

## Đã làm

- REST tests/điểm chỉ còn GET `/classes/{id}/tests` và `/tests/{id}/scores`; homework và phiếu chỉ còn GET `/sessions/{id}/homework` và `/sessions/{id}/slips`. Bỏ mọi route ghi tự tạo và test của chúng theo api-spec mục 5.5/6.
- DB của ba nhóm chỉ giữ logic đọc; phân quyền lớp/workspace và lọc dữ liệu guardian được giữ trong các truy vấn GET. 404 dùng helper chung `notFound()`.
- Báo cáo đủ 8 endpoint: danh sách theo lớp, preview, lưu nháp, publish/re-publish, PUT PDF, danh sách theo học sinh có cursor, bản chụp publication và GET PDF. Request body nháp kiểm kiểu chuỗi/giới hạn 4000; không còn `any` trong file route/db/test thuộc B-2b.
- `REPORT_PDFS` tùy chọn. PUT/GET kiểm quyền trước khi trả `503 pdf_storage_unavailable` khi không có binding; test có và không có binding. Nháp/phát hành/bản chụp hoạt động không cần R2. Cần người dùng bật/tạo R2 trên staging để PDF thật dùng được.
- Ghi yêu cầu nghiệp vụ cho B-3 sync tại `plans/20261021-mvp/briefs/backend-requests.md`, gồm kiểm dữ liệu/phiên bản bài và điểm, giao/chấm BTVN, gửi/sửa phiếu, notification và phát lại kết quả BTVN.

## Xác minh

- `npx vitest run tests/tests-scores tests/homework tests/comments tests/reports --reporter=dot` — PASS, 4 file / 7 test.
- `npm run typecheck` — PASS.
- `git diff --check` — PASS; tìm `any` trong route/db/test thuộc B-2b không có kết quả.
- Không commit/deploy. R2 staging chưa được xác minh bằng tài nguyên Cloudflare thật.
