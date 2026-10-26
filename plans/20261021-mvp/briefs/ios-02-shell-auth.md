# iOS I-2 · Khung app + Tài khoản
Đọc `briefs/ios-common-feature.md` trước (bắt buộc). Bạn SỞ HỮU `App/**` và `Features/Auth/**` (ngoại lệ được sửa `App/*`).
Việc: điều hướng theo vai trò trong `App/`: chưa đăng nhập → Auth; đã đăng nhập → `TeacherRootView()` hoặc `GuardianRootView()` theo vai trò (nhiều membership → Chọn vai trò). Màn: Đăng nhập (+ sai thông tin, khoá tạm), Đăng ký giáo viên, Đổi mật khẩu bắt buộc, Quên mật khẩu, Chọn vai trò, Cài đặt tài khoản (đổi mật khẩu, đổi vai trò, đăng xuất bị chặn khi còn lệnh chờ qua `pendingCommandCount`). Dùng `SessionController`/`TokenStore` của lõi.
Nguồn UI: prototype `src/features/auth` + `src/features/settings`. Prototype Tài khoản đang được hoàn thiện ở mảng Web: dùng bản hiện có, tạm tham chiếu ảnh `plans/20261021-mvp/design/auth-r4/` (01 đến 13), và GHI RÕ phần nào đối chiếu lại khi prototype cuối xong (lead sẽ báo). Ngoài MVP: không OTP, không mời, không passkey.
Báo cáo: `ios/docs/report-i2.md`.
