# iOS-19 · PDF cục bộ

## Việc làm

- Phát hành báo cáo chỉ gọi `POST …/publish`; không render hoặc truyền PDF trong luồng phát hành.
- Giáo viên giữ nhãn prototype “In báo cáo”; thao tác tạo PDF từ snapshot hiện có, ghi file tạm và mở `UIActivityViewController` để in, lưu hoặc chia sẻ.
- Phụ huynh giữ “Tải PDF về máy”; PDF được render từ `ReportPublication.snapshot` đã lưu cục bộ, không gọi máy chủ.
- File tạm có tên `bao-cao-thang-<tháng>-<số>.pdf` và bị xoá khi bảng chia sẻ đóng.
- Gỡ downloader/uploader PDF qua mạng, endpoint `APIEndpoint.binary` không còn caller, và các test tải lên/tải xuống đã chết. Thêm test cho PDF từ snapshot, đường dẫn file tạm và request phát hành.
- Không thêm xuất ảnh vì prototype không có nút ảnh rõ ràng.
- Cập nhật `README.md` và `docs/core-api.md` về hành vi PDF hiện hành.

## Kiểm chứng

- `xcodegen generate` — thành công.
- `xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i19 CODE_SIGNING_ALLOWED=NO build test` — TEST SUCCEEDED; 105 test, 0 lỗi, 2 test skip.
- `xcodebuild -scheme QuanLyLop -configuration Production -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/qlh-dd-i19 CODE_SIGNING_ALLOWED=NO build` — BUILD SUCCEEDED.
- Build Staging có 0 cảnh báo Swift mới.
- `srcwalk discover 'publications/{no}/pdf' --as text --scope ios/QuanLyLop` và cùng truy vấn trong `ios/QuanLyLopTests` — không còn match.
- `python3 -m json.tool ios/QuanLyLop/Resources/Localizable.xcstrings` và `git diff --check` — thành công.

## Chưa kiểm chứng được

- Chưa mở bảng chia sẻ trên iPhone Simulator; unit test xác nhận dữ liệu PDF có header `%PDF-`, file tạm và request phát hành không gọi endpoint PDF.
- Chưa thử In, Lưu vào Tệp, Zalo hoặc AirDrop trên thiết bị iOS.

## Câu hỏi

- Decision 74 ghi “Tải PDF / ảnh”, trong khi prototype giáo viên hiện hành ghi “In báo cáo”. Theo lead, iOS giữ nhãn “In báo cáo”; GL cần xử lý chênh lệch này với Web/Design.
