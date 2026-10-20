# Worker rl-gating — áp quyền lên các màn hiện có

**Status: DONE_WITH_CONCERNS**

## Nhiệm vụ
Áp `useAccess().can` cho các nhóm lớp / học sinh / buổi học & điểm danh / điểm / nhận xét & báo cáo:
- Mức `read`: xem được, ẩn FAB và nút ghi.
- Mức `none`: hiện `NoAccess` thay nội dung; tab bị `none` ẩn khỏi hàng tab trong `ClassSpaceLayout`.
- Hàm ghi ở tầng data đã có `requirePermission`; UI vẫn bắt lỗi và hiện thông báo gọn (các `try/catch` sẵn có giữ nguyên).

Không đổi chữ ký API, không đổi bố cục, không sửa ngoài write-set.

## File đã sửa (17, tất cả trong write-set)
- `features/classes/ClassListPage.tsx` — `classes:read` → `NoAccess`; ẩn nút "Tạo lớp mới" (desktop + sticky bar + empty state) khi `!write`.
- `features/classes/NewClassPage.tsx` — `!classes:write` → `NoAccess`.
- `features/classes/EditClassModal.tsx` — chặn khi `!classes:write`.
- `features/classes/EditClassSchedule.tsx` — chặn khi `!classes:write`.
- `features/class-space/ClassSpaceLayout.tsx` — tab gắn `group`, ẩn tab `none`; ẩn nút tuỳ chọn lớp + Sheet (Sửa lớp / Sửa lịch / Lưu trữ) khi `!classes:write`.
- `features/class-space/AddSessionModal.tsx` — chặn khi `!sessions_attendance:write`.
- `features/class-space/SessionsTab.tsx` — `sessions_attendance:read` → `NoAccess`; ẩn FAB "Thêm buổi", "Sửa buổi lẻ", "Hủy buổi" khi `!write`.
- `features/class-space/TestsTab.tsx` — `scores:read` → `NoAccess`; ẩn "Tạo bài kiểm tra"/"+ Bài mới" khi `!write`.
- `features/class-space/ScoreGridTab.tsx` — `scores:read` → `NoAccess`; ẩn "+ Bài kiểm tra mới" khi `!write`.
- `features/students/StudentsPage.tsx` — `students:read` → `NoAccess`; ẩn FAB "Thêm học sinh", "Đánh dấu nghỉ" và nút tuỳ chọn khi `!write`.
- `features/scores/NewTestPage.tsx` — `!scores:write` → `NoAccess`.
- `features/scores/TestScoresPage.tsx` — `scores:read` → `NoAccess`; khi `!write` khoá ô nhập + nút "Vắng thi" (disabled) và ẩn thanh "Lưu điểm"; thêm dòng nhắc quyền xem.
- `features/reports/ReportsPage.tsx` — `comments_reports:read` → `NoAccess`; ẩn "Lưu nháp", "Phát hành"/"Phát hành lại", nút phát hành hàng loạt, ghi chú phát hành khi `!write`.
- `features/comments/CommentsPanel.tsx` (+ `.module.css`) — `comments_reports:read` → `NoAccess`; khi `!write` thay composer bằng khối chỉ đọc, ẩn câu mẫu, nút lưu/gửi và nút "Mô phỏng mất mạng"; bỏ auto-save nháp khi `!write`.
- `features/attendance/AttendancePanel.tsx` — `sessions_attendance:read` → `NoAccess`; khi `!write` chuyển toàn bộ panel sang chế độ chỉ xem (khoá nút trạng thái/ô muộn/ghi chú, nút "Lưu điểm danh" disabled, ẩn "Tất cả có mặt"/gợi ý thao tác/khu "Cần chú ý"); thêm nhắc quyền riêng, không lẫn với nhắc "chỉ điểm danh từ ngày học".
- `features/schedule/SchedulePage.tsx` — `sessions_attendance:read` → `NoAccess`.

Không sửa `features/class-space/SessionDetailPage.tsx` và `sessionDetail.module.css` (rl-lectures giữ).

## Kiểm chứng
1. `cd design/prototype && npx tsc --noEmit` → sạch (0 lỗi).
2. `npx vitest run` → **15 test files / 86 tests pass**.
3. `npm run dev -- --port 5305` + Chrome headless CDP, viewport 390×844, seed sẵn có, đổi `activeMemberId` trực tiếp trong localStorage để kiểm 2 ma trận vai trò:
   - **Trợ giảng** (classes none · students read · sessions_attendance write · scores read · comments_reports none):
     - `/lop` → "Bạn không có quyền xem lớp học" (NoAccess).
     - `/lop/ielts/hoc-sinh` → danh sách chỉ đọc, **không có** FAB "+" / "Đánh dấu nghỉ"; tab "Báo cáo" bị ẩn.
     - `/lop/ielts/bao-cao` → NoAccess "báo cáo".
     - `/lop/ielts/buoi-hoc` → có FAB "Thêm buổi" và "Hủy buổi" (đúng quyền write).
     - `/lop/ielts/bai-kiem-tra` → không có "+ Bài mới"; `/…/moi` → NoAccess "mục tạo bài kiểm tra".
     - `/lop/ielts/bai-kiem-tra/ielts-test-3` → chỉ đọc, không thanh "Lưu điểm".
     - `/lich` → xem được.
   - **Phụ huynh** (classes/students none · sessions_attendance/scores/comments_reports read):
     - `/lop` → NoAccess; `/lop/ielts/hoc-sinh` → NoAccess, tab "Học sinh" ẩn.
     - `/lop/ielts/buoi-hoc` → không FAB "Thêm buổi", chỉ "Xem buổi" (không "Hủy buổi" trong tab này).
     - Chi tiết buổi đã diễn ra → panel điểm danh chỉ xem (nhắc "Bạn chỉ có quyền xem điểm danh…", không "Tất cả có mặt", nút "Lưu điểm danh" disabled); tab "Nhận xét" hiện nội dung nhận xét dạng chỉ đọc, không ô soạn/nút gửi.
     - `/lop/ielts/bao-cao` → xem được, chỉ còn nút "Xem trước bản in" (ẩn Lưu nháp/Phát hành/hàng loạt).
   - **Admin (hồi quy)**: `/lop` có "Tạo lớp mới"; tab lớp đủ 5 mục; FAB "Thêm buổi"/"Thêm học sinh" và "Lưu điểm" còn nguyên.
   Ảnh chụp 390px: `/tmp/rl-gating-*.png`.

## Cần xử lý ngoài write-set (không tự sửa)
1. `features/class-space/SessionDetailPage.tsx` (rl-lectures giữ): với vai trò chỉ đọc buổi học, nút **"Hủy buổi"** (buổi `planned`) vẫn hiện; khi `comments_reports:none` tab segmented **"Nhận xét"** vẫn hiện (bấm vào mới thấy `NoAccess` của CommentsPanel). Đề nghị gate `can("sessions_attendance","write")` cho nút hủy và `can("comments_reports","read")` cho lựa chọn segmented.
2. `app/router.tsx` (shell giữ): index route `/lop/:classId` luôn `Navigate to="buoi-hoc"`. Nếu `sessions_attendance:none`, người dùng vào lớp sẽ đứng ở tab đã bị ẩn và thấy `NoAccess`. Có thể redirect về tab đọc được đầu tiên.
3. `shared/ui/NoAccess.tsx` cố định câu "Bạn không có quyền xem {what}"; tôi truyền `what` dạng danh từ ("mục tạo lớp", "mục tạo bài kiểm tra"…) để câu đọc tự nhiên, không đổi component.

## Quyết định thiết kế đáng lưu ý
- `ClassSpaceLayout` **không** bọc `NoAccess` theo `classes:read`: quyền lớp được áp ở `ClassListPage` và ở các nút ghi; nhờ vậy vai trò phụ huynh (classes none nhưng có sessions/scores/comments read) vẫn xem được buổi học/điểm/báo cáo của lớp được gán qua URL, đúng tinh thần "tab bị none thì ẩn khỏi hàng tab".
- Với mức read, nút ghi chọn cách **khoá (disabled)** khi đã có chỗ quen thuộc (Lưu điểm danh, Lưu điểm) và **ẩn** với FAB/nút hành động — theo đúng hợp đồng "ẩn hoặc khoá".
