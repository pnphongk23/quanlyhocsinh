# sync/push: >2s → p95 < 300ms (gate k6)

Goal QL-003. Nhánh `perf/sync-push-latency`, base `origin/develop` @ `fa7b750`.

## 1. Mục tiêu và số đo trước khi sửa

`POST /v1/sync/push` chậm vì số round-trip Worker → D1 là **4n + 3** với n = số lệnh trong request:
mỗi lệnh có một lượt đọc `applied_commands` (`prior`), một batch commit riêng, và mỗi lần commit lại
đọc lại `class_sessions`/`attendance` sau khi xoá cache; cuối request thêm một lượt đọc `cursor`.
Mỗi round-trip D1 ≈ **21 ms**.

Số đo của TL trước khi sửa (dev, baseline lịch sử; đợt này **không** đo lại trên dev):

| | 1 lệnh | 5 lệnh | 20 lệnh |
|---|---|---|---|
| round-trip (`develop` fa7b750 và prod 31c1942) | 7 | 23 | 83 |
| k6 dev, 1 VU, p50 | 161 ms | 518 ms | 1.72 s |
| k6 dev, 1 VU, p95 | 237 ms | 593 ms | 1.75 s |
| `wrangler tail` dev | CPU 53–74 ms, wall ~1.8 s | | |

D1 prod/dev ở APAC, read replication tắt, Worker `placement: gcp:asia-east2`.
83 round-trip × 21 ms ≈ 1.74 s ⇒ **thời gian đi mạng, không phải CPU**, là phần lớn của 1.8 s.
Gate bắt buộc: k6 `http_req_duration{name:sync_push}` p95 < 300 ms.

## 2. Phân rã round-trip trước/sau

|  | trước | sau |
|---|---|---|
| round-trip cho n lệnh điểm danh | 4n + 3 (7 / 23 / 83) | **4 hằng số** (n = 1, 5, 20, 50) |
| statement gửi D1 cho 20 lệnh | 83 lượt | 91 statement trong 4 lượt |
| ước tính trên mạng thật (round-trip × 21 ms) | 83 × 21 ≈ 1.74 s | 4 × 21 ≈ **84 ms** + CPU ≈ 60 ms ⇒ ~150 ms |
| round-trip `slip.send` cả lớp, 5 em | 17 | **7** |
| round-trip `slip.send` cả lớp, 20 em | 47 | **7** |

Bốn round-trip của đường gom thuận lợi (đo bằng test vitest, tính cả lượt đọc phiên của middleware):

1. `SELECT … FROM auth_sessions …` (middleware)
2. batch `syncIdentity` — **1 lượt, 5 statement** (trước: 2 lượt — một `first` đọc membership và một
   batch 3 statement cho quyền/lớp/học sinh)
3. batch `initialState` — timezone, các bảng đích theo lô id, các ô theo lệnh, receipt theo lô id,
   độ đủ điểm danh của buổi có `slip.set`
4. batch commit — mọi lệnh ô đã gộp + `cursor` ở cuối

Con số 4 **chỉ đúng cho đường gom thuận lợi** (request chỉ có lệnh ô, mọi hàng cần kiểm đã preload,
không lệnh nào thua CAS). Các đường còn nhiều hơn:

| Đường | Round-trip thêm |
|---|---|
| lệnh đối tượng (`test.*`, `slip.send`, `homework.*`, `session.lesson.set`, `conflict.resolve`) | +1 batch commit cho **mỗi** lệnh; `slip.send` thêm 1 lượt đọc độ đủ điểm danh của buổi |
| lệnh ô không gộp được (cha/học sinh/ô không preload được, receipt đã có trong `applied_commands`) | +1 batch commit cho lệnh đó; +1 nếu receipt chưa preload (chỉ khi id trùng trong cùng request) |
| lệnh thua CAS (thiết bị khác ghi trước) | +1 batch cho mỗi vòng đánh giá lại (tối đa 3), và lệnh đó + các lệnh sau trong nhóm chạy tuần tự |
| batch gộp ném lỗi (trigger/constraint) | D1 rollback, cả nhóm chạy tuần tự: 1 batch/lệnh |
| gửi lại request đã áp dụng (mọi lệnh `duplicate`) | không có batch commit, vẫn 4 |
| request không có lệnh ô nào | `cursor` đọc riêng: +1 |

## 3. Ba phương án và lý do chọn B

**A. Một batch cho cả request, bỏ receipt/CAS riêng từng lệnh.** Nhanh nhất (1–2 round-trip) nhưng phá
hợp đồng đồng bộ: client xoá lệnh theo xác nhận của **từng** lệnh, lệnh bị từ chối không được chặn lệnh
khác, `applied_commands` là nguồn idempotent duy nhất khi mất mạng. Loại.

**B. Preload một lần + gộp các lệnh ô vào một batch commit, giữ CAS + receipt riêng (đã chốt).**
Đọc trước mọi thứ cần cho việc lập kế hoạch trong **một** batch `initialState`; các lệnh ô
(`attendance.set`, `score.set`, `homework.grade.set`, `slip.set`) lập kế hoạch không cần đọc D1 nên
gộp được vào **một** batch commit. Mỗi lệnh vẫn có statement CAS riêng và receipt riêng, xích receipt
giữ thứ tự (mục 5); lệnh không có hiệu lực, hoặc mọi lệnh khi batch ném lỗi, chạy lại bằng đường tuần
tự cũ (`apply`). Hợp đồng API không đổi.

**C. Giữ số round-trip, chỉ tối ưu phần còn lại** (giảm CPU mỗi lượt, thêm chỉ mục, Durable Object,
chuyển sang RPC một chiều). Không giải quyết nguyên nhân: 83 × 21 ms là chi phí đi lại, không phải CPU
(CPU 53–74 ms). D1 không có pipelining; cách duy nhất để "nhiều statement, một lượt" là `batch`. Loại.

## 4. Đã làm gì

`worker/src/db/sync.ts`
- `syncIdentity`: 2 lượt → **1 batch**. Các câu phụ thuộc (quyền, lớp, học sinh được liên kết) tìm
  membership qua subquery `(SELECT role_id/workspace_id FROM memberships WHERE id=? AND user_id=?
  AND status='active')` nên chạy được trong cùng batch.
- `initialState`: **preload receipt** (`SELECT … FROM applied_commands WHERE command_id IN (…)`, mọi
  workspace) thay cho lượt đọc `prior` của từng lệnh, và **preload độ đủ điểm danh** cho buổi của
  `slip.set` (`ATTENDANCE_MISSING_SQL` xuất ra từ `attendance.ts`).
- Tách `commitStatements` khỏi `commit` để gộp nhiều lệnh vào một batch mà mỗi lệnh vẫn giữ
  `receiptIndex` riêng; `flush` gộp, kiểm `meta.changes` của receipt từng lệnh.
- `groupable`/`predict`: chỉ gộp lệnh ô khi mọi hàng nó cần kiểm đã có trong state của request và
  receipt đã preload; `predict` cập nhật state dự kiến sau commit (ô +1 version, phiếu mới `draft`,
  buổi `planned` → `held` +1 version, xoá memo độ đủ điểm danh của buổi khi có `attendance.set`).
- `planCell`/`checkCommand`/`apply`: đường tuần tự cũ, `apply` nhận cờ `preloaded` để dùng receipt đã
  đọc sẵn; `i.today` dựng formatter một lần mỗi request thay vì mỗi lệnh.
- `slip.send`: đọc trước điểm danh và phiếu của **mọi** em trong một `db.batch` (mỗi statement
  `workspace_id` + `session_id` + ≤98 `student_id` ⇒ ≤100 bind) thay cho 2 lượt đọc D1 cho từng em.

`worker/src/db/attendance.ts`: xuất `ATTENDANCE_MISSING_SQL` (dùng chung cho assert và preload).

`docs/architecture.md` (mục công nghệ, mục "Lệnh trong hàng đợi", bảng rủi ro) và
`plans/20261021-mvp/backend/api-spec.md` (bước 3 của quy tắc xử lý push): mô tả lại việc gộp batch cho
lệnh ô, CAS + receipt riêng từng lệnh, xích receipt giữ thứ tự, chạy lại tuần tự khi lệnh hỏng hoặc batch
lỗi. Hợp đồng phản hồi của API không đổi.

`perf/k6/*`: gate chỉ chạy local, tự đăng ký tài khoản/workspace trên D1 local (mục 7).

## 5. Giữ thứ tự và tính đúng khi thiết bị khác chen vào

Gộp batch làm lộ hai lỗi nếu chỉ dựa vào `predict`: (i) version dự đoán có thể trùng version do writer
khác tạo ra nên lệnh sau vẫn commit dù lệnh trước thất bại, và (ii) receipt `rejected`/`noop` tính trên
trạng thái dự đoán sai vẫn được chốt. Cách sửa (đã chốt, giữ đơn giản): **xích receipt trong nhóm**.

- Trong một nhóm, mọi lệnh từ lệnh thứ 2 trở đi chỉ có hiệu lực khi receipt của lệnh **đứng ngay trước
  nó** trong nhóm đã tồn tại: thêm `AND EXISTS(SELECT 1 FROM applied_commands WHERE command_id=?)`
  (bind, không nội suy) vào statement `first` của plan thường, vào statement `first` của plan `noop`, và
  receipt của plan `rejected` đổi từ marker vô điều kiện thành marker có điều kiện đó. Lệnh đầu nhóm
  giữ nguyên; `receiptIndex` không đổi.
- Sau batch: **lệnh đầu tiên thiếu receipt** ⇒ nó và **mọi lệnh sau trong nhóm** chạy lại bằng `apply`
  theo đúng thứ tự, sau khi xoá `syncState`/memo. Các lệnh trước nó đã commit theo thứ tự nên giữ kết
  quả. Batch ném lỗi (D1 rollback) ⇒ cả nhóm chạy lại tuần tự.
- Bất biến này được ghi thành comment ngay tại `flush`.

Kiểm chứng: bốn kịch bản reviewer nêu được dựng lại bằng test (writer khác ghi ngay trước batch commit
của nhóm) và **đối chiếu trực tiếp với base `fa7b750`** (chạy cùng kịch bản trên worktree tạm của base,
chen writer vào ngay trước batch commit của lệnh đầu):

| Kịch bản | base `fa7b750` | nhánh này |
|---|---|---|
| (a) [present, late] cùng ô, writer khác ghi `absent/v1` + buổi `held/v2` | applied v2, applied v3, ô `late/v3`, buổi `held/v2`, history [absent→present v1→v2, present→late v2→v3] | giống hệt |
| (b) 2 em, writer khác huỷ buổi trước commit | rejected `session_cancelled` ×2, 0 dòng attendance, buổi `cancelled/v2` | giống hệt |
| (c) [điểm 5 base 0, điểm 7 base 2], writer khác tạo điểm `v2` | applied v3, applied v4, cuối `7/v4`, history [9→5, 5→7] | giống hệt |
| (d) [điểm 5, điểm 5], writer khác tạo điểm `9/v1` | applied v2, applied v2 `noop`, cuối `5/v2`, history [9→5] | giống hệt |

## 6. Rà soát SQL đường push

`EXPLAIN QUERY PLAN` trên D1 local đã apply migrations 0001–0017
(`npx wrangler d1 execute qlh-dev-db --local --env dev --command "EXPLAIN QUERY PLAN …"`).
Log thô: `/tmp/qlh-evidence/sync-push-latency/explain-query-plan*.txt`.

| Truy vấn | Kế hoạch | Nhận xét |
|---|---|---|
| auth: phiên theo `token_hash` | `SEARCH auth_sessions (token_hash=?)` + `SEARCH users (id=?)` | tốt |
| syncIdentity: membership + role + workspace | 3 × `SEARCH … (id=?)` | tốt, 1 batch |
| syncIdentity: `role_permissions` qua subquery | `SEARCH role_permissions USING PRIMARY KEY (role_id=?)`, `SEARCH memberships (id=?)` | tốt |
| syncIdentity: lớp của phụ huynh | `SEARCH guardian_student USING PRIMARY KEY (user_id=?)`, `SEARCH students (id=?)`, `USE TEMP B-TREE FOR DISTINCT` | TEMP B-TREE chỉ cho `DISTINCT`, số dòng = số con của phụ huynh ⇒ chấp nhận |
| syncIdentity: `member_classes` | `SEARCH member_classes USING PRIMARY KEY (membership_id=?)` | tốt |
| initialState: timezone | `SEARCH workspaces (id=?)` | tốt |
| initialState: `students`/`class_sessions`/`tests`/`homework_sections` theo lô id | `SEARCH … (workspace_id=? AND id=?)` | tốt, 1 statement/lô 99 id |
| initialState: ô `attendance`/`session_comments`/`scores`/`homework_grades` | `SEARCH … USING PRIMARY KEY (session_id=?/test_id=?/section_id=?, student_id=?)` | tốt; N+1 **trong một batch** (n statement, 0 round-trip) |
| initialState: receipt theo lô id | `SEARCH applied_commands (command_id=?)` | tốt |
| initialState: độ đủ điểm danh của buổi | `SEARCH class_sessions (workspace_id=? AND id=?)`, `SEARCH students USING INDEX students_class (class_id=?)`, `SEARCH attendance USING PRIMARY KEY … LEFT-JOIN` | tốt |
| `slip.send`: điểm danh + phiếu của nhiều em | `SEARCH attendance USING PRIMARY KEY (session_id=? AND student_id=?)`, `SEARCH session_comments USING PRIMARY KEY (…)` | tốt, 1 statement/bảng cho cả lớp |
| cursor sau mọi ghi | `SEARCH workspaces (id=?)` + `SEARCH change_log USING COVERING INDEX change_log_ws_seq (workspace_id=?)` | tốt, covering |
| commit: INSERT ô (CAS) | `SEARCH class_sessions (workspace_id=? AND id=?)`, `SEARCH students (workspace_id=? AND id=?)`, `SEARCH attendance USING PRIMARY KEY`, `SEARCH applied_commands … COVERING INDEX (command_id=?)` | tốt |
| commit: UPDATE ô (CAS version) | `SEARCH attendance USING PRIMARY KEY` + `applied_commands (command_id=?)` | tốt |
| commit: buổi `planned` → `held` | `SEARCH class_sessions (workspace_id=? AND id=?)` | tốt |
| receipt: INSERT có điều kiện / xích receipt | `SCAN CONSTANT ROW`, `SEARCH applied_commands (command_id=?)` | tốt |
| notification `score_updated` (ON CONFLICT `group_key`) | 7 `SEARCH` theo PK/index, không SCAN | tốt |
| trigger `change_log`, `attendance_history` | INSERT theo PK/autoincrement | tốt |

Kết luận: **không có `SCAN` bảng thật, không có TEMP B-TREE ngoài `DISTINCT` của truy vấn phụ huynh,
không thiếu chỉ mục ⇒ không thêm migration.** `attendance_student`, `session_comments_student`,
`scores_student`, `applied_commands_age` không dùng ở đường push nhưng cần cho pull/dọn dữ liệu — không
coi là thừa.

Còn lại (không bắt buộc, đã đo được là làm được): preload ô trong `initialState` hiện mỗi ô một
statement. `EXPLAIN` cho thấy row-value `IN` trên bảng `WITHOUT ROWID` **dùng được chỉ mục**
(`WHERE (session_id, student_id) IN ((…),(…))` → `SEARCH … USING PRIMARY KEY (session_id=? AND
student_id=?)` + `LIST SUBQUERY ␣ SCAN n CONSTANT ROWS`), nên có thể gộp thành lô ≤49 cặp/statement.
Việc này chỉ giảm số statement trong batch, không giảm round-trip, nên để sau.

## 7. Gate

### 7.1 Gate round-trip trong vitest

D1 local không có độ trễ mạng nên p95 local không đại diện cho dev; đo trên dev bị cấm (chỉ test local).
Gate độ trễ vì vậy chốt bằng **số round-trip D1**, đại lượng nhân với 21 ms trên mạng thật:

```
cd worker && npx vitest run tests/sync-push-roundtrips.test.ts
# attendance.set x1 / x5 / x20 / x50 → mỗi trường hợp ≤ 4 round-trip, mọi lệnh applied
```

Ước lượng trên mạng thật: 4 × 21 ms ≈ 84 ms cộng CPU 53–74 ms ⇒ ~140–160 ms p95, dưới gate 300 ms với
biên ~2×. Baseline dev (83 × 21 ms + CPU ≈ 1.8 s) khớp số đo 1.72–1.75 s nên mô hình round-trip × 21 ms
đã được kiểm chứng. `slip.send` cả lớp: 47 → 7 round-trip (5 em: 17 → 7).

### 7.2 k6 local (không deploy, không gọi dev/staging/prod)

Chuẩn bị trong `worker/`: `npx wrangler d1 migrations apply qlh-dev-db --local --env dev`, sau đó
`npx wrangler dev --local --env dev --port 8787` (ghi chú môi trường ở mục 11). Chạy ở gốc repo:

```
perf/k6/run-sync-push.sh                     # gate 5 VU × 1 phút, 20 lệnh/push
SCENARIO=ramp perf/k6/run-sync-push.sh       # ramp 1→40 VU
GATE_VUS=12 perf/k6/run-sync-push.sh         # tìm mức tải local còn đạt gate
```

Script tự đăng ký tài khoản + workspace mới trên D1 local (mật khẩu sinh ngẫu nhiên, không in), tạo lớp
`QA-PERF-k6-<n>` với 20 em, buổi hôm nay; không đọc file creds; host khác `127.0.0.1`/`localhost` thì
exit 2 (cả wrapper lẫn script). D1 local giới hạn 5 lượt đăng ký/giờ/IP nên chạy lại nhiều lần trong một
giờ phải xoá throttle cục bộ (`DELETE FROM auth_throttle`), script báo rõ khi gặp `429`.

Kết quả (log thô: `/tmp/qlh-evidence/sync-push-latency/*.log`, không commit). Cột p50–p99 là
`http_req_duration` của k6 (gần như toàn bộ là `sync_push`), p95 in đậm là ngưỡng `{name:sync_push}`:

| Kịch bản | Code | VU | Request | p50 | p90 | p95 | p99 | exit |
|---|---|---|---|---|---|---|---|---|
| gate | trước `fa7b750` | 5 | 1166 | 241 ms | 305 ms | **327 ms ✗** | 398 ms | 99 |
| gate | sau | 5 | 3054 | 87 ms | 124 ms | **145 ms ✓** | 222 ms | **0** |
| gate | sau (2 lần lặp lại) | 5 | 3112 / 3256 | 85 / 85 ms | 128 / 112 ms | **162 / 122 ms ✓** | 277 / 157 ms | 0 |
| ramp | trước `fa7b750` | 1→40 | 2730 | 463 ms | 1.76 s | **2.07 s ✗** | 2.23 s | 99 |
| ramp | sau | 1→40 | 7537 | 214 ms | 659 ms | **749 ms ✗** | 1.08 s | 99 |

Quét tải local trên code sau (gate 5…20 VU, cùng script, 20 lệnh/push):

| VU | 6 | 7 | 8 | 9 | 10 | 12 | 14 | 16 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| p95 | 194 ms ✓ | 279 ms ✓ | 238 ms ✓ | 228 ms ✓ | 231 ms ✓ | 299 ms ✓ | 315 ms ✗ | 361 ms ✗ | 440 ms ✗ |

⇒ **VU tối đa local còn giữ p95 < 300 ms là 12** (299 ms, sát ngưỡng); 14 VU vượt (315 ms). Biên độ
giữa các lần lặp lại cùng mức tải khoảng ±20 % (7 VU 279 ms so với 8–10 VU 228–238 ms là nhiễu), nên
mức 12 chỉ nên đọc là "khoảng 10–12 VU".

Đọc bảng:
- **Gate 5 VU**: trước 327 ms (trượt) → sau 122–162 ms (đạt, exit 0). Thông lượng cùng 5 VU tăng
  2,6–2,8× (1166 → 3054–3256 request/phút).
- Ramp 40 VU: 2.07 s → 749 ms (2,8×) nhưng vẫn trượt, vì `wrangler dev` local chỉ có một process
  workerd/miniflare chạy chung CPU với chính k6. Ramp chỉ dùng để so tương đối trước/sau và để tìm mức
  tải local còn đo được; trần tải thật phải đo trên dev ở bước sau.
- Trên mạng thật, round-trip đắt ~21 ms nên khoảng cách trước/sau sẽ **rộng hơn** nhiều so với local
  (local mỗi round-trip chỉ ~0,5–1 ms, phần lớn thời gian là CPU).

## 8. Kiểm chứng hành vi (vitest)

`worker/tests/sync-push-roundtrips.test.ts` — 4 test: số round-trip là hằng số ≤ 4 cho 1/5/20/50 lệnh.

`worker/tests/sync-push-batch.test.ts` — 17 test, mỗi test khoá một điểm rủi ro của việc gộp batch:

1. 20 lệnh điểm danh: một batch, ≤ 4 round-trip, mọi lệnh `applied`, version 1, buổi `held` version 2,
   20 dòng `change_log` + dòng `class_session`, 20 receipt. Sau đó **ép batch gộp lỗi** để cả 20 lệnh
   chạy lại bằng đường tuần tự cũ và so từng dòng `attendance`, `class_sessions`, chuỗi `change_log`,
   receipt — **giống hệt**.
2. Gửi lại cùng request: mọi lệnh `duplicate/applied`, không thêm dòng `change_log`/receipt nào, ≤ 4 round-trip.
3. Hai lệnh cùng một ô trong một request: lệnh sau thắng, ô +2 version, buổi `held` version 2.
4. Một lệnh bị từ chối trong batch gộp (buổi đã huỷ) không chặn lệnh khác; receipt của lệnh đó `rejected`.
5. Một statement lỗi giữa batch (vi phạm `CHECK` của `attendance`): D1 huỷ + rollback cả batch, mọi lệnh
   chạy lại tuần tự **đúng một lần** (không nhân đôi dòng, version vẫn 1).
6. CAS thua (hàng `class_sessions` đổi giữa preload và commit): lệnh đó chạy lại, `applied`, ô version 1,
   buổi `held` version 3.
7. Request trộn `test.create` + lệnh ô + `score.set` + `slip.send`: kết quả đúng thứ tự request.
8. `slip.set` sau `attendance.set` cùng buổi trong một request: cùng kết quả như gửi từng request;
   thiếu điểm danh một em thì `rejected` `attendance_incomplete`, `missing_count: 1`.
9. Receipt của workspace khác: `rejected` `conflict` `details.reason=retry`, không ghi dòng `attendance`.
10. Push 50 lệnh: mọi statement ≤ 100 bind, ≤ 4 round-trip.
11. (a) lệnh sau không vượt lệnh trước khi writer khác ghi cùng ô + buổi — khớp base từng version,
    `attendance_history` và trạng thái buổi.
12. (b) writer khác huỷ buổi trước commit ⇒ cả hai lệnh `rejected` `session_cancelled`, 0 dòng ghi.
13. (c) `base_version` của lệnh sau được xét lại trên dữ liệu thật ⇒ applied v3/v4, cuối `7`, history đúng.
14. (d) `noop` không chốt từ version dự đoán ⇒ applied v2 + `noop` v2, cuối `5`, history 1 dòng.
15. Hai lệnh điểm trong cùng một nhóm chỉ tạo **một** notification `score_updated` (ON CONFLICT `group_key`,
    `event_version = 2`).
16. Cùng command id do membership khác trong cùng workspace gửi ⇒ `rejected` `conflict` `reason=retry`.
17. `slip.send` cả lớp 20 em: 7 round-trip, bằng đúng số của 5 em (hằng số); 19 phiếu gửi, 1 em vắng bị bỏ.

Kết quả toàn bộ worker: `npx tsc --noEmit` 0 lỗi; `npx vitest run` **48 file / 300 test, 0 fail**
(`slip-send-bind`, `notifications`, `sync`, `attendance`, `comments` vẫn xanh).

## 9. Backport prod

Prod hiện là `31c1942` (`hotfix/slip-send-bind-limit`), **không** có: `levels`/`skill_levels`/
`criteria_levels` trên phiếu và `slip.send.defaults[]`, lệnh `session.lesson.set`, cờ
`CRITERIA_LEVELS`, và cổng "đủ điểm danh" trước `slip.set`/`slip.send`; đồng thời quy tắc bỏ em vắng khi
`slip.send` cả lớp ở prod khác (prod chưa có gate `attendance_incomplete`). Vì vậy hotfix prod **không
được chép nguyên `worker/src/db/sync.ts`**: phải port riêng phần preload (`syncIdentity`, `initialState`
receipt + độ đủ điểm danh), phần gộp batch + xích receipt, và phần preload của `slip.send` lên đúng SQL
và tập cột của prod (không có 3 cột levels/criteria, không có `session.lesson.set`), rồi chạy lại test
tương ứng của prod. Việc này nằm ngoài packet hiện tại.

## 10. Còn lại / rủi ro

1. **Trần statement/batch của D1 chưa được xác nhận bằng tài liệu.** 20 lệnh → 61 statement trong batch
   commit, 50 lệnh → 151 statement. Local chạy tốt (k6 20 lệnh, vitest 50 lệnh); cần xác nhận trên dev
   trước phát hành, nếu có trần 100 thì phải chia nhóm (ví dụ ≤30 lệnh ô mỗi batch).
2. **Preload ô trong `initialState` vẫn là N+1 trong batch** (n statement, 0 round-trip). Gộp được bằng
   row-value `IN` (mục 6) — không bắt buộc, để sau.
3. **Bind tối đa 100 tham số/statement**: lô id dùng 99 + `workspace_id` = 100 (đã có từ trước); preload
   `slip.send` dùng 98 + 2 = 100.
4. **`touchSession`** sau phản hồi là 1 lượt ghi D1 qua `waitUntil`, không nằm trên đường phản hồi.
5. Chưa đo lại trên dev (chỉ test local). Khi được duyệt, gate thật là `perf/k6/sync-push.js` chạy trên
   dev sau deploy, kỳ vọng p95 ≈ 140–160 ms.

## 11. Ghi chú môi trường local

- `wrangler dev --local --env dev` trong repo hiện **không khởi động được** runtime local:
  `Incorrect type for map entry 'MINUTE_CRON': the provided value is not of type 'function or
  ExportedHandler'` (workerd coi mọi named export của module entry là handler; `src/index.ts` export hai
  hằng chuỗi cron). Lỗi có từ trước thay đổi này và vẫn xảy ra với wrangler 4.158.0. Để đo, tôi dùng cấu
  hình tạm (không commit) trỏ `main` vào một entry chỉ `export default app` và bỏ `triggers.crons`, rồi
  xoá sau khi đo. Sửa gốc thuộc `worker/src/index.ts` — cần một packet riêng.
- Dừng server: `kill <pid của npx>`; trong một số lần, tín hiệu không lan xuống tiến trình con
  (`wrangler`/`workerd` sống tiếp). Tôi luôn kiểm tra cổng 8787 đã đóng và dừng nốt đúng tiến trình con
  của lần chạy đó (xác định bằng quan hệ cha–con của PID tôi vừa khởi động) trước khi chuyển sang đo code
  khác. Sau mỗi lần đo, cổng 8787 đóng và không còn tiến trình `workerd` nào.
- Cả hai phía (trước/sau) đo trên cùng máy, cùng script, cùng 20 lệnh/push, cùng thời lượng.
