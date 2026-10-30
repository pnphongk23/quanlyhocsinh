import { describe, expect, it } from 'vitest';
import { classTeacherNameSql } from '../src/db/class-teacher';
import { db, fakePhone, insertClass, insertMembership, insertUser, registerWorkspace } from './helpers';

// Reference copy of the previous formulation: the optimised SQL must return exactly the same names.
function referenceTeacherNameSql(classAlias: string): string {
  return `COALESCE(
    (SELECT COALESCE(NULLIF(trim(m.display_name), ''), u.display_name)
       FROM member_classes mc
       JOIN memberships m ON m.id = mc.membership_id AND m.workspace_id = mc.workspace_id
       JOIN roles r ON r.id = m.role_id
       JOIN users u ON u.id = m.user_id
      WHERE mc.workspace_id = ${classAlias}.workspace_id AND mc.class_id = ${classAlias}.id
        AND m.status = 'active' AND u.status = 'active'
        AND (r.system_key = 'teacher' OR r.scope_kind = 'assigned_classes')
        AND length(trim(COALESCE(NULLIF(trim(m.display_name), ''), u.display_name, ''))) > 0
      ORDER BY mc.created_at, u.id LIMIT 1),
    (SELECT COALESCE(NULLIF(trim(m.display_name), ''), u.display_name)
       FROM memberships m
       JOIN roles r ON r.id = m.role_id AND r.system_key = 'admin'
       JOIN users u ON u.id = m.user_id
      WHERE m.workspace_id = ${classAlias}.workspace_id
        AND m.status = 'active' AND u.status = 'active'
        AND length(trim(COALESCE(NULLIF(trim(m.display_name), ''), u.display_name, ''))) > 0
      ORDER BY m.created_at, u.id LIMIT 1)
  )`;
}

async function names(sqlFor: (alias: string) => string, workspaceId: string) {
  const result = await db.prepare(`SELECT e.id, ${sqlFor('e')} AS teacher_name FROM classes e WHERE e.workspace_id = ? ORDER BY e.id`)
    .bind(workspaceId).all<{ id: string; teacher_name: string | null }>();
  return { rows: result.results, read: (result.meta as { rows_read?: number }).rows_read ?? 0 };
}
const assign = (workspaceId: string, membershipId: string, classId: string, createdAt: string) =>
  db.prepare('INSERT INTO member_classes(workspace_id,membership_id,class_id,created_at) VALUES(?,?,?,?)')
    .bind(workspaceId, membershipId, classId, createdAt).run();

describe('class teacher name SQL', () => {
  it('returns the same names as the reference formulation and reads far fewer rows', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Teacher names');
    const withTeacher = await insertClass(owner.workspaceId, 'With teacher', owner.userId);
    const adminOnly = await insertClass(owner.workspaceId, 'Admin only', owner.userId);
    const renamed = await insertClass(owner.workspaceId, 'Membership name', owner.userId);
    const disabledOnly = await insertClass(owner.workspaceId, 'Disabled teacher', owner.userId);
    const blankTeacher = await insertClass(owner.workspaceId, 'Blank teacher', owner.userId);
    for (let i = 0; i < 25; i++) await insertClass(owner.workspaceId, `Filler ${i}`, owner.userId);

    const teacher = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), 'Cô Giáo'), owner.roles.teacher!);
    await assign(owner.workspaceId, teacher, withTeacher, '2026-01-01T00:00:00.000Z');
    const second = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), 'Cô Hai'), owner.roles.teacher!);
    await assign(owner.workspaceId, second, withTeacher, '2026-02-01T00:00:00.000Z');
    const named = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), 'Account name'), owner.roles.assistant!);
    await db.prepare('UPDATE memberships SET display_name=? WHERE id=?').bind('Tên trong lớp', named).run();
    await assign(owner.workspaceId, named, renamed, '2026-01-01T00:00:00.000Z');
    const disabled = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), 'Đã khoá'), owner.roles.teacher!);
    await db.prepare("UPDATE memberships SET status='disabled' WHERE id=?").bind(disabled).run();
    await assign(owner.workspaceId, disabled, disabledOnly, '2026-01-01T00:00:00.000Z');
    const blank = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), null), owner.roles.teacher!);
    await assign(owner.workspaceId, blank, blankTeacher, '2026-01-01T00:00:00.000Z');
    // Many unrelated memberships: the old formulation scanned all of them for every class.
    for (let i = 0; i < 30; i++) await insertMembership(owner.workspaceId, await insertUser(fakePhone(), `Extra ${i}`), owner.roles.assistant!);

    const before = await names(referenceTeacherNameSql, owner.workspaceId);
    const after = await names(classTeacherNameSql, owner.workspaceId);
    expect(after.rows).toEqual(before.rows);
    const byId = new Map(after.rows.map((row) => [row.id, row.teacher_name]));
    expect(byId.get(withTeacher)).toBe('Cô Giáo');
    expect(byId.get(renamed)).toBe('Tên trong lớp');
    for (const id of [adminOnly, disabledOnly, blankTeacher]) expect(byId.get(id)).toBe('Giáo viên Mẫu');

    // A workspace whose Admin has no name leaves the class unnamed.
    const bare = await registerWorkspace(fakePhone(), 'Teacher names bare');
    await db.prepare('UPDATE users SET display_name=NULL WHERE id=?').bind(bare.userId).run();
    const unnamed = await insertClass(bare.workspaceId, 'Unnamed', bare.userId);
    const bareAfter = await names(classTeacherNameSql, bare.workspaceId);
    expect(bareAfter.rows).toEqual((await names(referenceTeacherNameSql, bare.workspaceId)).rows);
    expect(bareAfter.rows.find((row) => row.id === unnamed)?.teacher_name).toBeNull();

    expect(after.read).toBeLessThan(before.read / 2);
  });
});
