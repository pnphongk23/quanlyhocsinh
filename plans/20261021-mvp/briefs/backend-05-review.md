# Việc backend-05: review tổng thể backend (chỉ đọc)

Bạn là reviewer, KHÔNG sửa mã. Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, `worker/`, commits `f31d26b..HEAD` và nền trước đó (nhánh `mvp-backend`). Đọc `/Users/phamnhuphong/Git/quanlyhocsinh/{AGENTS.md,docs/spec.md}` và `plans/20261021-mvp/backend/{api-spec.md,authz-matrix.md,data-model.md,offline-plan.md}`. Dùng `srcwalk`.

Tập trung (theo thứ tự): (1) phân quyền/rò dữ liệu: mọi truy vấn có `workspace_id` + phạm vi (lớp được gán, `guardian_student`), phụ huynh chỉ đọc và chỉ thấy nội dung đã gửi/phát hành, chéo workspace, IDOR, sync pull rò dữ liệu con người khác, `must_change_password`; (2) đúng spec: endpoint đủ/thừa so với api-spec (không endpoint ngoài MVP, ghi chỉ qua sync), định dạng lỗi/phân trang, `sessionNumber` (hủy không có số), điểm `max` mặc định 15, không trung bình/vắng thi; (3) sync: idempotency lệnh trùng UUID, `base_version`, xung đột giữ hai giá trị, cursor/`snapshot_required`; (4) log không chứa SĐT/mật khẩu/token/nhận xét, payload FCM không lộ nội dung; (5) chất lượng test (test có thật sự bắt lỗi, không tautology). Có thể chạy `npm run typecheck`, `npm test` trong `worker/`.

Báo cáo `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/review-impl-r1.md`: danh sách phát hiện có mức BLOCKER/MAJOR/MINOR, file:dòng, kịch bản lỗi cụ thể, đề xuất sửa; chỉ nêu điều bạn đã xác minh trong mã. Kết thúc:
Status: APPROVED | CHANGES_REQUIRED
Summary: hai câu.
