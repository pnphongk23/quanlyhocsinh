# Hợp đồng máy chủ: bộ tiêu chí nhận xét tự tạo theo workspace (THỬ NGHIỆM, chỉ dev)

Ngày 2026-11-06. Trạng thái: **GL duyệt 2026-11-06** (mục 9 đã chốt). Nguồn yêu cầu: `requirements.md` cùng thư mục (bản ở repo chính).
Thay bản thử 5 tiêu chí cố định (`plans/20261104-criteria-levels/contract.md`); những gì không nhắc ở đây giữ như hợp đồng đó.
Khảo sát mã (iOS + Worker, origin/develop 36f4053): `/tmp/qlh-evidence/custom-criteria/scout-backend-ios.md` (ngoài repo).

## 0. Hai ràng buộc quyết định thiết kế

1. **CHECK ở DB** (migration 0008, giữ qua 0009/0010): `session_comments.scale IN (3,5)`, `stars` 0..5, `criteria` 0..31.
   Ghi `scale = N` (6..8) hay `stars` tới 8 phải dựng lại bảng, trái với "migration chỉ thêm".
2. **`scale = 3` nghĩa là phiếu cũ thang 3 sao** ở cả máy chủ (`legacy_scale`) và iOS (`isLegacy`: khoá sửa, phụ huynh thấy
   câu mẫu cố định thay cho `comment`). Bộ 3 tiêu chí mà ghi `scale = 3` sẽ bị iOS hiểu nhầm.

⇒ **Cột cũ giữ giá trị thang 5 hợp lệ** (`scale = 5`, `stars` quy về 0..5) để iOS cũ, báo cáo tháng và CHECK không đổi;
**sự thật thang N nằm ở cột mới `criteria_levels`** (bản chụp). Web tính x/N từ bản chụp, không từ `stars`.

## 1. Cờ

- Dùng lại `CRITERIA_LEVELS` (Worker) / `VITE_CRITERIA_LEVELS` (web). Dev `"1"`, staging/prod và local không đặt.
- Cờ tắt: `slip.set`/`defaults[]` có `criteria_levels` → `rejected` `feature_disabled`; `PUT /v1/criteria-set` → 403
  `forbidden` `reason=feature_disabled`; snapshot/pull không có `criteria_set_version`. Đọc `GET /v1/criteria-set` và trường
  `criteria_levels` của phiếu không bị chặn (như bản thử). Mọi test hiện có vẫn qua.

## 2. Migration `0017_custom_criteria.sql` (chỉ thêm)

```sql
CREATE TABLE criteria_sets (            -- một bộ / workspace
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  version      INTEGER NOT NULL DEFAULT 1,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT NULL                -- user id, NULL cho seed
);
CREATE TABLE comment_criteria (
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id),
  id              TEXT NOT NULL,        -- ổn định; seed: focus|participation|mastery|notes|homework
  position        INTEGER NOT NULL,     -- 0-based, chỉ có nghĩa với dòng chưa xoá
  name            TEXT NOT NULL,
  text_good       TEXT NOT NULL,
  text_ok         TEXT NOT NULL,
  text_needs_work TEXT NOT NULL,
  default_level   TEXT NOT NULL CHECK (default_level IN ('good','ok','needs_work')),
  homework        INTEGER NOT NULL DEFAULT 0 CHECK (homework IN (0,1)),
  deleted_at      TEXT NULL,            -- xoá mềm
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (workspace_id, id)
);
ALTER TABLE session_comments ADD COLUMN criteria_levels TEXT NULL;  -- JSON array bản chụp, NULL = không phải phiếu bộ tự tạo
```

- Seed bộ mặc định (bảng ở `requirements.md`, đúng chữ, đúng thứ tự, mức mặc định Tốt/Tốt/Đạt/Tốt/Tốt; `homework` = 1 cho
  dòng 5) bằng `INSERT ... SELECT FROM workspaces` cho **mọi workspace hiện có**; `criteria_sets.version = 1`.
- Workspace mới: `registerWorkspace` và `addWorkspace` (`worker/src/db/auth.ts`) chèn cùng seed trong cùng `db.batch`.
  Seed là một hàm/hằng dùng chung cho mã; migration chép chữ y hệt (test so khớp hai nguồn).
- Không trigger `change_log` cho hai bảng mới (xem mục 4). Trigger `change_log_slip_*` hiện có tự phát khi phiếu đổi.
- Đầu file ghi rollback: bảng mới DROP được; cột thêm không bỏ riêng được → khôi phục từ export như các migration trước.

## 3. REST bộ tiêu chí

Dạng một tiêu chí (đọc và ghi):

```json
{ "id": "focus", "name": "Học tập trung",
  "texts": { "good": "…", "ok": "…", "needs_work": "…" },
  "default_level": "good", "homework": false }
```

### 3.1 `GET /v1/criteria-set`

- Ai: Admin và nhân sự có quyền nhóm `comments_reports` (mức read trở lên). Không có quyền, phụ huynh → 403 `forbidden`.
  (Giáo viên phải đọc được bộ để chấm; chỉ **sửa** là việc của Admin.)
- 200 `{ "version": 3, "criteria": [ …chỉ tiêu chí chưa xoá, theo position… ] }`. Workspace không có dòng `criteria_sets`
  (không nên xảy ra) → trả bộ seed với `version: 0`, không ghi.

### 3.2 `PUT /v1/criteria-set` (chỉ Admin, cần mạng)

- Body `{ "base_version": 3, "criteria": [ … ] }`: **thay cả bộ**, thứ tự mảng = thứ tự mới. Mục có `id` trùng tiêu chí
  đang có → sửa; mục không có `id` → tạo mới, máy chủ sinh id (`c_` + uuid). Tiêu chí đang có mà vắng mặt → xoá mềm.
- Không phải Admin → 403 `forbidden` `reason=admin_required` (như `staff.ts`). Cờ tắt → mục 1.
- `base_version` bắt buộc, khác `version` hiện tại → 409 `conflict` `reason=version_conflict`, `details.current.version`.
- Kiểm (422 `validation`, `details: { reason, index?, field? }`), độ dài tính theo code point sau khi `trim` và NFC:
  - 1..8 mục (`criteria_count`); `name` 1..40 (`name_length`), không trùng tên trong bộ (so không phân biệt hoa thường) (`name_duplicate`);
  - mỗi `texts.good|ok|needs_work` 1..200 (`text_length`); `default_level` hợp lệ (`default_level`);
  - tối đa một `homework: true` (`homework_multiple`); `id` lạ hoặc đã xoá (`unknown_criterion`); `id` lặp trong body (`id_duplicate`).
- Ghi một `db.batch`: CAS `UPDATE criteria_sets SET version = version + 1 … WHERE workspace_id = ? AND version = ?`
  (0 dòng → 409 như trên), upsert từng dòng, đặt `deleted_at` cho dòng vắng. Trả 200 cùng dạng `GET` (version mới).
- Sửa/xoá tiêu chí KHÔNG đụng phiếu nào (phiếu giữ bản chụp).

## 4. Báo client biết bộ đã đổi (không thêm entity sync)

- Không đưa bộ vào `change_log` (bảng cấp workspace không có `class_id`, mà `change_log.class_id` NOT NULL và scope
  theo lớp; thêm entity sẽ phải đổi schema/trigger). Thay vào đó:
- Khi cờ bật và người gọi đọc được bộ (mục 3.1): phản hồi **snapshot manifest** và **mỗi trang pull** thêm khoá cấp cao
  `criteria_set_version` (số). Client thấy khác bản đang giữ → gọi `GET /v1/criteria-set`, lưu offline (Dexie) để chấm khi
  mất mạng. Phụ huynh không nhận khoá này. iOS cũ bỏ qua khoá lạ (đã kiểm `PullPage` Codable).
- Không đồng bộ định kỳ: chỉ đọc khi snapshot/pull vốn đã chạy (mở app, pull-to-refresh, sau push).

## 5. Phiếu: lệnh ghi

### 5.1 Bản chụp `criteria_levels`

Mảng 1..8 phần tử, theo thứ tự hiện trên phiếu:

```json
[ { "id": "focus", "name": "Học tập trung", "level": "good", "text": "Con học tập trung…", "homework": false }, … ]
```

- `id` 1..64, không trùng; `name` 1..40; `level` hợp lệ; `text` tuỳ chọn ≤200 (câu đã dùng, để client tách phần gõ thêm
  khi sinh lại); `homework` tuỳ chọn, tối đa một `true`. Sai → `rejected` `invalid_criteria_levels`. Máy chủ chỉ lưu các
  khoá trên (bỏ khoá thừa).
- Máy chủ **không đối chiếu** bản chụp với bộ hiện hành (offline: bộ có thể đã đổi khi lệnh tới). N = độ dài mảng.
  Tiêu chí BTVN bị bỏ khi buổi trước không giao BTVN là việc của client (không có trong mảng, không tính vào N).

### 5.2 `slip.set` có `criteria_levels`

- Không được kèm `levels`/`skill_levels` (→ `invalid_criteria_levels`). `comment` bắt buộc không rỗng (`comment_required`), máy
  chủ chỉ lưu. `criteria`/`stars` client gửi kèm bị bỏ qua.
- Máy chủ ghi: `criteria_levels` = JSON; `levels = NULL`, `skill_levels = NULL`; cột cũ cho tương thích:
  `scale = 5`, `stars = round(g / N × 5)` (g = số mức `good`, làm tròn nửa lên; trùng công thức dáng Mít),
  `criteria = (1 << stars) − 1`. Hai cột này **chỉ để iOS cũ và báo cáo tháng hiện tại**, web không dùng.
- Giữ nguyên: `note`, `hw_manual`, `base_version`, quyền, cổng điểm danh (`attendance_incomplete`), `legacy_scale`
  (phiếu thang 3 đã gửi), sửa phiếu đã gửi được (như bản thử), `slip.send` không đổi payload.

### 5.3 Phiếu đã có `criteria_levels`

- Lệnh có `criteria`, `stars` hoặc `levels` mà không có `criteria_levels` (iOS cũ, web cũ còn trong hàng đợi) →
  `rejected` `criteria_set_slip`. Không xoá bản chụp. (iOS cũ: báo lỗi chung, lệnh không kẹt hàng đợi — đã kiểm
  `SQLiteStore`/`SaveStatus`.)
- Lệnh chỉ đổi `note`/`comment`/`hw_manual` → áp, giữ `criteria_levels` (và cột cũ).

### 5.4 Phiếu chưa có `criteria_levels`

- Lệnh kiểu cũ (`criteria`/`stars`) và bản thử (`levels`, `skill_levels`, `session.lesson.set` có `graded_skills`): **nhận y
  như hiện tại** (iOS cũ vẫn ghi phiếu kiểu cũ; hàng đợi offline cũ xả được). Web mới không gửi `levels`/`skill_levels`,
  gửi `graded_skills: []`. Không xoá mã bản thử trong lần này.
- `slip.set` có `criteria_levels` lên phiếu kiểu cũ/bản thử → chuyển thành phiếu bộ tự tạo (mục 5.2), trừ `legacy_scale`.

### 5.5 `slip.send` `defaults[]`

- Mục `defaults[]` nhận thêm `criteria_levels` (cùng kiểm và tính như 5.2, cần `comment` như mục defaults hiện có);
  có `criteria_levels` thì `criteria`/`levels`/`skill_levels` của mục đó bị bỏ qua. Phiếu đã có thì `defaults` bị bỏ qua
  như hiện tại. Bỏ em Vắng và cổng điểm danh giữ nguyên.

## 6. Phiếu: dữ liệu đọc

- `slip` (snapshot, pull, `GET /sessions/:id/slips`): thêm `criteria_levels` (array) khi khác NULL; NULL thì vắng khoá
  (JSON phiếu cũ bất biến). Giáo viên và phụ huynh đều nhận; phụ huynh vẫn không nhận `criteria`/`hw_manual`, vẫn gộp
  `comment` + `note` như `slipForViewer` (scale 5).
- Web: `criteria_levels` có ⇒ phiếu bộ tự tạo: x = số `good`, N = độ dài; hiện tên/mức theo bản chụp. Không có ⇒ đọc như
  bản thử (`levels`) hoặc kiểu cũ (`criteria`/`stars`/`scale`) như hiện nay.
- iOS cũ đọc phiếu mới: thấy phiếu thang 5, `stars` đã quy đổi (vd 6/6 → 5/5, 4/6 → 3/5), dáng Mít đúng, `comment` hiện
  đúng; nhãn chip tiêu chí 5 cái cũ không khớp (chấp nhận trong lần thử, như bản thử 5 tiêu chí). Không giải mã lỗi.

## 7. Báo cáo tháng

- Không đổi mã đếm: cột `stars`/`scale` của phiếu mới nằm trong miền thang 5 nên `summarizeStars` không lỗi (đếm theo sao
  đã quy đổi). `criteria_summary`/`skill_summary` chỉ đếm phiếu có `levels` (bản thử), phiếu bộ tự tạo không vào.
  Báo cáo theo tiêu chí làm sau. Có test chứng minh báo cáo có phiếu `criteria_levels` (N = 1, 3, 6, 8) dựng được.

## 8. Kiểm chứng bắt buộc

- Cờ tắt: mọi test hiện có (256) qua; `criteria_levels` → `feature_disabled`; `PUT` → 403; snapshot/pull không có
  `criteria_set_version`.
- Migration: mọi workspace có seed đúng chữ; workspace đăng ký mới và `addWorkspace` có seed; seed mã = seed migration.
- REST: GET (Admin, Giáo viên, Trợ giảng 200; phụ huynh 403); PUT Admin: tạo/sửa/xoá/đổi thứ tự, bộ 6 tiêu chí cô Thu,
  1 và 8 tiêu chí, 0 và 9 → 422, tên 40/41, câu 200/201 (có dấu tiếng Việt), trùng tên, hai `homework`, id lạ/đã xoá,
  `base_version` lệch → 409, non-Admin → 403; version tăng 1.
- `slip.set`: N = 1, 3, 6, 8 → `stars`/`criteria`/`scale` cột cũ đúng công thức, `criteria_levels` lưu chuẩn hoá; kèm
  `levels` → lỗi; sai dạng → `invalid_criteria_levels`; phiếu có bản chụp + lệnh `criteria`/`stars`/`levels` →
  `criteria_set_slip`; note-only giữ bản chụp; phiếu cũ + lệnh cũ như trước; sửa phiếu đã gửi; `legacy_scale`; cổng điểm
  danh; `defaults[]` có `criteria_levels`; offline idempotent.
- Đọc: giáo viên/phụ huynh thấy `criteria_levels`; phiếu NULL vắng khoá; `criteria_set_version` có khi cờ bật (nhân sự),
  đổi sau PUT; phụ huynh không có.
- Báo cáo tháng như mục 7. tsc + test Worker xanh, CI xanh.
- `docs/architecture.md` cập nhật cùng PR (bảng mới, `criteria_levels`, `criteria_set_version`, cách quy đổi cột cũ).
  Phần `docs/spec.md`: gửi GL bản nháp.

## 9. Đã chốt (GL 2026-11-06)

1. Nhân sự có quyền nhận xét đọc bộ; chỉ Admin sửa.
2. Cột cũ quy đổi thang 5 (`stars = round(g/N×5)`) thay vì `scale = N` (vướng CHECK và nhầm phiếu thang 3). Hệ quả: báo
   cáo tháng hiện tại đếm sao quy đổi; iOS cũ thấy x/5.
3. iOS cũ sửa tiêu chí trên phiếu bộ tự tạo bị từ chối (`criteria_set_slip`) thay vì ghi đè làm mất bản chụp.

## 10. Giới hạn đã biết (GL chấp nhận 2026-11-06)

iOS hiện tại mở phiếu NHÁP bộ tự tạo sẽ tự tính lại BTVN theo 5 bit cũ nên có thể hiện sai sao (vd 3/5 thành 4/5) và câu mẫu cũ thay comment; không crash; lưu tiêu chí từ iOS bị `criteria_set_slip` nên không mất dữ liệu; phiếu đã gửi hiện đúng; chỉ dev (cờ tắt ở prod); sửa khi làm iOS.
