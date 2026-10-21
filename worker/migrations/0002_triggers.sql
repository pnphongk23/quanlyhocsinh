-- 0002_triggers.sql — trigger theo data-model.md (mục 1, 2.1–2.8).
-- Mã lỗi dùng RAISE(ABORT, '<mã>') để tầng worker/src/db ánh xạ sang lỗi API.

-- 1) Chặn cột phi chuẩn hoá class_id bị đổi sau khi tạo (4 loại "ô") ----------

CREATE TRIGGER attendance_immutable_keys
BEFORE UPDATE OF class_id ON attendance
WHEN NEW.class_id IS NOT OLD.class_id
BEGIN
  SELECT RAISE(ABORT, 'immutable_keys');
END;

CREATE TRIGGER scores_immutable_keys
BEFORE UPDATE OF class_id ON scores
WHEN NEW.class_id IS NOT OLD.class_id
BEGIN
  SELECT RAISE(ABORT, 'immutable_keys');
END;

CREATE TRIGGER session_comments_immutable_keys
BEFORE UPDATE OF class_id ON session_comments
WHEN NEW.class_id IS NOT OLD.class_id
BEGIN
  SELECT RAISE(ABORT, 'immutable_keys');
END;

CREATE TRIGGER homework_grades_immutable_keys
BEFORE UPDATE OF class_id ON homework_grades
WHEN NEW.class_id IS NOT OLD.class_id
BEGIN
  SELECT RAISE(ABORT, 'immutable_keys');
END;

-- 2.1 Quyền: chặn role phụ huynh vượt mức, chặn sửa role hệ thống, chặn gán
--     lớp cho phụ huynh, chặn bỏ Admin cuối cùng, chặn membership phụ huynh
--     không có liên kết con.

CREATE TRIGGER role_perm_guardian_cap_ins
BEFORE INSERT ON role_permissions
WHEN EXISTS (SELECT 1 FROM roles WHERE id = NEW.role_id AND scope_kind = 'linked_students')
  AND (
    NEW.level = 'write'
    OR (NEW.perm_group IN ('classes','students') AND NEW.level <> 'none')
  )
BEGIN
  SELECT RAISE(ABORT, 'guardian_role_cap');
END;

CREATE TRIGGER role_perm_guardian_cap_upd
BEFORE UPDATE ON role_permissions
WHEN EXISTS (SELECT 1 FROM roles WHERE id = NEW.role_id AND scope_kind = 'linked_students')
  AND (
    NEW.level = 'write'
    OR (NEW.perm_group IN ('classes','students') AND NEW.level <> 'none')
  )
BEGIN
  SELECT RAISE(ABORT, 'guardian_role_cap');
END;

CREATE TRIGGER role_perm_admin_locked_upd
BEFORE UPDATE ON role_permissions
WHEN EXISTS (SELECT 1 FROM roles WHERE id = OLD.role_id AND is_system = 1)
BEGIN
  SELECT RAISE(ABORT, 'system_role_locked');
END;

CREATE TRIGGER role_perm_admin_locked_del
BEFORE DELETE ON role_permissions
WHEN EXISTS (SELECT 1 FROM roles WHERE id = OLD.role_id AND is_system = 1)
BEGIN
  SELECT RAISE(ABORT, 'system_role_locked');
END;

CREATE TRIGGER role_system_locked_upd
BEFORE UPDATE ON roles
WHEN OLD.is_system = 1
BEGIN
  SELECT RAISE(ABORT, 'system_role_locked');
END;

CREATE TRIGGER role_system_locked_del
BEFORE DELETE ON roles
WHEN OLD.is_system = 1
BEGIN
  SELECT RAISE(ABORT, 'system_role_locked');
END;

CREATE TRIGGER role_scope_frozen_upd
BEFORE UPDATE OF scope_kind ON roles
WHEN NEW.scope_kind IS NOT OLD.scope_kind
BEGIN
  SELECT RAISE(ABORT, 'system_role_locked');
END;

CREATE TRIGGER membership_guardian_needs_link
BEFORE INSERT ON memberships
WHEN EXISTS (SELECT 1 FROM roles WHERE id = NEW.role_id AND scope_kind = 'linked_students')
  AND NOT EXISTS (
    SELECT 1 FROM guardian_student
    WHERE user_id = NEW.user_id AND workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(ABORT, 'guardian_without_link');
END;

CREATE TRIGGER membership_last_admin_upd
BEFORE UPDATE OF status, role_id ON memberships
WHEN OLD.status = 'active'
  AND EXISTS (SELECT 1 FROM roles WHERE id = OLD.role_id AND system_key = 'admin')
  AND (NEW.status IS NOT 'active' OR NEW.role_id IS NOT OLD.role_id)
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    JOIN roles r ON r.id = m.role_id
    WHERE m.workspace_id = OLD.workspace_id
      AND m.status = 'active'
      AND r.system_key = 'admin'
      AND m.id <> OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'last_admin');
END;

CREATE TRIGGER membership_last_admin_del
BEFORE DELETE ON memberships
WHEN OLD.status = 'active'
  AND EXISTS (SELECT 1 FROM roles WHERE id = OLD.role_id AND system_key = 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    JOIN roles r ON r.id = m.role_id
    WHERE m.workspace_id = OLD.workspace_id
      AND m.status = 'active'
      AND r.system_key = 'admin'
      AND m.id <> OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'last_admin');
END;

CREATE TRIGGER member_class_staff_only
BEFORE INSERT ON member_classes
WHEN EXISTS (
  SELECT 1 FROM memberships m
  JOIN roles r ON r.id = m.role_id
  WHERE m.id = NEW.membership_id AND r.scope_kind = 'linked_students'
)
BEGIN
  SELECT RAISE(ABORT, 'staff_only');
END;

-- 2.3 Lịch sử điểm danh (chỉ ghi khi trạng thái/ghi chú/giờ muộn đổi).

CREATE TRIGGER attendance_history_ai
AFTER UPDATE ON attendance
WHEN OLD.status IS NOT NEW.status
  OR OLD.note IS NOT NEW.note
  OR OLD.late_at IS NOT NEW.late_at
BEGIN
  INSERT INTO attendance_history (
    workspace_id, session_id, student_id,
    old_status, new_status, old_note, new_note, old_late_at, new_late_at,
    old_version, new_version, changed_by, changed_at
  ) VALUES (
    NEW.workspace_id, NEW.session_id, NEW.student_id,
    OLD.status, NEW.status, OLD.note, NEW.note, OLD.late_at, NEW.late_at,
    OLD.version, NEW.version, NEW.updated_by, NEW.updated_at
  );
END;

-- 2.4 Điểm: chặn vượt điểm tối đa, chặn hạ max dưới điểm cao nhất, lịch sử,
--     đánh dấu báo cáo cần phát hành lại, chặn xoá bài đã có điểm.

CREATE TRIGGER scores_max_guard_ins
BEFORE INSERT ON scores
WHEN NEW.value IS NOT NULL
  AND NEW.value > (SELECT max FROM tests WHERE id = NEW.test_id)
BEGIN
  SELECT RAISE(ABORT, 'score_above_max');
END;

CREATE TRIGGER scores_max_guard_upd
BEFORE UPDATE OF value ON scores
WHEN NEW.value IS NOT NULL
  AND NEW.value > (SELECT max FROM tests WHERE id = NEW.test_id)
BEGIN
  SELECT RAISE(ABORT, 'score_above_max');
END;

CREATE TRIGGER tests_max_guard
BEFORE UPDATE OF max ON tests
WHEN EXISTS (SELECT 1 FROM scores WHERE test_id = NEW.id AND value > NEW.max)
BEGIN
  SELECT RAISE(ABORT, 'max_below_score');
END;

CREATE TRIGGER scores_history_au
AFTER UPDATE ON scores
WHEN OLD.value IS NOT NEW.value
BEGIN
  INSERT INTO score_history (
    workspace_id, test_id, student_id,
    old_value, new_value, old_version, new_version, changed_by, changed_at
  ) VALUES (
    NEW.workspace_id, NEW.test_id, NEW.student_id,
    OLD.value, NEW.value, OLD.version, NEW.version, NEW.updated_by, NEW.updated_at
  );
END;

CREATE TRIGGER scores_republish_ai
AFTER INSERT ON scores
WHEN NEW.value IS NOT NULL
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE student_id = NEW.student_id
    AND status = 'published'
    AND month = substr((SELECT date FROM tests WHERE id = NEW.test_id), 1, 7);
END;

CREATE TRIGGER scores_republish_au
AFTER UPDATE ON scores
WHEN NEW.value IS NOT NULL
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE student_id = NEW.student_id
    AND status = 'published'
    AND month = substr((SELECT date FROM tests WHERE id = NEW.test_id), 1, 7);
END;

CREATE TRIGGER tests_republish_au
AFTER UPDATE OF archived, date, max ON tests
BEGIN
  UPDATE reports SET needs_republish = 1
  WHERE class_id = NEW.class_id
    AND status = 'published'
    AND month IN (substr(OLD.date, 1, 7), substr(NEW.date, 1, 7));
END;

CREATE TRIGGER tests_delete_guard
BEFORE DELETE ON tests
WHEN EXISTS (SELECT 1 FROM scores WHERE test_id = OLD.id AND value IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'test_has_scores');
END;

-- 2.5 Phiếu và BTVN: không rút phiếu đã gửi, không xoá phần đã chấm.

CREATE TRIGGER comment_no_unsend
BEFORE UPDATE ON session_comments
WHEN OLD.status = 'sent' AND NEW.status = 'draft'
BEGIN
  SELECT RAISE(ABORT, 'cannot_unsend');
END;

CREATE TRIGGER homework_section_delete_guard
BEFORE DELETE ON homework_sections
WHEN EXISTS (
  SELECT 1 FROM homework_grades
  WHERE section_id = OLD.id AND level IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'section_has_grades');
END;

-- 2.6 Bản chụp báo cáo là bất biến, chỉ được gán PDF một lần.

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

-- 2.8 change_log — nguồn của sync/pull. Ghi bằng trigger, created_at là giây
--     Unix. Các lần "phát lại để lộ ra" do tầng db chèn tay trong cùng batch.

CREATE TRIGGER change_log_class_ai AFTER INSERT ON classes BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'class', NEW.id, '', 'upsert', NEW.id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_class_au AFTER UPDATE ON classes BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'class', NEW.id, '', 'upsert', NEW.id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_class_ad AFTER DELETE ON classes BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'class', OLD.id, '', 'delete', OLD.id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_student_ai AFTER INSERT ON students BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'student', NEW.id, '', 'upsert', NEW.class_id, NEW.id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_student_au AFTER UPDATE ON students BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'student', NEW.id, '', 'upsert', NEW.class_id, NEW.id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_student_ad AFTER DELETE ON students BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'student', OLD.id, '', 'delete', OLD.class_id, OLD.id, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_session_ai AFTER INSERT ON class_sessions BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'class_session', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_session_au AFTER UPDATE ON class_sessions BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'class_session', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_session_ad AFTER DELETE ON class_sessions BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'class_session', OLD.id, '', 'delete', OLD.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
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

CREATE TRIGGER change_log_test_ai AFTER INSERT ON tests BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'test', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_test_au AFTER UPDATE ON tests BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'test', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_test_ad AFTER DELETE ON tests BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'test', OLD.id, '', 'delete', OLD.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_score_ai AFTER INSERT ON scores BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'score', NEW.test_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_score_au AFTER UPDATE ON scores BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'score', NEW.test_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_score_ad AFTER DELETE ON scores BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'score', OLD.test_id, OLD.student_id, 'delete', OLD.class_id, OLD.student_id, CAST(strftime('%s','now') AS INTEGER));
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

CREATE TRIGGER change_log_homework_section_ai AFTER INSERT ON homework_sections BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'homework_section', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_homework_section_au AFTER UPDATE ON homework_sections BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'homework_section', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_homework_section_ad AFTER DELETE ON homework_sections BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'homework_section', OLD.id, '', 'delete', OLD.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_homework_grade_ai AFTER INSERT ON homework_grades BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'homework_grade', NEW.section_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_homework_grade_au AFTER UPDATE ON homework_grades BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'homework_grade', NEW.section_id, NEW.student_id, 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_homework_grade_ad AFTER DELETE ON homework_grades BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'homework_grade', OLD.section_id, OLD.student_id, 'delete', OLD.class_id, OLD.student_id, CAST(strftime('%s','now') AS INTEGER));
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

CREATE TRIGGER change_log_publication_ai AFTER INSERT ON report_publications BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'report_publication', NEW.id, '', 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_publication_au AFTER UPDATE ON report_publications BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'report_publication', NEW.id, '', 'upsert', NEW.class_id, NEW.student_id, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_publication_ad AFTER DELETE ON report_publications BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'report_publication', OLD.id, '', 'delete', OLD.class_id, OLD.student_id, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_conflict_ai AFTER INSERT ON sync_conflicts BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'conflict', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_conflict_au AFTER UPDATE ON sync_conflicts BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'conflict', NEW.id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
CREATE TRIGGER change_log_conflict_ad AFTER DELETE ON sync_conflicts BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'conflict', OLD.id, '', 'delete', OLD.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;
