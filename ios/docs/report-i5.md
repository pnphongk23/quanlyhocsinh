# iOS I-5 · Phụ huynh

## Đã làm

- Thay `GuardianRootView()` bằng giao diện phụ huynh có tổng quan, điểm danh theo tháng, điểm từng bài, phiếu buổi học/BTVN, báo cáo phát hành và chọn giữa các con.
- Đọc dữ liệu từ membership đang hoạt động có `scopeKind == linkedStudents`, sau đó chỉ ghép attendance, score, slip, homework grade và report theo ID của từng học sinh liên kết. Không hiển thị điểm trung bình hoặc trạng thái “Vắng thi”. Phiếu nháp bị ẩn; kết quả BTVN chỉ hiện khi phiếu của buổi chấm đã gửi.
- Thêm unit tests cho quyền xem phiếu/điểm, phiếu nháp, bài kiểm tra lưu trữ và chọn báo cáo phát hành mới nhất.
- Ảnh prototype ở 390×844: `screens/guardian/prototype-overview-390x844.png`, `prototype-attendance-390x844.png`, `prototype-scores-390x844.png`, `prototype-comments-390x844.png`, `prototype-reports-390x844.png`.

## Lệnh và kiểm chứng

- `xcodegen generate`: thành công.
- `xcodebuild -project QuanLyLop.xcodeproj -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-guardian CODE_SIGNING_ALLOWED=NO build test`: thất bại ở `Features/Homework/SessionHomeworkView.swift:23` do compiler không type-check được expression; lỗi nằm ngoài phạm vi I-5. Các lỗi compile đã lộ ra ở file Guardian trong các lượt đầu đã được sửa; lượt cuối không báo lỗi Guardian.
- Do lỗi compile ngoài phạm vi, build/test toàn app chưa hoàn tất; unit tests chưa chạy và chưa chụp được ảnh simulator native. Ảnh hiện có là ảnh prototype, không phải ảnh app native.

## Khác biệt với prototype

| Màn | Khác gì | Đã sửa/chưa | Lý do |
|---|---|---|---|
| Tổng quan | Bố cục dùng thẻ native; không có số liệu demo khi chưa đăng nhập. | Đã làm theo dữ liệu cache/API; chưa đối chiếu runtime native. | Tuân theo dữ liệu thật qua core và không đưa fixture vào app. |
| Điểm danh | Hiển thị nhãn ngày dạng `dd/mm`; prototype ghi thứ trong tuần và ngày/tháng. | Chưa | Chờ xác nhận định dạng ngày chuẩn; cần đối chiếu native sau khi build. |
| Điểm số | Danh sách điểm theo bài, gồm trạng thái chưa có điểm; không có trung bình. | Đã làm; chưa đối chiếu runtime native. | Theo phạm vi I-5 và quy tắc cấm điểm trung bình. |
| Nhận xét/BTVN | Dùng sheet chi tiết phiếu; BTVN gắn với phiếu buổi chấm đã gửi. | Đã làm theo quy tắc nghiệp vụ; chưa đối chiếu runtime native. | Không để lộ phiếu nháp hoặc điểm BTVN trước khi gửi phiếu. |
| Báo cáo | Tóm tắt publication; nút PDF hiện chỉ có nhãn/hint, chưa tải tệp. | Chưa | `APIClient` hiện chỉ giải mã JSON; endpoint PDF trả bytes. Không đi vòng qua API lõi. |

## Câu hỏi

1. Báo cáo phụ huynh có cần tải PDF ngay trong MVP không? Endpoint trả PDF bytes nhưng core `APIClient` chưa có API tải binary; cần lead quyết định mở rộng core hay hoãn nút tải.
2. Prototype có cảnh báo báo cáo cần phát hành lại; dữ liệu parent snapshot và `ReportPublication` hiện không có cờ `needsRepublish`. Lead xác nhận có cần bổ sung schema/API cho cảnh báo này không.
3. Offline plan yêu cầu hiển thị thời điểm cập nhật cache; `SyncCoordinator`/`LocalStore` hiện chưa cung cấp server timestamp phù hợp cho màn phụ huynh. Lead xác nhận có cần thêm metadata ở core không.
4. `StubAPIClient.demo` chỉ cung cấp snapshot/pull, chưa có phản hồi `/me` hay membership phụ huynh để dựng scope liên kết an toàn. Cần bộ fixture parent riêng hoặc điểm inject dashboard cho preview để xem UI mà không dùng credential thật.
