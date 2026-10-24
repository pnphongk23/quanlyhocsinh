# Review tổng thể backend (review-impl-r1)

Ngày: 2026-10-22 · Worktree `mvp-backend`, `worker/`, commits `f31d26b..HEAD` (`4b57f24`…`1f5fbf4`) trên nền trước đó · Chỉ đọc, không sửa mã.

Đã đọc: toàn bộ `worker/src/**` (17 file `db/`, 12 file `routes/`, middleware, `lib/`, `index.ts`), `worker/migrations/0001_schema.sql`, `0002_triggers.sql`, `worker/tests/**` (82 test), và `docs/spec.md`, `plans/.../api-spec.md`, `authz-matrix.md`.
Đã chạy: `npm run typecheck` → pass; `npx vitest run` → 20 file / 82 test pass (3.4 s). Mọi phát hiện dưới đây là đọc mã + suy luận có đối chiếu test, không phải kết quả test đỏ.

### Trạng thái worktree (không do review này tạo)

`git status` tại thời điểm review có 3 thay đổi **chưa commit** (từ việc đo CPU backend-04, không thuộc `f31d26b..HEAD`):

- `worker/src/probe.ts` (mới) + `worker/src/index.ts:9,79` mount `app.route('/__probe', probe)` — route công khai, không xác thực, mỗi lần gọi chạy PBKDF2 100.000 vòng hoặc RS256 (tự sinh key). Trước khi deploy staging phải xoá cả file và dòng `import`/`route`; nếu không, đây là endpoint đốt CPU công khai.
- `worker/wrangler.jsonc:35` đã điền `database_id` staging (thay `REPLACE_AT_DEPLOY`) — thay đổi deploy hợp lệ, nên commit riêng.

Kết luận trong báo cáo này tính cho mã đã commit; typecheck/test ở trên chạy trên cây có cả 3 thay đổi đó.

## 0. Kết luận nhanh

Lõi phân quyền tốt: mọi truy vấn đều gắn `workspace_id`, phạm vi phụ huynh (`guardian_student` → `students.class_id`) đúng, phụ huynh chỉ đọc, `must_change_password` chặn đúng chỗ, payload FCM không có nội dung, log không có SĐT/mật khẩu/token/nội dung nhận xét. Có **1 BLOCKER** ở luồng chọn vai trò (đa vai trò), **2 MAJOR** (hợp đồng `GET /classes/{id}/tests`, sửa lịch lặp sinh buổi trùng ngày), phần còn lại là MINOR và lỗ hổng test.

## 1. BLOCKER

### B1. Người dùng có ≥ 2 vai trò bị khoá cứng: không chọn được vai trò, `/me` cũng 403

- Mã: `worker/src/routes/auth.ts:274` (login đặt `active_membership_id = null` khi > 1 membership) → ghi `auth_sessions.membership_id = NULL` (`:284`); `worker/src/db/identity.ts:121` (`membership_id === null` ⇒ trả `membership_required`); `worker/src/middleware/auth.ts:76` biến lỗi đó thành `403 forbidden {reason:"membership_required"}` cho **mọi** route không thuộc `/sync/*`.
- Kịch bản cụ thể: giáo viên T đã có membership Admin/Giáo viên; T dùng đúng SĐT đó khai `parent_phone` cho một học sinh rồi bấm "Cấp mật khẩu" ⇒ `issueGuardianCredentials` tạo membership Phụ huynh thứ hai (`worker/src/db/auth.ts:817-880`). T đăng nhập → `active_membership_id: null`. T gọi `PUT /v1/session/membership` để chọn vai trò → middleware chạy `authenticate()` trước khi vào handler ⇒ **403 `membership_required`**. `GET /v1/me` cũng 403, nên client không có đường nào tự chữa. Chỉ `/v1/sync/*` dùng được (vì `middleware/auth.ts:41-52` dựng identity rỗng rồi `syncIdentity()` tự chọn membership theo tham số).
- Đối chiếu: api-spec mục 4 ("Từ hai vai trò trở lên ⇒ `null`, client hiển thị màn chọn vai trò rồi gọi `PUT /session/membership`"), spec mục 4 ("Một SĐT có thể có nhiều role… chọn vai trò… đổi được trong Cài đặt"), authz-matrix T21.
- Đề xuất: cho hai route `/session/membership` và `/me` (và chỉ hai route này) chạy với identity "session-only" khi `membership_id IS NULL` — `authenticateSession()` đã có sẵn; `/me` trả `user` + `memberships` + `active_membership_id: null`, `PUT /session/membership` chỉ cần `userId` + `sessionId`. Không hạ chuẩn xác thực ở các route khác. Kèm test: đăng nhập bằng SĐT có 2 membership thật (không `UPDATE auth_sessions` tay) rồi chọn vai trò, sau đó đọc dữ liệu theo vai trò mới.

## 2. MAJOR

### M1. `GET /classes/{id}/tests` trả sai hình dạng: `items` là object D1Result, không phải mảng

- Mã: `worker/src/db/tests-scores.ts:5-30` — hàm `return db.prepare(...).all()` (trả `D1Result` gồm `results/success/meta`); `worker/src/routes/tests-scores.ts:7-15` — `const items = await listTests(...); c.json({ items })`. Trong khi `GET /tests/{id}/scores` cùng file lại unwrap đúng (`result.results`).
- Kết quả thực tế: `{"items":{"results":[…],"success":true,"meta":{"duration":…,"changes":…,"rows_read":…}}}` thay vì `{"items":[…]}` của api-spec 5.4. Client đọc `items.map` sẽ vỡ; ngoài ra `meta` của D1 bị lộ ra ngoài.
- Đề xuất: `return (await …all()).results` (hoặc map) trong `listTests`, và thêm assert hình dạng trong test.

### M2. `PATCH /classes/{id}` đổi `start_time` sinh thêm buổi trùng ngày hôm nay

- Mã: `worker/src/db/classes.ts:143-150` — khi `changedSchedule`: chỉ `DELETE … AND date > ?` (today) rồi `insertSessions(db, …, today, until, …)` (chèn từ **hôm nay**).
- Kịch bản: hôm nay là Thứ Ba, lớp học 18:00, buổi hôm nay còn `planned`. Giáo viên `PATCH {"start_time":"17:30","base_version":1}`. Buổi 18:00 hôm nay **không** bị xoá (điều kiện `date > today`), và `insertSessions` chèn buổi 17:30 hôm nay. `UNIQUE(class_id,date,start_time)` không chặn vì khác giờ ⇒ **2 buổi cùng ngày**; `session_number` (đếm mọi buổi chưa hủy theo `date,start_time`) lệch, phiếu/điểm danh/BTVN dễ gắn nhầm buổi, báo cáo tháng đếm sai buổi.
- Đề xuất: với buổi `date = today` còn `planned` và không có dữ liệu (attendance/session_comments/homework_sections), đưa vào nhánh xoá/đổi như buổi tương lai; chỉ `insertSessions` từ `today` khi buổi hôm nay đã bị xoá/đổi. Kèm test PATCH `start_time` (hiện `tests/classes.test.ts` chỉ PATCH `name`).

## 3. MINOR

| ID | Vị trí | Phát hiện | Đề xuất |
|---|---|---|---|
| m1 | `worker/src/db/sync.ts:280-281`, `:157-163`; test `tests/sync.test.ts` ("uses current permissions…") | Lệnh `rejected` vẫn được ghi vào `applied_commands`; gửi lại cùng `command_id` (đúng kịch bản mất response giữa chừng) trả `duplicate` + `original_status:"rejected"`. Client làm đúng câu chữ api-spec 6.1 ("`duplicate` … coi như đã nhận") sẽ **xoá lệnh** và mất thay đổi mà không hiện lỗi. Hành vi có chủ đích và có test, nhưng là bẫy hợp đồng. | Ghi rõ trong api-spec: `duplicate` + `original_status="rejected"` phải hiện lỗi và giữ lệnh; hoặc trả lại `rejected` cho receipt-rejected. |
| m2 | `worker/src/db/sessions.ts:101-165` (replay khi hủy buổi, `INSERT INTO change_log` ở `:116`) | Chỉ phát lại `homework_grade` khi cổng hiển thị **mở ra** (phiếu buổi chấm mới đã gửi). Khi cổng **đóng lại** (phiếu buổi chấm mới chưa gửi), không có dòng `change_log` nào ⇒ `pull` không trả `deleted`, cache phụ huynh giữ kết quả chấm cũ đã lộ trước đó. | Thêm nhánh phát lại `op='delete'`/`deleted` cho các ô vừa bị ẩn khi hủy buổi, hoặc ghi nhận đây là giới hạn đã biết trong api-spec 6.5. |
| m3 | `worker/src/db/auth.ts:538-556` (`changePassword`) | Thu hồi mọi phiên khác nhưng không xoá `device_tokens` của các phiên đó (api-spec 7: "Đăng xuất/thu hồi phiên xoá token gắn với phiên"). Không rò push vì sender chặn phiên `revoked`, nhưng rác token vẫn còn và `DELETE /device-tokens` của phiên mới có thể không dọn. | Thêm `DELETE FROM device_tokens WHERE auth_session_id IN (…)` vào cùng batch. |
| m4 | `worker/src/db/authz.ts:38-58` (`isInScope`) | Với phụ huynh, cặp `{classId, studentId}` không được kiểm là *cùng* một em: `{classId: C1 (con A), studentId: S2 (con B, lớp C2)}` vẫn qua. Hiện chưa khai thác được vì mọi truy vấn còn lọc theo `linkedStudentIds`/`student_id`, nhưng là lỗ tiềm ẩn cho query tương lai chỉ dùng `classId` + `studentId` từ input. | Yêu cầu `classId` = `students.class_id` của chính `studentId` (tra một dòng) hoặc bỏ `classId` khỏi resource của phụ huynh. |
| m5 | `worker/src/db/attendance.ts:57-125` (`setAttendance`) | Đường ghi thứ hai, không route nào dùng (chỉ `tests/attendance.test.ts` gọi). Ngữ nghĩa khác sync: xung đột `version` trả `409` (không `noop`), buổi hủy trả `session_not_started`, `late_at` khác `late` bị bỏ im lặng. Vi phạm quy tắc "chỉ một đường ghi qua sync" (api-spec 5) và test đang phủ một hàm không chạy thật. | Xoá hàm + chuyển test sang `POST /sync/push` (`attendance.set`). |
| m6 | `worker/src/index.ts:105-113` | Log lỗi 500 ghi `c.req.path` nguyên văn, gồm ID tài nguyên/UUID; api-spec mục 0 yêu cầu "đường dẫn đã bỏ ID người dùng". Không có SĐT/nội dung nên không phải rò dữ liệu cá nhân. | Chuẩn hoá path (thay UUID bằng `:id`) trước khi log. |
| m7 | `worker/src/routes/index.ts:23-25` | `/health` trả `version: ENVIRONMENT` ("local"/"staging") thay vì git sha như api-spec 8. | Bơm `GIT_SHA` qua `vars`/`wrangler` hoặc ghi rõ đây là tạm. |
| m8 | `worker/src/db/sync.ts:160,201,263`, `worker/src/db/reports.ts:257,274`, `worker/src/middleware/auth.ts:76`, `worker/src/lib/errors.ts:75` | Mã lỗi ngoài bảng mục 1: `session_cancelled`, `pdf_already_uploaded`, `pdf_storage_unavailable`, `command_expired`, `command_id_used`, `membership_required`, `student_class_mismatch`, `invalid_late_at`. Phần lớn nằm ở `details.reason` (được phép), nhưng một số là `code` cấp ngoài (`pdf_storage_unavailable` 503, `membership_required` 403). | Bổ sung vào bảng mã lỗi api-spec mục 1 hoặc đổi về `conflict`/`forbidden` + `details.reason`. |
| m9 | `worker/src/db/auth.ts:213-262` (`getMe`) | Trả cả membership `status='disabled'` (api-spec không nói rõ, nhưng client sẽ hiện vai trò đã bị vô hiệu). | Lọc `status='active'` hoặc ghi rõ hợp đồng. |
| m10 | `worker/src/routes/auth.ts:436-445` (`user_id` ở `:443`) | Response `guardian-credentials` có thêm `user_id` (ngoài api-spec 4). Không rò dữ liệu (chỉ cho giáo viên vừa cấp), nhưng lệch hợp đồng. | Bỏ hoặc cập nhật api-spec. |
| m11 | `worker/src/db/reports.ts:115` | `previewReport.ready` luôn `true` (spec mục 8: "xem em nào đủ dữ liệu"). | Tính `ready` thật hoặc ghi chú tạm. |
| m12 | `worker/src/db/classes.ts:131-159` | `db.batch` không kiểm `changes()` của câu `UPDATE classes … AND version = ?`: hai PATCH đồng thời có thể làm buổi học bị sinh lại theo lịch mới trong khi hàng `classes` vẫn ở lịch cũ (lệch trạng thái, không lỗi). | Thêm `WHERE EXISTS(SELECT 1 FROM classes … version = ?)` cho các câu session, hoặc kiểm `meta.changes` sau batch và báo `version_conflict`. |
| m13 | `worker/src/db/homework.ts:35-70` | `GET /sessions/{id}/homework` trả `sections` của buổi `{id}` nhưng `grades` của buổi **trước** `{id}` (điều kiện `next.id = {id}`). Hợp lý cho tab "Bài tập buổi trước" nhưng không được mô tả ở api-spec 5.4. | Ghi rõ trong api-spec kèm ví dụ, tránh client tự suy. |

## 4. Đã kiểm và thấy đúng (để đối chiếu, không phải phát hiện)

- **Cô lập workspace/phạm vi**: mọi truy vấn ở `db/*` có `workspace_id = ?` (`classes`, `students`, `sessions`, `attendance`, `tests`, `scores`, `session_comments`, `homework_*`, `reports`, `notifications`, `sync_conflicts`, `change_log`); ID ngoài phạm vi trả 404 (T04/T06/T07 có test; `tests/sync.test.ts`, `tests/sessions.test.ts`, `tests/classes.test.ts`).
- **Phụ huynh chỉ đọc**: `assertStaffWrite` chặn mọi lệnh push (`sync.ts:264`, mọi lệnh `rejected forbidden`, có test); `requireAccess` chặn `level='write'` cho `linked_students`; trigger `role_perm_guardian_cap_*` là lớp chặn thứ hai.
- **Phụ huynh chỉ thấy nội dung đã gửi/phát hành**: `pull`/`snapshot` lọc `slip.status='sent'`, `tests.archived=0`, `scores` của bài lưu trữ, `homework_grade` chỉ khi phiếu buổi chấm đã gửi (`sync-read.ts:37-52`, lọc log ở `:104-106`); `report`/`conflict` bị loại khỏi danh sách thực thể; `students` không có `parent_phone`, `class_session` không có `note` (có test T08/T11/T12/T13/T14 dạng hành vi trong `tests/sync.test.ts`).
- **Không rò dữ liệu trẻ khác qua pull**: `change_log` lọc `student_id IN (guardian_student)` + `class_id` theo lớp của con (`sync-read.ts:112-118`); `deleted` chỉ sinh từ các dòng log đã qua bộ lọc đó.
- **`/calendar` của phụ huynh**: chỉ buổi của lớp có con, không `note` (test T34 trong `tests/sessions.test.ts`).
- **`must_change_password`**: chặn ở middleware (`PASSWORD_CHANGE_ALLOWED_PATHS` chỉ `/me`, `/auth/change-password`, `/auth/logout`) và ở `syncIdentity`; token/device-token cũng chặn (có test).
- **IDOR tuyệt đối qua SĐT**: `guardian-credentials` áp đúng điều kiện B-01 (`routes/auth.ts:377-398` + `countDisqualifyingMemberships` `db/auth.ts:743-759` đúng truy vấn api-spec không lọc `status`), trả `409 account_not_resettable` không kèm chi tiết (có test).
- **Đúng spec nghiệp vụ**: không có endpoint ngoài MVP (không `/lectures`, không học phí/lương/nhân sự); dữ liệu offline-được ghi **chỉ** qua `POST /sync/push`; `session_number` suy ra khi đọc và `null` với buổi đã hủy (có test); `test.create` mặc định `max = 15`, `1..1000`; `max_below_score`/`score_above_max`/`test_has_scores` qua trigger + map lỗi; không có điểm trung bình/`Vắng thi` ở bất kỳ truy vấn nào (rg toàn `src` không có `avg`/`trung bình`).
- **Sync**: UUID lệnh trùng ⇒ `duplicate` kèm `original_status` và không sinh lại `change_log`/`attendance_history`/`notifications` (test đối chiếu đếm dòng thật); `base_version` cho 4 loại "ô" đúng bảng api-spec 6.1 (kể cả `noop` khi `B < V` cùng giá trị và `base_version_ahead`); xung đột lưu **cả hai** giá trị vào `sync_conflicts` và `conflict.resolve` xử lý `conflict_stale`; lô HTTP không atomic đúng B-02 (test "commits valid commands around a rejected command"); `cursor`/`epoch` ⇒ `409 snapshot_required` (`log_truncated`) vs `resync_required` (`scope_changed`) phân biệt đúng (có test); mỗi lệnh một batch atomic, receipt `applied_commands` ràng buộc side-effect bằng `EXISTS(...)`.
- **Log/PII**: chỉ 2 chỗ `console.error` (`index.ts:48`, `:111`) — chỉ `code`, `job`, `request_id`, `method`, `path`; không log body, không SĐT, không mật khẩu, không token, không nội dung nhận xét; `errorBody` chỉ trả `code/message/details/request_id`.
- **FCM**: payload chỉ `notification.title` chung + `data{kind, notification_id, student_id, session_id, report_id, test_id}` (`fcm-sender.ts:310-341`), không có nhận xét/điểm/sao/SĐT; tiêu đề không chứa tên học sinh; fanout có trần (5 inbox/20 đăng ký/5 delivery), phân trang trước lọc sau, lease CAS, sender kiểm lại quyền/liên kết/phiên ngay trước khi gửi; không log token/access token/service account.

## 5. Chất lượng test

Test nói chung là test hành vi thật (gọi HTTP → assert status + đọc lại DB: đếm `change_log`, `attendance_history`, `score_history`, `notifications.event_version`, version của ô), không tautology; các ca khó (fanout có trần, lease, `conflict_stale`, B-02, phát lại BTVN khi hủy buổi, `snapshot_required` vs `resync_required`) đều có. Lỗ hổng cụ thể đã để lọt phát hiện ở trên:

| Lỗ hổng test | Đã để lọt |
|---|---|
| Không có test đăng nhập bằng SĐT có ≥ 2 membership rồi chọn vai trò (test hiện `UPDATE auth_sessions` tay) | B1 |
| `tests/tests-scores.test.ts` chỉ assert `status === 200`, không assert hình dạng `items` | M1 |
| `tests/classes.test.ts` chỉ PATCH `name`/`status`, không PATCH `weekdays`/`start_time` | M2 |
| Không có test quét log (T26 trong authz-matrix) | m6 (và không chứng minh được "không log PII" bằng máy) |
| `tests/attendance.test.ts` phủ `db.setAttendance` (hàm không có route), không phủ các nhánh `attendance.set` qua push như buổi đã hủy | m5 |

## 6. Thứ tự xử lý đề xuất

1. B1 (chặn toàn bộ nhóm người dùng có 2 vai trò) — sửa nhỏ, thêm test luồng thật.
2. M1 (một dòng sửa, vỡ client ngay khi đọc bảng điểm).
3. M2 (sai dữ liệu buổi học, cần test lịch).
4. m1/m2/m3 (hợp đồng + dọn dẹp), rồi các mục còn lại khi rảnh.

Status: CHANGES_REQUIRED
Summary: Đã xác minh trong mã: phân quyền theo workspace/phạm vi và luật "phụ huynh chỉ đọc, chỉ thấy nội dung đã gửi" đúng, sync idempotent/CAS/xung đột/cursor đúng hợp đồng, log và payload FCM không lộ SĐT–điểm–nhận xét; typecheck pass và 82/82 test pass. Nhưng luồng đa vai trò bị khoá cứng 403 sau đăng nhập (BLOCKER), `GET /classes/{id}/tests` trả sai hình dạng `items`, và `PATCH` lịch lặp đổi `start_time` sinh buổi trùng ngày hôm nay (2 MAJOR) — cần sửa trước khi coi backend là xong.

## Đã sửa (Mục C — PATCH lớp, M2 + m5)

- **M2 (`worker/src/db/classes.ts`)**: khi `changedSchedule`, nhánh xoá/đổi lịch áp cho `date >= hôm nay` (trước là `> hôm nay`) nên buổi **hôm nay** còn `planned` + chưa có dữ liệu cũng bị thay bằng buổi của lịch mới; `insertSessions` chuyển sang `INSERT … SELECT … WHERE NOT EXISTS(buổi cùng lớp cùng ngày)` nên không bao giờ sinh buổi thứ hai trong một ngày (kể cả ngày có buổi đã hủy/buổi lẻ/đã có dữ liệu). Buổi đã có `attendance`/`session_comments`/`homework_sections` vẫn được giữ và đổi `origin='manual'`; buổi `held`/`cancelled`/`manual` không bị đụng. `session_number` sau đổi vẫn suy ra đúng khi đọc (mỗi ngày một buổi, số liên tục).
- **m5 (`worker/src/db/attendance.ts`)**: xoá `setAttendance` (đường ghi thứ hai không route nào dùng, ngữ nghĩa khác sync). `tests/attendance.test.ts` chuyển sang `POST /sync/push` (`attendance.set`: `applied` version 2 + `attendance_history`, `base_version` cũ ⇒ `conflict` kèm `server`, không throw) và thêm ca buổi `cancelled` ⇒ `rejected … reason: session_cancelled`, không ghi ô.
- Test hồi quy mới ở `tests/classes.test.ts`: đổi `start_time` trong ngày (1 buổi/ngày, buổi 18:00 hôm nay bị thay, số buổi 1..N), buổi hôm nay + buổi tương lai đã có điểm danh (giữ nguyên giờ cũ, lịch mới áp cho phần còn lại, 1 buổi/ngày), đổi `weekdays` (buổi ngày cũ bị dọn, chỉ còn thứ mới). Cả 3 test đỏ trước khi sửa.
- **Câu hỏi**: spec không nói trường hợp buổi hôm nay còn `planned` mà đã có điểm danh/phiếu/BTVN ⇒ đã thêm **Q17** vào `api-spec.md` mục 10 và cập nhật dòng "Sửa lịch lặp" ở `data-model.md` mục 4 theo quy tắc tạm: giữ buổi hôm nay, áp lịch mới từ buổi kế tiếp, không hai buổi cùng ngày.
- Chưa làm (ngoài phạm vi Mục C): **m12** (batch `UPDATE classes … AND version` không kiểm `changes()` của câu session) — cần harness chen giữa hai PATCH, hiện chưa có cách viết test chứng minh trong bộ test này.
- Kiểm chứng: `npm run typecheck` pass; `npm test` 21 file / 89 test pass (sau khi các worker Mục A/B hoàn tất phần đang dở; lỗi tạm thời của `auth-multi-role`/`tests-scores` không thuộc Mục C).

## Đã sửa (Mục B — tests/scores, M1)

- **M1** (`worker/src/db/tests-scores.ts`, `worker/src/routes/tests-scores.ts`): `listTests` trả nguyên `D1Result` nên route bọc thành `{"items":{"results":…,"success":…,"meta":…}}`. Nay `listTests`/`listScores` trả `result.results` (mảng; type `TestRow[]` và `ScoreRow[] | null`), route trả `{"items":[…]}` đúng api-spec 5.4 cho cả `GET /classes/{id}/tests` và `GET /tests/{id}/scores`; `meta` của D1 không còn lọt ra ngoài.
- Test hồi quy `tests/tests-scores.test.ts`: assert `Object.keys(body)` chỉ có `items`, `Array.isArray(items)`, đúng số dòng và đúng bộ trường của `test` (`id, class_id, name, date, max, archived, version`) và `score` (`test_id, student_id, value, version, updated_at`), kiểm thêm phụ huynh nhận mảng và chỉ dòng của con. Test đỏ trước khi sửa (fail ở `Array.isArray`), xanh sau.
- **MINOR m8 không thuộc mục này**: các mã lỗi ngoài bảng của m8 nằm ở `db/sync.ts`, `db/reports.ts`, `middleware/auth.ts`, `lib/errors.ts` (không phải file Mục B). Trong `db/tests-scores.ts` + `routes/tests-scores.ts` không có mã lỗi ngoài bảng (`not_found`, `forbidden` đều có trong bảng mục 1), không phát hiện MINOR khác thuộc nhóm này.
- Kiểm chứng: `npm run typecheck` pass; `npm test` 21 file / 89 test pass (gồm thay đổi chưa commit của worker Mục A đang chạy song song).

## Đã sửa (Mục A — đa vai trò, B1)

- **B1** (`worker/src/middleware/auth.ts`, `worker/src/db/identity.ts`, `worker/src/routes/auth.ts`): tách `sessionIdentity(session)` (danh tính chỉ từ phiên, dùng chung với nhánh `/sync/*`). Khi `authenticate()` trả `membership_required` và path thuộc nhóm tài khoản — `/v1/me`, `/v1/session/membership`, `/v1/auth/logout`, `/v1/auth/change-password`, `/v1/workspaces` — middleware dùng danh tính phiên thay vì 403; mọi route miền khác vẫn `403 forbidden details.reason = membership_required`. `GET /me` trả `active_membership_id: null` khi chưa chọn vai trò (nới kiểu tham số `getMe` thành `string | null`, `worker/src/db/auth.ts` chỉ đổi kiểu). `PASSWORD_CHANGE_ALLOWED_PATHS` giữ nguyên nên `must_change_password` vẫn chặn `PUT /session/membership` đúng spec mục 4.
- Ghi chú phạm vi: thêm `/v1/workspaces` vào nhóm chỉ-cần-phiên vì authz-matrix dòng 22 và api-spec 4 xếp "tạo thêm workspace" cùng nhóm với `/me`, đổi vai trò, đăng xuất, đổi mật khẩu (handler chỉ dùng `identity.userId`). Không đổi hợp đồng nào của api-spec.
- Test hồi quy mới `worker/tests/auth-multi-role.test.ts`: dựng user 2 membership thật (admin + guardian cùng workspace qua helper DB) rồi đăng nhập bằng HTTP (không sửa tay `auth_sessions`) ⇒ `active_membership_id: null`; trước khi chọn vai trò `GET /classes` bị 403 kèm `reason: membership_required` nhưng `GET /me` 200 (đủ 2 membership, `active_membership_id: null`), `POST /workspaces` 201, đổi mật khẩu 200, đăng xuất 204; sau `PUT /session/membership` (giáo viên) `GET /classes` 200; đổi sang phụ huynh thì đọc 200 nhưng `PATCH /classes/{id}` 403. Ca `must_change_password = 1` ⇒ `/me` 200 nhưng đổi vai trò 403 `password_change_required`. Test đỏ trước khi sửa (403 ở `/me` và ở đổi mật khẩu), xanh sau.
- Kiểm chứng: `npm run typecheck` pass; `npm test` 21 file / 89 test pass (cây có cả thay đổi của worker Mục B/C). Chỉ commit 5 file của mục này (`a80f33e`), không push.
