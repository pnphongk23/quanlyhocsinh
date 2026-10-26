# P3 · chuỗi giao diện tiếng Việt

Chuỗi mới/đổi để iOS dùng y hệt. Các ký tự trong ngoặc kép là nguyên văn giao diện.

## Đăng nhập — `src/features/auth/LoginPage.tsx`

- Phụ huynh, dòng hướng dẫn: `Phụ huynh: dùng số điện thoại đã đăng ký với giáo viên và mật khẩu giáo viên cấp.` → `Phụ huynh: dùng số điện thoại đã khai trong hồ sơ học sinh và mật khẩu tài khoản.`

## Quên mật khẩu — `src/features/auth/ForgotPasswordPage.tsx`

- Mô tả phụ huynh: `Nhờ giáo viên cấp lại mật khẩu cho số điện thoại của bạn.` → `Người vận hành sẽ đặt lại mật khẩu cho bạn. Không gửi mã xác nhận.`
- Mô tả giáo viên: `Giáo viên chưa tự đặt lại mật khẩu được.` → `Người vận hành sẽ đặt lại mật khẩu cho bạn. Không gửi mã xác nhận.`
- Bước 1 cũ: `Báo số điện thoại này cho giáo viên của con.` → Bước 1 mới: `Liên hệ người vận hành và cung cấp số điện thoại tài khoản.`
- Bước 2 cũ: `Giáo viên bấm “Cấp lại mật khẩu” ở hồ sơ học sinh.` → Bước 2 mới: `Người vận hành sẽ đặt lại mật khẩu thủ công.`
- Bước 3 cũ: `Đăng nhập bằng mật khẩu tạm rồi đổi mật khẩu mới.` → đã bỏ.
- Cảnh báo cũ của giáo viên: `Liên hệ quản trị viên không gian làm việc` → đã bỏ.
- Ghi chú cũ của giáo viên: `Hiện chưa có tự phục hồi mật khẩu cho giáo viên. Quản trị viên sẽ cấp mật khẩu mới cho bạn.` → đã bỏ.
- Ghi chú cũ: `Không có mã nào được gửi đến điện thoại của bạn.` → đã bỏ; nội dung không gửi mã được gộp vào mô tả mới.

## Học sinh desktop — `src/features/students/StudentsDesktop.tsx`

- Chú thích cuối bảng: `Phụ huynh đăng nhập bằng số điện thoại đã khai và mật khẩu bạn cấp. Một số điện thoại có nhiều con thì dùng chung một tài khoản.` → `Số điện thoại phụ huynh được lưu trong hồ sơ học sinh. Một số điện thoại có thể liên kết với nhiều con.`
- Ghi chú sửa SĐT: `Đổi số điện thoại sẽ gỡ liên kết tài khoản phụ huynh cũ; cấp mật khẩu lại cho số mới.` → `Đổi số điện thoại sẽ gỡ liên kết phụ huynh cũ khỏi hồ sơ học sinh.`
- Đã bỏ các nhãn/trạng thái và hành động: `Tài khoản phụ huynh`, `Chưa cấp mật khẩu`, `Đã cấp · chờ đổi`, `Đang dùng`, `Cấp mật khẩu`, `Cấp lại`, `Cấp lại mật khẩu`, `chờ đổi mật khẩu`, `chưa cấp mật khẩu`.
- Đã bỏ modal cấp mật khẩu cùng các chuỗi: `Mật khẩu tạm cho phụ huynh`, `Đây là mật khẩu tạm giả của prototype, không dùng cho tài khoản thật. Mật khẩu chỉ hiện một lần.`, `Sao chép`, `Đã sao chép`, `Đã hiểu, đóng`, `Phụ huynh bắt buộc đổi mật khẩu ở lần đăng nhập đầu; sau đó trạng thái chuyển thành “Đang dùng”.`

## Điểm — desktop `src/features/scores/ScoreGridDesktop.tsx`, mobile `src/features/scores/TestScoresPage.tsx`, repository `src/data/repositories/scores.ts`

- Ghi chú lưới desktop: `Ô trống là “Chưa có điểm”. Nhập 7,5 hoặc 7.5. Mỗi bài hiện điểm riêng theo thang điểm của bài đó.` → `Ô trống là “Chưa có điểm”. Nhập điểm theo bước 0,5, ví dụ 7,5 hoặc 7.5. Mỗi bài hiện điểm riêng theo thang điểm của bài đó.`
- Lỗi nhập lưới desktop khi chuỗi không parse được: `Điểm phải theo bước 0,5. Ví dụ 7,5 hoặc 7.5.`
- Lỗi lưu tại repository: `Điểm phải từ 0 đến {max}, theo bước 0,5.` (thay `{max}` bằng điểm tối đa của bài).
- Lỗi inline mobile: `Điểm từ 0 đến {max}, theo bước 0,5` (thay `{max}` bằng điểm tối đa của bài).
- Định dạng điểm: `7,5` (cả `7,5` và `7.5` đều được nhận khi nhập); số nguyên hiện như `8`, không thêm `,0`.
- Lỗi mật khẩu khi đổi mật khẩu cá nhân: `Mật khẩu mới không được trùng mật khẩu tạm.` → `Mật khẩu mới phải khác mật khẩu hiện tại.`
