# Báo cáo backend-02c (B-2c): notifications, devices, FCM sender (mock), cron liên quan

Ngày: 2026-10-21 · Worktree: `.paseo/worktrees/0fvr24l0/mvp-backend` (chỉ `worker/`) · Không commit/push.

## 1. Đã làm

### Endpoint (api-spec.md mục 7)

| Endpoint | Trạng thái | Ghi chú |
|---|---|---|
| `GET /notifications?limit=&cursor=` | XONG | Chỉ Phụ huynh (`scope_kind = linked_students`); Admin/Giáo viên/Trợ giảng `403 forbidden`, chưa đăng nhập `401`. Chỉ inbox của `user_id + membership_id` hiện hành; mỗi lần đọc kiểm lại `guardian_student` còn liên kết, quyền nhóm còn `read/write`, và `score_updated` chỉ trả khi bài chưa `archived`. Trả `id, kind, student_id, session_id, report_id (chỉ report_published), test_id (chỉ score_updated), created_at, read_at`; không có note/stars/điểm/SĐT/token. Phân trang keyset `id DESC`, `limit` mặc định 50 / tối đa 200, con trỏ mờ ổn định khi có dòng mới. |
| `POST /notifications/read` | XONG | `{ "up_to_id": <int ≥ 0> }`, chỉ `UPDATE` inbox của chính membership hiện hành, bỏ qua dòng đã đọc. Trả `{ "updated": n }` (xem Câu hỏi 1). `up_to_id` sai/thiếu ⇒ `422 validation_error`. |
| `PUT /device-tokens` | XONG | Danh tính lấy từ phiên (`user/membership/session`), không đọc user/workspace từ body. Token 1..4096 ký tự, platform `ios|web`; sai `422`. Làm mới cùng binding: chỉ `updated_at` + `platform`, giữ `registration_version`/`bound_at`, không xoá delivery. Đổi binding (chuyển chủ/đổi membership/phiên khác): bump `registration_version`, `bound_at = now`, xoá delivery cũ trong cùng `batch`. Trả `id, registration_version, bound_at, platform, updated_at` — không trả token. |
| `DELETE /device-tokens/{id}?registration_version=` | XONG | Chỉ đúng user + membership + phiên + version; `204`, còn lại `404` (không xoá token đã chuyển chủ). Thiếu/sai `registration_version` ⇒ `422`. |

### FCM sender (`worker/src/db/fcm-sender.ts`)

- `fetch` bơm vào qua tham số (`FetchLike`) ⇒ test không gọi mạng.
- JWT assertion RS256 (`alg/typ/kid`, `iss/scope/aud/iat/exp`) bằng WebCrypto `RSASSA-PKCS1-v1_5` + SHA-256; đổi lấy OAuth access token qua `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`.
- Cache access token trong D1 (`fcm_oauth_cache`): dùng lại khi `refresh_at > now` (refresh = `min(now+50 phút, expires_at−5 phút)`), claim lease 60 giây khi refresh, chỉ chủ lease ghi cache; xoay key (`credential_key_id`) làm cache không hợp lệ. `401` từ FCM ⇒ vô hiệu cache + làm mới đúng một lần.
- Payload chỉ có `notification.title` + `data` (kind, notification_id, student_id, session_id/report_id/test_id nếu có, dạng chuỗi); không note/stars/số điểm/SĐT/link.
- Token hết hạn: FCM `404` hoặc `400 INVALID_ARGUMENT` với `errorCode = UNREGISTERED`/`INVALID_REGISTRATION_TOKEN` ⇒ xoá đúng `device_tokens` (id + membership + registration_version), delivery cascade. `403`/payload sai **không** xoá token.
- Không log service account, access token, FCM token hay payload.
- Secret đọc từ `FCM_SERVICE_ACCOUNT` (nhận cả `FCM_SERVICE_ACCOUNT_JSON`), project từ `FCM_PROJECT_ID` hoặc `project_id` trong JSON.

### Cron (`worker/src/db/notification-dispatch.ts`)

`runNotificationDispatch(env, { now?, fetchImpl?, inboxBudget?, registrationBudget?, deliveryBudget? })` (alias `runScheduledPush`):

- Claim inbox bằng CAS đúng một lần: *initial* `WHERE deliveries_expanded_at IS NULL AND expansion_started_at IS NULL AND ready_at <= :now AND event_version = :version_vừa_đọc RETURNING delivery_cursor`; *reclaim* riêng chỉ cho dòng đã freeze, lease hết, **không** ghi lại mốc freeze. 0 dòng ⇒ bỏ qua (score commit chen giữa hoặc job khác).
- Fanout **phân trang trước, lọc sau**: trang lấy toàn bộ `device_tokens` theo `workspace_id + membership_id + id > cursor ORDER BY id LIMIT :còn_lại`; `eligible` tính trong projection (`CASE` trên session/user/membership/bound_at + `role_permissions` + `guardian_student` + bài chưa lưu trữ). Dòng bị skip vẫn chiếm trần 20 và cursor vẫn tiến; chỉ đặt `deliveries_expanded_at` khi trang trả 0 hoặc < LIMIT. Mọi ghi (insert delivery, cursor, complete) buộc `expansion_lease_id = :lease`, cùng một `batch`.
- Gửi tối đa 5 delivery: claim lease 60 giây, kiểm lại đầy đủ danh tính trước **mỗi** lần gửi (user + membership active, phiên chưa thu hồi/hết hạn và khớp user/membership của token, đúng `registration_version`, còn quyền nhóm + liên kết con, bài chưa lưu trữ) ⇒ sai = `skipped`, không gọi FCM. `429`/`5xx`/`401` retry có backoff, tối đa 5 lần ⇒ `failed`; thiếu credential ⇒ hoãn 60 giây (`pending`, không đốt lượt thử).
- Gộp thông báo điểm (group_key/event_version/ready_at +5 phút) và gộp BTVN theo lần giao do B-3 ghi inbox trong `src/db/sync.ts`; dispatch chỉ đọc/không tạo inbox.

### File

- Sửa: `worker/src/routes/{notifications,devices}.ts`, `worker/src/db/{notifications,devices}.ts`.
- Mới: `worker/src/db/{fcm-sender,notification-dispatch}.ts`.
- Test mới: `worker/tests/{notifications,devices,fcm-sender,fcm-dispatch}.test.ts`.
- Không sửa `migrations/*`, `middleware/*`, `lib/*`, `db/authz.ts|auth.ts|identity.ts`, `routes/auth.ts|index.ts`, `src/index.ts`, `src/types.ts`, file nhóm khác.

## 2. Kiểm chứng

```
$ cd worker && npm run typecheck
tsc --noEmit            # exit 0 (không lỗi)

$ npx vitest run tests/notifications tests/devices tests/fcm
Test Files  4 passed (4)
     Tests  29 passed (29)

$ npx vitest run
Test Files  18 passed (18)
     Tests  79 passed (79)
```

Phân quyền đã test cho mọi endpoint nhóm: chưa đăng nhập (`401`), Admin/Giáo viên/Trợ giảng (`403` với `/notifications`, `200` với `/device-tokens`), Phụ huynh (`200`, chỉ inbox/con của mình), phụ huynh khác (không thấy/không xoá được của nhau), workspace khác (inbox rỗng, DELETE `404`), `must_change_password` ⇒ `403 password_change_required`. Ngoài ra: token chuyển chủ bump version + xoá delivery cũ, chủ cũ không xoá được bản mới, làm mới cùng binding không bump version/bound_at, con trỏ giả `422`, bài `archived` bị ẩn, gỡ liên kết con ⇒ inbox rỗng.

Sender test (fetch giả, không gọi mạng): chữ ký RS256 verify bằng public key sinh trong test; cache D1 dùng lại (1 lần gọi OAuth) và mint mới sau 51 phút; payload chỉ tiêu đề + ID, không chứa `stars/note/value/parent_phone/password`; `404 UNREGISTERED` xoá đúng device; `401` làm mới token đúng một lần rồi gửi lại; `403` giữ token. Dispatch test: chưa tới `ready_at` không claim; trang 3 đăng ký / 2 bị skip vẫn tính ngân sách, cursor tiến, chỉ 1 delivery; ngân sách 2 qua 2 lượt reclaim; lease còn giữ ⇒ không claim; gửi qua fetch giả đúng 1 lần, chạy lại không gửi trùng; membership bị vô hiệu sau fanout ⇒ `skipped`, không gọi FCM.

## 3. Câu hỏi (mặc định tạm đã dùng, không đoán nghiệp vụ)

1. `POST /notifications/read` không có response mẫu trong `api-spec.md`. Tạm trả `{ "updated": <số dòng> }`.
2. Bộ lọc hiển thị inbox: ngoài "kiểm lại liên kết con + quyền đọc" (architecture mục 4), tôi ẩn thêm `score_updated` khi bài đã `archived` (api-spec mục 7 ghi phạm vi nhận là "bài chưa lưu trữ") và ẩn mọi dòng khi `role_permissions` của nhóm tương ứng bị hạ dưới `read`. `slip_sent`/`report_published`/`homework_assigned` chưa kiểm trạng thái phiếu/báo cáo/buổi tại thời điểm đọc (inbox chỉ sinh sau commit đã gửi/phát hành). Cần chốt nếu muốn ẩn cả khi phiếu/buổi bị hủy.
3. Tiêu đề push đang là tiếng Việt cố định trong mã (`Có phiếu buổi học mới`, `Có báo cáo tháng mới`, `Có bài tập về nhà mới`, `Có điểm mới`). Song ngữ thuộc "Làm sau" (spec mục 8) nên chưa tách i18n.
4. Tên secret: brief ghi `FCM_SERVICE_ACCOUNT`, `stack-and-cpu.md` ghi `FCM_SERVICE_ACCOUNT_JSON` + `FCM_PROJECT_ID`. Đang nhận cả hai tên service account và ưu tiên `FCM_PROJECT_ID`, fallback `project_id` trong JSON; cần chốt tên chính thức khi cấu hình staging.
5. Trần 5 inbox / 20 đăng ký / 5 delivery là ngân sách đề xuất **chưa đo**; hàm cho phép truyền budget để đo/giảm lô trên staging.

## 4. Yêu cầu đã ghi vào `briefs/backend-requests.md`

- `worker/src/index.ts`: nối `scheduled` handler gọi `runScheduledPush(env)` (nếu không, inbox không mở rộng và push không gửi).
- `worker/src/types.ts`: thêm `FCM_SERVICE_ACCOUNT?`, `FCM_PROJECT_ID?` vào `Env` (đang dùng tạm `FcmEnv` cục bộ).
- `worker/wrangler.jsonc`: thêm cron `* * * * *`, secret `FCM_SERVICE_ACCOUNT`, biến `FCM_PROJECT_ID`.

## 5. Chưa làm / giới hạn kiểm chứng

- Cron **chưa được nối** vào `src/index.ts` (ngoài quyền sửa) ⇒ chưa chạy đầu-cuối trên Worker; toàn bộ test dùng D1 test + `fetch` giả, không gọi FCM/Google thật và không có service account thật (RSA sinh trong test).
- Chưa kiểm CPU ký RS256/cache OAuth, chưa đo trần 5/20/5, chưa thử push trên iOS/web thật, chưa kiểm lease/takeover đồng thời thật (test là tuần tự).
- Chưa làm: retry `Retry-After` chi tiết của FCM (đang backoff 2^n phút), thu hồi notification đã hiện trên thiết bị (không thể theo spec), endpoint liệt kê device token (không có trong api-spec).

Status: DONE_WITH_CONCERNS
Summary: Đã xong 4 endpoint notifications/devices với kiểm quyền đầy đủ theo vai trò và bộ gửi FCM (JWT RS256, cache OAuth D1 ~50 phút, payload chỉ tiêu đề + mã tham chiếu, xoá token khi UNREGISTERED, refresh một lần khi 401) cùng cron dispatch CAS/lease/cursor theo spec; `npm run typecheck` sạch, `npx vitest run tests/notifications tests/devices tests/fcm` xanh 29/29 (toàn bộ 79/79). Lo ngại: cron chưa được nối vào `src/index.ts` và secret FCM chưa khai báo trong `src/types.ts`/`wrangler.jsonc` (đã ghi yêu cầu), nên chưa kiểm chứng đầu-cuối trên Worker/FCM thật và các trần 5/20/5 vẫn chưa đo.
