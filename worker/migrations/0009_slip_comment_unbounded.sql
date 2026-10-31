-- Câu nhận xét của phiếu không giới hạn độ dài: dựng lại session_comments không còn CHECK length(comment) <= 300.
-- Dữ liệu và trigger giữ nguyên. Rollback: khôi phục từ bản export D1 chụp trước khi chạy.

CREATE TABLE session_comments_new (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  stars INTEGER CHECK (stars IS NULL OR stars BETWEEN 0 AND 5),
  scale INTEGER NOT NULL DEFAULT 5 CHECK (scale IN (3, 5)),
  criteria INTEGER CHECK (criteria IS NULL OR criteria BETWEEN 0 AND 31),
  comment TEXT,
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
  CHECK (scale = 5 OR (criteria IS NULL AND comment IS NULL AND (stars IS NULL OR stars BETWEEN 1 AND 3))),
  CHECK (scale = 3 OR (criteria IS NOT NULL AND stars IS NOT NULL)),
  FOREIGN KEY (workspace_id, session_id) REFERENCES class_sessions(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (class_id, session_id) REFERENCES class_sessions(class_id, id),
  FOREIGN KEY (class_id, student_id) REFERENCES students(class_id, id)
) WITHOUT ROWID;

INSERT INTO session_comments_new
  (workspace_id, class_id, session_id, student_id, stars, scale, criteria, comment, note, status, sent_at,
   version, created_at, updated_at, updated_by)
SELECT workspace_id, class_id, session_id, student_id, stars, scale, criteria, comment, note, status, sent_at,
   version, created_at, updated_at, updated_by
FROM session_comments;

DROP TABLE session_comments;
ALTER TABLE session_comments_new RENAME TO session_comments;
CREATE INDEX session_comments_student ON session_comments(student_id, status, session_id);

CREATE TRIGGER session_comments_immutable_keys
BEFORE UPDATE OF class_id ON session_comments
WHEN NEW.class_id IS NOT OLD.class_id
BEGIN
  SELECT RAISE(ABORT, 'immutable_keys');
END;

CREATE TRIGGER comment_no_unsend
BEFORE UPDATE ON session_comments
WHEN OLD.status = 'sent' AND NEW.status = 'draft'
BEGIN
  SELECT RAISE(ABORT, 'cannot_unsend');
END;

CREATE TRIGGER change_log_slip_ai AFTER INSERT ON session_comments BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'slip', NEW.session_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_slip_au AFTER UPDATE ON session_comments BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'slip', NEW.session_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_slip_ad AFTER DELETE ON session_comments BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'slip', OLD.session_id, OLD.student_id, 'delete', OLD.class_id, OLD.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
