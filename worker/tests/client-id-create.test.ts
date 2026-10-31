import { describe, expect, it } from 'vitest';
import {
  call, clubToken, db, fakePhone, insertClass, insertGuardianMembership, insertMembership, insertSession,
  insertStudent, insertUser, PASSWORD, post, type RegisteredWorkspace,
} from './helpers';

let ipCounter = 1;
/** Mỗi workspace đăng ký từ một IP riêng để không chạm giới hạn đăng ký theo IP. */
async function owner(label: string): Promise<RegisteredWorkspace> {
  const result = await call('/v1/auth/register', {
    ...post({ phone: fakePhone(), password: PASSWORD, display_name: 'Teacher Sample', workspace_name: label }),
    headers: { 'cf-connecting-ip': `198.51.101.${ipCounter++}` },
  });
  if (result.status !== 201) throw new Error(`test workspace setup failed: ${result.status}`);
  const workspaceId = result.body.memberships[0].workspace.id as string;
  const { results } = await db.prepare('SELECT system_key, id FROM roles WHERE workspace_id = ?')
    .bind(workspaceId).all<{ system_key: string; id: string }>();
  return { workspaceId, userId: result.body.user.id, membershipId: result.body.active_membership_id,
    token: result.body.token, roles: Object.fromEntries(results.map((row) => [row.system_key, row.id])) };
}
async function count(sql: string, ...args: unknown[]): Promise<number> {
  return (await db.prepare(sql).bind(...args).first<{ n: number }>())!.n;
}
const changes = (workspaceId: string) =>
  count('SELECT COUNT(*) AS n FROM change_log WHERE workspace_id = ?', workspaceId);

const classBody = { name: 'Lớp A', weekdays: [1, 3], start_time: '18:00' };
const studentBody = { name: 'Học sinh A', parent_phone: '0900000999', enrolled_at: '2026-10-21' };
const sessionBody = { date: '2099-01-05', start_time: '09:00', is_makeup: false, note: 'x' };

describe('client-supplied id on create', () => {
  it('class: first call creates with the id, replay returns the same record and writes nothing', async () => {
    const t = await owner('Cid class');
    const id = crypto.randomUUID();
    const first = await call('/v1/classes', post({ ...classBody, id }), t.token);
    expect(first.status).toBe(201);
    expect(first.body.id).toBe(id);
    const sessions = await count('SELECT COUNT(*) AS n FROM class_sessions WHERE class_id = ?', id);
    expect(sessions).toBeGreaterThan(0);
    const logged = await changes(t.workspaceId);

    const second = await call('/v1/classes', post({ ...classBody, id }), t.token);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await count('SELECT COUNT(*) AS n FROM classes WHERE id = ?', id)).toBe(1);
    expect(await count('SELECT COUNT(*) AS n FROM class_sessions WHERE class_id = ?', id)).toBe(sessions);
    expect(await count('SELECT COUNT(*) AS n FROM member_classes WHERE class_id = ?', id)).toBe(1);
    expect(await changes(t.workspaceId)).toBe(logged);
  });

  it('normalizes the id to lowercase so an uppercase then lowercase replay is the same record', async () => {
    const t = await owner('Cid case');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    const lower = crypto.randomUUID();
    const first = await call(`/v1/classes/${classId}/students`, post({ ...studentBody, id: lower.toUpperCase() }), t.token);
    expect(first.status).toBe(201);
    expect(first.body.id).toBe(lower);
    const second = await call(`/v1/classes/${classId}/students`, post({ ...studentBody, id: lower }), t.token);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await count('SELECT COUNT(*) AS n FROM students WHERE id = ?', lower)).toBe(1);
  });

  it('class: without id the response shape is unchanged and the server generates the id', async () => {
    const t = await owner('Cid class noid');
    const res = await call('/v1/classes', post(classBody), t.token);
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(['id', 'name', 'start_time', 'status', 'version', 'weekdays']);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('class: id used in another workspace or by a student answers 409 id_conflict without detail', async () => {
    const a = await owner('Cid class A');
    const b = await owner('Cid class B');
    const id = crypto.randomUUID();
    expect((await call('/v1/classes', post({ ...classBody, id }), a.token)).status).toBe(201);
    const other = await call('/v1/classes', post({ ...classBody, id }), b.token);
    expect(other.status).toBe(409);
    expect(other.body.error.code).toBe('id_conflict');
    expect(other.body.error.details).toBeUndefined();
    expect(JSON.stringify(other.body)).not.toContain(a.workspaceId);

    const classB = await insertClass(b.workspaceId, 'B', b.userId);
    const studentId = await insertStudent(b.workspaceId, classB, 'S', null, b.userId);
    const clash = await call('/v1/classes', post({ ...classBody, id: studentId }), b.token);
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('id_conflict');
  });

  it('class: a teacher outside the class gets 409, not the record; revoked access gets 403', async () => {
    const t = await owner('Cid class teacher');
    const id = crypto.randomUUID();
    await call('/v1/classes', post({ ...classBody, id }), t.token);
    const teacherUser = await insertUser(fakePhone());
    const teacherMembership = await insertMembership(t.workspaceId, teacherUser, t.roles.teacher!, []);
    const teacherToken = await clubToken(t.workspaceId, teacherUser, teacherMembership);
    const outside = await call('/v1/classes', post({ ...classBody, id }), teacherToken);
    expect(outside.status).toBe(409);
    expect(outside.body.error.code).toBe('id_conflict');

    const ownId = crypto.randomUUID();
    expect((await call('/v1/classes', post({ ...classBody, id: ownId }), teacherToken)).status).toBe(201);
    await db.prepare(`UPDATE memberships SET status = 'disabled' WHERE id = ?`).bind(teacherMembership).run();
    const revoked = await call('/v1/classes', post({ ...classBody, id: ownId }), teacherToken);
    expect([401, 403]).toContain(revoked.status);
  });

  it('student: replay returns 200 with the same body and does not rerun guardian linking', async () => {
    const t = await owner('Cid student');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    const parent = await insertUser('+84900000999');
    const seed = await insertStudent(t.workspaceId, classId, 'Seed', '+84900000999', t.userId);
    const parentMembership = await insertGuardianMembership(t.workspaceId, parent, t.roles.guardian!, [seed]);
    const id = crypto.randomUUID();

    const first = await call(`/v1/classes/${classId}/students`, post({ ...studentBody, id }), t.token);
    expect(first.status).toBe(201);
    expect(first.body.id).toBe(id);
    const epoch = await count('SELECT scope_epoch AS n FROM memberships WHERE id = ?', parentMembership);
    const links = await count('SELECT COUNT(*) AS n FROM guardian_student WHERE student_id = ?', id);
    expect(links).toBe(1);
    const logged = await changes(t.workspaceId);

    const second = await call(`/v1/classes/${classId}/students`, post({ ...studentBody, id }), t.token);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await count('SELECT COUNT(*) AS n FROM students WHERE id = ?', id)).toBe(1);
    expect(await count('SELECT scope_epoch AS n FROM memberships WHERE id = ?', parentMembership)).toBe(epoch);
    expect(await changes(t.workspaceId)).toBe(logged);
  });

  it('student: id in another workspace, another class or another table answers 409 id_conflict', async () => {
    const a = await owner('Cid student A');
    const b = await owner('Cid student B');
    const classA1 = await insertClass(a.workspaceId, 'A1', a.userId);
    const classA2 = await insertClass(a.workspaceId, 'A2', a.userId);
    const classB = await insertClass(b.workspaceId, 'B', b.userId);
    const id = crypto.randomUUID();
    expect((await call(`/v1/classes/${classA1}/students`, post({ ...studentBody, id }), a.token)).status).toBe(201);

    for (const [path, token] of [
      [`/v1/classes/${classA2}/students`, a.token],
      [`/v1/classes/${classB}/students`, b.token],
    ] as const) {
      const res = await call(path, post({ ...studentBody, id }), token);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('id_conflict');
      expect(res.body.error.details).toBeUndefined();
    }
    const asClass = await call(`/v1/classes/${classA2}/students`, post({ ...studentBody, id: classA1 }), a.token);
    expect(asClass.status).toBe(409);
    expect(asClass.body.error.code).toBe('id_conflict');
    expect(await count('SELECT COUNT(*) AS n FROM students WHERE id = ?', id)).toBe(1);
  });

  it('student: a teacher removed from the class cannot replay the old id', async () => {
    const t = await owner('Cid student revoked');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    const teacherUser = await insertUser(fakePhone());
    const membership = await insertMembership(t.workspaceId, teacherUser, t.roles.teacher!, [classId]);
    const token = await clubToken(t.workspaceId, teacherUser, membership);
    const id = crypto.randomUUID();
    expect((await call(`/v1/classes/${classId}/students`, post({ ...studentBody, id }), token)).status).toBe(201);
    await db.prepare('DELETE FROM member_classes WHERE membership_id = ?').bind(membership).run();
    const replay = await call(`/v1/classes/${classId}/students`, post({ ...studentBody, id }), token);
    expect(replay.status).toBe(404);
  });

  it('student: without id the response is unchanged', async () => {
    const t = await owner('Cid student noid');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    const res = await call(`/v1/classes/${classId}/students`, post(studentBody), t.token);
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(
      ['class_id', 'enrolled_at', 'id', 'left_at', 'name', 'parent_phone', 'status', 'version']);
  });

  it('session: replay returns 200 with the same body and writes nothing', async () => {
    const t = await owner('Cid session');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    const id = crypto.randomUUID();
    const first = await call(`/v1/classes/${classId}/sessions`, post({ ...sessionBody, id }), t.token);
    expect(first.status).toBe(201);
    expect(first.body.id).toBe(id);
    const logged = await changes(t.workspaceId);
    const second = await call(`/v1/classes/${classId}/sessions`, post({ ...sessionBody, id }), t.token);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await count('SELECT COUNT(*) AS n FROM class_sessions WHERE id = ?', id)).toBe(1);
    expect(await changes(t.workspaceId)).toBe(logged);
  });

  it('session: id in another class or workspace answers 409; the same slot with a new id keeps session_exists', async () => {
    const a = await owner('Cid session A');
    const b = await owner('Cid session B');
    const class1 = await insertClass(a.workspaceId, 'A1', a.userId);
    const class2 = await insertClass(a.workspaceId, 'A2', a.userId);
    const classB = await insertClass(b.workspaceId, 'B', b.userId);
    const id = crypto.randomUUID();
    expect((await call(`/v1/classes/${class1}/sessions`, post({ ...sessionBody, id }), a.token)).status).toBe(201);
    for (const [path, token] of [
      [`/v1/classes/${class2}/sessions`, a.token],
      [`/v1/classes/${classB}/sessions`, b.token],
    ] as const) {
      const res = await call(path, post({ ...sessionBody, id }), token);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('id_conflict');
    }
    const slot = await call(`/v1/classes/${class1}/sessions`, post({ ...sessionBody, id: crypto.randomUUID() }), a.token);
    expect(slot.status).toBe(409);
    expect(slot.body.error.details.reason).toBe('session_exists');
    const existing = await insertSession(a.workspaceId, class2, '2099-02-01', a.userId);
    const asSession = await call(`/v1/classes/${class1}/sessions`, post({ ...sessionBody, date: '2099-03-01', id: existing }), a.token);
    expect(asSession.status).toBe(409);
    expect(asSession.body.error.code).toBe('id_conflict');
  });

  it('session: a teacher removed from the class cannot replay and no-id create is unchanged', async () => {
    const t = await owner('Cid session revoked');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    const teacherUser = await insertUser(fakePhone());
    const membership = await insertMembership(t.workspaceId, teacherUser, t.roles.teacher!, [classId]);
    const token = await clubToken(t.workspaceId, teacherUser, membership);
    const id = crypto.randomUUID();
    expect((await call(`/v1/classes/${classId}/sessions`, post({ ...sessionBody, id }), token)).status).toBe(201);
    await db.prepare('DELETE FROM member_classes WHERE membership_id = ?').bind(membership).run();
    expect((await call(`/v1/classes/${classId}/sessions`, post({ ...sessionBody, id }), token)).status).toBe(404);

    const plain = await call(`/v1/classes/${classId}/sessions`, post({ ...sessionBody, date: '2099-04-01' }), t.token);
    expect(plain.status).toBe(201);
    expect(Object.keys(plain.body).sort()).toEqual(
      ['class_id', 'date', 'id', 'is_makeup', 'note', 'origin', 'session_number', 'start_time', 'status', 'version']);
  });

  it('rejects ids that are not UUIDs on all three endpoints', async () => {
    const t = await owner('Cid invalid');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    for (const bad of ['abc', '', 42, null, 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz', `${crypto.randomUUID()}x`]) {
      for (const [path, body] of [
        ['/v1/classes', classBody],
        [`/v1/classes/${classId}/students`, studentBody],
        [`/v1/classes/${classId}/sessions`, sessionBody],
      ] as const) {
        const res = await call(path, post({ ...body, id: bad }), t.token);
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('validation_error');
        expect(res.body.error.details.fields.id).toBe('must_be_uuid');
      }
    }
  });

  it('concurrent creates with one id end with one record, one 201 and one 200', async () => {
    const t = await owner('Cid concurrent');
    const classId = await insertClass(t.workspaceId, 'C', t.userId);
    const id = crypto.randomUUID();
    const results = await Promise.all([1, 2, 3].map(() =>
      call(`/v1/classes/${classId}/students`, post({ ...studentBody, id }), t.token)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 200, 201]);
    expect(await count('SELECT COUNT(*) AS n FROM students WHERE id = ?', id)).toBe(1);
    expect(new Set(results.map((r) => JSON.stringify(r.body))).size).toBe(1);
  });

  it('concurrent class creates with one id do not duplicate sessions', async () => {
    const t = await owner('Cid concurrent class');
    const id = crypto.randomUUID();
    const results = await Promise.all([1, 2].map(() => call('/v1/classes', post({ ...classBody, id }), t.token)));
    expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
    expect(await count('SELECT COUNT(*) AS n FROM classes WHERE id = ?', id)).toBe(1);
    const dates = await count('SELECT COUNT(DISTINCT date) AS n FROM class_sessions WHERE class_id = ?', id);
    expect(await count('SELECT COUNT(*) AS n FROM class_sessions WHERE class_id = ?', id)).toBe(dates);
  });
});
