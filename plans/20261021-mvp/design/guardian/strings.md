# Chuỗi chữ màn Tài khoản phụ huynh (prototype, 2026-10-22)

Nguồn: worker 1 — phụ huynh tự đăng ký, tự liên kết con, "chưa có con nào được liên kết".
Áp dụng cho `design/prototype` (web/PWA) và dùng lại cho iOS; giọng chữ như màn Tài khoản đã duyệt
(ngắn, tiếng Việt, xưng "bạn", không thuật ngữ kỹ thuật). Không màn nào nhắc mật khẩu tạm, cấp mật
khẩu hay OTP.

## 1. Đăng ký (một màn chung `/dang-ky`)

| Màn | Khoá / vị trí | Chữ |
|---|---|---|
| Đăng ký | `register.roleLabel` — nhãn trên bộ chọn vai trò | Bạn đăng ký với vai trò |
| Đăng ký | `register.role.teacher` — lựa chọn vai trò (mặc định) | Giáo viên |
| Đăng ký | `register.role.guardian` — lựa chọn vai trò | Phụ huynh |
| Đăng ký · phụ huynh | `register.guardian.title` — tiêu đề màn | Tạo tài khoản phụ huynh |
| Đăng ký · phụ huynh | `register.guardian.namePlaceholder` — gợi ý ô Tên hiển thị | Mẹ của Minh Anh |
| Đăng ký · phụ huynh | `register.guardian.submit` — nút gửi | Tạo tài khoản |
| Đăng ký · phụ huynh | `register.guardian.note` — ghi chú dưới ô mật khẩu | Con sẽ tự hiện ở đây khi hồ sơ học sinh có đúng số điện thoại này. Chưa khớp hồ sơ nào thì bạn vẫn dùng được tài khoản. |
| Đăng ký · giáo viên | `register.teacher.title` — tiêu đề màn (giữ nguyên) | Tạo không gian làm việc |
| Đăng ký · giáo viên | `register.teacher.namePlaceholder` — gợi ý ô Tên hiển thị (giữ nguyên) | Cô Lan |
| Đăng ký · giáo viên | `register.teacher.note` — ghi chú (giữ nguyên) | Người tạo là quản trị viên đầu tiên của không gian làm việc. |
| Đăng ký · giáo viên | `register.teacher.submit` — nút gửi (giữ nguyên) | Tạo không gian làm việc |

Không có ở phụ huynh: ô "Tên không gian làm việc", dòng "Người tạo là quản trị viên đầu tiên…",
mật khẩu tạm, bước đổi mật khẩu lần đầu.

### Lỗi kiểm tra (dùng chung hai vai trò)

| Màn | Khoá / vị trí | Chữ |
|---|---|---|
| Đăng ký | `auth.error.phoneTaken` — bảng lỗi trên đầu biểu mẫu | Số điện thoại đã có tài khoản. Hãy đăng nhập. |
| Đăng ký | `auth.error.name` — chưa nhập tên hiển thị | Nhập tên hiển thị của bạn. |
| Đăng ký · giáo viên | `auth.error.workspaceName` — chưa nhập tên không gian | Nhập tên không gian làm việc. |
| Đăng ký | `auth.error.phone` — SĐT không đủ 9 số | Số điện thoại không hợp lệ. |
| Đăng ký | `auth.error.passwordShort` — dưới 8 ký tự | Mật khẩu phải có ít nhất 8 ký tự. |
| Đăng ký | `auth.error.passwordMismatch` — nhập lại sai | Mật khẩu nhập lại không khớp. |

## 2. Chưa có con nào được liên kết (mọi tab của màn phụ huynh)

| Màn | Khoá / vị trí | Chữ |
|---|---|---|
| PH · chưa có con | `guardian.noChild.title` — tiêu đề | Chưa có con nào được liên kết |
| PH · chưa có con | `guardian.noChild.reason` — đoạn 1 | Số điện thoại bạn dùng để đăng ký chưa khớp hồ sơ học sinh nào. |
| PH · chưa có con | `guardian.noChild.phone` — chip SĐT đang đăng nhập (dạng +84 …) | +84 900 000 002 |
| PH · chưa có con | `guardian.noChild.howTo` — đoạn 2 | Nhờ cô giáo nhập đúng số điện thoại này vào hồ sơ của con. Khi hồ sơ có số này, con sẽ tự hiện ở đây. |
| PH · chưa có con | `guardian.noChild.settings` — nút | Cài đặt |
| PH · chưa có con | `guardian.noChild.logout` — nút | Đăng xuất |
| PH · chưa có con | `guardian.noChild.logoutBlocked` — lỗi khi còn thay đổi chưa đồng bộ | Còn thay đổi chưa đồng bộ. Vui lòng chờ đồng bộ trước khi đăng xuất. |

Mascot: dùng Mít ở tư thế chờ (`pose="cho"`), ảnh trang trí, không cần mô tả cho trình đọc màn hình.

## 3. Cài đặt phụ huynh (màn chung `/cai-dat`)

| Màn | Khoá / vị trí | Chữ |
|---|---|---|
| Cài đặt · PH | `settings.roleLine.guardian` — dòng phụ dưới tên | Phụ huynh · Minh Anh (6A), Gia Bảo (7B) |
| Cài đặt · PH | `settings.roleLine.guardianNoChild` — chưa liên kết con | Phụ huynh · Chưa liên kết con |
| Cài đặt · PH | `settings.profile.name` — nhãn ô tên (chỉ đọc) | Tên hiển thị |
| Cài đặt · PH | `settings.profile.phone` — nhãn ô SĐT (chỉ đọc) | Số điện thoại |
| Cài đặt · PH | `settings.readonlyTag` — nhãn cạnh giá trị | Chỉ đọc |
| Cài đặt · PH | `settings.changePassword` — dòng menu | Đổi mật khẩu |
| Cài đặt · PH | `settings.logout` — nút | Đăng xuất |

Phụ huynh không thấy mục hồ sơ sửa được, không thấy cấp mật khẩu cho người khác; chỉ đổi mật khẩu
của chính mình.

## 4. Form học sinh · số điện thoại phụ huynh

| Màn | Khoá / vị trí | Chữ |
|---|---|---|
| Học sinh · thêm/sửa | Ghi chú dưới ô "Số điện thoại phụ huynh (tuỳ chọn)" | Phụ huynh dùng số này để đăng ký và đăng nhập. |

Ghi chú cũ (nhắc không gửi tin) đã bỏ, thay bằng câu trên. Chữ này dùng chung bản điện thoại
(`StudentsPage`) và bản desktop (`StudentsDesktop`).

## Mascot · đổi chữ (Lead Mascot, 2026-10-22)

| Màn | Vị trí | Chữ cũ | Chữ mới |
|---|---|---|---|
| Đăng nhập | dòng dưới nút | Chưa có không gian làm việc? · Đăng ký cho giáo viên | Chưa có tài khoản? · Tạo tài khoản |
| Đăng nhập | thẻ gợi ý cuối trang | Phụ huynh: dùng số điện thoại đã khai trong hồ sơ học sinh và mật khẩu tài khoản. | (bỏ) |
| Nhận xét PH · danh sách, Phiếu buổi học PH | nhánh chưa có con | Chưa có con nào được liên kết · Liên hệ giáo viên nếu bạn cần xem dữ liệu của con. | Dùng chung màn "Chưa có con nào được liên kết" (guardianEmpty.tsx), có Mít chờ |

