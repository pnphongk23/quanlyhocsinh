# iOS-18 · Chữ P3 và chạy staging

Ngày: 2026-10-22 · Nhánh `mvp-ios` · Worktree hiện tại.

## 1. Chữ P3

| Màn hình | Cũ | Mới | File |
|---|---|---|---|
| Quên mật khẩu, phụ huynh | `Nhờ giáo viên cấp lại mật khẩu cho số điện thoại của bạn.` | `Người vận hành sẽ đặt lại mật khẩu cho bạn. Không gửi mã xác nhận.` | `Features/Auth/AuthScreens.swift`, `Resources/Localizable.xcstrings` |
| Quên mật khẩu, giáo viên | `Giáo viên chưa tự đặt lại mật khẩu được.` | Cùng mô tả người vận hành như phụ huynh | `Features/Auth/AuthScreens.swift`, `Resources/Localizable.xcstrings` |
| Bước 1 | `Báo số điện thoại này cho giáo viên của con.` | `Liên hệ người vận hành và cung cấp số điện thoại tài khoản.` | `Resources/Localizable.xcstrings` |
| Bước 2 | `Giáo viên bấm “Cấp lại mật khẩu” ở hồ sơ học sinh.` | `Người vận hành sẽ đặt lại mật khẩu thủ công.` | `Resources/Localizable.xcstrings` |
| Bước 3 và ghi chú cũ | Bước 3, banner giáo viên, `AuthNote` cũ | Đã bỏ; hai vai trò dùng cùng bố cục hai bước | `Features/Auth/AuthScreens.swift`, `Resources/Localizable.xcstrings` |
| Hướng dẫn đăng nhập phụ huynh | `Phụ huynh: dùng số điện thoại đã đăng ký với giáo viên và mật khẩu giáo viên cấp.` | `Phụ huynh: dùng số điện thoại đã khai trong hồ sơ học sinh và mật khẩu tài khoản.` | `Features/Auth/AuthScreens.swift`, `Resources/Localizable.xcstrings` |
| Đổi mật khẩu | Các nhãn “mật khẩu tạm” | `Mật khẩu hiện tại`; `Mật khẩu mới phải khác mật khẩu hiện tại.` | `Features/Auth/AuthScreens.swift`, `Features/Auth/AuthCopy.swift`, `Features/Auth/AuthService.swift`, `Resources/Localizable.xcstrings` |
| Lỗi điểm | `Điểm từ 0 đến %@`; `Điểm phải từ 0 đến %@.` | `Điểm từ 0 đến %@, theo bước 0,5`; `Điểm phải từ 0 đến %@, theo bước 0,5.` | `Resources/Localizable.xcstrings` |

Điểm thập phân tiếp tục hiển thị `7,5`, điểm nguyên không có `,0`. Các chuỗi cũ trong brief không còn trong `QuanLyLop`. Test mới xác nhận `invalid_score_step` vẫn được giữ trong hàng đợi ở trạng thái `rejected`.

## 2. Kiểm chứng staging

- `GET /v1/health`: HTTP 200.
- Build Staging ký ad-hoc trên iPhone 16. Entitlement Staging được xác nhận trong chữ ký cục bộ (`keychain-access-groups` là `vn.quanlylop.app`); không thay team, provisioning hoặc entitlement Production.
- Flow `01-login.yaml` chạy với `--no-reinstall-driver` nhưng trả lỗi. Bộ chạy đã loại credential khỏi đầu ra; nguyên nhân cụ thể không được giữ lại nên không suy đoán và không thử đăng nhập lần nữa.
- Không gọi API login độc lập, không gửi `attendance.set`, không đọc GET điểm danh độc lập và không thay đổi dữ liệu staging. Vì vậy chưa có status/version trước–sau để báo; các bước ghi, hoàn tác và đăng nhập phụ huynh vẫn chưa chạy.
- Không tạo ảnh chụp; thư mục artifact/debug tạm đã xoá. Simulator iPhone 16 được shutdown sau kiểm chứng.

## 3. Kiểm chứng mã

| Lệnh | Kết quả |
|---|---|
| `xcodegen generate` | OK |
| Staging `xcodebuild ... CODE_SIGNING_ALLOWED=NO build test` | TEST SUCCEEDED — 112 passed, 2 skipped, 0 failed (114 tổng) |
| Production `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` | BUILD SUCCEEDED |
| `maestro check-syntax` cho ba flow staging | OK |
| `git diff --check` | OK |

## 4. Trạng thái

Status: BLOCKED

Phần chữ P3 và build/test hoàn tất. Chạy staging bị chặn tại flow đăng nhập; không gửi lệnh ghi và không có thay đổi dữ liệu demo.
