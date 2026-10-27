# Báo cáo brief 99 (iOS)

Worktree mvp-ios, commit mới nhất ở đầu `git log` (không push).

## Đã làm
1. Bỏ `vn.quanlylop` khỏi `ios/`: thêm `AppConfiguration.identifierPrefix` (= `Bundle.main.bundleIdentifier`), dùng cho Keychain service (`tokenStoreService`), khoá defaults device_id, logger subsystem, queue label. Entitlements (cả hai file) chỉ còn `$(AppIdentifierPrefix)com.study.teacherthu`. Giữ nguyên chỉnh sửa Info.plist/xcstrings của người dùng.
2. `Production.xcconfig`: `API_BASE_URL` = URL staging, comment đã sửa; README cập nhật.
3. Nút "Xoá tài khoản" (giáo viên và phụ huynh, cùng `AuthSettingsView`) dưới Đăng xuất, kiểu danger sẵn có; bấm mở sheet xác nhận, "Mở biểu mẫu" gọi openURL tới `DELETE_ACCOUNT_FORM_URL` (Base.xcconfig → Info.plist `DeleteAccountFormURL` → `AppConfiguration`). Placeholder `https://forms.gle/PENDING`, cần thay URL thật ở một chỗ (Base.xcconfig). Chuỗi nằm trong Localizable.xcstrings.
4. `PrivacyInfo.xcprivacy`: tracking=false, không domain; UserDefaults CA92.1 (không thấy API file timestamp/disk space/boot time); thu thập PhoneNumber, Name, EmailAddress, OtherUserContent, UserID (linked, không tracking, AppFunctionality); không khai push token. Tự được đóng gói (sources gồm cả thư mục QuanLyLop), đã xác nhận file có trong .app.
5. `ITSAppUsesNonExemptEncryption=false`; MARKETING_VERSION 1.0.0, build 1.

## Outbox
Đổi Keychain service + khoá defaults chỉ buộc đăng nhập lại và sinh device_id mới. SQLite outbox được khoá theo user/workspace/membership và chỉ bị xoá khi logout, nên lệnh chưa gửi không mất; server chỉ kiểm tra định dạng device_id.

## Kiểm chứng
- Full test suite Staging trên iPhone 16: TEST SUCCEEDED; thêm AppConfigurationTests (đọc URL form, tiền tố bundle) pass.
- Simulator: đăng nhập giáo viên và phụ huynh (workspace appstore) thành công với entitlements mới (Keychain hoạt động); chụp màn Cài đặt có nút và sheet xác nhận cho cả hai vai. Ảnh phụ huynh đã cắt bỏ dòng SĐT: `report-99-shots/`. Ảnh giáo viên có SĐT giả nên đã xoá, giao diện giống hệt.
- Không bấm "Mở biểu mẫu" (URL còn placeholder).
- `git grep vn.quanlylop` trong `ios/` rỗng. Còn 13 tài liệu lịch sử trong `plans/` (nhật ký, brief, báo cáo cũ) còn chuỗi này; chưa sửa vì là bản ghi trạng thái cũ, chờ GL quyết.

Status: DONE_WITH_CONCERNS
Summary: Mọi hạng mục đã xong và kiểm chứng; còn cần URL Google Form thật và quyết định về các tài liệu lịch sử trong plans/ còn `vn.quanlylop`.
Concerns/Blockers: URL form là placeholder; git grep toàn repo chưa rỗng do plans/.
