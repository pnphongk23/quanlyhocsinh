# iOS-23 · Giải mã `report_publication` từng bản phía giáo viên (và mọi chỗ còn nghiêm ngặt)

Worker: MỘT agent (claude sonnet), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (HEAD `1f642af`, cây sạch: kiểm đầu tiên). Dùng `srcwalk`. Một build/một simulator một lúc. Không in SĐT/mật khẩu/token.

## Bối cảnh
iOS-22 (`25248dd`, đọc `ios/docs/report-i22.md`) đã sửa `Features/Guardian/GuardianRepository.swift` để giải mã từng bản `report_publication` và bỏ bản lỗi (staging còn bản số 1 cũ sai hình dạng `snapshot.homework` = `{count,kind,level}`). `Features/Scores/ScoresFeatureStore.swift:77` vẫn `store.records(ReportPublication.self, entity: "report_publication")` nghiêm ngặt: một bản sai làm cả `load()` rơi vào `catch` ⇒ "Không tải được dữ liệu đã lưu" ở màn Điểm/Báo cáo giáo viên.

## Việc
1. Test ĐỎ trước: thêm test cho `ScoresFeatureStore` (xem cách dựng store/fixture ở các test Scores hiện có, ví dụ `QuanLyLopTests/Scores/*`, và fixture của `GuardianPublicationDecodeTests` do iOS-22 thêm): kho có 3 publication cùng học sinh/tháng (#1 sai hình dạng, #2/#3 đúng) ⇒ `load()` phải `isReady == true`, không có `errorMessage`, `publications` chỉ gồm bản giải mã được, các dữ liệu khác (lớp, điểm…) vẫn đủ. Chạy và ghi lại đầu ra ĐỎ trong `ios/docs/report-i23.md`.
2. Sửa: dùng LẠI helper khoan dung do iOS-22 thêm (tìm tên bằng `srcwalk discover` trong `Core/Storage` hoặc Guardian; KHÔNG chép lại logic). Chỉ `report_publication` được khoan dung; các thực thể khác giữ nghiêm ngặt. Không log nội dung bản lỗi (PII): chỉ đếm.
3. Rà: `srcwalk discover 'ReportPublication'` và `report_publication` trong toàn `ios/QuanLyLop`: mọi chỗ còn `records(ReportPublication` nghiêm ngặt (Reports, Scores, Guardian, nơi khác) ⇒ sửa cùng cách, test tương ứng nếu chỗ đó có store/hàm test được. Liệt kê kết quả rà trong báo cáo (bảng: file:dòng → trước/sau).
4. Chạy lại test: XANH. Không đổi UI/chữ/hợp đồng.

## Không làm
Không sửa backend/prototype/spec; không đổi giao diện; không thêm tính năng; không smoke staging (worker khác làm sau); không đổi cấu hình ký.

## File được sửa
`ios/QuanLyLop/Features/Scores/ScoresFeatureStore.swift`, các file `Features/*` khác CHỈ khi rà thấy `records(ReportPublication` nghiêm ngặt, `Core/Storage/*` (chỉ nếu helper cần mở rộng nhỏ, không đổi hành vi hiện có), test tương ứng, `ios/docs/report-i23.md` (mới). Ngoài danh sách → dừng, `NEEDS_CONTEXT`.

## Kiểm
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i23 CODE_SIGNING_ALLOWED=NO build test` → TEST SUCCEEDED (≥114 test + test mới, 2 skip); Production build (`-configuration Production -destination 'generic/platform=iOS Simulator'`) OK. Xoá `/tmp/qlh-dd-i23` sau.
- Commit trên `mvp-ios` (conventional, tiếng Anh, không nhắc AI): `test(ios): teacher store publication decode regression`, `fix(ios): decode report publications individually in scores store`, docs. KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
