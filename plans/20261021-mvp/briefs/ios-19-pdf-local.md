# iOS-19 · PDF tạo trên máy, bỏ tải lên/tải về máy chủ

Worker: MỘT agent (codex luna high), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (HEAD `38205b1` hoặc mới hơn, cây sạch: kiểm đầu tiên). Dùng `srcwalk`. Một build/một simulator iPhone 16 một lúc.

Đọc: `plans/20261021-mvp/briefs/74-decisions-20261022-b.md` mục 5 (đã chốt): KHÔNG lưu PDF trên máy chủ; báo cáo xem trong app từ bản chụp dữ liệu lưu khi phát hành; nút "Tải PDF / ảnh" tạo file NGAY TRÊN MÁY khi người dùng bấm (để gửi Zalo, in) và mở bảng chia sẻ; backend bỏ endpoint `PUT/GET /reports/{id}/publications/{no}/pdf` và binding R2. Quy tắc UI: prototype `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype/src` là nguồn chuẩn cho chữ/nhãn nút (đọc nút "Tải PDF" ở màn Báo cáo giáo viên và phụ huynh; copy chữ y hệt; không tự đặt). Cây chính prototype có thay đổi chưa commit của mảng Web, đọc bản làm việc, KHÔNG sửa.

## Việc

1. **Gỡ tải lên.** Xoá `Features/Reports/ReportPDFUpload.swift`, test `QuanLyLopTests/Reports/ReportPDFUploadTests.swift`, lời gọi `ReportPDFUpload.upload` ở `Features/Scores/ScoresFeatureStore.swift` (~442–455; "Publishes the month … and uploads the PDF" → chỉ gọi `POST …/publish`), chuỗi `feature.reports.a.phat.hanh.bao.cao.nhung.chua.tai.uoc.pdf.len.m` và nhánh báo lỗi liên quan trong `MonthlyReportView.swift` (~639). Phát hành KHÔNG còn phụ thuộc PDF: không render/tải PDF trước/sau phát hành.
2. **Gỡ tải về.** Xoá phần tải PDF từ máy chủ ở `Features/Guardian/GuardianReportPDF.swift` (request `GET reports/{id}/publications/{no}/pdf`, `GuardianPDFError` mạng, chuỗi `bao.cao.chua.co.tep.pdf`, `khong.tai.uoc.pdf`, `ang.tai.pdf`), test `QuanLyLopTests/Guardian/GuardianPDFTests.swift` phần tải; `APIEndpoint.binary` + các test `NetworkingTests` về body nhị phân CHỈ nếu không còn nơi nào dùng (kiểm bằng `srcwalk trace callers`); nếu còn dùng thì giữ.
3. **Tạo PDF cục bộ + chia sẻ.**
   - Giáo viên: `MonthlyReportView.swift` hiện có renderer UIKit cục bộ (`~678`) và bảng in `I4PrintPresenter` (`~650–672`). Nút "Tải PDF" (chữ theo prototype) tạo file `bao-cao-thang-<tháng>-<số>.pdf` hoặc tên khớp prototype trong thư mục tạm, rồi mở bảng chia sẻ `UIActivityViewController` (gồm "Lưu vào Tệp", in, Zalo/AirDrop…). Xoá file tạm sau khi bảng đóng. Không gọi mạng.
   - Phụ huynh (`GuardianReportPDF.swift` nút "Tải PDF về máy", ~107–140): tạo PDF cục bộ từ bản chụp báo cáo (`ReportPublication.snapshot` bản `publication_no` lớn nhất đang hiển thị, đã có trong kho cục bộ) bằng cùng renderer của giáo viên nếu dùng chung được dữ liệu; mở cùng bảng chia sẻ. Handoff cũ ghi nút này đang TẮT vì chưa duyệt: giữ trạng thái bật/tắt hiện tại nếu prototype hiện hành không nói khác; chỉ đổi nguồn dữ liệu và loại đường mạng. KHÔNG sửa bố cục/giao diện phụ huynh ngoài nút này; nếu renderer không dùng chung được mà không đổi UI phụ huynh, để nút tắt như hiện tại, bỏ code mạng, ghi rõ trong báo cáo.
   - Xuất ảnh ("PDF / ảnh") chỉ làm nếu prototype có nút ảnh rõ ràng; không có thì bỏ qua và ghi chú.
4. Sửa comment/tài liệu hiện hành (`ios/README.md`, `ios/docs/*` đang mô tả hành vi, không động báo cáo lịch sử `report-*`), `docs` ngoài `ios/` KHÔNG sửa (GL sửa).
5. Test: unit test sinh PDF cục bộ trả `Data` hợp lệ (header `%PDF-`, không rỗng) từ snapshot mẫu; test phát hành không gọi endpoint PDF (stub APIClient ghi lại requests, kiểm chỉ có `…/publish`); test tên file/đường tạm; xoá test đã chết. Không còn `publications/{no}/pdf` trong mã.

## Không làm
Không đụng backend, spec/architecture, prototype; không sửa luồng sync, mật khẩu, màn phụ huynh khác (bug decode `report_publication` bản cũ để riêng, ưu tiên sau); không làm đăng ký phụ huynh/mascot.

## File được sửa
`ios/QuanLyLop/Features/Reports/*`, `Features/Scores/ScoresFeatureStore.swift` (chỉ đoạn publish), `Features/Guardian/GuardianReportPDF.swift` (chỉ phần PDF), `Core/Networking/APIClient.swift` (chỉ `binary` nếu hết dùng), `Resources/Localizable.xcstrings` (chỉ chuỗi PDF), test tương ứng, `ios/maestro/*` nếu nhắc đến PDF, `ios/README.md`, `ios/docs/report-i19.md` (mới). Ngoài danh sách → dừng, `NEEDS_CONTEXT`.

## Tiêu chí xong
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i19 CODE_SIGNING_ALLOWED=NO build test` → TEST SUCCEEDED, không cảnh báo Swift mới; Production build OK (`-configuration Production -destination 'generic/platform=iOS Simulator'`). Xoá `/tmp/qlh-dd-i19` sau đó.
- `srcwalk discover 'publications' --scope ios/QuanLyLop` không còn đường `/pdf`; `ReportPDFUpload` không còn tham chiếu.
- Nếu rẻ: chạy simulator mở màn Báo cáo (fixture/demo Staging debug, không cần đăng nhập staging) bấm "Tải PDF", thấy bảng chia sẻ, chụp màn (không SĐT thật); không đụng dữ liệu staging.
- `ios/docs/report-i19.md`: việc làm, bằng chứng lệnh (số test), điểm không làm được + lý do.
- Commit trên `mvp-ios` (conventional, tiếng Anh, không nhắc AI), vd `refactor(ios): drop report pdf upload and download`, `feat(ios): share locally rendered report pdf`. KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
