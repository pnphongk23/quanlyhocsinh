# Review tổng thể mảng Dữ liệu + API (codex luna high, đọc-only, vòng 1/2)

Bạn là reviewer độc lập: KHÔNG sửa file, KHÔNG commit/deploy, KHÔNG in secret. Trả kết quả trong tin nhắn cuối.

Phạm vi thay đổi:
- Backend `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`: `git diff 8fac5d6..d2b9c63` (H6 `id` tuỳ chọn khi tạo lớp/học sinh/buổi lẻ, chuẩn hoá chữ thường, placement `gcp:asia-east2`).
- Web `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`: `git diff ff66e1c..aa82aef -- src/data src/test scripts` (bỏ qua commit UI `3352c37` ngoài `src/data`).
- Nguồn chuẩn: `plans/20261021-mvp/data-api/plan.md` (GL đã duyệt), `diagnosis.md`, `contract-changes.md`, `backend/api-spec.md` (mục 5.1–5.3, 6.3), `docs/spec.md` mục 4 và 5.3 (repo chính `/Users/phamnhuphong/Git/quanlyhocsinh`).

Kiểm (ưu tiên lỗi thật, có kịch bản cụ thể):
1. Đúng plan H1–H7? Thiếu/lệch gì.
2. Đúng đắn: race trong `syncNow` (cờ chạy thêm vòng), số thế hệ chống `/me` cũ, thu hồi quyền/đăng xuất/đổi vai khi `/me` chạy nền, snapshot song song (xoá bảng đầu, cursor cuối, lỗi giữa chừng, outbox `rejected` giữ), hydrate dần, ghi REST vào Dexie (khoá/hình dạng giống pull, identity đúng), đổi lịch dựa vào pull, idempotency H6 (quyền trước tra id, không lộ, không ghi change_log khi 200, đồng thời, chữ hoa/thường), mất dữ liệu offline của 5 thao tác offline.
3. Bảo mật/riêng tư: lộ dữ liệu chéo workspace/identity, log SĐT/nhận xét.
4. Test: có bắt đúng lỗi không, test 2 thiết bị đủ phạm vi plan không; test nào yếu.
5. Hợp đồng/iOS: `contract-changes.md` + api-spec khớp mã không; tương thích ngược.

Kết quả: danh sách phát hiện, mỗi mục REQUIRED hoặc OPTIONAL, bằng chứng file:dòng + kịch bản lỗi + đề xuất sửa. Ngắn gọn. Kết thúc `Verdict: APPROVE | APPROVE_WITH_CHANGES | REJECT`.
