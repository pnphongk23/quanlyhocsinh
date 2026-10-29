CREATE TABLE role_permissions_new (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  perm_group TEXT NOT NULL CHECK (perm_group IN
    ('classes','students','sessions_attendance','scores','lectures','comments_reports','send_comments')),
  level TEXT NOT NULL CHECK (level IN ('none','read','write')),
  PRIMARY KEY (role_id, perm_group)
) WITHOUT ROWID;

INSERT INTO role_permissions_new(role_id,perm_group,level)
SELECT role_id,perm_group,level FROM role_permissions;

DROP TABLE role_permissions;
ALTER TABLE role_permissions_new RENAME TO role_permissions;

INSERT INTO role_permissions(role_id,perm_group,level)
SELECT id,'send_comments',CASE WHEN system_key IN ('admin','teacher') THEN 'write' ELSE 'none' END
FROM roles;

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
