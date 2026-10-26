# Báo cáo B1: spec backend MVP

Ngày: 2026-10-21 · Người viết: lead spec backend · Brief: `plans/20261021-mvp/briefs/10-backend-spec.md`

## Đã làm

Năm tài liệu trong `plans/20261021-mvp/backend/` (không sửa `docs/`, không viết mã, không dùng git ghi):

| File | Nội dung |
|---|---|
| `data-model.md` | 27 bảng D1 (DDL, khóa, chỉ mục, trigger lịch sử và chặn, `change_log`), bảng truy vấn → chỉ mục, các `batch` bắt buộc, sinh buổi, ORM, ước lượng hạn mức |
| `api-spec.md` | ~42 endpoint kèm ví dụ và "ai gọi", đồng bộ (`push`/`pull`/`snapshot`, 11 loại lệnh, xung đột), lỗi, phân trang, giới hạn tốc độ, báo cáo, thông báo, 14 câu hỏi mở |
| `authz-matrix.md` | vai trò × tài nguyên × hành động, 33 ca test phân quyền |
| `stack-and-cpu.md` | stack, khung đo CPU, **số đo thật**, kế hoạch băm mật khẩu, điều kiện nâng gói |
| `offline-plan.md` | hợp đồng offline chung, kho cục bộ, thứ tự làm iOS/web |

## Quyết định chính (đã chọn, kèm lý do ngắn)

1. **Hono + D1, SQL thuần ở runtime; Drizzle chỉ lúc thiết kế** (schema/migration, kiểu bằng `import type`). Đo thật: Hono 14,7 KiB gzip; thêm Drizzle 47,5; thêm Zod 133,9 (loại). Dựng 50 câu upsert: SQL thuần 1–2 ms CPU, Drizzle 12–29 ms (vượt 10 ms).
2. **PBKDF2-SHA256, 100.000 vòng** (Cloudflare chặn không cho hơn), số vòng cấu hình và lưu theo từng hash để băm lại sau này. Đo: trung vị 29 ms CPU (18–45) ⇒ gấp ~3 ngân sách 10 ms; 25.000 vòng ≈ 7 ms. Chưa request nào bị cắt trên gói Free trong thử nghiệm (165 request), nhưng không đặt được giới hạn mô phỏng ⇒ cần cổng đo đầy đủ (`stack-and-cpu.md` 4.4) và điều kiện nâng gói 5 USD (4.5).
3. **Phiên = token ngẫu nhiên lưu băm SHA-256 trong D1**, không phải token ký HMAC: băm chỉ xảy ra lúc đăng nhập, còn quyền phải kiểm lại mỗi request nên vẫn cần đọc D1; thu hồi tức thì được. Xác thực bằng `Bearer` cho cả iOS và web (cookie bị Safari chặn khi web và API khác miền).
4. **Đồng bộ qua `change_log` do trigger ghi** + `cursor` số nguyên + `epoch` phạm vi; kéo thay đổi là một `batch` D1, không N+1. Lệnh idempotent bằng `applied_commands` (PK = UUID), `base_version`, xung đột giữ cả hai giá trị (`sync_conflicts`) cho 4 loại "ô" (điểm danh, điểm, phiếu, chấm BTVN). Khóa tự nhiên thay `id` cho các ô để hai thiết bị cùng tạo không sinh trùng.
5. **Phụ huynh liên kết theo SĐT** qua `guardian_student` do tầng `db` duy trì; kết quả chấm BTVN lộ cho phụ huynh khi phiếu buổi chấm đã gửi (truy vấn mẫu trong `data-model.md` 2.5), phát lại `change_log` khi gửi phiếu hoặc hủy buổi.
6. Báo cáo: bản chụp bất biến do **máy chủ** dựng lúc phát hành (hai client giống nhau), PDF sinh ở máy giáo viên rồi tải lên R2, phát qua Worker (không link ký, Q9).

## Câu hỏi mở cần người dùng (chi tiết ở `api-spec.md` mục 10)

Chặn việc implement phần đăng nhập/cấp mật khẩu: **Q1** quên mật khẩu giáo viên/Admin (spec đã ghi chưa chốt); **Q2** quy tắc cấp mật khẩu cho SĐT đã có tài khoản (rủi ro một giáo viên chiếm tài khoản người khác nếu nhập trùng SĐT); **Q3** đăng ký workspace không xác minh SĐT (chặn SĐT người khác); **Q8** chạy 100.000 vòng trên gói Free hay nâng gói ngay.
Không chặn: Q4 hạn mật khẩu tạm · Q5 quyền mặc định của Trợ giảng · Q6 điểm thập phân · Q7 thông báo BTVN/điểm mới · Q9 PDF qua Worker thay link ký · Q10 một học sinh một lớp · Q11 giữ nhóm `lectures` · Q12 push iOS và gửi hàng loạt · Q13 chi tiết nhỏ · Q14 một SĐT dùng chung mật khẩu giữa các vai trò.

## Kết quả đo

Bảng đầy đủ ở `stack-and-cpu.md` mục 3. Tóm tắt: PBKDF2-SHA256 100.000 vòng trung vị 29 ms CPU; 50.000: 13 ms; 25.000: 7 ms; 10.000: 4 ms; SHA-512 chậm gấp 3–4 lần; `batch` 100 câu SQL thuần ≈ 1–2 ms CPU (chờ D1 ≈ 30–70 ms). Số Web Push một tin ≈ 0–2 ms là **phép đo lịch sử B1, đã bỏ khỏi stack và không dùng làm ngân sách FCM** (`stack-and-cpu.md` mục 3.2, 9). `wrangler whoami` cho thấy đã đăng nhập, tài khoản gói Free; đo trên Worker tạm `qlh-staging-bench*`.

**Dọn dẹp:** đã xóa `qlh-staging-bench`, `qlh-staging-bench-d1` và D1 `qlh-staging-bench-db` (xác nhận `wrangler d1 list` không còn tài nguyên `qlh-staging`). Không đụng production. Mã thử nghiệm nằm ngoài repo ở `/tmp/qlh-bench`, `/tmp/qlh-bundle` (có thể mất; phương pháp đủ để lặp lại ở `stack-and-cpu.md` mục 3).

## Việc đồng bộ vào `docs/architecture.md` (làm sau review, do người khác)

Danh sách đầy đủ, gộp cả B1, B2 (`C-01`/`R-01`/`R-02`) và B3. Số thứ tự chỉ để tham chiếu, không phải thứ tự làm.

1. **Mục 2 hàng Đăng nhập:** phiên = token ngẫu nhiên + băm SHA-256 tra D1 (không phải token ký HMAC); PBKDF2-SHA256 tối đa 100.000 vòng (Cloudflare giới hạn); `must_change_password` chặn mọi endpoint trừ đổi mật khẩu/đăng xuất/`/me`. **Mới ở B3:** cấp mật khẩu tạm chỉ khi tài khoản đích không có membership nhân sự ở bất kỳ workspace nào và mọi membership là `linked_students` trong chính workspace gọi; ngược lại `409 account_not_resettable`, không ghi gì.
2. **Mục 2 hàng Lưu file/PDF:** phát PDF qua Worker (stream, kiểm quyền mỗi lần) thay cho "link ký ngắn hạn" (Q9).
3. **Mục 2 hàng Backend/ORM:** Drizzle chỉ dùng lúc thiết kế (schema + migration, kiểu bằng `import type`); runtime SQL thuần qua `env.DB.prepare/batch`.
4. **Mục 2 hàng Push:** FCM HTTP v1; iOS qua **FCM → APNs** bằng SDK Firebase Messaging, web dùng FCM web token; không còn Web Push VAPID tự gửi, không APNs trực tiếp; OAuth RS256 từ secret + cache D1 ~50 phút; payload chỉ loại + ID.
5. **Mục 4 (bảng/dữ liệu):** thêm `change_log`, `sync_conflicts`, `applied_commands`, `scope_epoch`, `change_floor`; đổi tên `sessions` → `class_sessions`; 4 loại "ô" dùng khoá tự nhiên (`session_id+student_id`, `test_id+student_id`, `section_id+student_id`).
6. **Mục 4 (ràng buộc cùng lớp — B-04):** `UNIQUE (class_id, id)` trên `students`, `class_sessions`, `tests`, `homework_sections`; FK phức hợp `(class_id, …)` cho `attendance`, `scores`, `session_comments`, `homework_grades` (và `homework_sections → class_sessions`). Hệ quả: đổi `students.class_id` khi đã có dữ liệu bị chặn — chuyển lớp thuộc "Làm sau", phải thêm bảng ghi danh.
7. **Mục 4 (vòng đời đăng ký push — `C-01`/`R-01`):** token bind `user + membership + auth_session`; `bound_at` + `registration_version`; hai loại upsert (làm mới cùng binding không bump; đổi binding bump + xoá deliveries); `PUT /session/membership` 200 và `POST /auth/logout` 204 gỡ token của **đúng phiên** trong cùng batch rồi client mới đổi danh tính; sender đối chiếu danh tính khớp từng lần gửi; push đã hiện trước ack không thu hồi từ xa được.
8. **Mục 4/7 (fanout — `R-02` + `C3-01`):** mở rộng inbox hai pha, freeze `expansion_started_at` bằng CAS theo `event_version` + `ready_at`, keyset `delivery_cursor`, trần **5 inbox / 20 đăng ký** mỗi invocation, phân trang **trước** rồi lọc **sau** trong projection; điều kiện đủ gồm quyền nhóm theo loại sự kiện (`comments_reports` cho phiếu/báo cáo/BTVN, `scores` cho điểm) và liên kết `guardian_student`; sender kiểm lại toàn bộ. 5/20 **chưa đo**.
9. **Mục 5 (offline/sync — B-02):** atomic = **mỗi lệnh một `batch` D1** (dữ liệu + `applied_commands` + `change_log` + lịch sử); lô HTTP nhiều lệnh **không** atomic; lệnh bị từ chối không chặn lệnh khác; lệnh đã áp dụng không bị hoàn lại; client xoá **từng** lệnh theo xác nhận của riêng nó, gửi lại cả lô sau khi mất mạng và nhận `duplicate` cho lệnh đã áp dụng.
10. **Mục 5 (retention — B-03):** `change_log.created_at` là **giây Unix** (`INTEGER NOT NULL`, trigger ghi) + chỉ mục `change_log_age`; cron xoá dòng cũ hơn 120 ngày theo lô nhỏ (≤ 500 dòng/lô, ≤ 4 lô/lần chạy), rồi cập nhật `workspaces.change_floor`; client có cursor nhỏ hơn `change_floor` nhận `409 snapshot_required` và tải lại bằng `GET /sync/snapshot`; `epoch` lệch vẫn là `409 resync_required`.
11. **Mục 4 (phạm vi phụ huynh — B-05):** `GET /calendar` của phụ huynh chỉ trả buổi của lớp có con được liên kết, không `note`, không lớp khác — cùng câu chữ với `authz-matrix.md` mục 2.2.
12. **Mục 4/7 (thông báo — `RQ-03`):** `GET /notifications` trả `report_id` cho `report_published` và `test_id` cho `score_updated` (cột đã có trong DDL), loại khác `null`; không trả nội dung nhận xét/điểm/SĐT.
13. **Mục 4 (phạm vi không làm):** ghi rõ MVP **không làm** bài giảng (`lectures` chỉ là dòng quyền trong lược đồ), học phí, lương, mời nhân sự (link/OTP/link chung của lớp/duyệt yêu cầu), OTP/SMS cho đăng nhập, màn quản lý nhân sự và role, xác minh SĐT.
14. **Mục 9 (số đo):** PBKDF2 100.000 vòng ≈ 29 ms CPU (vượt 10 ms), `batch` 100 câu SQL thuần ≈ 1–2 ms CPU, bundle Hono + SQL thuần 14,7 KiB gzip; cổng đo băm đầy đủ còn lại; **chưa đo** CPU của 50 lô đồng bộ nhỏ, RS256/gửi FCM, các trần 5/20.
15. **Mục 7 (rủi ro):** rủi ro SĐT (Q1/Q2/Q3, SĐT đổi chủ, giáo viên nhập sai), rủi ro push đã hiện trước ack, rủi ro CPU băm mật khẩu; nếu người dùng chốt Q15 (định nghĩa "vắng 2 buổi liên tiếp") thì bổ sung vào spec mục 4/5 (hiện tính ở client).

## Chưa kiểm chứng / hạn chế

Cổng đo băm đầy đủ chưa chạy (mẫu nhỏ, một khung giờ); hành vi giới hạn 10 ms của gói Free theo tải chưa rõ; Queues trên gói Free, `vitest-pool-workers`, hạn mức Cloudflare ở mục 7 `stack-and-cpu.md` chưa kiểm lại; DDL của 27 bảng và các chỉ mục đã nạp thành công vào SQLite 3.51 cục bộ, và ràng buộc khóa ngoại phức hợp chặn đúng dòng khác workspace (thử bằng `sqlite3`); trigger mới được mô tả bằng bảng, chưa viết SQL và chưa chạy, và chưa chạy trên D1 thật. Spec nghiệp vụ không có mâu thuẫn nào tôi tự giải quyết; các chỗ chưa rõ nằm trong Q1–Q14, không tự đoán.

Status: DONE_WITH_CONCERNS
Summary: Năm tài liệu spec backend (data-model, api-spec, authz-matrix, stack-and-cpu, offline-plan) và báo cáo đã xong, kèm số đo thật PBKDF2/D1/bundle trên Worker staging tạm (đã xóa). Lo ngại: băm mật khẩu 100.000 vòng tốn ~29 ms CPU (vượt 10 ms, cần cổng đo đầy đủ hoặc nâng gói) và bốn câu hỏi mở Q1, Q2, Q3, Q8 cần người dùng quyết trước khi implement đăng nhập.

## Cập nhật B2 (FCM) · tiếp quản 2026-10-21

Đã cập nhật data-model, API, authz, offline, stack và checklist Firebase theo brief 12. Docs nguồn cũng đã đổi sang D1 + FCM, không Firestore. Có 4 loại sự kiện; Q7 và Q12 đã chốt (điểm sau 5 phút không nhập thêm, BTVN theo lần giao, sửa đề không push). Device token có chủ user/membership/phiên, unique token, version chống xoá nhầm sau chuyển chủ; deliveries theo từng thiết bị, kiểm quyền lại khi gửi; OAuth cache D1 ~50 phút, private key chỉ trong secret.

Đã kiểm cấu trúc DDL SQLite và ràng buộc thiết bị bằng script tái chạy được `check-fcm-ddl.py`; lệnh, exit code, counts và giới hạn kiểm ghi ở `resume-verification.md`. DDL hiện có 29 bảng (27 bảng B1 − `push_subscriptions` VAPID cũ + `device_tokens`, `push_deliveries`, `fcm_oauth_cache`). Chưa có mã backend để test runtime. Không có số đo RS256: endpoint Worker thử phiên cũ trả HTTP 403. Đã xoá `qlh-staging-rs256`, lệnh liệt kê deployments xác nhận code 10007 Worker không tồn tại. Không gọi FCM thật, không tạo service account, không commit/push/merge.

B2 còn cần gửi thử/đo CPU; review backend B1 chưa hoàn tất, findings B-01..B-05 vẫn phải giải quyết trước implement (xem review). Q1/Q2/Q3/Q8 và xác nhận mật khẩu tạm còn chờ người dùng; không tự đổi nghiệp vụ đăng nhập.

### Vòng sửa r2 sau review FCM r1 (`C-01`, `R-01`, `R-02`)

Hai reviewer độc lập trả `CHANGES_REQUIRED` trên candidate r1. Đã sửa bằng contract, chi tiết ở `fcm-b2-fix-r1.md`:

- **C-01 + R-01 — vòng đời đăng ký token:** đổi vai trò/đăng xuất/đổi tài khoản là thao tác cần mạng có xác nhận; máy chủ gỡ đăng ký token của **đúng phiên hiện tại** (cascade deliveries) trong cùng batch rồi mới trả 200/204; client chỉ đổi danh tính sau ack. Thêm `device_tokens.bound_at` + quy tắc: làm mới cùng binding không bump `registration_version`; sender đối chiếu `auth_sessions.user_id`/`membership_id` **khớp** token, lệch thì `skipped`. Push đã nhận trước ack ghi rõ là không thu hồi từ xa được.
- **R-02 — trần fanout:** mở rộng inbox hai pha (freeze `expansion_started_at` đúng một lần, lease 60 giây) + keyset paging `delivery_cursor`, tối đa 5 inbox và 20 đăng ký thiết bị mỗi invocation; chỉ đặt `deliveries_expanded_at` khi xét hết. Giá trị 5/20 **chưa đo**.

R1 (`candidates/fcm-b2-r1`, manifest `0936ec36…e706`) giữ nguyên; candidate mới là `candidates/fcm-b2-r2`.

## Cập nhật B3 — sửa các finding còn mở của spec D1 (một lượt, không mở vòng review)

Brief: `../briefs/13-backend-core-fixes.md`. Ghi trong `plans/20261021-mvp/backend/` (data-model, api-spec, authz-matrix, offline-plan, stack-and-cpu, `check-fcm-ddl.py`, báo cáo này). **Không** sửa `docs/`, không chạy git, không tạo candidate/snapshot, không mở vòng review, không sinh brief con. `candidates/*` và `reviews/*` giữ nguyên.

### 1. Finding → cách sửa → bằng chứng

| Finding | Cách sửa | Bằng chứng |
|---|---|---|
| **C3-01** (fanout thiếu quyền nhóm + liên kết con trong projection) | Giữ "phân trang trước, lọc sau"; thêm vào **projection** của trang fanout hai điều kiện: `EXISTS role_permissions` theo nhóm của `kind` (phiếu/báo cáo/BTVN → `comments_reports`; điểm → `scores`; mức `read`/`write`) và `EXISTS guardian_student` theo `user + student`. Không đẩy vào `WHERE` trước `LIMIT`. Sender vẫn kiểm lại. | `data-model.md` 2.7 (bullet fanout), `api-spec.md` 7, kiểm `c3_01_*` (6 ca: mất quyền nhóm, mất liên kết, đủ cả hai thì có delivery, `score_updated` cần nhóm `scores`, dòng bị skip vẫn chiếm ngân sách/cursor) |
| **B-01** (cấp mật khẩu có thể chiếm tài khoản nhân sự) | Chỉ đặt lại khi tài khoản đích (a) không có membership nhân sự ở bất kỳ workspace nào **và** (b) mọi membership là `linked_students` trong chính workspace gọi; ngược lại `409 account_not_resettable` **trước khi ghi**, không kèm chi tiết. Bỏ nhánh cũ `password_issued:false`. | `api-spec.md` 1 (bảng lỗi), 4, Q2; `authz-matrix.md` 2.1, T23; `data-model.md` 3, 4 (truy vấn kiểm + thứ tự batch); kiểm `b01_*` (3 ca) |
| **B-02** (ranh giới atomic mơ hồ) | Chốt: **mỗi lệnh một `batch` D1** (dữ liệu + `applied_commands` + `change_log` + lịch sử); lô HTTP **không** atomic toàn bộ; lệnh bị từ chối không chặn lệnh khác; lệnh đã áp dụng không bị hoàn lại; client xoá từng lệnh theo xác nhận riêng và gửi lại cả lô nhận `duplicate`. | `api-spec.md` 6.1 (bước 3 + "Hệ quả cho client"), `offline-plan.md`; `data-model.md` 4, `stack-and-cpu.md` 3.2/6 (làm rõ số đo 50 câu là kịch bản đo, không phải ranh giới atomic); kiểm `b02_*` (2 ca) |
| **B-03** (`change_log` không có thời gian để dọn) | Thêm `created_at INTEGER NOT NULL` (giây Unix do trigger ghi) + chỉ mục `change_log_age`; cron xoá dòng cũ hơn 120 ngày theo lô ≤ 500 dòng/lô, ≤ 4 lô/lần chạy, rồi cập nhật `change_floor`; `AUTOINCREMENT` giữ `seq` không cấp lại; client có cursor `< change_floor` nhận `409 snapshot_required` (tách khỏi `resync_required`). | `data-model.md` 1 (`change_floor`), 2.8, 3; `api-spec.md` 1, 6.3; `authz-matrix.md` T35; `offline-plan.md`; `stack-and-cpu.md` mục 6 (cron dọn dẹp); kiểm `change_log_*`, `chi_muc_change_log_*`, `cursor_*` (10 ca) |
| **B-04** (chưa buộc cùng lớp) | `UNIQUE (class_id, id)` trên `students`, `class_sessions`, `tests`, `homework_sections`; FK phức hợp `(class_id, …)` cho `attendance` (buổi, em), `scores` (bài, em), `session_comments` (buổi, em), `homework_grades` (phần, em), thêm `homework_sections → class_sessions(class_id,id)`. **Chọn FK phức hợp thay trigger** (lý do ghi ở `data-model.md` 1): D1 thực thi ngay mọi câu ghi, không tốn CPU trigger mỗi dòng, `UNIQUE (class_id, id)` vừa là chỉ mục. Học sinh rời lớp giữ nguyên `class_id` nên lịch sử không phá ràng buộc; đổi `class_id` sau khi có dữ liệu bị chặn (đúng ý MVP "một em một lớp"). | `data-model.md` 1, 2.2–2.5; `authz-matrix.md` T37; kiểm `b04_*` (12 ca: chèn chéo lớp bị chặn cho 4 quan hệ + phần BTVN sai buổi, chèn đúng lớp qua, rời lớp giữ lịch sử, `foreign_key_check` rỗng) |
| **B-05** (phạm vi `/calendar` cho phụ huynh) | Nêu rõ: phụ huynh **được** dùng, chỉ nhận buổi của lớp có con được liên kết, không `note`, không lớp/buổi khác; cùng câu chữ ở hai tài liệu. | `api-spec.md` 5.3 (cột `/calendar`), `authz-matrix.md` 2.2, T34 |
| **RQ-03** (inbox thiếu `report_id`/`test_id`) | `GET /notifications` trả `report_id` cho `report_published`, `test_id` cho `score_updated`, loại khác `null`; ví dụ có 3 dòng; nhấn mạnh ID không phải quyền truy cập. | `api-spec.md` 7 (bảng endpoint, ví dụ, câu giải thích) |

### 2. Rà đủ cốt lõi (mục 8 của brief)

| Nhóm tính năng | Bảng | Endpoint / lệnh | Kết quả |
|---|---|---|---|
| Lớp (tạo, sửa, lưu trữ, lịch lặp) | `classes`, `member_classes` | `GET/POST /classes`, `GET/PATCH /classes/{id}` | đủ |
| Học sinh (SĐT phụ huynh, sửa SĐT, đánh dấu nghỉ) | `students`, `guardian_student` | `GET/POST /classes/{id}/students`, `GET/PATCH /students/{id}` | đủ |
| Buổi học (sinh theo lịch lặp, hủy, buổi lẻ, lịch ngày/tháng) | `class_sessions` | `GET /classes/{id}/sessions`, `GET /calendar`, `POST /classes/{id}/sessions`, `POST /sessions/{id}/cancel` | đủ (B-05 làm rõ phạm vi) |
| Điểm danh 4 trạng thái | `attendance`, `attendance_history` | `GET /sessions/{id}/attendance`, `GET /students/{id}/attendance` (**thêm ở B3**), lệnh `attendance.set` | **thiếu 1 endpoint, đã bổ sung**: trước đây không có đường đọc điểm danh theo em/tháng cho phụ huynh dù spec 5.2 đánh dấu ✓ |
| BTVN theo phần + chấm 3 mức | `homework_sections`, `homework_grades` | `GET /sessions/{id}/homework`; lệnh `homework.assign`, `homework.section.upsert/delete`, `homework.grade.set` | đủ |
| Bài kiểm tra & điểm (`max` mỗi bài, `archived`, không trung bình) | `tests`, `scores`, `score_history` | `GET /classes/{id}/tests?archived=`, `GET /tests/{id}/scores`; lệnh `test.create/update/delete`, `score.set` | đủ; không có trường điểm trung bình/`vắng thi` ở bất kỳ đâu |
| Nhận xét/phiếu buổi học (sao 1..3, ghi chú, gửi) | `session_comments` | `GET /sessions/{id}/slips`; lệnh `slip.set`, `slip.send` | đủ |
| Báo cáo tháng (nháp, phát hành, bản chụp PDF) | `reports`, `report_publications` | 7 endpoint ở `api-spec.md` 8 | đủ |
| Auth SĐT + mật khẩu (đăng ký workspace, đăng nhập, đổi mật khẩu, cấp mật khẩu, phiên) | `users`, `memberships`, `auth_sessions`, `auth_throttle` | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/change-password`, `POST /workspaces`, `GET /me`, `PUT /session/membership`, `POST /students/{id}/guardian-credentials` | đủ (B-01 siết điều kiện cấp) |
| Phân quyền | `roles`, `role_permissions`, `memberships`, `member_classes`, `guardian_student` | mọi endpoint; `GET /me` trả `permissions` | đủ |
| Đồng bộ (idempotent, xung đột) | `change_log`, `applied_commands`, `sync_conflicts` | `POST /sync/push`, `GET /sync/pull`, `GET /sync/snapshot*`; lệnh `conflict.resolve` | đủ (B-02, B-03) |
| Thông báo/push FCM | `notifications`, `device_tokens`, `push_deliveries`, `fcm_oauth_cache` | `GET /notifications`, `POST /notifications/read`, `PUT/DELETE /device-tokens` | đủ (C3-01, RQ-03) |

**Mục còn mơ hồ sau khi rà (đã bổ sung/xử lý):** (a) cảnh báo "vắng 2 buổi liên tiếp" (spec mục 8) trước đây không có đường đọc và chưa có định nghĩa — đã thêm `GET /students/{id}/attendance`, ghi rõ cảnh báo tính ở client, định nghĩa chính xác đưa vào **Q15** (không tự đoán nghiệp vụ). (b) Out-of-scope ghi rõ "không làm ở MVP" thay vì lửng lơ: bài giảng/`lectures`, học phí, lương, mời nhân sự, OTP/SMS đăng nhập, màn nhân sự/role, xác minh SĐT — ở `api-spec.md` mục 10 (đoạn đầu), `authz-matrix.md` 2.1, `data-model.md` 2.1. (c) Không xoá gì khỏi lược đồ ngoài phạm vi (giữ `lectures` đúng spec mục 4), chỉ khoanh vùng "không làm".

### 3. Tự kiểm (chạy lại được bằng một lệnh)

```
$ cd /Users/phamnhuphong/Git/quanlyhocsinh
$ python3 plans/20261021-mvp/backend/check-fcm-ddl.py
  data_model=plans/20261021-mvp/backend/data-model.md  blocks=11  sha256=38b4d5a4672162c0076c2a41ca156c0a0067b50d5e3d4c4f67c813fda89ece0d
  schema_loaded=ok  foreign_keys=1
  ... 134 dòng PASS ...
  ket_qua: PASS 134/134
  exit=0

$ python3 plans/20261021-mvp/backend/check-fcm-ddl.py --links
  link_files=12  tham_chieu_file=221  hong=0
  PASS  link_noi_bo
  exit=0
```

101 ca cũ vẫn PASS; **33 ca mới**: C3-01 (6), B-01 (3), B-02 (2), B-03 (10), B-04 (12). Script giữ tên `check-fcm-ddl.py` (chạy không tham số là đủ) nhưng nay kiểm cả lõi D1, không chỉ FCM; docstring ghi rõ phạm vi.

**Đột biến (làm trên bản sao ở `/tmp`, không sửa nguồn):**

| Bản thử | Sửa có ý | Exit | Kết quả |
|---|---|---|---|
| M1 | bỏ điều kiện `role_permissions` khỏi projection fanout | 1 | 2 FAIL: `c3_01_mat_quyen_nhom_truoc_fanout_khong_tao_delivery`, `c3_01_score_can_nhom_scores_khong_dung_comments_reports` |
| M2 | bỏ điều kiện `guardian_student` khỏi projection fanout | 1 | 1 FAIL: `c3_01_mat_lien_ket_con_truoc_fanout_khong_tao_delivery` |
| M3 | bỏ FK `(class_id, student_id)` của `scores` trong `data-model.md` | 1 | 1 FAIL: `b04_diem_bai_C1_voi_em_C2_bi_chan` |
| M4 | `change_log.created_at INTEGER NOT NULL` → `INTEGER` | 1 | 2 FAIL: `change_log_created_at_not_null`, `change_log_thieu_created_at_bi_tu_choi` |
| M5 | bỏ chỉ mục `change_log_age` | 1 | 1 FAIL: `chi_muc_change_log_theo_created_at` |
| Gốc | không sửa | 0 | PASS 134/134 |

**Tìm chéo bằng `srcwalk` (`discover --as text --scope plans/20261021-mvp/backend`) trên 6 tài liệu hợp đồng:** không còn `password_issued: false`/`account_has_own_password`, không còn `log_truncated` như mã lỗi riêng (chỉ còn là `details.reason` của `snapshot_required`), không còn `push_subscriptions`/"Web Push subscription cũ"/VAPID tự gửi, không còn APNs trực tiếp (mọi chỗ đều "FCM → APNs"/"Firebase Messaging → APNs"), không còn nhắc mời/OTP như tính năng (chỉ còn câu "không làm" và Q3 `registration_code` của bản thử), không có điểm trung bình hay trung bình điểm ở endpoint nào, `vắng thi` chỉ xuất hiện trong câu khẳng định "không có cột vắng thi". Bốn tài liệu khớp nhau ở các điểm 1–7 (đã dẫn nguồn trong bảng mục 1).

### 4. Giới hạn kiểm (không được đọc quá)

- Đây là **mô phỏng SQL tuần tự** trên SQLite `:memory:` theo prose của tài liệu, **không** phải D1/Worker/API thật, không chạy trigger (trigger chỉ mô tả bằng bảng), không thử cron concurrent, không gửi FCM.
- Chưa có số đo mới: CPU 50 lô đồng bộ nhỏ, RS256/gửi FCM, trần 5 inbox/20 đăng ký, thời gian dọn `change_log` trên D1 — **chưa đo**.
- B-04 dùng FK phức hợp: chưa đo chi phí ghi thêm của 4 chỉ mục `UNIQUE (class_id, id)`; DDL chỉ mới nạp vào SQLite cục bộ, chưa áp migration lên D1.
- Không mở vòng review cho packet nhỏ này theo chỉ đạo; không tạo candidate/snapshot mới; kết luận cuối cùng vẫn chờ một review tổng thể do General Lead giao.

Status: DONE_WITH_CONCERNS
Summary: Đã sửa C3-01, B-01..B-05 và RQ-03 trong 5 tài liệu hợp đồng, thêm `GET /students/{id}/attendance`, bổ sung bảng rà cốt lõi và danh sách 15 điểm cần đồng bộ vào `docs/architecture.md`. Tự kiểm: 134/134 PASS (101 ca cũ + 33 ca mới), 5 đột biến đều bị bắt, link 221 tham chiếu 0 hỏng; các số chưa đo (CPU 50 lô nhỏ, RS256/FCM, trần 5/20, chi phí chỉ mục B-04) vẫn ghi "chưa đo".
