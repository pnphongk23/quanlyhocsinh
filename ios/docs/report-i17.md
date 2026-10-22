# iOS-17 · Sync LWW và chạy ghi điểm danh staging

Ngày: 2026-10-22 · Nhánh `mvp-ios` · Worktree hiện tại.

## Phần A · Bỏ trạng thái lệnh `conflict`

- `CommandStatus` hiện chỉ giải mã `applied`, `duplicate`, `rejected`. Phản hồi `status: "conflict"` là JSON sai với client này; giải mã thất bại trước bước acknowledge, lệnh được retry với nguyên UUID.
- `applied` (kể cả `noop: true`) và `duplicate` có `original_status: applied` xoá lệnh đã gửi. `rejected` giữ lệnh, lưu lỗi; `duplicate` có `original_status: rejected` giữ lỗi; thiếu hoặc không nhận diện được `original_status` thì lệnh được phát lại.
- Snapshot/pull/install chỉ chấp nhận 11 entity cố định theo API spec; entity không biết bị bỏ qua có kiểm soát để không làm hỏng snapshot hoặc trang pull. Không tìm thấy lệnh `conflict.resolve` trong danh mục lệnh phía client.
- `core.apiError.conflict` và chuỗi bản địa hoá còn lại dành cho lỗi REST/PATCH. `srcwalk discover conflict --scope ios/QuanLyLop` chỉ trả các tham chiếu đó.
- Test mới xác nhận applied/noop xoá lệnh, `validation_error` rejected được giữ, status `conflict` bị từ chối và phát lại nguyên UUID, entity lạ của snapshot/pull bị bỏ qua. Test duplicate/applied sẵn có tiếp tục xác nhận lệnh được xoá.

## Kiểm chứng

```text
cd ios && xcodegen generate
Created project at ios/QuanLyLop.xcodeproj

xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i17 CODE_SIGNING_ALLOWED=NO build test
** TEST SUCCEEDED ** — 113 tests, 2 skipped, 0 failures

xcodebuild -scheme QuanLyLop -configuration Production -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/qlh-dd-i17 CODE_SIGNING_ALLOWED=NO build
** BUILD SUCCEEDED **

xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i17 build
** BUILD SUCCEEDED ** — ký cục bộ để Keychain hoạt động khi đăng nhập simulator
```

Hai test skip là test Keychain trong build không ký và test chụp ảnh chỉ chạy khi đặt `QLH_SCREENSHOT_DIR`. Xcode báo warning AppIntents metadata vì app không liên kết `AppIntents.framework`; không thấy warning Swift mới.

## Phần B · Staging

Đã xoá và boot sạch một simulator iPhone 16. Dữ liệu đăng nhập được đọc ngầm từ `/tmp/qlh-staging-demo.txt` và truyền vào Maestro qua biến môi trường; không ghi thông tin xác thực vào repo, log hay báo cáo.

```text
maestro --device <iPhone 16 UDID> test -e STAGING_PHONE=<ẩn> -e STAGING_PASSWORD=<ẩn> ios/maestro/staging/01-login.yaml
```

Lần đầu Maestro dừng ở lỗi kết nối driver `127.0.0.1:7001`. Chạy lại với `--no-reinstall-driver` thì app mở, các bước nhập và bấm đăng nhập hoàn tất, nhưng assertion `Lớp của tôi` không đạt. Theo brief, dừng sau lỗi đăng nhập; không thử mật khẩu khác, không gọi API đăng nhập lại, không gửi lệnh điểm danh, không đọc hoặc sửa dữ liệu staging. Vì vậy không có kết quả HTTP/status/version cho attendance và không có dữ liệu demo nào được thay đổi.

Đã xoá `/tmp/qlh-dd-i17`, ảnh kiểm tra simulator và artifact Maestro của hai lượt chạy để tránh giữ dữ liệu đăng nhập trong cache tạm.

Status: BLOCKED
Staging login không đạt assertion mở danh sách lớp nên phần ghi thật và xác minh server chưa chạy được. Phần A đã build/test xanh và không phát sinh thay đổi dữ liệu staging.
