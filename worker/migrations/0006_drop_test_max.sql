-- Bỏ điểm tối đa của bài kiểm tra: xoá tests.max cùng các trigger phụ thuộc.
-- Điểm vẫn trong khoảng 0..1000 (bước 0,5 do tầng ứng dụng kiểm); trigger dưới đây là lớp chặn cuối.
-- Rollback: ALTER TABLE tests ADD COLUMN max INTEGER NOT NULL DEFAULT 15 CHECK (max BETWEEN 1 AND 1000);
-- giá trị cũ chỉ khôi phục được từ bản export D1 chụp trước khi chạy.

DROP TRIGGER scores_max_guard_ins;
DROP TRIGGER scores_max_guard_upd;
DROP TRIGGER tests_max_guard;
DROP TRIGGER tests_republish_au;

ALTER TABLE tests DROP COLUMN max;

CREATE TRIGGER scores_range_guard_ins
BEFORE INSERT ON scores
WHEN NEW.value IS NOT NULL AND NEW.value > 1000
BEGIN
  SELECT RAISE(ABORT, 'score_out_of_range');
END;

CREATE TRIGGER scores_range_guard_upd
BEFORE UPDATE OF value ON scores
WHEN NEW.value IS NOT NULL AND NEW.value > 1000
BEGIN
  SELECT RAISE(ABORT, 'score_out_of_range');
END;

CREATE TRIGGER tests_republish_au
AFTER UPDATE OF archived, date ON tests
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
