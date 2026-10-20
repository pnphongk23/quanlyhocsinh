# Báo cáo worker rl-shell

- Status: DONE
- Cổng dev: 5304
- WRITE-SET dùng: `design/prototype/src/app/router.tsx`, `design/prototype/src/features/auth/**`, `design/prototype/src/features/settings/**`. `src/app/TeacherShell.tsx` và `src/app/shell.module.css` không cần đổi (tab bar đã đúng Lớp/Lịch/Cài đặt).

## Đã làm

- Đăng ký đủ 11 route mới trong `router.tsx` bằng lazy import: `/chon-vai-tro`, `/bai-giang`, `/bai-giang/moi`, `/bai-giang/:lectureId`, `/bai-giang/:lectureId/sua`, `/nhan-su`, `/nhan-su/moi`, `/nhan-su/:memberId`, `/vai-tro`, `/vai-tro/moi`, `/vai-tro/:roleId`; thêm tiêu đề trang tiếng Việt (khớp trước route chung).
- Thêm `RoleGuard`: nếu thành viên đang dùng không còn trong `auth.memberIds`/`state.members` hoặc bị `disabled` thì chuyển về `/chon-vai-tro` (đặt ngoài `TeacherShell` để không lộ dữ liệu).
- `features/auth/RolePickerPage.tsx`: thẻ vai trò gồm tên role, loại (`roleDisplayKind`), workspace ("Lớp của cô Lan"), tên thành viên; thẻ đang dùng có pill "Đang dùng"; chọn thì `switchRole(memberId)` rồi vào `/lop`. Chỉ hiện danh sách khi thật sự cần (nhiều membership, chưa chọn, hoặc bị thu hồi); một membership hợp lệ thì chuyển thẳng `/lop`. Khi bị thu hồi hiện thông báo đúng câu "Vai trò của bạn đã thay đổi, dữ liệu đã được ẩn."; khi không còn vai trò nào thì chỉ còn lối đăng xuất.
- `LoginPage`: sau đăng nhập nhiều role vào `/chon-vai-tro`, một role vào `/lop`; khi đã có phiên cũng điều hướng theo cùng quy tắc.
- `SettingsPage`: bỏ eyebrow "Tài khoản giáo viên" cứng, dùng tên thật + email; thẻ hồ sơ hiện tên, email và "Vai trò đang dùng" (tên role · loại role); thêm danh sách mục: "Đổi vai trò" (khi nhiều role), "Bài giảng" (khi `can("lectures","read")`), "Nhân sự" và "Vai trò" (chỉ Admin). Giữ chặn đăng xuất khi còn thay đổi chờ và nút đặt lại dữ liệu mẫu.
- Bỏ khối "Trạng thái dữ liệu" (pill Đã đồng bộ/Đang chờ/Ngoại tuyến) khỏi Cài đặt theo quy tắc "không chip trạng thái đồng bộ" và architecture.md mục offline (giao diện chỉ hiện lỗi). Lý do chặn đăng xuất vẫn hiện.

## Cần biết / ngoài write-set

- Không đổi chữ ký API nào; chỉ gọi `useAccess`, `listMyMemberships`, `switchRole`, `roleDisplayKind` theo hợp đồng.
- Trong lúc làm, lỗi typecheck duy nhất còn lại là `src/features/staff/staffModel.ts` thiếu `SegmentedOption` từ `shared/ui` — ngoài write-set, worker khác đã bổ sung sau đó.
- Việc "buộc chọn lại vai trò" khi chỉ còn một vai trò hợp lệ vẫn hiện RolePicker (khác câu "chỉ khi có nhiều membership") vì đây là luồng bắt buộc sau khi bị thu hồi; trường hợp bình thường một role vẫn vào thẳng `/lop`.
- Chuỗi workspace lấy theo brand hiện có "Lớp của cô Lan" vì prototype chưa có tên workspace trong dữ liệu.

## Kiểm chứng

- `cd design/prototype && npx tsc --noEmit` — 0 lỗi.
- `npx vitest run` — 15 file / 86 test đạt.
- `npm run build` — đạt; chunk lazy cho toàn bộ trang bài giảng/nhân sự/vai trò (`LectureDetailPage`, `MemberDetailPage`, `InvitePage`, `RoleEditorPage`...).
- Chạy `npx vite --port 5304` và điều khiển Chrome headless qua CDP, viewport 390x844, xác nhận:
  - Phiên sẵn nhiều vai trò: `/dang-nhap` → `/chon-vai-tro`.
  - Đăng xuất ở Cài đặt rồi đăng nhập lại: nhiều role → `/chon-vai-tro`; chọn "Giáo viên" → `/lop`; tab bar "Lớp / Lịch / Cài đặt".
  - Cài đặt vai trò Giáo viên: "Cô Lan", "Giáo viên · Nhân sự", có "Đổi vai trò", "Bài giảng"; không có "Nhân sự"/"Vai trò".
  - Cài đặt vai trò Admin: thêm "Nhân sự" và "Vai trò".
  - Vai trò đang dùng bị thu hồi (member không còn) và bị `disabled`: đều bị đưa về `/chon-vai-tro` kèm thông báo "Vai trò của bạn đã thay đổi, dữ liệu đã được ẩn."
  - Một membership: `/dang-nhap` → `/lop`, `/chon-vai-tro` → `/lop`.
  - Tiêu đề: `/bai-giang` = "Bài giảng", `/nhan-su` = "Nhân sự", `/vai-tro` = "Vai trò", `/chon-vai-tro` = "Chọn vai trò".
- Ảnh chụp: `/tmp/rl-shell-login.png`, `/tmp/rl-shell-picker.png`, `/tmp/rl-shell-settings-teacher.png`, `/tmp/rl-shell-settings-admin.png`, `/tmp/rl-shell-revoked.png`.

## File đã sửa

- `design/prototype/src/app/router.tsx`
- `design/prototype/src/features/auth/LoginPage.tsx`
- `design/prototype/src/features/auth/RolePickerPage.tsx` (mới)
- `design/prototype/src/features/auth/auth.module.css`
- `design/prototype/src/features/settings/SettingsPage.tsx`
- `design/prototype/src/features/settings/settings.module.css`
- `plans/reports/rl-shell.md`
