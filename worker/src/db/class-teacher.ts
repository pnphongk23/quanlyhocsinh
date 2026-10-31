/**
 * SQL expression for the active, named teacher assigned to a class, with an Admin fallback.
 * Joins are forced (CROSS JOIN) to start from the class's own member_classes rows / the workspace's
 * Admin role, so the cost per class does not grow with the number of memberships in the workspace.
 */
export function classTeacherNameSql(classAlias: string): string {
  const name = "COALESCE(NULLIF(trim(m.display_name), ''), u.display_name)";
  return `COALESCE(
    (SELECT ${name}
       FROM member_classes mc
       CROSS JOIN memberships m ON m.id = mc.membership_id AND m.workspace_id = mc.workspace_id
       CROSS JOIN roles r ON r.id = m.role_id
       CROSS JOIN users u ON u.id = m.user_id
      WHERE mc.workspace_id = ${classAlias}.workspace_id AND mc.class_id = ${classAlias}.id
        AND m.status = 'active' AND u.status = 'active'
        AND (r.system_key = 'teacher' OR r.scope_kind = 'assigned_classes')
        AND length(trim(COALESCE(NULLIF(trim(m.display_name), ''), u.display_name, ''))) > 0
      ORDER BY mc.created_at, u.id LIMIT 1),
    (SELECT ${name}
       FROM roles r
       CROSS JOIN memberships m ON m.role_id = r.id AND m.workspace_id = r.workspace_id
       CROSS JOIN users u ON u.id = m.user_id
      WHERE r.workspace_id = ${classAlias}.workspace_id AND r.system_key = 'admin'
        AND m.status = 'active' AND u.status = 'active'
        AND length(trim(COALESCE(NULLIF(trim(m.display_name), ''), u.display_name, ''))) > 0
      ORDER BY m.created_at, u.id LIMIT 1)
  )`;
}
