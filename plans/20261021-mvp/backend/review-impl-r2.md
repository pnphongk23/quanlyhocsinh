# Review tổng thể backend — vòng 2 (review-impl-r2)

Ngày: 2026-10-22 · Worktree `mvp-backend` (HEAD `a80f33e`), `worker/` · Chỉ đọc, không sửa mã.

Đã đọc: `backend/review-impl-r1.md` (phát hiện + mục "Đã sửa"), `briefs/backend-05-review.md` (tiêu chí), `api-spec.md` (mục 0, 4, 5.1–5.4, 6.1–6.5), `authz-matrix.md` (mục 1, 2.1–2.5), và toàn bộ `worker/src/**` liên quan tới phân quyền/rò dữ liệu (`middleware/auth.ts`, `db/{identity,authz,auth,sync,sync-read,sessions,classes,attendance,tests-scores,reports,students,comments,homework,devices,notifications,notification-dispatch,fcm-sender,session-generation}.ts`, `routes/**`, `lib/errors.ts`, `index.ts`), `migrations/0001_schema.sql`, `0002_triggers.sql`, các test của 3 bản sửa.

Đã chạy (trên cây thật): `npm run typecheck` → pass (`tsc --noEmit`, exit 0); `npm test` → **21 file / 89 test pass** (17,75 s).

Đã làm thêm để **chứng minh test bắt được lỗi cũ** (không sửa cây thật): copy `worker/` sang `/tmp/r1verify` (symlink `node_modules`), rồi khôi phục **chỉ phần mã nguồn** của từng bản sửa về commit trước đó bằng `git show <commit>:<file>` và chạy lại đúng file test mới:

| Bản sửa | Mã bị khôi phục về bản cũ | Kết quả chạy test mới |
|---|---|---|
| `8a4f642` (M1) | `db/tests-scores.ts`, `routes/tests-scores.ts` ← `33a680c` | `tests/tests-scores.test.ts`: **1 failed / 1 passed** — đỏ đúng ở `expect(Array.isArray(tests.body.items)).toBe(true)` |
| `33a680c` (M2) | `db/classes.ts` ← `aad4f52` | `tests/classes.test.ts`: **3 failed / 2 passed** — cả 3 test lịch mới đều đỏ (2 buổi cùng ngày, buổi có dữ liệu bị đụng, đổi `weekdays`) |
| `a80f33e` (B1) | `middleware/auth.ts`, `db/{identity,auth}.ts`, `routes/auth.ts` ← `8a4f642` | `tests/auth-multi-role.test.ts`: **2 failed / 2** — `GET /me` 403 (thay vì 200) và `POST /workspaces` 403 (thay vì 201) |

Kết luận: cả ba bộ test hồi quy là test hành vi thật và **thực sự bắt lỗi cũ**, không phải tautology.

## 0. Kết luận nhanh

Ba bản sửa của r1 đều đúng, đúng spec, và có test hồi quy chứng minh (đã kiểm bằng cách chạy trên mã cũ). Riêng B1 khép kín: chỉ 5 route tài khoản được miễn, mọi route miền khác vẫn `403 membership_required`, `must_change_password` vẫn chặn đổi vai trò và `POST /workspaces`, không có đường lộ dữ liệu qua danh tính "chỉ phiên". Lượt rà độc lập **không tìm thấy BLOCKER hay MAJOR mới nào về phân quyền/rò dữ liệu**; phát hiện MAJOR duy nhất là **thiếu CORS/preflight** (chặn client web, và spec chưa nói ai chịu trách nhiệm). 12 MINOR còn hở của r1 (m5 đã sửa xong trong `33a680c`) và tôi đã hạ/giữ mức cho từng mục; thêm 5 MINOR mới.

## 1. Kiểm ba bản sửa của r1

### 1.1 `a80f33e` — miễn `membership_required` cho route tài khoản (B1): ĐẠT, khép kín

- **Cơ chế** (`worker/src/middleware/auth.ts:26-30`, `:66-84`): khi `authenticate()` trả `membership_required` **và** path ∈ `{/v1/me, /v1/session/membership, /v1/workspaces, /v1/auth/change-password, /v1/auth/logout}` thì dùng `sessionIdentity()`; mọi path khác vẫn `forbidden {reason:"membership_required"}` (`:83`).
- **`membership_required` chỉ phát sinh khi phiên không có vai trò** (`db/identity.ts:148`, `session.membership_id === null`), và `membership_id = null` **chỉ** được ghi lúc đăng nhập khi user có ≥ 2 membership `active` (`routes/auth.ts:271-274`; `listActiveMemberships` lọc `status='active'`, `db/auth.ts:195`). Nghĩa là **không** có đường nào để một membership bị vô hiệu/không thuộc user đi vào nhánh miễn trừ.
- **Không lộ dữ liệu**: `sessionIdentity()` (`db/identity.ts:71-95`) đặt `workspaceId=''`, `membershipId=''`, mọi quyền `none`, `classIds=[]`, `linkedStudentIds=[]`. Đã kiểm từng handler trong danh sách: `/me` chỉ dùng `userId` + `membershipId` (null) (`routes/auth.ts:342-345`, `db/auth.ts:213-275`), `/session/membership` chỉ dùng `userId`+`membershipId` của phiên với `findActiveMembership` (kiểm `user_id` + `status='active'`, `db/auth.ts:516-525`), `/auth/logout` dùng `sessionId`, `/auth/change-password` dùng `userId`+`sessionId`, `POST /workspaces` chỉ dùng `userId` (`routes/auth.ts:170-215`). Không handler nào đọc `identity.workspaceId` trong nhóm này, nên không thể "chạm" dữ liệu workspace bằng `workspace_id=''`.
- **Không nới quyền cho route miền**: mọi `requireAccess` với danh tính chỉ-phiên đều fail (quyền `none`) và mọi truy vấn `workspace_id=''` trả rỗng. Test đã khẳng định `GET /classes` vẫn 403 kèm `reason:"membership_required"` sau khi đăng nhập và trước khi chọn vai trò (`tests/auth-multi-role.test.ts:63-66`).
- **`/v1/workspaces` có đúng spec**: đúng. `api-spec.md` mục 4 ghi "POST /workspaces — Ai gọi: **mọi người dùng đã đăng nhập** (không bị `must_change_password`)"; `authz-matrix.md` dòng 22 xếp "tạo thêm workspace" cùng nhóm với `/me`, đổi vai trò, đăng xuất, đổi mật khẩu. Không đổi hợp đồng nào.
- **`must_change_password` vẫn chặn đúng**: `sessionIdentity` giữ cờ từ phiên (`db/identity.ts:93`); `PASSWORD_CHANGE_ALLOWED_PATHS` (`middleware/auth.ts:18-22`) **không** chứa `/v1/session/membership` và `/v1/workspaces` ⇒ `PUT /session/membership` và tạo workspace trả `403 password_change_required`, khớp `api-spec.md` mục 0 ("mọi endpoint trừ `/auth/change-password`, `/auth/logout`, `/me`"). Test phủ cả hai (`tests/auth-multi-role.test.ts:143-157`).
- **Ghi chú nhỏ, không phải lỗi**: nhánh miễn trừ đọc lại phiên bằng `authenticateSession()` (thêm 2 truy vấn D1 cho 5 route tài khoản, chỉ khi chưa chọn vai trò) — chấp nhận được; và `PUT /session/membership` không cập nhật `active_membership_id` của response `POST /workspaces` liền sau (client phải tự chọn vai trò) — không trái spec.

### 1.2 `8a4f642` — hình dạng `items` cho tests/scores (M1): ĐẠT

`db/tests-scores.ts:36-43` và `:59-75` trả `result.results` (mảng) với type `TestRow[]` / `ScoreRow[] | null`; route trả `{items: [...]}` cho cả hai endpoint (`routes/tests-scores.ts:14`, `:23`), `meta` của D1 không còn lọt ra. Test mới assert `Object.keys(body) === ['items']`, `Array.isArray`, đúng bộ trường của `test` và `score` (`api-spec.md` 6.4), và phụ huynh chỉ nhận dòng của con. Chạy trên mã cũ: đỏ đúng chỗ `Array.isArray`. Không còn chỗ nào khác trong `src` trả `D1Result` trực tiếp: `reports.ts`/`comments.ts`/`tests-scores.ts` đều đã unwrap `.results` ở route (đã rà từng file).

### 1.3 `33a680c` — PATCH lớp một buổi/ngày (M2) + bỏ `setAttendance` (m5): ĐẠT, còn một khe hẹp ở cron

- `db/classes.ts:145-158`: nhánh giữ-buổi-có-dữ-liệu và nhánh xoá đều dùng `date >= today`; `insertSessions` (`:43-63`) đổi sang `INSERT … SELECT … WHERE NOT EXISTS(buổi cùng lớp cùng ngày)` nên không sinh buổi thứ hai trong ngày. Buổi `held`/`cancelled`/`manual` không bị đụng (điều kiện `status='planned' AND origin='recurring'`). Đã kiểm nhánh `status='archived'` không sinh buổi (`:160-162`).
- Test: 3 ca mới đều đỏ trên mã cũ, xanh trên mã mới; `session_number` sau đổi lịch vẫn liên tục khi mỗi ngày một buổi.
- `db/attendance.ts`: `setAttendance` đã xoá, không còn tham chiếu (`typecheck` pass); `tests/attendance.test.ts` chuyển sang `POST /sync/push` (`applied`+`attendance_history`, `conflict` khi `base_version` cũ, `rejected … session_cancelled`).
- **Khe còn hở** (xem N3): cron vẫn dùng `INSERT OR IGNORE … VALUES` riêng, không có bất biến "một buổi/ngày".

## 2. MAJOR mới

### N1. Không có CORS/preflight: client web (Cloudflare Pages, khác miền) không gọi được API

- Mã: không tồn tại. `grep -rin "cors|Access-Control|preflight" worker/src` ⇒ 0 hit; `worker/src/index.ts` không có middleware CORS và không có handler `OPTIONS`; `apiRoutes` chỉ khai báo các route theo method thật (`routes/**`). Vì vậy `OPTIONS /v1/auth/login` rơi vào `app.notFound` (`src/index.ts:79-90`) ⇒ 404 không kèm `Access-Control-Allow-Origin`.
- Kịch bản: web app ở `https://<pages>.pages.dev` gọi `POST https://<worker>.workers.dev/v1/auth/login` với `Authorization`/`content-type: application/json`. Đây không phải "simple request" ⇒ trình duyệt bắt buộc preflight; preflight 404 không header CORS ⇒ trình duyệt chặn **mọi** request. iOS không bị (không có CORS). Toàn bộ MVP web (đăng nhập, đồng bộ, mọi màn) không chạy trên staging, dù backend đúng.
- Đối chiếu: `api-spec.md` mục 0 nói rõ "web chạy ở Cloudflare Pages, API ở miền khác"; **nhưng cả `api-spec.md`, `architecture.md`, `docs/spec.md` và các brief web đều không nói ai chịu CORS** (`grep -rin cors` trên `docs/`, `plans/` = 0 hit nghiệp vụ). Theo `AGENTS.md` ("spec chưa rõ: dừng lại và hỏi"), đây là điểm phải chốt chứ không phải tự chọn.
- Đề xuất (chọn một, ghi vào api-spec): (a) Worker thêm CORS có danh sách origin (staging Pages + localhost), `Vary: Origin`, cho phép `Authorization, Content-Type, X-Request-Id, X-Client`, `OPTIONS` trả 204, **không** dùng `*` vì token Bearer; hoặc (b) Pages proxy `/v1/*` cùng miền và Worker giữ nguyên (khi đó ghi rõ trong `architecture.md`). Kèm test: `OPTIONS` trả 204 + header đúng, và request từ origin lạ không được phản chiếu.

## 3. Các MINOR của r1: còn hở, mức thật, đề xuất

| r1 | Vị trí hiện tại | Trạng thái | Mức r2 | Xác minh / đề xuất |
|---|---|---|---|---|
| m1 | `db/sync.ts:157-163` (`prior`), `:280-287` (ghi receipt `rejected`) | còn | MINOR (bẫy hợp đồng) | Lệnh `rejected` vẫn được ghi vào `applied_commands`; gửi lại cùng `command_id` trả `duplicate` + `original_status:"rejected"` **kèm `error` gốc**. `api-spec.md` 6.1 vẫn dạy client `duplicate` ⇒ "coi như đã nhận" (xoá lệnh) ⇒ mất thay đổi mà không hiện lỗi (mạng đứt sau khi server đã từ chối). Đề xuất: bổ sung 1 dòng vào bảng 6.1 ("`duplicate` có `original_status="rejected"` ⇒ hiện lỗi, giữ lệnh"), hoặc trả lại `rejected` cho receipt đã rejected. |
| m2 | `db/sessions.ts:116-133` (join `slip.status='sent'` ở `:128-129`) | còn | MINOR | Hủy buổi chỉ phát lại `homework_grade` khi phiếu buổi chấm **mới** đã gửi; khi cổng **đóng lại** không có dòng `change_log` ⇒ `pull` không trả `deleted` ⇒ cache phụ huynh giữ kết quả chấm cũ. Lưu ý: `api-spec.md` 6.5(b) hiện cũng chỉ yêu cầu chiều mở, nên đây là lỗ hổng **spec + mã**. Đề xuất rẻ nhất: bỏ điều kiện join `slip` (ghi log cho **mọi** ô vừa đổi buổi chấm) — `pull` tự sinh `upsert` (còn lộ) hoặc `deleted` (vừa bị ẩn); hoặc ghi nhận giới hạn trong 6.5. |
| m3 | `db/auth.ts:538-556` (`changePassword`) | còn | MINOR | Thu hồi phiên khác nhưng **không** `DELETE FROM device_tokens` của các phiên đó (api-spec 7 yêu cầu). Không rò push: `PAGE_SQL`/`SENDER_OK_SQL` chặn phiên `revoked`/hết hạn (`notification-dispatch.ts:113-116`, `:183-184`); token rác tự lành khi client `PUT /device-tokens` (nhánh đổi binding, `db/devices.ts:93-123`). Đề xuất: thêm `DELETE FROM device_tokens WHERE auth_session_id IN (…)` vào cùng batch. |
| m4 | `db/authz.ts:38-56` (`isInScope`, nhánh `linked_students`) | còn, **chưa khai thác được** | MINOR (tiềm ẩn) | Cặp `{classId, studentId}` chỉ được kiểm *độc lập*: `{classId: lớp con A, studentId: con B}` vẫn qua. Tôi đã rà **mọi** call site hiện tại có truyền cả hai: `db/students.ts:67`, `db/students.ts:103`, `db/attendance.ts:36`, `db/reports.ts:39-42`, `:131-134`, `:213-216`, `:293-295` — tất cả lấy `class_id` **từ chính hàng của `studentId`**, nên chưa có đường lộ. Đề xuất: tra `students.class_id` của `studentId` và so, hoặc bỏ `classId` khỏi resource phụ huynh. |
| m5 | — | **ĐÃ SỬA** (`33a680c`) | — | Đã kiểm ở 1.3. |
| m6 | `src/index.ts:113` | còn | MINOR | Log 500 ghi `c.req.path` nguyên văn (có UUID tài nguyên); api-spec 0 yêu cầu "đường dẫn đã bỏ ID người dùng". Không có SĐT/nội dung. Đề xuất: thay UUID bằng `:id` trước khi log. |
| m7 | `routes/index.ts:23-25` | còn | MINOR | `/health` trả `version: ENVIRONMENT` ("local"/"staging"), không phải git sha như api-spec 8. |
| m8 | `db/sync.ts:147,160,201,210,263,354`, `db/reports.ts:254,274,300`, `middleware/auth.ts:83`, `db/auth.ts:908` | còn | MINOR | Mã ngoài bảng mục 1; sau B1, `membership_required` xuất hiện ở **hai** nhánh middleware (`:70` miễn trừ, `:83` từ chối) nên càng cần đưa vào bảng mã lỗi api-spec (403). |
| m9 | `db/auth.ts:213-275` (truy vấn membership **không** lọc `status`) | còn | MINOR, nay đáng sửa hơn | `/me` trả cả membership `status='disabled'`. Sau B1, `/me` là nguồn của **màn chọn vai trò**, nên client sẽ hiện một vai trò mà `PUT /session/membership` trả 404 (`db/auth.ts:516-525`). Đề xuất: lọc `status='active'` (hoặc ghi rõ hợp đồng). |
| m10 | `routes/auth.ts:444` | còn | MINOR | Response `guardian-credentials` có thêm `user_id` ngoài api-spec mục 4. Không rò (chỉ giáo viên vừa cấp). |
| m11 | `db/reports.ts:115` | còn | MINOR | `previewReport.ready` luôn `true`. |
| m12 | `db/classes.ts:163-169` | còn | MINOR | `UPDATE classes … AND version = ?` vẫn không kiểm `changes()`: hai `PATCH` đồng thời ⇒ các câu session của batch thứ hai đã commit trong khi `classes` giữ lịch của batch thứ nhất (buổi lệch lịch, response 200 nói lịch mới). Không có cách viết test chen giữa hai `batch` trong harness hiện tại. Đề xuất: thêm `WHERE EXISTS(SELECT 1 FROM classes WHERE … version = ?)` cho câu session hoặc kiểm `meta.changes`. |
| m13 | `db/homework.ts:39-44` | còn | MINOR (tài liệu) | `sections` của buổi `{id}` nhưng `grades` của buổi **trước**; api-spec 5.4 không mô tả. Đề xuất: ghi rõ + ví dụ. |

## 4. MINOR mới (lượt rà độc lập)

### N2. Vai trò đang chọn bị vô hiệu ⇒ phiên "kẹt" ở `403 account_disabled`, không tự chọn lại được vai trò

- Mã: `db/identity.ts:148-152` (chọn membership không `active` ⇒ `account_disabled`) + `middleware/auth.ts:81-82` (không thuộc nhánh miễn trừ). Kịch bản: user có 2 vai trò, chọn vai trò A (`auth_sessions.membership_id = A`); A bị vô hiệu (hiện chỉ làm được bằng tay ở DB vì MVP không có endpoint quản trị — authz-matrix 2.1); mọi request kể cả `GET /me`, `PUT /session/membership`, `POST /auth/logout` trả `403 account_disabled`. Client nhiều khả năng hiện "tài khoản bị khoá" và buộc đăng xuất; đăng nhập lại thì `membership_id` = vai trò B còn `active` nên **tự khỏi**. Vì vậy MINOR, nhưng đúng lớp lỗi mà B1 vừa vá. Đề xuất: khi membership của phiên không còn `active`, trả `membership_required` cho **5 route tài khoản** (giữ `account_disabled` cho user `status<>'active'`) và thêm test.

### N3. Cron sinh buổi lặp không có bất biến "một buổi/ngày"

- Mã: `db/session-generation.ts:33-38` vẫn `INSERT OR IGNORE … VALUES` (chỉ dựa `UNIQUE(class_id,date,start_time)`), trong khi bất biến mới nằm ở `insertSessions` (`db/classes.ts:52-60`) và chỉ được dùng bởi `createClass`/`updateClass`. Kịch bản: giáo viên tạo buổi lẻ/make-up (`POST /classes/{id}/sessions`, `db/sessions.ts:70-99`, không giới hạn ngày) cho một ngày **xa hơn `generated_until`** (ví dụ +70 ngày, 19:00, trong khi giờ lặp là 18:00). Vài lượt cron sau, cửa sổ 8 tuần trượt tới ngày đó ⇒ cron chèn thêm buổi lặp 18:00 ⇒ **2 buổi cùng ngày**, `session_number` đếm cả hai (`db/sessions.ts:28-34`) nên lệch từ đó về sau. Cùng lớp lỗi M2 nhưng chỉ cron. Đề xuất: cho cron dùng chung `insertSessions` (hoặc thêm `WHERE NOT EXISTS(buổi cùng lớp cùng ngày)`), kèm test cron với một buổi lẻ nằm trong cửa sổ.

### N4. `PUT /reports/{id}/publications/{no}/pdf` đồng thời: ghi đè R2 nhưng `pdf_bytes` giữ bản đầu

- Mã: `db/reports.ts:241-278` — `pdf_key IS NULL` chỉ chặn ở `UPDATE` (`:264`), còn `bucket.put(key, …)` (`:259`) chạy trước và **cùng key** `reports/{ws}/{reportId}/{no}.pdf`; hai lần upload song song ⇒ byte cuối là của lần sau, `pdf_bytes` trong DB là của lần đầu, lần thứ hai nhận `409 pdf_already_uploaded` (client tưởng chưa ghi). Không rò dữ liệu (cùng workspace, cần `comments_reports:write`). Đề xuất: khoá theo `pdf_key IS NULL` trước khi `put` (ghi key tạm rồi chuyển), hoặc dùng key có `registration`/uuid.

### N5. `POST /workspaces` không giới hạn tốc độ/số lượng

- Mã: `routes/auth.ts:170-215` — mỗi lần gọi ghi workspace + 4 role + 24 dòng `role_permissions` + 1 membership; không throttle (khác `/auth/register` có `REGISTER_IP_POLICY`) và không trần số workspace. Trước B1 chỉ user đã chọn vai trò gọi được; nay cả phiên chưa chọn vai trò. Không phải rò dữ liệu, nhưng là bề mặt bơm dữ liệu rẻ. Đề xuất: throttle theo `userId` (dùng lại `auth_throttle`) hoặc trần N workspace/user, và ghi vào api-spec.

### N6. (rất nhỏ) `prior()` tra `applied_commands` không lọc workspace ⇒ `command_id_used`

- `db/sync.ts:157-161`: `command_id` của **người khác/workspace khác** trả `rejected details.reason="command_id_used"`, tức là một oracle "UUID này đã được dùng ở đâu đó". UUID v4 không đoán được nên thực tế không khai thác; nếu muốn sạch: `coi như lệnh mới` khi lệnh thuộc workspace khác, hoặc thêm `AND workspace_id = ?` vào câu tra và trả `duplicate`/`not_found` trung tính.

## 5. Đã rà và thấy đúng ở lượt này (kèm bằng chứng, để đối chiếu)

- **Tư duy tấn công chéo workspace**: `syncIdentity` (`db/sync.ts:63-89`) tra membership bằng `m.id=? AND m.user_id=?` ⇒ không chọn hộ membership người khác; `pull`/`snapshot`/`snapshotPage` đều gắn `workspace_id` và `scope()` (`db/sync-read.ts:24-34`); `snapshotPage` nhận `after` do client đặt nhưng chỉ cho phép **mảng chuỗi** đúng số khoá và bind qua `?` (`:104-118`) ⇒ không injection, và `visibility()` luôn áp lại nên cursor của người khác không mở dòng nào.
- **`pull` không rò dữ liệu trẻ khác**: `logScope` theo lớp (`db/sync-read.ts:103`) + `own` theo `guardian_student` (`:104`), `deleted` chỉ sinh từ dòng log đã qua bộ lọc đó; `report`/`conflict` bị loại khỏi `names` cho phụ huynh (`:16-22`); `report_publication` chỉ con mình và mọi bản đã có `published_at NOT NULL` (`migrations/0001_schema.sql:368`, cột `TEXT NOT NULL`) nên không có "bản nháp" bị lộ.
- **`change_log` của mọi thực thể đều có `class_id`** (`migrations/0002_triggers.sql:294-444`) ⇒ phạm vi nhân sự `assigned_classes` (`l.class_id IN member_classes`) không bỏ sót thực thể nào; `student_id` có ở các thực thể "ô" để `own` lọc đúng con.
- **Report PDF**: `downloadPublicationPdf` (`db/reports.ts:281-307`) lấy `class_id`+`student_id` từ chính hàng `report_publications` rồi `requireAccess` ⇒ phụ huynh chỉ tải bản của con; `pdf_key` do server sinh, `bucket.get` theo `pdf_key` trong DB. `previewReport` chặn phụ huynh (`:43`).
- **Notifications/FCM**: inbox lọc `workspace_id + membership_id + user_id + guardian_student` (`db/notifications.ts:100-110`); fanout chỉ mở cho đúng membership của thông báo và kiểm phiên/quyền/liên kết/bài chưa lưu trữ trước khi gửi (`notification-dispatch.ts:109-139`, `:173-194`); payload chỉ `title` chung + `{kind, notification_id, student_id, session_id, report_id, test_id}` (`fcm-sender.ts:308-328`) — không điểm/nhận xét/SĐT/tên học sinh.
- **`must_change_password`** vẫn chặn cả REST (`middleware/auth.ts:88-93`) và sync (`db/sync.ts:37`).
- **`/v1/me` + đa vai trò**: `getMe(userId, null)` trả `active_membership_id: null` + quyền từng membership (test đã khẳng định).
- **Trạng thái worktree/deploy**: `worker/src/probe.ts` đã không còn (r1 cảnh báo) — `ls src` không có; `wrangler.jsonc` đã commit `database_id` staging (`aad4f52`). R2 binding staging vẫn comment ⇒ `PDF` trả `503 pdf_storage_unavailable` trên staging: đúng như ghi chú trong `wrangler.jsonc`, không phải lỗi mã.
- `git status` sạch tại thời điểm review.

## 6. Chất lượng test (nhìn từ r2)

Bộ test chạm đúng chỗ khó và không tautology; ba bộ hồi quy mới đã được chứng minh đỏ trên mã cũ (§ bảng đầu). Lỗ hổng còn lại, xếp theo rủi ro:

| Lỗ hổng test | Đã để lọt |
|---|---|
| Không có test `OPTIONS`/CORS | N1 |
| Không có test "membership đang chọn bị vô hiệu" | N2 |
| Không có test cron gặp ngày đã có buổi lẻ | N3 |
| Không có test hai `PATCH /classes` đồng thời (chưa có harness chen giữa 2 batch) | m12 |
| Vẫn chưa có test quét log (T26 authz-matrix) | m6 (và không chứng minh được "không log PII" bằng máy) |
| Không có test upload PDF đồng thời / `pdf_bytes` khớp byte | N4 |

## 7. Thứ tự xử lý đề xuất

1. **N1** (chốt ai chịu CORS rồi thêm header/preflight + test) — nếu không, client web không dùng được API.
2. **m9 + N2** (cùng một chỗ: `/me` là màn chọn vai trò; lọc `status='active'` và map membership bị vô hiệu về `membership_required` cho 5 route tài khoản).
3. **m2 + N3** (phát lại chiều cổng đóng; dùng chung `insertSessions` cho cron) — cùng nhóm "một buổi/ngày + phát lại".
4. **m1** (một dòng api-spec 6.1) và **m8** (thêm `membership_required` vào bảng mã lỗi) — sửa tài liệu, rẻ.
5. **m3, m6, m10, m11, N4, N5** (dọn dẹp/hợp đồng), rồi **m4, m7, m12, m13, N6** khi rảnh.

Status: CHANGES_REQUIRED

Summary: Đã kiểm bằng đọc mã và bằng cách chạy lại test trên mã cũ: ba bản sửa của r1 (`a80f33e` đa vai trò, `8a4f642` hình dạng `items`, `33a680c` PATCH lịch) đều đúng, đúng spec và test hồi quy thực sự bắt lỗi cũ (lần lượt 2/2, 1/2, 3/5 test đỏ khi khôi phục mã cũ); riêng B1 khép kín — chỉ 5 route tài khoản được miễn, route miền vẫn 403, `must_change_password` vẫn chặn đổi vai trò và tạo workspace, không có đường lộ dữ liệu qua danh tính chỉ-phiên. Lượt rà độc lập không tìm thấy BLOCKER/MAJOR mới về phân quyền hay rò dữ liệu, nhưng có 1 MAJOR mới ngoài phạm vi hẹp đó (thiếu CORS/preflight nên client web không gọi được API, spec chưa nói ai chịu) cộng 12 MINOR còn hở của r1 (m2 cổng BTVN đóng lại, m3 device token sau đổi mật khẩu, m9 `/me` trả membership `disabled`, m12 PATCH đồng thời) và 5 MINOR mới; typecheck pass, 89/89 test pass.

## Đã sửa (mục E) — 2026-10-22, nhánh `mvp-backend`

- **m2** `db/sessions.ts` (`cancelSession`): bỏ join `session_comments … status='sent'` khỏi câu ghi `change_log` phát lại `homework_grade`; giờ mọi ô chấm BTVN vừa đổi buổi chấm đều có dòng log, `pull` tự sinh `upsert` (cổng mở) hoặc `deleted` (cổng đóng lại). Test mới trong `tests/sessions.test.ts`: phiếu đã gửi ở buổi chấm M, huỷ M ⇒ `pull` trả `deleted {entity:"homework_grade", k1:section_id, k2:student_id}`, `upserts.homework_grade` rỗng, `snapshot/homework_grade` rỗng. Đỏ trên mã cũ (`[]` thay vì `deleted`), xanh sau sửa; test chiều mở cũ vẫn xanh.
- **N3** `db/classes.ts` + `db/session-generation.ts`: `insertSessions` được `export` và cron dùng lại, nên cửa sổ 8 tuần cũng có bất biến "một buổi/lớp/ngày" (`INSERT … WHERE NOT EXISTS`) thay vì `INSERT OR IGNORE … VALUES`. Test mới `tests/session-generation.test.ts`: (a) ngày đã có buổi lẻ 19:00 và ngày đã có buổi huỷ 19:30 trong cửa sổ ⇒ mỗi ngày đúng 1 buổi, tổng 57 ngày, chạy lại cron không đổi; (b) buổi make-up 2026-12-20 nằm ngoài `generated_until` lượt đầu, lượt cron sau trượt cửa sổ tới ngày đó ⇒ không sinh buổi lặp thứ hai trên ngày này. Cả 2 đỏ trên mã cũ (2 buổi/ngày), xanh sau sửa.
- Đã chứng minh đỏ→xanh bằng cách copy `worker/` sang `/tmp` (symlink `node_modules`) và khôi phục **chỉ** `src/db/sessions.ts` + `src/db/session-generation.ts` về `a80f33e`: 3 test mới đỏ, đúng các assert nội dung ở trên.
- `npm run typecheck` pass; `npm test` 96/98 pass (2 test đỏ còn lại thuộc mục D: `auth.test.ts` device token sau đổi mật khẩu, `auth-multi-role.test.ts` membership bị vô hiệu).
- **Còn hở (ngoài phạm vi file mục E):** `api-spec.md` 6.5(b) vẫn chỉ mô tả chiều mở cổng; nên bổ sung "và chiều cổng đóng lại ⇒ client nhận `deleted`". Commit: `bbc0696`, `267bb37`.

## Đã sửa (mục D) — 2026-10-22, nhánh `mvp-backend`

- **N1 (CORS)** `src/index.ts`, `src/types.ts`, `wrangler.jsonc`, `.dev.vars.example`, `README.md`: middleware CORS cho `/v1/*` đọc `ALLOWED_ORIGINS` (phân tách dấu phẩy; trim, bỏ `/` cuối, bỏ `*`; rỗng/không đặt = không cho origin nào). Chỉ phản chiếu origin nằm trong danh sách, luôn `Vary: Origin`, cho phép `Authorization, Content-Type, X-Request-Id, X-Client` (+ `GET/POST/PUT/PATCH/DELETE`), `Access-Control-Expose-Headers: X-Request-Id, Retry-After`, `OPTIONS` trả `204` + `Access-Control-Max-Age: 600` và không đi qua xác thực; header CORS vẫn có trên response lỗi. Test mới `tests/cors.test.ts` (5 test: preflight origin hợp lệ, origin lạ và `*` không phản chiếu, rỗng/không đặt, khoảng trắng + `/` cuối, request thật và 401 vẫn có header).
- **m9** `db/auth.ts` (`getMe`): lọc `m.status = 'active'`. **N2** `middleware/auth.ts`: 5 route tài khoản dùng `sessionIdentity()` khi `authenticate()` fail vì membership đang chọn bị vô hiệu (không chỉ khi chưa chọn vai trò); nhánh miễn trừ đọc lại `authenticateSession()` nên user `status <> 'active'` vẫn `403 account_disabled`, còn route miền vẫn `403 account_disabled` đúng api-spec 1. Test mới trong `tests/auth-multi-role.test.ts`: vô hiệu membership đang chọn ⇒ `/classes` 403 `account_disabled`, `/me` 200 + `active_membership_id: null` + chỉ còn membership `active`, chọn lại vai trò còn sống ⇒ 200 rồi logout 204; vô hiệu user ⇒ `/me` 403 `account_disabled`.
- **m3** `db/auth.ts` (`changePassword`): thêm vào cùng batch `DELETE FROM device_tokens WHERE auth_session_id IN (SELECT id FROM auth_sessions WHERE user_id = ? AND id <> ? AND revoked_at IS NOT NULL)`. Test mới trong `tests/auth.test.ts`: hai phiên, mỗi phiên một `device_tokens`; sau đổi mật khẩu phiên kia bị thu hồi (`/me` 401) và token của nó bị xoá, token của phiên hiện tại còn nguyên.
- Đã chứng minh đỏ→xanh: copy `worker/` sang `/tmp` (symlink `node_modules`) và khôi phục **chỉ** `src/{index,types,middleware/auth,db/auth}.ts` về `267bb37` ⇒ 6 test mới đỏ (4 CORS, N2, m3), xanh sau sửa.
- `npm run typecheck` pass; `npm test` 23 file / 99 test pass; `npm run bundle:size` 141,60 KiB (gzip 39,88 KiB).
- **Còn hở (ngoài phạm vi file mục D):** `api-spec.md` mục 0 chưa ghi hợp đồng CORS (`ALLOWED_ORIGINS`, header, preflight `204`, không dùng `*`) nên cần bổ sung; `env.staging` đang để `ALLOWED_ORIGINS: ""` nên phải điền origin Pages của staging rồi deploy lại thì web mới gọi được. Commit: `69e85b7`, `77c8cb0`.
