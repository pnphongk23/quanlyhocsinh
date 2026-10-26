# Review tổng thể r2 (cuối) · mảng Dữ liệu + API (codex luna high, đọc-only)

Reviewer độc lập MỚI: KHÔNG sửa file, KHÔNG commit/deploy, KHÔNG in secret. Có thể chạy test/typecheck (không ghi file trong repo).

Phạm vi:
- Backend `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`: `git diff 8fac5d6..d2b9c63`.
- Web `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`: `git diff ff66e1c..f31150e -- src/data src/test scripts`.
- Nguồn chuẩn (repo chính `/Users/phamnhuphong/Git/quanlyhocsinh`): `plans/20261021-mvp/data-api/plan.md` (H1–H7, GL đã duyệt), `diagnosis.md`, `contract-changes.md`, `review-overall-r1.md` (r1: 2 REQUIRED + 1 OPTIONAL đã sửa ở `d6cc676`, `f31150e`), `plans/20261021-mvp/backend/api-spec.md` mục 5.1–5.3 và 6.3, `docs/spec.md` mục 4 và 5.3.

Bắt buộc trong báo cáo:
1. **Danh sách file đã đọc** (mọi file trong hai diff + file nguồn liên quan), đánh dấu file nào chỉ đọc qua diff, file nào đọc toàn bộ.
2. **Bảng H1–H7**: mỗi hạng mục — đúng plan / lệch / thiếu, kèm file:dòng bằng chứng (backend VÀ web).
3. Xác nhận r1 đã đóng (2 REQUIRED, 1 OPTIONAL) kèm file:dòng.
4. Lỗi mới: chỉ nêu lỗi thật có kịch bản cụ thể (đồng bộ/race, thu hồi quyền khi `/me` nền, snapshot lỗi giữa chừng, outbox offline 5 thao tác, idempotency H6: quyền trước tra id, không lộ, không ghi change_log khi 200, đồng thời, chữ hoa/thường; lộ dữ liệu chéo identity/workspace; log SĐT/nhận xét), mỗi mục REQUIRED/OPTIONAL + đề xuất sửa.
5. Hợp đồng/iOS: `contract-changes.md` + api-spec khớp mã.

Chạy (chỉ đọc kết quả): web `npm run typecheck && npx vitest run`; backend `cd worker && npm run typecheck && npm test`. Ghi số.

Kết thúc `Verdict: APPROVE | APPROVE_WITH_CHANGES | REJECT`.
