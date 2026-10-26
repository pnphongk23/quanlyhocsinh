# Việc C1: nền dự án iOS SwiftUI

Người giao: General Lead. Bạn là worker. Thư mục làm việc DUY NHẤT để sửa: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios` (nhánh `mvp-ios`, từ `main`). Mọi file mới nằm trong `ios/` của worktree này.

## Đọc trước (đường dẫn tuyệt đối, thư mục chính, chỉ đọc)

- `/Users/phamnhuphong/Git/quanlyhocsinh/AGENTS.md`
- `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/lead-brief.md` mục 0, 1, 2.C
- `/Users/phamnhuphong/Git/quanlyhocsinh/docs/architecture.md` mục 5 (offline) và mục 6 (hiệu năng) để hiểu hướng; chưa cần theo sát, API spec chưa có.
- Prototype để lấy màu/giọng: `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype/src/shared` (tìm token màu; xanh chính `#2B5CE6`).

Dùng `srcwalk` thay `rg/grep/cat` khi tìm trong code.

## Làm

1. `ios/project.yml` (XcodeGen): app "Quản lý lớp", bundle id tạm `vn.quanlylop.app` (ghi rõ là tạm trong README), iOS 17+, SwiftUI, Swift 6, không thư viện ngoài. Hai cấu hình môi trường staging và production qua `.xcconfig` (`ios/Config/Staging.xcconfig`, `Production.xcconfig`) mang `API_BASE_URL`; mặc định build Staging; URL staging để placeholder `https://staging.invalid` (chưa có backend), KHÔNG đặt secret.
2. App icon 1024×1024 sinh bằng script (`ios/Scripts/make-icon.py` với Pillow, hoặc Swift nếu Pillow không có): nền `#2B5CE6`, ký hiệu quyển sách/chữ cái đơn giản. Sinh asset catalog (`Assets.xcassets` có AppIcon, AccentColor = `#2B5CE6`). LaunchScreen (UILaunchScreen trong Info.plist hoặc storyboard tối giản).
3. Cấu trúc thư mục theo tính năng trong `ios/QuanLyLop/`: `App/`, `Core/Networking/` (lớp gọi API stub: `APIClient` protocol + `StubAPIClient`, chưa gọi mạng thật, ghi chú chờ API spec), `Core/Storage/` (lớp lưu cục bộ trừu tượng, CHƯA cài đặt cụ thể), `Core/Config/` (đọc `API_BASE_URL` từ Info.plist), `Features/` với thư mục rỗng có `.gitkeep` cho `Auth`, `Classes`, `Attendance`, `Scores`, `Homework`, `Comments`, `Reports`, `Guardian`. Màn khởi động: một `ContentView` đơn giản hiện tên app và môi trường hiện tại (Staging/Production).
4. Localization tiếng Việt: `Localizable.xcstrings`, `developmentRegion` là `vi`, chuỗi tên app và màn khởi động đi qua localization.
5. `ios/docs/storage-proposal.md` (≤ 1 trang): đề xuất SwiftData hay SQLite (GRDB không dùng vì không thêm thư viện) cho lưu cục bộ + hàng đợi ghi idempotent (UUID, version) theo `docs/architecture.md` mục 5; nêu lý do, rủi ro, đề xuất. Chỉ đề xuất, không cài đặt.
6. `ios/README.md`: cách tạo project (`xcodegen generate`), build, chạy, đổi bundle id, đổi môi trường.

## Xác minh (bắt buộc, dán bằng chứng vào báo cáo)

- `xcodegen generate` chạy thành công (nếu chưa có `xcodegen` thì `brew install xcodegen`; không được thì BLOCKED và nói rõ).
- `xcodebuild -project ios/QuanLyLop.xcodeproj -scheme QuanLyLop -destination 'generic/platform=iOS Simulator' build` (tên project/scheme có thể khác, theo `project.yml`) thành công, không cần chứng chỉ ký (`CODE_SIGNING_ALLOWED=NO`).
- Cài và chạy thử trên iOS Simulator (`xcrun simctl`), chụp màn khởi động vào `ios/docs/launch-screenshot.png`. Không chụp được thì nói rõ vì sao.
- Không commit file build (`DerivedData`, `*.xcodeproj` sinh ra nếu `project.yml` là nguồn: thêm `.gitignore` phù hợp trong `ios/`).

## Git

Commit trên nhánh `mvp-ios` trong worktree, tiếng Anh, conventional (ví dụ `feat(ios): add SwiftUI app skeleton with XcodeGen`), không nhắc AI. KHÔNG push, KHÔNG merge, KHÔNG đụng thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh`.

## Ràng buộc

- Chỉ nền, KHÔNG làm màn nghiệp vụ. Không SĐT/mật khẩu/secret trong mã hay log.
- Không rõ chi tiết: báo `BLOCKED_NEEDS_LEAD`, không đổi kiến trúc.

Ghi báo cáo ngắn (đã làm, bằng chứng build/chụp màn, hash commit, vấn đề) vào `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/ios/report-c1.md`. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
