# Thay đổi hợp đồng API · 2026-10-25 · Câu nhận xét phiếu không giới hạn ký tự

## 2026-10-26 · Brief 96 · Hợp đồng CHỐT (chưa code, chưa migration): câu sửa tay, kiểm tra SĐT, điểm danh 3 trạng thái

### C8 · `slip.set` nhận `comment` sửa tay (phiếu thang 5)
Không thêm cờ `comment_manual`. Quy tắc theo payload:
| Payload | Kết quả |
|---|---|
| có `criteria`, KHÔNG có `comment` (hoặc `comment: null`, hoặc rỗng sau trim) | server tự sinh `comment` từ `criteria` (ghi đè câu cũ kể cả câu sửa tay) |
| có `criteria` VÀ `comment` chuỗi không rỗng | lưu `comment` đúng như gửi (trim hai đầu), `stars` tính từ `criteria` |
| chỉ có `comment` (không `criteria`) | lưu `comment`, giữ `criteria`/`stars` hiện có |
| chỉ có `note` | giữ nguyên `comment` |
- Client đổi tích tiêu chí: gửi `{criteria}` KHÔNG kèm `comment` (câu tự sinh lại). Giáo viên sửa tay: gửi `{criteria: <hiện tại>, comment: <câu sửa>}`. Client vẫn tự sinh cục bộ để hiện ngay/offline, cùng bộ ví dụ spec.
- Chấm lại BTVN buổi trước tính lại phiếu NHÁP (`hw_manual=0`) như cũ: ghi đè câu sửa tay bằng câu tự sinh. Phiếu đã gửi không đổi.
- Không có giới hạn độ dài. `comment` sai kiểu → `invalid_comment` (như cũ). Phiếu thang 3: như cũ (không nhận `comment`).
- "Gán tất cả mặc định": client gửi từng `slip.set` `{criteria: 31 trừ bit BTVN theo chấm, hw_manual:false}` KHÔNG kèm `comment`; giữ `note`.
- C9: máy chủ không đổi. "Buổi trước không giao BTVN" suy ra từ `homework_section` đã đồng bộ (buổi trước không có phần BTVN nào).

### D13 · Kiểm tra SĐT (đăng nhập 2 bước)
`POST /v1/auth/phone-check` (không cần auth) body `{phone}` (chuẩn hoá như login: `0…`, `+84…`, khoảng trắng).
- 200 `{ "next": "login" | "guardian_setup" | "teacher_register" }`
  - `login`: đã có tài khoản (kể cả bị khoá: bước đăng nhập báo lỗi tương ứng);
  - `guardian_setup`: chưa có tài khoản, và số là `parent_phone` của ≥1 học sinh (mọi workspace; cùng điều kiện liên kết của đăng ký phụ huynh) → client mở màn đặt mật khẩu lần đầu, gọi `POST /auth/register-guardian` như cũ;
  - `teacher_register`: còn lại → màn đăng ký workspace giáo viên, SĐT điền sẵn (`POST /auth/register`).
- 422 `validation_error` `details.fields.phone = "invalid_phone"` khi sai định dạng. 429 `rate_limited` (Retry-After) khi quá hạn mức: theo IP 30 lần/15 phút và theo SĐT 10 lần/15 phút (đủ cho gõ nhầm; chấp nhận rủi ro dò số).
- Không lộ thêm thông tin (không trả tên, workspace, số học sinh).

### D14 · Đăng ký phụ huynh
`POST /auth/register-guardian`: số KHÔNG phải `parent_phone` của học sinh nào → 403 `forbidden` với `error.details.reason = "phone_not_declared"` (không tạo tài khoản). Số đã có tài khoản → 409 `phone_registered` như cũ. Tài khoản phụ huynh cũ giữ nguyên.

### A · Điểm danh
- `attendance.set`: `status` chỉ `present|late|absent`; `excused` → `validation_error` (lệnh `excused` còn trong hàng đợi client cũ cũng bị từ chối như lệnh không hợp lệ khác, `rejected`).
- `note` và `late_at` bị bỏ qua khi ghi và KHÔNG còn trong response/pull/snapshot attendance (dữ liệu cũ giữ trong DB). Client dừng gửi hai trường này.
- Migration `0011` (chờ GL duyệt): `UPDATE attendance SET status='absent' WHERE status='excused'` (tăng `version`, `change_log` đẩy xuống client), backup + đếm trước/sau. Sau migration không còn `excused`; báo cáo giữ khoá `excused: 0` trong bản chụp cho tương thích.

## 2026-10-26 · Brief 94 · Hợp đồng ô nhận xét gộp (đã code)
- Lưu: `comment` = câu tự sinh từ `criteria`, `note` = phần giáo viên gõ thêm, không giới hạn ký tự. Phiếu thang 5: server sinh `comment` mỗi khi `slip.set` có `criteria`; nội dung `comment` client gửi bị bỏ qua. Phiếu chỉ sửa `note` giữ nguyên câu đã lưu. Phiếu cũ có câu tay giữ tới lần đổi tiêu chí; ghi chú cũ là phần gõ thêm.
- Giáo viên đọc `comment` và `note` riêng; phụ huynh nhận `comment` đã ghép với note xuống dòng sau, không nhận `note`, `criteria` hay `hw_manual`. Phiếu thang 5 có `comment` null được dựng từ `criteria` khi đọc. Thang 3 giữ nguyên.
- `hw_manual` là cờ 0/1, mặc định 0. `slip.set` nhận boolean `hw_manual`; kiểu sai trả `invalid_hw_manual`. Cờ đồng bộ và trả về cho giáo viên. Khi kết quả chấm BTVN đổi, bit 16, sao và câu tự sinh của phiếu ở buổi kế được tính lại nếu phiếu còn nháp và `hw_manual=0`; nếu có phần `not_done` thì bỏ bit 16, còn lại giữ/tích bit 16. Cập nhật nằm cùng batch và tăng version phiếu. `slip.send` tạo phiếu mặc định với bit 16 theo kết quả BTVN buổi trước.
- Migration 0010: bỏ CHECK `note<=1000`, thêm `hw_manual`. Staging 2026-10-26: migration ĐÃ chạy (93 dòng trước và sau), Worker ĐÃ deploy `06d82e19-5181-4fe2-b269-1c006f51525b` (từ `9849f08`; rollback Worker `9cb14607`; DB chỉ khôi phục qua export pre-0010). Smoke slip.set workspace giả đạt.
- Backlog: `slip.send` đọc kết quả BTVN trước batch nên chấm đồng thời có thể để phiếu mặc định lệch; thiếu test cạnh tranh cho guard version khi criteria tính ra không đổi. Người dùng chốt (spec 57a1ea2): chấm lại BTVN chỉ tính lại bit 16, sao, câu cho phiếu chưa gửi (draft, `hw_manual=0`); phiếu đã gửi giữ nguyên.
- Lỗi mới: `invalid_hw_manual`.


Người dùng chốt (spec main `670de35`): `comment` của phiếu không giới hạn độ dài. `slip.set` chỉ còn kiểm kiểu (`string` hoặc `null`, sai kiểu → `invalid_comment`); bỏ mức 300 ký tự. Giới hạn khác giữ nguyên (`note` phiếu 1000, `general_comment` báo cáo). Migration `0009` dựng lại `session_comments` không còn CHECK `length(comment) <= 300` (CHECK cũ nằm ở cột nên phải dựng lại bảng; dữ liệu và trigger giữ nguyên). Code ở nhánh `mvp-backend`; staging 2026-10-25: migration `0009` ĐÃ chạy, Worker ĐÃ deploy version `9cb14607-66fd-476a-97bc-9fb263973a14` (rollback Worker `92f10603-ffa2-485a-af0f-e9c0ae76806c`), smoke comment 1000 và 3000 ký tự đạt.  Sự cố quy trình: export pre-0009 lỗi (exit 1) nhưng script chạy tiếp migration; không có backup pre-0009 (chỉ pre-0008 và post-0009), không mất dữ liệu (0009 copy nguyên, đếm 92→92). Từ nay script migration `set -e` và kiểm file export > 0 byte TRƯỚC khi chạy migration.

---

# Thay đổi hợp đồng API · 2026-10-25 · Nhận xét 5 tiêu chí, câu sửa được, bỏ số buổi, báo cáo theo tháng (brief 91)

Hợp đồng CHỐT (GL đã xác nhận 2026-10-25); code ở nhánh `mvp-backend` (commit `feat(worker): five-criteria slips…`), staging 2026-10-25: migration `0008` ĐÃ chạy, Worker ĐÃ deploy version `92f10603-ffa2-485a-af0f-e9c0ae76806c` (rollback Worker `50a56056-98c3-4cfb-8fd4-23c9b8d0aec2`; DB chỉ khôi phục qua bản export pre-0008), smoke workspace giả đạt. Nguồn: brief 91, `docs/spec.md` (main).

## Phiếu nhận xét (`slip`, bảng `session_comments`)
- Trường mới: `criteria` (int 0..31, bit0..bit4 = Chú ý nghe giảng, Ghi chép đầy đủ, Tham gia hoạt động sôi nổi, Không mất trật tự, Hoàn thành BTVN; bit=1 là đạt), `comment` (string không giới hạn độ dài hoặc null; null = chưa sửa, hiện câu mặc định theo `stars`), `scale` (5 hoặc 3).
- `stars` do máy chủ tính = số bit của `criteria` (0..5) với `scale` 5. Phiếu cũ: `scale` 3, `criteria` null, `comment` null, `stars` 1..3 giữ nguyên; client hiện x/3 và câu cũ theo `stars`.
- `slip.set` payload: `{session_id, student_id, criteria, comment, note}`. Payload chỉ có `stars` (client cũ đã cài) vẫn được nhận cho phiếu `scale` 3 và cho phiếu mới (tạo phiếu `scale` 3, để client cũ không vỡ); phiếu `scale` 5 bắt buộc `criteria`; client mới luôn gửi `criteria`; `criteria` ngoài 0..31 → `invalid_criteria`; `comment` không phải string/null → `invalid_comment`. `comment` rỗng sau trim coi như null.
- Câu mặc định (client giữ, như spec): 5, 4, 3, 0–2 sao. "Dùng câu mặc định" = gửi `comment: null`.
- `slip.send` `{session_id, student_ids}`: em CHƯA có phiếu và điểm danh Có mặt/Muộn → tạo phiếu mặc định (`criteria` 31, 5 sao) rồi gửi; em chưa có phiếu mà Vắng/Có phép/chưa điểm danh → `skipped` với `reason: "not_attended"` (hằng `DEFAULT_SLIP_ATTENDANCE` trong `sync.ts`, dễ đổi); em đã có phiếu (GV đã mở/sửa) gửi như thường. Hết `stars_required`. Phiếu cũ nháp `stars` null thì chuyển `scale` 5 mặc định khi gửi. Lỗi mới của `slip.set`: `criteria_required` (phiếu `scale` 5 mà gửi `stars`), `legacy_scale` (phiếu cũ đã gửi mà gửi `criteria`). Phiếu cũ nháp gửi `criteria` thì nâng lên `scale` 5. Phụ huynh (snapshot/pull slip và `GET /sessions/:id/slips`) nhận `stars`, `scale`, `comment` (với `scale` 5: câu đã sửa hoặc câu mặc định theo `stars`; phiếu `scale` 3: null, client hiện câu cũ theo `stars`), `note`; KHÔNG nhận `criteria`. GV nhận `comment` thô (null = chưa sửa). Client mới coi `scale` thiếu (cache cũ) là 3.
- Pull/snapshot `slip` thêm `criteria` (chỉ GV), `comment`, `scale`.

## Báo cáo
- Bản chụp thêm `stars5: {s5,s4,s3,s2,s1,s0}` = số buổi theo sao của phiếu `scale` 5 đã gửi; `stars: {three,two,one}` chỉ đếm phiếu `scale` 3. Bản chụp cũ không có `stars5` → client coi như 0.
  Vị trí: `stars5` nằm CẠNH `stars` ở cấp ngoài của snapshot/preview (không lồng trong `stars`), ví dụ: `"stars": {"three":0,"two":1,"one":0}, "stars5": {"s5":1,"s4":0,"s3":0,"s2":0,"s1":0,"s0":0}`.
- Đợt theo tháng: `POST /classes/:id/report-batches` nhận `{month: "YYYY-MM", id?}` (thay cặp `from_session_id`/`to_session_id`, vẫn chấp nhận cặp cũ cho client cũ). Đợt lưu `month`, `from_key = YYYY-MM-01 00:00`, `to_key = YYYY-MM-31 23:59`, hai session id null. Dữ liệu = buổi không huỷ trong tháng; học sinh đang học trong tháng. Nhiều đợt cùng tháng được phép; replay cùng `id` khác `month` → 409.
- API đợt/pull `report_batch` thêm `month` (null ở đợt cũ → client giữ tên cũ; đợt tháng → tên "Tháng M/YYYY"). `from_number`/`to_number` GIỮ cho đợt cũ (deprecated), null ở đợt theo tháng. Sai `month` → 422 với `error.details.fields.month = "must_be_month"`.

## Số buổi
- `session_number` (và `from_number`/`to_number`) GIỮ trong response, deprecated, client mới bỏ qua; không bắt buộc ở request. Gỡ sau khi web+iOS mới phát hành.

## Migration `0008`
- Dựng lại `session_comments` (CHECK `stars` 0..5, `scale`, `criteria`, `comment`) cùng trigger/chỉ mục; `report_batches` thêm cột `month`. Rollback: khôi phục từ bản export trước khi chạy. Sẽ diễn tập trên bản sao export như 0006/0007.

## Ghi chú
- Mít ánh xạ 0–5 sao do iOS đề xuất; backend không ảnh hưởng.

---

# Thay đổi hợp đồng API · 2026-10-25 · Xoá báo cáo (xoá mềm cả đợt)

Hợp đồng CHỐT; code ở nhánh `mvp-backend` (commit `3fa5bf3`). Staging 2026-10-25: migration `0007` ĐÃ chạy, Worker ĐÃ deploy version `50a56056-98c3-4cfb-8fd4-23c9b8d0aec2` (rollback `09a794bc-d086-4064-b313-a83eac70e6f4`). Smoke xoá/ẩn/409/404 đạt; smoke đầy đủ gồm lượt PH (pull PH deleted[] có report_publication) đạt 2026-10-25. Nguồn: brief 90, `docs/spec.md` (main `b62ca8f`).

| Endpoint | Hành vi |
|---|---|
| `DELETE /v1/report-batches/{id}` | Xoá mềm một đợt (một lần "Thêm báo cáo": mọi báo cáo của học sinh và mọi bản phát hành), cả nháp lẫn đã phát hành. `200 {id, deleted:true}`. Gọi lại trên đợt đã xoá ⇒ `200` y hệt (idempotent). |

- Quyền như phát hành: nhóm `comments_reports` ghi trên lớp của đợt (Admin, hoặc giáo viên được giao lớp). Phụ huynh ⇒ `403`; người không vào được lớp ⇒ `403`; đợt không có/khác workspace ⇒ `404`. Không `If-Match`/`base_version`. Cần mạng: client không xếp outbox.
- Sau khi xoá, ẩn với giáo viên và phụ huynh: `GET /classes/{id}/report-batches`; `GET /report-batches/{id}/reports`, `GET /reports/{id}/preview`, `PUT /reports/{id}`, `POST /reports/{id}/publish`, `POST /report-batches/{id}/publish` ⇒ `404`; `GET /students/{id}/reports` (GV và PH) bỏ các mục của đợt; `GET /reports/{id}/publications/{no}` ⇒ `404`; đường đọc theo tháng cũ cũng bỏ. Thông báo "báo cáo mới" (`report_published`) của báo cáo đó biến khỏi `GET /notifications` và push chưa gửi sẽ không gửi.
- Sync: `/sync/snapshot/{report_batch|report|report_publication}` không còn bản ghi của đợt. `/sync/pull` đưa vào `deleted[]` (`{entity,k1,k2}`): giáo viên nhận `report_batch` + từng `report` + từng `report_publication`; phụ huynh nhận từng `report_publication` ⇒ client xoá khỏi cache/offline. Client mở lại sau thời gian dài (cursor quá hạn) sẽ tải lại snapshot nên cũng không thấy.
- `POST /classes/{id}/report-batches` với `id` của đợt đã xoá ⇒ `409 id_conflict`. Không có khôi phục. Dữ liệu và bản chụp vẫn nằm trong D1.
- Migration `0007`: thêm `report_batches.deleted_at`, `deleted_by` (NULL = còn). Rollback: bỏ hai cột.

---

# Thay đổi hợp đồng API · 2026-10-25 · Bỏ điểm tối đa của bài kiểm tra

Hợp đồng CHỐT (chưa code, chưa migration, chưa deploy). Nguồn: brief 89, `docs/spec.md` (main `5c382cf`). Không thêm endpoint mới.

- **Bài kiểm tra không còn `max`**: `test.create` / `test.update` chỉ dùng `name`, `date`. Client cũ gửi `max` ⇒ bỏ qua, không lỗi (không validate). `GET /classes/{id}/tests` và thực thể `test` của `/sync/pull` bỏ trường `max`. Client mới không được phụ thuộc `max`.
- **Điểm** (`score.set`, `value`): `null` hoặc số 0..1000, bước 0,5. Ngoài khoảng, âm, hoặc lẻ khác bước ⇒ `422 validation_error` `details.reason` = `invalid_score` / `invalid_score_step` (như cũ). Mã `score_above_max` và `max_below_score` BỎ HẲN (không còn xuất hiện).
- **Báo cáo**: `GET /reports/{id}/preview`, `GET /students/{id}/report-preview` và snapshot phát hành mới: `tests[]` = `{test_id, name, date, value}` (không `max`). Bản phát hành cũ có thể còn `max` trong snapshot ⇒ client đọc được nhưng không hiện.
- **Chênh lệch %, "Cần chú ý" (b), biểu đồ**: tính ở client từ điểm thô, máy chủ không tính và không trả trường mới.
- **"Gán điểm mặc định"**: không có endpoint riêng; client gửi một `score.set` (`value: 15`) cho mỗi học sinh đang hiện, đi outbox như sửa điểm thường (có `base_version` của hàng điểm). Mỗi `POST /sync/push` tối đa 50 lệnh ⇒ lớp > 50 học sinh phải chia nhiều lượt push.
- **Migration** `0006` (xoá `tests.max`, bỏ trigger guard max): ĐÃ chạy trên D1 staging 2026-10-25 (tests 49→49, scores 81→81). Worker staging version `09a794bc-d086-4064-b313-a83eac70e6f4` (commit `06ace78`); bản trước để rollback `ee52ca30-4684-4760-8c79-e20b4c7dbef5`. Rollback: `ALTER TABLE tests ADD COLUMN max INTEGER NOT NULL DEFAULT 15 CHECK (max BETWEEN 1 AND 1000)` + redeploy bản trước. Backup D1 trước migration: `~/.config/qlh-backups/qlh-staging-db-pre-0006-20261025.sql`.

---

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
