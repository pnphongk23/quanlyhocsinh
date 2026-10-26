# B-7: đồng bộ "lệnh tới máy chủ sau cùng thắng" (bỏ xung đột)

Ngày: 2026-10-22 · Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh `mvp-backend`) · Commit `70c9392 fix(worker): let the last sync command win instead of recording conflicts` + `7a108f9 fix(worker): apply sync object commands with a stale base_version` · Chỉ staging (`qlh-staging-api`, D1 `qlh-staging-db`); không production, không migration mới, không đổi `ALLOWED_ORIGINS`.

## 1. Quy tắc đã làm theo

Chốt 2026-10-21 (`docs/spec.md` 5.3, `docs/architecture.md` 5): hai thiết bị sửa cùng một ô thì thay đổi **tới máy chủ sau cùng** được áp dụng và thắng; không giữ hai giá trị, không có bước giáo viên chọn; thứ tự theo lúc máy chủ nhận/ghi lệnh, không theo giờ thiết bị. Lead đã làm rõ thêm (vòng 2): quy tắc áp cho **mọi lệnh đồng bộ** có `base_version`, kể cả lệnh đối tượng (`test.update/delete`, `homework.section.upsert/delete`), không chỉ 4 loại "ô".

## 2. Mã đã sửa

`worker/src/db/sync.ts`
- `cellPlan` (4 loại ô: `attendance.set`, `score.set`, `slip.set`, `homework.grade.set`): bỏ hẳn nhánh `base_version` cũ ⇒ `conflict`. Lệnh có `B < V` và giá trị khác bản hiện tại được áp dụng như mọi lệnh, `version = V + 1`, vẫn qua CAS `WHERE version = :bản_đọc_được` nên ghi theo thứ tự máy chủ nhận. Không còn `INSERT INTO sync_conflicts`, không còn `conflict_id`/`server` trong phản hồi.
- Giữ `noop` khi giá trị trùng bản hiện tại (bất kể `B`): không ghi dữ liệu, không sinh `change_log`/lịch sử/thông báo, trả `applied` + `noop: true` + `version` không đổi. Đây là tối ưu, không phải nhánh xung đột.
- Giữ nguyên các `rejected` nghiệp vụ: quyền (`forbidden`), `not_found` (ô chưa có mà `B > 0`, bài đã lưu trữ, ngoài phạm vi), `base_version_ahead`, `session_not_started`, `student_not_enrolled_on_date`, `invalid_late_at`, `session_cancelled`, `score_above_max`, `max_below_score`, `section_has_grades`, `stars_required`, `invalid_section`/`duplicate_kind`, `command_expired`.
- Bỏ ghi/đọc `sync_conflicts` trong `initialState` và `evict`.
- `version()` (dùng cho các lệnh đối tượng `test.update`, `test.delete`, `homework.section.upsert` khi sửa, `homework.section.delete`): bỏ `throw ApiError(409,'version_conflict')` khi `B ≠ V`; giờ chỉ từ chối `B > V` (`rejected` `validation_error` `base_version_ahead`), còn `B` cũ vẫn `applied` và `version` tăng từ bản máy chủ đang giữ (CAS `WHERE version = :bản_đọc_được`), nên lệnh tới sau thắng như các ô. Xoá luôn `publicRow` (chỉ phục vụ payload `server` của `version_conflict`).
- `conflict.resolve`: không còn xử lý; trả `rejected` `validation_error` `details.reason = "conflicts_not_used"`. Loại lệnh vẫn nằm trong danh mục hợp lệ để một lệnh cũ còn trong hàng đợi chỉ bị từ chối riêng nó, **không** làm hỏng cả lô bằng lỗi cấu trúc 422.
- Không đổi `migrations/`: bảng `sync_conflicts` và `CHECK status IN ('applied','conflict','rejected')` của `applied_commands` giữ nguyên, chỉ đánh dấu không dùng trong docs.

`worker/src/db/sync-read.ts`
- Bỏ thực thể `conflict` khỏi `snapshot`/`snapshot/:entity`/`pull` (không còn `allowed`, `visibility`, `decode`, bộ lọc `l.entity <> 'conflict'` và subquery `sync_conflicts`). Hệ quả: danh sách `entities` của `/sync/snapshot` không còn `"conflict"`, `GET /sync/snapshot/conflict` trả 404, `pull` không bao giờ trả `upserts.conflict`. Bảng để nguyên trong D1.

Các ràng buộc nghiệp vụ vẫn là `rejected` (không đổi, brief yêu cầu giữ):
- `test.delete` đã có điểm ⇒ `archived` chứ không xoá (không mất điểm/history); `test.create` trùng `id` ⇒ lỗi ràng buộc ⇒ `rejected`, không tạo bản ghi thứ hai.
- `homework.assign` với phần đã tồn tại ⇒ `conflict section_exists`; `homework.section.delete` khi đã có điểm ⇒ `section_has_grades`; `test.update` hạ `max` dưới điểm cao nhất ⇒ trigger `max_below_score`; `score.set` vào bài đã lưu trữ ⇒ `not_found`; `slip.set` đặt `stars = null` sau khi phiếu đã gửi ⇒ `stars_required`. Đều là `rejected`, không ghi gì.
- `attendance.set` trên buổi đã hủy ⇒ `rejected session_cancelled` (brief nêu rõ đây vẫn là `rejected`).
- Đối tượng không tồn tại ⇒ `not_found` (ví dụ `test.update` với `id` lạ, `homework.section.upsert` khi `B ≠ 0` mà phần chưa có).
- `PATCH` REST (`classes`, `students`) **không đụng**: vẫn `409 version_conflict` khi client gửi `base_version` cũ, đúng như `api-spec.md` mục 1 quy định cho đường online.

## 3. Test

Viết test trước, chạy đỏ rồi mới sửa mã (bằng chứng: `Tests 4 failed | 14 passed (18)` ở `tests/sync.test.ts`, gồm `expected [ 'applied', 'conflict' ] to deeply equal [ 'applied', 'applied' ]`).

`worker/tests/sync.test.ts`
- `applies a stale base_version instead of storing a conflict and still writes history`: `applied` v1 → gửi lại giá trị giống ⇒ `applied/noop` v1 → lệnh `B = 0` khác giá trị ⇒ `applied` v2, ô = 12, `score_history` đúng một dòng `10 → 12`, `sync_conflicts` = 0, `conflict.resolve` ⇒ `rejected conflicts_not_used`.
- `lets the later arrival win for every cell type and never records conflicts`: đủ 4 loại ô, lệnh thứ hai mang `base_version = 0`, cả hai `applied` (v1 → v2), ô mang giá trị lệnh sau, không có dòng `sync_conflicts`.
- `orders two devices by server arrival and pulls one final value, with duplicate UUIDs applied once`: hai thứ tự đến khác nhau (A→B và B→A) trên hai ô; ở thứ tự thứ hai lệnh **tới sau** mang `created_at` **cũ hơn** vẫn thắng (chứng minh thứ tự theo máy chủ, không theo giờ thiết bị); `pull` của Admin và của Giáo viên thấy **cùng** giá trị cuối `[S1=11 v2, S2=9 v2]`; gửi lại đúng UUID ⇒ `duplicate`/`original_status: applied`, `score_history` vẫn 1 dòng, `sync_conflicts` = 0.
- `applies two parallel writes to one cell in arrival order without losing either`: hai `push` song song cùng ô, `base_version` 1 ⇒ cả hai `applied` (CAS thua thì đọc lại và áp ở vòng sau), `version` cuối = 3, đủ 2 dòng lịch sử.

`worker/tests/attendance.test.ts`: ca `base_version` cũ đổi từ `conflict` + `server` sang `applied` v3, ô = `absent`, và danh sách trạng thái điểm danh cập nhật theo (không còn `excused` sau khi bị ghi đè).

Vòng 2 (lệnh đối tượng) — test viết trước, chạy đỏ (`Tests 2 failed | 17 passed (19)`, cả hai lỗi `expected { …(3) } to match object { status: 'applied', version: 3 }`) rồi mới sửa `version()`:
- `applies object commands with a stale base_version and keeps business rejections`: `homework.section.upsert` `title = First` `B = 1` ⇒ `applied` v2, rồi thiết bị khác `title = Later` **cùng `B = 1`** ⇒ `applied` v3, DB `title = Later`, `version = 3`; `B = 9` ⇒ `rejected base_version_ahead`; sau khi có điểm, `homework.section.delete` `B = 1` (cũ) ⇒ `rejected section_has_grades`; `test.update` với `id` lạ ⇒ `not_found`.
- `updates/deletes tests, ...` (sửa ca cũ): `test.update` `B = 1` khi bài đang v3 ⇒ `applied` v3 với `name = "Updated again"` (trước đây là `version_conflict`), `B = 9` ⇒ `rejected base_version_ahead`; giữ nguyên các ca `max_below_score`, `score_above_max`, và `test.delete` `B = 2` (cũ so với v3) vẫn `archived`.

Kết quả cuối: `npm run typecheck` PASS · `npm test` **23 file / 101 test PASS**.

## 4. Docs đã sửa (thư mục chính, chỉ các file brief cho phép)

- `plans/20261021-mvp/backend/api-spec.md` — danh sách mục đã đổi, chính xác:
  1. **Mục 1, gạch đầu dòng "Sửa online bằng `PATCH`"** (dòng ~20): nói rõ `409 version_conflict` là quy tắc của `PATCH` REST khi client gửi `base_version`; lệnh đồng bộ thì tới sau thắng (trỏ 6.1).
  2. **Mục 1, bảng mã lỗi, dòng `409 version_conflict`** (dòng ~39): đổi mô tả thành "chỉ trên `PATCH` REST (không dùng cho lệnh đồng bộ)".
  3. **Mục 6 mở đầu** (dòng ~243): "hai thiết bị sửa cùng ô thì máy chủ giữ cả hai giá trị" ⇒ "lệnh tới máy chủ sau cùng thắng".
  4. **Mục 6.1, ví dụ response** (dòng ~251–266): bỏ kết quả `conflict`/`conflict_id`/`server`, thêm chú thích "lệnh tới sau thắng, kể cả khi base_version cũ".
  5. **Mục 6.1, bảng `status`**: xoá dòng `conflict`, thêm đoạn "`status = "conflict"` không còn xuất hiện…".
  6. **Mục 6.1, quy tắc xử lý 3–4** (dòng ~270–276): bỏ "xung đột" khỏi danh sách lỗi không chặn lô; vòng đánh giá lại ghi rõ "thường là áp dụng được ngay vì lệnh tới sau thắng", hết vòng ⇒ `rejected` `conflict`/`retry`.
  7. **Mục 6.1, "Hệ quả cho client (B-02)"**: danh sách ack còn `applied`/`duplicate` (bỏ `conflict`).
  8. **Mục 6.1, bảng so khớp `base_version` cho các "ô"** (dòng ~279–288): `B < V` khác giá trị ⇒ áp dụng `V+1`; giá trị giống ⇒ `applied` `noop` (bất kể `B`); giữ `B > V` ⇒ `base_version_ahead`.
  9. **Mục 6.1 — đoạn "Đối tượng"** (dòng ~290, chỗ lead chỉ ra): viết lại thành "Lệnh đối tượng (`test.update`, `test.delete`, `homework.section.upsert` khi sửa, `homework.section.delete`): cùng quy tắc lệnh tới sau thắng, `B` cũ vẫn `applied` và `version` tăng, chỉ `B > V` ⇒ `base_version_ahead`; lỗi quyền/hợp lệ/ràng buộc nghiệp vụ vẫn `rejected`" (bỏ hẳn `rejected version_conflict`).
  10. **Mục 6.2** (`conflict.resolve`): luôn `rejected` `validation_error` `details.reason = "conflicts_not_used"`.
  11. **Mục 6.2, ghi chú dưới bảng lệnh** (dòng ~311): thêm "cột `base_version` là phiên bản client đã thấy; cũ hơn không làm lệnh bị từ chối ở bất kỳ loại lệnh nào".
  12. **Mục 6.3, ví dụ `pull`**: bỏ `upserts.conflict`.
  13. **Mục 6.4, bảng thực thể**: bỏ dòng `conflict`, thêm dòng "Không còn thực thể `conflict`: bỏ xung đột ở MVP (6.5)".
  14. **Mục 6.5**: đổi tiêu đề thành "Lệnh tới máy chủ sau cùng thắng và phát lại"; gạch đầu dòng mở rộng từ "bốn loại ô" sang **mọi lệnh đồng bộ** (nêu cả lệnh đối tượng), nói rõ `test.create`/`homework.assign` vẫn đòi `id` mới, `409 version_conflict` chỉ còn ở `PATCH` REST; giữ nguyên phần "phát lại để lộ ra".
  15. **Mục 6.6, danh sách `entities`** của `/sync/snapshot`: bỏ `"conflict"`.
- `plans/20261021-mvp/backend/offline-plan.md`: danh sách ack chỉ còn `applied`/`duplicate`; bước 1 và 2(f) đổi từ "màn xung đột" sang ca hai thiết bị tới-sau-thắng; kịch bản kiểm bắt buộc và mục rủi ro viết lại theo quy tắc mới.
- `plans/20261021-mvp/backend/data-model.md`: mục 2.8 đánh dấu **`sync_conflicts` không dùng ở MVP** (giữ bảng vì là migration đã áp, không thêm migration), `applied_commands.status` chỉ còn được ghi `applied`/`rejected`, dòng `conflict` trong bảng `change_log` ghi rõ không sinh dòng.
- `plans/20261021-mvp/backend/authz-matrix.md`: dòng quyền "đọc/giải quyết xung đột" ⇒ bỏ ở MVP cho mọi role; quy ước xung đột thay bằng quy ước tới-sau-thắng; T28 viết lại (cả hai `applied`, `version` 1 rồi 2, `pull` hai thiết bị cùng giá trị cuối, không có dòng `sync_conflicts`).

`docs/spec.md`, `docs/architecture.md` không sửa (đã chốt trước).

## 5. Lệnh và kết quả (đã che)

```sh
cd worker
npm run typecheck                    # tsc --noEmit, không lỗi (cả hai vòng)
npm test                             # vòng 1: 23 file / 100 test · sau vòng 2: 23 file / 101 test — PASS
git commit -m "fix(worker): let the last sync command win instead of recording conflicts"   # 70c9392, không push
git commit -m "fix(worker): apply sync object commands with a stale base_version"            # 7a108f9, không push
npx wrangler deployments list --env staging      # bản đang chạy trước vòng 1: 90584f55-a138-4315-b24d-1f448b6cab3b
npx wrangler deploy --env staging                # vòng 1: e45ed4ce-6df8-4923-b19d-a0c5a6abddfc (2026-10-22T00:56Z)
npx wrangler deploy --env staging                # vòng 2: caeccc9b-4a97-4eff-ae93-d8febb44738c (2026-10-22T08:03Z)
#   Total Upload 239.45 KiB / gzip 54.26 KiB · Startup 4 ms
#   bindings: DB=qlh-staging-db, ENVIRONMENT=staging, PBKDF2_ITERATIONS=100000, ALLOWED_ORIGINS (không đổi)
```

## 6. Smoke HTTPS thật trên bản `e45ed4ce`

Script Python ở `/tmp/lww_smoke.py` (ngoài repo), mọi request đặt `User-Agent`; workspace demo **đăng ký mới** bằng `REGISTRATION_CODE` đọc từ `worker/.dev.vars` (không in ra). Chỉ in mã trạng thái, `status`/`version` của lệnh và giá trị ô.

| Bước | Kết quả |
|---|---|
| `GET /v1/health` | `200` |
| `POST /v1/auth/register` (workspace mới) | `201` |
| `POST /v1/classes`, 2× `POST /classes/{id}/students` | `201`, `201`, `201` |
| `test.create` qua `sync/push` | `200`, lệnh `applied` |
| Ô 1, thiết bị A: `score.set = 8`, `base_version 0` | `applied`, `version 1` |
| Ô 1, thiết bị B (device_id khác, `command_id` khác): `score.set = 13`, `base_version 0` (**cũ**), `created_at` cũ hơn lệnh A | `applied`, `version 2` |
| Ô 2 đảo thứ tự: B `= 6` (`base 0`) rồi A `= 9` (`base 0`, `created_at` cũ hơn) | `applied` v1, rồi `applied` v2 |
| `GET /v1/sync/pull` (cursor 0) | `200`; `score` cuối: ô 1 = **13 / v2**, ô 2 = **9 / v2**; không có `upserts.conflict` |

Kết luận smoke: cả hai lệnh đều `applied`, ô mang giá trị của lệnh **tới sau**, `pull` thấy giá trị cuối, không sinh xung đột. `SMOKE PASS`.

### 6b. Smoke vòng 2 trên bản `caeccc9b` (lệnh đối tượng, `test.update` hai lệnh `base_version` cũ)

Script `/tmp/lww_object_smoke.py` (ngoài repo), workspace demo đăng ký mới, không in `REGISTRATION_CODE`/token/SĐT.

| Bước | Kết quả |
|---|---|
| `GET /v1/health`, `POST /v1/auth/register`, `POST /v1/classes` | `200`, `201`, `201` |
| `test.create` (`B = 0`) | `applied`, `version 1` |
| Thiết bị A: `test.update` `name = "LWW from A"`, `max 20`, **`base_version 1`** | `applied`, `version 2` |
| Thiết bị B (device_id khác, `command_id` khác): `test.update` `name = "LWW from B"`, `max 25`, **`base_version 1` (cũ)**, `created_at` cũ hơn | `applied`, `version 3` |
| `test.update` với `base_version 9` (tương lai) | `rejected`, `details.reason = base_version_ahead` |
| `score.set = 18` (`applied`) rồi `test.update` `max 10` với `base_version 0` (cũ) | `rejected`, `details.reason = max_below_score` |
| `GET /v1/sync/snapshot/test` | `200`; bài = **`LWW from B`**, `max 25`, `version 3` |

Kết luận: lệnh đối tượng có `base_version` cũ **applied** và lệnh tới sau thắng; `B` tương lai và ràng buộc nghiệp vụ vẫn `rejected`. `SMOKE PASS`.

## 7. Câu hỏi / ghi chú

1. **`sync_conflicts` để lại trong D1.** Brief cấm thêm migration, nên bảng + trigger vẫn còn nhưng mã không ghi/không đọc. Nếu sau này muốn dọn hẳn (drop bảng + trigger + `CHECK` của `applied_commands`) thì cần một migration riêng, ngoài phạm vi việc này.
2. **`conflict.resolve` bị `rejected`.** Chọn giữ loại lệnh trong danh mục thay vì bỏ hẳn, để lệnh cũ còn trong outbox của client chỉ hỏng riêng nó chứ không làm cả lô 422 và không chặn đăng xuất (spec 5.3: không cho đăng xuất khi còn lệnh chờ). Nếu muốn client cũ tự xoá lệnh này thì cần một mã "coi như đã xử lý" — hiện chưa có, và MVP chưa phát hành client nào có xung đột.
3. **Giá trị giống bản hiện tại vẫn là `noop`** (không tăng `version`, không ghi lịch sử) kể cả khi `B` cũ. Đây là tối ưu chống nhiễu lịch sử/thông báo, không ảnh hưởng "tới sau thắng" vì giá trị không đổi. `api-spec.md` 6.1 đã ghi rõ.
4. **Ô/đối tượng chưa có mà `B > 0` vẫn `rejected not_found`.** Trường hợp này không phải "lệnh cũ tới sau" mà là máy khách đang giữ phiên bản của một bản ghi không còn tồn tại; áp mù sẽ tạo dòng mới từ dữ liệu sai. Giữ nguyên như hợp đồng cũ.
5. **`test.create` trùng `id` và `homework.assign` với phần đã tồn tại vẫn `rejected`** — đây là lệnh tạo, không phải lệnh sửa, nên không có "bản cũ để tới sau thắng"; client muốn đổi thì dùng `test.update`/`homework.section.upsert`.
6. **Hệ quả cần biết khi client làm offline (ghi chú, không phải câu hỏi):** giờ mọi lệnh `B` cũ đều thắng, nên nếu client áp `pull` sai mà gửi lại một bản ghi cũ thì bản mới hơn trên máy chủ sẽ bị ghi đè — đúng quy tắc người dùng chốt, nhưng client phải luôn cập nhật `version` cục bộ trong cùng transaction với dữ liệu (`offline-plan.md` mục rủi ro).
7. **Smoke để lại hai workspace demo** trên staging (`LWW Smoke WS` và `LWW Object Smoke WS`). Không chứa SĐT thật; có thể xoá thủ công nếu cần.
