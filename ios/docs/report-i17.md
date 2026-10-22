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

Lần đầu Maestro dừng ở lỗi kết nối driver `127.0.0.1:7001`. Chạy lại với `--no-reinstall-driver` thì app mở, các bước nhập và bấm đăng nhập hoàn tất, nhưng assertion `Lớp của tôi` không đạt. Theo brief lúc đó, dừng sau lỗi đăng nhập; chưa gửi lệnh điểm danh và chưa sửa dữ liệu staging.

Đã xoá `/tmp/qlh-dd-i17`, ảnh kiểm tra simulator và artifact Maestro của hai lượt chạy để tránh giữ dữ liệu đăng nhập trong cache tạm.

## Chẩn đoán tiếp theo theo phản hồi lead

- Lead xác nhận API staging nhận `POST /v1/auth/login` với tài khoản giáo viên demo và trả HTTP 200, một membership đang hoạt động, không yêu cầu đổi mật khẩu. Đã đối chiếu tên khoá JSON (không ghi giá trị): login có `active_membership_id`, `expires_at`, `memberships`, `token`, `user`; `/me` có `active_membership_id`, `memberships`, `user`; pull có `cursor`, `deleted`, `epoch`, `has_more`, `server_time`, `upserts`. Các tên khoá khớp mô hình giải mã snake_case của client.
- Flow đăng nhập đã cuộn nút lên vùng nhìn thấy, chọn nút bằng accessibility ID `login.submit`, và chờ 45 giây; `maestro check-syntax` thành công. Lượt duy nhất sau khi chờ quá cửa sổ khoá 15 phút đã chạm submit nhưng vẫn ở form đăng nhập với thông báo kết nối chung. Không có thông báo `invalid_credentials` hoặc `rate_limited`; không thử đăng nhập lặp lại.
- Ảnh lỗi được xem để kiểm tra trạng thái form và xoá ngay sau đó; artifact Maestro của lượt này cũng được xoá. Ảnh cho thấy trường mật khẩu đã trống và thông báo lỗi chung. Predicate `log show` cho subsystem/category AuthLogin không trả sự kiện nên lượt này không xác định được HTTP status hoặc OSStatus trực tiếp.
- Bằng chứng môi trường xác nhận nguyên nhân: build Staging vừa dùng `CODE_SIGNING_ALLOWED=NO` cài và chạy được, nhưng bundle chỉ có chữ ký linker ad-hoc, không có TeamIdentifier và không mang entitlement Keychain; `codesign -d --entitlements :-` không liệt kê entitlement. Nguồn app khai báo Keychain access group, nhưng entitlement không được đưa vào bundle unsigned. `report-i6.md` mục 5 đã ghi nhận cùng cấu hình unsigned làm mọi thao tác ghi Keychain thất bại với OSStatus `-34018` và đăng nhập hiện đúng thông báo kết nối chung. Trong `AuthService.login`, lưu token vào Keychain là bước ngay sau giải mã login và lỗi Keychain đi vào thông báo chung; không có nhánh chọn vai trò/đổi mật khẩu nào phù hợp với ảnh lỗi này.
- Chẩn đoán hiện tại: Keychain entitlement thiếu trên build unsigned là nguyên nhân gốc đã được chứng minh trước đó và phù hợp với lượt Maestro này. Không cấu hình ký, không đổi team/provisioning/entitlements, không dùng nơi lưu token khác. Không có cơ sở cho lỗi nhãn/tab hay sai vị trí chạm; flow đã chạm đúng nút. Không có bằng chứng API 429 ở lượt này.
- Kiểm chứng sau khi xoá instrumentation tạm: Staging `xcodebuild ... CODE_SIGNING_ALLOWED=NO test` đạt 113 test, 2 skip (Keychain host-app và screenshot), 0 lỗi; Production `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` đạt. `maestro check-syntax ios/maestro/staging/01-login.yaml` đạt. Không có log chẩn đoán tạm nào còn trong mã.
- Phần B bị chặn theo yêu cầu lead vì cần build có entitlement để ghi token Keychain. Chưa chạy B.2–B.5, chưa gửi lệnh attendance, chưa đổi dữ liệu staging. Ảnh và artifact Maestro đã xoá; credential không được đưa vào repo, log hoặc báo cáo.

Status: BLOCKED
API login và các khoá JSON đã được xác minh đúng; app unsigned vẫn ở form do bước lưu token Keychain, phù hợp với OSStatus `-34018` đã ghi ở report-i6 và entitlement vắng trong bundle hiện tại. Theo chỉ đạo lead, không build bản ký hoặc lưu token ngoài Keychain nên không thể tiếp tục B.2–B.5; Part A và flow đăng nhập được commit riêng.
