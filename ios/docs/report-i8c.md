# I-8C · Đối chiếu Điểm số, Bài tập, Nhận xét và Báo cáo

Ngày: 2026-10-21 · Prototype: ảnh trong `ios/docs/screens/{scores,homework,comments,reports}/`.

## Đã làm

- Tiếp tục phần I-8C đang sửa dở trong working tree; giữ các thay đổi Scores, Homework, Comments, Reports và test có sẵn, không sửa `Core/**`.
- Hoàn thiện luồng điểm số, mẫu nhận xét cố định theo mức sao, bài tập buổi học và báo cáo tháng; không thêm UI xung đột đồng bộ hoặc chọn giá trị.
- Tăng padding dưới danh sách Điểm danh để hàng cuối nằm trên thanh tab nổi.
- Đưa Cài đặt giáo viên vào teacher shell có tab `Lớp / Lịch / Cài đặt`; ảnh chọn vai trò dùng phụ đề `Bé Gia Bảo` riêng cho demo. Dữ liệu thật vẫn theo membership.
- Thêm các flow Maestro và ảnh iPhone 16 ở các thư mục `ios/maestro/{scores,homework,comments,reports}/` và `ios/docs/screens/{scores,homework,comments,reports}/`.

## Bảng khác biệt

| Màn | Khác biệt so với prototype | Trạng thái | Lý do |
|---|---|---|---|
| Điểm số · danh sách bài | Bố cục và thao tác khớp; fixture iOS có một bài `Bài mẫu`, trong khi prototype có nhiều bài và seed cũ. | Đã đối chiếu | Chênh lệch dữ liệu demo, không phải layout. |
| Điểm số · nhập điểm | Lưới và trang chi tiết được chụp; fixture hiện chỉ có một bài và một học sinh nên ít hàng/cột hơn prototype. | Đã đối chiếu | Giữ fixture hiện có; không thêm dữ liệu giả vào nghiệp vụ. Không có UI xung đột/chọn giá trị. |
| Bài tập buổi trước / hôm nay | Hai trạng thái và điều hướng đã chụp; buổi mẫu đầu tiên chưa có bài tập buổi trước, khác seed prototype. | Đã đối chiếu | Khác dữ liệu fixture; trạng thái rỗng vẫn hiển thị đúng. |
| Nhận xét | Danh sách và phiếu nhận xét đã chụp; phiếu dùng đúng câu mẫu cố định theo mức sao trong spec. Fixture có một nhận xét đã gửi thay vì nhiều phiếu chưa gửi như prototype. | Đã đối chiếu | Khác trạng thái seed; nội dung ảnh chỉ là dữ liệu mẫu. |
| Báo cáo tháng / xem trước | Bộ chọn tháng, thẻ báo cáo và trang xem trước đã chụp; fixture có một học sinh nên phần tổng hợp ngắn hơn prototype. | Đã đối chiếu | Khác số lượng dữ liệu demo. |
| Điểm danh | Thêm `48pt` padding dưới danh sách để hàng cuối không bị thanh tab nổi che. | Đã sửa | Kiểm tra source sau thay đổi; không thay nghiệp vụ. |
| Chọn vai trò | Ảnh demo khớp phụ đề `Bé Gia Bảo`; membership thật vẫn hiện `Phụ huynh`. | Đã sửa ảnh demo; dữ liệu thật còn khác | Payload membership/identity chưa có tên con; không sửa Core hoặc gán tên trong luồng thật. Chi tiết ở `report-i8a.md`. |
| Cài đặt giáo viên | Tab `Lớp / Lịch / Cài đặt` hiện diện khi mở Cài đặt và đã chụp lại. | Đã sửa | Dùng teacher shell hiện có. Chi tiết ở `report-i8a.md`. |

## Ảnh iOS

- Điểm số: [danh sách](screens/scores/tests-ios.png), [lưới](screens/scores/grid-ios.png), [chi tiết bài](screens/scores/test-scores-detail-ios.png), [tạo bài](screens/scores/test-new-ios.png).
- Bài tập: [buổi trước](screens/homework/previous-ios.png), [hôm nay](screens/homework/today-ios.png).
- Nhận xét: [danh sách](screens/comments/list-ios.png), [phiếu nhận xét](screens/comments/ticket-sheet-ios.png).
- Báo cáo: [danh sách tháng](screens/reports/list-ios.png), [xem trước](screens/reports/preview-ios.png).
- Phần I-8A cập nhật: [chọn vai trò](screens/auth/chon-vai-tro-ios.png), [Cài đặt giáo viên](screens/auth/cai-dat-giao-vien-ios.png).

## Maestro

Simulator: iPhone 16 `CF871F97-1789-4490-B3E3-0B5EFA39F23F`, một simulator; Maestro CLI 2.2.0. Các flow dưới đây đều PASS (12/12):

| Nhóm | Flow |
|---|---|
| Điểm số | `scores/01-tests.yaml`, `02-score-grid.yaml`, `03-test-details.yaml`, `04-test-create.yaml` |
| Bài tập | `homework/01-homework.yaml`, `02-today.yaml` |
| Nhận xét | `comments/01-comments.yaml`, `02-ticket-sheet.yaml` |
| Báo cáo | `reports/01-reports.yaml`, `02-preview.yaml` |
| Đối chiếu I-8A | `auth/07-role-picker.yaml`, `09-settings-teacher.yaml` |

Ảnh chụp được lưu trong `ios/docs/screens/` như liệt kê ở trên. Dữ liệu ảnh là fixture mẫu.

## Build và test

```text
xcodebuild -quiet -scheme QuanLyLop -configuration Staging \
  -destination 'platform=iOS Simulator,id=CF871F97-1789-4490-B3E3-0B5EFA39F23F' \
  -parallel-testing-enabled NO -maximum-concurrent-test-simulator-destinations 1 \
  -derivedDataPath /tmp/qlh-dd-i8c-serial \
  -resultBundlePath /tmp/qlh-i8c-test-serial.xcresult CODE_SIGNING_ALLOWED=NO test
TEST SUCCEEDED · 104 passed · 2 skipped · 0 failures · 106 total
```

Đã xóa DerivedData và result bundle riêng sau lượt build; dung lượng trống sau dọn là 12 GB. `git diff --check` sạch.

## Còn lại

- Phụ đề vai trò thật cần tên con từ payload membership/identity; chưa thể khớp prototype mà không đổi `Core/**` hoặc gán dữ liệu giả.
- Số lượng bài, học sinh, bài tập và nhận xét trong ảnh khác prototype do fixture hiện có. Không đổi seed nghiệp vụ trong lượt này.
- Chưa kiểm chứng trên iPhone thật; đã kiểm tra simulator iPhone 16.

Status: DONE_WITH_CONCERNS
