# I-8A · Đối chiếu Tài khoản và Phụ huynh

Ngày: 2026-10-21 · Nhóm: `Features/Auth/**`, `Features/Guardian/**` · Prototype: ảnh P2 và P1 đã có trong `plans/20261021-mvp/design/prototype-shots/`.

## Đã làm

- Tiếp tục từ thay đổi dở của I-8A; giữ nguyên các thay đổi Comments, Homework, Reports, Scores và Core/App của worker khác.
- Chỉnh dữ liệu demo Cài đặt phụ huynh để phần liên kết con khớp trạng thái prototype (`—`); chỉ áp dụng cho cờ chụp demo `settings` / `settings-blocked`.
- Thêm flow Maestro có thể chạy lại dưới `ios/maestro/auth/` và `ios/maestro/guardian/`.
- Chụp lại bằng Maestro các trạng thái đăng nhập, đăng ký, đổi/quên mật khẩu, chọn vai trò, Cài đặt phụ huynh, hộp thoại chặn đăng xuất và năm tab phụ huynh. Ảnh đối chiếu nằm trong `ios/docs/screens/auth/` và `ios/docs/screens/guardian/`.

## Bảng khác biệt

| Màn | Khác gì | Trạng thái | Lý do |
|---|---|---|---|
| Đăng nhập, sai thông tin, khóa tạm | Không thấy khác biệt bố cục/nhãn sau khi chuẩn hóa kích thước theo màn hình; trạng thái lỗi và khóa có banner đúng vai trò. | Đã đối chiếu | Khoảng trống phía trên là safe area và status bar của iOS. |
| Đăng ký, đổi mật khẩu bắt buộc | Cấu trúc, nhãn, placeholder và trạng thái trống khớp. | Đã đối chiếu | Không nhập mật khẩu vào flow hay log. |
| Quên mật khẩu phụ huynh/giáo viên | Nội dung hướng dẫn theo đúng vai trò, ô số điện thoại chỉ đọc và nút quay lại khớp. | Đã đối chiếu | Khác biệt còn lại chỉ là safe area/status bar. |
| Chọn vai trò | Thứ tự, bố cục, tiêu đề và ảnh demo khớp; phụ đề Phụ huynh dùng `Bé Gia Bảo` trong cờ demo. Membership thật vẫn chỉ có `Phụ huynh`. | Đã sửa ảnh demo; dữ liệu thật còn khác | `CurrentIdentity`/`Membership` không có tên con; không sửa Core hoặc bịa tên trong luồng thật. |
| Cài đặt giáo viên | Màn tài khoản nay nằm trong teacher shell, giữ thanh tab `Lớp / Lịch / Cài đặt` như prototype. Đã chụp lại bằng Maestro. | Đã sửa | Dùng tab Cài đặt hiện có của `TeacherRootView`; Back trở về Lớp. |
| Cài đặt phụ huynh | Prototype ghi lớp của hai con là `—`, ảnh iOS cũ ghi `6A`; đã sửa seed Cài đặt demo và chụp lại. | Đã sửa | Seed demo Cài đặt tách khỏi dữ liệu các trang phụ huynh. |
| Chặn đăng xuất | Prototype có banner trạng thái đồng bộ phía sau hộp thoại; theo hướng tạm đã bỏ banner và giữ hộp thoại `Chưa thể đăng xuất`. Không có banner/số lệnh chờ thường trực. | Đã sửa theo chỉ dẫn tạm | Nội dung giải thích số thay đổi nằm trong thân hộp thoại; không hiển thị thành banner. |
| Phụ huynh · Tổng quan, Điểm danh, Điểm số, Nhận xét, Báo cáo | Không thấy khác biệt nhìn thấy về chữ, thứ tự, màu, thành phần hoặc nội dung demo. Cả năm tab có biểu tượng theo prototype; không có mục Cài đặt thứ sáu. | Đã đối chiếu | Cài đặt phụ huynh chỉ mở qua cờ demo, không thêm vào thanh tab. |

## Maestro

Simulator: iPhone 16 `CF871F97-1789-4490-B3E3-0B5EFA39F23F`, Maestro CLI 2.2.0.

```text
~/.maestro/bin/maestro --udid CF871F97-1789-4490-B3E3-0B5EFA39F23F test \
  --test-output-dir /tmp/qlh-maestro-i8a-final \
  --debug-output=/tmp/qlh-maestro-debug-final \
  ios/maestro/auth/account-states.yaml
PASS · 1/1 flow · 8 account states

~/.maestro/bin/maestro --udid CF871F97-1789-4490-B3E3-0B5EFA39F23F test \
  --test-output-dir /tmp/qlh-maestro-i8a-final \
  --debug-output=/tmp/qlh-maestro-debug-final \
  ios/maestro/auth/guardian-settings.yaml ios/maestro/guardian/tabs.yaml
2/2 Flows Passed
```

## Build và test

```text
cd ios && xcodebuild -scheme QuanLyLop -configuration Staging \
  -destination 'platform=iOS Simulator,id=CF871F97-1789-4490-B3E3-0B5EFA39F23F' \
  -derivedDataPath /tmp/qlh-dd-i8a CODE_SIGNING_ALLOWED=NO test
TEST SUCCEEDED · 106 tests · 0 failures · 2 skipped (screenshot-only)
```

Đã xóa `/tmp/qlh-dd-i8a` sau mỗi lượt build/test; dung lượng còn 12 GB. Ảnh iOS giữ kích thước 1178×2556, tổng 3.9 MB trong hai thư mục ảnh I-8A.

## Câu hỏi

1. Tạm giữ đúng năm tab Phụ huynh, không thêm biểu tượng Cài đặt; Cài đặt phụ huynh chỉ vào qua cờ debug `QLH_DEMO_SCREEN=settings`.
2. Tạm không hiện banner/số lệnh chờ; khi đăng xuất bị chặn chỉ hiện hộp thoại `Chưa thể đăng xuất`.

## Còn lại

- Phụ đề vai trò thật vẫn hiện `Phụ huynh`; prototype có tên con `Bé Gia Bảo`. Muốn khớp trong dữ liệu thật cần bổ sung quan hệ tên con vào payload membership/identity (ngoài phạm vi I-8A, không sửa Core trong lượt này).
- Chưa kiểm chứng trên thiết bị iPhone thật; đã kiểm tra simulator iPhone 16.

Status: DONE_WITH_CONCERNS
