# Báo cáo C1 — nền dự án iOS SwiftUI

Ngày: 2026-10-20 · Nhánh `mvp-ios` (worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`) ·
Commit: `d53a035` (`feat(ios): add SwiftUI app skeleton with XcodeGen`)

## Đã làm

1. `ios/project.yml` (XcodeGen): app "Quản lý lớp", bundle id tạm `com.study.teacherthu`, iOS 17+,
   SwiftUI, Swift 6 (`SWIFT_STRICT_CONCURRENCY=complete`), không thư viện ngoài, chỉ iPhone.
   Hai cấu hình `Staging` (debug, mặc định) và `Production` (release); scheme chạy Staging, archive Production.
   `Config/Base.xcconfig` (bundle id tạm, version) + `Staging.xcconfig` / `Production.xcconfig`
   (`APP_ENVIRONMENT`, `API_BASE_URL`); URL là placeholder `.invalid`, không có secret.
2. `Scripts/make-icon.py` (Pillow) sinh `AppIcon.png` 1024×1024 (nền `#2B5CE6`, sách mở màu trắng,
   vẽ 4x rồi thu nhỏ) và cả `Assets.xcassets`: `AppIcon`, `AccentColor` = `#2B5CE6`,
   `LaunchBackground` = `#2B5CE6`. LaunchScreen qua `UILaunchScreen` → `UIColorName = LaunchBackground`
   trong `Info.plist` (không cần storyboard).
3. Cấu trúc `ios/QuanLyLop/`: `App/` (`@main` + `ContentView` màn khởi động), `Core/Config/`
   (`AppConfiguration` đọc `APP_ENVIRONMENT`/`API_BASE_URL` từ Info.plist, có trạng thái lỗi),
   `Core/Networking/` (`APIClient` protocol + `APIEndpoint` + `StubAPIClient` ném `notImplemented`,
   ghi chú chờ API spec), `Core/Storage/` (`LocalStore` protocol + `PendingCommand` theo mục 5,
   **chưa cài đặt**), `Features/{Auth,Classes,Attendance,Scores,Homework,Comments,Reports,Guardian}/.gitkeep`.
   Màn khởi động hiện tên app, môi trường, URL API, version + bundle id.
4. Localization: `Localizable.xcstrings` (4 khoá, source language `vi`) + `InfoPlist.xcstrings` cho
   tên app; `developmentLanguage`/`CFBundleDevelopmentRegion` = `vi`.
5. `ios/docs/storage-proposal.md`: đề xuất **SQLite qua `SQLite3`** (thay vì SwiftData) vì cần
   transaction gộp "bản ghi + lệnh chờ" và idempotent bằng `UNIQUE(commands.id)`; kèm rủi ro/giảm thiểu.
6. `ios/README.md`: XcodeGen, build/run bằng dòng lệnh và Xcode, đổi môi trường, đổi bundle id, đổi tên app,
   cấu trúc thư mục, icon, ghi chú "tạm". `ios/.gitignore` bỏ `QuanLyLop.xcodeproj/`, `build/`, `DerivedData/`.

## Bằng chứng xác minh

```
$ cd ios && xcodegen generate
⚙️  Generating plists...
⚙️  Generating project...
⚙️  Writing project...
Created project at .../ios/QuanLyLop.xcodeproj
```

```
$ xcodebuild -project ios/QuanLyLop.xcodeproj -scheme QuanLyLop \
    -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build/DerivedData \
    CODE_SIGNING_ALLOWED=NO clean build
** BUILD SUCCEEDED **      (exit 0; chỉ 1 warning của appintentsmetadataprocessor: "No AppIntents.framework dependency found")
$ xcodebuild ... -configuration Production ... build
** BUILD SUCCEEDED **
```

Giá trị thật trong bundle: `AppEnvironment=Staging`, `APIBaseURL=https://staging.invalid`,
`CFBundleIdentifier=com.study.teacherthu`, `CFBundleDisplayName=Quản lý lớp`, `TARGETED_DEVICE_FAMILY=1`;
build Production ra `AppEnvironment=Production`, `APIBaseURL=https://api.invalid`.
Bundle có `vi.lproj/Localizable.strings` và `vi.lproj/InfoPlist.strings` (đã dịch).

Chạy thử: simulator `QuanLyLop-iPhone16` (iOS 26.1, UDID `66F0C2F7-…`) — `simctl install` + `launch`
thành công (pid 84508), ảnh chụp màn khởi động: `ios/docs/launch-screenshot.png` (hiện "Quản lý lớp",
"Môi trường Staging", `https://staging.invalid`, `0.1.0 (1) · com.study.teacherthu`).
Màn launch (UILaunchScreen) kiểm bằng ảnh chụp ngay sau khi launch: toàn màn `rgb(43,92,230)` = `#2B5CE6`.

## Vấn đề / lưu ý

1. **Vị trí báo cáo:** yêu cầu từ controller là chỉ sửa trong worktree `ios/`, nên báo cáo nằm ở
   `ios/docs/report-c1.md` (chưa commit), không ghi vào `plans/20261021-mvp/ios/report-c1.md` ở thư mục chính.
2. **Mã màu chính:** brief ghi `#2B5CE6`, prototype dùng `#2F5BEA` (`design/prototype/src/shared/styles/tokens.css`).
   Đã theo brief; cần lead chốt một mã trước khi làm giao diện thật.
3. Máy chưa cấu hình `user.name/user.email` cho git; commit dùng danh tính khớp lịch sử repo
   (`Pham Nhu Phong <phamnhuphong@MacBook-Air-cua-Pham.local>`) truyền qua `-c`, không ghi vào config.
4. Giả định: chỉ iPhone (`TARGETED_DEVICE_FAMILY=1`); chưa có test target/CI/chứng chỉ ký (ngoài phạm vi bản nền).
5. Chưa cài lưu cục bộ và API thật — đúng phạm vi, chờ API spec backend.

Status: DONE_WITH_CONCERNS
Summary: Đã dựng nền app SwiftUI bằng XcodeGen với hai môi trường xcconfig, icon + accent sinh bằng script, localization tiếng Việt, stub API, cổng lưu cục bộ trừu tượng và màn khởi động hiện môi trường; build Staging/Production thành công, chạy trên simulator và có ảnh chụp màn khởi động trong `ios/docs/launch-screenshot.png`. Commit `d53a035` trên nhánh `mvp-ios`, còn ba điểm cần lead chốt: báo cáo phải nằm trong worktree theo yêu cầu controller (không ghi vào thư mục chính), mã màu chính lệch giữa brief `#2B5CE6` và prototype `#2F5BEA`, và chưa có test target/CI.
