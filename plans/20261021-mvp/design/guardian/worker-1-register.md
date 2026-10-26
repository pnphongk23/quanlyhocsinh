# Worker 1 · Phụ huynh tự đăng ký + liên kết con + "chưa có con" (prototype)

Thư mục làm việc: `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype` (cây làm việc chính, đã có nhiều thay đổi chưa commit của lead khác: KHÔNG `git checkout/stash/reset/clean`, KHÔNG commit). Đọc trước: `docs/spec.md` (mục 4 "Tài khoản", 5.2, dòng 112-115), `plans/20261021-mvp/briefs/71-decisions-20261022.md`, `74-decisions-20261022-b.md`, `plans/20261021-mvp/design/guardian/inventory.md`, ảnh tham chiếu `design/auth-r4/04-mobile-tk-dang-ky-giao-vien.png`, `17-web-tk-dang-ky-giao-vien.png`, `07-mobile-tk-quen-mat-khau-phu-huynh.png`, `11-mobile-tk-cai-dat-phu-huynh.png`. Dùng `srcwalk` thay grep/cat.

## Quyết định đã chốt (không đổi)
- Phụ huynh tự đăng ký bằng SĐT + mật khẩu tự đặt (≥ 8 ký tự, nhập lại), một lần, không mật khẩu tạm, không đổi bắt buộc lần đầu, không OTP/SMS. Giáo viên không quản lý mật khẩu của ai.
- Tự liên kết mọi học sinh có `Student.parentPhone` trùng SĐT đăng ký (so sánh sau `normalizePhone`), kể cả khi giáo viên khai/sửa SĐT SAU khi phụ huynh đã đăng ký. SĐT chưa khớp hồ sơ nào: vẫn tạo được tài khoản; app báo chưa có con nào được liên kết.
- Một màn đăng ký chung `/dang-ky`, thêm lựa chọn vai trò "Giáo viên | Phụ huynh" (segmented, mặc định Giáo viên). Phụ huynh: ô Tên hiển thị, SĐT (+84), Mật khẩu, Nhập lại mật khẩu; KHÔNG có "Tên không gian làm việc", không dòng "quản trị viên đầu tiên". Giáo viên giữ nguyên như hiện tại.
- Dùng đúng hệ thống hiện có: token, component trong `features/auth/authUi.tsx` và class `auth.module.css`, giọng chữ như màn Tài khoản đã duyệt (ngắn, tiếng Việt, xưng "bạn"). Không kiểu mới, không thư viện mới.

## Việc
1. Dữ liệu: đăng ký phụ huynh tạo `LocalAccount` + `Member` (roleId = vai trò phụ huynh mặc định, `studentIds` tính theo SĐT, `status: "active"`, `classIds: []`) và đăng nhập luôn vào `/ph`. SĐT đã có tài khoản thì báo lỗi rõ ("Số điện thoại đã có tài khoản. Hãy đăng nhập."), áp cho cả giáo viên. Hàm mới trong `src/data/repositories/auth.ts` (ví dụ `registerGuardian`), hàm tính liên kết dùng chung nằm trong `src/data/repositories/guardian.ts` hoặc `students.ts`.
2. Liên kết động: khi `updateStudentPhone` (và chỗ thêm học sinh nếu có `parentPhone`) lưu SĐT mới, tự thêm học sinh vào `studentIds` của mọi member phụ huynh có SĐT khớp, và gỡ khỏi member không còn khớp. Không làm lộ dữ liệu con khác.
3. Màn "chưa có con nào được liên kết" (`ChildEmpty` trong các trang `src/roles/guardian/*`): tiêu đề "Chưa có con nào được liên kết", nội dung nói rõ SĐT của bạn chưa khớp hồ sơ học sinh nào, nhờ cô/giáo viên nhập đúng SĐT này vào hồ sơ con, sẽ tự hiện; hiện SĐT đang đăng nhập (dạng +84 …, không in vào log). Vẫn truy cập được Cài đặt/Đăng xuất. Mascot: chỉ dùng `<Mascot pose=... />` hiện có nếu hợp (API do lead Mascot giữ), không sửa file Mascot.
4. Cài đặt phụ huynh: tên, SĐT chỉ đọc; Đổi mật khẩu; Đăng xuất; tóm tắt con ("Phụ huynh · <tên con> (<lớp>)") và trường hợp chưa có con ("Chưa liên kết con"). Chỉ sửa phần phụ huynh trong `SettingsPage.tsx`.
5. Bỏ dấu vết mật khẩu tạm: xoá đoạn migrate cờ "must"+"ChangePassword" trong `authAccounts.ts`; kiểm tra lại `git grep -n -i "mật khẩu tạm\|cấp mật khẩu\|tạm thời" -- src` để không còn chữ nào nhắc.
6. Chuỗi chữ mới: ghi vào `plans/20261021-mvp/design/guardian/strings.md` (bảng: màn · khoá/vị trí · chữ), cho iOS và web dùng lại.

## File được sửa
`src/features/auth/RegisterPage.tsx`, `src/features/auth/authUi.tsx` (chỉ thêm), CSS mới `src/features/auth/registerGuardian.module.css` và `src/roles/guardian/guardianEmpty.module.css`, `src/data/authAccounts.ts` (+ test), `src/data/repositories/auth.ts`, `students.ts`, `guardian.ts` (+ test), `src/roles/guardian/guardianContext.tsx`, `GuardianOverviewPage/AttendancePage/ScoresPage/HomeworkPage/ReportPage.tsx` (chỉ nhánh "chưa có con"), `src/features/settings/SettingsPage.tsx` (phần phụ huynh), test liên quan, file strings.md. CẤM sửa: `shared/ui/*`, `guardian.module.css`, `GuardianCommentsPage`, `GuardianTicketPage`, `LoginPage`, `RolePickerPage`, `auth.module.css` (lead Mascot đang sửa), `docs/`, iOS, mvp-web, backend. Nếu bắt buộc sửa file cấm: dừng, báo BLOCKED_NEEDS_LEAD.

## Nghiệm thu
- Test mới: đăng ký phụ huynh (SĐT khớp 1 con / 2 con / không khớp), SĐT trùng bị từ chối, khai SĐT sau thì liên kết, đổi SĐT thì gỡ liên kết, phụ huynh không thấy con khác, màn "chưa có con".
- `npm test` và `npm run build` (trong `design/prototype`) xanh. Không hạ/xoá test cũ để qua.
- Không ghi SĐT hoặc nội dung nhận xét vào log.
- Ảnh p4: chạy `npx vite --mode test --port 5198`, chụp 390x844 @2x (playwright python, `python3 -I` chạy từ /tmp) vào `plans/20261021-mvp/design/prototype-shots/p4/`: `01-dang-ky-giao-vien`, `02-dang-ky-phu-huynh`, `03-dang-ky-phu-huynh-loi-sdt-trung`, `04-chua-co-con`, `05-cai-dat-phu-huynh`, `06-cai-dat-phu-huynh-chua-co-con`, `07-tong-quan`, `08-diem-so`, `09-bao-cao`, `10-nhan-xet`. (Dev thường bật skipLogin và đã đăng nhập sẵn; đăng xuất hoặc dùng context mới + `--mode test` để thấy màn đăng ký.) Tắt server sau khi chụp.
- Kết thúc bằng `Status: DONE | DONE_WITH_CONCERNS | BLOCKED_NEEDS_LEAD` + 2 câu, kèm danh sách file đã sửa, số test pass.
