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
xcrun simctl launch booted com.study.teacherthu
```

Build Staging ra `ios/build/DerivedData/Build/Products/Staging-iphonesimulator/`, build Production ra
thư mục `Production-*` (khi archive bằng Xcode).

## Môi trường (Staging / Production)

Hai cấu hình build, đặt trong `Config/`:

| Cấu hình | File | `APP_ENVIRONMENT` | `API_BASE_URL` |
|---|---|---|---|
| Staging (tên lịch sử; Debug/simulator) | `Config/Staging.xcconfig` | `Staging` | máy chủ dev (`qlh-dev-api…/v1`) |
| Production | `Config/Production.xcconfig` | `Production` | máy chủ phục vụ người dùng thật |

Hai giá trị này vào Info.plist qua `APP_ENVIRONMENT` / `API_BASE_URL` (`QuanLyLop/Resources/Info.plist`),
app đọc bằng `AppConfiguration.load()` và hiện ở màn khởi động.

- Đổi URL: sửa `API_BASE_URL` trong file `.xcconfig`. Trong xcconfig, `//` mở đầu chú thích nên
  phải viết `https:/$()/ten-mien`. Chưa có backend: giữ tên miền `.invalid`.
- **Không đặt secret** (khoá, mật khẩu) trong `.xcconfig` hay Info.plist — file này vào thẳng bundle app.
- Đổi môi trường khi chạy: Scheme → Run → Info → Build Configuration.
- Build Production từ dòng lệnh: thêm `-configuration Production`.

## Đổi bundle id, tên app

- Bundle id **tạm** `com.study.teacherthu`: sửa `PRODUCT_BUNDLE_IDENTIFIER` trong `Config/Base.xcconfig`,
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
    App/                 QuanLyLopApp.swift (@main), ContentView (màn khởi động + harness design system)
    Core/Config/         AppConfiguration: đọc API_BASE_URL, môi trường từ Info.plist
    Core/DesignSystem/   token prototype (màu/chữ/bán kính), nút, ô nhập, chip, pill, thẻ, sheet, trạng thái
    Core/Models/         mô hình Codable theo api-spec/data-model, JSONValue + WireJSON
    Core/Networking/     APIClient (URLSession) + StubAPIClient + Fixtures/CoreFixtures.json
    Core/Security/       TokenStore (Keychain/in-memory) + SessionController (đăng xuất, đổi vai trò)
    Core/Storage/        LocalStore + SQLiteStore: bản ghi, hàng đợi lệnh idempotent, cursor
    Core/Sync/           SyncCoordinator: push/pull/snapshot theo api-spec mục 6
    Core/Push/           PushRegistrar + NoOpPushRegistrar (chưa Firebase)
    Features/            Auth, Classes, Attendance, Scores, Homework, Comments, Reports, Guardian (trống)
    Resources/           Info.plist, QuanLyLop.entitlements, Assets.xcassets, Localizable.xcstrings, InfoPlist.xcstrings
  QuanLyLopTests/        test Core, đồng bộ, mạng, design system (XCTest)
  docs/                  ui-verification-gate.md (cổng kiểm UI mobile), core-api.md, report-i1.md, storage-proposal.md, screens/ (ảnh đối chiếu prototype)
```

Localization: `developmentRegion` là `vi`; mọi chuỗi trong app đi qua `Localizable.xcstrings`,
tên app đi qua `InfoPlist.xcstrings`. Chưa có ngôn ngữ thứ hai.

## Icon và màu

`python3 ios/Scripts/make-icon.py` sinh lại `AppIcon` (nền `#2F5BEA`, hình sách mở) và các colorset
`AccentColor`, `LaunchBackground`. Màu chính dùng `#2F5BEA` — rgb(47, 91, 234) — theo prototype
(`design/prototype/src/shared/styles/tokens.css`, `--color-primary`).

## Kiểm thử

```sh
cd ios
xcodegen generate
xcodebuild -scheme QuanLyLop -configuration Staging \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath /tmp/qlh-dd-i1 CODE_SIGNING_ALLOWED=NO build test
```

Lệnh này chạy cả build và test. Test keychain cần app **có ký** (entitlement `keychain-access-groups`);
với `CODE_SIGNING_ALLOWED=NO` nó tự `XCTSkip`, muốn chạy đủ thì bỏ cờ đó:

```sh
xcodebuild -scheme QuanLyLop -configuration Staging \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath /tmp/qlh-dd-i1b test -only-testing:QuanLyLopTests/NetworkingTests
```

Xem thư viện thành phần (design system) ngay trên simulator:

```sh
SIMCTL_CHILD_QLH_DESIGN_GALLERY=1 xcrun simctl launch booted com.study.teacherthu   # =sheet để mở sheet mẫu
```

## PDF báo cáo (iOS-19)

Phát hành chỉ gửi yêu cầu `POST …/publish` và lưu bản chụp báo cáo. Khi người dùng chọn “In báo cáo”
(giáo viên) hoặc “Tải PDF về máy” (phụ huynh), app tạo PDF từ dữ liệu trên máy, mở bảng chia sẻ iOS để
in, lưu vào Tệp hoặc gửi qua ứng dụng khác, rồi xoá file tạm khi bảng đóng. App không tải PDF lên hoặc
tải PDF từ máy chủ.

## Chưa có (đúng phạm vi bản nền)

- API thật, đăng nhập, mọi màn nghiệp vụ (I-2..I-5).
- Push FCM: mới có `PushRegistrar` no-op.
- CI, chứng chỉ ký, cấu hình Team.
