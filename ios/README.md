# Quản lý lớp — app iOS (bản nền)

App SwiftUI cho giáo viên quản lý lớp tiếng Anh. **Đây mới là bản nền**: chưa có màn nghiệp vụ,
chưa gọi API thật, chưa có lớp lưu cục bộ. Xem `docs/spec.md` và `docs/architecture.md` ở gốc repo.

## Cần có

- macOS + Xcode 16 trở lên (đã thử với Xcode 26.1.1), iOS 17+ simulator.
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`.
  `QuanLyLop.xcodeproj` là file **sinh ra**, không commit.
- Python 3 + Pillow (chỉ khi muốn sinh lại icon): `python3 -m pip install --user pillow`.

## Tạo project, build, chạy

```sh
cd ios
xcodegen generate                 # sinh QuanLyLop.xcodeproj từ project.yml
open QuanLyLop.xcodeproj          # chọn scheme QuanLyLop, ⌘R
```

Dòng lệnh (không cần chứng chỉ ký):

```sh
# build cho simulator (mặc định cấu hình Staging)
xcodebuild -project ios/QuanLyLop.xcodeproj -scheme QuanLyLop \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build

# cài và chạy trên simulator đang bật
xcrun simctl install booted ios/build/DerivedData/Build/Products/Staging-iphonesimulator/QuanLyLop.app
xcrun simctl launch booted vn.quanlylop.app
```

Build Staging ra `ios/build/DerivedData/Build/Products/Staging-iphonesimulator/`, build Production ra
thư mục `Production-*` (khi archive bằng Xcode).

## Môi trường (Staging / Production)

Hai cấu hình build, đặt trong `Config/`:

| Cấu hình | File | `APP_ENVIRONMENT` | `API_BASE_URL` |
|---|---|---|---|
| Staging (mặc định) | `Config/Staging.xcconfig` | `Staging` | `https://staging.invalid` (giả) |
| Production | `Config/Production.xcconfig` | `Production` | `https://api.invalid` (giả) |

Hai giá trị này vào Info.plist qua `APP_ENVIRONMENT` / `API_BASE_URL` (`QuanLyLop/Resources/Info.plist`),
app đọc bằng `AppConfiguration.load()` và hiện ở màn khởi động.

- Đổi URL: sửa `API_BASE_URL` trong file `.xcconfig`. Trong xcconfig, `//` mở đầu chú thích nên
  phải viết `https:/$()/ten-mien`. Chưa có backend: giữ tên miền `.invalid`.
- **Không đặt secret** (khoá, mật khẩu) trong `.xcconfig` hay Info.plist — file này vào thẳng bundle app.
- Đổi môi trường khi chạy: Scheme → Run → Info → Build Configuration.
- Build Production từ dòng lệnh: thêm `-configuration Production`.

## Đổi bundle id, tên app

- Bundle id **tạm** `vn.quanlylop.app`: sửa `PRODUCT_BUNDLE_IDENTIFIER` trong `Config/Base.xcconfig`,
  rồi chạy lại `xcodegen generate`.
- Tên app **tạm** "Quản lý lớp": sửa `CFBundleDisplayName`/`CFBundleName` trong
  `QuanLyLop/Resources/InfoPlist.xcstrings` (bản dịch tiếng Việt) và `QuanLyLop/Resources/Info.plist`,
  cùng khoá `app.name` trong `Localizable.xcstrings`.
- Team ký: chọn Team trong Signing & Capabilities của Xcode (không lưu trong repo).

## Cấu trúc thư mục

```
ios/
  project.yml            nguồn chuẩn của project Xcode
  Config/                Base/Staging/Production.xcconfig
  Scripts/make-icon.py   sinh AppIcon 1024×1024 + Assets.xcassets
  docs/                  storage-proposal.md, ảnh chụp màn khởi động, báo cáo
  QuanLyLop/
    App/                 QuanLyLopApp.swift (@main), ContentView (màn khởi động)
    Core/Config/         AppConfiguration: đọc API_BASE_URL, môi trường từ Info.plist
    Core/Networking/     APIClient protocol + StubAPIClient (chờ API spec)
    Core/Storage/        LocalStore protocol, PendingCommand (chưa cài đặt)
    Features/            Auth, Classes, Attendance, Scores, Homework, Comments, Reports, Guardian (trống)
    Resources/           Info.plist, Assets.xcassets, Localizable.xcstrings, InfoPlist.xcstrings
```

Localization: `developmentRegion` là `vi`; mọi chuỗi trong app đi qua `Localizable.xcstrings`,
tên app đi qua `InfoPlist.xcstrings`. Chưa có ngôn ngữ thứ hai.

## Icon và màu

`python3 ios/Scripts/make-icon.py` sinh lại `AppIcon` (nền `#2B5CE6`, hình sách mở) và các colorset
`AccentColor`, `LaunchBackground`. Màu chính hiện dùng `#2B5CE6` theo brief; prototype đang dùng
`#2F5BEA` (`design/prototype/src/shared/styles/tokens.css`) — cần chốt một mã khi làm giao diện thật.

## Chưa có (đúng phạm vi bản nền)

- API thật, đăng nhập, mọi màn nghiệp vụ.
- Lưu cục bộ và hàng đợi đồng bộ: mới có đề xuất `ios/docs/storage-proposal.md`.
- Test tự động, CI, chứng chỉ ký, cấu hình push.
