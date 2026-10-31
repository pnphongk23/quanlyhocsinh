-- Staff display name per workspace: the name an Admin gives a member lives on the membership,
-- so it never leaks to the user's other workspaces. Display = membership name, else users.display_name.
ALTER TABLE memberships ADD COLUMN display_name TEXT
  CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 100);

-- Class rows carry the derived teacher name, so a name edit must re-emit them like status/role edits do.
DROP TRIGGER change_log_membership_teacher_au;
CREATE TRIGGER change_log_membership_teacher_au AFTER UPDATE OF status, role_id, display_name ON memberships BEGIN
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
