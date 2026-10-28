# Báo cáo web: vai trò và phân quyền 1.1

Nhánh `mvp-web-roles` (worktree `mvp-web-roles`), commit `97615c3` + sửa sau review (xem cuối), tách từ c16d1f1. Không push, không deploy.

## Đã làm

- **API** (`src/data/api/{types,client}.ts`, `src/data/repositories/staff.ts`): `GET/POST /staff`, `PATCH/DELETE /staff/{id}`, `GET /roles/permissions`, `PUT /roles/{key}/permissions`, kiểu `StaffMember`, `class_ids` trên membership. Hàm `staffErrorMessage` đổi mã lỗi hợp đồng (`staff_exists`, `last_admin`, `role_not_editable`, `not_pending`, 422 theo trường) thành câu tiếng Việt.
- **Mục Nhân sự (chỉ Admin)** tại `/cai-dat/nhan-su`, link từ Cài đặt (mobile: dòng menu, desktop: thẻ). Người không phải Admin vào thẳng URL thấy `NoAccess` và không gọi API.
  - Danh sách: tên, SĐT đầy đủ, vai trò, lớp được giao, nhãn "Chờ đặt mật khẩu" / "Đã tắt quyền".
  - Thêm bằng SĐT (tên, Giáo viên/Trợ giảng, chọn lớp). Sửa: vai trò, lớp, tên (chỉ bản khai chờ), Tắt quyền/Bật lại (gửi `base_version`), Huỷ khai báo (DELETE bản khai chờ). Không cho tự tắt/sửa mình; hàng Admin chỉ xem và (với Admin khác) tắt quyền.
  - Ma trận quyền 2 vai trò × 5 nhóm × Không/Đọc/Sửa; "Lưu quyền" chỉ gửi nhóm đã đổi.
  - Cần mạng: ngoại tuyến thì khoá nút và hiện thông báo. Mobile dùng sheet, desktop dùng dialog, chỉ dùng token.
- **Đặt mật khẩu lần đầu trung tính**: `guardian_setup` giữ nguyên giá trị nhưng chữ không còn nói về con ("Đặt mật khẩu lần đầu để vào ứng dụng…"); lỗi `phone_not_declared` cũng trung tính. Sau đó vào `landingPathForSession`: ≥2 vai trò hoặc `active_membership_id` null → `/chon-vai-tro`; đúng 1 vai trò mà server trả null thì tự `PUT /session/membership`.
- **Chọn/đổi vai trò, thu hồi**: đã có sẵn (picker, Đổi vai trò, `invalidateActiveMembership` khi 403/404, lệnh chờ bị từ chối được giữ). Không phải đổi.
- **Audit ẩn/khoá nút theo quyền**: mọi màn lớp, học sinh, buổi, điểm danh, điểm, nhận xét, bài tập, báo cáo đã dùng `can()`/`useAccess()`; repository chặn bằng `requirePermission`. Staff chỉ thấy lớp được giao vì máy chủ chỉ đồng bộ lớp đó (`visibleClassIds` dựa trên store). Không phát hiện chỗ thiếu.

## Kiểm chứng

- `tsc --noEmit` sạch; vitest đầy đủ: 729 pass, 4 skip (trước 713). Test mới: `src/features/staff/staff.test.tsx` (mock API theo hợp đồng: không-Admin bị chặn, danh sách + ma trận, thêm, trùng số đã tắt, sửa/tắt/huỷ khai báo, last_admin, lưu quyền chỉ nhóm đổi, đặt mật khẩu lần đầu 2 vai trò → picker, 1 vai trò → tự chọn) và `staffModel.test.ts`.
- Chromium với API giả (không số thật): ảnh mobile 390 và desktop 1440 ở `shots-web/` (Cài đặt, Nhân sự, sửa, thêm), không tràn ngang. Script `capture-web.mjs`.
- Chưa chạy với backend thật (chờ GL báo đã deploy).
- Không thấy test vitest flaky lần này.

## Hạn chế

- Hàng Admin không đổi vai trò (hạ Admin) trên UI dù hợp đồng cho phép; chưa có trong phạm vi nên bỏ.
- 403 `membership_required` từ trang Nhân sự hiện chỉ báo lỗi; thu hồi đầy đủ chạy qua sync/`/me` như cũ.

## Review cuối (codex gpt-6.1-sol, chỉ đọc)

Route guard Admin, ẩn/khoá theo quyền, `active_membership_id` null và tự `PUT /session/membership` (không vòng lặp, một vai gọi đúng một lần, nhiều vai không tự chọn), không lộ SĐT ra log/URL/toast: không có finding. 4 finding khác, đã sửa hết:

- P2 mất quyền giữa chừng (403 từ API nhân sự) vẫn giữ danh sách SĐT và editor: nay bỏ dữ liệu, đóng editor, báo lỗi và làm mới phiên (`/me`).
- P2 danh sách không gắn với membership: nay tải lại và bỏ dữ liệu cũ khi đổi membership, bỏ response của membership cũ.
- P2 phản hồi lưu quyền ghi đè chỉnh sửa đang làm: khoá các ô khi đang lưu.
- P3 editor vẫn ghi được khi ngoại tuyến: truyền `online`, khoá nút và chặn handler.
- Test thêm 3 ca (403, đổi membership, khoá ma trận). tsc sạch, 729 pass.

Status: DONE_WITH_CONCERNS
Summary: Màn Nhân sự, ma trận quyền, đặt mật khẩu lần đầu trung tính và xử lý chọn vai trò xong, tsc + 726 test pass, ảnh Chromium với API giả. Chưa thử với backend thật.
Concerns/Blockers: Cần backend 1.1 deployed để chạy thật; chưa có đổi vai trò cho hàng Admin.
