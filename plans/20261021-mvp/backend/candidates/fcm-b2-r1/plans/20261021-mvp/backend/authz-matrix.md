# Ma trận phân quyền (MVP)

Ngày: 2026-10-21 · Đi kèm: `api-spec.md` (endpoint, lệnh), `data-model.md` (role mặc định, trigger chặn). Dùng để worker viết test phân quyền theo từng vai trò (architecture mục 7).

## 1. Cách đọc

- **Vai trò mặc định** (tạo cùng workspace, ma trận mặc định ở `data-model.md` mục 2.1): Admin (`scope_kind=workspace`), Giáo viên và Trợ giảng (`assigned_classes`), Phụ huynh (`linked_students`). Role tuỳ chỉnh (làm sau) tuân cùng quy tắc: quyền = mức của nhóm quyền trong `role_permissions`, phạm vi = `scope_kind`.
- **Yêu cầu một thao tác** = nhóm quyền + mức (`read` hay `write`) **và** phạm vi. Mức `write` bao gồm `read`.
- **Phạm vi:** Admin thấy mọi lớp trong workspace; nhân sự chỉ lớp có trong `member_classes` của membership đang dùng; Phụ huynh chỉ học sinh trong `guardian_student` và lớp của các em.
- Ký hiệu: ✓ được · ✗ không (`403 forbidden` nếu thấy được tài nguyên, `404 not_found` nếu ngoài phạm vi) · `r` chỉ đọc · `own` chỉ con mình · `sent` chỉ nội dung đã gửi/phát hành · `P(g:l)` cần nhóm `g` mức `l` (ví dụ `P(scores:w)`).
- Cột Giáo viên và Trợ giảng là **giá trị mặc định**; test dùng role mặc định và thêm vài ca role tuỳ chỉnh (mục 4) để chứng minh code kiểm theo `role_permissions`, không theo tên role.
- Mọi dòng áp dụng thêm: membership phải `active`, user `active`, workspace khớp; `must_change_password` chặn mọi thứ trừ đổi mật khẩu, đăng xuất, `/me` (api-spec mục 0).

## 2. Ma trận

### 2.1 Tài khoản và phiên

| Hành động (endpoint) | Chưa đăng nhập | Admin | Giáo viên | Trợ giảng | Phụ huynh |
|---|---|---|---|---|---|
| Đăng ký workspace (`POST /auth/register`) | ✓ (giới hạn IP) | — | — | — | — |
| Đăng nhập (`POST /auth/login`) | ✓ (giới hạn SĐT, IP) | ✓ | ✓ | ✓ | ✓ |
| Đăng xuất, đổi mật khẩu, `GET /me`, đổi vai trò, tạo thêm workspace | ✗ `401` | ✓ | ✓ | ✓ | ✓ |
| Cấp mật khẩu cho phụ huynh (`guardian-credentials`) | ✗ | ✓ (mọi lớp) | ✓ `P(students:w)`, lớp được gán | ✗ (`students:r`) | ✗ |
| Đăng ký/làm mới/xoá FCM device token của chính user + membership + phiên (PUT/DELETE /device-tokens) | ✗ | ✓ | ✓ | ✓ | ✓ |
| Quản trị: mời/thêm nhân sự, tạo-sửa role, gán lớp, đổi role, vô hiệu tài khoản | ✗ | Chưa có endpoint ở MVP (làm sau); khi làm: **chỉ Admin**, kiểm ở tầng `db` | ✗ | ✗ | ✗ |

### 2.2 Lớp, học sinh, buổi học

| Hành động | Admin | Giáo viên | Trợ giảng | Phụ huynh |
|---|---|---|---|---|
| Danh sách / xem lớp | ✓ mọi lớp | ✓ lớp được gán | ✓ `P(classes:r)` lớp được gán | `r` own (chỉ `id, name, status`, lớp của con) |
| Tạo lớp | ✓ | ✓ `P(classes:w)`; lớp tự gán cho người tạo | ✗ | ✗ |
| Sửa lớp, đổi lịch lặp, lưu trữ lớp | ✓ | ✓ lớp được gán | ✗ | ✗ |
| Danh sách / xem học sinh | ✓ | ✓ | ✓ `r` | `own` (con; không `parent_phone`) |
| Thêm học sinh, sửa tên/SĐT, đánh dấu nghỉ | ✓ | ✓ `P(students:w)` | ✗ | ✗ |
| Xem buổi của lớp, lịch (`/calendar`) | ✓ | ✓ | ✓ | `r` own (lớp của con; không `note`) |
| Thêm buổi lẻ, hủy buổi | ✓ | ✓ `P(sessions_attendance:w)` | ✓ (`write` mặc định) | ✗ |

### 2.3 Điểm danh, điểm

| Hành động | Admin | Giáo viên | Trợ giảng | Phụ huynh |
|---|---|---|---|---|
| Đọc điểm danh | ✓ | ✓ | ✓ | `own` |
| `attendance.set` | ✓ | ✓ `P(sessions_attendance:w)` | ✓ | ✗ (lệnh bị `rejected forbidden`) |
| Đọc bài kiểm tra / bảng điểm | ✓ | ✓ | ✓ `r` | `own`; bài lưu trữ không thấy |
| `test.create`, `test.update`, `test.delete` | ✓ | ✓ `P(scores:w)` | ✗ | ✗ |
| `score.set` | ✓ | ✓ `P(scores:w)` | ✗ | ✗ |
| Đọc lịch sử sửa (điểm danh, điểm) | Không có endpoint ở MVP (chỉ ghi DB); không lộ cho ai | | | |

### 2.4 Phiếu buổi học, BTVN, báo cáo

| Hành động | Admin | Giáo viên | Trợ giảng | Phụ huynh |
|---|---|---|---|---|
| Đọc phiếu (nháp và đã gửi) | ✓ | ✓ | ✓ `r` | `sent` own |
| `slip.set` | ✓ | ✓ `P(comments_reports:w)` | ✗ | ✗ |
| `slip.send` | ✓ | ✓ | ✗ | ✗ |
| Đọc phần BTVN | ✓ | ✓ | ✓ `r` | thấy ngay khi lưu (lớp của con) |
| `homework.assign`, `homework.section.upsert/delete`, `homework.grade.set` | ✓ | ✓ `P(comments_reports:w)` | ✗ | ✗ |
| Đọc kết quả chấm BTVN | ✓ | ✓ | ✓ `r` | `own` và chỉ khi phiếu của buổi chấm đã gửi |
| Danh sách báo cáo của lớp, xem trước | ✓ | ✓ | ✓ `r` | ✗ |
| Lưu nháp, phát hành, tải PDF lên | ✓ | ✓ `P(comments_reports:w)` | ✗ | ✗ |
| Đọc báo cáo / tải PDF đã phát hành | ✓ | ✓ | ✓ `r` | `sent` own (bản đã phát hành) |
| Đọc / giải quyết xung đột (`conflict.resolve`) | ✓ | ✓ nhóm tương ứng `w` | chỉ xung đột điểm danh (có `sessions_attendance:w`); xung đột điểm, phiếu, BTVN ✗ | ✗ không thấy thực thể `conflict` |

Quy ước xung đột: ai có `write` ở nhóm của thực thể trong lớp thì thấy và giải quyết; ai chỉ `read` thì không thấy thực thể `conflict` (không có ý nghĩa với họ).

### 2.5 Thông báo, đồng bộ

| Hành động | Admin | Giáo viên | Trợ giảng | Phụ huynh |
|---|---|---|---|---|
| `GET /notifications`, đánh dấu đã đọc | ✗ `403 forbidden` (MVP không có thông báo cho nhân sự; endpoint chỉ dành cho Phụ huynh — `api-spec.md` mục 7) | ✗ `403 forbidden` | ✗ `403 forbidden` | ✓ chỉ user + membership hiện hành, còn liên kết con/quyền đọc |
| `POST /sync/push` | ✓ từng lệnh theo bảng trên | ✓ | ✓ | Lệnh nào cũng `rejected forbidden` (Phụ huynh luôn chỉ đọc) |
| `GET /sync/pull`, `/sync/snapshot` | ✓ mọi lớp | ✓ lớp được gán | ✓ lớp được gán | ✓ phạm vi con, chiếu theo cột "Phụ huynh" ở `api-spec.md` 6.4 |

## 3. Kiểm tra bắt buộc ở tầng `worker/src/db` (không chỉ ở route)

- Mọi hàm nhận `Identity { userId, membershipId, workspaceId, roleScopeKind, permissions, classIds | linkedStudentIds }` và **không có đường vòng**: không truy vấn D1 ngoài `worker/src/db`.
- Mọi truy vấn có `workspace_id = ?` và điều kiện phạm vi (xem mẫu ở `data-model.md` mục 3).
- Hàm kiểm quyền chung: `requireAccess(identity, group, level, resource)` với `resource` là lớp hoặc học sinh; nhân sự: lớp ∈ `classIds`; Phụ huynh: học sinh ∈ `linkedStudentIds` và `level = read`.
- Phụ huynh: tầng `db` chặn mọi thao tác ghi bất kể `role_permissions` (kể cả khi dữ liệu bị sửa tay thành `write`); trigger `role_perm_guardian_cap` là lớp chặn thứ hai.

## 4. Danh sách test phân quyền (worker phải viết)

Mỗi test chạy trên D1 thật của môi trường test (Miniflare/`vitest-pool-workers`), dựng sẵn: workspace A (Admin, Giáo viên T1 lớp C1, Giáo viên T2 lớp C2, Trợ giảng TA lớp C1, hai phụ huynh P1 (con S1 ở C1) và P2 (con S2 ở C1, con S3 ở C2)) và workspace B (Admin, lớp CB, phụ huynh).

| ID | Ca | Kỳ vọng |
|---|---|---|
| T01 | Không token gọi mọi endpoint trừ `/auth/register`, `/auth/login`, `/health` | `401` |
| T02 | Token hết hạn / đã thu hồi / `token_hash` không tồn tại | `401` |
| T03 | `must_change_password = 1`: gọi `GET /classes`, `POST /sync/push` | `403 password_change_required`; `/auth/change-password`, `/me`, `/auth/logout` chạy được |
| T04 | T1 đọc/ghi lớp C2 (GET, PATCH, sessions, students, tests, `sync/push` lệnh với `session_id` của C2) | `404` / lệnh `rejected not_found` |
| T05 | T1 `pull` và `snapshot`: không có dòng nào của C2 | rỗng |
| T06 | Admin A đọc/ghi lớp của workspace B bằng ID đoán | `404` |
| T07 | Phụ huynh P1 đọc con S2 / lớp C2 / điểm của S2 qua mọi endpoint và `pull` | `404`; `pull` không chứa dữ liệu S2 |
| T08 | P1 `pull`: chỉ có `student` S1 (không có bạn cùng lớp), không có `parent_phone`, không có `note` của buổi, không `report`, không `conflict` | đúng như `api-spec.md` 6.4 |
| T09 | P1 gửi lệnh bất kỳ qua `sync/push` | mọi lệnh `rejected forbidden` |
| T10 | P1 gọi `PATCH /classes/…`, `POST /students/…`, mọi `POST/PATCH/PUT/DELETE` ngoài `PUT/DELETE /device-tokens`, đổi mật khẩu, đổi vai trò | `403` |
| T11 | Phiếu chưa gửi (`draft`) không xuất hiện với P1; sau `slip.send` thì xuất hiện trong lần `pull` kế tiếp | đúng |
| T12 | Kết quả chấm BTVN buổi N không xuất hiện với P1 khi phiếu buổi chấm chưa gửi; xuất hiện (qua `pull`) ngay sau khi gửi phiếu; ẩn lại và xuất hiện đúng khi buổi N+1 bị hủy và buổi chấm đổi | đúng, kể cả phát lại ở `change_log` |
| T13 | Đề BTVN xuất hiện với P1 ngay sau `homework.section.upsert`, trước khi gửi phiếu | đúng |
| T14 | Bài kiểm tra bị lưu trữ biến mất khỏi `pull` của P1 (vào `deleted`) và bị ẩn ở danh sách của nhân sự khi không có `?archived=1` | đúng |
| T15 | Báo cáo chưa phát hành không lộ cho P1; phát hành lại: P1 thấy bản số lớn nhất, bản cũ vẫn đọc được bằng số | đúng |
| T16 | Trợ giảng (mặc định): `attendance.set` ✓; `score.set`, `slip.set`, `test.create`, tạo lớp, sửa học sinh, `guardian-credentials` đều bị từ chối | đúng |
| T17 | Role tuỳ chỉnh dựng bằng SQL trong test: nhân sự có `scores:read` + `sessions_attendance:write`; kiểm `score.set` bị từ chối, `attendance.set` được; đổi `role_permissions` thì có hiệu lực ngay ở request kế tiếp (không cache) | đúng |
| T18 | Giáo viên bị gỡ khỏi lớp C1 (xoá `member_classes`, bump `scope_epoch`): `pull` với epoch cũ ⇒ `409 resync_required`; `push` lệnh cũ ⇒ `rejected not_found` | đúng |
| T19 | Membership bị vô hiệu: mọi request với phiên đang dùng ⇒ `403 account_disabled`; `push` với `membership_id` đó ⇒ `404` | đúng |
| T20 | Đổi vai trò: lệnh trong hàng đợi gắn `membership_id` cũ vẫn được kiểm theo quyền của membership cũ (không theo vai trò đang chọn) | đúng |
| T21 | User có hai membership (Giáo viên và Phụ huynh) ở cùng workspace: thao tác ghi bằng membership Phụ huynh bị từ chối dù user cũng là giáo viên | đúng |
| T22 | Đổi `parent_phone` của S1: P1 mất liên kết (`scope_epoch` tăng, `pull` cũ ⇒ `409`), phụ huynh của SĐT mới có liên kết nếu đã có tài khoản | đúng |
| T23 | `guardian-credentials`: SĐT chưa có user ⇒ tạo + `must_change_password`; SĐT của giáo viên khác workspace ⇒ không đặt lại mật khẩu (`password_issued:false`); SĐT của phụ huynh chỉ có role Phụ huynh trong workspace này ⇒ cấp lại, thu hồi phiên cũ | đúng (theo Q2) |
| T24 | Trigger: gán `write` cho role `linked_students`; gán `classes:read` cho role phụ huynh; tạo membership phụ huynh cho user không có `guardian_student`; hạ/xoá Admin cuối cùng; sửa role Admin | `RAISE` tương ứng |
| T25 | Đăng nhập sai 5 lần ⇒ `429` + `Retry-After`; đúng lần sau trong thời gian khoá vẫn `429`; SĐT lạ có cùng thời gian trả lời/giới hạn | đúng |
| T26 | Không lộ SĐT, token, mật khẩu, nội dung `note` trong body lỗi và log (kiểm bằng cách chạy bộ test và quét log thu được) | không có |
| T27 | Idempotent: gửi lại cùng `command_id` ⇒ `duplicate`, không tạo thêm `attendance_history`/`change_log`; lệnh quá 90 ngày ⇒ `command_expired` | đúng |
| T28 | Xung đột: hai thiết bị cùng `base_version` sửa một ô khác giá trị ⇒ thiết bị tới trước `applied`, tới sau `conflict`; hai giá trị đều có (`scores` và `sync_conflicts`); giải quyết `client` khi ô đã đổi tiếp ⇒ `conflict_stale` | đúng |
| T29 | Điểm danh trước ngày học ⇒ `session_not_started`; em chưa vào lớp/đã rời lớp vào ngày đó ⇒ `student_not_enrolled_on_date`; `late_at` với trạng thái khác `late` ⇒ `validation_error` | đúng |
| T30 | `max` hạ dưới điểm cao nhất ⇒ `max_below_score`; điểm > max ⇒ `score_above_max`; `test.delete` bài có điểm 0 ⇒ `archived`, bài toàn ô trống ⇒ `deleted` | đúng |
| T31 | Xoá phần BTVN đã có em được chấm ⇒ `section_has_grades`; chưa em nào ⇒ xoá được; hủy buổi còn phần BTVN ⇒ `409 session_has_data` | đúng |
| T32 | Người dùng workspace B dùng `membership_id` của workspace A trong `push`/`pull` | `404` |
| T33 | Quyền bị thu hồi lúc offline: lệnh trong hàng đợi gửi lại sau khi mất quyền ⇒ `rejected forbidden`, lệnh được giữ (kiểm phía client) | đúng |

## 5. Ca kiểm FCM bổ sung (B2, chưa chạy vì chưa có backend)

| ID | Ca | Kỳ vọng |
|---|---|---|
| F01 | Chưa đăng nhập, chưa chọn membership, buộc đổi mật khẩu, membership vô hiệu | 401/404/403 đúng thứ tự xác thực, không đăng ký token |
| F02 | Body giả user/workspace; DELETE device của người khác/phiên khác | không nhận trường giả; 404; không đổi/xoá thiết bị khác |
| F03 | Cùng token đăng nhập tài khoản khác hoặc đổi role | chỉ còn một chủ user/membership; tăng version, bỏ deliveries cũ; DELETE version cũ không xoá đăng ký mới |
| F04 | Đăng xuất một trong hai phiên; token SDK đổi | chỉ gỡ token của phiên đó; gỡ token cũ và đăng ký mới, không lộ giá trị token qua API/log |
| F05 | Thu hồi liên kết con, membership, phiên hoặc quyền trước cron gửi | skipped, không gọi FCM; inbox không lộ dữ liệu con cũ |
| F06 | Một phụ huynh có hai thiết bị, retry sự kiện | mỗi thiết bị một delivery; không trùng inbox; sent ở thiết bị A không bỏ mất B |
| F07 | FCM UNREGISTERED / INVALID_ARGUMENT do payload sai / token sai | xoá đúng device/version với token không hợp lệ; payload sai giữ token |
| F08 | Hai cron claim cùng delivery; crash sau gửi | một lease hợp lệ; lease hết được retry, có thể trùng push và client chống xử lý trùng bằng notification id |
| F09 | Bốn sự kiện; noop/retry; sửa phiếu hoặc chấm BTVN sau gửi | đúng mục 7 API; không thông báo chấm riêng; điểm sau 5 phút không nhập thêm, BTVN một lần giao, sửa đề không phát push |
| F10 | Cache OAuth hết hạn/đổi key, hai isolate refresh, FCM 401/429/5xx | refresh có lease, không lộ secret; retry hữu hạn/backoff; inbox vẫn còn khi push lỗi |

| F11 | Nhập tiếp điểm trước ready_at, cron đang đọc nhóm cũ | tăng event_version/ready_at; claim phiên bản cũ không gửi sớm; retry/noop không dời hạn |
| F12 | `homework.assign` 4 phần, một phần sai hoặc trùng kind; retry command_id thành công | sai: cả lệnh rollback, không inbox; đúng: một inbox/em/phụ huynh, không 4 push; retry không trùng |
