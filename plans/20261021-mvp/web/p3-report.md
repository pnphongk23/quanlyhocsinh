# P3 report · Prototype decisions 2026-10-22

## 1. Gỡ cấp mật khẩu phụ huynh và ép đổi mật khẩu

- Đã bỏ `features/students/parentAccount.ts` cùng test; gỡ nút, mục menu, chip/trạng thái, số liệu mật khẩu và modal khỏi `StudentsDesktop.tsx`. `StudentsPage.tsx` mobile không có hành động cấp mật khẩu.
- Tài khoản demo phụ huynh giờ là tài khoản thường với mật khẩu demo giả `guardian-demo`; bỏ `PARENT_DEMO_TEMP_PASSWORD` và cờ trạng thái khỏi kiểu/tài khoản.
- Đã gỡ `ForcedPasswordPage.tsx`, `PasswordGuard`, `FORCED_PASSWORD_PATH`, nhánh `mustChangePassword` và điều hướng bắt buộc đổi. Đổi mật khẩu cá nhân trong Cài đặt vẫn còn.
- Dữ liệu `localStorage` cũ vẫn được đọc; cờ legacy bị loại khỏi object và tài khoản demo phụ huynh cũ có cờ ép đổi được chuẩn hoá về mật khẩu demo thường. Có test hồi quy trong `data/authAccounts.test.ts`.

## 2. Câu chữ hàm ý giáo viên cấp mật khẩu

- Đã thay hướng dẫn phụ huynh trên `features/auth/LoginPage.tsx` bằng cách nói trung tính: dùng SĐT khai trong hồ sơ và mật khẩu tài khoản.
- Đã thay toàn bộ hướng dẫn quên mật khẩu bằng người vận hành đặt lại thủ công, dùng chung cho hai vai trò.
- Kết quả rà soát: không còn chuỗi UI “mật khẩu giáo viên cấp”, “giáo viên cấp lại” hoặc “nhờ giáo viên”. Các lần xuất hiện `Cấp mật khẩu`/`Cấp lại mật khẩu` còn trong `features/class-space/desktopRender.test.tsx` chỉ là assertion xác nhận HTML không render chúng; trường legacy buộc đổi chỉ được dựng trong fixture kiểm tra tương thích ở `data/authAccounts.test.ts`.

## 3. Mã đăng ký / lời mời

- Đã rà `RegisterPage`, các test, README và dữ liệu seed: prototype không có ô/logic mã đăng ký; đăng ký dùng SĐT + mật khẩu. Tìm `mã đăng ký`, `REGISTRATION_CODE`, `mã mời`, `invite code` trong prototype không có kết quả.
- `features/staff/InvitePage.tsx` và `data/repositories/staff.ts` còn luồng mời nhân sự ngoài MVP; giữ nguyên theo brief và cờ tính năng hiện tắt.

## 4. Quên mật khẩu

- Giữ bố cục và đổi câu chữ theo yêu cầu: người vận hành đặt lại thủ công, không OTP, không nhờ giáo viên. Screenshot mobile nằm trong `design/prototype-shots/p3/mobile-forgot-password.png`.

## 5. Điểm bước 0,5

- Thêm parser dùng chung nhận dấu phẩy/dấu chấm và từ chối số không phải bội 0,5; định dạng số lưu thành dấu phẩy và bỏ `,0` với số nguyên.
- `ScoreGridDesktop`, nhập điểm mobile và `data/repositories/scores.ts` đều được kiểm tra. Repository từ chối cả điểm ngoài 0..max và điểm như 7,3; max vẫn là số nguyên 1..1000 ở `TestScoresPage`, `NewTestPage`, `TestsDesktop`.
- Bổ sung/sửa test cho dấu phẩy, dấu chấm, 7,3, định dạng và kiểm tra repository.

## 6. README và 7. chuỗi iOS

- `design/prototype/README.md` liệt kê hai tài khoản demo giả, bỏ mật khẩu tạm và ghi ngắn quy tắc mới. Không dùng thông tin xác thực thật.
- Toàn bộ chuỗi mới/đổi theo từng màn, nguyên văn cũ → mới, lỗi điểm lẻ và cách định dạng nằm ở `web/p3-strings.md`.

## Ảnh và kích thước

Đã mở prototype trên trình duyệt và xem lại từng ảnh:

- `design/prototype-shots/p3/mobile-login.png` — 390×844.
- `design/prototype-shots/p3/mobile-forgot-password.png` — 390×844.
- `design/prototype-shots/p3/mobile-test-scores-half.png` — 390×844; điểm `7,5` đã lưu và hiển thị.
- `design/prototype-shots/p3/desktop-students.png` — 1360×934.
- `design/prototype-shots/p3/desktop-score-grid-half.png` — 1360×934; ô điểm hiển thị `7,5`.

Không có màn hình nào trong danh sách yêu cầu bị bỏ chụp; màn đăng ký không đổi nội dung hoặc hành vi nên không chụp riêng.

## Xác minh

- `npm test`: **55 test files, 536/536 tests đạt**.
- `npm run build`: đạt.
- `npx tsc --noEmit`: đạt (không có lỗi).
- `srcwalk discover 'mustChangePassword,ForcedPassword,TEMP_PASSWORD,Cấp mật khẩu,REGISTRATION'` trên `src` và README: code UI MVP không còn các luồng/tên này. Ngoại lệ chỉ là fixture legacy và assertion phủ định được ghi ở mục 1–2; không có mã đăng ký.
- Các ảnh được tạo bằng Vite dev, không deploy. Hai tiến trình dev dùng cho ảnh đã được dừng.

## File thay đổi trong phạm vi P3

- `design/prototype/README.md`
- `design/prototype/src/app/routes.tsx`
- `design/prototype/src/data/authAccounts.ts`, `authAccounts.test.ts`, `scoreFormat.ts`
- `design/prototype/src/data/repositories/auth.ts`, `scores.ts`, `scores.test.ts`
- `design/prototype/src/features/auth/ForgotPasswordPage.tsx`, `LoginPage.tsx`, `ForcedPasswordPage.tsx` (xoá)
- `design/prototype/src/features/class-space/desktopRender.test.tsx`
- `design/prototype/src/features/scores/ScoreGridDesktop.tsx`, `TestScoresPage.tsx`, `desktopScores.test.ts`, `testScoresPage.test.tsx`
- `design/prototype/src/features/students/StudentsDesktop.tsx`, `studentsDesktop.test.ts`, `parentAccount.ts`/`parentAccount.test.ts` (xoá)
- `plans/20261021-mvp/web/p3-strings.md`
- `plans/20261021-mvp/design/prototype-shots/p3/*.png`

## Điều chưa chắc

- Không có blocker còn lại. `localStorage` prototype là dữ liệu giả ở trình duyệt; fixture mới kiểm tra chính xác trường legacy và chuẩn hoá cho tài khoản demo phụ huynh.
