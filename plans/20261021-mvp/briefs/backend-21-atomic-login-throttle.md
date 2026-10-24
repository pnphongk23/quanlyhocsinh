# backend-21: throttle đăng nhập nguyên tử

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend, HEAD afb7b8b), làm trong `worker/`. Dùng `srcwalk`. Đọc `consumeThrottle` (commit `afb7b8b`) và `plans/20261021-mvp/backend/api-spec.md` mục 3.

## Lỗi
`POST /auth/login` (`src/routes/auth.ts` ~270-310) và `POST /auth/change-password` (~355-375): `checkThrottle` (đọc) → băm/kiểm mật khẩu → `recordThrottleFailure` (đọc+ghi) sau khi sai. Nhiều lần đoán song song cùng SĐT/IP đọc cùng bộ đếm trước khi ai ghi nên vượt ngưỡng (`LOGIN_PHONE_POLICY` 5/15 phút khoá 15 phút, `LOGIN_IP_POLICY` 20/15 phút).

## Sửa (giữ nguyên hành vi hiện có: khoá tạm rồi cho thử lại, lần sai thứ 5 trả 429 ngay, đăng nhập đúng xoá bộ đếm SĐT, 429 kèm `Retry-After`, `invalid_credentials` cho sai, SĐT lạ vẫn băm giả)
1. Đặt chỗ lượt thử NGUYÊN TỬ TRƯỚC khi băm/kiểm mật khẩu: mở rộng `consumeThrottle` (hoặc hàm cùng họ) hỗ trợ `lockMs`: một câu SQL `INSERT … ON CONFLICT … RETURNING` tăng bộ đếm (cửa sổ/khoá hết hạn thì đặt lại về 1), khi bộ đếm đạt `limit` thì đặt `locked_until = now + lockMs`, và trả lượt thử có được phép đi tiếp không. Lượt vượt ngưỡng hoặc đang khoá bị từ chối `429` TRƯỚC khi băm (không tốn CPU băm). Hai khoá (SĐT, IP) đặt chỗ lần lượt; nếu khoá thứ hai từ chối thì hoàn lượt đã đặt ở khoá thứ nhất khi không dùng được (hoặc đặt IP trước rồi SĐT; chọn thứ tự nhất quán và nêu lý do).
2. Sai mật khẩu: không cần ghi thêm (lượt đã tính); nếu lượt này làm đạt ngưỡng thì trả 429 ngay như hiện nay. Đúng mật khẩu: xoá bộ đếm SĐT (như hiện nay) và HOÀN trả lượt của khoá IP nguyên tử (`fails = MAX(fails - 1, 0)`) để đăng nhập thành công không làm cạn ngưỡng IP (nhiều người cùng IP).
3. `change-password`: cùng cơ chế theo khoá hiện có của nó.
4. Bỏ `checkThrottle`/`recordThrottleFailure` nếu không còn nơi dùng (hoặc giữ nếu còn).
5. Test (cập nhật test throttle cũ cho khớp thứ tự mới, không làm yếu): 12 lần đăng nhập SAI song song (`Promise.all`) cùng SĐT ⇒ không quá 5 lượt chạm tới bước kiểm mật khẩu (đếm số 401/429), phần còn lại 429 có `Retry-After`; sau khi hết khoá (`nowMs`/chỉnh `locked_until`) đăng nhập đúng được; đăng nhập đúng 25 lần liên tiếp cùng IP không bị khoá IP (hoàn lượt); 20 lần sai từ IP khác SĐT khoá IP; SĐT lạ cùng hành vi (không lộ SĐT có tồn tại hay không bằng mã/thời gian); `change-password` tương tự.
`npm run typecheck`, `npm test` xanh. Commit conventional (không nhắc AI/plan/finding), không push, KHÔNG deploy. Không đụng `plans/**`.
Kết thúc: `Status: ...` + 2 câu + thứ tự đặt chỗ đã chọn.
