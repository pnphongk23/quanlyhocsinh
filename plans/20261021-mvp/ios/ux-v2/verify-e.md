# Lane E — xác minh iOS UX v2

## E1 — header chi tiết lớp

- Commit: `1dda0c1c4271acbd81953cc7c1a2ff51cba93efb`.
- `TeacherClassDetailView` ghim root `VStack` lên đầu viewport toàn màn và thêm `.safeAreaPadding(.top)`, dùng inset hệ thống thay vì số đo cố định.
- Đã mở tab Điểm trong harness dữ liệu tổng hợp trên iPhone 16 và iPhone SE 3 (iOS 26.1). Tên lớp nằm dưới status bar/Dynamic Island; phần nội dung bắt đầu ngay dưới tabs. Ảnh: `shots/after/e1-p16-scores.png`, `shots/after/e1-se3-scores.png`. Ảnh dùng view thật với fixture demo, không dùng tài khoản staging.
- `git diff --check`: đạt.
- Staging `xcodebuild build test` trên snapshot: **151 tests, 2 skipped, 0 failures; TEST SUCCEEDED**. Skip: test Keychain signing và screenshot-only test (`QLH_SCREENSHOT_DIR` chưa đặt).

## E2 — khôi phục phiên khi endpoint lỗi

- Kết luận mã nguồn: **(ii), app khôi phục phiên qua API khi mở app và chuyển về đăng nhập nếu request lỗi**. `AuthService.swift:105-117` đọc token; nếu có token thì gọi `GET me`, catch đặt thông báo và `screen = .login`. `APIClient.swift:100` từ chối endpoint `http://...` bằng `invalidURL`, rồi lỗi đi vào catch khôi phục phiên. Keychain service theo môi trường vẫn là `com.study.teacherthu.Staging` (`AppConfiguration.swift:36-38`). Điều này khớp ảnh endpoint lỗi được ghi ở `verify.md` lượt 2.
- Build thường và build endpoint lỗi đều ký ad-hoc thành công với cùng cấu hình. Lượt đăng nhập thử mới trên iPhone 16 không vào màn lớp sau một lần submit; dừng theo giới hạn đăng nhập. Vì vậy lượt này **không xác nhận trực tiếp token còn trong Keychain** và không hoàn tất được phép thử cài đè. Kết luận (ii) có bằng chứng mạnh từ code và lượt xác minh trước, nhưng phép thử Keychain mới chưa độc lập xác nhận.

## E3 — khung “Đã lưu”

- Không quay video: không có phiên hoạt động sau lượt đăng nhập thất bại, nên không thể thay đổi/hoàn tác điểm danh an toàn.
- `SaveButton.swift:17-37` cho thấy trạng thái loading và `AppSaveController` nhận action; đây không thay cho ảnh/video thực nghiệm. Không kết luận trạng thái “Đã lưu” có/không hiện ở runtime.
- Không ghi dữ liệu điểm danh staging trong lượt này. Không ghi SĐT, mật khẩu, token hoặc nhận xét.
