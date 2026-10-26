# backend-19: review tổng thể backend (vòng 1)

Chỉ ĐỌC và CHẠY test; KHÔNG sửa mã, KHÔNG deploy, KHÔNG commit, KHÔNG gọi staging bằng mật khẩu thật. Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend, HEAD 2d311cb), mã trong `worker/`. Dùng `srcwalk`. Spec: `plans/20261021-mvp/backend/{api-spec,data-model,authz-matrix,offline-plan}.md`, `docs/spec.md`; quyết định `plans/20261021-mvp/briefs/{71,74,76}-decisions-*.md`. Tiền lệ review: `plans/20261021-mvp/backend/review-overall-r1.md`, `review-impl-r2.md` (đừng nêu lại phát hiện đã sửa, nhưng kiểm chúng không tái phát).

## Trọng tâm
1. Phân quyền theo vai trò (Admin, Giáo viên, Trợ giảng, Phụ huynh, chưa đăng nhập, workspace khác, phụ huynh khác): mọi route, kể cả `PATCH /sessions/{id}`, `GET /me` (`students` của membership), `POST /auth/register-guardian`, sync push/pull/snapshot. Có route nào ghi/đọc ngoài phạm vi hoặc thiếu `requireAccess`/lọc `workspace_id` không?
2. Phụ huynh tự đăng ký + liên kết SĐT: khớp theo SĐT mọi workspace, liên kết khi giáo viên thêm/sửa SĐT, tạo/bật/vô hiệu membership, thu hồi phiên; lộ dữ liệu con người khác; dò SĐT (throttle, thứ tự kiểm khớp/`phone_registered`, thông điệp lỗi); tài khoản giáo viên có SĐT trùng phụ huynh (đa vai trò).
3. Rò dữ liệu: `parent_phone` hay nhận xét/điểm lọt vào phản hồi/log/thông báo/snapshot báo cáo của người không có quyền; phiếu chưa gửi; BTVN cổng mở/đóng (`deleted`).
4. Đồng bộ "lệnh tới sau thắng": idempotency theo UUID, `rejected` phát lại, `base_version`, validation điểm bước 0,5, đồng thời (hai thiết bị), `pull`/`snapshot_required`/epoch.
5. CPU gói Free: đường nóng (login 30.000 vòng PBKDF2 + rehash, sync push/pull, cron), số truy vấn D1 mỗi request, N+1, vòng lặp theo số học sinh/lớp.
6. Chất lượng test: test nào chỉ khẳng định mock/không bắt lỗi thật; khoảng trống phủ cho các điểm trên.

## Báo cáo
Ghi vào `plans/20261021-mvp/backend/review-final-r1.md`: mỗi phát hiện có mức (REQUIRED = BLOCKER/MAJOR phải sửa trước khi giao; OPTIONAL = MINOR), file:dòng, kịch bản lỗi cụ thể (đầu vào → kết quả sai), và cách sửa đề xuất; tách riêng "đã kiểm, không có vấn đề". Chạy `npm run typecheck` và `npm test` trong `worker/` và ghi kết quả. Chỉ nêu phát hiện bạn tự xác minh bằng đọc mã hoặc chạy được; không suy đoán.
Kết thúc: `Status: ...` + 2 câu + số phát hiện REQUIRED/OPTIONAL.
