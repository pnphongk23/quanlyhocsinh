# Báo cáo I-3 · Giáo viên A

Nhánh `mvp-ios`, gói `ios/`. Nghiệp vụ theo `docs/spec.md` mục 8; API theo `plans/20261021-mvp/backend/api-spec.md` và `authz-matrix.md`.

## Đã làm

- Thay `TeacherRootView()` bằng tab Lớp / Lịch / Cài đặt; tải dữ liệu theo membership từ SQLite và đồng bộ qua `SyncCoordinator`.
- Thêm danh sách, tạo/sửa/lưu trữ lớp; lớp lưu lịch lặp tuần; lịch ngày/tháng và buổi lẻ; hủy buổi; giữ `sessionNumber` từ server và không tự đánh số.
- Thêm danh sách học sinh, thêm/sửa SĐT phụ huynh, đánh dấu nghỉ, cấp mật khẩu tạm và chỉ hiện qua hộp thoại một lần.
- Thêm chi tiết lớp và buổi; nhúng màn bài kiểm tra, bảng điểm, báo cáo, nhận xét và BTVN của I-4 với `I4FeatureStore` đã cấu hình theo membership hiện hành.
- Thêm điểm danh bốn trạng thái dạng nháp, lưu vào SQLite + outbox trước khi đồng bộ; khi mất mạng, lỗi đồng bộ được báo nhưng dữ liệu vẫn nằm trong outbox.
- Thêm test cho khoảng ngày học của học sinh, ngày có thể điểm danh và bốn trạng thái.

## Kiểm chứng

Lệnh theo brief:

```sh
cd ios
xcodegen generate
xcodebuild -scheme QuanLyLop -configuration Staging \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath /tmp/qlh-dd-i3 CODE_SIGNING_ALLOWED=NO build test
```

`xcodegen generate` thành công. `xcodebuild … build test` chưa qua: compile dừng trong `Features/Guardian/GuardianRepository.swift:161` (biểu thức không type-check trong thời gian cho phép) và `Features/Guardian/GuardianRootView.swift` (thiếu `GuardianFormat`); đây là file ngoài phạm vi I-3, nên test chưa chạy. Không chụp được ảnh Simulator khi build tổng thể chưa tạo được app.

## Đối chiếu giao diện

| Màn | Khác gì | Đã sửa/chưa | Lý do |
|---|---|---|---|
| Tab giáo viên | Có ba tab MVP Lớp / Lịch / Cài đặt; chưa so ảnh Simulator với prototype. | Chưa xác minh | Build tổng thể bị chặn bởi lỗi compile Guardian. |
| Danh sách lớp | Có lớp, sĩ số, chuyên cần, lớp hôm nay và tạo lớp; chưa xác nhận từng khoảng cách/kiểu chữ trên Simulator. | Chưa xác minh | Chưa có ảnh đối chiếu 390×844. |
| Chi tiết lớp / buổi | Có tab lớp và ba tab Điểm danh / Nhận xét / Bài tập về nhà; chưa xác nhận parity hình ảnh. | Chưa xác minh | Chưa có ảnh đối chiếu 390×844. |
| Học sinh / lịch / điểm danh | Có các thao tác trong brief; điều khiển thời gian đến muộn là ô nhập thời gian thay vì picker của prototype. | Chưa khớp | Cần đối chiếu sau khi chạy Simulator; không tự đoán UI thay thế. |

Chưa lưu ảnh vào `ios/docs/screens/classes/`: cần sửa lỗi compile ngoài phạm vi I-3 rồi chụp từng màn prototype và Simulator ở 390×844.

## Câu hỏi

- Không tìm thấy hai tài liệu bắt buộc `ios/docs/core-api.md` và `ios/docs/report-i1.md` trong worktree hoặc thư mục chính; phần tích hợp dùng API lõi hiện có và backend `api-spec.md`.
- Brief yêu cầu cảnh báo vắng hai buổi liên tiếp nhưng spec/API Q15 chưa chốt cách tính khi có buổi hủy hoặc trạng thái Có phép; chưa thêm cảnh báo để tránh suy đoán.
- Q16 yêu cầu hiển thị `sessionNumber` từ server, trong khi bảng thực thể `class_session` ở API spec mục 6.4 chưa liệt kê trường này; model iOS chỉ đọc trường nếu server gửi và không tự tính.

Status: DONE_WITH_CONCERNS
Đã thêm luồng giáo viên và test đơn vị, nhưng build/test chung chưa chạy được do lỗi compile ở gói Guardian ngoài phạm vi I-3. Chưa thể xác minh parity trên Simulator hoặc lưu ảnh; cần sửa lỗi đó, chụp ảnh, đồng thời chốt Q15 và bổ sung `sessionNumber` vào hợp đồng API.
