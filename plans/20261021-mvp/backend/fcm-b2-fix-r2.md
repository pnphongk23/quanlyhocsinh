# Sửa FCM B2 sau review r2 → candidate r3 (vòng cuối)

Ngày: 2026-10-21 · Worker: Hoàng Cái (packet `../briefs/17-fcm-b2-fix-r2.md`) · Parent: `9682fb5f-0e95-45f1-9e40-8dd05a9c931a`, workspace `wks_5d1bc443eaa9f683` · Nguồn: `reviews/fcm-b2-r2-correctness.md`, `reviews/fcm-b2-r2-risk.md`, `fcm-b2-fix-r1.md`, `resume-verification.md`.

Snapshot r1 (`candidates/fcm-b2-r1`, manifest `0936ec36…e706`) và r2 (`candidates/fcm-b2-r2`, manifest `589d9769…31c4`) **giữ nguyên**. Candidate mới: `candidates/fcm-b2-r3` (mục 5). Báo cáo không phải review, không kết luận APPROVED.

## 1. Findings → xử lý

| Finding | Root cause | Giải quyết | Evidence |
|---|---|---|---|
| **C2-01** — `FANOUT_PAGE_SQL` lọc phiên/membership trước `LIMIT`, ngân sách chỉ cộng `len(page)` sau lọc | Predicate điều kiện nằm trong `WHERE` nên đăng ký bị skip không chiếm trần 20; cursor nhảy qua chúng; trang toàn skip bị coi là "cạn" | **Phân trang trước, lọc sau:** trang lấy **toàn bộ** `device_tokens` của `workspace_id + membership_id + id > :cursor` (`ORDER BY id LIMIT :còn_lại`, chỉ mục `device_tokens_member`); cờ `eligible` tính trong projection bằng `CASE` trên `LEFT JOIN` (session/user/membership/bound_at), **không** có predicate điều kiện trong `WHERE`. Mọi dòng lấy được cộng vào trần 20 kể cả bị skip; cursor = id dòng cuối **đã xét**; chỉ `deliveries_expanded_at` khi trang trả 0 hoặc `< LIMIT`. | `data-model.md` §2.7, `api-spec.md` §7, `stack-and-cpu.md` §9. Checks: `fanout_skip_van_chiem_ngan_sach_20`, `fanout_cursor_di_qua_dong_bi_skip`, `fanout_trang_day_toan_skip_khong_danh_dau_xong`, `fanout_luot_sau_xet_not_va_gui_dung_khong_sot`, `fanout_ngan_sach_tinh_ca_dong_bi_skip` (5 dòng/2 đủ điều kiện ⇒ ngân sách = 5, không 2). |
| **R2-01** — claim/freeze không CAS `event_version`, không kiểm lại `ready_at` tại `UPDATE` | `UPDATE` mẫu chỉ kiểm `deliveries_expanded_at IS NULL` + lease ⇒ điểm nhập xen giữa đọc/claim vẫn freeze sớm, trái gộp 5 phút | **Initial claim CAS:** `… SET expansion_started_at, lease … WHERE id = ? AND deliveries_expanded_at IS NULL AND expansion_started_at IS NULL AND ready_at <= :now AND event_version = :version_vừa_đọc`; 0 dòng ⇒ bỏ qua, **không** freeze. Nhánh **reclaim** riêng (chỉ dòng đã freeze, lease hết) cũng đòi `ready_at <= :now`, không ghi `expansion_started_at`. Điểm mới sau freeze UPSERT vào nhóm khác (chỉ mục `notifications_open_group` loại dòng đã freeze). | `data-model.md` §2.7, `api-spec.md` §7, `authz-matrix.md` F18. Checks: `score_chen_giua_tang_version_va_doi_han`, `claim_cu_sau_khi_doi_han_tra_0_dong`, `claim_dung_version_nhung_chua_toi_han_cung_tra_0_dong`, `claim_khi_toi_han_va_dung_version_thanh_cong`, `nhap_diem_sau_freeze_khong_dong_toi_dong_frozen`, `reclaim_tu_choi_dong_chua_freeze`, `reclaim_tu_choi_dong_chua_toi_han`. |
| **R2-02** — sender không kiểm membership **còn active** ngay trước mỗi lần gửi | Predicate chỉ có "phiên còn hạn + membership khớp"; membership/user bị vô hiệu sau fanout vẫn có delivery chờ | **Sender check đầy đủ trước từng delivery:** `users.status='active'` **và** `memberships.status='active'` tại thời điểm gửi, phiên chưa thu hồi/hết hạn, `session.user_id/membership_id` khớp token, `delivery.registration_version = device.registration_version`, quyền nhóm hiện hành qua `role_permissions`, liên kết con qua `guardian_student`; sai ⇒ `skipped`, không gọi FCM. SQL mô phỏng (`SENDER_OK_SQL`) phản ánh đúng các điều kiện này, không chỉ diễn văn. | `data-model.md` §2.7, `api-spec.md` §7, `authz-matrix.md` F19. Checks: `sender_hop_le_khi_user_va_membership_active`, `sender_skip_khi_membership_bi_vo_hieu_sau_fanout`, `sender_skip_khi_user_bi_vo_hieu`, `sender_skip_khi_mat_quyen_nhom`, `sender_hop_le_lai_sau_khi_phuc_hoi_quyen`. |
| **R2-03** — `UPDATE` gán `expansion_started_at = now` mỗi claim; cursor/complete không buộc lease hiện hành | Reclaim đổi mốc freeze; không có guard nên owner cũ sau takeover vẫn chèn delivery/đẩy cursor | `expansion_started_at` chỉ ghi ở nhánh initial (`COALESCE`/`expansion_started_at IS NULL`), reclaim **giữ nguyên** mốc; xác nhận `expansion_lease_id` trước khi dùng dòng; delivery chèn bằng `INSERT … SELECT … WHERE EXISTS (… expansion_lease_id = :lease)`, cursor và complete chỉ `WHERE expansion_lease_id = :lease` (complete thêm `AND delivery_cursor = :cursor_mới`), tất cả trong một batch. Không bulk INSERT không guard rồi CAS cursor. | `data-model.md` §2.7, `api-spec.md` §7, `stack-and-cpu.md` §9, `authz-matrix.md` F16. Checks: `claim_lan_dau_la_initial`, `takeover_la_reclaim`, `takeover_giu_nguyen_moc_freeze`, `owner_cu_sau_takeover_khong_ghi_duoc` (rows = 0,0,0), `complete_chi_khi_dung_lease_va_cursor`, `takeover_hoan_tat_dung_mot_lan_khong_trung_pk`. |

Không thêm bảng/dịch vụ/state/pipeline mới: chỉ dùng cột đã có từ r2 và predicate/query.

## 2. File đã sửa

`data-model.md` (§2.7: claim CAS initial/reclaim, paging trước–lọc sau, lease guard cho mọi ghi, sender active), `api-spec.md` §7, `authz-matrix.md` (F15/F16 viết lại, thêm F18/F19), `stack-and-cpu.md` §9, `backend/check-fcm-ddl.py` (page SQL + claim/reclaim/CAS + sender SQL + 4 nhóm scenario mới).

Không sửa (không mâu thuẫn trực tiếp 4 fix): `docs/spec.md`, `docs/architecture.md`, `offline-plan.md`, `firebase-setup-checklist.md`, `report-b1.md`, `review-*`, snapshot r1/r2, status/brief.

## 3. Bằng chứng chạy được

```
$ python3 plans/20261021-mvp/backend/check-fcm-ddl.py
schema_loaded=ok  foreign_keys=1
... 101 dòng PASS ...
ket_qua: PASS 101/101
exit=0
```

Scenario mới (4 nhóm, 26 ca):

| Nhóm | Nội dung | Kết quả |
|---|---|---|
| Budget-skipped (C2-01) | 25 đăng ký, 20 đầu bị thu hồi phiên: invocation 1 xét **20**, 0 delivery, cursor `dev_b19`, **chưa** done; invocation 2 xét 5, gửi đúng `dev_b20..b24`; 5 đăng ký/2 đủ điều kiện ⇒ ngân sách 5; 6 inbox ⇒ 5 + 1 | PASS |
| Stale claim (R2-01) | đọc candidate (`event_version=1`, ready 03:20) → score commit dời ready 03:25, version 2 → claim version 1 ⇒ 0 dòng, freeze NULL; claim version 2 nhưng chưa tới hạn ⇒ 0 dòng; tới hạn + đúng version ⇒ initial thành công (freeze = 03:25); nhập mới sau freeze tạo nhóm khác, dòng cũ không đổi | PASS |
| Disable-after-fanout (R2-02) | fanout xong → disable membership ⇒ sender false; enable + disable user ⇒ false; mất `role_permissions` ⇒ false; phục hồi ⇒ true | PASS |
| Reclaim/freeze-once (R2-03) | claim lần 1 tại T1 (20 đăng ký, cursor `dev_c19`, crash, lease hết) → takeover T2 là `reclaim`, freeze vẫn **T1**; owner cũ: insert 0 dòng, cursor 0 dòng, complete 0 dòng; owner mới xét 5 còn lại, complete đúng 1 lần, 25 delivery/25 device distinct | PASS |

Đối chứng âm (bản sao script ở `/tmp`, **không** sửa nguồn):

| Bản thử | Phá gì | Exit | Fail |
|---|---|---|---|
| S1 (C2-01) | đưa predicate điều kiện vào `WHERE` trước `LIMIT` (đúng lỗi r2) | 1 | 5 ca: `fanout_skip_van_chiem_ngan_sach_20` (xét 5, delivery 5), `fanout_cursor_di_qua_dong_bi_skip` (cursor `dev_b24`), `fanout_trang_day_toan_skip_khong_danh_dau_xong`, `fanout_luot_sau_xet_not_va_gui_dung_khong_sot`, `fanout_ngan_sach_tinh_ca_dong_bi_skip` (xét 2) |
| S2 (R2-01) | bỏ `ready_at`/`event_version` khỏi claim CAS | 1 | `claim_cu_sau_khi_doi_han_tra_0_dong`, `claim_khi_toi_han_va_dung_version_thanh_cong` |
| S3 (R2-02) | bỏ `users/memberships.status='active'` khỏi sender | 1 | `sender_skip_khi_membership_bi_vo_hieu_sau_fanout`, `sender_skip_khi_user_bi_vo_hieu` |
| S4 (R2-03) | reclaim ghi đè `expansion_started_at` | 1 | `takeover_giu_nguyen_moc_freeze` |
| S5 (R2-03) | bỏ lease `EXISTS` khi chèn delivery | 1 | `owner_cu_sau_takeover_khong_ghi_duoc` (rows = 1,0,0) |

## 4. Giới hạn (không được đọc quá)

- Fanout/lifecycle là **mô phỏng SQL tuần tự** trên SQLite theo câu SQL trong tài liệu; **không** phải test API/FCM/cron concurrent thật, không có D1/Worker/trigger, không có mã backend.
- Xen giữa select→claim, takeover và disable được mô phỏng bằng thao tác tuần tự; không chứng minh được race thật.
- Trần 5 inbox / 20 đăng ký / 5 delivery / 2 kết nối là ngân sách đề xuất, **chưa đo**; RS256/CPU FCM **chưa đo**; chưa gửi FCM đầu cuối.
- F13–F19 vẫn là ca bắt buộc khi có mã.

## 5. Candidate r3

`plans/20261021-mvp/backend/candidates/fcm-b2-r3/` — 9 nguồn như r2 (mirror đường dẫn repo) + `manifest.sha256`:

```
docs/spec.md
docs/architecture.md
plans/20261021-mvp/backend/{data-model,api-spec,authz-matrix,offline-plan,stack-and-cpu,firebase-setup-checklist}.md
plans/20261021-mvp/backend/check-fcm-ddl.py
```

**Overall candidate r3 = SHA256(manifest.sha256) = `9621026a28fdc9a545222f11bd255fbdcdd34df8482636996823920365e2eaa7`**

Kiểm: `cd candidates/fcm-b2-r3 && shasum -a 256 -c manifest.sha256 && shasum -a 256 manifest.sha256`; script chạy được trên snapshot qua `--data-model plans/20261021-mvp/backend/candidates/fcm-b2-r3/plans/20261021-mvp/backend/data-model.md`. Không có secret/credential/fixture thật.

## 6. Tồn đọng

1. RQ-03 (inbox thiếu `report_id`/`test_id`) vẫn mở — không phụ thuộc 4 fix này.
2. B-01..B-05 (`review-r1.md`, ngoài FCM) vẫn mở.
3. Q1/Q2/Q3/Q8 và mật khẩu tạm vẫn CHỜ người dùng; không đổi nghiệp vụ auth.
4. Chưa có mã Worker/FCM để chạy F13–F19 thật.

Status: DONE_WITH_CONCERNS
Summary: Đã sửa đủ 4 findings r2 (phân trang trước lọc sau với ngân sách tính cả dòng bị skip, claim CAS theo event_version+ready_at với nhánh reclaim giữ mốc freeze, sender kiểm user/membership active trước từng delivery, mọi ghi buộc lease hiện hành) và kiểm bằng script 101/101 cùng 5 đột biến đều bị bắt. Lo ngại: mới là mô phỏng SQL tuần tự — chưa có D1/Worker/FCM/cron concurrent thật, 5/20 và RS256 chưa đo; RQ-03 cùng B-01..B-05 còn mở.
