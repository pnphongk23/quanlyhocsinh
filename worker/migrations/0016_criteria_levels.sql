-- THỬ NGHIỆM (cờ Worker `CRITERIA_LEVELS`): 5 tiêu chí 3 mức, "Hôm nay học", kỹ năng chấm thêm.
-- Chỉ THÊM cột NULL-able bằng ALTER TABLE; không dựng lại bảng, không ràng buộc CHECK mới
-- (mã kiểm giá trị), trigger `change_log_slip_*` / `change_log_session_*` và bump `version` giữ nguyên.
-- Ý nghĩa cột: xem plans/20261104-criteria-levels/contract.md mục 2.
--   session_comments.levels       JSON object đủ 5 khoá tiêu chí -> mức; NULL = phiếu kiểu cũ.
--   session_comments.skill_levels JSON object {kỹ năng: mức}; NULL hoặc {}.
--   class_sessions.today_topics   JSON array khoá kỹ năng của buổi ("Hôm nay học").
--   class_sessions.graded_skills  JSON array con của today_topics (kỹ năng bật "Chấm riêng").
--
-- ROLLBACK: D1/SQLite không bỏ được một cột riêng lẻ, nên file này KHÔNG có câu rollback tại chỗ.
--   Cách khôi phục (như 0006/0008/0009/0010): export trước khi chạy rồi import lại
--   `npx wrangler d1 export <db> --remote --output qlh-<env>-pre-0016-<YYYYMMDD>.sql`.
--   Bốn cột đều NULL-able nên bản Worker cũ (không biết các cột này) vẫn đọc/ghi bình thường,
--   vì vậy rollback mã không bắt buộc khôi phục DB.
-- Chưa chạy staging/prod khi viết file này.
ALTER TABLE session_comments ADD COLUMN levels TEXT;
ALTER TABLE session_comments ADD COLUMN skill_levels TEXT;
ALTER TABLE class_sessions ADD COLUMN today_topics TEXT;
ALTER TABLE class_sessions ADD COLUMN graded_skills TEXT;
