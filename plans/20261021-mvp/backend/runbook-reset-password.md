# Runbook: đặt lại mật khẩu thủ công trên staging

Dùng khi người vận hành cần đặt lại mật khẩu tài khoản. Không gửi mật khẩu hoặc hash qua chat, issue hay log. Chọn mật khẩu mới dài 8–128 ký tự và khác số điện thoại.

## 1. Sinh hash cục bộ

Chạy trong `worker/`. Nhập mật khẩu khi được hỏi; lệnh không nhận mật khẩu qua argv và chỉ in chuỗi hash. Không lưu hash vào file hoặc shell history.

```sh
set -e
read -s 'PASSWORD?Mật khẩu mới: '
HASH=$(printf '%s\n' "$PASSWORD" | node scripts/hash-password.mjs)
unset PASSWORD
```

Hash được giữ trong biến shell để tránh ghi vào shell history; script không in mật khẩu. Định dạng hash là `pbkdf2-sha256$30000$salt$hash`.

## 2. Cập nhật D1 staging

Trong cùng terminal đã chạy bước 1, nhập đúng SĐT và chạy từng lệnh. Kiểm tra số dòng bị tác động là `1` cho UPDATE đầu tiên trước khi tiếp tục.

```sh
read -s 'PHONE?SĐT E.164 của tài khoản: '
npx wrangler d1 execute qlh-staging-db --remote --env staging --command "UPDATE users SET password_hash = '$HASH', must_change_password = 1, password_changed_at = datetime('now'), version = version + 1 WHERE phone = '$PHONE'"
npx wrangler d1 execute qlh-staging-db --remote --env staging --command "UPDATE auth_sessions SET revoked_at = datetime('now') WHERE user_id = (SELECT id FROM users WHERE phone = '$PHONE') AND revoked_at IS NULL"
npx wrangler d1 execute qlh-staging-db --remote --env staging --command "DELETE FROM device_tokens WHERE auth_session_id IN (SELECT id FROM auth_sessions WHERE user_id = (SELECT id FROM users WHERE phone = '$PHONE') AND revoked_at IS NOT NULL)"
npx wrangler d1 execute qlh-staging-db --remote --env staging --command "DELETE FROM auth_throttle WHERE key = 'login:p:$PHONE'"
unset HASH PHONE
```

Người dùng cần đăng nhập bằng mật khẩu mới rồi đổi mật khẩu ngay; cờ `must_change_password` sẽ chặn các thao tác còn lại đến khi đổi xong. Thao tác thu hồi phiên buộc đăng nhập lại trên mọi thiết bị.

## 3. Diễn tập an toàn trên D1 local

Trước khi dùng runbook, chạy `node scripts/hash-password.mjs` với một mật khẩu thử nghiệm, rồi áp dụng các câu SQL bằng `--local` thay cho `--remote --env staging` lên database local đã migrate. Xác nhận hash bắt đầu bằng `pbkdf2-sha256$30000$`, đăng nhập cục bộ bằng mật khẩu thử nghiệm được chấp nhận, `must_change_password` bằng `1`, các phiên cũ bị thu hồi, device token của phiên đó bị xoá và throttle key đã bị xoá. Không chạy câu lệnh staging trong diễn tập.
