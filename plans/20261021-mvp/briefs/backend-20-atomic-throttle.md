# backend-20: throttle đăng ký nguyên tử (phát hiện REQUIRED của review tổng thể)

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend, HEAD 71ae3a5), làm trong `worker/`. Dùng `srcwalk`.

## Lỗi
`checkThrottle` (đọc) rồi `recordThrottleFailure` (đọc+ghi) trong `src/db/auth.ts` ~700-790 tách rời; trong `src/routes/auth.ts` `POST /auth/register`, `/auth/register-guardian`, `POST /workspaces` gọi check → làm việc → record. Nhiều request đồng thời cùng IP/user đọc cùng bộ đếm trước khi ai ghi nên có thể vượt ngưỡng 5/giờ (chính sách `REGISTER_IP_POLICY`, `WORKSPACE_CREATE_POLICY`).

## Sửa
Thêm `consumeThrottle(db, key, policy, nowMs?)` ở `src/db/auth.ts`: MỘT câu SQL nguyên tử (D1/SQLite `INSERT … ON CONFLICT(key) DO UPDATE … RETURNING fails, window_start`) tăng bộ đếm (đặt lại về 1 khi cửa sổ hết hạn) rồi so `fails > limit` ⇒ từ chối `rateLimited(retryAfterSeconds)` (tính từ `window_start + windowMs`), không có khoảng trống giữa kiểm và ghi. Dùng cho `register`, `register-guardian`, `POST /workspaces` (gọi MỘT lần ở đầu xử lý, thay cặp check+record; giữ nguyên ngưỡng, khoá khoá `register:ip:*`, `workspace:user:*`, và mọi mã lỗi/`Retry-After` hiện có; request bị từ chối bởi validation vẫn tính vào lượt như hiện tại). Đăng nhập (`LOGIN_*`, có `lockMs`, xoá bộ đếm khi đăng nhập đúng) giữ logic hiện tại, KHÔNG đổi.
Test: gọi đồng thời (`Promise.all`) 8 request đăng ký phụ huynh cùng IP trong vitest pool workers ⇒ đúng 5 thành công/được xử lý, 3 trả 429 (ghi trong báo cáo nếu harness không thật sự song song; khi đó thêm test mức hàm: 8 lệnh `consumeThrottle` bắn bằng `Promise.all` ⇒ đúng 5 allowed); tương tự `POST /workspaces`; cửa sổ hết hạn đặt lại; test throttle cũ vẫn xanh.
`npm run typecheck`, `npm test` xanh. Commit conventional (không nhắc AI/plan/finding), không push, KHÔNG deploy. Không đụng `plans/**`.
Kết thúc: `Status: ...` + 2 câu.
