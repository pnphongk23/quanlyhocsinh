-- Khai nhân sự đang chờ tài khoản và các lớp đã gán.
CREATE TABLE staff_declarations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  phone TEXT NOT NULL CHECK (phone GLOB '+84[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  role_id TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (workspace_id, phone),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, role_id) REFERENCES roles(workspace_id, id)
);
CREATE INDEX staff_declarations_phone ON staff_declarations(phone);

CREATE TABLE staff_declaration_classes (
  workspace_id TEXT NOT NULL,
  declaration_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  PRIMARY KEY (declaration_id, class_id),
  FOREIGN KEY (workspace_id, declaration_id) REFERENCES staff_declarations(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, class_id) REFERENCES classes(workspace_id, id)
) WITHOUT ROWID;

CREATE TRIGGER staff_declaration_role_bi BEFORE INSERT ON staff_declarations BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM roles WHERE id = NEW.role_id AND workspace_id = NEW.workspace_id
      AND system_key IN ('teacher','assistant') AND scope_kind = 'assigned_classes'
  ) THEN RAISE(ABORT, 'staff_role_invalid') END;
END;
CREATE TRIGGER staff_declaration_role_bu BEFORE UPDATE OF role_id, workspace_id ON staff_declarations BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM roles WHERE id = NEW.role_id AND workspace_id = NEW.workspace_id
      AND system_key IN ('teacher','assistant') AND scope_kind = 'assigned_classes'
  ) THEN RAISE(ABORT, 'staff_role_invalid') END;
END;

-- Nâng mặc định Trợ giảng chỉ khi bộ quyền còn nguyên như lúc seed ban đầu.
UPDATE role_permissions
   SET level = 'write'
 WHERE perm_group = 'comments_reports'
   AND role_id IN (
     SELECT r.id FROM roles r
      WHERE r.system_key = 'assistant'
        AND (SELECT COUNT(*) FROM role_permissions p WHERE p.role_id = r.id) = 6
        AND (SELECT level FROM role_permissions p WHERE p.role_id = r.id AND p.perm_group = 'classes') = 'read'
        AND (SELECT level FROM role_permissions p WHERE p.role_id = r.id AND p.perm_group = 'students') = 'read'
        AND (SELECT level FROM role_permissions p WHERE p.role_id = r.id AND p.perm_group = 'sessions_attendance') = 'write'
        AND (SELECT level FROM role_permissions p WHERE p.role_id = r.id AND p.perm_group = 'scores') = 'read'
        AND (SELECT level FROM role_permissions p WHERE p.role_id = r.id AND p.perm_group = 'lectures') = 'read'
        AND (SELECT level FROM role_permissions p WHERE p.role_id = r.id AND p.perm_group = 'comments_reports') = 'read'
   );
