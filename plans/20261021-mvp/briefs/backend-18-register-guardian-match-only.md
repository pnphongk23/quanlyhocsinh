# backend-18: `register-guardian` chỉ nhận SĐT đã được giáo viên khai

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend), làm trong `worker/`. Dùng `srcwalk`. Quyết định người dùng 2026-10-23 (`briefs/76-decisions-20261023.md` mục 2, thắng `74` mục 1 về SĐT chưa khớp).

## Việc
`POST /auth/register-guardian` (`src/routes/auth.ts`, `registerGuardian` trong `src/db/auth.ts`): CHỈ tạo tài khoản khi SĐT chuẩn hoá khớp `students.parent_phone` của ÍT NHẤT MỘT học sinh ở BẤT KỲ workspace nào, học sinh đang học HOẶC đã nghỉ (`status` bất kỳ). Không khớp ⇒ từ chối `422 validation_error` với `details.reason = "guardian_phone_not_found"` (không tạo user, không ghi gì ngoài bộ đếm throttle), thông điệp không lộ thêm gì. Giữ thứ tự hiện có: kiểm throttle `register:ip` trước, ghi nhận lượt thử (cả lượt không khớp tính vào 5/giờ để chống dò SĐT), rồi kiểm khớp, rồi `409 phone_registered` (thứ tự của hai lỗi này: kiểm khớp trước, rồi trùng SĐT; chọn thứ tự không lộ thêm thông tin và ghi trong báo cáo). Lược đồ/liên kết khi khớp giữ như đã làm (liên kết mọi học sinh khớp kể cả đã nghỉ nếu code hiện chỉ liên kết `active`: thống nhất với quyền đọc con của phụ huynh hiện hành, nêu rõ lựa chọn).
Giữ nguyên: màn "chưa có con" vẫn có thể xảy ra khi giáo viên gỡ/đổi SĐT sau đó (membership `disabled`, `memberships: []` ở login). Cập nhật test (`tests/auth-guardian-register.test.ts`): ca không khớp giờ `422 guardian_phone_not_found` và không tồn tại user/membership/phiên; ca khớp học sinh đang học, ca khớp chỉ học sinh đã nghỉ, ca khớp ở workspace thứ hai, throttle cả lượt không khớp (lượt thứ 6 trong giờ ⇒ 429). Sửa mọi test khác đang dựa vào "SĐT chưa khớp vẫn tạo được tài khoản".
Quét `worker/` (src, tests, README, .dev.vars.example) tìm dấu vết luồng lời mời (invite, mời, lời mời, mã mời): hiện không thấy; nếu có thì gỡ, nêu trong báo cáo.

## Ranh giới
Sở hữu `src/routes/auth.ts`, `src/db/auth.ts`, `tests/auth-guardian-register.test.ts` và test auth bị ảnh hưởng. Không đụng `plans/**`. `npm run typecheck`, `npm test` xanh. Commit conventional (không nhắc AI/plan), không push, KHÔNG deploy.
Kết thúc: `Status: ...` + 2 câu.
