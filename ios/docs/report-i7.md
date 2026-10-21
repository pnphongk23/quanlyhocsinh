# Báo cáo iOS I-7 · Sửa build đỏ + nối upload PDF

Worktree `mvp-ios`, gói `ios/`. Brief: `briefs/ios-07-fix-build.md`, theo `briefs/ios-common-feature.md` và `briefs/ios-ui-rule.md`.

## Đã làm

- Sửa lỗi build ở `Features/Homework/SessionHomeworkView.swift` (`unable to type-check this expression in reasonable time`) và các lỗi biên dịch thật đi kèm: `ForEach` trên `HomeworkSection` (kiểu này không `Identifiable`), `confirmationDialog(_:item:)` không có trong SwiftUI (đổi sang `isPresented:` + `presenting:`), `ForEach(students)` thiếu `id`, `String.init` mơ hồ khi map `Double`.
- Chia nhỏ biểu thức SwiftUI/chuỗi/điều kiện dài ở toàn bộ `Features/**` (Scores, Homework, Comments, Reports, Guardian, Classes, Auth) thành subview/hàm nhỏ có kiểu tường minh. Không đổi cấu trúc, nhãn, màu, khoảng cách hay luồng.
- Nối upload PDF báo cáo tháng: `ReportPDFUpload` dựng `APIEndpoint.binary(method: .put, path: "reports/{id}/publications/{no}/pdf", body: pdf, contentType: "application/pdf")`, chặn > 5 MB ở tầng feature trước khi gọi mạng, nhận `EmptyResponse` (server 204). `I4FeatureStore.publish` upload ngay sau khi POST publish và báo riêng trường hợp "đã phát hành nhưng chưa tải được PDF".
- Test mới `QuanLyLopTests/Reports/ReportPDFUploadTests.swift`: hình dạng endpoint, gửi đúng một request nhị phân, biên đúng 5 MB được nhận, 5 MB + 1 byte bị từ chối mà không gọi mạng, và luồng `publish` tải đúng PDF đã render.

## Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `srcwalk guide` | Đọc hợp đồng tra cứu, dùng `srcwalk` cho phần đọc mã/ngữ cảnh. |
| `xcodebuild ... build test` (xoá `/tmp/qlh-dd-i7`, lần 1) | `** TEST SUCCEEDED **`, 43 test, 1 skip (keychain cần host app ký), 0 lỗi. |
| `rm -rf /tmp/qlh-dd-i7 && xcodebuild ... build test` (lần 2, dựng sạch) | `** TEST SUCCEEDED **`, 43 test, 1 skip (keychain cần host app ký), 0 lỗi. |
| `git diff --check` | PASS. |

Skip duy nhất là `NetworkingTests.testKeychainRoundTripUpdateAndScopedDelete`, tự bỏ qua vì `CODE_SIGNING_ALLOWED=NO` (có sẵn từ trước, không liên quan I-7).

## File sửa

- `ios/QuanLyLop/Features/Homework/SessionHomeworkView.swift`
- `ios/QuanLyLop/Features/Scores/ScoresEntryPoints.swift`
- `ios/QuanLyLop/Features/Comments/SessionCommentsView.swift`
- `ios/QuanLyLop/Features/Reports/MonthlyReportView.swift`
- `ios/QuanLyLop/Features/Reports/ReportPDFUpload.swift` (mới)
- `ios/QuanLyLop/Features/Guardian/GuardianRootView.swift`
- `ios/QuanLyLop/Features/Classes/TeacherRootView.swift`
- `ios/QuanLyLop/Features/Auth/AuthFlowView.swift`
- `ios/QuanLyLopTests/Reports/ReportPDFUploadTests.swift` (mới)

## Ghi chú

- `publish` không còn ghi file PDF tạm không ai dùng; nút "Tạo PDF trên thiết bị" và `ShareLink` giữ nguyên.
- Nút "Tải PDF về máy" của màn phụ huynh vẫn tắt: brief I-7 chỉ yêu cầu chiều upload, chiều tải về cần lead quyết định có làm trong MVP không.
- Không đổi giao diện nên không chụp lại ảnh đối chiếu prototype.

Status: DONE

Đã sửa xong lỗi biên dịch ở HEAD bằng cách chia nhỏ biểu thức và sửa các API SwiftUI dùng sai, build + test sạch hai lần với derivedData mới. Upload PDF báo cáo tháng đã nối vào `publish` với giới hạn 5 MB và có test riêng.
