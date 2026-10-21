# Báo cáo iOS I-4 · Giáo viên B

Worktree `mvp-ios`, gói `ios/`. Brief: `ios-04-teacher-b.md` và `ios-common-feature.md`.

## Đã làm

- Thay placeholder điểm bằng màn danh sách/tạo/sửa/lưu trữ bài kiểm tra và bảng nhập điểm từng học sinh. Điểm tối đa mặc định 15, kiểm tra 1..1000 và không cho hạ dưới điểm cao nhất đã nhập; không có điểm trung bình hoặc trạng thái “Vắng thi”.
- Thêm giao/sửa/xoá phần BTVN theo 4 loại, chấm từng học sinh bằng ba mức, giữ ô chưa chấm rỗng và chặn xoá phần đã có điểm.
- Thêm danh sách nhận xét theo buổi, bộ lọc, sheet chọn sao/câu mẫu cố định/ghi chú, xác nhận gửi phiếu cả lớp và nhắc số phần BTVN chưa chấm.
- Thêm xem trước báo cáo tháng, lưu nháp/phát hành qua endpoint theo hợp đồng, tạo PDF bằng `UIGraphicsPDFRenderer`; có thể chia sẻ PDF được lưu trên thiết bị.
- Mọi thao tác offline của điểm, bài kiểm tra, phiếu và BTVN ghi bản cục bộ cùng outbox qua `LocalStore`; màn dùng fixture `StubAPIClient.demo` khi preview, và lấy `SQLiteStore`/API đã đăng nhập từ `AuthModel` khi chạy trong app.

## Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `srcwalk guide` | Đã đọc hướng dẫn và dùng `srcwalk` để đọc spec, architecture, brief, API và prototype. |
| `swiftc -frontend -parse ios/QuanLyLop/Features/Scores/ScoresEntryPoints.swift ios/QuanLyLop/Features/Homework/SessionHomeworkView.swift ios/QuanLyLop/Features/Comments/SessionCommentsView.swift ios/QuanLyLop/Features/Reports/MonthlyReportView.swift` | PASS cú pháp trước lần nối AuthModel cuối. |
| `cd ios && xcodegen generate` | PASS. |
| `cd ios && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i4 CODE_SIGNING_ALLOWED=NO build test` | FAIL ở mã ngoài phạm vi I-4: `GuardianRepository.swift:161` type-check timeout và `GuardianRootView.swift` thiếu `GuardianFormat` (nhiều vị trí). Xcode đã biên dịch các file I-4 và `I4FeatureTests.swift` trong lượt này; test runner bị hủy do lỗi build. |
| `git diff --check` | PASS tại thời điểm kiểm tra. |

## Khác biệt với prototype

| Màn | Khác gì | Đã sửa/chưa | Lý do |
|---|---|---|---|
| Bài kiểm tra / Bảng điểm | Bố cục SwiftUI gọn, chưa đối chiếu ảnh 390×844 với prototype | Chưa | Build app bị lỗi ở `Guardian*` ngoài phạm vi I-4; chưa chạy được màn trên simulator. |
| Nhận xét / BTVN | Dùng sheet/segmented/button iOS theo design system; chưa đối chiếu ảnh 390×844 | Chưa | Chưa chạy được app trên simulator. |
| Báo cáo tháng / PDF | Dùng PDF renderer UIKit với bố cục dọc cơ bản; chưa đối chiếu bố cục prototype và chưa chụp ảnh | Chưa | Chưa chạy được app trên simulator. |

## Câu hỏi / việc cần lead xử lý

1. `APIClient` chỉ gửi body với `Content-Type: application/json`, trong khi API PDF yêu cầu `application/pdf`. I-4 không được sửa `Core/**`; cần bổ sung API gửi binary để tải PDF lên R2. Hiện phát hành báo cáo và tạo PDF trên máy là hai thao tác riêng; màn báo rõ PDF chưa được tải lên máy chủ.
2. Cần sửa lỗi build ở `Features/Guardian/GuardianRepository.swift` và `Features/Guardian/GuardianRootView.swift`, sau đó chạy lại build/test toàn bộ, mở các màn I-4 trên iPhone 16 Simulator, chụp ảnh đối chiếu với prototype vào `ios/docs/screens/{scores,homework,comments,reports}/`, và cập nhật bảng khác biệt đến khi không còn lệch nhìn thấy.
3. Báo cáo tổng hợp phía server chỉ cung cấp theo tháng ở MVP; tuỳ chọn ba tháng chưa được thêm.

Status: DONE_WITH_CONCERNS
