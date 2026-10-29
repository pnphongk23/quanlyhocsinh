# API chung cho iOS và web (MVP)

Ngày: 2026-10-21 · Đi kèm: `data-model.md` (bảng, cột), `authz-matrix.md` (ma trận quyền chi tiết), `stack-and-cpu.md`, `offline-plan.md`. Spec nghiệp vụ: `docs/spec.md`. Chỉ thiết kế, chưa có mã.

Giá trị trong ví dụ là giả: SĐT `+84900000001`, mật khẩu `example-Pass-123`, token `qlh_EXAMPLE_NOT_A_REAL_TOKEN`, ID rút gọn dạng `cls_…` chỉ để đọc (thực tế là UUID).

## 0. Quy ước

- **Base URL:** `https://<worker-host>/v1`. Staging trước; chưa có production. Đổi không tương thích ⇒ `/v2`, thêm trường mới thì không đổi phiên bản (client bỏ qua trường lạ).
- **Định dạng:** JSON UTF-8, trường `snake_case`. Ngày `YYYY-MM-DD` (giờ Việt Nam), giờ `HH:MM`, thời điểm ISO-8601 UTC có mili giây. `weekdays` là mảng ISO `1..7` (1 = Thứ hai, 7 = Chủ nhật). SĐT nhận `0900000001`, `84900000001`, `+84900000001`; luôn trả `+84…`.
- **Xác thực:** `Authorization: Bearer <token>` cho cả iOS và web (token từ `/auth/login`). Lý do không dùng cookie: web chạy ở Cloudflare Pages, API ở miền khác ⇒ cookie bên thứ ba bị Safari chặn; token lưu ở Keychain (iOS) hoặc IndexedDB (web). Nếu sau này đặt API cùng miền với web thì có thể thêm cookie `HttpOnly`.
- **Header tuỳ chọn:** `X-Client: ios/1.0.0 | web/1.0.0`, `X-Request-Id: <uuid>` (máy chủ sinh nếu thiếu, trả lại ở mọi response).
- **Vai trò đang dùng:** phiên mang `active_membership_id`. Các endpoint REST dùng vai trò đó. Endpoint đồng bộ nhận `membership_id` rõ ràng (hàng đợi giữ vai trò lúc tạo lệnh, spec architecture mục 4) và máy chủ kiểm membership thuộc user và còn hoạt động.
- **Quyền:** kiểm ở máy chủ cho mọi endpoint; giao diện ẩn nút chỉ để dễ dùng. Cách viết trong mục "Ai gọi": `Public` (không cần đăng nhập) · `Mọi người dùng đã đăng nhập` · `<nhóm>:<mức>` = vai trò có nhóm quyền đó ở mức đó **và** tài nguyên nằm trong phạm vi (lớp được gán / Admin thấy tất cả) · `Admin` · `Phụ huynh` = vai trò phạm vi `linked_students` với con được liên kết. Tên nhóm: `classes`, `students`, `sessions_attendance`, `scores`, `lectures`, `comments_reports`, và `send_comments` (quyền riêng "Gửi nhận xét", chỉ có mức `none` \| `write`, xem mục 11).
- **Tài nguyên ngoài phạm vi:** trả `404 not_found` (không lộ sự tồn tại). Có quyền xem nhưng thiếu mức sửa: `403 forbidden`.
- **Khi `must_change_password = true`:** mọi endpoint trừ `/auth/change-password`, `/auth/logout`, `/me` trả `403 password_change_required`.
- **Cache:** mọi response của `/auth/*` có `Cache-Control: no-store`.
- **Log:** không ghi SĐT, mật khẩu, token, nội dung ghi chú/nhận xét vào log hay thông báo lỗi (spec mục 9). Log chỉ chứa `request_id`, đường dẫn đã bỏ ID người dùng, mã lỗi, thời lượng.
- **CORS (Worker chịu, không phụ thuộc Cloudflare rule):** mọi `/v1/*` trả `Vary: Origin`. Origin khớp chính xác một mục của biến `ALLOWED_ORIGINS` (phân tách dấu phẩy; bỏ khoảng trắng và dấu `/` cuối; không bao giờ `*`; rỗng = không cho origin nào) được phản chiếu ở `Access-Control-Allow-Origin` kèm `Access-Control-Expose-Headers: X-Request-Id, Retry-After`. Preflight `OPTIONS` không cần xác thực, luôn `204`; với origin được phép có thêm `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`, `Access-Control-Allow-Headers: Authorization, Content-Type, X-Request-Id, X-Client`, `Access-Control-Max-Age: 600`. Origin lạ vẫn `204` nhưng không có header `Access-Control-*` nên trình duyệt chặn. Không dùng cookie nên không có `Allow-Credentials`. Thêm origin (Pages thật) = sửa `ALLOWED_ORIGINS` rồi deploy lại Worker. Staging hiện: 3 cổng localhost (5173, 4173, 3000), `https://quanlyhocsinh-proto.pages.dev`, `https://qlh-staging-web.pages.dev`.
- **Giới hạn kích thước:** body JSON ≤ 256 KB (413 `payload_too_large`). Máy chủ không nhận hay lưu PDF (quyết định 2026-10-22).
- **Sửa online bằng `PATCH`:** nhận `base_version` (tuỳ chọn); nếu có và cũ hơn bản hiện tại ⇒ `409 version_conflict` kèm bản hiện tại. Đây là quy tắc của REST khi client chủ động gửi `base_version`; lệnh đồng bộ thì **tới sau thắng** (mục 6.1).

## 1. Định dạng lỗi

```json
{ "error": { "code": "validation_error", "message": "Invalid request.", "details": { "fields": { "max": "must_be_1_to_1000" } }, "request_id": "9d4c…" } }
```

`message` bằng tiếng Anh cho nhà phát triển, không hiển thị cho người dùng; client dịch theo `code`. `details` tuỳ mã.

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `bad_request` | JSON hỏng |
| 401 | `unauthorized` | thiếu/sai/hết hạn token; `invalid_credentials` ở đăng nhập (xem dưới) |
| 401 | `invalid_credentials` | SĐT hoặc mật khẩu sai (không phân biệt hai trường hợp) |
| 403 | `forbidden` | thiếu quyền (đã thấy được tài nguyên) |
| 403 | `password_change_required` | phải đổi mật khẩu trước |
| 403 | `account_disabled` | user hoặc membership bị vô hiệu |
| 404 | `not_found` | không có hoặc ngoài phạm vi |
| 409 | `version_conflict` | `base_version` cũ chỉ trên `PATCH` REST (không dùng cho lệnh đồng bộ: lệnh sync tới sau thắng, mục 6.1) |
| 409 | `conflict` | trạng thái không cho phép (ví dụ `phone_registered`, `session_exists`, `session_has_data`, `session_not_planned`) — mã cụ thể ở `details.reason` |
| 409 | `id_conflict` | `id` do client gửi ở `POST` tạo lớp/học sinh/buổi lẻ đã được dùng ở nơi khác (workspace khác, lớp khác hoặc bản ghi khác loại, hoặc lớp ngoài phạm vi người gọi); không có `details`, không lộ nơi đang dùng (mục 5) |
| 409 | `resync_required` | `epoch` lệch (`details.reason = "scope_changed"`) ⇒ tải lại ảnh chụp phạm vi |
| 409 | `snapshot_required` | cursor cũ hơn cửa sổ lưu `change_log` (`details.reason = "log_truncated"`) ⇒ chạy lại `GET /sync/snapshot` (mục 6.3, 6.6) |
| 413 | `payload_too_large` | |
| 422 | `validation_error` | sai định dạng/ràng buộc; `details.fields` hoặc `details.reason` (`weak_password`, `max_below_score`, `score_above_max`, `invalid_score`, `invalid_score_step`, `stars_required`, `student_not_enrolled_on_date`, `session_not_started`, `section_has_grades`, `test_has_scores`) |
| 429 | `rate_limited` | kèm `Retry-After` (giây) |
| 500/503 | `internal`, `unavailable` | không lộ chi tiết |

Trong kết quả từng lệnh đồng bộ (mục 6) dùng cùng bộ `code` với `status = "rejected"`.

## 2. Phân trang

- Danh sách dài (thông báo, buổi theo khoảng ngày, báo cáo): `?limit=50&cursor=<opaque>`; mặc định 50, tối đa 200. Trả `{ "items": [...], "next_cursor": "…" | null }`. Con trỏ là chuỗi mờ (khóa sắp xếp mã hoá), ổn định khi có dòng mới.
- Danh sách nhỏ theo bản chất (lớp, học sinh của một lớp < 20, phần BTVN của một buổi) trả đủ, không phân trang.
- Đồng bộ dùng `cursor` số nguyên riêng (mục 6.3).

## 3. Giới hạn tốc độ

Đếm trong D1 (`auth_throttle`), chỉ ghi khi sai hoặc chạm ngưỡng.

| Khóa | Ngưỡng | Hậu quả |
|---|---|---|
| `login:p:<sđt>` | 5 lần sai / 15 phút | khóa SĐT 15 phút, `429` + `Retry-After` |
| `login:ip:<ip>` | 20 lần sai / 15 phút | khóa IP 15 phút |
| `register:ip:<ip>` | 5 / giờ, dùng chung cho `/auth/register` và `/auth/register-guardian` | `429` + `Retry-After` |
| `workspace:user:<user>` | tạo workspace (`POST /workspaces`), cùng chính sách 5 / giờ | `429` + `Retry-After` |

Đăng nhập đúng xoá bộ đếm của SĐT. Khi SĐT không tồn tại vẫn băm một chuỗi giả để thời gian trả lời và bộ đếm giống SĐT tồn tại. Giới hạn chung theo IP cho phần còn lại là việc của quy tắc rate limiting ở Cloudflare (ngoài mã, chưa cấu hình).

## 4. Xác thực và phiên

Hàm băm mật khẩu: PBKDF2-HMAC-SHA256, số vòng cấu hình (mặc định 30.000 để đăng nhập vừa gói Cloudflare Free; số vòng lưu theo từng hash, hash cũ vẫn đăng nhập được và được băm lại khi đăng nhập thành công); xem `stack-and-cpu.md` mục 4. Giáo viên chỉ đổi mật khẩu của chính mình; không có đường cấp/đặt lại mật khẩu cho người khác trong app. Quy tắc mật khẩu: 8–128 ký tự, không trùng SĐT.

### POST /auth/register — đăng ký workspace
Ai gọi: `Public` (giới hạn `register:ip`). Không có mã đăng ký hay lời mời: SĐT + mật khẩu là đủ; trường `registration_code` (nếu client cũ còn gửi) bị bỏ qua.
```json
// request
{ "phone": "0900000001", "password": "example-Pass-123", "display_name": "Giáo viên Mẫu", "workspace_name": "Lớp riêng Mẫu" }
// 201
{ "token": "qlh_EXAMPLE_NOT_A_REAL_TOKEN", "expires_at": "2027-04-19T03:00:00.000Z",
  "user": { "id": "usr_1", "phone": "+84900000001", "display_name": "Giáo viên Mẫu", "must_change_password": false },
  "memberships": [ { "id": "mem_1", "workspace": { "id": "ws_1", "name": "Lớp riêng Mẫu" },
      "role": { "id": "role_admin", "name": "Admin", "system_key": "admin", "scope_kind": "workspace" } } ],
  "active_membership_id": "mem_1" }
```
Một `batch`: workspace, 4 role mặc định + quyền, user, membership Admin, phiên. Lỗi: `409 conflict` `details.reason = "phone_registered"` (SĐT đã có tài khoản ⇒ đăng nhập rồi dùng `POST /workspaces`), `422 weak_password`.

### POST /auth/register-guardian — phụ huynh tự đăng ký
Ai gọi: `Public` (giới hạn `register:ip`, chung với `/auth/register`). Quyết định 2026-10-22 (giữ nguyên sau khi cân nhắc siết ngày 2026-10-23, đã huỷ).
```json
// request
{ "phone": "0900000002", "password": "example-Pass-123", "display_name": "Phụ huynh bé An" }
// 201 (cùng hình dạng POST /auth/login)
{ "token": "qlh_EXAMPLE_NOT_A_REAL_TOKEN", "expires_at": "2027-04-20T03:00:00.000Z",
  "user": { "id": "usr_2", "phone": "+84900000002", "display_name": "Phụ huynh bé An", "must_change_password": false },
  "memberships": [ {…role Phụ huynh…} ], "active_membership_id": "mem_5" }
```
Phụ huynh đặt mật khẩu một lần, không mật khẩu tạm, không bắt đổi (`must_change_password = false`). Không tạo workspace. Một `batch`: tạo `users`, tạo `guardian_student` cho **mọi** học sinh có `parent_phone` trùng SĐT ở **mọi** workspace, tạo membership role Phụ huynh cho từng workspace có liên kết (liên kết trước membership, theo trigger `membership_guardian_needs_link`), tạo phiên. `active_membership_id` điền khi đúng một membership; hai workspace trở lên ⇒ `null` (chọn vai trò). SĐT chưa khớp hồ sơ nào: vẫn `201`, `memberships: []`, `active_membership_id: null` (client báo "chưa có con nào được liên kết"); khi giáo viên khai SĐT đó cho một học sinh về sau thì liên kết tự động. Chống dò SĐT bằng throttle `register:ip`. Lỗi: `409 conflict` `details.reason = "phone_registered"`, `422 validation_error` (`details.fields.phone`, `weak_password`), `429`. Rủi ro đã biết, chấp nhận tới phase OTP: ai biết SĐT có thể đăng ký trước chủ SĐT.

**Liên kết sau đó.** Khi giáo viên thêm học sinh có `parent_phone` hoặc sửa SĐT (mục 5.2), máy chủ liên kết các user đã có tài khoản với SĐT đó, tạo hoặc bật lại membership Phụ huynh của workspace trong cùng batch (liên kết trước, membership sau), tăng `scope_epoch`. Gỡ liên kết khi đổi SĐT: user mất liên kết cuối trong workspace ⇒ membership `disabled`, tăng `scope_epoch`, thu hồi các phiên gắn membership đó và xoá device token tương ứng (client nhận `401`/đăng nhập lại); được liên kết lại thì membership bật lại.

### POST /workspaces — tạo thêm workspace
Ai gọi: mọi người dùng đã đăng nhập (không bị `must_change_password`); giới hạn `workspace:user` (`429`).
```json
{ "workspace_name": "Lớp riêng thứ hai" }
// 201: { "membership": { "id": "mem_9", "workspace": {…}, "role": {…Admin…} } }
```

### POST /auth/login
Ai gọi: `Public` (giới hạn `login:*`).
```json
// request
{ "phone": "0900000001", "password": "example-Pass-123", "device_label": "iPhone của cô Mẫu" }
// 200
{ "token": "qlh_EXAMPLE_NOT_A_REAL_TOKEN", "expires_at": "2027-04-19T03:00:00.000Z",
  "user": { "id": "usr_1", "phone": "+84900000001", "display_name": null, "must_change_password": true },
  "memberships": [ {…}, {…} ],
  "active_membership_id": null }
```
Một vai trò hoạt động ⇒ `active_membership_id` điền sẵn. Từ hai vai trò trở lên ⇒ `null`, client hiển thị màn chọn vai trò (spec mục 4) rồi gọi `PUT /session/membership`. Phiên hết hạn sau 180 ngày không dùng (gia hạn khi còn dưới 150 ngày). Lỗi: `401 invalid_credentials`, `403 account_disabled`, `429`.

### POST /auth/logout
Ai gọi: mọi người dùng đã đăng nhập. Thu hồi phiên hiện tại `204`. (Client chặn đăng xuất khi còn lệnh chờ chưa đồng bộ, spec mục 5.3; máy chủ không kiểm.)
Trong cùng batch: `UPDATE auth_sessions SET revoked_at` + `DELETE device_tokens WHERE auth_session_id = <phiên đó>` (cascade `push_deliveries`); không gỡ đăng ký của phiên khác. **Cần mạng + phải nhận `204` trước khi client đổi danh tính/cache/UI**; mất mạng thì giữ identity hiện tại và báo cần mạng, không xếp thao tác này vào outbox nghiệp vụ.

### POST /auth/change-password
Ai gọi: mọi người dùng đã đăng nhập (kể cả khi `password_change_required`).
```json
{ "current_password": "example-Pass-123", "new_password": "another-Pass-456" }
// 200: { "must_change_password": false }
```
Thu hồi mọi phiên khác của user; phiên hiện tại giữ. Tốn hai lần băm (kiểm mật khẩu cũ + băm mới). Lỗi: `401 invalid_credentials` (mật khẩu cũ sai, tính vào `login:p`), `422 weak_password`.

### GET /me
Ai gọi: mọi người dùng đã đăng nhập (kể cả khi `password_change_required`).
```json
{ "user": { "id": "usr_1", "phone": "+84900000001", "display_name": "Giáo viên Mẫu", "must_change_password": false },
  "active_membership_id": "mem_1",
  "memberships": [ { "id": "mem_1", "status": "active", "scope_epoch": 3, "workspace": {…},
      "role": { "id": "role_admin", "name": "Admin", "scope_kind": "workspace", "system_key": "admin" },
      "permissions": { "classes": "write", "students": "write", "sessions_attendance": "write", "scores": "write", "lectures": "write", "comments_reports": "write", "send_comments": "write" } } ] }
```
Client dùng `permissions` để ẩn/khóa nút và `scope_epoch` để so với `epoch` đồng bộ.

**Membership phụ huynh** (`role.scope_kind = "linked_students"`; cùng hình dạng ở `/auth/login`, `/auth/register-guardian`, `/me`) có thêm `students: [{ "id": "stu_1", "name": "Nguyễn Văn An", "class_id": "cls_1", "class_name": "Lớp 6A", "teacher_name": "Cô Lan" }]` (`teacher_name` có thể `null`) — chỉ các con được liên kết của đúng user trong đúng workspace của membership đó, không `parent_phone`. Membership nhân sự không có trường `students`.

### PUT /session/membership — chọn / đổi vai trò
Ai gọi: mọi người dùng đã đăng nhập. **Cần mạng.**
```json
{ "membership_id": "mem_2" }   // 200: { "active_membership_id": "mem_2", "device_registration_cleared": true }
```
`404` nếu membership không thuộc user hoặc đã bị vô hiệu. Server ghi membership mới vào phiên **và** gỡ các `device-tokens` gắn với đúng `auth_session` hiện tại (cascade deliveries) trong cùng batch, rồi mới trả 200; thiết bị/phiên khác của user không bị gỡ. `device_registration_cleared = true` nghĩa là thiết bị này phải `PUT /device-tokens` lại theo membership mới; chưa đăng ký lại chỉ mất push, không cản dùng app. Client chỉ đổi danh tính/cache/UI sau khi nhận 200.

### Quên mật khẩu và đặt lại mật khẩu
Bản đầu không có endpoint nào cấp, đặt lại hay gửi mật khẩu cho người khác (quyết định 2026-10-22). `POST /students/{id}/guardian-credentials` đã bỏ (route không tồn tại, `404`). Người vận hành đặt lại thủ công trên D1 (đặt `password_hash` mới, có thể đặt `must_change_password = 1`, thu hồi phiên): xem `runbook-reset-password.md`. Cờ `must_change_password` còn lại chỉ phục vụ việc đặt lại thủ công. Gửi OTP để lấy lại mật khẩu là phase sau. Phụ huynh tự đăng ký bằng `POST /auth/register-guardian` (trên).

## 5. Tài nguyên

Cột "Ai gọi" dùng quy ước mục 0. Mọi tài nguyên dưới đây đã lọc theo workspace, vai trò và phạm vi. Dữ liệu offline-được (điểm danh, điểm, bài kiểm tra, phiếu, BTVN) **ghi chỉ qua `POST /sync/push`** (mục 6) để chỉ có một đường ghi idempotent; các `GET` bên dưới trả cùng hình dạng thực thể như `sync/pull` (mục 6.4) và dành cho client không cần cache (kiểm thử, công cụ), client chính đọc qua đồng bộ.

### 5.1 Lớp
| Endpoint | Ai gọi | Ghi chú |
|---|---|---|
| `GET /classes?status=active` | `classes:read`; Phụ huynh (chỉ lớp của con, trả `id,name,status,teacher_name`) | Admin thấy mọi lớp; nhân sự thấy lớp được gán |
| `POST /classes` | `classes:write` | tạo lớp, gán cho người tạo, sinh buổi 8 tuần; `id` tuỳ chọn |
| `GET /classes/{id}` | như trên | |
| `PATCH /classes/{id}` | `classes:write` | đổi tên, lịch lặp, `status: "archived"` |

```json
// POST /classes
{ "name": "Lớp 6A (ví dụ)", "weekdays": [2, 4], "start_time": "18:00" }
// 201 (đặt `id` UUID tuỳ chọn trong body, xem "`id` do client gửi" bên dưới)
{ "id": "cls_1", "name": "Lớp 6A (ví dụ)", "status": "active", "weekdays": [2, 4], "start_time": "18:00", "version": 1 }
// PATCH /classes/cls_1  (sửa lịch: chỉ đổi buổi chưa diễn ra, giữ buổi đã diễn ra, đã hủy và buổi lẻ — data-model mục 4)
{ "weekdays": [3, 5], "start_time": "17:30", "base_version": 1 }
```
Lưu trữ lớp cần mạng (spec architecture mục 5).

**`id` do client gửi (tạo lớp, học sinh, buổi lẻ).** `POST /classes`, `POST /classes/{id}/students`, `POST /classes/{id}/sessions` nhận thêm `id` tuỳ chọn (UUID; client sinh một lần cho mỗi thao tác tạo và giữ qua các lần gửi lại). Không gửi `id` ⇒ máy chủ sinh, `201`, như trước. Có `id` ⇒ sau xác thực, kiểm quyền và kiểm phạm vi/lớp cha (như khi không có `id`): `id` đã có ở cùng workspace (và cùng lớp với học sinh/buổi) ⇒ `200` với bản ghi hiện có, không ghi gì (không `change_log`, không chạy lại sinh buổi/liên kết phụ huynh); `id` đã dùng ở nơi khác ⇒ `409 id_conflict` (không `details`); chưa có ⇒ tạo với `id` đó, `201`. Ghi đồng thời cùng `id` chỉ tạo một bản ghi, các lần còn lại nhận `200`. `id` không phải UUID ⇒ `422 validation_error`, `details.fields.id = "must_be_uuid"`. Gửi lại `id` của lớp do người khác tạo mà người gọi ngoài phạm vi ⇒ `409 id_conflict`; người đã bị thu hồi quyền/gỡ khỏi lớp nhận `403`/`404` như thường. Lớp: `200` trả bản hiện tại (có thể đã sửa sau lần tạo).

### 5.2 Học sinh
| Endpoint | Ai gọi | Ghi chú |
|---|---|---|
| `GET /classes/{id}/students?status=` | `students:read` | gồm học sinh đã nghỉ khi không lọc |
| `POST /classes/{id}/students` | `students:write` | `parent_phone` tuỳ chọn; `id` tuỳ chọn (mục 5.1) |
| `GET /students/{id}` | `students:read`; Phụ huynh (con của mình, không có `parent_phone`) | |
| `PATCH /students/{id}` | `students:write` | đổi SĐT ⇒ gỡ liên kết cũ, bump `scope_epoch` các bên bị ảnh hưởng; `status:"left"` + `left_at` |

```json
// POST /classes/cls_1/students
{ "name": "Nguyễn Văn An (ví dụ)", "parent_phone": "0900000002", "enrolled_at": "2026-10-21" }
// 201
{ "id": "stu_1", "class_id": "cls_1", "name": "Nguyễn Văn An (ví dụ)", "parent_phone": "+84900000002",
  "enrolled_at": "2026-10-21", "left_at": null, "status": "active", "version": 1 }
// PATCH /students/stu_1  — đánh dấu nghỉ (giữ lịch sử điểm danh, điểm)
{ "status": "left", "left_at": "2026-12-05" }
```
Nếu đã có user phụ huynh dùng SĐT mới thì liên kết ngay; chưa có thì liên kết khi phụ huynh đăng ký (`POST /auth/register-guardian`, mục 4). Sửa SĐT: gỡ liên kết cũ, liên kết user của SĐT mới; membership Phụ huynh được tạo/bật lại hoặc vô hiệu theo liên kết còn lại (mục 4).

### 5.3 Buổi học
| Endpoint | Ai gọi | Ghi chú |
|---|---|---|
| `GET /classes/{id}/sessions?from=&to=&limit=&cursor=` | `sessions_attendance:read`; Phụ huynh (lớp của con) | không có `note` với Phụ huynh |
| `GET /calendar?from=&to=` | `sessions_attendance:read`; Phụ huynh (lớp của con) | buổi của mọi lớp trong phạm vi, cho tab Lịch. **Phụ huynh chỉ nhận buổi của các lớp có con được liên kết** (`guardian_student` → `students.class_id`); không trả buổi/lớp khác, không trả `note`, không trả tên/ID lớp không liên quan. Cùng quy tắc với `authz-matrix.md` mục 2.2 (một dòng cho cả hai tài liệu) |
| `POST /classes/{id}/sessions` | `sessions_attendance:write` | buổi lẻ (`is_makeup` tuỳ chọn); `id` tuỳ chọn (mục 5.1) |
| `PATCH /sessions/{id}` | `sessions_attendance:write` | sửa buổi lẻ (`date`, `start_time`, `note`, `base_version?`); chỉ buổi `origin = manual` và `status = planned`; cần mạng |
| `POST /sessions/{id}/cancel` | `sessions_attendance:write` | một nút; chỉ buổi `planned`; không đảo ngược |

```json
// POST /classes/cls_1/sessions
{ "date": "2026-10-28", "start_time": "19:00", "is_makeup": true, "note": "" }
// 201
{ "id": "ses_9", "class_id": "cls_1", "date": "2026-10-28", "start_time": "19:00", "origin": "manual",
  "is_makeup": true, "status": "planned", "note": "", "version": 1 }
// PATCH /sessions/ses_9  (cần ít nhất một trường)
{ "date": "2026-10-29", "start_time": "18:30", "note": "Học bù", "base_version": 1 }
// 200
{ "id": "ses_9", "class_id": "cls_1", "date": "2026-10-29", "start_time": "18:30", "origin": "manual",
  "is_makeup": true, "status": "planned", "session_number": 7, "note": "Học bù", "version": 2 }
// POST /sessions/ses_9/cancel → 200 { "id": "ses_9", "status": "cancelled", "version": 2 }
```
Lỗi `PATCH /sessions/{id}`: `409 conflict` `session_not_editable` (buổi định kỳ, đã diễn ra hoặc đã hủy), `session_exists` (trùng lớp+ngày+giờ), `409 version_conflict` (`base_version` lệch); `422 validation_error` `date_in_past` (ngày trước hôm nay theo múi giờ workspace), định dạng `date`/`start_time`/`note`. Lỗi: `409 conflict` `session_exists` (trùng lớp+ngày+giờ), `session_not_planned` (đã diễn ra/đã hủy), `session_has_data` (buổi còn phần BTVN). Hủy buổi làm buổi chấm BTVN chuyển sang buổi chưa hủy kế tiếp (suy ra khi đọc) và phát lại các kết quả chấm vừa lộ ra cho phụ huynh (mục 6.5).

### 5.4 Đọc dữ liệu của offline-được
| Endpoint | Ai gọi | Trả |
|---|---|---|
| `GET /sessions/{id}/attendance` | `sessions_attendance:read`; Phụ huynh (chỉ con) | dòng `attendance` |
| `GET /students/{id}/attendance?from=&to=&limit=&cursor=` | `sessions_attendance:read`; Phụ huynh (chỉ con) | dòng `attendance` của một em trong khoảng ngày, kèm `date`/`start_time` của buổi (`JOIN class_sessions`), sắp theo `date, start_time`; dùng cho màn "điểm danh theo tháng" của phụ huynh và tổng quan; bổ sung khi rà B3 (trước đây chỉ có điểm danh theo buổi) |
| `GET /classes/{id}/tests` | `scores:read`; Phụ huynh | bài chưa lưu trữ (nhân sự thêm `?archived=1`) |
| `GET /tests/{id}/scores` | `scores:read`; Phụ huynh (chỉ con) | dòng `score` |
| `GET /sessions/{id}/slips` | `comments_reports:read`; Phụ huynh (chỉ con, chỉ `status=sent`) | dòng `slip` |
| `GET /sessions/{id}/homework` | `comments_reports:read`; Phụ huynh | `{ "sections": [...], "grades": [...] }`; phụ huynh chỉ nhận `grades` của em đã lộ ra (data-model mục 2.5) |

```json
// GET /sessions/ses_3/attendance
{ "items": [ { "session_id": "ses_3", "student_id": "stu_1", "status": "late", "note": "", "late_at": "18:12", "version": 2, "updated_at": "2026-10-21T11:15:00.000Z" } ] }
```

**Cảnh báo vắng 2 buổi liên tiếp** (spec mục 8, "cảnh báo vắng 2 buổi trong app") tính ở client từ dòng `attendance` + danh sách buổi `status='held'` đã có trong cache (không có endpoint riêng, không lưu cờ). Định nghĩa chính xác (`excused` có tính là vắng không, buổi hủy có chen vào giữa không) **chưa chốt** — xem Q15.

### 5.5 Lệnh ghi qua đồng bộ (tham chiếu)
Điểm danh, điểm, bài kiểm tra (tạo/sửa/xoá-hoặc-lưu-trữ), phiếu buổi học (nháp, gửi), phần BTVN và chấm BTVN: xem danh mục lệnh ở mục 6.2.

## 6. Đồng bộ

Hợp đồng chung cho iOS và web (Dexie hoặc kho cục bộ iOS không ảnh hưởng hợp đồng). Quy tắc nền: client ghi vào kho cục bộ và hàng đợi cùng lúc; máy chủ áp lệnh idempotent; client kéo thay đổi bằng `cursor`; hai thiết bị sửa cùng ô thì **lệnh tới máy chủ sau cùng thắng** (đã chốt 2026-10-21, xem 6.5).

### 6.1 `POST /sync/push`
Ai gọi: mọi người dùng đã đăng nhập; **từng lệnh** kiểm quyền theo `membership_id` và nhóm quyền của loại lệnh. Tối đa 50 lệnh/request, xử lý theo thứ tự mảng.

```json
// request
{ "membership_id": "mem_1", "device_id": "5e0a…", "commands": [
  { "id": "c1a2…", "type": "attendance.set", "base_version": 0, "created_at": "2026-10-21T11:00:01.000Z",
    "payload": { "session_id": "ses_3", "student_id": "stu_1", "status": "late", "late_at": "18:12", "note": "" } },
  { "id": "c1a3…", "type": "score.set", "base_version": 2, "created_at": "2026-10-21T11:00:05.000Z",
    "payload": { "test_id": "tst_1", "student_id": "stu_1", "value": 12.5 } } ] }
// 200 (HTTP 200 cả khi có lệnh bị từ chối; lỗi mức request mới là 4xx)
{ "epoch": 3, "cursor": 1187, "results": [
  { "id": "c1a2…", "status": "applied", "version": 1 },
  { "id": "c1a3…", "status": "applied", "version": 3 } ] }  // lệnh tới sau thắng, kể cả khi base_version cũ
```

`status` của từng lệnh:

| `status` | Ý nghĩa | Client làm |
|---|---|---|
| `applied` | đã áp dụng; `version` = phiên bản mới (không đổi nếu `noop: true`: giá trị trùng bản hiện tại) | xoá lệnh khỏi hàng đợi |
| `duplicate` | `id` đã được **áp dụng** trước đó (mạng đứt giữa chừng); kèm `original_status` và kết quả đầu | coi như đã nhận |
| `rejected` | `error.code` ∈ bộ mã mục 1 (gửi lại một `id` đã bị từ chối trả lại đúng `rejected` với `error` gốc, không bao giờ `duplicate`; `id` trùng với lệnh của workspace khác trả `rejected` `conflict` `details.reason = "retry"`, không lộ gì thêm) (ví dụ `forbidden`, `not_found`, `validation_error` + `details.reason`) | **giữ lệnh**, đánh dấu lỗi, hiện lỗi cho người dùng; không tự xoá, không tự thử lại với cùng ID |

`status = "conflict"` không còn xuất hiện (bỏ xung đột 2026-10-21): ô đã bị thiết bị khác sửa thì lệnh vẫn `applied`, giá trị của lệnh tới máy chủ sau cùng thắng. Máy chủ không ghi `sync_conflicts` và không trả `conflict_id`/`server`.

Lỗi mức request: `401`, `403 password_change_required`/`account_disabled`, `404` membership không thuộc user hoặc đã bị vô hiệu (client ẩn cache của membership đó), `413`, `422` (lô sai cấu trúc), `429`.

**Quy tắc xử lý (chuẩn, để worker viết và test):**
1. Kiểm phiên, membership, `must_change_password`. Đọc một lần: quyền role, lớp được gán, trạng thái các bản ghi bị tác động (một `batch` đọc).
2. Với mỗi lệnh theo thứ tự: tra `applied_commands` (trùng ⇒ `duplicate`); kiểm `created_at` không cũ quá 90 ngày; kiểm quyền (nhóm, mức, lớp trong phạm vi); kiểm ràng buộc nghiệp vụ; so `base_version`.
3. Ghi: **mỗi lệnh là một `batch` D1 riêng, atomic trong phạm vi một lệnh** (sửa B-02). Mỗi `batch` gồm câu `UPDATE/INSERT … WHERE version = :phiên_bản_đọc_được` của dữ liệu, `INSERT INTO applied_commands … SELECT … WHERE changes() > 0`, và (qua trigger) `change_log` + lịch sử. Lô HTTP nhiều lệnh **không** atomic toàn bộ: lệnh chạy trước đã commit thì **không** bị hoàn lại khi lệnh sau thất bại; lệnh bị từ chối (quyền, trùng UUID, vi phạm ràng buộc) không chặn các lệnh còn lại. `PRIMARY KEY` của `applied_commands` chỉ bảo vệ hai request chạy song song cùng UUID: `INSERT` đó thất bại ⇒ riêng batch của lệnh ấy không ghi gì.
4. Lệnh nào không ghi được dòng nào (thiết bị khác chen vào giữa bước 1 và 3) được đánh giá lại ở vòng sau (tối đa 3 vòng) với bản đọc mới — thường là áp dụng được ngay vì lệnh tới sau thắng; hết vòng thì `rejected` với `error.code = "conflict"`, `details.reason = "retry"`.
5. Mỗi lệnh độc lập: một lệnh bị từ chối không chặn lệnh khác. Lệnh phụ thuộc (tạo bài rồi nhập điểm) bị từ chối `not_found` nếu lệnh tạo bị từ chối.

**Hệ quả cho client (B-02):** vì lô không atomic, xác nhận cũng không theo lô — client xoá **từng** lệnh khi nhận kết quả của riêng nó (`applied`/`duplicate`), giữ lệnh `rejected`, và gửi lại cả lô sau khi mất mạng giữa chừng (máy chủ trả `duplicate` cho lệnh đã áp dụng). Không được xoá cả lô sau một response, không được giả định "lô sau thất bại thì lô trước bị hoàn lại".

**So khớp `base_version` cho các "ô"** (`attendance.set`, `score.set`, `slip.set`, `homework.grade.set`; `V` = phiên bản máy chủ, `B` = `base_version`):

| Tình huống | Kết quả |
|---|---|
| ô chưa có, `B = 0` | tạo, `version = 1` |
| ô chưa có, `B > 0` | `rejected` `not_found` |
| giá trị giống bản hiện tại (bất kể `B`) | `applied` với `noop: true`, `version` không đổi, không ghi lịch sử/thông báo |
| `B = V` và giá trị khác | áp dụng, `version = V + 1` |
| `B < V` và giá trị khác | áp dụng, `version = V + 1` — **lệnh tới sau thắng**, không tạo xung đột |
| `B > V` | `rejected` `validation_error` `base_version_ahead` |

**Lệnh đối tượng** (`test.update`, `test.delete`, `homework.section.upsert` khi sửa, `homework.section.delete`): cùng quy tắc **lệnh tới máy chủ sau cùng thắng** — `B` cũ hơn (kể cả `B = 0` mà đối tượng đã có) vẫn `applied` và `version` tăng theo bản máy chủ đang giữ, ghi đè nội dung mới, không trả `version_conflict` và không giữ hai bản. Chỉ `B > V` bị `rejected` `validation_error` `base_version_ahead`. Lỗi quyền, lỗi hợp lệ và ràng buộc nghiệp vụ vẫn `rejected` như mục 6.2 (bài đã lưu trữ, đối tượng không tồn tại, `max_below_score`, `section_has_grades`…).

### 6.2 Danh mục lệnh

Nhóm quyền yêu cầu mức `write` (và lớp trong phạm vi). Mọi lệnh có thêm điều kiện học sinh/buổi/bài thuộc cùng workspace, cùng lớp.

| `type` | `payload` | `base_version` | Nhóm | Kiểm tra riêng |
|---|---|---|---|---|
| `attendance.set` | `session_id, student_id, status(present\|late\|excused\|absent), note?, late_at?` | phiên bản ô (0 nếu mới) | `sessions_attendance` | buổi chưa hủy; `date ≤ hôm nay` (`session_not_started`); em đang học vào ngày đó (`student_not_enrolled_on_date`); `late_at` chỉ khi `late`; đặt buổi `planned` → `held` |
| `test.create` | `id, class_id, name, date, max?(1..1000, mặc định 15)` | 0 | `scores` | `id` chưa dùng |
| `test.update` | `id, name?, date?, max?` | phiên bản bài | `scores` | không hạ `max` dưới điểm cao nhất đã nhập (`max_below_score`) |
| `test.delete` | `id` | phiên bản bài | `scores` | chưa có điểm ⇒ xoá hẳn; đã có điểm (kể cả 0) ⇒ `archived = 1`. Kết quả cho biết `outcome: "deleted" \| "archived"` |
| `score.set` | `test_id, student_id, value (0..max, bước 0,5) \| null` | phiên bản ô | `scores` | bài chưa lưu trữ; `invalid_score_step` nếu không là bội 0,5 (vd 7,3); `invalid_score` nếu âm/không phải số; `score_above_max`; `null` = "Chưa có điểm" |
| `slip.set` | `session_id, student_id, stars(1..3)\|null, note` | phiên bản ô | `comments_reports` | em đang học vào ngày buổi; sau khi đã gửi vẫn sửa được, giữ `sent` |
| `slip.send` | `session_id, student_ids[]` (≤ 50) | — | `comments_reports` **và** `send_comments` (thiếu `send_comments`: lệnh `rejected` `forbidden`) | từng em: cần `stars`; bỏ qua em đã gửi. Kết quả `sent[]`, `skipped[{student_id, reason}]` (`stars_required`, `already_sent`). Tạo thông báo; phát lại kết quả chấm BTVN vừa lộ ra |
| `homework.assign` | `session_id, sections[{id, kind, title, description}]` (1..4 phần mới) | 0 cho từng phần | `comments_reports` | một lần giao atomic: validate toàn bộ phần và quyền trước, tạo các phần + inbox theo command_id cùng batch; lỗi bất kỳ rollback cả lệnh, không tạo thông báo; retry không giao/gửi trùng |
| `homework.section.upsert` | `id, session_id, kind, title, description` | 0 nếu tạo, phiên bản phần nếu sửa | `comments_reports` | buổi chưa hủy; một phần mỗi `kind` mỗi buổi; tạo một phần tương đương một lần giao, sửa phần đã có không tạo push |
| `homework.section.delete` | `id` | phiên bản phần | `comments_reports` | `section_has_grades` nếu đã có em được chấm |
| `homework.grade.set` | `section_id, student_id, level(excellent\|done\|not_done)\|null` | phiên bản ô | `comments_reports` | em vắng buổi giao vẫn chấm được |
| `conflict.resolve` | `conflict_id, choice("server"\|"client")` | — | — | không dùng ở MVP: luôn `rejected` `validation_error` `details.reason = "conflicts_not_used"`. Loại lệnh vẫn được nhận để lệnh cũ của client chỉ bị từ chối riêng nó, không làm hỏng cả lô |

`slip.send` xếp hàng được khi mất mạng (spec architecture mục 5: hiện một thông báo ngắn "sẽ gửi khi có mạng"); `created_at` của lệnh chỉ để ghi nhận, **không** dùng để sắp xếp hay phân xử xung đột (thứ tự là lúc máy chủ nhận lệnh). Cột `base_version` ở bảng trên là phiên bản client đã thấy lúc sửa; **cũ hơn không làm lệnh bị từ chối** ở bất kỳ loại lệnh nào (ô hay đối tượng) — xem 6.1.

Ví dụ kết quả `slip.send`:
```json
{ "id": "c2b1…", "status": "applied", "sent": ["stu_1", "stu_2"], "skipped": [ { "student_id": "stu_3", "reason": "stars_required" } ] }
```

### 6.3 `GET /sync/pull`
Ai gọi: mọi người dùng đã đăng nhập; dữ liệu lọc theo `membership_id` (staff: lớp được gán / Admin tất cả; phụ huynh: con được liên kết + lớp của con).

`GET /sync/pull?membership_id=mem_1&cursor=1042&epoch=3&limit=200`
```json
{ "cursor": 1187, "epoch": 3, "has_more": false, "server_time": "2026-10-21T11:20:00.000Z",
  "upserts": {
    "attendance": [ { "session_id": "ses_3", "student_id": "stu_1", "status": "late", "note": "", "late_at": "18:12", "version": 1, "updated_at": "2026-10-21T11:15:00.000Z" } ],
    "score":      [ { "test_id": "tst_1", "student_id": "stu_1", "value": 14, "version": 3, "updated_at": "…" } ] },
  "deleted": [ { "entity": "test", "k1": "tst_7", "k2": "" } ] }
```
- `cursor` trong response là điểm tiếp theo; `has_more: true` ⇒ gọi tiếp ngay. `limit` mặc định 200, tối đa 300.
- Mỗi trang là **một** `batch` D1: một câu lấy khoảng `change_log` rồi mỗi thực thể một câu JOIN theo khóa chính (`seq` trong `(cursor, upto]`). Không có N+1.
- `deleted` gồm: dòng `op = delete` trong `change_log`, và mọi `(entity, k1, k2)` có trong khoảng `change_log` nhưng bản ghi hiện tại **không còn hiện với người xem** (xoá, bài lưu trữ với phụ huynh, phiếu chưa gửi, kết quả BTVN chưa lộ ra). Client xoá bản cục bộ tương ứng. Quy tắc chung này thay cho việc từng thực thể tự khai.
- `epoch` = `memberships.scope_epoch`. Client gửi `epoch` đã biết; lệch ⇒ `409 resync_required` (`details.reason = "scope_changed"`): client xoá cache của membership đó rồi chạy snapshot (mục 6.6). Membership bị vô hiệu ⇒ `404`.
- **Cursor cũ hơn cửa sổ lưu:** `cursor < workspaces.change_floor` (dòng `change_log` cũ hơn 120 ngày đã bị cron dọn, `data-model.md` mục 2.8) ⇒ `409 snapshot_required`; client cũng xoá cache của membership đó rồi chạy lại `GET /sync/snapshot` (mục 6.6), không cố nối `pull` từ cursor cũ. Hai mã tách nhau để client/log phân biệt "mất quyền phạm vi" với "log bị dọn"; cả hai đều dẫn tới tải đầu lại. Đổi vai trò, gỡ lớp, vô hiệu tài khoản có hiệu lực ngay ở máy chủ; cache offline được ẩn ở lần đồng bộ/mở app kế tiếp (spec mục 4).
- Tần suất gọi gợi ý (ngân sách request free): khi mở app, khi quay lại app/hiển thị lại (focus, `visibilitychange`), ngay sau mỗi `push`, và định kỳ 60 giây khi app hiển thị và có mạng (dừng khi ẩn/nền; quay lại thì kéo ngay).

### 6.4 Hình dạng thực thể

Mọi thực thể có `version` và (với "ô") `updated_at`. `weekdays` là mảng ISO. Cột "Phụ huynh" ghi khác biệt so với nhân sự.

| `entity` | Trường | Phụ huynh |
|---|---|---|
| `class` | `id, name, status, weekdays, start_time, teacher_name, version` | chỉ lớp của con. `teacher_name`: tên hiển thị giáo viên được gán sớm nhất có tên, nếu không có thì Admin đầu tiên có tên, ngược lại `null` (không SĐT/id) |
| `student` | `id, class_id, name, parent_phone, enrolled_at, left_at, status, version` | chỉ con của mình; **không** có `parent_phone` |
| `class_session` | `id, class_id, date, start_time, origin, is_makeup, status, note, version` | không có `note` |
| `attendance` | `session_id, student_id, status, note, late_at, version, updated_at` | chỉ con |
| `test` | `id, class_id, name, date, max, archived, version` | bài `archived` ⇒ vào `deleted` |
| `score` | `test_id, student_id, value\|null, version, updated_at` | chỉ con |
| `slip` | `session_id, student_id, stars\|null, note, status, sent_at, version, updated_at` | chỉ con, chỉ `status = sent` |
| `homework_section` | `id, class_id, session_id, kind, title, description, version` | thấy ngay khi lưu |
| `homework_grade` | `section_id, student_id, level\|null, version, updated_at` | chỉ con, chỉ khi phiếu buổi chấm đã gửi (data-model mục 2.5) |
| `report` | `id, class_id, student_id, month, status, general_comment, needs_republish, publication_count, published_at, version` | **không** có thực thể này |
| `report_publication` | `id, report_id, class_id, student_id, month, publication_no, published_at, snapshot` | chỉ con, mọi bản đã phát hành (client dùng bản số lớn nhất) |

Không còn thực thể `conflict`: bỏ xung đột ở MVP (6.5).

Câu mẫu theo sao không nằm trong dữ liệu (client cố định trong mã). Điểm trung bình không tồn tại ở bất kỳ endpoint nào (spec mục 3.1).

### 6.5 Lệnh tới máy chủ sau cùng thắng và phát lại

- **Mọi lệnh đồng bộ** (bốn loại "ô": điểm danh, điểm, phiếu, chấm BTVN; và lệnh đối tượng: `test.update/delete`, `homework.section.upsert/delete`, `slip.send`) **không còn xung đột** (đã chốt 2026-10-21): lệnh có `base_version` cũ vẫn được áp dụng và `version` tăng; giá trị của lệnh **tới máy chủ sau cùng** thắng. `test.create`/`homework.assign` là lệnh tạo nên vẫn đòi `id` chưa tồn tại (`B = 0`), trùng `id` ⇒ `rejected`. Không lưu hai giá trị, không có bước giáo viên chọn, không trả `status = "conflict"`, không ghi `sync_conflicts` (`data-model.md` mục 2.8 đánh dấu bảng này không dùng ở MVP; giữ bảng, không thêm migration). `409 version_conflict` chỉ còn ở `PATCH` REST như mục 1.
- Thứ tự tính theo **lúc máy chủ nhận/ghi lệnh**, không theo giờ thiết bị hay `created_at` của lệnh. Lệnh vẫn idempotent theo UUID; giá trị bị ghi đè không mất dấu vết vì trigger vẫn ghi lịch sử trước/sau (`attendance_history`, `score_history`).
- Lỗi quyền, lỗi hợp lệ và ràng buộc nghiệp vụ (buổi đã hủy, điểm vượt điểm tối đa, bài đã lưu trữ, phần BTVN đã có điểm…) vẫn `rejected` như mục 6.2 — "tới sau thắng" chỉ áp cho giá trị của ô, không bỏ qua kiểm tra nghiệp vụ.
- `conflict.resolve` và thực thể `conflict` bị bỏ khỏi hợp đồng; bảng `sync_conflicts` để nguyên, không dùng.
- **Phát lại để lộ ra** (không có cột "phiên bản hiển thị" nên phải ghi `change_log` thủ công, cùng `batch` với sự kiện gây ra): (a) gửi phiếu của em S ở buổi M ⇒ ghi lại mục `homework_grade` của S cho các phần BTVN buổi mà M là buổi chấm; (b) hủy buổi M ⇒ với buổi N trước đó, buổi chấm đổi sang buổi sau M: ghi lại `homework_grade` của mọi em có ô chấm ở phần giao buổi N (không lọc trạng thái phiếu). Khi `pull`, phụ huynh nhận `upsert` nếu cổng mở (phiếu của em ở buổi chấm mới đã gửi) và `deleted` nếu cổng đóng lại (phiếu ở buổi chấm mới chưa gửi hoặc chưa có): client xoá ô chấm đó khỏi cache; (c) học sinh bị liên kết/gỡ liên kết ⇒ không phát lại, bump `scope_epoch` để tải lại.

### 6.6 `GET /sync/snapshot` — tải đầu / tải lại
Ai gọi: mọi người dùng đã đăng nhập, lọc như `pull`.

1. `GET /sync/snapshot?membership_id=mem_1` → `{ "cursor": 1187, "epoch": 3, "window": { "from": "2026-07-23", "to": "2026-12-16" }, "entities": ["class","student","class_session","test","attendance","score","slip","homework_section","homework_grade","report","report_publication"] }`. `cursor` = `MAX(seq)` đọc **trước** khi tải trang đầu để không mất thay đổi xen giữa. Cửa sổ mặc định: 90 ngày trước tới 56 ngày sau hôm nay ("buổi sắp tới và vài tháng gần nhất"); lớp và học sinh lấy đủ (kể cả em đã nghỉ).
2. `GET /sync/snapshot/{entity}?membership_id=mem_1&after=<key>&limit=300` → `{ "items": [...], "next_after": "<key>" | null }`, sắp theo khóa, phân trang keyset (khóa chính). Thực thể phụ thuộc buổi/bài lọc theo cửa sổ.
3. Xong mọi thực thể: client gọi `pull` từ `cursor` ở bước 1. Bản ghi tới hai lần (từ snapshot và từ pull) áp dụng theo `version` lớn hơn, nên an toàn.

## 7. Thông báo và push (FCM)

Đã chốt 2026-10-21: Worker + D1; Firebase chỉ dùng cho FCM. iOS dùng Firebase Messaging → APNs; PWA/web dùng FCM web token. Không còn endpoint Web Push subscription cũ. Các endpoint token cần phiên đã đổi mật khẩu và membership hiện hành hợp lệ.

| Endpoint | Ai gọi | Ghi chú |
|---|---|---|
| `GET /notifications?limit=&cursor=` | Phụ huynh | inbox chỉ user + membership hiện hành, kiểm liên kết con và quyền đọc còn hiệu lực; không trả token. Mỗi dòng trả `report_id` (chỉ `report_published`) và `test_id` (chỉ `score_updated`), loại khác `null` — DDL đã có hai cột (sửa RQ-03) |
| `POST /notifications/read` | Phụ huynh | `{ "up_to_id": 123 }`; chỉ đánh dấu inbox của chính membership |
| `PUT /device-tokens` | User đã đăng nhập, mọi role | upsert token vào user + membership + phiên hiện hành, lấy danh tính từ phiên, không nhận user/workspace từ body |
| `DELETE /device-tokens/{id}?registration_version=` | Chính chủ đăng ký | `204` nếu đúng user + membership + phiên + version; bản cũ/ngoài phạm vi `404`; không xoá token đã chuyển chủ |

```json
// PUT /device-tokens — dữ liệu giả, không log body
{ "token": "FAKE_FCM_REGISTRATION_TOKEN", "platform": "ios" }
// 200 — chỉ ID quản lý, không phản hồi token
{ "id": "dev_example", "registration_version": 1, "bound_at": "2026-10-21T11:30:00.000Z", "platform": "ios", "updated_at": "2026-10-21T11:30:00.000Z" }
// GET /notifications
{ "items": [
    { "id": 124, "kind": "slip_sent", "student_id": "stu_1", "session_id": "ses_3", "report_id": null, "test_id": null, "created_at": "2026-10-21T11:30:00.000Z", "read_at": null },
    { "id": 125, "kind": "report_published", "student_id": "stu_1", "session_id": null, "report_id": "rep_1", "test_id": null, "created_at": "2026-10-31T10:00:00.000Z", "read_at": null },
    { "id": 126, "kind": "score_updated", "student_id": "stu_1", "session_id": null, "report_id": null, "test_id": "tst_1", "created_at": "2026-10-21T11:40:00.000Z", "read_at": null } ],
  "next_cursor": null }
```
`report_id` là `reports.id` của báo cáo vừa phát hành; `test_id` là bài vừa có điểm. Client dùng đúng ID đó để mở màn tương ứng sau khi tải dữ liệu qua API có phân quyền; `report_id`/`test_id` **không** phải quyền truy cập (vẫn phải kiểm quyền như mọi endpoint khác). Không trả `note`, mức sao, giá trị điểm hay SĐT trong inbox.

Token: chuỗi không rỗng tối đa 4096 ký tự, platform chỉ `ios|web`; sai body `422`, không phiên `401`, membership ngoài user/vô hiệu `404`, bắt buộc đổi mật khẩu `403`. Token chỉ thuộc một user/membership/phiên ở một thời điểm. **Hai loại upsert:** *làm mới cùng binding* (cùng user + membership + phiên) chỉ cập nhật `updated_at` (và `token` nếu là token mới của cùng binding), **không** tăng `registration_version`, **không** đổi `bound_at`, không xoá deliveries — thiết bị không mất quyền nhận job đang chạy; *đổi binding* (chuyển chủ, đổi membership, phiên khác) bump `registration_version`, đặt `bound_at = now`, huỷ delivery cũ trong batch. Đổi role: client đổi vai trò (mục 4) rồi đăng ký lại token theo membership mới; token cũ đã bị gỡ trong batch đổi vai trò nên không dùng được cho role cũ. Đổi token do SDK: gỡ ID cũ rồi PUT token mới; mở app kiểm lại quyền nhận và đăng ký hiện hành. Đăng xuất/thu hồi phiên xoá token gắn với phiên, không gỡ mọi thiết bị của user. Không có API liệt kê token hoặc client gọi FCM send trực tiếp.

### Vòng đời đăng ký và đổi danh tính

- Đổi vai trò, đăng xuất, đổi tài khoản là thao tác **cần mạng có xác nhận** (`PUT /session/membership` 200 / `POST /auth/logout` 204). Máy chủ gỡ đăng ký token của đúng phiên hiện tại trong cùng batch trước khi trả response; client chỉ đổi danh tính/cache/UI sau đó. Có token đang đăng ký mà mất mạng: giữ identity hiện tại, báo cần mạng; không đưa vào outbox nghiệp vụ.
- Đổi tài khoản trên cùng thiết bị: thu hồi phiên/đăng ký cũ (logout ack) rồi mới đăng nhập tài khoản mới. Nếu token bị PUT lại bởi user/membership khác mà chưa qua logout, đường *đổi binding* vẫn bump version, đặt `bound_at` và huỷ deliveries cũ — lớp chặn thứ hai, không phải đường chính.
- **Giới hạn:** push đã được FCM/OS nhận (hoặc đang trên đường) trước khi máy chủ ack thu hồi **không thu hồi từ xa được**. Vì vậy client xoá notification cũ khi đổi danh tính, chỉ mở màn sau khi tải dữ liệu qua API có phân quyền, và không coi payload/notification là quyền truy cập. Không cam kết "không còn push đang bay".

### Mở rộng inbox và trần fanout

- Cron mở rộng inbox theo hai pha. **Freeze bằng CAS, đúng một lần:** caller đọc candidate kèm `event_version`/`ready_at`, rồi (a) *initial* `UPDATE … SET expansion_started_at = :now, expansion_lease_id/until WHERE id = :id AND deliveries_expanded_at IS NULL AND expansion_started_at IS NULL AND ready_at <= :now AND event_version = :event_version_vừa_đọc RETURNING id` — 0 dòng (score commit chen giữa dời `ready_at`/tăng version, hoặc job khác đã freeze) ⇒ bỏ qua, không freeze; (b) *reclaim* chỉ khi `expansion_started_at IS NOT NULL` và lease hết, cập nhật lease nhưng **không** ghi `expansion_started_at` (mốc freeze giữ lần đầu) và vẫn đòi `ready_at <= :now`. Nhóm điểm đóng từ lúc freeze; nhập điểm tiếp theo tạo nhóm mới.
- **Fanout có trần cứng, phân trang trước lọc sau:** trang lấy **toàn bộ** đăng ký của `workspace_id + membership_id + id > :cursor` theo `ORDER BY device_tokens.id LIMIT :ngân_sách_còn_lại`; cờ đủ điều kiện tính trong projection bằng `CASE`/`LEFT JOIN`, **không** đặt predicate vào `WHERE` trước `LIMIT`. Mọi dòng lấy được tính vào trần **20** (kể cả bị skip); cursor tiến theo dòng cuối đã xét dù cả trang bị skip; trang đầy ⇒ chưa xong; chỉ đặt `deliveries_expanded_at` khi trang trả 0 hoặc < `LIMIT` (đã cạn đăng ký). Tối đa **5 inbox**/invocation; không nạp hết token của một inbox vào RAM.
- **Ghi của job buộc vào lease:** xác nhận `expansion_lease_id` trước khi dùng dòng; delivery chèn bằng `INSERT … SELECT … WHERE EXISTS (… id = :nid AND expansion_lease_id = :lease)`; cursor và đánh dấu xong chỉ cập nhật `WHERE expansion_lease_id = :lease` (đánh dấu xong thêm `AND delivery_cursor = :cursor_mới`), cùng một batch — owner cũ sau takeover không mutate được gì.
- Đăng ký đủ điều kiện khi fanout (đánh giá trong projection): membership khớp inbox, `bound_at <= notifications.created_at` (chuyển chủ sau sự kiện không nhận push lịch sử; làm mới cùng binding vẫn đủ điều kiện), phiên chưa thu hồi/hết hạn và `auth_sessions.membership_id` = membership của token, user/membership còn hoạt động, còn quyền nhóm theo loại sự kiện (`comments_reports` cho `slip_sent`/`report_published`/`homework_assigned`; `scores` cho `score_updated`; mức `read` hoặc `write`) và liên kết `guardian_student` còn hiệu lực. Hai điều kiện quyền/link nằm trong projection, không đẩy vào `WHERE` trước `LIMIT` (`data-model.md` 2.7).
- Trước **mỗi lần gửi**, sender đối chiếu lại: `users.status = 'active'` **và** `memberships.status = 'active'` tại thời điểm gửi, phiên còn hiệu lực, `auth_sessions.user_id`/`membership_id` **khớp** `device_tokens.user_id`/`membership_id`, `registration_version` đúng bản đã chụp, cộng quyền con/nhóm hiện hành, bài chưa lưu trữ, phiếu/báo cáo đã gửi; lệch ⇒ `skipped`, không gọi FCM. Membership bị vô hiệu **sau fanout** vẫn bị chặn ở bước này.
- Số 5 inbox / 20 đăng ký / 5 deliveries / 2 kết nối là ngân sách đề xuất, **chưa đo** (`stack-and-cpu.md` mục 9).

### Sự kiện

| `kind` | Kích hoạt sau commit thành công | Phạm vi nhận |
|---|---|---|
| `slip_sent` | giáo viên bấm gửi phiếu; một inbox mỗi em/buổi/phụ huynh, retry gửi không tạo lại | con có phiếu đã chọn sao và gửi, quyền comments_reports |
| `report_published` | phát hành/phát hành lại báo cáo, khoá theo publication id | con có báo cáo đã phát hành, quyền comments_reports |
| `homework_assigned` | giáo viên giao phần mới qua `homework.assign` (hoặc tạo một phần bằng upsert); offline chỉ kích hoạt sau server áp lệnh, không kích hoạt khi chỉ sửa nội dung phần đã có | phụ huynh của học sinh thuộc buổi giao, quyền comments_reports |
| `score_updated` | lưu điểm mới/thay đổi giá trị không rỗng, offline chỉ sau server áp lệnh, bỏ noop | phụ huynh của em có điểm, quyền scores, bài chưa lưu trữ |

Sửa phiếu đã gửi hoặc chấm/sửa BTVN không gửi push riêng; kết quả chấm đi cùng phiếu. Nội dung sự kiện và inbox ghi trong cùng batch thay đổi để retry không tạo trùng. Chỉ gộp theo học sinh, không gộp dữ liệu của nhiều em vào payload. Q7 đã chốt: điểm gộp theo phụ huynh/học sinh/bài, ready_at dời tới 5 phút sau lần nhập cuối (server commit, retry/noop không dời). BTVN gộp theo một lần giao 1..4 phần bằng `homework.assign`, chỉnh nội dung phần đã giao không gửi mới. Inbox nhóm được giữ một dòng tới khi job freeze nó (`expansion_started_at`); sau freeze, lần nhập mới tạo nhóm mới nên không đổi `ready_at`/cursor của job đang chạy. Cron chỉ claim nhóm khi ready_at tới và event_version chưa đổi, tránh gửi sớm khi vừa nhập thêm. Quyền và danh tính vẫn kiểm lại tại thời điểm gửi.

### Payload FCM HTTP v1 và gửi

Worker gọi `POST https://fcm.googleapis.com/v1/projects/{project}/messages:send` bằng OAuth Bearer access token (không phải token đăng nhập app). Ví dụ giả:

```json
{ "message": {
  "token": "FAKE_FCM_REGISTRATION_TOKEN",
  "notification": { "title": "Có phiếu buổi học mới của Minh Anh" },
  "data": { "kind": "slip_sent", "notification_id": "124", "student_id": "stu_1", "session_id": "ses_3" }
} }
```

Không có body nhận xét, mức sao, số điểm, SĐT, mật khẩu hoặc link tải công khai; `data` chỉ loại và ID cần mở màn, giá trị là chuỗi. App tải lại dữ liệu qua API có phân quyền; không coi payload là quyền truy cập. Tiêu đề BTVN/điểm/báo cáo cùng nguyên tắc. Không log request/response OAuth hoặc FCM nguyên văn. Payload dùng token được yêu cầu trong quyết định hiện tại; phải kiểm phiên bản SDK/token API tương thích trước khi tích hợp (Firebase đang bổ sung FID, không tự đổi hợp đồng sang FID).

Ghi inbox trước; cron chia lô deliveries riêng từng thiết bị, kiểm lại quyền trước mỗi gửi, lease/retry/thu hồi token theo `data-model.md` mục 2.7. Cache OAuth ~50 phút ở D1, JWT RS256 và giới hạn gửi theo `stack-and-cpu.md` mục 9. `ctx.waitUntil` chỉ giảm thời gian chờ response, không tạo ngân sách CPU/subrequest mới. Không gửi HTTP cho cả lớp trong request lưu dữ liệu. Mở rộng inbox cũng bị chặn trần (5 inbox / 20 đăng ký mỗi invocation) như mục "Mở rộng inbox và trần fanout".

## 8. Báo cáo tháng

Tính theo tháng (3 tháng gần nhất để sau). Dữ liệu báo cáo (chuyên cần, điểm từng bài, số buổi 3/2/1 sao, kết quả BTVN theo phần) do máy chủ tính từ DB, nên hai client giống hệt nhau.

| Endpoint | Ai gọi | Ghi chú |
|---|---|---|
| `GET /classes/{id}/reports?month=2026-10` | `comments_reports:read` | trạng thái từng em: `none` \| `draft` \| `published`, `needs_republish` |
| `GET /students/{id}/report-preview?month=2026-10` | `comments_reports:read` | bản xem trước tính tại chỗ (chưa lưu) |
| `PUT /students/{id}/reports/{month}` | `comments_reports:write` | lưu nháp `general_comment` (tạo `reports` nếu chưa có) |
| `POST /students/{id}/reports/{month}/publish` | `comments_reports:write` | phát hành hoặc phát hành lại; cần mạng |
| `GET /students/{id}/reports?limit=&cursor=` | `comments_reports:read`; Phụ huynh (con) | bản mới nhất mỗi tháng đã phát hành |
| `GET /reports/{id}/publications/{no}` | như trên | bản chụp (Phụ huynh: chỉ bản đã phát hành của con) |

```json
// GET /students/stu_1/report-preview?month=2026-10
{ "student_id": "stu_1", "month": "2026-10",
  "attendance": { "present": 6, "late": 1, "excused": 1, "absent": 0, "held_sessions": 8 },
  "tests": [ { "test_id": "tst_1", "name": "Unit test 1 (ví dụ)", "date": "2026-10-14", "max": 15, "value": 12.5 },
             { "test_id": "tst_2", "name": "Big test (ví dụ)", "date": "2026-10-28", "max": 15, "value": null } ],
  "stars": { "three": 5, "two": 2, "one": 0 },
  "homework": [ { "kind": "vocabulary", "excellent": 4, "done": 3, "not_done": 1 } ],
  "general_comment": "", "ready": true }
// POST …/publish → 201
{ "report_id": "rep_1", "publication_no": 1, "published_at": "2026-10-31T10:00:00.000Z", "snapshot": { "…": "như preview, đóng băng" } }
```
Phát hành: một `batch` ghi `report_publications` (bản chụp bất biến), cập nhật `reports` (`status = published`, `needs_republish = 0`, `publication_count + 1`) và tạo thông báo `report_published`. Máy chủ không lưu PDF và không có endpoint PDF (`…/pdf` trả `404`): xem báo cáo từ `snapshot`; "Tải PDF / ảnh" do client tạo trên máy khi người dùng bấm. Phụ huynh chỉ thấy báo cáo sau khi phát hành. Điểm sửa sau đó: phụ huynh thấy điểm mới ngay qua `score`; trigger đặt `needs_republish = 1` (giáo viên thấy qua thực thể `report`).

`GET /health` (`Public`, không chạm DB): `{ "status": "ok", "version": "<git-sha>" }`, dùng cho kiểm tra staging.

## 9. Phân quyền: tóm tắt

Chi tiết từng vai trò × tài nguyên × hành động ở `authz-matrix.md`. Nguyên tắc: (1) mọi hàm trong `worker/src/db` nhận danh tính đã xác thực (membership, role, quyền, lớp được gán / con được liên kết) và tự gắn `workspace_id` + phạm vi; (2) quản trị luôn chỉ Admin; endpoint quản trị nhân sự và quyền 2 role có từ bản 1.1 (mục 11), bản đầu thì không; (3) Phụ huynh chỉ đọc, chỉ con mình, chỉ nội dung đã gửi/phát hành; (4) quyền đổi hiệu lực ngay, vì mỗi request đọc lại role/lớp từ D1 (không cache quyền giữa các request).

## 10. Câu hỏi mở

Mỗi mục: điều spec chưa trả lời, mặc định tạm dùng trong tài liệu này, ai cần quyết.

**Không làm ở MVP** (đối chiếu spec mục 8 "Bản đầu", rà B3): bài giảng (`lectures` chỉ giữ dòng quyền, không endpoint), học phí, lương, mời nhân sự (link mời/OTP/link chung của lớp/duyệt yêu cầu), OTP hay SMS cho đăng nhập, màn quản lý nhân sự và role, xác minh SĐT. Không bảng, endpoint, lịch sử hay test phân quyền nào trong bộ tài liệu này dùng cho các mục đó.

- **Q1. ĐÃ CHỐT 2026-10-22: quên mật khẩu.** Bản đầu người vận hành đặt lại thủ công trên D1 (`runbook-reset-password.md`); OTP là phase sau. Không có endpoint.
- **Q2. BỎ 2026-10-22.** Giáo viên không cấp/đặt lại mật khẩu cho ai; endpoint `guardian-credentials`, điều kiện B-01 và `409 account_not_resettable` đã bỏ. Phụ huynh tự đăng ký (mục 4).
- **Q3. ĐÃ CHỐT 2026-10-22: không mã đăng ký.** `REGISTRATION_CODE` bỏ hẳn, không có mã/lời mời; đăng ký bằng SĐT + mật khẩu, chống lạm dụng bằng `register:ip` 5/giờ. Rủi ro đã biết: không xác minh SĐT (ai cũng đăng ký bằng SĐT của người khác); chấp nhận ở bản đầu.
- **Q4. BỎ 2026-10-22.** Không còn mật khẩu tạm do giáo viên cấp nên không có hạn dùng.
- **Q5. Quyền mặc định của Trợ giảng.** Spec chỉ nêu ví dụ "điểm danh, xem bài giảng". Tạm: sessions_attendance ghi; classes, students, scores, lectures, comments_reports đọc (`data-model.md` mục 2.1). Admin chỉnh được nhưng MVP chưa có màn.
- **Q6. Điểm có số thập phân không.** Spec chỉ nói khoảng 0..max. Tạm: `REAL`, không ép bước; client quyết định bước nhập.
- **Q7. ĐÃ CHỐT (người dùng, 2026-10-21):** điểm gộp theo phụ huynh + học sinh + bài kiểm tra, gửi sau 5 phút không nhập thêm; BTVN gộp các phần trong một lần giao, sửa nội dung đề đã giao không phát push mới. Cách lưu/claim nhóm ở `data-model.md` mục 2.7, lệnh giao nhiều phần atomic ở mục 6.2.
- **Q8. ĐÃ CHỐT 2026-10-22: PBKDF2 30.000 vòng, vừa gói Free, không nâng gói.** Đăng nhập đo trên staging: trung vị ≈ 8–10 ms, p95 ≈ 16–22 ms (cả ở 1.000 vòng), không request nào bị cắt; số đo ở `stack-and-cpu.md` mục 4.2. Hash 100.000 vòng cũ vẫn đăng nhập được và được băm lại.
- **Q9. ĐÃ CHỐT 2026-10-22: không lưu PDF trên máy chủ, không R2.** Bỏ hai endpoint PDF, binding `REPORT_PDFS` và trường `has_pdf`; PDF/ảnh tạo trên máy khách.
- **Q10. Một học sinh một lớp.** Spec "Làm sau" có "thêm học sinh từ lớp khác, chuyển lớp". Tạm: `students.class_id` đơn; khi làm sau sẽ thêm bảng ghi danh. Xác nhận không cần ghi danh nhiều lớp ở MVP.
- **Q11. Nhóm quyền `lectures`.** **Không làm ở MVP** (bài giảng thuộc "Làm sau" ở spec mục 8). Giữ dòng `role_permissions` để lược đồ và `GET /me` đầy đủ, không endpoint, không màn, không test bắt buộc. Không suy ra quyền nào khác từ nhóm này.
- **Q12. ĐÃ CHỐT: FCM.** iOS native qua FCM → APNs (SDK Firebase Messaging), web qua FCM web token; backend giữ Worker + D1. D1 lưu device token theo user/membership; OAuth RS256 từ secret, cache D1 ~50 phút, cron chia lô. Chưa đo RS256/gửi đầu cuối; chưa phải cổng qua review. Xem mục 7 và checklist Firebase.
- **Q13. Chi tiết nhỏ.** (a) `title` của phần BTVN có bắt buộc không (spec: "tiêu đề và mô tả (không bắt buộc)" mơ hồ) — tạm cả hai mặc định rỗng; (b) `note` của buổi học có hiện cho phụ huynh không — tạm không; (c) `parent_phone` có bắt buộc khi thêm học sinh không — tạm tuỳ chọn.
- **Q14. Một SĐT một tài khoản dùng chung nhiều workspace và nhiều vai trò.** Hệ quả của spec mục 4 ("một SĐT có thể có nhiều role"): giáo viên và phụ huynh dùng chung mật khẩu. Tạm: đúng như vậy. Xác nhận.
- **Q15. Định nghĩa "vắng 2 buổi liên tiếp" (thêm khi rà B3).** Spec mục 8 chỉ ghi "cảnh báo vắng 2 buổi trong app", không nói `excused` (có phép) có tính là vắng, và buổi hủy có chen vào giữa hai buổi không. Tạm: tính ở client trên dữ liệu đã có (mục 5.4), **không** lưu cờ ở máy chủ; chưa chọn định nghĩa. Cần người dùng chốt (ảnh hưởng prototype và cả hai client).
- **Q16. Cách đánh số buổi.** Spec mục 4: "Số buổi chỉ đếm buổi đã diễn ra"; prototype (`sessionNumber`) và thiết kế web đánh số mọi buổi chưa hủy, kể cả buổi sắp tới. Tạm theo prototype/thiết kế (số suy ra khi đọc, không lưu, không đếm buổi hủy). Cần người dùng xác nhận hoặc sửa spec cho khớp.
- **Q17. Đổi lịch lặp khi buổi hôm nay đã có dữ liệu (thêm khi sửa M2, review r1).** Spec mục 4 / api-spec 5.1 chỉ nói "chỉ đổi buổi chưa diễn ra, giữ buổi đã diễn ra, đã hủy và buổi lẻ", không nói trường hợp buổi **hôm nay** còn `planned` nhưng đã có điểm danh/phiếu/BTVN. Tạm: giữ nguyên buổi hôm nay (đổi `origin='manual'`), áp lịch mới từ buổi kế tiếp, và không sinh buổi lặp mới cho bất kỳ ngày nào đã có buổi của lớp, nên không bao giờ có hai buổi cùng lớp trong cùng ngày vì đổi lịch. Cần người dùng xác nhận (nhất là khi lịch mới vẫn rơi vào hôm nay).

## 11. Nhân sự và vai trò 1.1

Nguồn: `docs/spec.md` mục 8 "Bản 1.1" và `plans/20261028-roles-permissions/scope.md`. Chốt hợp đồng 2026-10-28 (nhánh `mvp-backend-roles`, chưa deploy). **Chỉ thêm**: route, bảng và trường mới; response và hành vi cũ mà app 1.0 và web hiện tại dùng không đổi. Trường mới trong response cũ (nếu có) client cũ bỏ qua.

### Khái niệm
- **Nhân sự** = membership có role `admin`, `teacher` hoặc `assistant` (`scope_kind` ≠ `linked_students`) của workspace đang dùng. Mọi route dưới đây là `Admin` (vai trò đang dùng có `system_key = "admin"`); người khác `403 forbidden` `details.reason = "admin_required"`.
- **Khai nhân sự (pending):** Admin khai SĐT chưa có tài khoản thì lưu một bản khai (bảng `staff_declarations`: workspace, SĐT chuẩn hoá, tên, role, danh sách lớp). Khi SĐT đó có tài khoản (đặt mật khẩu lần đầu qua `register-guardian`, hoặc đăng ký/đăng nhập sau này) máy chủ biến bản khai thành membership (`active`, lớp đã gán) rồi xoá bản khai. Số đã có tài khoản thì tạo membership ngay.
- **Hiệu lực ngay:** mọi request đọc lại role, quyền, trạng thái và lớp được gán từ D1 (mục 9). Mọi thay đổi nhân sự/quyền tăng `scope_epoch` của membership bị ảnh hưởng nên lần đồng bộ kế tiếp trả `409 resync_required` (`scope_changed`).
- Không xoá dữ liệu người đó đã tạo. Vô hiệu hoá chỉ đổi `memberships.status`.

### Dạng `StaffMember`
```json
{ "id": "mem_7", "kind": "member", "user_id": "usr_7", "display_name": "Cô Lan", "phone": "+84900000007",
  "role": { "id": "role_asst", "name": "Trợ giảng", "system_key": "assistant" },
  "class_ids": ["cls_1", "cls_2"], "status": "active", "is_self": false,
  "created_at": "2026-10-28T03:00:00.000Z", "version": 3 }
```
- `kind`: `member` (đã có tài khoản; `id` là `memberships.id`) hoặc `pending` (chưa có tài khoản; `id` là id bản khai, `user_id = null`).
- `status`: `active` | `disabled` | `pending` (chỉ với `kind = pending`).
- `class_ids`: lớp được gán (`member_classes`). Với role `admin` luôn `[]` (Admin thấy mọi lớp).
- `phone` đầy đủ `+84…`: chỉ Admin gọi được các route này; client che một phần ở danh sách nếu muốn.
- **`display_name` có thể là `null`** (kiểu chuỗi hoặc `null`): `member` mà tài khoản chưa đặt tên (ví dụ tài khoản tạo bằng đặt lại mật khẩu của Admin) trả `null`; client phải decode nullable và hiển thị SĐT thay thế. `kind = pending` luôn có tên.
- `display_name` của `member` là tên trong tài khoản; thêm SĐT đã có tài khoản thì giữ tên của họ, bỏ qua tên Admin nhập.

### GET /staff
`Admin`. `{ "items": [StaffMember…] }` — gồm Admin, Giáo viên, Trợ giảng (cả đã vô hiệu) và bản khai chờ, sắp theo `status` (active, pending, disabled) rồi tên. Không phân trang (workspace nhỏ).

### POST /staff — thêm nhân sự bằng SĐT
`Admin`. Giới hạn kích thước như mọi `POST` JSON.
```json
{ "phone": "0900000007", "display_name": "Cô Lan", "role": "assistant", "class_ids": ["cls_1"] }
// 201 → StaffMember
```
- `role`: `teacher` | `assistant` (`422 validation_error` `details.fields.role = "invalid_role"`; không tạo Admin ở 1.1).
- `display_name` bắt buộc 1–100 ký tự (`details.fields.display_name`), `phone` sai định dạng `details.fields.phone = "invalid_phone"`. `class_ids` tuỳ chọn (mặc định `[]`), mỗi id phải là lớp của workspace (`details.fields.class_ids = "unknown_class"`).
- Số đã có tài khoản: tạo membership `active` ngay (`kind = member`). Số chưa có tài khoản: tạo bản khai (`kind = pending`, `status = pending`).
- `409 conflict` `details.reason = "staff_exists"` khi SĐT đã là nhân sự của workspace này (Admin/Giáo viên/Trợ giảng, đang hoạt động, đã vô hiệu hoặc đang chờ). Số đã vô hiệu: `details.status = "disabled"` và `details.id` để Admin bật lại bằng `PATCH`.
- Không gửi SMS hay thư mời.

### PATCH /staff/{id}
`Admin`. Mọi trường tuỳ chọn; có `base_version` thì kiểm như mục 0 (`409 version_conflict`).
```json
{ "role": "teacher", "class_ids": ["cls_1", "cls_3"], "status": "disabled", "display_name": "Cô Lan A", "base_version": 3 }
// 200 → StaffMember
```
- `class_ids`: thay toàn bộ tập lớp được gán. Với role `admin`: `422` `details.fields.class_ids = "not_applicable"`.
- `role`: `teacher` | `assistant`. Admin đổi role của chính mình hoặc Admin khác thành Giáo viên/Trợ giảng được, trừ khi đó là Admin hoạt động cuối cùng (`409`, bên dưới). Không thể nâng ai lên Admin.
- `status`: `active` | `disabled`. Vô hiệu hoá: các lệnh/ request kế tiếp của membership đó bị từ chối (bảng dưới); phiên đăng nhập và tài khoản không bị xoá; dữ liệu cũ nguyên vẹn; bật lại bằng `status = "active"`.
- `display_name`: chỉ với `kind = pending` (tài khoản đã có thì tên thuộc người dùng, `422 display_name: "owned_by_user"`).
- `kind = pending` chỉ cho sửa `role`, `class_ids`, `display_name`; `status` khác `pending` ⇒ `422` `details.fields.status = "invalid_for_pending"`.
- `409 conflict` `details.reason = "last_admin"` khi sẽ làm mất Admin hoạt động cuối cùng (hạ role hoặc vô hiệu hoá).
- `404 not_found` nếu `id` không thuộc workspace.

### DELETE /staff/{id}
`Admin`. Chỉ xoá bản khai chờ (`kind = pending`): `204`. Với membership đã có tài khoản: `409 conflict` `details.reason = "not_pending"` (dùng `PATCH status = disabled`). Dành cho sửa nhầm SĐT.

### GET /roles/permissions
`Admin`. Quyền của hai role chỉnh được: 5 nhóm có tính năng + `send_comments` (nhóm `lectures` không hiện, không đổi).
```json
{ "items": [
  { "role": { "id": "role_teacher", "name": "Giáo viên", "system_key": "teacher" },
    "permissions": { "classes": "write", "students": "write", "sessions_attendance": "write", "scores": "write", "comments_reports": "write", "send_comments": "write" } },
  { "role": { "id": "role_asst", "name": "Trợ giảng", "system_key": "assistant" },
    "permissions": { "classes": "read", "students": "read", "sessions_attendance": "write", "scores": "read", "comments_reports": "write", "send_comments": "none" } } ] }
```

### PUT /roles/{system_key}/permissions
`Admin`. `system_key` là `teacher` hoặc `assistant`.
```json
{ "permissions": { "scores": "write", "send_comments": "write" } }   // chỉ gửi nhóm cần đổi; 200 → một phần tử như GET
```
- Mức: `none` | `read` | `write`; nhóm hợp lệ: `classes`, `students`, `sessions_attendance`, `scores`, `comments_reports`, `send_comments`. `send_comments` chỉ nhận `none` \| `write` (`read` ⇒ `422` `details.fields.send_comments = "invalid"`). Nhóm khác (kể cả `lectures`) hoặc mức lạ: `422 validation_error` `details.fields.<nhóm> = "invalid"`. Body rỗng: `422`.
- `system_key` khác (`admin`, `guardian`): `409 conflict` `details.reason = "role_not_editable"` (Admin cố định, role Phụ huynh không có màn chỉnh).
- Hiệu lực ngay cho mọi membership role đó; tăng `scope_epoch` của chúng.
- **Quyền "Gửi nhận xét" (`send_comments`, Bản 1.2):** quyền riêng, tách khỏi `comments_reports` (soạn/sửa phiếu, "Gán tất cả mặc định", phát hành báo cáo giữ nguyên ở `comments_reports`). Chọn khoá thứ 7 trong cùng ma trận `permissions` (không phải boolean riêng) để mọi nơi đã trả `permissions` (`/me`, `/auth/login`, `/auth/register-guardian`, `/auth/session/membership`, `GET /roles/permissions`) hiện nó với cùng hình dạng chuỗi, client cũ bỏ qua khoá lạ; mức chỉ `none` hoặc `write` vì không có nghĩa "đọc". Máy chủ chặn mọi đường gửi phiếu (hiện chỉ có lệnh đồng bộ `slip.send`, kể cả "Gửi phiếu cả lớp" là `slip.send` nhiều em): thiếu quyền ⇒ lệnh `rejected` `forbidden`, không gửi em nào. Phụ huynh không có (`none`). Mặc định: Admin và Giáo viên `write`, Trợ giảng `none`.
- Mặc định: Giáo viên `write` cả 5 nhóm + `send_comments`. Trợ giảng: `sessions_attendance` `write`, `comments_reports` `write`; `classes`, `students`, `scores` `read`; `lectures` `read` (giữ nguyên, không hiện), `send_comments` `none`. Workspace mới được seed theo bảng này; migration cập nhật workspace cũ **chỉ khi** quyền của role Trợ giảng còn đúng mặc định cũ (`comments_reports = read`, các nhóm khác như trên), tức Admin chưa từng sửa. Riêng `send_comments`, migration thêm hàng cho **mọi** role của **mọi** workspace: Admin/Giáo viên `write`, Trợ giảng và Phụ huynh `none` (áp cả Trợ giảng đã được Admin chỉnh; người dùng đã duyệt).

### Đăng nhập lần đầu của nhân sự (không đổi hình dạng response)
- `POST /auth/phone-check`: SĐT chưa có tài khoản mà có **bản khai nhân sự** (ở bất kỳ workspace nào) ⇒ `{ "next": "guardian_setup" }` như phụ huynh đã khai (giá trị `next` giữ nguyên để app 1.0 không vỡ; client 1.1 coi đây là "tự đặt mật khẩu lần đầu"). Thứ tự: đã có tài khoản ⇒ `login`; có bản khai nhân sự hoặc con được khai ⇒ `guardian_setup`; còn lại ⇒ `teacher_register`.
- `POST /auth/register-guardian`: chấp nhận SĐT có con được khai **hoặc** có bản khai nhân sự. Một `batch` như cũ cho phần phụ huynh; phần nhân sự: tạo membership `active` + `member_classes` cho từng bản khai rồi xoá bản khai. `201` cùng hình dạng, `memberships` gồm cả vai trò nhân sự và phụ huynh; `active_membership_id` điền khi đúng một membership, nếu không `null` (chọn vai trò). SĐT không có khai nào: vẫn `403 forbidden` `details.reason = "phone_not_declared"`.
- Bản khai còn treo cho SĐT đã có tài khoản (đăng ký workspace trực tiếp bằng `POST /auth/register`, hoặc Admin khai sau khi có tài khoản — trường hợp sau tạo membership ngay): `POST /auth/login` biến chúng thành membership trước khi trả response, nên `memberships` trong response đã có vai trò mới; `POST /auth/register` không đổi (bản khai được nhận ở lần đăng nhập kế tiếp).

### GET /me (đã có, dùng cho 1.1)
Không đổi hình dạng: `memberships` là mọi vai trò đang hoạt động ở mọi workspace của người dùng, mỗi cái có `workspace`, `role`, `scope_epoch`, `permissions` (6 nhóm, mức hiệu lực của role đó). Client ẩn/khoá nút theo `permissions` của membership đang dùng và so `scope_epoch` với `epoch` đồng bộ. Thêm ở 1.1: **`class_ids`** trên membership nhân sự có `scope_kind = "assigned_classes"` (lớp được gán; Admin và Phụ huynh không có trường này). Khi membership phiên đang dùng bị vô hiệu: `active_membership_id` là `null` và membership đó vắng trong `memberships` ⇒ client về màn chọn vai trò hoặc báo "bạn không còn quyền ở workspace này".

### Hiệu lực thu hồi
| Tình huống | Kết quả |
|---|---|
| Membership đang dùng bị `disabled` | Request REST miền kế tiếp: `403 account_disabled` (giữ nguyên hành vi của app 1.0; client 1.1 phải xử lý cả `403 account_disabled` lẫn `403 forbidden` + `details.reason = "membership_required"`). `/me`, `/session/membership`, `/auth/*` vẫn dùng được để chọn vai trò khác. `sync/push` và `sync/pull` của membership đó: `404 not_found` (hành vi cũ, app 1.0 dựa vào); client giữ lệnh chờ và báo lỗi (spec mục 4). |
| Role đổi hoặc quyền role đổi | Request kế tiếp dùng quyền mới; thiếu quyền ⇒ `403 forbidden` (đã thấy tài nguyên) hoặc `404` (ngoài phạm vi lớp). Đồng bộ trả `409 resync_required`. |
| Gỡ lớp khỏi nhân sự | Lớp biến mất khỏi phạm vi; `404` cho tài nguyên của lớp đó; đồng bộ `resync_required`. |
| Lớp do nhân sự tạo | Tự gán cho người tạo (đã có ở `POST /classes` và lệnh tạo lớp). |

### Mã lỗi thêm
| HTTP | `code` / `details.reason` | Khi nào |
|---|---|---|
| 403 | `forbidden` / `admin_required` | gọi route nhân sự/quyền role mà không phải Admin |
| 409 | `conflict` / `staff_exists` | SĐT đã là nhân sự của workspace này |
| 409 | `conflict` / `last_admin` | làm mất Admin hoạt động cuối cùng |
| 409 | `conflict` / `role_not_editable` | sửa quyền role `admin`/`guardian` |
| 409 | `conflict` / `not_pending` | `DELETE /staff/{id}` trên membership đã có tài khoản |
| 422 | `validation_error` | `role`, `display_name`, `phone`, `class_ids`, `status`, nhóm/mức quyền sai (`details.fields`) |
