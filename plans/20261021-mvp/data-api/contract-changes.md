# Thay đổi hợp đồng API · 2026-10-24 · Báo cáo theo khoảng buổi + email/quên mật khẩu

- Nhánh `mvp-backend`, commit `04b92f3` (email/reset, migration 0005) và `abb5a52` (báo cáo, migration 0004). CHƯA deploy staging tại thời điểm ghi; khi deploy sẽ bổ sung version.
- Nguồn nghiệp vụ: `docs/spec.md` (Nhận xét và báo cáo, Tài khoản), plan `plans/20261021-mvp/reports-email/plan.md`.
- Lỗi theo envelope hiện có: `{ "error": { "code", "message", "details?", "request_id" } }`.

## A. Báo cáo theo đợt (khoảng buổi)

Khoảng lưu theo mốc `from_key`/`to_key` = `"YYYY-MM-DD HH:MM"` (ngày + giờ bắt đầu buổi), vì số buổi tính động (hủy buổi làm số dồn lại). `from_number`/`to_number` là số buổi hiện tại, `null` với đợt chuyển từ báo cáo tháng cũ (khi đó `from_key='YYYY-MM-01 00:00'`, `to_key='YYYY-MM-31 23:59'`, session id `null`). Số liệu báo cáo tính trong các buổi không hủy thuộc khoảng; bài kiểm tra theo ngày trong khoảng.

| Endpoint | Body | Trả | Lỗi |
|---|---|---|---|
| `POST /classes/{id}/report-batches` | `{id?, from_session_id, to_session_id}` | 201 `{batch, reports}`; gửi lại cùng `id` cùng khoảng ⇒ 200 | 422 `invalid_range` / `session_cancelled` / `validation_error`; 404; 403; 409 `id_conflict` |
| `GET /classes/{id}/report-batches` | | `{items}` mới nhất trước; item: `id, from_session_id, to_session_id, from_key, to_key, from_number, to_number, counts{total,draft,published,needs_republish}, created_at` | 403 phụ huynh; 404 |
| `GET /report-batches/{id}/reports` | | `{batch, items}` | 403 phụ huynh; 404 |
| `GET /reports/{id}/preview` | | như preview cũ + `batch_id`, `range{...,label}`, `ready:boolean`, `missing:['attendance'\|'scores'\|'comment']`; số liệu chỉ tính ngày từ lúc học sinh vào lớp tới lúc rời lớp | 403 phụ huynh; 404 |
| `PUT /reports/{id}` | `{general_comment}` ≤4000 | báo cáo | 422; 403; 404 |
| `POST /reports/{id}/publish` | | 201 `{report_id, batch_id, publication_no, published_at, snapshot}` | 403; 404; 409 `conflict` `details.reason=report_not_ready` + `details.missing` (báo cáo thiếu dữ liệu không phát hành được) |
| `POST /report-batches/{id}/publish` | | `{published:[{report_id,publication_no}], skipped:[{report_id,missing}], published_at}`; chỉ phát hành báo cáo đủ dữ liệu (chưa phát hành hoặc cần phát hành lại), bản thiếu dữ liệu vào `skipped` | 403; 404 |
| `GET /students/{id}/reports` | | item thêm `batch_id, from_key, to_key, from_number, to_number`; sắp `to_key DESC, id`; `next_cursor` mới (base64 `[to_key,id]`), cursor tháng cũ ⇒ 422 | |
| `GET /reports/{id}/publications/{no}` | | thêm `batch_id`; `snapshot.range.label` vd "Buổi 1–8 · 01/10–24/10" (chỉ ngày khi không có số buổi) | |

Một đợt = cả lớp: mỗi học sinh có `enrolled_at ≤ ngày buổi cuối` và (`left_at` null hoặc `≥ ngày buổi đầu`) được một bản nháp. Cho phép trùng khoảng.

Giữ chạy (đọc, tương thích ngược): `GET /classes/{id}/reports?month=`, `GET /students/{id}/report-preview?month=`.
Ngừng: `PUT /students/{id}/reports/{month}` và `POST /students/{id}/reports/{month}/publish` ⇒ `410 endpoint_retired`.

Sync (`/sync/pull`): entity mới `report_batch` (`id, class_id, from_session_id, to_session_id, from_key, to_key, version`; không gửi cho phụ huynh). `report` và `report_publication` thêm `batch_id`; `month` vẫn luôn có giá trị (đợt mới = tháng của buổi kết thúc), nên client cũ giải mã không hỏng. Migration ghi `change_log` cho đợt và báo cáo đã chuyển nên client đang chạy sẽ nhận `batch_id`.

## B. Email tài khoản + quên mật khẩu

| Endpoint | Body | Trả | Lỗi |
|---|---|---|---|
| `POST /auth/register`, `POST /auth/register-guardian` | thêm `email?` | `user.email` | 422 `fields.email=invalid_email` |
| `GET /me`, `POST /auth/login` | | `user.email` (chỉ của mình, có thể `null`) | |
| `PUT /me/email` (cần đăng nhập) | `{email \| null, current_password}` | 200 `{email}` | 401 `invalid_credentials` (5 lần sai ⇒ 429), 422 `invalid_email` / `required` |
| `POST /auth/password-reset/lookup` | `{phone}` | `{account, has_email, email_masked}` (vd `t***@gmail.com`, không bao giờ trả email đầy đủ) | 422 `invalid_phone`; 429 |
| `POST /auth/password-reset/request` | `{phone, email}` | 202 `{sent:true}` | 404 `not_found`; 409 `conflict` `details.reason=no_email`; 422 `validation_error` với `details.fields.email` = `email_mismatch` hoặc `invalid_email` (client đọc `details.fields.email`, không có `error.code` riêng); 429; 503 `mail_unavailable` |
| `POST /auth/password-reset/confirm` | `{token, new_password}` | 200 `{ok:true}`; mọi phiên cũ bị thu hồi | 400 `token_invalid` (sai/hết hạn/đã dùng); 422 mật khẩu yếu; 429 |

Email chuẩn hoá chữ thường. Chỉ gửi khi email nhập khớp email đã lưu; màn quên mật khẩu không đặt email mới. Token một lần, hạn 30 phút; link `https://<web>/dat-lai-mat-khau#token=…` luôn mở trên WEB (cả người dùng iOS). Throttle lookup+request theo SĐT và IP; confirm theo IP.

## C. Quy tắc tính bài kiểm tra trong báo cáo khoảng buổi

Một bài kiểm tra được tính cho học sinh khi `ngày bài >= enrolled_at` **hoặc** học sinh đã có điểm (`value` khác rỗng) ở bài đó, và ngày bài `<= left_at` nếu đã nghỉ. Ô trống không tính. Học sinh vào lớp sau ngày kiểm tra (bài bù) được chấm điểm, điểm đó vào báo cáo và app phụ huynh. iOS tính khoảng buổi theo đúng quy tắc này. Không đổi lược đồ, không migration.

## Việc iOS phải làm (sau, khi lead iOS nhận)
- Báo cáo: bỏ luồng tạo/phát hành theo tháng (410). Dùng `report-batches` + `/reports/{id}/…`; hiển thị nhãn theo khoảng (`range.label` hoặc `from_number/to_number` + ngày từ `from_key/to_key`). Nhận entity sync `report_batch`, lưu `batch_id` trên `report`/`report_publication`. Phân trang `GET /students/{id}/reports` chỉ dùng `next_cursor` máy chủ trả.
- Phụ huynh: danh sách báo cáo đã phát hành theo khoảng (dùng `from_key/to_key` hoặc `snapshot.range`).
- Tài khoản: ô email tuỳ chọn khi đăng ký; Cài đặt lưu/xoá email (hỏi mật khẩu hiện tại); màn Quên mật khẩu gọi `lookup` → `request` (nhớ email theo SĐT trên máy, chỉ điền khi SĐT nhập trùng). Không làm màn đặt mật khẩu mới trong app: link mở web.
- Đọc báo cáo theo tháng cũ vẫn chạy nên bản iOS hiện tại không hỏng khi đọc; chỉ thao tác tạo/phát hành theo tháng lỗi 410.

---

# Thay đổi hợp đồng API · `id` do client gửi khi tạo mới

- Ngày: 2026-10-23. Staging: `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1`, Worker `qlh-staging-api`, version `d2a6b1fd-a144-4ba2-85c6-81a69836959a` (commit `2380c43`, nhánh `mvp-backend`).
- Tương thích ngược: có. Không gửi `id` thì request/response y như trước.
- Cũng trong đợt này (không đổi hợp đồng): Worker ghim vùng `placement.region = "gcp:asia-east2"` (commit `d2b9c63`, staging `6f2338f6-acab-4596-be93-c162bb590d39`), thay Smart Placement thử trước đó vì Smart Placement vẫn chạy ở edge xa D1. Đo (`verify-v1.md`): request vào edge LAX nay chạy `remote-HKG`, wall máy chủ `/me` 859→78 ms, `pull` 699→56,5 ms. GL giữ cấu hình này.

## Endpoint

| Endpoint | Trước | Sau |
|---|---|---|
| `POST /classes` | luôn sinh `id`, luôn `201` | nhận `id` UUID tuỳ chọn; gửi lại cùng `id` ⇒ `200` |
| `POST /classes/{id}/students` | như trên | như trên |
| `POST /classes/{id}/sessions` | như trên | như trên |

Thứ tự xử lý khi có `id`: xác thực, quyền, phạm vi và lớp cha (như hiện tại) → `id` đã có cùng workspace và cùng lớp (lớp: cùng workspace và người gọi vào được lớp) ⇒ `200` bản ghi hiện có, không ghi gì (không `change_log`, không sinh lại buổi, không chạy lại liên kết phụ huynh) → `id` có ở nơi khác (workspace khác, lớp khác, bản ghi lớp/học sinh/buổi khác loại, lớp ngoài phạm vi người gọi) ⇒ `409 id_conflict`, không `details` → chưa có ⇒ tạo với `id`, `201`. Ghi đồng thời cùng `id` chỉ tạo một bản ghi.

Mã lỗi mới: `409 id_conflict`. `id` không phải UUID ⇒ `422 validation_error` với `details.fields.id = "must_be_uuid"` (cùng họ lỗi hợp lệ hiện có của API; không có mã `400 validation_failed` nào trong API nên không dùng).

## Ví dụ

```json
// POST /v1/classes/{classId}/students
{ "id": "7f0c2b9e-4d51-4c0e-9a62-1b3f5d8a2c11", "name": "Nguyễn Văn An (ví dụ)", "enrolled_at": "2026-10-23" }
// 201 lần đầu
{ "id": "7f0c2b9e-4d51-4c0e-9a62-1b3f5d8a2c11", "class_id": "<classId>", "name": "Nguyễn Văn An (ví dụ)",
  "parent_phone": null, "enrolled_at": "2026-10-23", "left_at": null, "status": "active", "version": 1 }
// 200 gửi lại cùng id: cùng thân, không ghi gì
// 409 id đã dùng ở nơi khác
{ "error": { "code": "id_conflict", "message": "Conflict.", "request_id": "..." } }
// 422 id sai định dạng
{ "error": { "code": "validation_error", "message": "Invalid request.", "details": { "fields": { "id": "must_be_uuid" } }, "request_id": "..." } }
```

Lớp và buổi lẻ giống hệt (`POST /classes` trả `201`/`200` thân lớp; `POST /classes/{id}/sessions` trả thân buổi kèm `session_number`).

## Việc iOS phải làm
- Sinh UUID `id` một lần cho mỗi thao tác tạo lớp/học sinh/buổi lẻ và giữ nguyên qua mọi lần thử lại; có thể gửi chữ HOA (`UUID().uuidString`): máy chủ chuẩn hoá `id` về chữ thường trước khi tra/lưu và trả `id` chữ thường, nên client so sánh/lưu theo chữ thường. Gửi HOA rồi thường cùng UUID là cùng một bản ghi (201 rồi 200).
- Coi `200` như tạo thành công (dùng thân trả về).
- `409 id_conflict` là lỗi, không thử lại cùng `id`.
- Kéo dữ liệu (`/sync/pull`) khi app vào foreground và mỗi 60 giây khi app hiển thị; dừng khi nền.
- Chỉ lưu cursor sau khi snapshot tải xong mọi thực thể.

## Kiểm
Staging, tài khoản workspace giả: POST học sinh hai lần cùng `id` ⇒ `201` rồi `200`, một bản ghi, thân giống nhau; không `id` ⇒ `201` với id mới; lớp `201`/`200`, buổi lẻ `201`/`200`; `id` buổi dùng cho học sinh ⇒ `409 id_conflict`; `id` "abc" ⇒ `422`.
