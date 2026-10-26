# iOS-29 · Bỏ `sessionNumber ?? 0`: số nil thì không hiện "Buổi N"

Worker: MỘT agent (claude sonnet), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (kiểm `git status` sạch và `git log` đã có commit iOS-28 trước khi bắt đầu). Dùng `srcwalk`. Một build/một simulator một lúc. Không in SĐT/mật khẩu/token.

Đọc: `ios/docs/report-i26.md` (số buổi tính trên máy: buổi chưa hủy luôn có số; buổi hủy `sessionNumber == nil`), spec chuẩn ở thư mục CHÍNH `/Users/phamnhuphong/Git/quanlyhocsinh/docs/spec.md` (dòng ~37; bản trong worktree là bản cũ, luôn đọc docs ở thư mục chính), prototype `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype/src` (cách `sessionPrefix` hiển thị buổi không số: `sessions.ts:118-120`: buổi hủy ⇒ "Buổi bù" nếu `makeup`, ngược lại "Buổi học").

## Việc
1. Tìm mọi chỗ còn `sessionNumber ?? 0` hoặc chuỗi "Buổi %@" với số mặc định 0 (`srcwalk discover 'sessionNumber ?? 0'`, `Features/Comments/SessionCommentsView.swift` ~91, 190, 238, 459; `Features/Guardian/GuardianRepository.swift` ~313 và nơi hiển thị nhận xét/BTVN; `Features/Classes/TeacherFeatureData.swift` ~295; `Features/Homework/*`, `Features/Reports/*`).
2. Quy tắc: số `nil` (buổi hủy) KHÔNG hiện "Buổi N". Hiện nhãn thay thế theo prototype (`sessionPrefix`: "Buổi bù" nếu buổi bù, ngược lại "Buổi học") hoặc ngày buổi nếu chỗ đó là nhãn dòng/tiêu đề cần phân biệt (GL: "hiện ngày buổi thay thế"); chọn theo cách prototype hiển thị tại CHỖ ĐÓ (đọc prototype từng màn); copy chữ y hệt, không tự sáng tạo. Một helper nhỏ dùng chung (vd `SessionLabel.title(for:)`) thay vì sửa rải rác. Chuỗi có tham số số buổi phải dùng nhánh có số khi `sessionNumber != nil`, nhánh không số khi nil.
3. Test ĐỎ→XANH: buổi có số ⇒ "Buổi N"; buổi hủy/không số ⇒ không chứa "Buổi 0", đúng nhãn thay thế; buổi bù không số ⇒ "Buổi bù"; các câu hỏi/thông báo có số buổi (vd "Phiếu của buổi X chỉ gồm…", "gửi phiếu buổi X") không bao giờ ra "0" cho buổi nil. Ghi đầu ra ĐỎ trước sửa vào `ios/docs/report-i29.md`.
4. Không đổi bố cục, màu, chữ ngoài các nhãn trên; không sửa số buổi (đã đúng), không đụng định dạng điểm, tab phụ huynh, "6A" đè giờ.

## File được sửa
`ios/QuanLyLop/Features/{Comments,Guardian,Classes,Homework,Reports,Scores}/*` (chỉ chỗ số buổi), helper nhỏ trong `Core/Models/*`, `Resources/Localizable.xcstrings` (chỉ nếu cần nhánh chuỗi không số, chữ theo prototype), test tương ứng, `ios/docs/report-i29.md` (mới). Ngoài danh sách → dừng, `NEEDS_CONTEXT`.

## Kiểm
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i29 CODE_SIGNING_ALLOWED=NO build test` → TEST SUCCEEDED (≥127 test + mới); Production build OK; xoá `/tmp/qlh-dd-i29` sau.
- `srcwalk discover 'sessionNumber ?? 0'` trong `QuanLyLop` = 0 kết quả.
- Commit trên `mvp-ios` (conventional, tiếng Anh, không nhắc AI): `test(ios): session label without number`, `fix(ios): omit session number label for cancelled sessions`, docs. KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
