# Việc backend-07: review tổng thể backend vòng 2 (chỉ đọc)

Bạn là reviewer mới, KHÔNG sửa mã. Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, `worker/`. Đọc `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/review-impl-r1.md` (phát hiện vòng 1 và mục "Đã sửa"), brief `briefs/backend-05-review.md` (tiêu chí), spec `api-spec.md`, `authz-matrix.md`. Dùng `srcwalk`. Chạy `npm run typecheck`, `npm test` trong `worker/`.

Việc: (1) kiểm từng bản sửa của r1 (commit `a80f33e` đa vai trò, `8a4f642` hình dạng items, `33a680c` PATCH lớp) bằng đọc mã + xác minh test thực sự bắt lỗi cũ; đặc biệt phần miễn `membership_required` cho route tài khoản (`/v1/workspaces` có đúng spec không, có mở đường lộ dữ liệu nào không, `must_change_password` vẫn chặn đúng); (2) rà các MINOR r1 còn hở và quyết mức nghiêm trọng thật (đặc biệt: `changePassword` không xoá device token phiên bị thu hồi, cặp `{classId,studentId}` của phụ huynh không kiểm cùng em, replay thiếu khi cổng BTVN đóng lại, m12 PATCH đồng thời); (3) một lượt độc lập tìm BLOCKER/MAJOR mới ở phân quyền/rò dữ liệu mà r1 bỏ sót (thử tư duy tấn công: phụ huynh/giáo viên workspace khác, IDOR qua sync, cursor, report PDF). Chỉ nêu điều đã xác minh trong mã.

Báo cáo `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/review-impl-r2.md` (mức BLOCKER/MAJOR/MINOR, file:dòng, kịch bản, đề xuất). Lưu ý: nếu gặp lỗi upstream 429 tạm thời, ghi báo cáo từng phần để không mất công.
Status: APPROVED | CHANGES_REQUIRED
Summary: hai câu.
