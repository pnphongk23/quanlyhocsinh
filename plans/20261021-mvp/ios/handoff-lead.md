# Bàn giao Domain Lead iOS (lead cũ 7055b53d → lead mới)

Ngày 2026-10-22. Người nhận: GL `5c0868ed`. Không chứa secret/SĐT/mật khẩu thật.

## Mục tiêu và brief
App iOS SwiftUI native đủ MVP, UI đúng prototype `design/prototype` (Quy tắc UI). Brief gốc: `briefs/50-lead-common.md`, `briefs/52-lead-ios.md`, `briefs/71-decisions-20261022.md`; brief worker: `briefs/ios-*.md` (01, 01b, 02 đến 05, 07 đến 15; `ios-ui-rule.md`, `ios-common-feature.md`, `ios-10-resume.md` về đĩa/RAM). Handback đầy đủ: `plans/20261021-mvp/ios/handback.md`.

## Trạng thái thật
- Nhánh `mvp-ios`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios` (workspace `wks_835c3a721a27f564`), HEAD `8e3d835`, cây SẠCH, chưa push/merge. Mã ở `ios/`, báo cáo gói `ios/docs/report-*.md`, review `ios/docs/review-r1.md`, `review-r2.md`, ảnh `ios/docs/screens/`, flow Maestro `ios/maestro/`.
- ĐÃ tự kiểm (lead cũ, 2026-10-21): HEAD `8e3d835` `xcodebuild … Staging … iPhone 16 … CODE_SIGNING_ALLOWED=NO build test` derivedData sạch → TEST SUCCEEDED, 109 test, 0 lỗi, 2 skip. Build Production trên `f59f7b4` OK, bundle không có `CoreFixtures.json`. `grep` không còn `try!`/`.demo(` ngoài `#if DEBUG`. GL `5c0868ed` tự chạy lại: 109 test, 2 skip.
- CHỈ theo báo cáo worker (chưa tự chạy lại): Production mở tới màn Đăng nhập không crash (I-11); chạy thật staging đăng nhập demo, danh sách lớp, điểm danh khớp `GET`, hợp đồng `/sync/push` `applied` rồi `duplicate` (I-6, `ios/docs/report-i6.md`); Maestro 3/3 (I-8A) và 12/12 (I-8C) flow; ảnh đối chiếu prototype-vs-simulator ở `ios/docs/screens/*` (một phần là render `ImageRenderer`).
- Ảnh đối chiếu cạnh nhau cho MỌI màn do lead tự chụp lại: CHƯA làm.

## Worker
- Không có worker đang chạy. Worker đáng nhớ (đầy đủ ở handback): codex luna `993221e1` (I-8A), `1e33d26f` (I-8C), `58c66ac9` (I-9), `a2c025f5` (I-10), `64339388` (I-11); pi `118c44ea` (lõi), `c0918768` (I-6), `51e47961` (I-8B). Reviewer `46746b20` (vòng 1), `fd9216d2` (vòng 2). Đã dùng đủ 2 vòng review.

## Việc còn lại (ưu tiên)
1. Áp quyết định 2026-10-22 (xem dưới): bỏ "Cấp mật khẩu", điểm số lẻ bước 0,5, kiểm màn Đăng ký không có mã.
2. Khi Backend deploy staging bản không còn `conflict`: đổi tên trạng thái sync theo `api-spec.md` mục 6 mới (nay `conflict` giải mã như `applied`), chạy thật thao tác GHI điểm danh qua hàng đợi bằng UI (chưa chạy trọn do Maestro nhiễu + đĩa), đọc phía phụ huynh. Đăng nhập demo: `/tmp/qlh-staging-demo.txt` (NGOÀI repo, không in).
3. Kiểm màn giáo viên ở cấu hình Production bằng tài khoản thật; chạy lại Production build/launch sau `8e3d835`.
4. Parity còn lệch (review-r2 MINOR): thẻ vai trò Phụ huynh không hiện tên con; sheet học sinh mobile; thẻ "Người dạy". Phụ huynh để SAU theo quyết định mới.
5. FCM: chờ `GoogleService-Info.plist`; `PushRegistrar` no-op, cách bật ở `ios/docs/report-i6.md`.
6. Hardening nhỏ: `local_json` hàng đợi chưa mã hoá at-rest; test Keychain chỉ chạy đủ trên build có ký.

## Quyết định 2026-10-22 ảnh hưởng iOS
- Bỏ "Cấp mật khẩu"/mật khẩu tạm: còn mã ở `Features/Classes/TeacherFeatureData.swift:25,180` (`temporaryPassword`) và UI "Cấp mật khẩu" trong sheet học sinh (I-3), chuỗi trong `Localizable.xcstrings`; test liên quan cần bỏ. Giáo viên chỉ đổi mật khẩu của mình (Cài đặt).
- Bỏ mã đăng ký: grep không thấy `registrationCode` trong Core/Features; kiểm lại màn Đăng ký và `AuthService`/API đăng ký không gửi mã.
- Điểm số lẻ bước 0,5: `Score.value` đã là `Double?`; `Features/Scores/ScoreRules.swift`, ô nhập và hiển thị cần cho 0,5 và kiểm 0..max (chưa kiểm hiện tại cho phép/không).
- Quên mật khẩu: vận hành đặt lại thủ công; màn "Quên mật khẩu" của iOS cần phản ánh (không OTP). Phụ huynh lấy mật khẩu lần đầu: CHỜ người dùng, chưa làm. Q15, Q16: giữ tạm; iOS hiển thị `sessionNumber` do server trả, không tự tính.
- Worker chỉ `codex/gpt-6-luna` high hoặc `pi/opencode-go/deepseek-v4.1-flash` high.

## Câu hỏi đang chờ
Lối vào Cài đặt phụ huynh (prototype 5 tab, không lối vào) và banner "Đang đồng bộ · N thay đổi" ở ảnh p2/13 lệch spec 5.3 (tạm: 5 tab, Cài đặt qua cờ debug, không banner); nút "Tải PDF về máy" của phụ huynh (tắt); phụ huynh lấy mật khẩu lần đầu; Q15, Q16.

## Lệnh tự kiểm và cạm bẫy
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-<tên> CODE_SIGNING_ALLOWED=NO build test`; Production: `-configuration Production -destination 'generic/platform=iOS Simulator'`. Xoá derivedData sau mỗi lần.
- Staging API: `https://qlh-staging-api.tolaphamnhuphong.workers.dev` (`ios/Config/Staging.xcconfig`). Maestro: `~/.maestro/bin/maestro`, flow `ios/maestro/`, tham số `STAGING_PHONE`/`STAGING_PASSWORD` truyền ngoài.
- Cạm bẫy: (a) đĩa từng đầy 3 lần do swap ~26 GB (thiếu RAM) và clone Chrome ở `$TMPDIR/../X/com.google.Chrome.code_sign_clone`; chỉ MỘT simulator iPhone 16 và MỘT worker lúc build; (b) trình biên dịch từng báo "unable to type-check" ở view dài, chia biểu thức nhỏ; (c) cây dùng chung: worker song song dẫm build của nhau, giữ ranh giới thư mục (`ios-10-resume.md`); (d) fixture `CoreFixtures.json` chỉ ở Staging, Production không có, mọi demo phải trong `#if DEBUG`; (e) codex từng chạm giới hạn hạn mức, pi deepseek từng trả 429 tạm thời; (f) test Keychain skip khi không ký.

## Kết quả worker đang chạy
Không có.
