# iOS-16 · Áp quyết định 71

## 1. Bỏ luồng cấp mật khẩu phụ huynh

- Gỡ `temporaryPassword`, response model, request `guardian-credentials`, trạng thái reveal, sheet và nút “Cấp mật khẩu”. Giữ “Sửa số điện thoại” và “Đánh dấu nghỉ”.
- Xoá các localization chỉ dùng cho sheet/nút cấp mật khẩu. Không đổi màn buộc đổi mật khẩu lần đầu của phụ huynh hoặc backend.
- Bằng chứng: `srcwalk discover 'temporaryPassword,guardian-credentials,issueGuardianPassword' --scope ios/QuanLyLop` → 0 matches; `srcwalk discover 'temporaryPassword,Cấp mật khẩu,registrationCode,mã đăng ký' --scope ios/QuanLyLop` → 0 matches.

## 2. Mã đăng ký

- `RegistrationRequest` chỉ gửi `phone`, `password`, `displayName`, `workspaceName`; màn đăng ký không có trường mã hoặc lời mời.
- Bằng chứng: `srcwalk discover 'registrationCode,REGISTRATION_CODE,inviteCode,mã đăng ký' --scope ios/QuanLyLop/Features/Auth` → 0 matches. `AuthService.register` dựng request từ bốn trường trên.

## 3. Điểm bước 0,5

- Kiểm tra giá trị rỗng hoặc số trong [0, max] và là bội số của 0,5; chấp nhận dấu phẩy hoặc dấu chấm. Bộ lưu dùng cùng quy tắc để chặn giá trị sai trước khi ghi.
- Trường điểm dùng bàn phím thập phân. Định dạng dùng chung cho màn giáo viên và báo cáo hiển thị dấu phẩy, bỏ số 0 thừa; màn phụ huynh không đổi.
- Test xác nhận hợp lệ `0`, `0,5`, `7,5`, `7.5`, `15`; không hợp lệ `7,3`, `7,25`, `15,5`, `-0,5`, `abc`; kiểm tra chuỗi hiển thị `7,5`, `8`, `0`.

## 4. Quên mật khẩu

- Câu dành cho giáo viên đã khớp nguyên văn prototype: “Hiện chưa có tự phục hồi mật khẩu cho giáo viên. Quản trị viên sẽ cấp mật khẩu mới cho bạn.” Không thêm OTP hoặc endpoint.
- Nhánh phụ huynh trong prototype vẫn hướng dẫn luồng cấp mật khẩu đã bỏ; giữ nội dung hiện tại theo brief và đánh dấu `TODO(prototype copy)` tại `AuthScreens.swift` để chờ prototype cập nhật.

## Kiểm chứng

- `cd ios && xcodegen generate` → tạo project thành công.
- `xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i16 CODE_SIGNING_ALLOWED=NO build test` → **TEST SUCCEEDED**, 109 tests, 2 skipped, 0 failures (không giảm so với 109 tests trước đó).
- `xcodebuild -scheme QuanLyLop -configuration Production -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/qlh-dd-i16 CODE_SIGNING_ALLOWED=NO build` → **BUILD SUCCEEDED**.
- Log có cảnh báo App Intents metadata bị bỏ qua do target không phụ thuộc `AppIntents.framework`; không có cảnh báo Swift mới.
- `srcwalk discover 'temporaryPassword,Cấp mật khẩu,registrationCode,mã đăng ký' --scope ios/QuanLyLopTests` → 0 matches; cùng lệnh với `--scope ios/maestro` → 0 matches. Báo cáo lịch sử `ios/docs/report-i8b.md` không đổi.
- `/tmp/qlh-dd-i16` đã được dọn sau build.
