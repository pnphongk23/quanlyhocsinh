# sync/push: >2s → p95 < 300ms (gate k6)

Goal QL-003. Nhánh `perf/sync-push-latency`, base `origin/develop` @ `fa7b750`.

## 1. Mục tiêu và số đo trước khi sửa

`POST /v1/sync/push` chậm vì số round-trip Worker → D1 là **4n + 3** với n = số lệnh trong request:
mỗi lệnh có một lượt đọc `applied_commands` (`prior`), một batch commit riêng, và mỗi lần commit lại
đọc lại `class_sessions`/`attendance` sau khi xoá cache; cuối request thêm một lượt đọc `cursor`.
Mỗi round-trip D1 ≈ **21 ms**.

Số đo của TL trước khi sửa (dev, chỉ là baseline lịch sử; đợt này **không** đo lại trên dev):

| | 1 lệnh | 5 lệnh | 20 lệnh |
|---|---|---|---|
| round-trip (`develop` fa7b750 và prod 31c1942) | 7 | 23 | 83 |
| k6 dev, 1 VU, p50 | 161 ms | 518 ms | 1.72 s |
| k6 dev, 1 VU, p95 | 237 ms | 593 ms | 1.75 s |
| `wrangler tail` dev | CPU 53–74 ms, wall ~1.8 s | | |

D1 prod/dev ở APAC, read replication tắt, Worker `placement: gcp:asia-east2`.
83 round-trip × 21 ms ≈ 1.74 s ⇒ **thời gian đi mạng, không phải CPU**, là phần lớn của 1.8 s.
Gate bắt buộc: k6 `http_req_duration{name:sync_push}` p95 < 300 ms.

## 2. Phân rã thời gian trước/sau

|  | trước | sau |
|---|---|---|
| round-trip cho n lệnh | 4n + 3 (7 / 23 / 83) | **4 hằng số** (n = 1, 5, 20, 50) |
| statement gửi D1 cho 20 lệnh | 83 lượt, ~3 statement/lượt | 91 statement trong 4 lượt |
| ước tính trên mạng thật (round-trip × 21 ms) | 83 × 21 ≈ 1.74 s | 4 × 21 ≈ **84 ms** + CPU ≈ 60 ms ⇒ ~150 ms |
| k6 local 1 VU (không có RTT mạng), p50 / p95 | 60 / 101 ms | **19 / 41 ms** |
| k6 local 5 VU, p95 (gate) | 946 ms ✗ | **105 ms ✓** |
| k6 local 40 VU (ramp), p95 | 2.78 s ✗ | 721 ms ✗ (xem mục 6) |

Bốn round-trip sau khi sửa (đo bằng test vitest, tính cả lượt đọc phiên của middleware):

1. `SELECT … FROM auth_sessions …` (middleware, không đổi)
2. batch `syncIdentity` — 5 statement (membership + role + workspace, `role_permissions`,
   lớp của phụ huynh, `member_classes`, `guardian_student`)
3. batch `initialState` — timezone, các bảng đích theo lô id, các ô theo lệnh, receipt theo lô id,
   độ đủ điểm danh của buổi có `slip.set`
4. batch commit — mọi lệnh ô đã gộp + `cursor` ở cuối

Khi request có lệnh không gộp được (lệnh đối tượng, lệnh trùng id, receipt đã có, hàng chưa preload)
thì chỉ các lệnh đó đi đường tuần tự cũ, mỗi lệnh một batch.

## 3. Ba phương án và lý do chọn B

**A. Một batch cho cả request, bỏ receipt/CAS riêng từng lệnh.** Nhanh nhất (1–2 round-trip) nhưng phá
hợp đồng đồng bộ: client xoá lệnh theo xác nhận của **từng** lệnh, lệnh bị từ chối không được chặn lệnh
khác, và `applied_commands` là nguồn idempotent duy nhất khi mất mạng. Một lệnh lỗi sẽ làm hỏng cả lô
hoặc buộc phải bỏ CAS ⇒ mất "lệnh sau thắng" và idempotent. Loại.

**B. Preload một lần + gộp các lệnh ô vào một batch commit, giữ CAS + receipt riêng (đã chốt).**
Đọc trước mọi thứ cần cho việc lập kế hoạch trong **một** batch `initialState`; các lệnh ô
(`attendance.set`, `score.set`, `homework.grade.set`, `slip.set`) lập kế hoạch không cần đọc D1 nên
gộp được vào **một** batch commit. Mỗi lệnh vẫn có statement CAS riêng và receipt riêng; lệnh không có
hiệu lực, hoặc mọi lệnh khi batch ném lỗi, chạy lại bằng đường tuần tự cũ (`apply`).
Giữ nguyên hợp đồng đã chốt trong spec/architecture, chỉ đổi cách nhóm round-trip.

**C. Giữ số round-trip, chỉ tối ưu phần còn lại** (giảm CPU mỗi lượt, thêm chỉ mục, HTTP/2, Durable
Object, chuyển sang RPC một chiều). Không giải quyết nguyên nhân: 83 × 21 ms là chi phí đi lại, không
phải CPU (CPU chỉ 53–74 ms). D1 không có pipelining để bắn song song nhiều statement trong một lượt;
cách duy nhất để "nhiều statement, một lượt" là `batch`. Loại.

## 4. Đã làm gì

`worker/src/db/sync.ts`
- `syncIdentity`: 4 lượt → **1 batch**. Các câu phụ thuộc (quyền, lớp, học sinh được liên kết) tìm
  membership qua subquery `(SELECT role_id/workspace_id FROM memberships WHERE id=? AND user_id=?
  AND status='active')` nên chạy được trong cùng batch.
- `initialState`: thêm **preload receipt** (`SELECT … FROM applied_commands WHERE command_id IN (…)`,
  mọi workspace) thay cho lượt đọc `prior` của từng lệnh, và **preload độ đủ điểm danh** cho buổi của
  `slip.set` (`ATTENDANCE_MISSING_SQL` xuất ra từ `attendance.ts`).
- Tách `commitStatements` khỏi `commit` để gộp nhiều lệnh vào một batch mà mỗi lệnh vẫn giữ
  `receiptIndex` riêng; `flush` gộp, kiểm `meta.changes` của receipt từng lệnh, lệnh không đổi hàng nào
  thì chạy lại bằng `apply` (xoá state trước khi chạy lại); batch ném lỗi ⇒ cả nhóm chạy lại tuần tự.
- `groupable`/`predict`: chỉ gộp lệnh ô khi mọi hàng nó cần kiểm đã có trong state của request và
  receipt đã preload; `predict` cập nhật state dự kiến sau commit (ô +1 version, phiếu mới `draft`,
  buổi `planned` → `held` +1 version, xoá memo độ đủ điểm danh của buổi khi có `attendance.set`).
- `planCell`/`checkCommand`/`apply`: đường tuần tự cũ, `apply` nhận cờ `preloaded` để dùng receipt đã
  đọc sẵn; `i.today` dựng formatter một lần mỗi request thay vì mỗi lệnh.

`worker/src/db/attendance.ts`: xuất `ATTENDANCE_MISSING_SQL` (dùng chung cho assert và preload).

`worker/tests/sync-push-roundtrips.test.ts`: đếm round-trip, assert **hằng số ≤ 4** cho n = 1, 5, 20, 50.

`worker/tests/sync-push-batch.test.ts` (mới, 10 test): xem mục 7.

`perf/k6/*`: gate chỉ chạy local, tự đăng ký tài khoản/workspace trên D1 local (mục 6).

## 5. Rà soát SQL đường push

Chạy `EXPLAIN QUERY PLAN` trên D1 local đã apply migrations 0001–0017
(`npx wrangler d1 execute qlh-dev-db --local --env dev --command "EXPLAIN QUERY PLAN …"`).
Log thô: `/tmp/qlh-evidence/sync-push-latency/explain-query-plan.txt`.

| Truy vấn | Kế hoạch | Nhận xét |
|---|---|---|
| auth: phiên theo `token_hash` | `SEARCH auth_sessions USING INDEX (token_hash=?)` + `SEARCH users (id=?)` | tốt, 1 round-trip |
| syncIdentity: membership + role + workspace | 3 × `SEARCH … USING INDEX (id=?)` | tốt, gộp 1 batch |
| syncIdentity: `role_permissions` qua subquery | `SEARCH role_permissions USING PRIMARY KEY (role_id=?)`, `SEARCH memberships (id=?)` | tốt |
| syncIdentity: lớp của phụ huynh | `SEARCH guardian_student USING PRIMARY KEY (user_id=?)`, `SEARCH students (id=?)`, `USE TEMP B-TREE FOR DISTINCT` | TEMP B-TREE chỉ cho `DISTINCT`, số dòng = số con của phụ huynh (≤ vài em) ⇒ chấp nhận; nhân sự không chạy câu này có tác dụng |
| syncIdentity: `member_classes` | `SEARCH member_classes USING PRIMARY KEY (membership_id=?)` | tốt |
| initialState: timezone | `SEARCH workspaces (id=?)` | tốt |
| initialState: `students`/`class_sessions`/`tests`/`homework_sections` theo lô id | `SEARCH … USING INDEX (workspace_id=? AND id=?)` | tốt, mỗi bảng 1 statement/lô 99 id |
| initialState: ô `attendance`/`session_comments`/`scores`/`homework_grades` | `SEARCH … USING PRIMARY KEY (session_id=?/test_id=?/section_id=?, student_id=?)` | tốt; là N+1 **trong một batch** (n statement, 0 round-trip) |
| initialState: receipt theo lô id | `SEARCH applied_commands USING INDEX (command_id=?)` | tốt, thay n lượt đọc |
| initialState: độ đủ điểm danh của buổi | `SEARCH class_sessions (workspace_id=? AND id=?)`, `SEARCH students USING INDEX students_class (class_id=?)`, `SEARCH attendance USING PRIMARY KEY … LEFT-JOIN` | tốt, 1 statement/buổi có `slip.set` |
| cursor sau mọi ghi | `SEARCH workspaces (id=?)` + `SEARCH change_log USING COVERING INDEX change_log_ws_seq (workspace_id=?)` | tốt, covering |
| commit: INSERT ô (CAS) | `SEARCH class_sessions (workspace_id=? AND id=?)`, `SEARCH students (workspace_id=? AND id=?)`, `SEARCH attendance USING PRIMARY KEY`, `SEARCH applied_commands … COVERING INDEX (command_id=?)` | tốt |
| commit: UPDATE ô (CAS version) | `SEARCH attendance USING PRIMARY KEY` + `applied_commands (command_id=?)` | tốt |
| commit: buổi `planned` → `held` | `SEARCH class_sessions (workspace_id=? AND id=?)` | tốt |
| receipt: INSERT có điều kiện | `SCAN CONSTANT ROW` + `applied_commands (command_id=?)` | tốt |
| trigger: `change_log`, `attendance_history` | INSERT theo PK/autoincrement | tốt |

Kết luận: **không có `SCAN` bảng thật, không có TEMP B-TREE ngoài `DISTINCT` của truy vấn phụ huynh.**
Không thiếu chỉ mục ⇒ **không thêm migration**. Các chỉ mục hiện có đều phục vụ push hoặc pull/báo cáo;
`attendance_student`, `session_comments_student`, `scores_student`, `applied_commands_age` không dùng ở
đường push nhưng cần cho pull/dọn dữ liệu — không coi là thừa, không xoá.

Còn lại (không đáng đổi thêm round-trip):
- N+1 trong batch `initialState`: một statement cho mỗi ô (n statement). Gộp được thành
  `WHERE (k1,k2) IN ((…),(…))` nhưng SQLite/D1 không có row-value `IN` cho `WITHOUT ROWID` + bind trần
  100 tham số ⇒ chỉ giảm kích thước batch, không giảm round-trip. Để nguyên.
- `initialState` chạy cả 2 câu phụ huynh/nhân sự (5 statement thay vì 4 như trước) để đổi 4 round-trip
  thành 1; chi phí là 1 statement, đáng đổi.
- `notifications` (điểm) và backfill `homework_grade` của `slip.send` vẫn nằm trong batch của lệnh
  tương ứng; nếu chúng lỗi thì cả batch của nhóm huỷ và chạy lại tuần tự (đúng như thiết kế fallback).

## 6. Gate

### 6.1 Gate round-trip trong vitest (thay cho đo trên dev)

D1 local (miniflare/workerd trên máy) không có độ trễ mạng nên p95 local không đại diện cho dev;
đo trên dev/prod bị cấm (quyết định của chủ: chỉ test local). Vì vậy gate độ trễ được chốt bằng
**số round-trip D1**, là đại lượng nhân với 21 ms trên mạng thật:

```
cd worker && npx vitest run tests/sync-push-roundtrips.test.ts
# attendance.set x1 / x5 / x20 / x50 → mỗi trường hợp ≤ 4 round-trip, mọi lệnh applied
```

Ước lượng: 4 × 21 ms ≈ 84 ms cộng CPU đo trên dev 53–74 ms ⇒ ~140–160 ms p95, dưới gate 300 ms với
biên ~2×. Trước khi sửa: 83 × 21 ms + CPU ≈ 1.8 s (khớp số đo dev 1.72–1.75 s), tức mô hình
round-trip × 21 ms đã được kiểm chứng bằng chính baseline dev.

### 6.2 k6 local (không deploy, không gọi dev/staging/prod)

Chuẩn bị trong `worker/`: `npx wrangler d1 migrations apply qlh-dev-db --local --env dev`, sau đó
`npx wrangler dev --local --env dev --port 8787` (xem ghi chú môi trường ở mục 9). Chạy ở gốc repo:

```
perf/k6/run-sync-push.sh                     # gate 5 VU × 1 phút, 20 lệnh/push
SCENARIO=ramp perf/k6/run-sync-push.sh       # ramp 1→40 VU
```

Script tự đăng ký tài khoản + workspace mới trên D1 local (mật khẩu sinh ngẫu nhiên, không in),
tạo lớp `QA-PERF-k6-<n>` với 20 em, buổi hôm nay; không đọc file creds; host khác
`127.0.0.1`/`localhost` thì exit 2 (cả wrapper lẫn script).

Kết quả (log thô: `/tmp/qlh-evidence/sync-push-latency/*.log`, không commit):

| Kịch bản | Code | VU | Thời lượng | Request | p50 | p90 | p95 (`sync_push`) | p99 | exit |
|---|---|---|---|---|---|---|---|---|---|
| gate | trước (`fa7b750`) | 5 | 1m01s | 657 | 351 ms | 662 ms | **946 ms ✗** | 1.76 s | 99 |
| gate | sau | 5 | 1m01s | 4749 | 55 ms | 89 ms | **105 ms ✓** | 140 ms | **0** |
| gate | trước | 1 | 1m01s | 885 | 60 ms | 83 ms | 101 ms ✓ | 158 ms | 0 |
| gate | sau | 1 | 1m01s | 2566 | 19 ms | 33 ms | 41 ms ✓ | 62 ms | 0 |
| ramp | trước | 1→40 | 2m43s | 1756 | 439 ms | 2.39 s | **2.78 s ✗** | 6.82 s | 99 |
| ramp | sau | 1→40 | 2m38s | 7113 | 267 ms | 642 ms | **721 ms ✗** | 925 ms | 99 |
| gate | sau | 10 | 1m04s | 2174 | 220 ms | 451 ms | 544 ms ✗ | 733 ms | 99 |
| gate | sau | 20 | 1m08s | 2984 | 359 ms | 473 ms | 622 ms ✗ | 1.4 s | 99 |

Đọc bảng:
- **Gate 5 VU (ngưỡng bắt buộc)**: trước 946 ms trượt, sau 105 ms đạt, exit 0. Thông lượng cùng 5 VU
  tăng 7,2× (657 → 4749 request/phút).
- 1 VU: p95 101 ms → 41 ms (2,5×), p50 60 → 19 ms (3,2×). Đây là so sánh sạch nhất về công việc
  phía server vì không có xếp hàng.
- Ramp 40 VU vẫn trượt ngay cả sau khi sửa: `wrangler dev` local chỉ có **một** process workerd/miniflare
  chạy chung CPU với chính k6 trên máy, nên từ ~10 VU trở lên là nghẽn CPU của môi trường đo, không phải
  của D1. Số ramp chỉ dùng để so **tương đối** trước/sau (2.78 s → 721 ms, 3,9×) và để xác nhận gate
  5 VU là mức tải local còn đo được. Trần tải thật phải đo trên dev ở bước sau.

## 7. Kiểm chứng hành vi (vitest)

`worker/tests/sync-push-batch.test.ts` — 10 test, mỗi test khoá một điểm rủi ro của việc gộp batch:

1. 20 lệnh điểm danh: một batch, ≤ 4 round-trip, mọi lệnh `applied`, version 1, buổi `held` version 2,
   20 dòng `change_log` + 1 dòng `class_session`, 20 receipt. Sau đó **ép batch gộp ném lỗi** để cả 20
   lệnh chạy lại bằng đường tuần tự cũ và so từng dòng `attendance`, `class_sessions`, chuỗi `change_log`,
   receipt — **giống hệt**.
2. Gửi lại cùng request: mọi lệnh `duplicate/applied`, không thêm dòng `change_log`/receipt nào, ≤ 4 round-trip.
3. Hai lệnh cùng một ô trong một request: lệnh sau thắng, ô +2 version, buổi `held` version 2.
4. Một lệnh bị từ chối trong batch gộp (buổi đã huỷ) không chặn lệnh khác; receipt của lệnh đó là `rejected`.
5. Một statement lỗi giữa batch (vi phạm `CHECK` của `attendance`): D1 huỷ + rollback cả batch, mọi lệnh
   chạy lại tuần tự **đúng một lần** (không nhân đôi dòng, version vẫn 1).
6. CAS thua (hàng `class_sessions` đổi giữa preload và commit): lệnh đó chạy lại, `applied`, ô version 1,
   buổi `held` version 3.
7. Request trộn `test.create` + lệnh ô + `score.set` + `slip.send`: kết quả đúng thứ tự request, phiếu gửi
   đủ 2 em, 1 dòng `change_log` cho điểm.
8. `slip.set` sau `attendance.set` cùng buổi trong một request: ra cùng kết quả như gửi từng request
   (`applied` version 1); nếu còn thiếu điểm danh một em thì `rejected` `attendance_incomplete`,
   `missing_count: 1` (memo độ đủ điểm danh bị xoá đúng lúc).
9. Receipt của workspace khác: `rejected` `conflict` `details.reason=retry`, không ghi dòng `attendance` nào.
10. Push 50 lệnh: mọi statement ≤ 100 bind, ≤ 4 round-trip.

Kết quả toàn bộ worker: `npx tsc --noEmit` 0 lỗi; `npx vitest run` **48 file / 293 test, 0 fail**.

## 8. Còn lại / rủi ro cần TL quyết

1. **Tài liệu kiến trúc lệch một câu.** `docs/architecture.md` (mục "Lệnh trong hàng đợi" và bảng rủi ro)
   ghi "áp **mỗi lệnh trong một `batch` D1 riêng**". Sau thay đổi này, các lệnh ô trong cùng request có
   thể nằm chung một batch (vẫn giữ CAS + receipt riêng từng lệnh, batch lỗi thì chạy lại tuần tự).
   Cần sửa một câu cho khớp; file này ngoài write-set của packet nên tôi chưa sửa.
2. **Trần statement/batch của D1 chưa được xác nhận.** 20 lệnh → 61 statement trong batch commit,
   50 lệnh → 151 statement. Không thấy tài liệu D1 nêu trần số statement mỗi `batch`; local chạy tốt
   (k6 20 lệnh, vitest 50 lệnh). Cần xác nhận trên dev trước khi phát hành; nếu có trần 100 thì phải
   chia nhóm (ví dụ ≤ 30 lệnh ô mỗi batch) — chưa làm vì chưa có bằng chứng.
3. **Giới hạn đã biết, giữ nguyên:** bind tối đa 100 tham số/statement (lô id dùng 99 + workspace_id = 100,
   đã có từ trước). `touchSession` sau phản hồi là 1 lượt ghi D1 qua `waitUntil`, không nằm trên đường
   phản hồi nên không cộng vào p95.
4. **Chưa đo lại trên dev** (quyết định của chủ: chỉ test local). Khi TL cho phép, gate thật là
   `perf/k6/sync-push.js` chạy trên dev sau deploy, kỳ vọng p95 ≈ 140–160 ms.

## 9. Ghi chú môi trường local

- `wrangler dev --local --env dev` trong repo hiện **không khởi động được** runtime local:
  `Incorrect type for map entry 'MINUTE_CRON': the provided value is not of type 'function or ExportedHandler'`
  (workerd coi mọi named export của module entry là handler; `src/index.ts` export hai hằng chuỗi cron).
  Lỗi có từ trước thay đổi này và vẫn xảy ra với wrangler 4.158.0. Để đo, tôi dùng cấu hình tạm (không commit)
  trỏ `main` vào một entry chỉ `export default app` (bỏ `triggers.crons`), rồi xoá sau khi đo.
  Sửa gốc thuộc `worker/src/index.ts` (ngoài write-set) — cần một packet riêng.
- Dừng server: `kill <pid của npx>`. Trong một lần chạy, lệnh này không lan xuống tiến trình con
  (`wrangler`/`workerd` sống tiếp); tôi đã xác nhận cổng 8787 đóng hẳn và dừng nốt tiến trình con
  đúng của lần chạy đó trước khi chuyển sang đo code khác.
- Cả hai lần đo (trước/sau) đều dùng cùng máy, cùng script k6, cùng 20 lệnh/push, cùng thời lượng.
