# backend-15: gỡ lưu PDF và R2 khỏi MVP

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend, HEAD d0a10c2), làm trong `worker/`. Dùng `srcwalk`. Quyết định người dùng (`briefs/74-decisions-20261022-b.md` mục 5): KHÔNG lưu PDF trên máy chủ, không R2; báo cáo xem từ bản chụp (`report_publications.snapshot`) lưu khi phát hành; "Tải PDF/ảnh" tạo file trên máy khách.

## Việc
1. Bỏ route `PUT /reports/{id}/publications/{no}/pdf` và `GET /reports/{id}/publications/{no}/pdf` (`src/routes/reports.ts`, `src/db/reports.ts`: `uploadPublicationPdf`, `downloadPublicationPdf`), ngoại lệ body 5 MB cho PDF (`src/lib/http.ts` `isPdfUploadRequest` và nơi dùng), binding `REPORT_PDFS` (`src/types.ts`, `wrangler.jsonc` khối r2 đang comment, `vitest.config.ts`, `README.md`, `tests/env.d.ts` nếu có), mã lỗi `pdf_storage_unavailable`. Hai route cũ phải trả `404` (không còn tồn tại).
2. Phản hồi `GET /reports/{id}/publications/{no}` và danh sách báo cáo: bỏ mọi trường liên quan PDF (`pdf_key`, `has_pdf`, `pdf_*`…) nếu có; giữ nguyên `snapshot`, phát hành, phát hành lại, thông báo. KHÔNG sửa migration đã áp dụng (cột `pdf_key` và trigger bất biến giữ nguyên, không dùng nữa; ghi ngắn trong báo cáo).
3. Test: gỡ/sửa test PDF; thêm test hai route PDF trả `404` cho giáo viên và phụ huynh; phần phát hành/snapshot/quyền giữ nguyên xanh.
4. `npm run typecheck`, `npm test` xanh. Commit conventional (không nhắc AI/plan), không push, KHÔNG deploy, không đụng staging, không sửa `plans/**`.
Kết thúc: `Status: ...` + 2 câu + danh sách route/field đã gỡ.
