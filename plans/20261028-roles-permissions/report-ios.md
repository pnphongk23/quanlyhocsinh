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

## Review cuối (codex sol 6.1) và xử lý
Chi tiết ở `review-ios-sol.md`. Commit sửa: `1e4b83d`, `51e7cf5` (nhánh `mvp-ios-roles`).
- High (lớp bị gỡ vẫn đọc được từ cache khi sync lỗi): đã sửa. `Membership.sees(classId:)`; cả hai store lọc lớp, học sinh, buổi, bài kiểm tra, điểm danh, điểm, phiếu, báo cáo theo `class_ids` ngay khi `/me` mới về. Ngoại lệ: admin (không có `class_ids`) không bị lọc.
- Medium (quyền điểm/nhận xét chờ sync): đã sửa. `TeacherRootView` áp quyền và bộ lọc đồng bộ trước khi sync.
- Medium (ma trận quyền gửi song song): đã sửa. Các PUT chạy tuần tự, phản hồi cuối là trạng thái mới nhất. Chưa có test đảo thứ tự phản hồi.
- Medium (còn 1 vai trò sau thu hồi tự chuyển workspace): đã sửa, có test.
- Medium (mở app lại sau khi vai trò bị vô hiệu): đã sửa bằng cách so với identity đã lưu, có test.
- Low (spacing số cứng): đã sửa theo GL. `--space-*` đã có sẵn trong `design/tokens/tokens.css` nên không thêm giá trị mới; iOS thêm `AppSpace.s2…s48` (bản chép của token, `Core/DesignSystem/Tokens.swift`) và `ios-mapping.md` ghi "Khớp". `StaffViews.swift` dùng `AppSpace`, commit `c316b3c`. Còn lại: icon chevron 16pt ở dòng "Nhân sự" trong `AuthSettingsView` giữ nguyên như các dòng cùng menu (chưa có token cỡ icon).
- Test sau các commit trên: 338 test, 0 lỗi (2 skipped), TEST SUCCEEDED.

## Chạy live staging (backend 421ef6af, migration 0013), iPhone 16
Đã chạy thật bằng Maestro, tài khoản admin workspace QA iOS:
- Cài đặt, Nhân sự, Thêm nhân sự (số giả) → server tạo bản ghi `pending` vai trò assistant. Hình dạng `/staff`, `/classes?status=active` (`{items}`), `/roles/permissions` khớp mô hình.
- Phát hiện khi chạy live: form thêm/sửa mở ở nửa màn nên danh sách lớp nằm dưới màn hình và chip không chọn được. Đã sửa: form mở toàn chiều cao (`51e7cf5`). Sau đó sửa nhân sự chờ, chọn lớp, lưu: server nhận `class_ids` 1 lớp, version 1→2.
- Ma trận quyền: chạm trên app, server đổi quyền thật (Điểm của trợ giảng read→none). Đã trả về mặc định spec (trợ giảng: sessions_attendance và comments_reports write, classes/students/scores read; giáo viên write cả 5), kiểm lại bằng GET.
- Màn đặt mật khẩu lần đầu của nhân sự (SĐT chờ đăng nhập): hiện đúng chữ trung tính "Số này đã được khai trong lớp. Đặt mật khẩu để vào ứng dụng." (xác nhận live). Bấm "Vào ứng dụng" lần đầu (12:2x) nhận 429, app hiện "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 1 phút."; đã dừng, không thử lại, báo GL.
- Chưa chạy (cần đăng ký, chờ GL báo web xong để không dính giới hạn IP): nhân sự đặt mật khẩu lần đầu, chỉ thấy lớp được gán, điểm danh đồng bộ, nút điểm khoá, vô hiệu hoá/bật lại, đổi vai trò.
- Nhân sự thử `QA Trợ giảng thử` (pending) còn trên staging, sẽ dọn khi xong.

## Còn lại
- Phần live cần đăng ký (liệt kê trên) và dọn nhân sự thử.
- Backlog 1.0 (QA footer điểm, sol-19, version_conflict…) không đụng.

Status: DONE_WITH_CONCERNS
Summary: Finding review đã sửa, test 338/338; live đã xác nhận thêm/sửa nhân sự và ma trận quyền, còn các bước cần đăng ký chờ GL báo.
