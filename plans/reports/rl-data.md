# Báo cáo worker rl-data

- **Status:** DONE_WITH_CONCERNS
- **Cổng dev:** 5301
- **WRITE-SET:** `design/prototype/src/data/**` (không sửa `data/types.ts`; không sửa file ngoài write-set).

## Summary

Cài xong đầy đủ tầng dữ liệu cho bài giảng, nhân sự, role theo `plans/prototype-roles-lectures-contract.md`, giữ nguyên chữ ký API:

- `repositories/access.ts`: `PERMISSION_GROUPS` (6 nhóm, nhãn tiếng Việt), `GUARDIAN_GROUPS`, `getActiveMember`, `getActiveRole`, `listMyMemberships`, `switchRole`, `isAdmin`, `can` (write gồm read; Admin luôn true; phụ huynh không bao giờ write), `requirePermission`, `useAccess`; thêm `visibleClassIds()` để dùng chung phạm vi lớp.
- `repositories/lectures.ts`: thư viện theo phạm vi (Admin / người tạo / có buổi trong lớp được gán), tạo–sửa–lưu trữ–khôi phục, gắn/gỡ nhiều-nhiều, đếm lượt dùng, danh sách buổi dùng bài giảng.
- `repositories/staff.ts`: mời/gửi lại/huỷ lời mời, gán lớp, đổi role, vô hiệu hoá (chặn Admin cuối), CRUD role với ràng buộc role hệ thống và role phụ huynh.
- `store.ts` + `migrations.ts`: giữ khoá `teacher-prototype-v1`, thêm `migrateStore()` bổ sung `roles`, `members`, `activeMemberId`, `lectures`, `sessionLectures`, `auth.memberIds` cho dữ liệu cũ nên dữ liệu localStorage cũ vẫn chạy.
- `seed.ts` + `defaults.ts`: role Admin (system) / Giáo viên / Trợ giảng / Phụ huynh; Cô Lan có 2 membership (Admin + Giáo viên), Thầy Quang Minh (Giáo viên, 2 lớp), Cô Thu Trang (Trợ giảng, 1 lớp), Cô Mai (invited); 2 bài giảng mẫu (4 phần và 3 phần) gắn vào 4 buổi; seed đăng nhập sẵn bằng membership Admin.
- `auth.ts`: `login` trả `memberIds`, đặt `activeMemberId` là thành viên đầu (Admin), `logout` xoá cả `activeMemberId`.
- `helpers.ts`: `requirePermission` (re-export từ `access.ts`).
- `classes.ts`: `listClasses()` lọc theo phạm vi (Admin tất cả; vai trò khác chỉ lớp trong `classIds`).
- Gắn `requirePermission` vào mọi hàm ghi hiện có: lớp (`classes`), học sinh (`students`), buổi + điểm danh (`sessions_attendance`, riêng sửa lịch lặp tính nhóm `classes` theo spec), điểm + bài kiểm tra (`scores`), nhận xét + báo cáo (`comments_reports`).

## Ghi chú / diễn giải (cần review)

1. `updateLecture` gọi `requireOnline()` cho mọi lần sửa (hợp đồng chỉ ghi rõ `requireOnline` khi tạo mới có tệp), theo spec mục 4 “sửa bài giảng đã có … cần mạng”. Tương tự `resendInvite` cần mạng (kiến trúc: mời nhân sự cần mạng). Không đổi chữ ký.
2. `listLectures("mine")` loại bài đã lưu trữ (hợp đồng chỉ nói `createdBy`); tab “Đã lưu trữ” riêng.
3. `attachLecture`/`detachLecture` kiểm nhóm `lectures` mức write và buổi phải thuộc phạm vi nhìn thấy (hợp đồng không nêu rõ nhóm quyền).
4. `setMemberRole` cũng chặn hạ vai trò Admin cuối cùng còn hoạt động (hợp đồng chỉ nêu rõ ở `setMemberDisabled`, nhưng spec yêu cầu luôn còn ít nhất một Admin).
5. `login()` prototype gán membership theo tên thành viên đầu tiên (Cô Lan) nên `memberIds` gồm đúng 2 vai trò của Cô Lan; mặc định chọn Admin. Các membership khác vẫn xem được trong màn Nhân sự, nhưng để đổi vai trò trong test phải thêm vào `auth.memberIds`.
6. Seed đăng nhập sẵn Admin (theo yêu cầu để test cũ đạt), nên `/dang-nhap` chuyển hướng `/lop`; trang đăng nhập chỉ tới được sau khi đăng xuất.
7. `can()` chặn write với role `kind === "guardian"` ngay cả khi dữ liệu `permissions` bị sửa tay thành write (defense-in-depth).
8. `data/types.ts` không cần sửa: mọi kiểu cần dùng đã có sẵn.

## File trong WRITE-SET

Mới: `src/data/defaults.ts`, `src/data/repositories/access.ts`, `src/data/repositories/lectures.ts`, `src/data/repositories/staff.ts`, `src/data/repositories/access.test.ts`, `src/data/repositories/staff.test.ts`, `src/data/repositories/lectures.test.ts`.
Sửa: `src/data/store.ts`, `src/data/migrations.ts`, `src/data/migrations.test.ts`, `src/data/seed.ts`, `src/data/repositories/auth.ts`, `helpers.ts`, `classes.ts`, `students.ts`, `sessions.ts`, `attendance.ts`, `scores.ts`, `tests.ts`, `comments.ts`, `reports.ts`.
Ngoài WRITE-SET (chỉ báo cáo, theo yêu cầu): `plans/reports/rl-data.md`.

## Kiểm chứng

- `cd design/prototype && npx tsc --noEmit` — exit 0, không lỗi (trước đó các màn UI của worker khác thiếu module `access|lectures|staff`; sau khi cài đã hết).
- `npx vitest run` — 15 file, **86 test đạt** (gồm 26 test mới cho phạm vi lớp, `can()`, role phụ huynh, Admin cuối, role hệ thống, bài giảng nhiều-nhiều, sửa bài giảng đổi cho mọi buổi, migration dữ liệu cũ).
- `npm run dev -- --port 5301` + Playwright Chromium viewport **390×844**, không có `pageerror`/console error:
  - `/lop` Admin thấy “Tiếng Anh giao tiếp 6A” + “IELTS 7.0”.
  - Đổi `activeMemberId` sang membership Giáo viên của Cô Lan → chỉ còn “Tiếng Anh giao tiếp 6A”.
  - Đổi sang Cô Thu Trang (Trợ giảng) → màn lớp hiện `NoAccess` (role không có nhóm Lớp), `/bai-giang` chỉ thấy “Từ vựng chủ đề Travel” (gắn buổi lớp IELTS), không thấy “Present Perfect”, không có FAB tạo bài giảng.
  - `/nhan-su` và `/vai-tro` render đúng seed: 4 vai trò, 5 thành viên, Cô Lan 2 vai trò, Cô Mai “Đã mời”, số người dùng mỗi role đúng.
