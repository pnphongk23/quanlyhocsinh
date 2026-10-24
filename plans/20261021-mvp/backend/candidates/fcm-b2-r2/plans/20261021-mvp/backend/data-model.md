# Mô hình dữ liệu D1 (MVP)

Ngày: 2026-10-21 · Tác giả: lead spec backend (B1) · Nguồn nghiệp vụ: `docs/spec.md` (đã đồng bộ 2026-10-21), `docs/architecture.md` mục 4, 5 · Đi kèm: `api-spec.md`, `authz-matrix.md`, `stack-and-cpu.md`, `offline-plan.md`.

Tài liệu này chỉ thiết kế, chưa có mã. Mọi tên bảng và cột dưới đây là hợp đồng cho worker implement; đổi tên phải sửa cả `api-spec.md`.

## 1. Quy ước chung

- **ID:** `TEXT` UUID (v4 hoặc v7). Bản ghi tạo được khi offline (bài kiểm tra, phần BTVN) dùng UUID do client sinh. Bản ghi tạo online do máy chủ sinh. Điểm danh, điểm, phiếu, chấm BTVN dùng **khóa tự nhiên** (ví dụ `session_id + student_id`), không có cột `id`: hai thiết bị cùng tạo một ô sẽ trùng khóa thay vì sinh hai dòng.
- **Thời gian:** `TEXT` ISO-8601 UTC có mili giây (`2026-10-21T03:15:00.000Z`). Ngày học `date` là `TEXT 'YYYY-MM-DD'` theo múi giờ workspace (mặc định `Asia/Ho_Chi_Minh`), giờ học `'HH:MM'`, tháng báo cáo `'YYYY-MM'`.
- **SĐT:** chuẩn hoá `+84` + 9 chữ số (ví dụ `+84900000001`), lưu một dạng duy nhất. Ràng buộc: `CHECK (phone GLOB '+84[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')`.
- **Cột chung của bảng dữ liệu:** `workspace_id`, `version INTEGER NOT NULL DEFAULT 1` (tăng 1 mỗi lần sửa, do câu `UPDATE` tăng, không do trigger), `created_at`, `updated_at`, `updated_by` (`users.id`, để trigger lịch sử lấy người sửa).
- **Tách workspace bằng khóa ngoại phức hợp:** mọi bảng cha của dữ liệu có `UNIQUE (workspace_id, id)`; bảng con khai `FOREIGN KEY (workspace_id, x_id) REFERENCES x(workspace_id, id)`. Một dòng không thể trỏ sang workspace khác. D1 bật `foreign_keys`.
- **Cột phi chuẩn hoá `class_id` (và `student_id`) ở bảng con:** để lọc theo phạm vi mà không join. Tầng `db` luôn chép từ bảng cha trong cùng câu `INSERT ... SELECT`; trigger `*_immutable_keys` chặn đổi sau khi tạo. Test bắt buộc kiểm giá trị khớp cha.
- **Không xoá cứng dữ liệu nghiệp vụ**, ngoại lệ có điều kiện: bài kiểm tra chưa có điểm, phần BTVN chưa chấm, buổi tự sinh chưa có dữ liệu khi sửa lịch lặp (mục 5). Các ngoại lệ ghi dòng `delete` vào `change_log`.
- **Đặt tên:** bảng buổi học là `class_sessions` (tránh nhầm với `auth_sessions` của đăng nhập). Cột tham chiếu vẫn tên `session_id`.
- **Boolean:** `INTEGER` 0/1 kèm `CHECK`.

## 2. Bảng

Thứ tự dưới đây gần với thứ tự tạo trong migration (riêng `member_classes` tạo sau `classes` vì khóa ngoại). `CHECK`/`UNIQUE` ghi đủ; `-- idx:` là chỉ mục kèm truy vấn nó phục vụ.

### 2.1 Danh tính, workspace, quyền

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  change_floor INTEGER NOT NULL DEFAULT 0,        -- seq nhỏ nhất của change_log còn giữ; client có cursor nhỏ hơn phải tải lại (api-spec mục 9)
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE CHECK (phone GLOB '+84[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  display_name TEXT CHECK (display_name IS NULL OR length(display_name) <= 100),
  password_hash TEXT NOT NULL,                    -- 'pbkdf2-sha256$<iter>$<salt_b64url>$<hash_b64url>' (stack-and-cpu.md mục 4)
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0,1)),
  password_changed_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
-- Một SĐT = một user toàn hệ thống (UNIQUE phone). Tra khi đăng nhập: users.phone (chỉ mục UNIQUE).

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('workspace','assigned_classes','linked_students')),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),
  system_key TEXT CHECK (system_key IN ('admin','teacher','assistant','guardian')),
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (workspace_id, name),
  UNIQUE (workspace_id, system_key),              -- NULL không trùng nhau: role tuỳ chỉnh để NULL
  CHECK (scope_kind <> 'workspace' OR system_key = 'admin')   -- chỉ role Admin có phạm vi workspace
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  perm_group TEXT NOT NULL CHECK (perm_group IN
    ('classes','students','sessions_attendance','scores','lectures','comments_reports')),
  level TEXT NOT NULL CHECK (level IN ('none','read','write')),
  PRIMARY KEY (role_id, perm_group)
) WITHOUT ROWID;

CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  scope_epoch INTEGER NOT NULL DEFAULT 1,         -- tăng khi đổi phạm vi (gán/gỡ lớp, liên kết con, đổi role, khoá); client lệch epoch phải tải lại
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (user_id, workspace_id, role_id),
  UNIQUE (workspace_id, id, user_id),
  FOREIGN KEY (workspace_id, role_id) REFERENCES roles(workspace_id, id)
);
-- idx: CREATE INDEX memberships_user ON memberships(user_id, status);   -- đăng nhập: liệt kê vai trò của user
-- idx: CREATE INDEX memberships_role ON memberships(role_id, status);   -- đếm Admin còn hoạt động

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  membership_id TEXT REFERENCES memberships(id),  -- vai trò đang dùng; NULL tới khi người có nhiều vai trò chọn
  token_hash TEXT NOT NULL UNIQUE,                -- SHA-256 của token ngẫu nhiên 32 byte; không lưu token
  device_label TEXT CHECK (device_label IS NULL OR length(device_label) <= 80),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
-- idx: UNIQUE(token_hash) phục vụ mọi request (1 lần tra)
-- idx: CREATE INDEX auth_sessions_user ON auth_sessions(user_id, revoked_at);   -- thu hồi hàng loạt khi đổi mật khẩu

CREATE TABLE auth_throttle (
  key TEXT PRIMARY KEY,                           -- 'login:p:+84…' | 'login:ip:<ip>' | 'register:ip:<ip>' | 'issue:m:<membership_id>'
  fails INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  locked_until TEXT
);
-- Chỉ ghi khi sai/tới hạn (không ghi ở đăng nhập đúng đầu tiên). Cron xoá dòng quá 1 ngày.
```

Role mặc định tạo cùng workspace lúc đăng ký (trong mã, cùng `batch`, không nằm trong migration vì mỗi workspace một bản):

| Role (`system_key`) | `scope_kind` | classes | students | sessions_attendance | scores | lectures | comments_reports |
|---|---|---|---|---|---|---|---|
| Admin (`admin`, `is_system=1`) | `workspace` | write | write | write | write | write | write |
| Giáo viên (`teacher`) | `assigned_classes` | write | write | write | write | write | write |
| Trợ giảng (`assistant`) | `assigned_classes` | read | read | write | read | read | read |
| Phụ huynh (`guardian`) | `linked_students` | none | none | read | read | none | read |

Trợ giảng và `lectures` chỉ là giá trị khởi tạo (xem "Câu hỏi mở" Q5 và Q11 ở `api-spec.md`); nhóm `lectures` chưa dùng trong MVP nhưng vẫn có dòng để lược đồ đầy đủ.

```sql
CREATE TABLE member_classes (
  workspace_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (membership_id, class_id),
  FOREIGN KEY (workspace_id, membership_id) REFERENCES memberships(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
) WITHOUT ROWID;
-- idx: CREATE INDEX member_classes_class ON member_classes(class_id);   -- ai đang được gán lớp này
-- Truy vấn "lớp của tôi" dùng khóa chính (membership_id, class_id).
```

Trigger ràng buộc (RAISE(ABORT, '<mã>') để tầng `db` ánh xạ sang lỗi API; tầng `db` cũng tự kiểm trước, trigger là lớp chặn cuối):

| Trigger | Bảng, sự kiện | Chặn | Mã |
|---|---|---|---|
| `role_perm_guardian_cap` | `role_permissions` BEFORE INSERT/UPDATE | role `linked_students` có mức `write`, hoặc nhóm `classes`/`students` khác `none` | `guardian_role_cap` |
| `role_perm_admin_locked` | `role_permissions` BEFORE UPDATE/DELETE | sửa quyền role `is_system=1` | `system_role_locked` |
| `role_system_locked` | `roles` BEFORE UPDATE/DELETE | sửa/xoá role `is_system=1`; đổi `scope_kind` sau khi tạo | `system_role_locked` |
| `membership_guardian_needs_link` | `memberships` BEFORE INSERT | role `linked_students` mà user chưa có dòng `guardian_student` cùng workspace (tạo `guardian_student` trước trong `batch`) | `guardian_without_link` |
| `membership_last_admin` | `memberships` BEFORE UPDATE OF status,role_id / BEFORE DELETE | làm workspace hết Admin hoạt động | `last_admin` |
| `member_class_staff_only` | `member_classes` BEFORE INSERT | membership có role `linked_students` | `staff_only` |

### 2.2 Lớp, học sinh, buổi học

```sql
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  weekdays INTEGER NOT NULL CHECK (weekdays BETWEEN 0 AND 127),  -- bit0 = Thứ hai … bit6 = Chủ nhật; 0 = không có lịch lặp
  start_time TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  generated_until TEXT,                            -- ngày cuối cùng đã sinh buổi tự động
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id)
);
-- idx: CREATE INDEX classes_ws ON classes(workspace_id, status, name);   -- danh sách lớp của Admin
-- Danh sách lớp của nhân sự: member_classes(PK) JOIN classes(PK).

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  parent_phone TEXT CHECK (parent_phone IS NULL OR parent_phone GLOB '+84[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  enrolled_at TEXT NOT NULL,                       -- ngày vào lớp
  left_at TEXT,                                    -- ngày rời lớp
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  CHECK ((status = 'left') = (left_at IS NOT NULL)),
  CHECK (left_at IS NULL OR left_at >= enrolled_at),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
-- idx: CREATE INDEX students_class ON students(class_id, status, name);       -- danh sách học sinh của lớp
-- idx: CREATE INDEX students_phone ON students(workspace_id, parent_phone);   -- liên kết phụ huynh theo SĐT
-- MVP: một học sinh thuộc đúng một lớp. "Thêm từ lớp khác / chuyển lớp" là việc làm sau, sẽ cần bảng ghi danh riêng.

CREATE TABLE guardian_student (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  student_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, student_id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
) WITHOUT ROWID;
-- idx: CREATE INDEX guardian_student_student ON guardian_student(student_id);  -- gỡ liên kết khi đổi SĐT
-- Phạm vi phụ huynh = PK (user_id, …). Tầng db duy trì bảng này (mục 4); không có đường ghi nào khác.

CREATE TABLE class_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  origin TEXT NOT NULL CHECK (origin IN ('recurring','manual')),
  is_makeup INTEGER NOT NULL DEFAULT 0 CHECK (is_makeup IN (0,1)),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','held','cancelled')),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  cancelled_at TEXT, cancelled_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (class_id, date, start_time),            -- cron sinh buổi dùng INSERT OR IGNORE nên idempotent
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
-- idx: UNIQUE(class_id, date, start_time) phục vụ "buổi của lớp theo khoảng ngày" và tìm buổi kế tiếp chưa hủy (BTVN)
-- idx: CREATE INDEX class_sessions_ws_date ON class_sessions(workspace_id, date);   -- tab Lịch theo ngày/tháng nhiều lớp
```

- `planned` → `held` do máy chủ đặt khi lưu điểm danh đầu tiên của buổi (cùng `batch`, khớp prototype). `cancelled` chỉ từ `planned` và không đảo ngược.
- **Số thứ tự buổi** (không lưu): đếm buổi `held` của lớp có `(date, start_time)` nhỏ hơn hoặc bằng buổi đó; buổi hủy không có số (spec mục 4).
- **Buổi chấm BTVN** (không lưu): buổi kế tiếp có `status <> 'cancelled'` của cùng lớp sau buổi giao (`ORDER BY date, start_time LIMIT 1`).

### 2.3 Điểm danh

```sql
CREATE TABLE attendance (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','late','excused','absent')),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  late_at TEXT CHECK (late_at IS NULL OR late_at GLOB '[0-2][0-9]:[0-5][0-9]'),   -- giờ đến muộn
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (session_id, student_id),
  CHECK (status = 'late' OR late_at IS NULL),
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
) WITHOUT ROWID;
-- idx: PK (session_id, student_id): điểm danh cả buổi
-- idx: CREATE INDEX attendance_student ON attendance(student_id, session_id);   -- xem theo học sinh/tháng (phụ huynh), "vắng 2 buổi liên tiếp", báo cáo

CREATE TABLE attendance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  session_id TEXT NOT NULL, student_id TEXT NOT NULL,
  old_status TEXT, new_status TEXT NOT NULL,
  old_note TEXT, new_note TEXT,
  old_late_at TEXT, new_late_at TEXT,
  old_version INTEGER NOT NULL, new_version INTEGER NOT NULL,
  changed_by TEXT, changed_at TEXT NOT NULL
);
-- idx: CREATE INDEX attendance_history_cell ON attendance_history(session_id, student_id, id);
```

Trigger `attendance_history_ai` AFTER UPDATE ON `attendance` WHEN `OLD.status IS NOT NEW.status OR OLD.note IS NOT NEW.note OR OLD.late_at IS NOT NEW.late_at`: ghi một dòng `attendance_history` (`changed_by = NEW.updated_by`, `changed_at = NEW.updated_at`). Không ghi lịch sử lần tạo đầu. API MVP chưa đọc bảng này (màn lịch sử làm sau).

Quy tắc ở tầng `db` (không ở schema vì phụ thuộc bảng khác): chỉ điểm danh khi `class_sessions.date <= hôm nay (theo múi giờ workspace)` và buổi chưa hủy; học sinh phải đang học vào ngày đó (`enrolled_at <= date AND (left_at IS NULL OR date <= left_at)`).

### 2.4 Bài kiểm tra và điểm

```sql
CREATE TABLE tests (
  id TEXT PRIMARY KEY,                             -- UUID do client sinh khi tạo offline
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  date TEXT NOT NULL,
  max INTEGER NOT NULL DEFAULT 15 CHECK (max BETWEEN 1 AND 1000),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
-- idx: CREATE INDEX tests_class ON tests(class_id, archived, date);   -- bảng điểm của lớp

CREATE TABLE scores (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  value REAL CHECK (value IS NULL OR value >= 0),  -- NULL = "Chưa có điểm"; không có cột vắng thi
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (test_id, student_id),
  FOREIGN KEY (workspace_id, test_id) REFERENCES tests(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
) WITHOUT ROWID;
-- idx: PK (test_id, student_id): nhập điểm một bài
-- idx: CREATE INDEX scores_student ON scores(student_id, test_id);   -- điểm theo học sinh (phụ huynh, báo cáo)

CREATE TABLE score_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL, test_id TEXT NOT NULL, student_id TEXT NOT NULL,
  old_value REAL, new_value REAL,
  old_version INTEGER NOT NULL, new_version INTEGER NOT NULL,
  changed_by TEXT, changed_at TEXT NOT NULL
);
-- idx: CREATE INDEX score_history_cell ON score_history(test_id, student_id, id);
```

Trigger:

| Trigger | Sự kiện | Việc |
|---|---|---|
| `scores_max_guard` | `scores` BEFORE INSERT/UPDATE OF value | `RAISE(ABORT,'score_above_max')` nếu `NEW.value > (SELECT max FROM tests WHERE id = NEW.test_id)` |
| `tests_max_guard` | `tests` BEFORE UPDATE OF max | `RAISE(ABORT,'max_below_score')` nếu tồn tại `scores.value > NEW.max` của bài đó (spec: không hạ dưới điểm cao nhất đã nhập) |
| `scores_history_au` | `scores` AFTER UPDATE WHEN `OLD.value IS NOT NEW.value` | ghi `score_history` |
| `scores_republish_ai/au` | `scores` AFTER INSERT/UPDATE WHEN `NEW.value IS NOT NULL` | `UPDATE reports SET needs_republish = 1 WHERE student_id = NEW.student_id AND status = 'published' AND month = substr((SELECT date FROM tests WHERE id = NEW.test_id),1,7)` (spec: sửa điểm sau phát hành) |
| `tests_republish_au` | `tests` AFTER UPDATE OF archived, date, max | cùng cập nhật `needs_republish` cho các báo cáo đã phát hành của lớp trong tháng của bài (cả tháng cũ nếu đổi ngày). Thêm này là quyết định thiết kế: lưu trữ/đổi bài làm nội dung báo cáo lệch bản đã phát hành |
| `tests_delete_guard` | `tests` BEFORE DELETE | `RAISE(ABORT,'test_has_scores')` nếu có `scores.value IS NOT NULL` (lưu trữ thay vì xoá) |

Xoá bài: tầng `db` kiểm "mọi ô là Chưa có điểm" rồi `DELETE FROM tests` (các dòng `scores` NULL bị xoá theo `ON DELETE CASCADE`), ngược lại `UPDATE ... archived = 1`. Điểm (kể cả 0) phải nằm trong `0..tests.max`.

### 2.5 Phiếu buổi học và BTVN

```sql
CREATE TABLE session_comments (                   -- "phiếu buổi học" của một em
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  stars INTEGER CHECK (stars IS NULL OR stars BETWEEN 1 AND 3),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  sent_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (session_id, student_id),
  CHECK (status = 'draft' OR stars IS NOT NULL),            -- phải chọn sao mới gửi được
  CHECK ((status = 'sent') = (sent_at IS NOT NULL)),
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
) WITHOUT ROWID;
-- idx: PK (session_id, student_id): tab Nhận xét của buổi
-- idx: CREATE INDEX session_comments_student ON session_comments(student_id, status, session_id);   -- phụ huynh: phiếu đã gửi của con
```

Câu mẫu theo sao cố định trong mã client (spec mục 4), không lưu. Trigger `comment_no_unsend` BEFORE UPDATE: `OLD.status='sent' AND NEW.status='draft'` → `RAISE(ABORT,'cannot_unsend')`. Sau khi gửi vẫn sửa được `stars`, `note` (phụ huynh thấy ngay, spec mục 4); không có bước gửi lại.

```sql
CREATE TABLE homework_sections (
  id TEXT PRIMARY KEY,                             -- UUID do client sinh
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_id TEXT NOT NULL,                        -- buổi GIAO bài (buổi N)
  kind TEXT NOT NULL CHECK (kind IN ('vocabulary','reading','speaking','exercise')),
  title TEXT NOT NULL DEFAULT '' CHECK (length(title) <= 120),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (session_id, kind),                       -- tối đa một phần mỗi loại ⇒ tối đa 4 phần mỗi buổi
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id)
);
-- idx: UNIQUE(session_id, kind): các phần của một buổi

CREATE TABLE homework_grades (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  level TEXT CHECK (level IS NULL OR level IN ('excellent','done','not_done')),  -- NULL = "Chưa chấm"
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (section_id, student_id),
  FOREIGN KEY (workspace_id, section_id) REFERENCES homework_sections(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
) WITHOUT ROWID;
-- idx: PK (section_id, student_id): chấm cả lớp một phần
-- idx: CREATE INDEX homework_grades_student ON homework_grades(student_id, section_id);   -- phụ huynh, báo cáo
```

Trigger `homework_section_delete_guard` BEFORE DELETE ON `homework_sections`: `RAISE(ABORT,'section_has_grades')` nếu tồn tại `homework_grades.level IS NOT NULL` của phần đó (spec: chỉ xoá phần chưa được chấm cho em nào; các dòng `level` NULL bị xoá theo cascade). Giao bài: buổi giao phải là buổi chưa hủy. Hủy buổi bị chặn (`409 session_has_data`) khi buổi còn `homework_sections`.

**Phụ huynh thấy kết quả chấm khi nào:** dòng `homework_grades` của phần thuộc buổi N, em S, chỉ trả cho phụ huynh khi tồn tại `session_comments` của S ở **buổi chấm của N** với `status='sent'` (spec mục 4). Truy vấn mẫu (tầng `db`, dùng chỉ mục `class_sessions(class_id,date,start_time)`, `session_comments(PK)`):

```sql
SELECT g.* FROM homework_grades g
JOIN homework_sections hs ON hs.id = g.section_id
JOIN class_sessions s ON s.id = hs.session_id
JOIN session_comments c ON c.student_id = g.student_id AND c.status = 'sent' AND c.session_id = (
  SELECT s2.id FROM class_sessions s2
  WHERE s2.class_id = s.class_id AND s2.status <> 'cancelled'
    AND (s2.date > s.date OR (s2.date = s.date AND s2.start_time > s.start_time))
  ORDER BY s2.date, s2.start_time LIMIT 1)
WHERE g.student_id IN (SELECT student_id FROM guardian_student WHERE user_id = ?) AND g.level IS NOT NULL;
```

### 2.6 Báo cáo tháng

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),  -- draft = chưa từng phát hành
  general_comment TEXT NOT NULL DEFAULT '' CHECK (length(general_comment) <= 4000),   -- bản nháp nhận xét chung
  needs_republish INTEGER NOT NULL DEFAULT 0 CHECK (needs_republish IN (0,1)),
  publication_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,                               -- lần phát hành gần nhất
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id),
  UNIQUE (workspace_id, id),
  UNIQUE (student_id, month),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
);
-- idx: UNIQUE(student_id, month): báo cáo của một em theo tháng
-- idx: CREATE INDEX reports_class_month ON reports(class_id, month);   -- danh sách báo cáo của lớp

CREATE TABLE report_publications (               -- bản chụp bất biến của từng lần phát hành
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL, student_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  month TEXT NOT NULL,
  publication_no INTEGER NOT NULL CHECK (publication_no >= 1),
  snapshot TEXT NOT NULL,                          -- JSON do máy chủ dựng lúc phát hành (api-spec mục 8)
  pdf_key TEXT,                                    -- khoá R2, gán đúng một lần sau khi client tải PDF lên
  pdf_bytes INTEGER,
  published_by TEXT NOT NULL REFERENCES users(id),
  published_at TEXT NOT NULL,
  UNIQUE (report_id, publication_no),
  FOREIGN KEY (workspace_id, report_id) REFERENCES reports(workspace_id, id)
);
-- idx: UNIQUE(report_id, publication_no): bản mới nhất = số lớn nhất
-- idx: CREATE INDEX report_publications_student ON report_publications(student_id, month);   -- phụ huynh liệt kê báo cáo của con
```

Trigger `report_publication_immutable` BEFORE UPDATE/DELETE ON `report_publications`: chặn mọi thay đổi trừ `pdf_key`/`pdf_bytes` từ `NULL` sang giá trị. Bản chụp là dữ liệu máy chủ dựng từ DB lúc phát hành (một `batch`: đọc → dựng JSON ở Worker → ghi `report_publications` + cập nhật `reports` + `notifications`); PDF sinh trên máy giáo viên từ chính bản chụp đó rồi tải lên R2 (khoá `reports/<workspace_id>/<report_id>/<publication_no>.pdf`).

### 2.7 Thông báo và push (FCM, đã chốt 2026-10-21)

Firebase chỉ dùng cho FCM, dữ liệu vẫn ở D1. FCM token là dữ liệu nhạy cảm: không trả về qua danh sách, không log, không đưa vào sync/snapshot. Thêm `UNIQUE (workspace_id, id, user_id)` vào `memberships` để FK thiết bị xác nhận đúng chủ.

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  membership_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('slip_sent','report_published','homework_assigned','score_updated')),
  event_key TEXT NOT NULL,                         -- khoá sự kiện do server tạo, retry không tạo thêm inbox
  student_id TEXT NOT NULL,
  session_id TEXT,
  report_id TEXT,
  test_id TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT,
  deliveries_expanded_at TEXT,                    -- chỉ đặt khi đã xét hết đăng ký đủ điều kiện
  expansion_started_at TEXT,                      -- đóng băng inbox khi job mở rộng bắt đầu; NULL = chưa bắt đầu
  delivery_cursor TEXT,                            -- keyset paging: device_tokens.id cuối đã xét
  expansion_lease_id TEXT,                        -- cron đang giữ quyền mở rộng inbox này
  expansion_lease_until TEXT,
  ready_at TEXT NOT NULL,                         -- điểm: thời điểm thay đổi cuối + 5 phút
  group_key TEXT,                                -- điểm: membership + student + test, server dựng
  event_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (membership_id, event_key),
  UNIQUE (id, membership_id),
  FOREIGN KEY (workspace_id, membership_id, user_id) REFERENCES memberships(workspace_id, id, user_id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (workspace_id, report_id) REFERENCES reports(workspace_id, id),
  FOREIGN KEY (workspace_id, test_id) REFERENCES tests(workspace_id, id)
);
CREATE INDEX notifications_user ON notifications(membership_id, id DESC);
CREATE INDEX notifications_pending ON notifications(ready_at, id) WHERE deliveries_expanded_at IS NULL;
-- nhóm mở = chưa đóng băng; job đã freeze thì lần nhập điểm mới tạo nhóm mới (không kéo ready_at/cursor của job đang chạy)
CREATE UNIQUE INDEX notifications_open_group ON notifications(membership_id, group_key)
  WHERE group_key IS NOT NULL AND expansion_started_at IS NULL;

CREATE TABLE device_tokens (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  membership_id TEXT NOT NULL,
  auth_session_id TEXT NOT NULL REFERENCES auth_sessions(id),
  token TEXT NOT NULL UNIQUE CHECK (length(token) BETWEEN 1 AND 4096),
  platform TEXT NOT NULL CHECK (platform IN ('ios','web')),
  registration_version INTEGER NOT NULL DEFAULT 1,  -- thế hệ binding; chỉ tăng khi đổi user/membership/phiên
  bound_at TEXT NOT NULL,                          -- thời điểm binding hiện hành được lập; mốc xét fanout
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, membership_id),
  FOREIGN KEY (workspace_id, membership_id, user_id) REFERENCES memberships(workspace_id, id, user_id)
);
-- keyset paging fanout: WHERE membership_id = ? AND bound_at <= ? AND id > ? ORDER BY id
CREATE INDEX device_tokens_member ON device_tokens(membership_id, id);
CREATE INDEX device_tokens_session ON device_tokens(auth_session_id);

CREATE TABLE push_deliveries (
  notification_id INTEGER NOT NULL,
  membership_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  registration_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  lease_id TEXT,
  lease_until TEXT,
  sent_at TEXT,
  error_code TEXT,                               -- mã đã lọc; không response FCM/token/payload
  PRIMARY KEY (notification_id, device_id),
  FOREIGN KEY (notification_id, membership_id) REFERENCES notifications(id, membership_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id, membership_id) REFERENCES device_tokens(id, membership_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX push_deliveries_due ON push_deliveries(status, next_attempt_at);

CREATE TABLE fcm_oauth_cache (
  project_id TEXT PRIMARY KEY,
  credential_key_id TEXT NOT NULL,               -- vô hiệu cache khi xoay service account
  access_token TEXT,                             -- chỉ nội bộ Worker, không sync/log
  refresh_at TEXT,
  expires_at TEXT,
  lease_id TEXT,
  lease_until TEXT
);
```

- Tầng `db` kiểm `auth_session_id` thuộc user đăng nhập, membership thuộc user và đang hoạt động. **Hai loại ghi khác nhau:** (a) *làm mới cùng binding* (cùng `user_id` + `membership_id` + `auth_session_id`) chỉ cập nhật `updated_at`/`token`; **không** tăng `registration_version`, **không** đổi `bound_at`, không xoá deliveries ⇒ thiết bị không mất quyền nhận job đang chạy; (b) *đổi binding* (chuyển chủ, đổi membership, phiên khác) bump `registration_version`, đặt `bound_at = now`, xoá deliveries cũ, tất cả trong cùng batch (không chỉ đổi FK gây lỗi); thiết bị cũ không được xoá bản đăng ký mới. Đổi token do SDK: client gỡ device cũ rồi đăng ký token mới (binding mới). Đăng xuất/thu hồi phiên gỡ các device token gắn với phiên đó, cascade deliveries; không xoá thiết bị thuộc phiên khác.
- **Đổi danh tính cần mạng + xác nhận máy chủ trước khi client đổi UI/cache** (sửa C-01/R-01): `PUT /session/membership` ghi `auth_sessions.membership_id` mới **và** `DELETE device_tokens WHERE auth_session_id = <phiên hiện tại>` (cascade deliveries) trong **cùng batch**, trả 200 sau khi batch xong; `POST /auth/logout` làm tương tự rồi thu hồi phiên, trả 204. Thiết bị/phiên khác của cùng user không bị gỡ. Client chỉ đổi danh tính sau khi nhận 200/204, rồi đăng ký lại token theo membership mới; chưa có quyền push không cản dùng app. Đổi tài khoản: thu hồi phiên/đăng ký cũ xong mới kích hoạt tài khoản mới. Không đưa thao tác này vào outbox nghiệp vụ; offline thì giữ identity hiện tại và báo cần mạng.
- Inbox tạo cùng batch với thay đổi nghiệp vụ, mỗi học sinh gửi tới membership phụ huynh được liên kết và có quyền đọc nhóm tương ứng. `event_key`: phiếu theo em/buổi; báo cáo theo publication; BTVN theo lệnh lưu tạo/giao; điểm theo lệnh thay đổi giá trị. Retry/noop không tạo sự kiện mới. Sửa phiếu/kết quả chấm sau gửi không tạo thông báo riêng. Gộp đã chốt: điểm có group_key theo membership + em + bài, UPSERT nhóm chưa mở rộng, tăng event_version và đặt ready_at = thời gian server commit mới nhất + 5 phút; giữ cùng inbox, retry/noop không đẩy hạn. Khi cron mở rộng nhóm chỉ thực hiện nếu ready_at đã tới và event_version vẫn đúng bản vừa đọc; đổi hạn giữa chừng thì claim thất bại, chờ lần sau. Sau mở rộng, lần nhập tiếp tạo nhóm mới. BTVN dùng command_id của `homework.assign` cho cả 1..4 phần trong một lần giao, ready_at = thời gian commit; chỉnh tiêu đề/mô tả phần đã giao không tạo sự kiện mới.
- **Mở rộng inbox hai pha, có trần cứng** (sửa R-02). Pha 1 — *freeze*: cron claim inbox (`ready_at <= now`) bằng `UPDATE … SET expansion_started_at = :now, expansion_lease_id = :lease, expansion_lease_until = :now+60s WHERE id = :id AND deliveries_expanded_at IS NULL AND (expansion_lease_until IS NULL OR expansion_lease_until < :now) RETURNING …`. Đặt `expansion_started_at` **đúng một lần**: từ đó nhóm điểm đóng, lần nhập điểm mới UPSERT vào nhóm khác (chỉ mục `notifications_open_group` loại dòng đã freeze) nên không kéo `ready_at`/`cursor`/`event_version` của job đang chạy. Pha 2 — *fanout*: keyset paging `ORDER BY device_tokens.id LIMIT n` với `delivery_cursor` lưu trong D1; mỗi invocation xét **tối đa 5 inbox và tổng 20 đăng ký thiết bị** (kể cả đăng ký bị bỏ qua), `INSERT OR IGNORE` deliveries, cập nhật `delivery_cursor` trong cùng batch; không nạp toàn bộ token của một inbox vào RAM rồi mới cắt. Chỉ đặt `deliveries_expanded_at` khi trang cuối đã xét hết đăng ký đủ điều kiện (và xoá lease); hết ngân sách giữa chừng thì để cron sau tiếp tục từ `delivery_cursor`. Chỉ chủ `expansion_lease_id` được đẩy cursor/đánh dấu xong.
- **Điều kiện đăng ký đủ điều kiện khi fanout** (chốt mốc theo binding hiện hành): `device_tokens.membership_id = notifications.membership_id`, `bound_at <= notifications.created_at` (chuyển chủ sau sự kiện không nhận push lịch sử; làm mới cùng binding không đổi `bound_at` nên không mất quyền), phiên `auth_sessions` của token chưa thu hồi, chưa hết hạn và có `membership_id = device_tokens.membership_id`, `user_id` khớp, membership/user còn hoạt động, cùng quyền nhóm và liên kết con. Không có đăng ký đủ điều kiện thì chỉ giữ inbox, không phát lại push cũ khi đăng ký mới. Mỗi delivery theo từng thiết bị, không dùng một cờ `pushed_at` chung để bỏ sót thiết bị khác.
- Trước mỗi lần gửi phải **đối chiếu danh tính**, không chỉ kiểm hai object đều `active` (sửa R-01): `auth_sessions` của token chưa thu hồi/chưa hết hạn, và `auth_sessions.user_id`/`auth_sessions.membership_id` **khớp chính** `device_tokens.user_id`/`device_tokens.membership_id`; lệch ⇒ `skipped`, không gọi FCM. Sau đó mới kiểm liên kết con và quyền nhóm, bài kiểm tra chưa lưu trữ, phiếu/báo cáo đã gửi, `device_tokens.registration_version` = bản đã chụp trong delivery; sai thì `skipped`. Token chuyển chủ không mang theo delivery cũ. **Giới hạn không thể hứa:** thông báo đã được FCM/OS nhận và hiển thị trước khi máy chủ ack việc thu hồi thì không thu hồi từ xa được; client xoá notification cũ khi đổi danh tính và không dùng payload làm quyền truy cập (payload chỉ có loại + ID). FCM `UNREGISTERED`: xoá đúng device/version đã gửi; `INVALID_ARGUMENT`: chỉ xoá nếu error detail FCM xác nhận registration token sai và payload đã hợp lệ, không xoá hàng loạt vì payload lỗi.
- Claim delivery bằng cập nhật có điều kiện với lease 60 giây, `RETURNING`; chỉ chủ lease cập nhật kết quả. `429`/`5xx` retry theo `Retry-After` và backoff có jitter, tối đa 5 lần; hết lần thì `failed`, inbox vẫn còn. Lỗi `401` làm mới OAuth một lần; `403`/lỗi cấu hình báo vận hành bằng mã đã lọc. Kết nối bị cắt sau FCM nhận nhưng trước ghi `sent` có thể gửi trùng; không cam kết exactly-once, client dùng notification id chống xử lý trùng.
- D1 cache OAuth không theo workspace vì một Firebase project dùng chung staging; chỉ mã gửi push truy cập. Lease và hạn cache ở `stack-and-cpu.md` mục 9. Không lưu private key/JWT assertion vào D1.

### 2.8 Đồng bộ

```sql
CREATE TABLE applied_commands (
  command_id TEXT PRIMARY KEY,                     -- UUID do client sinh; khoá idempotent
  workspace_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('applied','conflict','rejected')),
  result TEXT NOT NULL,                            -- JSON kết quả đã trả lần đầu (≤ 1 KB)
  applied_at TEXT NOT NULL
);
-- idx: CREATE INDEX applied_commands_age ON applied_commands(applied_at);   -- cron xoá dòng quá 90 ngày
-- Lệnh có created_at (client) cũ hơn 90 ngày bị từ chối `command_expired` để UUID cũ không bị áp dụng lại sau khi dòng đã bị xoá.

CREATE TABLE sync_conflicts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  entity TEXT NOT NULL CHECK (entity IN ('attendance','score','slip','homework_grade')),
  k1 TEXT NOT NULL, k2 TEXT NOT NULL,              -- khóa tự nhiên của ô
  server_value TEXT NOT NULL,                      -- JSON giá trị đang giữ
  server_version INTEGER NOT NULL,
  client_value TEXT NOT NULL,                      -- JSON giá trị của thiết bị tới sau
  client_base_version INTEGER NOT NULL,
  command_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,                     -- người gửi
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  resolved_at TEXT, resolved_by TEXT REFERENCES users(id), resolution TEXT CHECK (resolution IN ('server','client')),
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
-- idx: CREATE UNIQUE INDEX sync_conflicts_open ON sync_conflicts(entity, k1, k2) WHERE resolved_at IS NULL;   -- tối đa một xung đột mở mỗi ô
-- idx: CREATE INDEX sync_conflicts_class ON sync_conflicts(class_id, resolved_at);

CREATE TABLE change_log (                          -- nguồn của sync/pull
  seq INTEGER PRIMARY KEY AUTOINCREMENT,           -- tăng đơn điệu toàn cục
  workspace_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  k1 TEXT NOT NULL, k2 TEXT NOT NULL DEFAULT '',
  op TEXT NOT NULL CHECK (op IN ('upsert','delete')),
  class_id TEXT NOT NULL,
  student_id TEXT                                  -- NULL với thực thể mức lớp
);
-- idx: CREATE INDEX change_log_ws_seq ON change_log(workspace_id, seq);   -- kéo thay đổi: seq > cursor
```

`change_log` ghi bằng trigger AFTER INSERT/UPDATE/DELETE trên các bảng sau (không ghi từ mã ứng dụng, trừ các lần "phát lại để lộ ra", `api-spec.md` mục 6.5):

| `entity` | Bảng nguồn | `k1` | `k2` | `class_id` | `student_id` |
|---|---|---|---|---|---|
| `class` | `classes` | `id` | | `id` | |
| `student` | `students` | `id` | | `class_id` | `id` |
| `class_session` | `class_sessions` | `id` | | `class_id` | |
| `attendance` | `attendance` | `session_id` | `student_id` | `class_id` | `student_id` |
| `test` | `tests` | `id` | | `class_id` | |
| `score` | `scores` | `test_id` | `student_id` | `class_id` | `student_id` |
| `slip` | `session_comments` | `session_id` | `student_id` | `class_id` | `student_id` |
| `homework_section` | `homework_sections` | `id` | | `class_id` | |
| `homework_grade` | `homework_grades` | `section_id` | `student_id` | `class_id` | `student_id` |
| `report` | `reports` | `id` | | `class_id` | `student_id` |
| `report_publication` | `report_publications` | `id` | | `class_id` | `student_id` |
| `conflict` | `sync_conflicts` | `id` | | `class_id` | |

Cron hàng ngày xoá `change_log` cũ hơn 120 ngày và đặt `workspaces.change_floor` = `seq` nhỏ nhất còn lại. Dòng `change_log` chỉ chứa khóa, không chứa SĐT hay nội dung nhận xét.

## 3. Bảng truy vấn chính và chỉ mục

| Truy vấn | Bảng, chỉ mục dùng |
|---|---|
| Xác thực mỗi request: token → user + membership + role | `auth_sessions` UNIQUE(`token_hash`) → PK `memberships`, `users`, `roles`; quyền: `role_permissions` PK; lớp được gán: `member_classes` PK (gộp một `batch`) |
| Đăng nhập: tìm user theo SĐT; vai trò của user | `users` UNIQUE(`phone`); `memberships_user` |
| Kéo thay đổi (staff) | `change_log_ws_seq` + lọc `class_id IN (SELECT class_id FROM member_classes WHERE membership_id=?)` (PK); sau đó JOIN từng bảng thực thể bằng khóa chính |
| Kéo thay đổi (phụ huynh) | `change_log_ws_seq` + `guardian_student` PK(`user_id`,…); bảng thực thể qua khóa chính / `*_student` |
| Điểm danh một buổi; chỉnh một ô | `attendance` PK |
| Vắng 2 buổi liên tiếp, thống kê chuyên cần của em | `attendance_student` JOIN `class_sessions` PK |
| Danh sách buổi của lớp theo khoảng ngày; buổi kế tiếp chưa hủy | `class_sessions` UNIQUE(`class_id`,`date`,`start_time`) |
| Lịch theo ngày/tháng của Admin | `class_sessions_ws_date` |
| Bảng điểm lớp | `tests_class` + `scores` PK(`test_id`,…) |
| Điểm của một em | `scores_student` |
| Phiếu của một buổi; phiếu đã gửi của em | `session_comments` PK; `session_comments_student` |
| BTVN của một buổi; chấm cả lớp một phần | `homework_sections` UNIQUE(`session_id`,`kind`); `homework_grades` PK |
| Báo cáo của lớp / của em | `reports_class_month`; `reports` UNIQUE(`student_id`,`month`) |
| Báo cáo đã phát hành cho phụ huynh | `report_publications_student` |
| Liên kết phụ huynh theo SĐT | `students_phone`; `guardian_student` PK |
| Inbox thông báo | `notifications_user` |
| Kiểm lệnh đã áp dụng | `applied_commands` PK |
| Giới hạn đăng nhập | `auth_throttle` PK |

Không truy vấn nào quét toàn bảng ngoài các job cron có `WHERE` theo thời gian (có chỉ mục `applied_commands_age`; `change_log` xoá theo `seq` nhỏ nên dùng khóa chính; `auth_throttle` vài dòng).

## 4. Việc phải làm trong cùng một `batch` (tầng `worker/src/db`)

| Thao tác | Các câu trong một `batch` |
|---|---|
| Đăng ký workspace | `INSERT workspaces`, 4 `roles`, 24 `role_permissions`, `users` (nếu chưa có), `memberships` (Admin), `auth_sessions` |
| Tạo lớp | `INSERT classes`, `INSERT member_classes` (người tạo, kể cả Admin cho đồng nhất), `INSERT OR IGNORE class_sessions` cho 8 tuần. Không bump `scope_epoch`: lớp mới chưa có lịch sử nên người tạo nhận đủ qua `pull` thường (bump chỉ khi gán hoặc gỡ một lớp đã có dữ liệu) |
| Sửa lịch lặp | `DELETE` buổi `planned`+`recurring` có `date > hôm nay` và chưa có `attendance`/`session_comments`/`homework_sections`; đổi `origin='manual'` cho buổi tương lai còn dữ liệu; `INSERT OR IGNORE` buổi mới; `UPDATE classes` |
| Thêm/sửa học sinh | `INSERT/UPDATE students`; nếu có user phụ huynh đã tồn tại cho SĐT: `INSERT OR IGNORE guardian_student` + bump `scope_epoch`; đổi SĐT: `DELETE guardian_student` của em + thêm liên kết mới (nếu có user) + bump `scope_epoch` cả hai |
| Cấp mật khẩu phụ huynh | `INSERT/UPDATE users`, `INSERT OR IGNORE memberships` (role Phụ huynh của workspace) **sau** `INSERT guardian_student` cho mọi em cùng SĐT, thu hồi `auth_sessions` cũ (nếu cấp lại) |
| Lệnh đồng bộ (mỗi lệnh) | `UPDATE/INSERT` bản ghi với điều kiện `version`, rồi `INSERT applied_commands … WHERE changes() > 0`; trigger lo lịch sử và `change_log` |
| Gửi phiếu | `UPDATE session_comments`, `INSERT notifications` (mỗi phụ huynh), `INSERT change_log` phát lại các `homework_grade` vừa lộ ra |
| Phát hành báo cáo | `INSERT report_publications`, `UPDATE reports`, `INSERT notifications` |
| Đổi vai trò trên phiên (`PUT /session/membership`) | `UPDATE auth_sessions SET membership_id`; `DELETE device_tokens WHERE auth_session_id = <phiên hiện tại>` (cascade `push_deliveries`); trả 200 sau batch. Không đụng đăng ký của phiên khác |
| Đăng xuất / thu hồi phiên | `UPDATE auth_sessions SET revoked_at = now`; `DELETE device_tokens WHERE auth_session_id = <phiên đó>` (cascade deliveries); trả 204 sau batch |
| Đăng ký / làm mới device token | Cùng binding: `UPDATE updated_at` (không bump `registration_version`/`bound_at`, không xoá deliveries). Đổi binding: `UPDATE registration_version + 1, bound_at = now, user_id, membership_id, auth_session_id`, `DELETE push_deliveries` của token, `INSERT/UPDATE device_tokens` trong cùng batch |

## 5. Sinh buổi học

- Cron hàng ngày (`0 17 * * *` UTC = 00:00 giờ Việt Nam) cộng vào `generated_until` cho lớp `active` có `generated_until < hôm nay + 56 ngày`, tối đa 20 lớp mỗi lần chạy (tiếp tục lần sau) để mỗi lần chạy nằm trong giới hạn CPU. Lúc tạo lớp và sửa lịch lặp cũng sinh 8 tuần ngay.
- Chỉ sinh các ngày khớp `weekdays`, từ `max(generated_until + 1, hôm nay)`; `INSERT OR IGNORE` nhờ UNIQUE(`class_id`,`date`,`start_time`).
- Lớp `archived` không sinh thêm. Buổi lẻ (`origin='manual'`) tạo online bằng API; trùng `(class_id, date, start_time)` bị từ chối `session_exists`.

## 6. ORM và migration

**Chọn:** Drizzle ORM dùng **lúc thiết kế**, không dùng làm lớp truy vấn lúc chạy.

- `worker/src/db/schema.ts` khai bảng bằng `drizzle-orm/sqlite-core` là nguồn kiểu duy nhất. `drizzle-kit generate` sinh SQL; phần Drizzle không biểu diễn được (trigger, `CHECK` phức hợp, chỉ mục từng phần, `WITHOUT ROWID`) viết tay trong migration tùy chỉnh (`drizzle-kit generate --custom`). Migration áp dụng bằng `wrangler d1 migrations apply`. Thứ tự: `0001_schema.sql`, `0002_triggers.sql`, các file sau đánh số tăng dần; không sửa file đã áp dụng.
- Lúc chạy, `worker/src/db/*` gọi `env.DB.prepare(sql).bind(...)` và `env.DB.batch([...])` với SQL viết tay, kiểu dòng lấy bằng `import type { InferSelectModel } from 'drizzle-orm'` (chỉ kiểu, xoá khi build ⇒ không thêm byte nào).
- **Lý do (số đo thật trên Worker staging, `stack-and-cpu.md` mục 3):**
  - Kích thước bundle gzip: Hono + SQL thuần 14,7 KiB; thêm trình dựng truy vấn Drizzle 47,5 KiB (+33 KiB); thêm Zod 4 là 133,9 KiB (loại, dùng bộ kiểm hợp lệ viết tay vài trăm dòng).
  - CPU dựng 50 câu upsert điểm danh trong một `batch`: SQL thuần 1–2 ms; qua trình dựng của Drizzle 12–29 ms (vượt 10 ms). Điểm vào đồng bộ nhận tới 50 lệnh nên không thể dùng trình dựng ở đường nóng.
  - Truy vấn đồng bộ (kéo thay đổi, phạm vi phụ huynh, buổi chấm BTVN) là SQL có join và truy vấn con, viết tay dễ kiểm chỉ mục hơn.
- Phương án thay thế đã loại: Prisma/TypeORM (nặng, cần engine), Kysely (nhẹ hơn Drizzle nhưng vẫn là trình dựng ở đường nóng, ít lợi hơn raw SQL ở đây).

## 7. Ước lượng dung lượng và hạn mức D1

Giả định một lớp 20 em, 8 buổi/tháng.

| Dữ liệu mỗi lớp mỗi tháng | Số dòng ước lượng |
|---|---|
| `attendance` | 160 |
| `session_comments` | 160 |
| `homework_grades` (≤ 4 phần × 20 em × 8 buổi, ước lượng trung bình 2 phần) | 320 |
| `scores` (2 bài) | 40 |
| `change_log` (mỗi thay đổi một dòng, giả sử mỗi ô sửa 2 lần) | ~1.400 |

Khoảng 2.000 dòng nghiệp vụ mỗi lớp mỗi tháng (dưới 1 MB), D1 free 5 GB ⇒ không vấn đề dung lượng trong nhiều năm. Hạn mức **dòng ghi** (100.000/ngày, tính cả chỉ mục) là cái dễ chạm trước: một thay đổi ô ghi khoảng 4–5 dòng (bản ghi, chỉ mục phụ, `change_log` + chỉ mục, `applied_commands`, lịch sử khi sửa). Một lớp điểm danh + phiếu + chấm BTVN trong ngày học ≈ 500 thay đổi ≈ 2.500 dòng ghi; 20 lớp cùng dạy trong một ngày ≈ 50.000. Theo dõi `meta.rows_written` ở staging; xem điều kiện nâng gói ở `stack-and-cpu.md` mục 7.
