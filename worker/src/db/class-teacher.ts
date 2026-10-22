/** SQL expression for the active, named teacher assigned to a class, with an Admin fallback. */
export function classTeacherNameSql(classAlias: string): string {
  return `COALESCE(
    (SELECT u.display_name
       FROM member_classes mc
       JOIN memberships m ON m.id = mc.membership_id AND m.workspace_id = mc.workspace_id
       JOIN roles r ON r.id = m.role_id
       JOIN users u ON u.id = m.user_id
      WHERE mc.workspace_id = ${classAlias}.workspace_id AND mc.class_id = ${classAlias}.id
        AND m.status = 'active' AND u.status = 'active'
        AND (r.system_key = 'teacher' OR r.scope_kind = 'assigned_classes')
        AND u.display_name IS NOT NULL AND length(trim(u.display_name)) > 0
      ORDER BY mc.created_at, u.id LIMIT 1),
    (SELECT u.display_name
       FROM memberships m
       JOIN roles r ON r.id = m.role_id AND r.system_key = 'admin'
       JOIN users u ON u.id = m.user_id
      WHERE m.workspace_id = ${classAlias}.workspace_id
        AND m.status = 'active' AND u.status = 'active'
        AND u.display_name IS NOT NULL AND length(trim(u.display_name)) > 0
      ORDER BY m.created_at, u.id LIMIT 1)
  )`;
}
