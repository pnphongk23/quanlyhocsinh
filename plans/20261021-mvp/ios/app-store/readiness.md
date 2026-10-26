# Kiểm tra sẵn sàng submit (chỉ đọc, chưa sửa gì)

Nguồn: `ios/QuanLyLop/Resources/Info.plist`, `*.entitlements`, `ios/Config/*.xcconfig`, `project.yml`, mã nguồn iOS ở mvp-ios (HEAD khi viết). Đọc bản làm việc của 4 file người dùng đang sửa, không sửa.

## Đã đủ
| Mục | Hiện trạng |
|---|---|
| Icon 1024 | `AppIcon.appiconset/AppIcon.png` 1024×1024, RGB, không kênh alpha (đúng yêu cầu App Store) |
| Launch screen | `UILaunchScreen` + màu `LaunchBackground` |
| Thiết bị, hướng | Chỉ iPhone (`TARGETED_DEVICE_FAMILY=1`), chỉ dọc. Chỉ cần ảnh iPhone 6.9" |
| iOS tối thiểu | 17.0 |
| Quyền hệ thống | Không dùng camera, ảnh, vị trí, danh bạ, micro, Face ID: không cần `NS*UsageDescription`. Chia sẻ PDF dùng share sheet, không cần quyền |
| Đăng nhập bên thứ ba | Không có, không cần Sign in with Apple |
| Mã hoá | Chỉ HTTPS của hệ thống, không có CryptoKit/CommonCrypto trong app |

## Thiếu hoặc cần quyết (xếp theo mức chặn)
1. **Bundle id chính thức.** Đang là `com.study.teacherthu` (tạm, ghi trong `Base.xcconfig`); entitlements keychain còn nhắc cả `vn.quanlylop.app`. Cần người dùng chốt id và tài khoản Apple Developer. Chưa đổi gì theo brief.
2. **URL API production.** `Production.xcconfig` đang là `api.invalid`. Bản gửi duyệt phải trỏ tới Worker production thật, hiện chỉ có staging.
3. **Xoá tài khoản trong app.** Apple (guideline 5.1.1(v)) bắt buộc nếu app cho tạo tài khoản. Giáo viên tự đăng ký workspace nên áp dụng. Spec, API và app chưa có chức năng này. Đây là việc phải làm, cần GL và người dùng quyết phạm vi (spec mục 8 chưa có), không tự thêm.
4. **Support URL và Privacy Policy URL.** Chưa có trang nào (xem `metadata-vi.md` mục 7).
5. **Tài khoản reviewer** (giáo viên + phụ huynh) trên production, dữ liệu giả.
6. **Privacy manifest.** Không có `PrivacyInfo.xcprivacy`. App dùng `UserDefaults` (SyncCoordinator, Guardian...) thuộc nhóm API cần khai lý do (mã `CA92.1`), có thể cần thêm nhóm khác (thời gian file, dung lượng đĩa) tuỳ thư viện; cần quét lại khi build bản phát hành. Khai `NSPrivacyTracking=false` và các loại dữ liệu khớp bảng App Privacy.
7. **Export compliance.** Info.plist chưa có `ITSAppUsesNonExemptEncryption`. Chỉ dùng HTTPS nên đặt `NO` để khỏi bị hỏi mỗi lần upload. Chưa thêm.
8. **Thông báo đẩy.** Chưa gắn Firebase Messaging, không có `GoogleService-Info.plist`, entitlements không có `aps-environment`, `NoOpPushRegistrar` đang dùng. Spec bản đầu có push FCM, nhưng bản gửi duyệt hiện không có. Cần người dùng quyết: gửi bản không push, hoặc làm push trước (cần Apple Push key và Firebase). Ảnh hưởng App Privacy (token thiết bị).
9. **Phiên bản.** `MARKETING_VERSION=0.1.0`, `CURRENT_PROJECT_VERSION=1`. Nên đặt 1.0.0 cho bản đầu; tăng build mỗi lần upload.
10. **Tên pháp lý cho copyright**, tên app còn trống trên App Store (kiểm khi tạo app).
11. **Giao diện chỉ tiếng Việt.** `CFBundleDevelopmentRegion=vi`. Spec: tiếng Anh để Làm sau. Metadata chỉ cần bản tiếng Việt; chọn ngôn ngữ chính là Vietnamese trong App Store Connect.
12. **Dữ liệu trẻ vị thành niên.** Chính sách quyền riêng tư cần nói rõ (học sinh do giáo viên nhập, phụ huynh chỉ thấy con mình, cách yêu cầu xoá).

## Không làm trong đợt này
Tạo app trên App Store Connect, upload build, submit, đổi bundle id/signing, thêm Firebase hay xoá tài khoản.
