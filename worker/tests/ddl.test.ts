import { describe, expect, it } from 'vitest';
import { db, insertClass, insertSession, insertStudent, registerWorkspace } from './helpers';

describe('D1 schema constraints and history', () => {
  it('has 32 application tables and no foreign key violations', async () => {
    const tables = await db.prepare(
      `SELECT count(*) AS count FROM sqlite_master WHERE type='table'
       AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations'`,
    ).first<{ count: number }>();
    expect(tables?.count).toBe(32);
    const fk = await db.prepare('PRAGMA foreign_key_check').all();
    expect(fk.results).toEqual([]);
  });

  it('rejects cross-workspace and cross-class attendance, and records attendance and score history', async () => {
    const owner = await registerWorkspace('+84900001001', 'DDL workspace A');
    const other = await registerWorkspace('+84900001002', 'DDL workspace B');
    const classA = await insertClass(owner.workspaceId, 'Class A', owner.userId);
    const classB = await insertClass(owner.workspaceId, 'Class B', owner.userId);
    const classOther = await insertClass(other.workspaceId, 'Other workspace', other.userId);
    const studentA = await insertStudent(owner.workspaceId, classA, 'Student A', null, owner.userId);
    const studentB = await insertStudent(owner.workspaceId, classB, 'Student B', null, owner.userId);
    const studentOther = await insertStudent(other.workspaceId, classOther, 'Other student', null, other.userId);
    const sessionA = await insertSession(owner.workspaceId, classA, '2026-10-20', owner.userId);
    const sessionB = await insertSession(owner.workspaceId, classB, '2026-10-21', owner.userId);

    await expect(db.prepare(
      `INSERT INTO attendance (workspace_id,class_id,session_id,student_id,status,note,late_at,version,created_at,updated_at,updated_by)
       VALUES (?, ?, ?, ?, 'present', '', NULL, 1, '2026-10-21T00:00:00.000Z','2026-10-21T00:00:00.000Z',?)`,
    ).bind(owner.workspaceId, classA, sessionA, studentOther, owner.userId).run()).rejects.toThrow();
    await expect(db.prepare(
      `INSERT INTO attendance (workspace_id,class_id,session_id,student_id,status,note,late_at,version,created_at,updated_at,updated_by)
       VALUES (?, ?, ?, ?, 'present', '', NULL, 1, '2026-10-21T00:00:00.000Z','2026-10-21T00:00:00.000Z',?)`,
    ).bind(owner.workspaceId, classA, sessionA, studentB, owner.userId).run()).rejects.toThrow();

    await db.prepare(
      `INSERT INTO attendance (workspace_id,class_id,session_id,student_id,status,note,late_at,version,created_at,updated_at,updated_by)
       VALUES (?, ?, ?, ?, 'present', '', NULL, 1, '2026-10-21T00:00:00.000Z','2026-10-21T00:00:00.000Z',?)`,
    ).bind(owner.workspaceId, classA, sessionA, studentA, owner.userId).run();
    await db.prepare(
      `UPDATE attendance SET status='late', late_at='18:10', version=2,
       updated_at='2026-10-21T00:01:00.000Z', updated_by=? WHERE session_id=? AND student_id=?`,
    ).bind(owner.userId, sessionA, studentA).run();
    const attendanceHistory = await db.prepare('SELECT old_status,new_status,changed_by FROM attendance_history').all();
    expect(attendanceHistory.results).toEqual([{ old_status: 'present', new_status: 'late', changed_by: owner.userId }]);

    const testId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO tests (id,workspace_id,class_id,name,date,max,archived,created_by,created_at,updated_at,updated_by,version)
       VALUES (?, ?, ?, 'Unit test', '2026-10-20', 15, 0, ?, '2026-10-21T00:00:00.000Z','2026-10-21T00:00:00.000Z',?,1)`,
    ).bind(testId, owner.workspaceId, classA, owner.userId, owner.userId).run();
    await db.prepare(
      `INSERT INTO scores (workspace_id,class_id,test_id,student_id,value,version,created_at,updated_at,updated_by)
       VALUES (?, ?, ?, ?, 10, 1, '2026-10-21T00:00:00.000Z','2026-10-21T00:00:00.000Z',?)`,
    ).bind(owner.workspaceId, classA, testId, studentA, owner.userId).run();
    await db.prepare(
      `UPDATE scores SET value=12,version=2,updated_at='2026-10-21T00:02:00.000Z',updated_by=? WHERE test_id=? AND student_id=?`,
    ).bind(owner.userId, testId, studentA).run();
    const scoreHistory = await db.prepare('SELECT old_value,new_value,changed_by FROM score_history').all();
    expect(scoreHistory.results).toEqual([{ old_value: 10, new_value: 12, changed_by: owner.userId }]);
    expect(sessionB).toBeTruthy();
  });
});
