# Báo cáo I-2 · Khung app + Tài khoản

Nhánh `mvp-ios`, gói `ios/`. Nguồn nghiệp vụ: `docs/spec.md`, `plans/20261021-mvp/backend/api-spec.md`; API lõi: `ios/docs/core-api.md`.

## Đã làm

- Nối `ContentView` vào auth flow; token lưu qua `KeychainTokenStore`, khôi phục phiên bằng `GET /me`.
- Thêm đăng nhập, đăng ký workspace giáo viên, hiển thị trạng thái sai thông tin/khoá tạm, đổi mật khẩu bắt buộc, quên mật khẩu, chọn membership, cài đặt tài khoản, đổi mật khẩu và đổi vai trò.
- Chọn `TeacherRootView()` hoặc `GuardianRootView()` theo `scope_kind`; đổi membership chỉ áp dụng sau khi `PUT /session/membership` xác nhận.
- Đăng xuất gọi `SessionController.logout()`, chặn khi `pendingCommandCount()` còn lệnh và giữ phiên nếu API chưa xác nhận.
- Không thêm OTP, lời mời hay passkey. Các payload auth dùng API hiện có; thông báo lỗi lấy từ `APIError.localizedMessage`, không hiện message thô.

## Kiểm chứng

Lệnh theo brief:

```sh
cd ios
xcodegen generate
xcodebuild -scheme QuanLyLop -configuration Staging \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath /tmp/qlh-dd-ios-i2 CODE_SIGNING_ALLOWED=NO build test
```

Kết quả: `swiftc -frontend -parse` cho các file Auth và test Auth qua. Lệnh `xcodebuild … build test` dừng khi compile gói Guardian: `GuardianRepository.swift:161` không type-check được và `GuardianRootView.swift` báo không tìm thấy `GuardianFormat`; test chưa chạy.

## Đối chiếu giao diện

| Màn | Khác gì | Đã sửa/chưa | Lý do |
|---|---|---|---|
| Đăng nhập / sai thông tin / khoá tạm | Dùng cùng cấu trúc, nhãn và thông báo; font, trường và nút đã chỉnh theo số đo auth prototype. | Đã chỉnh | Tạm theo `auth-r4/01–03`; prototype code là nguồn chuẩn khi hoàn tất. |
| Đăng ký giáo viên | Form và nhãn khớp prototype; lỗi xác thực hiển thị chung ở đầu form thay vì từng trường cho trường hợp API từ chối. | Một phần | Đăng ký workspace theo endpoint `/auth/register`; cần quyết định staging có bắt `registration_code` không (API Q3). |
| Đổi mật khẩu bắt buộc / trùng mật khẩu tạm | Trường, quy tắc 8 ký tự, thanh độ mạnh và lỗi trùng mật khẩu được dựng theo ảnh 05–06. | Đã chỉnh | Lỗi mật khẩu hiện tại sai dùng thông báo an toàn từ API, không hiện nội dung thô. |
| Quên mật khẩu phụ huynh / giáo viên | Gộp hai biến thể thành hướng dẫn chung; giữ số điện thoại vừa nhập ở chế độ chỉ đọc. | Chưa khớp | API không thể xác định role trước đăng nhập và Q1 chưa có endpoint khôi phục giáo viên; không tra cứu role qua SĐT để tránh lộ tài khoản. |
| Chọn vai trò | Thẻ, tên role và workspace khớp; phụ huynh chưa hiện tên con như ảnh tham chiếu. | Một phần | `Membership` từ `/me` không chứa tên học sinh; không tải dữ liệu phụ huynh trước khi xác nhận membership. |
| Cài đặt tài khoản / đổi mật khẩu | Hồ sơ chỉ đọc, đổi mật khẩu, đổi role khi nhiều membership, đăng xuất. Có nút quay lại do root hiện là placeholder. | Một phần | Khi root tab thật được nối, đối chiếu lại đường vào/ra cài đặt với prototype cuối. |
| Đăng xuất bị chặn | Dùng `AppSheet`, đếm mọi membership của user; có “Thử đồng bộ lại” và “Đã hiểu”. | Đã chỉnh | Hình auth-r4/13 dùng ví dụ có tên buổi/nhận xét; màn này chỉ nêu số lượng, không đọc nội dung nhận xét. |

Prototype Tài khoản đang được hoàn thiện ở nhánh Web. Tạm đối chiếu theo bộ ảnh `plans/20261021-mvp/design/auth-r4/01–13`; cần đối chiếu lại toàn bộ màn khi lead báo prototype Tài khoản cuối đã xong.

Ảnh simulator: chưa chụp được vì build app dừng do lỗi compile trong file của gói Guardian đang được chỉnh đồng thời (`GuardianRepository.swift`/`GuardianRootView.swift`), ngoài phạm vi I-2. Cần lưu ảnh từng màn tại `ios/docs/screens/auth/` và cập nhật bảng trên sau khi build chung chạy được.

## Câu hỏi

- Backend không có endpoint tự đặt lại mật khẩu cho giáo viên/Admin (API spec mục 4, Q1). Màn quên mật khẩu hiện hướng dẫn liên hệ quản trị viên theo prototype; chưa có thao tác đặt lại trong app.
- Mô tả cấu hình đăng ký `registration_code` còn là câu hỏi mở ở API spec Q3; màn đăng ký chưa gửi trường này.

Status: DONE_WITH_CONCERNS
Luồng I-2 và test đơn vị đã được thêm; cú pháp Swift parse được nhưng build/test chung chưa chạy qua do lỗi compile ở gói Guardian ngoài phạm vi này. Chưa thể chụp simulator hoặc xác nhận parity; cần build lại và đối chiếu khi gói Guardian hoàn tất, đồng thời lead chốt Q1/Q3.
