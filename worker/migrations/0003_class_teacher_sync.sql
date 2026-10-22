-- Re-emit class rows when data used to derive the guardian-facing teacher name changes.

CREATE TRIGGER change_log_member_class_ai AFTER INSERT ON member_classes BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (NEW.workspace_id, 'class', NEW.class_id, '', 'upsert', NEW.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_member_class_ad AFTER DELETE ON member_classes BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  VALUES (OLD.workspace_id, 'class', OLD.class_id, '', 'upsert', OLD.class_id, NULL, CAST(strftime('%s','now') AS INTEGER));
END;

CREATE TRIGGER change_log_membership_teacher_au AFTER UPDATE OF status, role_id ON memberships BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  SELECT mc.workspace_id, 'class', mc.class_id, '', 'upsert', mc.class_id, NULL, CAST(strftime('%s','now') AS INTEGER)
    FROM member_classes mc WHERE mc.membership_id = NEW.id
  UNION ALL
  SELECT NEW.workspace_id, 'class', c.id, '', 'upsert', c.id, NULL, CAST(strftime('%s','now') AS INTEGER)
    FROM classes c
    WHERE c.workspace_id = NEW.workspace_id
      AND (OLD.role_id IN (SELECT id FROM roles WHERE system_key = 'admin')
        OR NEW.role_id IN (SELECT id FROM roles WHERE system_key = 'admin'));
END;

CREATE TRIGGER change_log_user_teacher_au AFTER UPDATE OF display_name, status ON users BEGIN
  INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id, created_at)
  SELECT mc.workspace_id, 'class', mc.class_id, '', 'upsert', mc.class_id, NULL, CAST(strftime('%s','now') AS INTEGER)
    FROM memberships m JOIN member_classes mc ON mc.membership_id = m.id AND mc.workspace_id = m.workspace_id
    WHERE m.user_id = NEW.id
  UNION ALL
  SELECT m.workspace_id, 'class', c.id, '', 'upsert', c.id, NULL, CAST(strftime('%s','now') AS INTEGER)
    FROM memberships m JOIN roles r ON r.id = m.role_id AND r.system_key = 'admin'
    JOIN classes c ON c.workspace_id = m.workspace_id
    WHERE m.user_id = NEW.id;
END;
