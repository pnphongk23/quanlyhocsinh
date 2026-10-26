# Sửa FCM B2 sau review r1 → candidate r2

Ngày: 2026-10-21 · Worker: Hoàng Cái (packet `../briefs/15-fcm-b2-fix-r1.md`) · Parent: `9682fb5f-0e95-45f1-9e40-8dd05a9c931a`, workspace `wks_5d1bc443eaa9f683` · Nguồn: `../briefs/15-fcm-b2-r1-decisions.md`, `reviews/fcm-b2-r1-correctness.md`, `reviews/fcm-b2-r1-risk.md`, `resume-verification.md`.

Candidate r1 `plans/20261021-mvp/backend/candidates/fcm-b2-r1` (manifest `0936ec365dbfedc22eac53d55aaedbd7df1c82a9836b352bb02192464ad8e706`) **giữ nguyên, không sửa**. Candidate mới: `candidates/fcm-b2-r2` (mục 5). Báo cáo này không phải review và không kết luận APPROVED.

## 1. Findings → xử lý

| Finding | Root cause | Giải quyết | Bằng chứng |
|---|---|---|---|
| **C-01** (correctness) — queue offline cho token có thể để thiết bị đổi chủ/role trước khi server thu hồi | `offline-plan.md` cho phép "lưu thao tác quản lý thiết bị để xử lý lúc nối lại" trong khi thiết bị vẫn nhận push theo phiên cũ (tới 180 ngày) | **Đổi danh tính thành thao tác cần mạng có xác nhận**: `PUT /session/membership` 200 và `POST /auth/logout` 204 ghi membership mới/thu hồi phiên **và** xoá `device_tokens` của đúng `auth_session` đó (cascade deliveries) trong **cùng batch**, trả response sau batch; client chỉ đổi identity/cache/UI sau ack, offline thì giữ identity và báo cần mạng; không đưa vào outbox nghiệp vụ; đổi tài khoản thu hồi phiên/đăng ký cũ trước. | `api-spec.md` §4 (logout, `PUT /session/membership`), §7 "Vòng đời đăng ký và đổi danh tính"; `data-model.md` §2.7 + §4 batch; `offline-plan.md`; `docs/spec.md` §5.3; `docs/architecture.md` §4/§5. Kiểm SQL: `doi_vai_tro_go_token_dung_phien`, `doi_vai_tro_go_delivery_cua_token_do`, `doi_vai_tro_khong_dung_phien_khac`, `dang_xuat_go_token_cua_phien`, `dang_xuat_khong_go_phien_khac`. |
| **R-01** (risk) — sender không yêu cầu token khớp membership hiện hành của phiên | Sender chỉ kiểm "phiên còn hiệu lực" và "membership còn active", không so chúng với binding của token | Sender đối chiếu `auth_sessions.user_id`/`membership_id` **khớp** `device_tokens.user_id`/`membership_id`, cộng phiên chưa thu hồi/chưa hết hạn, rồi mới kiểm quyền/version; lệch ⇒ `skipped`. Thêm `bound_at` + quy tắc `registration_version` chỉ bump khi **đổi binding**; làm mới cùng binding không bump ⇒ không mất job đang chạy. | `data-model.md` §2.7 (device_tokens: `bound_at`, hai loại upsert; sender), `api-spec.md` §7; kiểm: `chi_muc_fanout_membership_id`, `refresh_cung_binding_khong_bump_version`, `sender_chap_nhan_token_khop_phien`, `sender_tu_choi_token_lech_danh_tinh`, `sender_tu_choi_phien_da_thu_hoi`. |
| **R-02** (risk) — fanout chưa bound inbox/thiết bị mỗi invocation | Chỉ có "chia lô" và trần 5 delivery gửi, không trần số hàng mở rộng | **Fanout hai pha**: freeze (`expansion_started_at` đặt đúng một lần, lease 60 giây) rồi keyset paging `ORDER BY device_tokens.id` với `delivery_cursor` lưu D1; trần **5 inbox + 20 đăng ký/invocation**, không nạp cả inbox vào RAM; chỉ đặt `deliveries_expanded_at` khi xét hết; freeze làm nhóm điểm đóng nên nhập mới tạo nhóm mới, không kéo `ready_at`/cursor/`event_version` của job đang chạy. | `data-model.md` §2.7 (cột + chỉ mục + narrative), `api-spec.md` §7 "Mở rộng inbox và trần fanout", `stack-and-cpu.md` §9, `docs/architecture.md` §4/§7. Kiểm: `notif_co_cot_fanout`, `diem_freeze_*` (7 ca), `fanout_*` (9 ca). |

Phụ thuộc trực tiếp đã chốt kèm: RQ-01 (`event_key` của nhóm điểm) — nhóm chỉ UPSERT khi `expansion_started_at IS NULL`, dòng đã freeze giữ `event_key`/`event_version` gốc; RQ-02 (mốc xét đăng ký) — dùng `bound_at <= notifications.created_at`, không dùng `created_at`/`updated_at` của token. RQ-04 (không có lệnh sync cho device token) giải quyết bằng chính C-01 (không có outbox cho thiết bị). RQ-03 (inbox thiếu `report_id`/`test_id`) **không** phụ thuộc hai nhóm này → giữ mở, không tự mở rộng hợp đồng.

## 2. File đã sửa (trong write-set)

| File | Thay đổi |
|---|---|
| `docs/spec.md` | Hàng Thông báo: đổi vai trò/đăng xuất/đổi tài khoản cần mạng + ack thu hồi đăng ký; push đã hiện trước ack không thu hồi từ xa. Hàng Offline: thêm 3 thao tác vào "Cần có mạng". |
| `docs/architecture.md` | §4 push: lifecycle binding/`bound_at`/version, ack trước khi đổi danh tính, sender khớp danh tính, caveat in-flight; fanout hai pha + trần 5/20 (chưa đo). §5 Cần mạng: thêm đổi vai trò/đăng xuất/đổi tài khoản. §7 rủi ro FCM: trần fanout + giới hạn in-flight. |
| `data-model.md` | `notifications`: `expansion_started_at`, `delivery_cursor`, `expansion_lease_id`, `expansion_lease_until`; `notifications_open_group` đổi sang `expansion_started_at IS NULL`; `device_tokens`: `bound_at`, `device_tokens_member(membership_id, id)`; narrative lifecycle/sender/fanout; §4 batch: đổi vai trò, đăng xuất, đăng ký/làm mới token. |
| `api-spec.md` | §4 logout + `PUT /session/membership` (batch, `device_registration_cleared`, cần mạng); §7 hai loại upsert token + `bound_at` trong response; mục mới "Vòng đời đăng ký và đổi danh tính" và "Mở rộng inbox và trần fanout"; caveat in-flight. |
| `authz-matrix.md` | Hàng §2.1 đổi vai trò/đăng xuất (chỉ gỡ đăng ký của phiên mình); F11 cập nhật freeze; thêm F13–F17 (r2) và ghi rõ đây là ca bắt buộc, chưa phải bằng chứng runtime. |
| `offline-plan.md` | Bỏ "lưu thao tác quản lý thiết bị trong outbox"; thay bằng rule cần mạng + ack, thứ tự đổi danh tính, refresh cùng binding, caveat in-flight. |
| `stack-and-cpu.md` | §9 gửi lô: trần 5 inbox/20 đăng ký mỗi invocation, keyset cursor, freeze, tiếp tục ở cron sau; 5/20 **chưa đo**. |
| `firebase-setup-checklist.md` | Bước 9: kiểm thêm đổi vai trò/đăng xuất phải chờ ack; push đã hiện không thu hồi từ xa. |
| `report-b1.md` | Mục mới "Vòng sửa r2 sau review FCM r1" (mapping C-01/R-01/R-02, r1 giữ nguyên). |
| `backend/check-fcm-ddl.py` | Thêm kiểm cột/state/index mới, batch lifecycle, sender khớp danh tính, fanout hai pha trên SQL; docstring nêu rõ giới hạn. |

Không sửa: `../status.md`, brief, `backend/reviews/*`, `resume-verification.md`, snapshot r1, prototype/iOS, auth business đang CHỜ.

## 3. Bằng chứng chạy được

```
$ python3 plans/20261021-mvp/backend/check-fcm-ddl.py
data_model=plans/20261021-mvp/backend/data-model.md  blocks=11  sha256=0258c0d6eec3aac4c461fb963ba11936e9e95dfa0c018b85384458df6fd15ce8
schema_loaded=ok  foreign_keys=1
... 78 dòng PASS ...
ket_qua: PASS 78/78
exit=0
```

| Nhóm ca (mới của r2) | Nội dung |
|---|---|
| Cột/state/index | `notifications` có 4 cột fanout; `device_tokens.bound_at`; chỉ mục `device_tokens_member` = `(membership_id, id)`; `bound_at` NOT NULL bị CHECK (thiếu ⇒ reject) |
| Freeze nhóm điểm (7 ca) | nhóm mở chặn dòng thứ hai; UPSERT trước freeze giữ 1 dòng và tăng `event_version`; `deliveries_expanded_at` một mình **không** mở lại nhóm (chỉ `expansion_started_at` mới là mốc freeze); freeze lần hai không đổi gì; nhập mới sau freeze tạo dòng mới, `event_version`/`ready_at` của dòng cũ **không đổi** |
| Lifecycle (9 ca) | refresh cùng binding không bump `registration_version`/`bound_at`; batch đổi vai trò xoá token + delivery của đúng phiên, phiên khác còn; logout xoá token phiên đó, phiên khác còn; sender chấp nhận token khớp danh tính, từ chối token lệch (session của giáo viên) và phiên đã thu hồi |
| Fanout (9 ca) | 1 inbox/25 đăng ký: invocation 1 xét 20 (chưa đánh dấu xong), invocation 2 xét 5 → 25 delivery, 25 device distinct, đánh dấu xong; crash giữa chừng (cursor ghi, lease hết hạn) → invocation sau tiếp tục từ cursor, không trùng PK, không sót; 6 inbox → invocation 1 xử lý 5, inbox thứ 6 lượt sau; 5 đăng ký (1 hợp lệ, 1 refresh cùng binding, 1 chuyển chủ sau sự kiện, 1 phiên thu hồi, 1 lệch danh tính) → chỉ 2 delivery, không gửi push lịch sử cho thiết bị chuyển chủ |

Đối chứng âm (chứng minh ca kiểm không rỗng) — sửa **bản sao** ở `/tmp`, không sửa nguồn:

| Bản thử | Sửa có ý | Exit | Kết quả |
|---|---|---|---|
| M1 | `notifications_open_group` quay về `deliveries_expanded_at IS NULL` | 1 | 5 FAIL: UPSERT không khớp chỉ mục, freeze không đóng nhóm, nhập mới bị kéo vào nhóm cũ |
| M2 | `bound_at TEXT NOT NULL` → `TEXT` | 1 | FAIL `device_thieu_bound_at` |
| M3 | chỉ mục fanout mất cột `id` | 1 | FAIL `chi_muc_fanout_membership_id` |
| Gốc | không sửa | 0 | PASS 78/78 |

Link/whitespace: `--links` (11 file packet, 0 hỏng), `git diff --check` exit 0 — xem mục 4.

## 4. Giới hạn kiểm (không được đọc quá)

- Fanout/lifecycle là **mô phỏng SQL tuần tự** trên SQLite theo prose của tài liệu, **không phải** test API/FCM/cron concurrent thật. Không có D1, không có Worker, không có mã backend, không có trigger.
- Trần **5 inbox / 20 đăng ký / 5 delivery / 2 kết nối** là ngân sách đề xuất, **chưa đo**; không suy ra đạt CPU 10 ms.
- RS256/OAuth cache/CPU FCM vẫn **chưa đo** (không đo lại; giữ nhãn chưa kiểm chứng).
- Không gửi FCM đầu cuối, không có Firebase project/credential.
- Caveat in-flight là **giới hạn thật của FCM/OS**, không phải lỗi cần sửa: máy chủ không thu hồi được thông báo đã hiện; hợp đồng yêu cầu client xoá notification và chỉ tải dữ liệu qua API có phân quyền.

## 5. Candidate r2

Vị trí: `plans/20261021-mvp/backend/candidates/fcm-b2-r2/`, cùng cấu trúc 9 nguồn như r1 (mirror đường dẫn repo) + `manifest.sha256`:

```
docs/spec.md
docs/architecture.md
plans/20261021-mvp/backend/{data-model,api-spec,authz-matrix,offline-plan,stack-and-cpu,firebase-setup-checklist}.md
plans/20261021-mvp/backend/check-fcm-ddl.py
```

Quy ước băm như r1: `manifest.sha256` chứa `sha256  path` sắp theo đường dẫn; **overall = SHA256 của file `manifest.sha256`**.

**Overall candidate r2 = `589d9769c6b76688c20d3a4ac8939f6ab182e86a4c91748dd4431bc0954531c4`**

Kiểm lại: `cd candidates/fcm-b2-r2 && shasum -a 256 -c manifest.sha256 && shasum -a 256 manifest.sha256`; script chạy được trên snapshot: `python3 plans/20261021-mvp/backend/check-fcm-ddl.py --data-model plans/20261021-mvp/backend/candidates/fcm-b2-r2/plans/20261021-mvp/backend/data-model.md`. Không có secret/credential/fixture thật trong snapshot.

## 6. Tồn đọng (không tự quyết)

1. **RQ-03** — inbox `GET /notifications` chưa trả `report_id`/`test_id` cho `report_published`/`score_updated` (DDL đã có cột). Không phụ thuộc hai nhóm finding này; giữ mở, đã nêu từ r1.
2. B-01..B-05 của `review-r1.md` (ngoài FCM) vẫn mở.
3. Chưa có mã runtime để kiểm F13–F17; các ca đó là ca bắt buộc, không phải bằng chứng.
4. Q1/Q2/Q3/Q8 và xác nhận mật khẩu tạm vẫn CHỜ người dùng; packet này không đổi nghiệp vụ auth.

Status: DONE_WITH_CONCERNS
Summary: Đã sửa C-01/R-01 (vòng đời token: đổi danh tính cần mạng + ack, batch gỡ đúng phiên, sender khớp danh tính, `bound_at`/version theo binding) và R-02 (fanout hai pha, freeze nhóm điểm, keyset cursor, trần 5 inbox/20 đăng ký) nhất quán qua docs, DDL, API, offline, CPU budget; script kiểm DDL + mô phỏng SQL đạt 78/78, ba đột biến đều bị bắt. Lo ngại: 5/20, RS256 và fanout concurrent thật chưa đo/kiểm; RQ-03 và B-01..B-05 còn mở.
