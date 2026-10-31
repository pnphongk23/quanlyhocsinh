-- Existing excused attendance becomes absent under the three-state attendance contract.
-- Rebuild to remove the old status/late_at coupling so legacy late_at values stay untouched.
CREATE TABLE attendance_new (
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
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (class_id, session_id) REFERENCES class_sessions(class_id, id),
  FOREIGN KEY (class_id, student_id) REFERENCES students(class_id, id)
) WITHOUT ROWID;

INSERT INTO attendance_new (workspace_id,class_id,session_id,student_id,status,note,late_at,version,created_at,updated_at,updated_by)
SELECT workspace_id,class_id,session_id,student_id,status,note,late_at,version,created_at,updated_at,updated_by FROM attendance;
DROP TABLE attendance;
ALTER TABLE attendance_new RENAME TO attendance;
CREATE INDEX attendance_student ON attendance(student_id, session_id);

CREATE TRIGGER attendance_immutable_keys
BEFORE UPDATE OF class_id ON attendance
WHEN NEW.class_id IS NOT OLD.class_id
BEGIN
  SELECT RAISE(ABORT, 'immutable_keys');
END;

CREATE TRIGGER attendance_history_ai
AFTER UPDATE ON attendance
WHEN OLD.status IS NOT NEW.status OR OLD.note IS NOT NEW.note OR OLD.late_at IS NOT NEW.late_at
BEGIN
  INSERT INTO attendance_history (
    workspace_id, session_id, student_id, old_status, new_status, old_note, new_note,
    old_late_at, new_late_at, old_version, new_version, changed_by, changed_at
  ) VALUES (
    NEW.workspace_id, NEW.session_id, NEW.student_id, OLD.status, NEW.status, OLD.note, NEW.note,
    OLD.late_at, NEW.late_at, OLD.version, NEW.version, NEW.updated_by, NEW.updated_at
  );
END;

CREATE TRIGGER change_log_attendance_ai AFTER INSERT ON attendance BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'attendance', NEW.session_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_attendance_au AFTER UPDATE ON attendance BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'attendance', NEW.session_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_attendance_ad AFTER DELETE ON attendance BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'attendance', OLD.session_id, OLD.student_id, 'delete', OLD.class_id, OLD.student_id, CAST(strftime('%s','now') AS INTEGER));
END;

UPDATE attendance
SET status = 'absent',
    version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE status = 'excused';

-- Rollback: restore from a D1 export captured before applying this migration.
