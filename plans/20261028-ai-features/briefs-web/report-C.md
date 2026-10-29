# Report C — Import danh sách học sinh

## Kết quả

- Đã triển khai nhập học sinh bằng dán danh sách hoặc tải CSV, xem/sửa trước khi lưu, chuẩn hoá dữ liệu, cảnh báo và xử lý trùng theo quy tắc import model.
- Đã thêm test tự đọc trực tiếp `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261028-ai-features/golden-import-cases.json`; không sao chép file ca vàng. Cả 14 ca khớp kết quả mong đợi.
- Không phát hiện ca vàng nào mâu thuẫn với scope-1.2.md mục C; không sửa file ca vàng.

## Xác minh

- Test tập trung: 3 file, 13 test đạt.
- Toàn bộ Vitest: 97 file đạt, 2 bỏ qua; 760 test đạt, 4 bỏ qua.
- `npx tsc --noEmit`: đạt.
- Production build và kiểm tra bundle: đạt. Vite có cảnh báo import tĩnh/động sẵn có tại `src/data/auth/index.ts`.
- `git diff --check`: đạt.

Mã nguồn nằm trong worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`. Chưa commit.
