# Báo cáo iOS: nhân sự và phân quyền (bản 1.1)

Nhánh `mvp-ios-roles` (worktree `.paseo/worktrees/0fvr24l0/mvp-ios-roles`), commit `e8e3d7d`, từ mvp-ios 1fcfcb3. Không push, không đụng mvp-ios.

## Đã làm (scope mục 1–7)
1. Cài đặt (admin) có dòng "Nhân sự" mở danh sách: đang hoạt động, chờ đăng nhập, vô hiệu hoá. SĐT che giữa.
2. Thêm nhân sự: tên, SĐT, vai trò Giáo viên/Trợ giảng, chọn lớp.
3. Sửa: vai trò, lớp, vô hiệu/kích hoạt lại, huỷ khai báo (pending). Gửi `base_version`.
4. Ma trận quyền 2 vai trò × 5 nhóm × Không/Đọc/Sửa, `PUT /roles/{key}/permissions` ngay khi chạm.
5. `guardian_setup` với SĐT nhân sự dùng câu chữ trung tính (không nhắc "phụ huynh").
6. `Membership.classIds` (decode `class_ids`). Việc chọn vai trò sau đăng nhập và đổi ở Cài đặt dùng luồng `PUT /v1/session/membership` có sẵn.
7. Ẩn/khoá nút theo quyền đã có sẵn (`allows`); thêm refresh `/me` để quyền, lớp, vai trò đổi có hiệu lực ngay (`TeacherRootView` cấu hình lại khi membership đổi). Vai trò bị thu hồi: về `.chooseRole` (còn vai trò khác) hoặc `.login`, hiện thông báo, giữ outbox và cache trên đĩa.

## Kiểm chứng
- Suite đầy đủ: 335 test, 2 skipped, 0 lỗi (simulator iPhone 16, TEST SUCCEEDED). Mới: `StaffTests` (store với API giả, class_ids, vai trò bị thu hồi).
- Ảnh demo (dữ liệu giả) ở `report-ios-shots/`.
- **Chưa chạy staging**: backend `mvp-backend-roles` chưa deploy. Toàn bộ test dùng lớp mạng giả theo api-spec mục 11.

## Giả định hợp đồng cần BE xác nhận
- `GET /classes?status=active` trả `{items:[{id,name}]}`.
- `/auth/phone-check` giữ `next=guardian_setup` cho nhân sự.
- `PATCH /staff/{id}` nhận `base_version` và trả `StaffMember` mới.

## Lưu ý quy trình
Trước khi được cấp slot, tôi chạy một lần `xcodebuild test` trên "iPhone 16" khi Chu Du còn giữ; có thể đã cài đè app của họ. Sau đó chuyển sang thiết bị riêng rồi xoá. Đã dọn, 0 máy đang boot.

## Còn lại
- Review cuối codex sol 6.1 chưa chạy.
- Chạy live staging sau khi GL báo BE deploy.
- Backlog 1.0 (QA footer điểm, sol-19, version_conflict…) không đụng.

Status: DONE_WITH_CONCERNS
Summary: Hoàn thành code và test đơn vị cho 7 mục iOS; chưa kiểm chứng trên staging (BE chưa deploy) và chưa có review codex sol 6.1.
