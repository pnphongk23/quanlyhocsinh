import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { call, clubToken, db, fakePhone, insertClass, insertGuardianMembership, insertMembership, insertSession, insertStudent, insertUser, post, put, registerWorkspace } from './helpers';

const uid = () => crypto.randomUUID();
const command = (type: string, payload: unknown) => ({ id: uid(), type, payload, base_version: 0, created_at: new Date().toISOString() });
const migrations = (env as unknown as { TEST_MIGRATIONS: { name: string; queries: string[] }[] }).TEST_MIGRATIONS;
const sendCommentsMigration = migrations.find((migration) => migration.name.endsWith('0014_send_comments.sql'))!.queries;

async function setup(name: string) {
  const owner = await registerWorkspace(fakePhone(), name);
  const classId = await insertClass(owner.workspaceId, 'Class', owner.userId);
  const studentId = await insertStudent(owner.workspaceId, classId, 'Learner', null, owner.userId);
  const sessionId = await insertSession(owner.workspaceId, classId,
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()), owner.userId);
  await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE id=?").bind(studentId).run();
  const assistantUserId = await insertUser(fakePhone());
  const assistantMembership = await insertMembership(owner.workspaceId, assistantUserId, owner.roles.assistant!, [classId]);
  const assistantToken = await clubToken(owner.workspaceId, assistantUserId, assistantMembership);
  const push = (token: string, membershipId: string, commands: unknown[]) => call('/v1/sync/push', post({
    membership_id: membershipId, device_id: uid(), commands,
  }), token);
  return { owner, classId, studentId, sessionId, assistantMembership, assistantToken, push };
}

describe('send_comments permission', () => {
  it('seeds defaults and returns the permission through role and identity APIs', async () => {
    const f = await setup('Send comments defaults');
    for (const [key, level] of [['admin', 'write'], ['teacher', 'write'], ['assistant', 'none'], ['guardian', 'none']] as const) {
      expect(await db.prepare("SELECT level FROM role_permissions WHERE role_id=? AND perm_group='send_comments'")
        .bind(f.owner.roles[key]!).first()).toEqual({ level });
    }
    const roles = await call('/v1/roles/permissions', {}, f.owner.token);
    expect(roles.body.items.map((item: any) => [item.role.system_key, item.permissions.send_comments]))
      .toEqual([['teacher', 'write'], ['assistant', 'none']]);
    expect((await call('/v1/me', {}, f.owner.token)).body.memberships[0].permissions.send_comments).toBe('write');
    const guardianUser = await insertUser(fakePhone());
    const guardianMembership = await insertGuardianMembership(f.owner.workspaceId, guardianUser, f.owner.roles.guardian!, [f.studentId]);
    const guardianToken = await clubToken(f.owner.workspaceId, guardianUser, guardianMembership);
    expect((await call('/v1/me', {}, guardianToken)).body.memberships[0].permissions.send_comments).toBe('none');
  });

  it('allows slip editing but blocks assistant sending until the role is granted write', async () => {
    const f = await setup('Send comments enforcement');
    const slip = command('slip.set', { session_id: f.sessionId, student_id: f.studentId, criteria: 15, comment: 'Tốt', note: '' });
    expect((await f.push(f.assistantToken, f.assistantMembership, [slip])).body.results[0]).toMatchObject({ status: 'applied' });
    const send = () => f.push(f.assistantToken, f.assistantMembership,
      [command('slip.send', { session_id: f.sessionId, student_ids: [f.studentId] })]);
    expect((await send()).body.results[0]).toMatchObject({ status: 'rejected', error: { code: 'forbidden' } });
    expect(await db.prepare('SELECT status FROM session_comments WHERE session_id=? AND student_id=?')
      .bind(f.sessionId, f.studentId).first()).toEqual({ status: 'draft' });
    expect((await db.prepare('SELECT COUNT(*) n FROM notifications WHERE workspace_id=?').bind(f.owner.workspaceId).first<any>()).n).toBe(0);

    const teacherUser = await insertUser(fakePhone());
    const teacherMembership = await insertMembership(f.owner.workspaceId, teacherUser, f.owner.roles.teacher!, [f.classId]);
    const teacherToken = await clubToken(f.owner.workspaceId, teacherUser, teacherMembership);
    const teacherStudent = await insertStudent(f.owner.workspaceId, f.classId, 'Teacher learner', null, f.owner.userId);
    await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE id=?").bind(teacherStudent).run();
    await f.push(teacherToken, teacherMembership, [command('slip.set', { session_id: f.sessionId, student_id: teacherStudent, criteria: 15, comment: 'Tốt', note: '' })]);
    expect((await f.push(teacherToken, teacherMembership, [command('slip.send', {
      session_id: f.sessionId, student_ids: [teacherStudent],
    })])).body.results[0].status).toBe('applied');
    const adminStudent = await insertStudent(f.owner.workspaceId, f.classId, 'Admin learner', null, f.owner.userId);
    await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE id=?").bind(adminStudent).run();
    await f.push(f.owner.token, f.owner.membershipId, [command('slip.set', { session_id: f.sessionId, student_id: adminStudent, criteria: 31, comment: 'Rất tốt', note: '' })]);
    expect((await f.push(f.owner.token, f.owner.membershipId, [command('slip.send', {
      session_id: f.sessionId, student_ids: [adminStudent],
    })])).body.results[0].status).toBe('applied');

    expect((await call('/v1/roles/assistant/permissions', put({ permissions: { send_comments: 'write' } }), f.owner.token)).status).toBe(200);
    expect((await send()).body.results[0].status).toBe('applied');
    expect((await call('/v1/roles/assistant/permissions', put({ permissions: { send_comments: 'none' } }), f.owner.token)).status).toBe(200);
    const blockedStudent = await insertStudent(f.owner.workspaceId, f.classId, 'Blocked learner', null, f.owner.userId);
    await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE id=?").bind(blockedStudent).run();
    await f.push(f.assistantToken, f.assistantMembership, [command('slip.set', {
      session_id: f.sessionId, student_id: blockedStudent, criteria: 31, comment: 'Rất tốt', note: '',
    })]);
    const blocked = await f.push(f.assistantToken, f.assistantMembership, [command('slip.send', {
      session_id: f.sessionId, student_ids: [blockedStudent],
    })]);
    expect(blocked.body.results[0].error.code).toBe('forbidden');
    const invalid = await call('/v1/roles/assistant/permissions', put({ permissions: { send_comments: 'read' } }), f.owner.token);
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.details.fields.send_comments).toBe('invalid');
  });

  it('keeps batch processing independent and migrates existing permission rows with triggers', async () => {
    const f = await setup('Send comments migration');
    const students = await Promise.all([0, 1, 2].map((i) => insertStudent(f.owner.workspaceId, f.classId, `Student ${i}`, null, f.owner.userId)));
    await db.prepare("UPDATE students SET enrolled_at='2000-01-01' WHERE class_id=?").bind(f.classId).run();
    const batch = await f.push(f.owner.token, f.owner.membershipId, students.map((studentId, index) => command('slip.set', {
      session_id: f.sessionId, student_id: index === 1 ? uid() : studentId, criteria: 31, comment: 'Rất tốt', note: '',
    })));
    expect(batch.body.results.map((result: any) => result.status)).toEqual(['applied', 'rejected', 'applied']);
    const fifty = await f.push(f.owner.token, f.owner.membershipId, Array.from({ length: 50 }, (_, i) => command('slip.set', {
      session_id: f.sessionId, student_id: f.studentId, criteria: i % 32, comment: `Cập nhật ${i}`, note: '',
    })));
    expect(fifty.body.results).toHaveLength(50);
    expect(fifty.body.results.filter((result: any) => result.status !== 'applied')).toEqual([]);

    await db.batch([
      db.prepare('DROP TRIGGER IF EXISTS role_perm_guardian_cap_ins'),
      db.prepare('DROP TRIGGER IF EXISTS role_perm_guardian_cap_upd'),
      db.prepare('DROP TRIGGER IF EXISTS role_perm_admin_locked_upd'),
      db.prepare('DROP TRIGGER IF EXISTS role_perm_admin_locked_del'),
      db.prepare(`CREATE TABLE role_permissions_legacy (
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        perm_group TEXT NOT NULL CHECK (perm_group IN ('classes','students','sessions_attendance','scores','lectures','comments_reports')),
        level TEXT NOT NULL CHECK (level IN ('none','read','write')), PRIMARY KEY(role_id,perm_group)) WITHOUT ROWID`),
      db.prepare(`INSERT INTO role_permissions_legacy SELECT role_id,perm_group,level FROM role_permissions WHERE perm_group<>'send_comments'`),
      db.prepare('DROP TABLE role_permissions'),
      db.prepare('ALTER TABLE role_permissions_legacy RENAME TO role_permissions'),
      db.prepare("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'").bind(f.owner.roles.assistant!),
    ]);
    await db.batch(sendCommentsMigration.map((query) => db.prepare(query)));
    const retained = await db.prepare('SELECT COUNT(*) n FROM role_permissions WHERE role_id=?').bind(f.owner.roles.assistant!).first<any>();
    expect(retained.n).toBe(7);
    expect(await db.prepare("SELECT level FROM role_permissions WHERE role_id=? AND perm_group='comments_reports'")
      .bind(f.owner.roles.assistant!).first()).toEqual({ level: 'read' });
    expect(await db.prepare("SELECT level FROM role_permissions WHERE role_id=? AND perm_group='send_comments'")
      .bind(f.owner.roles.assistant!).first()).toEqual({ level: 'none' });
    expect((await db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='trigger' AND name LIKE 'role_perm_%'").first<any>()).n).toBe(4);
    await expect(db.prepare(`UPDATE role_permissions SET level='write' WHERE role_id=? AND perm_group='scores'`)
      .bind(f.owner.roles.guardian!).run()).rejects.toThrow();
  });

  it('grants send_comments to a role whose row was never created (workspace made by an older Worker)', async () => {
    const f = await setup('Send comments missing row');
    await db.prepare("DELETE FROM role_permissions WHERE role_id=? AND perm_group='send_comments'").bind(f.owner.roles.teacher!).run();
    const before = await call('/v1/roles/permissions', {}, f.owner.token);
    expect(before.body.items[0].permissions.send_comments).toBe('none');
    const granted = await call('/v1/roles/teacher/permissions', put({ permissions: { send_comments: 'write' } }), f.owner.token);
    expect(granted.status).toBe(200);
    expect(granted.body.permissions.send_comments).toBe('write');
  });
});
