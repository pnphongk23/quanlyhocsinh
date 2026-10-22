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

## 2. Chẩn đoán và chạy staging

### Đăng nhập giáo viên và điểm danh

- Dùng app Staging ký ad-hoc trên iPhone 16 và khởi chạy bằng `xcrun simctl launch`. Kiểm entitlement trên binary cài đặt: entitlement thực tế trống; xcent mô phỏng có Team prefix gây launchd `POSIX 163` khi ký thủ công. Với chữ ký ad-hoc hợp lệ, lưu token Keychain thành công; không xuất hiện OSStatus `-34018`.
- Cây Maestro cho thấy tiêu đề “Đăng nhập” khác nút `login.submit`. Nút bị bàn phím che một phần; vuốt lên bằng thao tác riêng đưa nút lên vùng nhìn thấy. File demo dùng số có tiền tố `84`, trong khi trường app chỉ giữ 9 chữ số đầu. Flow phải nhận số nội địa 9 chữ số sau khi bỏ tiền tố quốc gia; không ghi giá trị này vào báo cáo.
- Sau khi chuẩn hoá đầu vào và chạm nút submit đúng, log an toàn chỉ ghi `login_http_status=200` và `login_keychain_set_succeeded`; app hiện “Lớp của tôi”. Không có lỗi `429` trong lượt thành công.
- UI mở lớp `6A`, buổi S1 ngày 14/10, sửa điểm danh một ô demo sang `late`, nhập `18:12` và lưu. GET độc lập `GET /sessions/{session_id}/attendance` trả HTTP 200: ô demo trước đó `present`, version 3, `late_at=null`; sau thao tác UI là `late`, version 4, `late_at=18:12`. Hàng đợi local về 0.
- UI trả ô về `present` và lưu. GET độc lập trả HTTP 200: `present`, version 5, `late_at=null`. ID học sinh demo: `9c375f61-f417-44c2-80d4-970de090eb6e`.
- Không đổi điểm (bước tùy chọn).

### Phụ huynh: blocker dữ liệu staging

- Đăng xuất bằng UI, đăng nhập tài khoản phụ huynh bằng số nội địa và mật khẩu demo; app xác nhận login HTTP 200, Keychain lưu token thành công và hiện các tab phụ huynh.
- Màn phụ huynh báo không tải được dữ liệu. Các request `/me` và `sync/pull` đều HTTP 200; membership học sinh liên kết hợp lệ. Chẩn đoán giải mã an toàn xác nhận các entity students/classes/sessions/attendance/tests/scores/slips/homework_sections/homework_grades giải mã được, còn `report_publication` thất bại tại `snapshot.homework[0]`: payload có các khoá `count, kind, level`, trong khi hợp đồng `api-spec.md` mục 5.4 yêu cầu `kind, excellent, done, not_done`. Thiếu khoá `excellent` làm repository trả lỗi và chặn màn attendance của phụ huynh.
- Brief cấm sửa `Features/Guardian` ngoài việc giữ build xanh, nên không tự đổi adapter/schema. Cần backend sửa payload theo API spec hoặc lead cho phép thay đổi tương thích phía iOS; sau đó cần chạy lại luồng phụ huynh để xác minh hiển thị điểm danh.

### Dọn dữ liệu thử

- Ảnh chụp được mở kiểm tra ngay sau thao tác rồi xoá; log chẩn đoán tạm và instrumentation đã gỡ khỏi mã. Không đưa SĐT, mật khẩu hay token vào repo/report. Simulator iPhone 16 đã shutdown và erase; `/tmp/qlh-dd-i18` đã xoá sau build/test.

## 3. Kiểm chứng mã

| Lệnh | Kết quả |
|---|---|
| `xcodegen generate` | OK |
| Staging `xcodebuild ... CODE_SIGNING_ALLOWED=NO build test` | TEST SUCCEEDED — 114 tests, 2 skipped, 0 failures |
| Production `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` | BUILD SUCCEEDED |
| `maestro check-syntax` cho ba flow staging | OK |
| `srcwalk discover` chuỗi cũ | 0 matches |
| `git diff --check` | OK |

## 4. Trạng thái

Status: BLOCKED

Đăng nhập giáo viên và ghi/khôi phục điểm danh đã xác minh bằng UI cùng GET độc lập (HTTP 200; version 3 → 4 → 5). Luồng phụ huynh đăng nhập được nhưng màn dữ liệu bị chặn bởi sai hình dạng `report_publication.snapshot.homework` giữa staging và API spec; cần backend đồng bộ payload hoặc quyết định cho phép iOS adapter.
