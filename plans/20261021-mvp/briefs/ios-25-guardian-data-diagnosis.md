# iOS-25 · Chẩn đoán CHỈ ĐỌC: dữ liệu phụ huynh hiển thị lệch máy chủ

Worker: MỘT agent (codex luna high), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (HEAD `93b3228`, cây sạch: kiểm đầu tiên). Dùng `srcwalk`. Một build/một simulator iPhone 16 một lúc.

## Quy tắc cứng
- CHỈ ĐỌC dữ liệu staging (không POST/PATCH nghiệp vụ). Không sửa mã app vĩnh viễn: được thêm log tạm KHÔNG chứa PII (không SĐT, tên, nhận xét, token, mật khẩu; chỉ ID rút gọn, số đếm, mã lỗi), phải GỠ TRƯỚC khi xong; **không commit mã app** (chỉ commit `ios/docs/diagnosis-i25.md`). Kết thúc `git status` chỉ còn file docs mới trước commit; `git diff` mã phải rỗng.
- Creds: `~/.config/qlh/staging-demo.txt` (đọc ngầm, không in). **Mỗi tài khoản đăng nhập TỐI ĐA 2 lần (tính cả API và UI); khoá tạm 15 phút sau 5 lần sai.** Dùng lại token đã lấy trong cùng phiên shell cho các GET; đăng nhập UI tính là lần khác. Chỉ có thể dùng phụ huynh hai con (Bảo Nam, Minh Anh); đừng nhầm với tài khoản đa vai trò. Số nội địa 9 chữ số (bỏ tiền tố 84), bàn phím che nút "Đăng nhập" ⇒ cuộn lên (xem `ios/docs/report-i18.md`, `report-i24.md`).
- Không in/ghi SĐT, mật khẩu, token, nội dung nhận xét thật vào log/báo cáo/ảnh lưu.

## Câu hỏi cần trả lời có bằng chứng `file:dòng` (và đối chiếu số liệu máy chủ ↔ kho cục bộ ↔ giao diện)
1. **Vì sao "Đi học 0/0 buổi" và "Nhận xét mới nhất · Buổi 0" (Bảo Nam) trong khi máy chủ có điểm danh 14/10, 16/10 present?** So từng thực thể `class_session`, `attendance`, `slip`, `report_publication` giữa (a) phản hồi `GET /sync/snapshot/{entity}` + `GET /sync/pull` phụ huynh nhận (đếm số dòng, khoá, ngày; không in nội dung), (b) kho cục bộ SQLite sau đồng bộ (đếm, ngày), (c) bộ lọc hiển thị: `Features/Guardian/GuardianRepository.swift` ~428–445 (lọc buổi theo `class_id`, `session.date >= student.enrolledAt`, `leftAt`), tháng đang xem, `GuardianFormat`, cách tính "0/0" và `sessionNumber` ("Buổi 0": nhận xét có `session_id` nhưng không tìm thấy buổi trong `sessions`? hay `sessionNumber` = 0/null?). **Đặt đồng hồ simulator đúng ngày máy chủ trước** (`xcrun simctl` không đổi giờ được; thử `date` máy host nếu simulator dùng giờ máy; nếu không đổi được, ghi rõ giờ simulator vs máy chủ và dùng tham số/launch argument nếu app có; đừng sửa mã vĩnh viễn). Ghi: cửa sổ snapshot (`window.from/to`) so với ngày buổi dữ liệu.
2. **Vì sao tab Báo cáo hiện "chưa phát hành" cho cả hai con dù có publication #2/#3 (con có `publication_count=3`)?** Kiểm helper `recordsSkippingInvalid` (iOS-22) có bỏ nhầm bản #2/#3 không (đếm bản đọc được/bị bỏ cho từng con), logic chọn bản mới nhất và lọc theo tháng/`student_id`, và con nào của hai con thật sự có publication (khớp `student_id`, không giả định thứ tự).
3. **403 của `POST /auth/login` phụ huynh hai con:** ghi `error.code` (và mã HTTP), không in thân/secret. Nếu `password_change_required` ⇒ BÁO NGAY (luồng mật khẩu tạm đã bỏ theo quyết định 71) và xác nhận với UI: có vào màn đổi mật khẩu không, hay UI vẫn vào dashboard (vì sao).

## Sản phẩm
`ios/docs/diagnosis-i25.md`: với mỗi câu: kết luận, bằng chứng (đoạn log đã ẩn PII, đếm thực thể máy chủ vs kho vs UI, `file:dòng`), phân loại nguyên nhân **lỗi client / dữ liệu staging / ngày giờ (simulator vs máy chủ)**, đề xuất sửa (không làm). Nêu rõ điều chưa xác định được và vì sao. Ghi số lần đăng nhập mỗi tài khoản. Xoá ảnh/artifact có PII, erase + shutdown simulator, xoá `/tmp/qlh-dd-i25`. Commit chỉ `ios/docs/diagnosis-i25.md`: `docs(ios): guardian data diagnosis` (conventional, tiếng Anh, không nhắc AI). KHÔNG push/merge/stash/reset.

Build: `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i25 CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual build` (ký ad-hoc để Keychain hoạt động).

Ghi nhận, KHÔNG sửa: tab/Cài đặt/Đăng xuất phụ huynh, định dạng 7,5 ở màn phụ huynh, tiêu đề "6A" đè giờ ở màn Điểm giáo viên.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
