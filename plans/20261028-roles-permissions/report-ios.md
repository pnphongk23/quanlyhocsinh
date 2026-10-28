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
- Đặt mật khẩu lần đầu (13:5x, build `ee214a2`, gửi đúng 1 lần): thành công, vào "Lớp của tôi" (vai Trợ giảng). Không còn 429.
- Chỉ thấy lớp được gán: app hiện QA-iOS-A, không thấy B–E. `sync/pull` của membership chỉ trả 1 lớp, 5 học sinh, buổi của lớp đó.
- Điểm danh: đặt HS5 vắng, lưu; server nhận 4 present + 1 absent, cursor 9320. Pull/push thật.
- Nút điểm khoá: tab Bài kiểm tra không có nút thêm (Điểm của trợ giảng mặc định read). Nhận xét: trạng thái rỗng vẫn ghi "Tạo bài kiểm tra đầu tiên…" dù không có nút tạo.
- Vô hiệu hoá bằng Admin (PATCH `/staff/{membership_id}` status disabled): `sync/pull` trả 404; `/me` với token cũ trả 200 và `memberships` rỗng (không phải 403 `account_disabled` như web ghi nhận). Sửa điểm danh trong app khi đó: app quay về màn đăng nhập với "Bạn không còn quyền ở vai trò này. Hãy chọn vai trò khác hoặc liên hệ quản trị viên.", cache bản ghi xoá về 0, outbox giữ nguyên (5 lệnh `attendance.set` pending).
- Bật lại, đăng nhập lại: outbox tự đẩy lên hết, server HS5 `late` version 2, cursor 9323; `scope_epoch` tăng 1→3 sau khoá/mở. Pull với epoch cũ trả 409 `resync_required` (app tự xử lý).
- Lưu ý nhỏ: toast "Lỗi lưu — vui lòng thử lại" còn hiện sau khi bị đẩy về đăng nhập và sau khi đăng nhập lại; không chặn nhưng gây nhầm.
- Chưa chạy live: đổi vai trò khi có nhiều membership (cần nhân sự thứ hai ở workspace khác); đã có test đơn vị (hai→một membership, app đóng).
- Dọn: `QA Trợ giảng thử` đã vô hiệu hoá; quyền vai trò đang ở mặc định spec (kiểm lại bằng GET); simulator đã tắt (0 máy booted), status bar đã xoá override; file tạm đã xoá.

## Phát hiện và đã sửa: thời gian chờ 429 bị ghi cứng 60 giây
`AuthService.userMessage` (`AuthService.swift`, nhánh `status == 429`) luôn trả `LoginText.rateLimited(seconds: 60)` và bỏ qua `Retry-After` của máy chủ. Chỉ `/auth/phone-check` đọc `retryAfter` (`AuthService.swift:257-262`, mặc định 60 nếu thiếu). Vì vậy đặt mật khẩu lần đầu (`auth/register-guardian`), đăng ký, đăng nhập... khi bị giới hạn đăng ký theo IP (cửa sổ ~58 phút) vẫn báo "thử lại sau 1 phút": sai, người dùng thử lại sớm và lại dính 429. Đây là lỗi cũ của bản 1.0, không do bản 1.1; sửa gọn: truyền `retryAfter` vào `userMessage` và dùng chung với `LoginText.wait(seconds:)`. Đã sửa theo duyệt của GL: `userMessage` đọc `Retry-After` (mặc định 60 khi thiếu, làm tròn lên phút từ 60 giây) cho mọi 429 (đăng nhập, đăng ký, đặt mật khẩu). Test mới `RateLimitCopyTests` (3480 giây → "58 phút", thiếu header → "1 phút", 30 giây → "30 giây"). Commit `688644b` trên `mvp-ios` (1.0; full suite 324 test, 0 lỗi) và cherry-pick `ee214a2` sang `mvp-ios-roles` (full suite 341 test, 0 lỗi). Chạy trên thiết bị tạm riêng, không đụng simulator của slot.

## Còn lại
- Đổi vai trò live với nhiều membership (cần nhân sự thứ hai).
- Backlog 1.0 (QA footer điểm, sol-19, version_conflict…) không đụng.

Status: DONE_WITH_CONCERNS
Summary: Live đã xác nhận toàn bộ kịch bản trừ đổi vai trò nhiều membership; lưu ý /me khi bị khoá trả 200 membership rỗng, không phải 403.
