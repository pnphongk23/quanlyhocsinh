# Tiếp quản: kiểm chứng gói D1 + FCM (B2) và freeze candidate r1

Ngày: 2026-10-21 · Người làm: worker tiếp quản (packet `../briefs/13-resume-fcm-verification.md`) · Parent General Lead: `9682fb5f-0e95-45f1-9e40-8dd05a9c931a`, workspace `wks_5d1bc443eaa9f683` · Nguồn quyết định: `docs/spec.md`, `docs/architecture.md`, `../briefs/12-backend-fcm-update.md`, `../briefs/02-docs-fcm.md`.

Tài liệu này **không phải review độc lập** và không kết luận APPROVED. Nó ghi: (a) các lỗi cơ học/mâu thuẫn rõ đã sửa, (b) bằng chứng kiểm tái chạy được, (c) đã kiểm gì so với chưa đo, (d) câu hỏi còn mở cho reviewer. Review độc lập do người khác chạy trên candidate ở mục 7.

## 1. Phạm vi

Đã đọc: `AGENTS.md`, toàn bộ `docs/spec.md`, `docs/architecture.md`, `../lead-brief.md`, `../status.md`, `../briefs/02-docs-fcm.md`, `../briefs/12-backend-fcm-update.md`, `../briefs/13-resume-fcm-verification.md`, `data-model.md`, `api-spec.md`, `authz-matrix.md`, `offline-plan.md`, `stack-and-cpu.md`, `report-b1.md`, `firebase-setup-checklist.md`, `review-r1.md`, `../briefs/02-docs-fcm.report.md`.

Không làm (theo packet): auth/Q1/Q2/Q3/Q8, mã app/backend runtime, prototype, iOS, status/lead-brief/outbox, agent con, commit/push/merge/deploy/secret. Không sửa findings B-01..B-05 của `review-r1.md` (ngoài FCM) — vẫn mở, xem mục 9.

## 2. Rà nhất quán gói FCM với quyết định đã chốt

Các điểm packet yêu cầu kiểm lại và kết quả đối chiếu (`data-model.md` §2.7 ↔ `api-spec.md` §7 ↔ `docs/architecture.md` §4 ↔ `docs/spec.md` §5.3):

| Điểm | Kết quả |
|---|---|
| `notifications.group_key` / `ready_at` / `event_version` | Khớp: nhóm điểm = membership + học sinh + bài; `ready_at` = commit cuối + 5 phút; cron chỉ claim khi `ready_at` tới **và** `event_version` không đổi; retry/noop không dời hạn. DDL có chỉ mục bộ phận `notifications_open_group` để bảo đảm một nhóm mở. |
| `homework.assign` atomic 1..4 phần | Khớp: một lệnh chứa 1..4 phần mới, rollback cả lệnh khi một phần sai, inbox theo `command_id` của lệnh; `homework.section.upsert` sửa phần đã có không tạo push. |
| Device token: `registration_version` / chủ / phiên | Khớp: `device_tokens` có `auth_session_id`, FK `(workspace_id, membership_id, user_id)` xác nhận đúng chủ, `UNIQUE (id, membership_id)`, `token` UNIQUE, `platform ∈ {ios,web}`; DELETE kiểm `registration_version`. |
| Deliveries theo từng thiết bị | Khớp: `push_deliveries` PK `(notification_id, device_id)`, FK `(device_id, membership_id)` chặn thiết bị của membership khác, `registration_version` chụp tại lúc mở rộng; cascade khi xoá device/notification. |
| OAuth cache lease | Khớp: `fcm_oauth_cache` PK `project_id`, `credential_key_id` vô hiệu cache khi xoay key, `refresh_at = min(now+50 phút, expires_at−5 phút)`, lease 60 giây, claim bằng UPDATE có điều kiện. |
| Nội dung push | Khớp: chỉ tiêu đề + mã tham chiếu (`kind`, `notification_id`, `student_id`, `session_id`), không nhận xét/điểm/sao/SĐT. |
| Bốn loại sự kiện | Khớp `CHECK kind` của DDL với bảng sự kiện API: `slip_sent`, `report_published`, `homework_assigned`, `score_updated`. |

### 2.1 Lỗi cơ học đã sửa

| File | Trước | Sau | Lý do |
|---|---|---|---|
| `docs/architecture.md` (bảng rủi ro, dòng iOS PWA) | "app iOS native không vướng các giới hạn này (push APNs chưa chốt)" | "(push qua APNs trong FCM, đã chốt 2026-10-21; chưa kiểm trên máy thật — mục 9)" | Câu cũ còn để APNs "chưa chốt", mâu thuẫn quyết định FCM 2026-10-21 và mục 2/9 cùng file. |
| `authz-matrix.md` T10 | "ngoài push subscription, đổi mật khẩu, đổi vai trò" | "ngoài `PUT/DELETE /device-tokens`, đổi mật khẩu, đổi vai trò" | "push subscription" là thuật ngữ Web Push VAPID đã bị loại; đồng thời §2.1 cho Phụ huynh đăng ký/gỡ device token, nên T10 phải loại trừ đúng endpoint đó, nếu không T10 mâu thuẫn §2.1 và `api-spec.md` §7. |
| `authz-matrix.md` §2.5 hàng `GET /notifications` | "Admin/Giáo viên/Trợ giảng: ✗ (… trả danh sách rỗng)" | "✗ `403 forbidden` (endpoint chỉ dành cho Phụ huynh — `api-spec.md` mục 7)" | Hai tài liệu mô tả hai hành vi khác nhau cho cùng endpoint (rỗng vs 403). Chọn theo `api-spec.md` §7 + quy ước lỗi §0 vì đó là hợp đồng endpoint; đổi ở phía ma trận, không đổi API. |
| `firebase-setup-checklist.md` bước 6 | "public VAPID key ở Cloud Messaging → Web Push certificates" | "public key của cặp khoá Web Push **của Firebase** … (bắt buộc cho FCM web token; đây không phải Web Push VAPID tự gửi đã bị loại)" | Cặp khoá Web Push của Firebase là bắt buộc cho FCM web (brief 12), nhưng câu cũ đọc như thể đang dùng Web Push VAPID tự gửi — nhãn rõ để người đọc không nhầm. |
| `report-b1.md` mục "Kết quả đo" | "Web Push một tin ≈ 0–2 ms" | "… là **phép đo lịch sử B1, đã bỏ khỏi stack và không dùng làm ngân sách FCM**" | Packet yêu cầu phép đo Web Push B1 chỉ giữ dưới nhãn lịch sử; số này không đại diện FCM/RS256. |
| `report-b1.md` mục "Cập nhật B2" | Bằng chứng ở review-b2.md (file không tồn tại trong cây) | Trỏ `check-fcm-ddl.py` + `resume-verification.md`; thêm "DDL hiện có 29 bảng (27 bảng B1 − `push_subscriptions` VAPID cũ + 3 bảng FCM)" | Tham chiếu gãy tới file không có trong cây; con số bảng cũ dễ đọc nhầm là số hiện tại. 29 = 27 − 1 + 3 khớp số đếm thực của script. |

Không sửa `docs/spec.md`: rà lại không thấy mâu thuẫn với quyết định đã chốt (FCM cho cả hai nền tảng, không Firestore, nội dung push tối thiểu, gộp điểm 5 phút, BTVN theo lần giao). Không đổi nghiệp vụ, không thêm interface mới.

## 3. Kiểm DDL SQL trong markdown

Script: `plans/20261021-mvp/backend/check-fcm-ddl.py` (chỉ thư viện chuẩn `argparse`, `hashlib`, `re`, `sqlite3`, `sys`, `traceback`, `pathlib`). Script trích **mọi** khối ```` ```sql ```` của `data-model.md` theo thứ tự tài liệu, nạp vào `sqlite3 :memory:` với `PRAGMA foreign_keys=ON`, rồi chạy các ca kiểm. Dữ liệu giả, không in SĐT/token/khoá/nội dung nhận xét (SĐT giả dạng `+849000000xx`).

Lệnh, exit và kết quả thật:

```
$ python3 plans/20261021-mvp/backend/check-fcm-ddl.py
data_model=plans/20261021-mvp/backend/data-model.md  blocks=11  sha256=c29d26cb1f22bdd64007058515b0ddb47a067e13cc89865151702248444b9f9e
schema_loaded=ok  foreign_keys=1
… (47 dòng PASS)
ket_qua: PASS 47/47
exit=0
```

Các nhóm ca kiểm (đều PASS, tổng 47):

| Nhóm | Ca |
|---|---|
| Schema | 11 khối DDL nạp được; 29 bảng đủ tên mong đợi; DDL không chứa trigger (trigger chỉ mô tả bằng bảng trong tài liệu); `PRAGMA foreign_key_check` rỗng sau toàn bộ ca kiểm |
| FK user/membership | device token mang membership của user khác → bị chặn; `auth_session_id` không tồn tại → bị chặn; notification mang membership/user lệch → bị chặn; `student_id` không tồn tại → bị chặn |
| Token | đăng ký lần đầu OK, `registration_version` mặc định 1; trùng `token` toàn cục → bị chặn; `platform='android'` → bị chặn; token rỗng → bị chặn; hai thiết bị cùng membership OK |
| Notification | 4 `kind` hợp lệ đều nhận, `kind='promo'` → bị chặn; trùng `(membership_id, event_key)` → bị chặn (idempotency); cùng `event_key` cho membership khác được phép (idempotency theo membership) |
| Gộp điểm | một nhóm mở được; bản ghi thứ hai cùng `group_key` khi nhóm còn mở → bị chặn; sau khi đặt `deliveries_expanded_at` thì nhóm mới cùng `group_key` được tạo, đếm đúng 2 dòng, dòng mới nhất còn mở |
| Delivery | một dòng mỗi thiết bị; trùng PK → bị chặn; thiết bị thuộc membership khác → FK chặn; thiết bị không tồn tại → FK chặn; `status` ngoài danh sách → bị chặn; claim lease + ghi kết quả OK |
| Cascade | xoá device → deliveries của nó mất, deliveries của thiết bị khác còn; xoá notification → deliveries của nó mất |
| OAuth cache | tạo dòng rỗng bằng `INSERT OR IGNORE` OK; PK theo `project_id` chặn dòng thứ hai; claim lease bằng UPDATE có điều kiện OK; ghi token khi còn giữ lease OK; `access_token` không bắt buộc |

**Giới hạn của phép kiểm (không được đọc quá):** chỉ kiểm DDL/ràng buộc **khai báo trong markdown**, trên SQLite cục bộ (Python 3.12.10 + SQLite của module `sqlite3`), không phải D1 thật. Trigger (lịch sử, `change_log`, guard vai trò/phụ huynh, `report_publication_immutable`, `section_has_grades`, `tests_max_guard`…) **chưa có SQL và chưa chạy**. Chưa kiểm `worker/src/db`, chưa có mã backend, chưa kiểm runtime API/FCM/cron/lease đồng thời. Thứ tự `CREATE TABLE` trong tài liệu không phải thứ tự áp migration (SQLite chỉ phân giải FK khi DML), nên script chạy hết DDL rồi mới seed. Không suy ra "gói FCM đã hoạt động" từ kết quả này.

### 3.1 Đối chứng âm (chứng minh ca kiểm không rỗng)

Chạy lại cùng script trên **bản sao** `data-model.md` ở `/tmp` đã cố ý phá DDL, để thấy ca kiểm không rỗng và bắt đúng chỗ:

| Bản thử | Sửa có ý | Exit | Kết quả |
|---|---|---|---|
| A | bỏ chỉ mục `notifications_open_group` | 1 | `PASS 45/47`; FAIL đúng 2 ca `diem_nhom_thu_hai_khi_con_mo`, `diem_dem_hai_nhom_da_mo_rong` |
| B | bỏ `UNIQUE` của `device_tokens.token` | 1 | `PASS 46/47`; FAIL đúng ca `device_token_unique_toan_cuc` |
| Gốc | không sửa | 0 | `PASS 47/47` |

Bản sao phá hoại chỉ nằm ở `/tmp`, không sửa nguồn.

## 4. Kiểm link nội bộ và whitespace

```
$ python3 plans/20261021-mvp/backend/check-fcm-ddl.py --links
link_files=10  tham_chieu_file=122  hong=0
PASS  link_noi_bo
exit=0
$ git diff --check
exit=0
```

- `git diff --check` chỉ thấy file **đã track**; `plans/20261021-mvp/` đang untracked nên phần lớn file của packet không nằm trong phạm vi lệnh này. Vì vậy link được kiểm riêng bằng `--links` trên 10 file của packet (2 docs nguồn + 8 file backend, gồm cả tài liệu này): 122 tham chiếu, 0 hỏng. Chế độ này bắt được cả tham chiếu tên file markdown viết trong backtick, và đã bắt đúng lỗi gãy kiểu review-b2.md trước khi sửa.
- Rà nhãn Web Push/APNs: `docs/architecture.md` để "Web Push VAPID tự gửi, Worker gọi APNs trực tiếp" **chỉ trong cột "Loại bỏ"**; `api-spec.md` §7 nói "không còn endpoint Web Push subscription cũ"; `stack-and-cpu.md` §3.2 ghi phép đo Web Push là "lịch sử B1, đã loại khỏi stack"; `report-b1.md` đã gắn nhãn lịch sử; `firebase-setup-checklist.md` chỉ còn cặp khoá Web Push **của Firebase** cho FCM web, kèm câu loại trừ rõ. Không còn chỗ nào nói app tự gửi Web Push VAPID hoặc Worker gọi APNs trực tiếp như lựa chọn hiện hành.

## 5. RS256 và cleanup: bằng chứng bàn giao, không phải do worker này chạy

Ghi lại đúng như packet, **không đo lại, không nhận là số đo của mình**:

- Phiên trước gọi `GET /genkey` trên Worker thử nhận **HTTP 403** ⇒ không lấy được khoá thử, không thu được CPU.
- Cleanup đã thực hiện ở phiên trước: `wrangler delete --name qlh-staging-rs256 --force` → exit 0; `wrangler deployments list --name qlh-staging-rs256` → exit 1, Cloudflare code **10007**, `This Worker does not exist on your account`.
- **Chưa có số đo RS256/import khoá/OAuth trên Worker.** Không dùng số Web Push B1 thay thế. Không gửi FCM thật: chưa có Firebase project/credential/mã tích hợp. Không có service account, không có secret nào được tạo.

## 6. Đã kiểm so với chưa đo

| Hạng mục | Trạng thái |
|---|---|
| Nhất quán hợp đồng FCM giữa 4 tài liệu (mục 2) | **Đã kiểm** bằng đọc đối chiếu từng trường |
| Lỗi cơ học/tham chiếu gãy | **Đã kiểm và đã sửa** 6 chỗ (mục 2.1) |
| DDL 29 bảng + ràng buộc thiết bị/notification/delivery/cache | **Đã kiểm** trên SQLite cục bộ, 47/47 PASS, exit 0 (mục 3) |
| Link markdown nội bộ, `git diff --check` | **Đã kiểm**, exit 0 (mục 4) |
| Trigger SQLite (lịch sử, `change_log`, guard) | **Chưa viết, chưa chạy** — mới mô tả bằng bảng |
| D1 thật, `worker/src/db`, API runtime, cron, lease đồng thời | **Chưa kiểm** — chưa có mã |
| CPU ký RS256/import khoá/cache OAuth trên Worker | **Chưa đo** (403; không có môi trường đo) |
| Gửi FCM đầu cuối iOS/web, thu hồi token, hai thiết bị, chuyển chủ | **Chưa kiểm** — chưa có Firebase project/credential/mã |
| Hành vi push trên iPhone thật (iOS 16.4+, PWA đã cài) | **Chưa kiểm** |

## 7. Candidate đóng băng: `fcm-b2-r1`

Vị trí: `plans/20261021-mvp/backend/candidates/fcm-b2-r1/`. Nội dung là **bản sao** của nguồn tại thời điểm freeze, giữ nguyên đường dẫn tương đối từ gốc repo:

| Đường dẫn trong candidate | Vai trò |
|---|---|
| `docs/spec.md` | nguồn nghiệp vụ (spec) |
| `docs/architecture.md` | nguồn kiến trúc |
| `plans/20261021-mvp/backend/data-model.md` | hợp đồng dữ liệu D1 (kèm DDL được kiểm) |
| `plans/20261021-mvp/backend/api-spec.md` | hợp đồng API/sync/FCM |
| `plans/20261021-mvp/backend/authz-matrix.md` | ma trận quyền + ca test |
| `plans/20261021-mvp/backend/offline-plan.md` | kế hoạch offline |
| `plans/20261021-mvp/backend/stack-and-cpu.md` | stack, số đo, FCM OAuth/cron |
| `plans/20261021-mvp/backend/firebase-setup-checklist.md` | checklist Firebase |
| `plans/20261021-mvp/backend/check-fcm-ddl.py` | script kiểm DDL (bản sao y hệt nguồn) |
| `manifest.sha256` | `sha256  path` cho từng file ở trên, trừ chính nó |

Loại khỏi candidate: `review-r1.md` (review cũ chưa xong, không phải nguồn contract), `report-b1.md` + `../briefs/02-docs-fcm.report.md` (báo cáo), tài liệu này (bằng chứng, nằm ngoài candidate để manifest không tự tham chiếu).

Băm (SHA256, `shasum -a 256`; bảng đầy đủ `sha256  path` trong `manifest.sha256`, 9 file, sắp xếp theo đường dẫn):

**Overall candidate hash (SHA256 của file `manifest.sha256`) = `0936ec365dbfedc22eac53d55aaedbd7df1c82a9836b352bb02192464ad8e706`**

Băm từng file, nguyên văn từ `manifest.sha256` (để reviewer so nhanh, manifest vẫn là nguồn):

```
e9d11e2b38c0eae2b0a953665e6066dd223084b5db63e8c84b1b3a03e5863ab4  docs/architecture.md
35d0b3e296f6193d29e2714ae4b90379fd9d82cc7a94a40548a876111b93b92c  docs/spec.md
fbe481e364579e0bfac967db41a1277eb1d5f773d9f32800d926e44755fb9d7a  plans/20261021-mvp/backend/api-spec.md
cf727b73ac3c5242d9189e19ec1882d765441bf1176865047eb076a3c5fc3eea  plans/20261021-mvp/backend/authz-matrix.md
125367f6b0c32fe7ef2585efd511bd897ae6d263d7079d99ccbf623ffa9b76b8  plans/20261021-mvp/backend/check-fcm-ddl.py
c29d26cb1f22bdd64007058515b0ddb47a067e13cc89865151702248444b9f9e  plans/20261021-mvp/backend/data-model.md
a22d72f4bc0a4296de707c4488f3f01359259a888aade4ab9290e40e80c676be  plans/20261021-mvp/backend/firebase-setup-checklist.md
359ddd0d0304bc328f1422d326ee0963cacccf3b68800f29f8bdfb8e05f6bb39  plans/20261021-mvp/backend/offline-plan.md
03b973d6b2a5a6d1a3280d4c3d9449913e3f30b68d8ef3df8bde3a53fa928446  plans/20261021-mvp/backend/stack-and-cpu.md
```

Quy ước: overall = SHA256 trên byte của `manifest.sha256` (nguồn duy nhất, không phụ thuộc thứ tự ngoài file). Reviewer kiểm bằng: `cd plans/20261021-mvp/backend/candidates/fcm-b2-r1 && shasum -a 256 -c manifest.sha256` rồi `shasum -a 256 manifest.sha256`. Script kiểm DDL chạy lại được trên snapshot: `python3 plans/20261021-mvp/backend/check-fcm-ddl.py --data-model plans/20261021-mvp/backend/candidates/fcm-b2-r1/plans/20261021-mvp/backend/data-model.md` (hoặc `cd` vào candidate và dùng đường dẫn mặc định). Snapshot không chứa secret, credential, service account hay fixture thật.

Sau khi freeze, nguồn **không được sửa**; nếu sửa, phải tạo candidate mới (`fcm-b2-r2`) và tính lại băm.

## 8. Câu hỏi cho reviewer (không tự quyết)

1. **RQ-01 — `event_key` của nhóm điểm.** `data-model.md` §2.7 mô tả `event_key` "điểm theo lệnh thay đổi giá trị", còn nhóm điểm thì UPSERT theo `(membership_id, group_key)`; hai quy tắc này cùng tồn tại nhưng không nói rõ dòng nhóm giữ `event_key` của lệnh đầu hay được cập nhật mỗi lần nhập. Hành vi retry đã rõ (không tạo trùng), nhưng cách ghi nên được chốt khi implement để tránh lệch giữa retry và upsert nhóm.
2. **RQ-02 — "đăng ký không muộn hơn thời điểm sự kiện" dùng mốc nào.** Cron mở rộng inbox chỉ cho token "đăng ký không muộn hơn thời điểm sự kiện" (§2.7), nhưng `device_tokens` có cả `created_at` và `updated_at`, và chuyển chủ làm tăng `registration_version`. Chưa nói rõ mốc so sánh là `created_at` hay lần đăng ký hiện hành; ảnh hưởng ca F06/F03.
3. **RQ-03 — inbox thiếu mã tham chiếu cho báo cáo/điểm.** `api-spec.md` §7 trả `GET /notifications` với `kind, student_id, session_id` cho cả 4 loại, trong khi payload FCM nói "chỉ loại và ID cần mở màn". Với `report_published` và `score_updated` cần `report_id`/`test_id` để mở đúng màn; DDL đã có hai cột này. Đề xuất ngắn: thêm `report_id`, `test_id` (nullable) vào response inbox — thay đổi cộng thêm, không phá vỡ phiên bản API; cần reviewer xác nhận thay vì tôi tự mở rộng hợp đồng.
4. **RQ-04 — `offline-plan.md` nhắc "lưu thao tác quản lý thiết bị để xử lý lúc nối lại"**, nhưng danh mục lệnh `sync/push` (`api-spec.md` §6.2) không có loại lệnh nào cho device token. Hoặc hiểu là hàng đợi phía client (không qua `push`), hoặc cần bổ sung lệnh — chưa chốt.
5. **B-01..B-05 của `review-r1.md` vẫn mở** (ngoài FCM, packet không cho sửa): đặc biệt B-01 (điều kiện `must_change_password` khi cấp lại mật khẩu) và B-02 (ranh giới atomic của lô `sync/push`) chặn implement auth/sync. Q1/Q2/Q3/Q8 và xác nhận mật khẩu tạm vẫn chờ người dùng; packet này không đổi gì trong các phần đó.

## 9. Bằng chứng lệnh (tóm tắt)

| Lệnh | Exit | Kết quả |
|---|---|---|
| `python3 plans/20261021-mvp/backend/check-fcm-ddl.py` | 0 | 11 khối DDL, 29 bảng, 47/47 PASS |
| `python3 … --data-model /tmp/mut-A-data-model.md` | 1 | bỏ chỉ mục nhóm mở → `PASS 45/47`, FAIL đúng 2 ca nhóm điểm |
| `python3 … --data-model /tmp/mut-B-data-model.md` | 1 | bỏ `UNIQUE` token → `PASS 46/47`, FAIL đúng ca token |
| `python3 plans/20261021-mvp/backend/check-fcm-ddl.py --links` | 0 | 122 tham chiếu file trong 10 file packet (4 link markdown + 120 tham chiếu tên file dạng backtick), 0 hỏng |
| `git diff --check` | 0 | không có lỗi whitespace ở file đã track |
| `cd candidates/fcm-b2-r1 && shasum -a 256 -c manifest.sha256` | 0 | 9/9 file OK |
| `cmp` từng file candidate ↔ nguồn | 0 | 9/9 giống từng byte |
| `cd candidates/fcm-b2-r1 && python3 plans/…/check-fcm-ddl.py` | 0 | chạy lại trên bản sao trong candidate: 47/47 PASS (snapshot tự kiểm được) |

Status: DONE_WITH_CONCERNS
Summary: Gói FCM B2 đã được rà nhất quán với quyết định đã chốt, sửa 6 lỗi cơ học/tham chiếu gãy, kiểm DDL 29 bảng bằng script tái chạy được (47/47 PASS) và đóng băng candidate `fcm-b2-r1` kèm manifest SHA256. Lo ngại: trigger/D1/API/FCM runtime và RS256 chưa kiểm được (chưa có mã, chưa có credential; `/genkey` trả 403), còn 4 câu hỏi hợp đồng nhỏ (RQ-01..RQ-04) và B-01..B-05 của review B1 vẫn mở.
