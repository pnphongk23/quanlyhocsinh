-- Xoá mềm đợt báo cáo: ẩn khỏi giáo viên và phụ huynh, giữ nguyên dữ liệu và bản chụp phát hành.
-- Rollback: ALTER TABLE report_batches DROP COLUMN deleted_by; ALTER TABLE report_batches DROP COLUMN deleted_at;
ALTER TABLE report_batches ADD COLUMN deleted_at TEXT;
ALTER TABLE report_batches ADD COLUMN deleted_by TEXT;
