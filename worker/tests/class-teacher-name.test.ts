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

  it('matches the reference formulation for disabled users, blank names, ties and multi-workspace users', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Teacher names edge');
    const adminUserId = owner.userId;
    const create = async (name: string) => insertClass(owner.workspaceId, name, owner.userId);
    const disabledTeacherUser = await create('Disabled teacher user');
    const blankMembershipName = await create('Blank membership name');
    const blankEverywhere = await create('Blank everywhere');
    const tie = await create('Same assignment time');
    const sharedUser = await create('Shared user');
    const at = '2026-03-01T00:00:00.000Z';

    const userA = await insertUser(fakePhone(), 'Teacher with disabled account');
    const memA = await insertMembership(owner.workspaceId, userA, owner.roles.teacher!);
    await assign(owner.workspaceId, memA, disabledTeacherUser, at);
    await db.prepare("UPDATE users SET status='disabled' WHERE id=?").bind(userA).run();

    const memB = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), 'Falls back to account name'), owner.roles.teacher!);
    await db.prepare('UPDATE memberships SET display_name=? WHERE id=?').bind('   ', memB).run();
    await assign(owner.workspaceId, memB, blankMembershipName, at);

    const memC = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), '   '), owner.roles.teacher!);
    await db.prepare('UPDATE memberships SET display_name=? WHERE id=?').bind('  ', memC).run();
    await assign(owner.workspaceId, memC, blankEverywhere, at);

    for (const label of ['Tie one', 'Tie two', 'Tie three']) {
      const membership = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), label), owner.roles.teacher!);
      await assign(owner.workspaceId, membership, tie, at);
    }

    const other = await registerWorkspace(fakePhone(), 'Teacher names edge other');
    const sharedUserId = await insertUser(fakePhone(), 'Shared account name');
    const sharedHere = await insertMembership(owner.workspaceId, sharedUserId, owner.roles.teacher!);
    await db.prepare('UPDATE memberships SET display_name=? WHERE id=?').bind('Name in first workspace', sharedHere).run();
    await assign(owner.workspaceId, sharedHere, sharedUser, at);
    const sharedThere = await insertMembership(other.workspaceId, sharedUserId, other.roles.teacher!);
    const otherClass = await insertClass(other.workspaceId, 'Other workspace class', other.userId);
    await assign(other.workspaceId, sharedThere, otherClass, at);

    const compare = async (workspaceId: string) => {
      const before = await names(referenceTeacherNameSql, workspaceId);
      const after = await names(classTeacherNameSql, workspaceId);
      expect(after.rows).toEqual(before.rows);
      return new Map(after.rows.map((row) => [row.id, row.teacher_name]));
    };
    let result = await compare(owner.workspaceId);
    expect(result.get(disabledTeacherUser)).toBe('Giáo viên Mẫu');
    expect(result.get(blankMembershipName)).toBe('Falls back to account name');
    expect(result.get(blankEverywhere)).toBe('Giáo viên Mẫu');
    expect(['Tie one', 'Tie two', 'Tie three']).toContain(result.get(tie));
    expect(result.get(sharedUser)).toBe('Name in first workspace');
    const otherResult = await compare(other.workspaceId);
    expect(otherResult.get(otherClass)).toBe('Shared account name');

    // Admin fallback when the Admin's user or membership is disabled, or the Admin has no usable name.
    await db.prepare("UPDATE users SET status='disabled' WHERE id=?").bind(adminUserId).run();
    result = await compare(owner.workspaceId);
    expect(result.get(disabledTeacherUser)).toBeNull();
    await db.prepare("UPDATE users SET status='active' WHERE id=?").bind(adminUserId).run();
    const secondAdmin = await insertMembership(owner.workspaceId, await insertUser(fakePhone(), 'Second admin'), owner.roles.admin!);
    await db.prepare("UPDATE memberships SET status='disabled' WHERE id=?").bind(owner.membershipId).run();
    expect((await compare(owner.workspaceId)).get(disabledTeacherUser)).toBe('Second admin');
    await db.prepare("UPDATE memberships SET status='active', display_name=? WHERE id=?").bind('   ', owner.membershipId).run();
    await db.prepare('UPDATE users SET display_name=? WHERE id=?').bind('   ', adminUserId).run();
    await db.prepare("UPDATE memberships SET display_name='   ' WHERE id=?").bind(secondAdmin).run();
    await db.prepare("UPDATE users SET display_name='   ' WHERE id=(SELECT user_id FROM memberships WHERE id=?)").bind(secondAdmin).run();
    expect((await compare(owner.workspaceId)).get(disabledTeacherUser)).toBeNull();
    // A role deleted from under a membership cannot be fixtured: memberships(workspace_id, role_id) is a foreign key.
  });
});
