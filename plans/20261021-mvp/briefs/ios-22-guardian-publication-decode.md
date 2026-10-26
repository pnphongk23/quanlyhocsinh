# iOS-22 · Giải mã `report_publication` từng bản, bỏ qua bản lỗi (phụ huynh)

Worker: MỘT agent (claude sonnet), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (kiểm `git status` sạch trước). Dùng `srcwalk`. Một build/một simulator một lúc (worker smoke khác chỉ chạy curl, không build). Không in SĐT/mật khẩu/token.

## Bối cảnh (đã chẩn đoán, `ios/docs/report-i18.md` mục 5)
`Features/Guardian/GuardianRepository.swift` ~419 gọi `store.records(ReportPublication.self, entity: "report_publication")`, giải mã MỌI bản phát hành trong kho. Staging còn bản số 1 cũ bất biến có `snapshot.homework[0]` = `{count, kind, level}` (thiếu `excellent, done, not_done` mà `HomeworkSummary` yêu cầu, `Core/Models/Entities.swift` ~190–198, 223–228). Một bản sai làm cả `records(...)` ném lỗi ⇒ `GuardianRepository.load()` ném ⇒ màn phụ huynh báo "Không tải được dữ liệu của con" ở mọi tab. Spec (`backend/api-spec.md` 6.4/6.6): `report_publication` chứa MỌI bản đã phát hành; client dùng bản `publication_no` lớn nhất. Quyết định của GL: giải mã từng bản, bỏ qua bản lỗi.

## Việc
1. Test ĐỎ trước: thêm test (ví dụ `QuanLyLopTests/Guardian/GuardianPublicationDecodeTests.swift`) dựng kho/ fixture có 3 publication cùng học sinh/tháng: #1 sai hình dạng (`homework:[{count,kind,level}]`), #2 và #3 đúng `{kind, excellent, done, not_done}`. Khẳng định `GuardianRepository.load` (hoặc hàm nhỏ tách ra) trả dashboard, `publications` chỉ gồm các bản giải mã được (có #3; #1 bị bỏ), và con vẫn có điểm danh/điểm như thường. Chạy test và GHI lại đầu ra ĐỎ (trước sửa) trong `report-i22.md`.
2. Sửa: giải mã từng bản ghi `report_publication` độc lập, bỏ qua bản lỗi (không ném); nếu cần thêm một biến thể "khoan dung" của `records` ở `Core/Storage` (vd `recordsSkippingInvalid` trả cả số bản bị bỏ) — giữ `records` nghiêm ngặt cho thực thể khác. Chỉ báo lỗi tải khi KHÔNG còn dữ liệu cần thiết (các thực thể khác vẫn nghiêm ngặt như cũ). Không log nội dung bản lỗi (có thể có tên/nhận xét): chỉ đếm số bản bị bỏ ở mức debug không PII. Không đổi hợp đồng, không đổi UI/chữ/bố cục phụ huynh.
3. Nếu có nơi khác giải mã `report_publication` toàn bộ (tìm bằng `srcwalk discover report_publication`, `ReportPublication`), áp cùng cách.
4. Chạy lại test: XANH. Thêm một test biên: nếu MỌI bản của một học sinh/tháng đều lỗi ⇒ màn vẫn tải, học sinh đó không có báo cáo (không crash).
5. Smoke tuỳ chọn, chỉ nếu rẻ: build Staging ký ad-hoc (`CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`, như iOS-18), đăng nhập phụ huynh demo (`~/.config/qlh/staging-demo.txt`, mục Phụ huynh, đọc ngầm, số nội địa 9 chữ số; bàn phím có thể che nút đăng nhập, xem `ios/maestro/staging/`), xác nhận màn dashboard phụ huynh TẢI ĐƯỢC với dữ liệu staging thật (bản #1 vẫn sai) và thấy tab điểm danh/báo cáo tháng mới nhất; chụp màn (xem rồi xoá, không lưu ảnh có SĐT). Không đổi dữ liệu staging. Nếu không làm được, nói rõ lý do.

## Không làm
Không sửa giao diện/chữ phụ huynh, không làm tab mới, mascot, token, đăng ký phụ huynh; không đụng backend/prototype/spec; không đổi cấu hình ký Production.

## File được sửa
`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift` (và file Guardian khác CHỈ nếu giải mã `report_publication` ở đó), `Core/Storage/*` (chỉ thêm API khoan dung nếu cần), `Core/Models/Entities.swift` (chỉ nếu cần để giải mã lỗi từng bản; không nới `HomeworkSummary` thành tuỳ chọn nếu có cách khác), test tương ứng, `ios/maestro/staging/*` (nếu thêm flow đọc), `ios/docs/report-i22.md` (mới). Ngoài danh sách → dừng, `NEEDS_CONTEXT`.

## Kiểm
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i22 CODE_SIGNING_ALLOWED=NO build test` → TEST SUCCEEDED (≥112 test + test mới); Production build (`-configuration Production -destination 'generic/platform=iOS Simulator'`) OK. Xoá `/tmp/qlh-dd-i22` sau.
- `report-i22.md`: đầu ra đỏ trước sửa, xanh sau sửa, số test, kết quả smoke (nếu làm), điểm chưa làm.
- Commit trên `mvp-ios` (conventional, tiếng Anh, không nhắc AI): `test(ios): guardian publication decode regression`, `fix(ios): decode report publications individually`, docs. KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
