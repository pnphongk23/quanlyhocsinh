-- 0001_schema.sql — lược đồ D1 MVP theo plans/20261021-mvp/backend/data-model.md
-- Chỉ DDL: bảng, cột, CHECK, UNIQUE, khoá ngoại phức hợp, chỉ mục. Trigger ở 0002.
-- Quy ước: ID TEXT (UUID), thời gian TEXT ISO-8601 UTC, ngày TEXT 'YYYY-MM-DD',
-- SĐT chuẩn hoá '+84' + 9 chữ số, boolean INTEGER 0/1.

-- 2.1 Danh tính, workspace, quyền -------------------------------------------

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  change_floor INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE CHECK (phone GLOB '+84[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  display_name TEXT CHECK (display_name IS NULL OR length(display_name) <= 100),
  password_hash TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0,1)),
  password_changed_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

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
  UNIQUE (workspace_id, system_key),
  CHECK (scope_kind <> 'workspace' OR system_key = 'admin')
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
  scope_epoch INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (user_id, workspace_id, role_id),
  UNIQUE (workspace_id, id, user_id),
  FOREIGN KEY (workspace_id, role_id) REFERENCES roles(workspace_id, id)
);
CREATE INDEX memberships_user ON memberships(user_id, status);
CREATE INDEX memberships_role ON memberships(role_id, status);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  membership_id TEXT REFERENCES memberships(id),
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT CHECK (device_label IS NULL OR length(device_label) <= 80),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id, revoked_at);

CREATE TABLE auth_throttle (
  key TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  locked_until TEXT
);

-- 2.2 Lớp, học sinh, buổi học ------------------------------------------------

CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  weekdays INTEGER NOT NULL CHECK (weekdays BETWEEN 0 AND 127),
  start_time TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  generated_until TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id)
);
CREATE INDEX classes_ws ON classes(workspace_id, status, name);

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  parent_phone TEXT CHECK (parent_phone IS NULL OR parent_phone GLOB '+84[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  enrolled_at TEXT NOT NULL,
  left_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (class_id, id),
  CHECK ((status = 'left') = (left_at IS NOT NULL)),
  CHECK (left_at IS NULL OR left_at >= enrolled_at),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
CREATE INDEX students_class ON students(class_id, status, name);
CREATE INDEX students_phone ON students(workspace_id, parent_phone);

CREATE TABLE guardian_student (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  student_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, student_id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
) WITHOUT ROWID;
CREATE INDEX guardian_student_student ON guardian_student(student_id);

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
  cancelled_at TEXT,
  cancelled_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (class_id, id),
  UNIQUE (class_id, date, start_time),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
CREATE INDEX class_sessions_ws_date ON class_sessions(workspace_id, date);

CREATE TABLE member_classes (
  workspace_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (membership_id, class_id),
  FOREIGN KEY (workspace_id, membership_id) REFERENCES memberships(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
) WITHOUT ROWID;
CREATE INDEX member_classes_class ON member_classes(class_id);

-- 2.3 Điểm danh -------------------------------------------------------------

CREATE TABLE attendance (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','late','excused','absent')),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  late_at TEXT CHECK (late_at IS NULL OR late_at GLOB '[0-2][0-9]:[0-5][0-9]'),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (session_id, student_id),
  CHECK (status = 'late' OR late_at IS NULL),
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (class_id, session_id) REFERENCES class_sessions(class_id, id),
  FOREIGN KEY (class_id, student_id) REFERENCES students(class_id, id)
) WITHOUT ROWID;
CREATE INDEX attendance_student ON attendance(student_id, session_id);

CREATE TABLE attendance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  old_note TEXT,
  new_note TEXT,
  old_late_at TEXT,
  new_late_at TEXT,
  old_version INTEGER NOT NULL,
  new_version INTEGER NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL
);
CREATE INDEX attendance_history_cell ON attendance_history(session_id, student_id, id);

-- 2.4 Bài kiểm tra và điểm --------------------------------------------------

CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  date TEXT NOT NULL,
  max INTEGER NOT NULL DEFAULT 15 CHECK (max BETWEEN 1 AND 1000),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (class_id, id),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
CREATE INDEX tests_class ON tests(class_id, archived, date);

CREATE TABLE scores (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  value REAL CHECK (value IS NULL OR value >= 0),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (test_id, student_id),
  FOREIGN KEY (workspace_id, test_id) REFERENCES tests(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (class_id, test_id) REFERENCES tests(class_id, id) ON DELETE CASCADE,
  FOREIGN KEY (class_id, student_id) REFERENCES students(class_id, id)
) WITHOUT ROWID;
CREATE INDEX scores_student ON scores(student_id, test_id);

CREATE TABLE score_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  old_value REAL,
  new_value REAL,
  old_version INTEGER NOT NULL,
  new_version INTEGER NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL
);
CREATE INDEX score_history_cell ON score_history(test_id, student_id, id);

-- 2.5 Phiếu buổi học và BTVN -------------------------------------------------

CREATE TABLE session_comments (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  stars INTEGER CHECK (stars IS NULL OR stars BETWEEN 1 AND 3),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  sent_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (session_id, student_id),
  CHECK (status = 'draft' OR stars IS NOT NULL),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL)),
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (class_id, session_id) REFERENCES class_sessions(class_id, id),
  FOREIGN KEY (class_id, student_id) REFERENCES students(class_id, id)
) WITHOUT ROWID;
CREATE INDEX session_comments_student ON session_comments(student_id, status, session_id);

CREATE TABLE homework_sections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('vocabulary','reading','speaking','exercise')),
  title TEXT NOT NULL DEFAULT '' CHECK (length(title) <= 120),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  UNIQUE (class_id, id),
  UNIQUE (session_id, kind),
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (class_id, session_id) REFERENCES class_sessions(class_id, id)
);

CREATE TABLE homework_grades (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  level TEXT CHECK (level IS NULL OR level IN ('excellent','done','not_done')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (section_id, student_id),
  FOREIGN KEY (workspace_id, section_id) REFERENCES homework_sections(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (class_id, section_id) REFERENCES homework_sections(class_id, id) ON DELETE CASCADE,
  FOREIGN KEY (class_id, student_id) REFERENCES students(class_id, id)
) WITHOUT ROWID;
CREATE INDEX homework_grades_student ON homework_grades(student_id, section_id);

-- 2.6 Báo cáo tháng ----------------------------------------------------------

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  general_comment TEXT NOT NULL DEFAULT '' CHECK (length(general_comment) <= 4000),
  needs_republish INTEGER NOT NULL DEFAULT 0 CHECK (needs_republish IN (0,1)),
  publication_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  UNIQUE (workspace_id, id),
  UNIQUE (student_id, month),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id)
);
CREATE INDEX reports_class_month ON reports(class_id, month);

CREATE TABLE report_publications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  month TEXT NOT NULL,
  publication_no INTEGER NOT NULL CHECK (publication_no >= 1),
  snapshot TEXT NOT NULL,
  pdf_key TEXT,
  pdf_bytes INTEGER,
  published_by TEXT NOT NULL REFERENCES users(id),
  published_at TEXT NOT NULL,
  UNIQUE (report_id, publication_no),
  FOREIGN KEY (workspace_id, report_id) REFERENCES reports(workspace_id, id)
);
CREATE INDEX report_publications_student ON report_publications(student_id, month);

-- 2.7 Thông báo và push ------------------------------------------------------

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  membership_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('slip_sent','report_published','homework_assigned','score_updated')),
  event_key TEXT NOT NULL,
  student_id TEXT NOT NULL,
  session_id TEXT,
  report_id TEXT,
  test_id TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT,
  deliveries_expanded_at TEXT,
  expansion_started_at TEXT,
  delivery_cursor TEXT,
  expansion_lease_id TEXT,
  expansion_lease_until TEXT,
  ready_at TEXT NOT NULL,
  group_key TEXT,
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
  registration_version INTEGER NOT NULL DEFAULT 1,
  bound_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, membership_id),
  FOREIGN KEY (workspace_id, membership_id, user_id) REFERENCES memberships(workspace_id, id, user_id)
);
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
  error_code TEXT,
  PRIMARY KEY (notification_id, device_id),
  FOREIGN KEY (notification_id, membership_id) REFERENCES notifications(id, membership_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id, membership_id) REFERENCES device_tokens(id, membership_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX push_deliveries_due ON push_deliveries(status, next_attempt_at);

CREATE TABLE fcm_oauth_cache (
  project_id TEXT PRIMARY KEY,
  credential_key_id TEXT NOT NULL,
  access_token TEXT,
  refresh_at TEXT,
  expires_at TEXT,
  lease_id TEXT,
  lease_until TEXT
);

-- 2.8 Đồng bộ ----------------------------------------------------------------

CREATE TABLE applied_commands (
  command_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('applied','conflict','rejected')),
  result TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE INDEX applied_commands_age ON applied_commands(applied_at);

CREATE TABLE sync_conflicts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  entity TEXT NOT NULL CHECK (entity IN ('attendance','score','slip','homework_grade')),
  k1 TEXT NOT NULL,
  k2 TEXT NOT NULL,
  server_value TEXT NOT NULL,
  server_version INTEGER NOT NULL,
  client_value TEXT NOT NULL,
  client_base_version INTEGER NOT NULL,
  command_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT REFERENCES users(id),
  resolution TEXT CHECK (resolution IN ('server','client')),
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
CREATE UNIQUE INDEX sync_conflicts_open ON sync_conflicts(entity, k1, k2) WHERE resolved_at IS NULL;
CREATE INDEX sync_conflicts_class ON sync_conflicts(class_id, resolved_at);

CREATE TABLE change_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  k1 TEXT NOT NULL,
  k2 TEXT NOT NULL DEFAULT '',
  op TEXT NOT NULL CHECK (op IN ('upsert','delete')),
  class_id TEXT NOT NULL,
  student_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX change_log_ws_seq ON change_log(workspace_id, seq);
CREATE INDEX change_log_age ON change_log(created_at);
