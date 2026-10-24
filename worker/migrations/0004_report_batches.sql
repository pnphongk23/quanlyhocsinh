-- Báo cáo theo khoảng buổi: mỗi đợt (report_batches) gom một khoảng buổi của lớp,
-- mỗi học sinh có tối đa một báo cáo trong đợt. Bảng reports được dựng lại để bỏ
-- UNIQUE(student_id, month) và thêm batch_id. `month` vẫn luôn có giá trị
-- (đợt mới = tháng của buổi kết thúc).

-- Xoá bảng cha khi bảng con còn dòng tham chiếu làm commit thất bại dù đã hoãn khoá ngoại,
-- nên bản chụp và thông báo được gỡ khỏi reports tạm thời rồi nạp lại sau khi dựng bảng.
PRAGMA defer_foreign_keys = true;

-- Trigger đọc/ghi reports hoặc report_publications phải bỏ trước khi dựng lại bảng.
DROP TRIGGER scores_republish_ai;
DROP TRIGGER scores_republish_au;
DROP TRIGGER tests_republish_au;
DROP TRIGGER report_publication_immutable_upd;
DROP TRIGGER report_publication_immutable_del;
DROP TRIGGER change_log_publication_ad;
DROP TRIGGER change_log_report_ai;
DROP TRIGGER change_log_report_au;
DROP TRIGGER change_log_report_ad;

CREATE TABLE report_batches (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  from_session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
  to_session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
  from_key TEXT NOT NULL CHECK (length(from_key) = 16 AND substr(from_key, 11, 1) = ' '),
  to_key TEXT NOT NULL CHECK (length(to_key) = 16 AND substr(to_key, 11, 1) = ' '),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
);
CREATE INDEX report_batches_class ON report_batches(class_id, to_key);

-- Dữ liệu cũ: mỗi (workspace, lớp, tháng) có báo cáo ⇒ một đợt phủ cả tháng.
CREATE TABLE report_batch_map (
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  month TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  PRIMARY KEY (workspace_id, class_id, month)
);
INSERT INTO report_batch_map (workspace_id, class_id, month, batch_id)
SELECT workspace_id, class_id, month,
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2)
  || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2)
  || '-' || lower(hex(randomblob(6)))
FROM reports GROUP BY workspace_id, class_id, month;

INSERT INTO report_batches (id, workspace_id, class_id, from_session_id, to_session_id, from_key, to_key, created_by, created_at, version)
SELECT m.batch_id, m.workspace_id, m.class_id, NULL, NULL,
  m.month || '-01 00:00', m.month || '-31 23:59',
  (SELECT c.created_by FROM classes c WHERE c.workspace_id = m.workspace_id AND c.id = m.class_id),
  (SELECT MIN(r.created_at) FROM reports r WHERE r.workspace_id = m.workspace_id AND r.class_id = m.class_id AND r.month = m.month),
  1
FROM report_batch_map m;

CREATE TABLE reports_new (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
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
  UNIQUE (batch_id, student_id),
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id),
  FOREIGN KEY (workspace_id, student_id) REFERENCES students(workspace_id, id),
  FOREIGN KEY (workspace_id, batch_id) REFERENCES report_batches(workspace_id, id)
);

INSERT INTO reports_new (id, workspace_id, class_id, student_id, batch_id, month, status, general_comment,
  needs_republish, publication_count, published_at, version, created_at, updated_at, updated_by)
SELECT r.id, r.workspace_id, r.class_id, r.student_id, m.batch_id, r.month, r.status, r.general_comment,
  r.needs_republish, r.publication_count, r.published_at, r.version, r.created_at, r.updated_at, r.updated_by
FROM reports r
JOIN report_batch_map m ON m.workspace_id = r.workspace_id AND m.class_id = r.class_id AND m.month = r.month;

ALTER TABLE report_publications ADD COLUMN batch_id TEXT;

CREATE TABLE report_publications_stash AS SELECT * FROM report_publications;
CREATE TABLE report_notification_stash AS SELECT id, report_id FROM notifications WHERE report_id IS NOT NULL;
UPDATE notifications SET report_id = NULL WHERE id IN (SELECT id FROM report_notification_stash);
DELETE FROM report_publications;

DROP TABLE reports;
ALTER TABLE reports_new RENAME TO reports;
CREATE INDEX reports_class_month ON reports(class_id, month);
CREATE INDEX reports_student ON reports(student_id);

INSERT INTO report_publications (id, workspace_id, class_id, student_id, report_id, month, publication_no, snapshot,
  pdf_key, pdf_bytes, published_by, published_at, batch_id)
SELECT p.id, p.workspace_id, p.class_id, p.student_id, p.report_id, p.month, p.publication_no, p.snapshot,
  p.pdf_key, p.pdf_bytes, p.published_by, p.published_at, r.batch_id
FROM report_publications_stash p JOIN reports r ON r.id = p.report_id;
UPDATE notifications SET report_id = (SELECT n.report_id FROM report_notification_stash n WHERE n.id = notifications.id)
WHERE id IN (SELECT id FROM report_notification_stash);

DROP TABLE report_publications_stash;
DROP TABLE report_notification_stash;
DROP TABLE report_batch_map;

-- Bản chụp bất biến, thêm batch_id vào các cột không đổi.
CREATE TRIGGER report_publication_immutable_upd
BEFORE UPDATE ON report_publications
WHEN NOT (
  OLD.pdf_key IS NULL
  AND NEW.pdf_key IS NOT NULL
  AND NEW.id IS OLD.id
  AND NEW.workspace_id IS OLD.workspace_id
  AND NEW.class_id IS OLD.class_id
  AND NEW.student_id IS OLD.student_id
  AND NEW.report_id IS OLD.report_id
  AND NEW.batch_id IS OLD.batch_id
  AND NEW.month IS OLD.month
  AND NEW.publication_no IS OLD.publication_no
  AND NEW.snapshot IS OLD.snapshot
  AND NEW.published_by IS OLD.published_by
  AND NEW.published_at IS OLD.published_at
)
BEGIN
  SELECT RAISE(ABORT, 'publication_immutable');
END;

CREATE TRIGGER report_publication_immutable_del
BEFORE DELETE ON report_publications
BEGIN
  SELECT RAISE(ABORT, 'publication_immutable');
END;

CREATE TRIGGER change_log_publication_ad AFTER DELETE ON report_publications BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'report_publication', OLD.id, '', 'delete', OLD.class_id, OLD.student_id, CAST(strftime('%s','now') AS INTEGER));
END;

-- Điểm hoặc bài kiểm tra đổi ⇒ báo cáo đã phát hành của đợt có ngày bài kiểm tra nằm trong khoảng cần phát hành lại.
CREATE TRIGGER scores_republish_ai
AFTER INSERT ON scores
WHEN NEW.value IS NOT NULL
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE student_id = NEW.student_id
    AND status = 'published'
    AND batch_id IN (
      SELECT b.id FROM report_batches b, tests t
      WHERE t.id = NEW.test_id
        AND substr(b.from_key, 1, 10) <= t.date AND t.date <= substr(b.to_key, 1, 10)
    );
END;

CREATE TRIGGER scores_republish_au
AFTER UPDATE ON scores
WHEN NEW.value IS NOT NULL
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE student_id = NEW.student_id
    AND status = 'published'
    AND batch_id IN (
      SELECT b.id FROM report_batches b, tests t
      WHERE t.id = NEW.test_id
        AND substr(b.from_key, 1, 10) <= t.date AND t.date <= substr(b.to_key, 1, 10)
    );
END;

CREATE TRIGGER tests_republish_au
AFTER UPDATE OF archived, date, max ON tests
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE class_id = NEW.class_id
    AND status = 'published'
    AND batch_id IN (
      SELECT b.id FROM report_batches b
      WHERE b.class_id = NEW.class_id
        AND ((substr(b.from_key, 1, 10) <= OLD.date AND OLD.date <= substr(b.to_key, 1, 10))
          OR (substr(b.from_key, 1, 10) <= NEW.date AND NEW.date <= substr(b.to_key, 1, 10)))
    );
END;

CREATE TRIGGER change_log_report_ai AFTER INSERT ON reports BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'report', NEW.id, '', 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_report_au AFTER UPDATE ON reports BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'report', NEW.id, '', 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_report_ad AFTER DELETE ON reports BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'report', OLD.id, '', 'delete', OLD.class_id, OLD.student_id, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_report_batch_ai AFTER INSERT ON report_batches BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'report_batch', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_report_batch_au AFTER UPDATE ON report_batches BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'report_batch', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_report_batch_ad AFTER DELETE ON report_batches BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'report_batch', OLD.id, '', 'delete', OLD.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;

-- Máy khách đang đồng bộ cần thấy batch_id của dữ liệu đã chuyển.
INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
SELECT workspace_id, 'report_batch', id, '', 'upsert', class_id, NULL, CAST(strftime('%s','now') AS INTEGER) FROM report_batches;
INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
SELECT workspace_id, 'report', id, '', 'upsert', class_id, student_id, CAST(strftime('%s','now') AS INTEGER) FROM reports;
