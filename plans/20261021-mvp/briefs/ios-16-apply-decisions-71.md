# iOS-16 · Áp quyết định 71 cho iOS

Worker: MỘT agent, workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (HEAD `8e3d835`, cây sạch). Mã ở `ios/`. Dùng `srcwalk` (`srcwalk discover <q> --scope ios`, `srcwalk show <path>:<a>-<b>`) thay rg/grep/cat.

Đọc trước: `plans/20261021-mvp/briefs/71-decisions-20261022.md`, `AGENTS.md`, `docs/spec.md` mục tài khoản/điểm, `ios/docs/storage-proposal.md` nếu cần. Quy tắc UI: prototype `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype/src` là nguồn chuẩn (CHỈ ĐỌC, không sửa; mảng Web đang sửa song song, cây chính có thay đổi chưa commit, đọc bản làm việc).

## Việc (4 mục)

1. **Bỏ "Cấp mật khẩu"/mật khẩu tạm.**
   - Xoá `temporaryPassword` ở `Features/Classes/TeacherFeatureData.swift` (dòng ~25, ~180) và mọi hàm/trạng thái/luồng cấp mật khẩu liên quan.
   - Xoá mục "Cấp mật khẩu" và UI mật khẩu tạm hiện một lần trong sheet học sinh (giữ "Sửa số điện thoại", "Đánh dấu nghỉ" như hiện tại).
   - Xoá chuỗi "Cấp mật khẩu" (và chuỗi liên quan chỉ dùng cho luồng này) trong `Resources/Localizable.xcstrings`; xoá/sửa test, flow Maestro (`ios/maestro/`) nhắc tới nó.
   - Nếu `Core/Networking` có endpoint/mô hình cấp mật khẩu tạm cho phụ huynh: gỡ nốt (kiểm `backend/api-spec.md` mục 10 chỉ để biết, không sửa backend). Giáo viên chỉ đổi mật khẩu của chính mình (Cài đặt) — giữ nguyên.
2. **Màn Đăng ký giáo viên không có mã đăng ký.** Kiểm màn Đăng ký, `AuthService`, request đăng ký: không có trường, chuỗi, tham số, field JSON nào về mã/lời mời (`registrationCode`, "mã đăng ký", `inviteCode`…). Báo kết quả kiểm bằng lệnh discover; nếu có thì gỡ.
3. **Điểm số lẻ bước 0,5, trong 0..max của bài.**
   - `Features/Scores/ScoreRules.swift` (+ `TestsTabView.swift:~483` `inputText`): chấp nhận `7,5` và `7.5` (dấu phẩy là chuẩn hiển thị VN); cho phép bước 0,5 trong [0, max]; từ chối 7,3 / 7,25 / âm / > max / không phải số. Điểm max của bài (mặc định 15) vẫn do bài quyết định.
   - Ô nhập (bàn phím thập phân), lưu `Double`, hiển thị `7,5` (không `7.5`, không `7,50`); số nguyên hiển thị `8` không `8,0`. Kiểm mọi chỗ hiển thị điểm (giáo viên; không đụng màn phụ huynh nhưng nếu dùng chung formatter thì dùng chung).
   - Thêm/sửa test đơn vị trong `QuanLyLopTests/Scores/ScoreRulesTests.swift`: hợp lệ `0, 0,5, 7,5, 7.5, 15`; không hợp lệ `7,3, 7,25, 15,5, -0,5, abc`; định dạng hiển thị.
4. **Màn Quên mật khẩu** (`Features/Auth/AuthScreens.swift` ~159). Bản đầu: người vận hành đặt lại thủ công, không OTP. Đọc `ForgotPasswordPage.tsx` của prototype: nếu prototype ĐÃ có chữ nói rõ người vận hành đặt lại thì copy từng ký tự vào iOS (kể cả `Localizable.xcstrings`). Nếu prototype CHƯA có chữ mới thì KHÔNG tự viết chữ: để `// TODO(prototype copy)` tại chỗ + giữ chữ hiện tại, và ghi rõ trong báo cáo là chờ chữ từ Web. Không thêm OTP/gửi mã/endpoint.

## KHÔNG làm
- Không đụng màn phụ huynh (`Features/Guardian`), không làm luồng mật khẩu lần đầu của phụ huynh, không làm sync/hàng đợi (`conflict`→tên mới) — chờ.
- Không sửa `docs/spec.md`, `docs/architecture.md`, backend, prototype.
- Không thêm tính năng ngoài 4 mục. Không in SĐT/mật khẩu/token thật.

## File được sửa
`ios/QuanLyLop/Features/Classes/*`, `Features/Scores/*`, `Features/Auth/*` (chỉ phần cần), `Resources/Localizable.xcstrings`, `Core/Networking/*` (chỉ gỡ cấp mật khẩu nếu có), `ios/QuanLyLopTests/*` tương ứng, `ios/maestro/*` (chỉ chỗ nhắc mục đã gỡ), `ios/docs/report-i16.md` (mới). Cần sửa file ngoài danh sách → dừng, báo `NEEDS_CONTEXT`.

## Tiêu chí xong và lệnh kiểm
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i16 CODE_SIGNING_ALLOWED=NO build test` → TEST SUCCEEDED; số test (trước: 109, 2 skip) ≥ cũ trừ test đã gỡ + test mới; không cảnh báo Swift mới. Xoá `/tmp/qlh-dd-i16` sau khi chạy (đĩa từng đầy). Chỉ MỘT simulator/MỘT build một lúc.
- Production build vẫn OK: `-configuration Production -destination 'generic/platform=iOS Simulator'` (build, không cần test).
- `srcwalk discover` cho `temporaryPassword`, `Cấp mật khẩu`, `registrationCode`, `mã đăng ký` trong `ios/QuanLyLop`, `ios/QuanLyLopTests`, `ios/maestro` → không còn kết quả (báo tài liệu `ios/docs/report-*.md` cũ giữ nguyên là lịch sử).
- Commit trên `mvp-ios` (tiếng Anh, conventional, không nhắc AI), tách hợp lý (vd. `refactor(ios): drop temporary password flow`, `feat(ios): half-point scores`, `docs/fix` cho forgot-password). KHÔNG push, KHÔNG merge, KHÔNG stash/reset.
- Viết `ios/docs/report-i16.md`: từng mục làm gì, bằng chứng lệnh (đuôi output test, discover), việc để TODO.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
