# backend-22: `teacher_name` cho phụ huynh (tên hiển thị giáo viên phụ trách)

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend, HEAD b91e98a), làm trong `worker/`. Dùng `srcwalk`. Yêu cầu từ lead Web (UX v2 phụ huynh hiển thị "Thứ Hai, Thứ Tư · 18:00 · Giáo viên Cô Lan"); lead Backend chốt làm.

## Việc
Thêm `teacher_name: string | null` (CHỈ tên hiển thị `users.display_name`; không SĐT, không id người dùng, không email) vào dữ liệu lớp mà phụ huynh đọc:
- `GET /classes` và `GET /classes/{id}` khi người gọi là phụ huynh (hiện chỉ trả `id,name,status`): thêm `teacher_name`.
- Thực thể `class` trong `GET /sync/snapshot` và `GET /sync/pull` cho phụ huynh (xem `src/db/sync-read.ts`): thêm `teacher_name`. Với nhân sự, thêm cũng được nhưng không bắt buộc; chọn nhất quán một cách và ghi rõ.
- `students[]` trong membership phụ huynh (login, register-guardian, `/me`; `src/db/auth.ts`): thêm `teacher_name` cạnh `class_name`.
Quy tắc chọn: người có membership `active` thuộc role `system_key = 'teacher'` (hoặc `scope_kind = 'assigned_classes'`) được gán lớp qua `member_classes`, sắp theo thời điểm gán rồi id lấy NGƯỜI ĐẦU TIÊN có `display_name` khác rỗng; nếu không có, lấy Admin đầu tiên (membership `admin` active, theo `created_at`) có `display_name`; nếu vẫn không có ⇒ `null`. User bị vô hiệu không tính. Không lộ tên của ai ngoài workspace của lớp. Tránh N+1: một truy vấn gộp cho cả danh sách. Khi giáo viên đổi `display_name` hoặc đổi gán lớp, snapshot/pull của phụ huynh phải thấy giá trị mới: kiểm cơ chế `change_log`/`scope_epoch` hiện có (nếu `class` không được ghi lại khi gán giáo viên đổi, ghi thêm một dòng `change_log` `class` upsert trong cùng batch ở các chỗ gán lớp / đổi tên hiển thị, hoặc, nếu quá rộng, tăng `scope_epoch` của phụ huynh lớp đó; nêu lựa chọn và lý do trong báo cáo). Nếu chưa có nơi nào ghi `member_classes`/đổi `display_name` ngoài đăng ký thì nêu rõ.
Test: phụ huynh thấy tên giáo viên được gán; nhiều giáo viên ⇒ người gán trước; không có giáo viên ⇒ tên Admin; không `display_name` ⇒ `null`; không có SĐT/id người dùng trong JSON (khẳng định bằng so khớp khoá); phụ huynh lớp khác/workspace khác không thấy lớp; nhân sự không bị hỏng hợp đồng cũ.

## Ranh giới
Sở hữu `src/db/classes.ts`, `src/routes/classes.ts`, `src/db/sync-read.ts`, `src/db/auth.ts` (hàm membership students), `tests/*` liên quan. Không đụng `plans/**`. `npm run typecheck`, `npm test` xanh. Commit conventional (không nhắc AI/plan), không push, KHÔNG deploy.
Kết thúc: `Status: ...` + 2 câu + hình dạng JSON cuối cùng + cách chọn khi đổi gán lớp.
