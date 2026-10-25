-- Xoá mềm đợt báo cáo: ẩn khỏi giáo viên và phụ huynh, giữ nguyên dữ liệu và bản chụp phát hành.
-- Rollback: ALTER TABLE report_batches DROP COLUMN deleted_by; ALTER TABLE report_batches DROP COLUMN deleted_at;
ALTER TABLE report_batches ADD COLUMN deleted_at TEXT;
ALTER TABLE report_batches ADD COLUMN deleted_by TEXT;

-- Phát hành đang chạy không được ghi bản chụp vào đợt vừa bị xoá: cả lô phát hành bị huỷ.
CREATE TRIGGER report_publications_batch_alive
BEFORE INSERT ON report_publications
WHEN EXISTS (SELECT 1 FROM report_batches b WHERE b.id = NEW.batch_id AND b.deleted_at IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'report_batch_deleted');
END;

-- Điểm/bài đổi không đánh dấu "cần phát hành lại" trên đợt đã xoá (tránh log đồng bộ thừa).
DROP TRIGGER scores_republish_ai;
DROP TRIGGER scores_republish_au;
DROP TRIGGER tests_republish_au;

CREATE TRIGGER scores_republish_ai
AFTER INSERT ON scores
WHEN NEW.value IS NOT NULL
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE student_id = NEW.student_id
    AND status = 'published'
    AND batch_id IN (
      SELECT b.id FROM report_batches b, tests t
      WHERE t.id = NEW.test_id AND b.deleted_at IS NULL
        AND substr(b.from_key, 1, 10) <= t.date AND t.date <= substr(b.to_key, 1, 10)
    );
END;

CREATE TRIGGER scores_republish_au
AFTER UPDATE ON scores
WHEN OLD.value IS NOT NEW.value
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE student_id = NEW.student_id
    AND status = 'published'
    AND batch_id IN (
      SELECT b.id FROM report_batches b, tests t
      WHERE t.id = NEW.test_id AND b.deleted_at IS NULL
        AND substr(b.from_key, 1, 10) <= t.date AND t.date <= substr(b.to_key, 1, 10)
    );
END;

CREATE TRIGGER tests_republish_au
AFTER UPDATE OF archived, date ON tests
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE class_id = NEW.class_id
    AND status = 'published'
    AND batch_id IN (
      SELECT b.id FROM report_batches b
      WHERE b.class_id = NEW.class_id AND b.deleted_at IS NULL
        AND ((substr(b.from_key, 1, 10) <= OLD.date AND OLD.date <= substr(b.to_key, 1, 10))
          OR (substr(b.from_key, 1, 10) <= NEW.date AND NEW.date <= substr(b.to_key, 1, 10)))
    );
END;
