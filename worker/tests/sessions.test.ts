import { describe, expect, it } from 'vitest';
import { call, clubToken, db, insertClass, insertGuardianMembership, insertMembership, insertSession, insertStudent, insertUser, post, registerWorkspace, PASSWORD, type RegisteredWorkspace } from './helpers';
import { generateUpcomingSessions } from '../src/db/session-generation';

async function registerWorkspaceAtIp(phone: string, name: string, ip: string): Promise<RegisteredWorkspace> {
  const result = await call('/v1/auth/register', {
    ...post({ phone, password: PASSWORD, display_name: 'Teacher Sample', workspace_name: name }),
    headers: { 'cf-connecting-ip': ip },
  });
  if (result.status !== 201) throw new Error(`test workspace setup failed: ${result.status}`);
  const workspaceId = result.body.memberships[0].workspace.id as string;
  const { results } = await db.prepare('SELECT system_key, id FROM roles WHERE workspace_id = ?')
    .bind(workspaceId).all<{ system_key: string; id: string }>();
  return { workspaceId, userId: result.body.user.id, membershipId: result.body.active_membership_id,
    token: result.body.token, roles: Object.fromEntries(results.map((row) => [row.system_key, row.id])) };
}

describe('sessions API', () => {
  it('lists and numbers sessions, filters parent calendar, creates one-off sessions and cancels planned sessions', async () => {
    const owner = await registerWorkspaceAtIp('+84900000301', 'Sessions API', '198.51.100.14');
    const classId = await insertClass(owner.workspaceId, 'Class A', owner.userId);
    const firstId = await insertSession(owner.workspaceId, classId, '2026-10-22', owner.userId);
    const secondId = await insertSession(owner.workspaceId, classId, '2026-10-29', owner.userId);
    await db.prepare('UPDATE class_sessions SET note = ? WHERE id = ?').bind('Private note', firstId).run();
    const list = await call(`/v1/classes/${classId}/sessions?from=2026-10-01&to=2026-11-30&limit=1`, {}, owner.token);
    expect(list.status).toBe(200);
    expect(list.body.items[0]).toMatchObject({ id: firstId, session_number: 1 });
    expect(typeof list.body.next_cursor).toBe('string');
    const next = await call(`/v1/classes/${classId}/sessions?from=2026-10-01&to=2026-11-30&cursor=${encodeURIComponent(list.body.next_cursor)}`, {}, owner.token);
    expect(next.body.items[0]).toMatchObject({ id: secondId, session_number: 2 });

    const studentId = await insertStudent(owner.workspaceId, classId, 'Student A', null, owner.userId);
    const parentUser = await insertUser('+84900000302');
    const parentMembership = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [studentId]);
    const parentToken = await clubToken(owner.workspaceId, parentUser, parentMembership);
    const parentSessions = await call(`/v1/classes/${classId}/sessions?from=2026-10-01&to=2026-11-30`, {}, parentToken);
    expect(parentSessions.body.items[0]).not.toHaveProperty('note');
    const calendar = await call('/v1/calendar?from=2026-10-01&to=2026-11-30', {}, parentToken);
    expect(calendar.body.items.map((item: any) => item.id)).toEqual([firstId, secondId]);

    const manual = await call(`/v1/classes/${classId}/sessions`, post({ date: '2026-11-05', start_time: '19:30', is_makeup: true, note: 'Makeup' }), owner.token);
    expect(manual.status).toBe(201);
    expect(manual.body).toMatchObject({ origin: 'manual', status: 'planned', is_makeup: true, note: 'Makeup' });
    expect((await call(`/v1/classes/${classId}/sessions`, post({ date: '2026-11-05', start_time: '19:30' }), owner.token)).body.error.details.reason).toBe('session_exists');
    expect((await call(`/v1/sessions/${manual.body.id}/cancel`, { method: 'POST' }, parentToken)).status).toBe(403);
    expect((await call(`/v1/sessions/${manual.body.id}/cancel`, { method: 'POST' }, owner.token)).body).toMatchObject({ status: 'cancelled', version: 2 });
    expect((await call(`/v1/sessions/${manual.body.id}/cancel`, { method: 'POST' }, owner.token)).body.error.details.reason).toBe('session_not_planned');

    const otherClass = await insertClass(owner.workspaceId, 'Class B', owner.userId);
    const teacherUser = await insertUser('+84900000303');
    const teacherMembership = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [otherClass]);
    const teacherToken = await clubToken(owner.workspaceId, teacherUser, teacherMembership);
    expect((await call(`/v1/classes/${classId}/sessions?from=2026-10-01&to=2026-11-30`, {}, teacherToken)).status).toBe(404);
    expect((await call('/v1/calendar?from=2026-10-01&to=2026-11-30')).status).toBe(401);
  });

  it('cron fills the next 56 days in bounded, repeatable class batches', async () => {
    const owner = await registerWorkspaceAtIp('+84900000311', 'Cron API', '198.51.100.15');
    const classId = await insertClass(owner.workspaceId, 'Recurring', owner.userId);
    await db.prepare("UPDATE classes SET weekdays = 127, generated_until = '2026-10-21' WHERE id = ?").bind(classId).run();
    const result = await generateUpcomingSessions(db, new Date('2026-10-21T17:00:00.000Z'));
    expect(result.processed_classes).toBeGreaterThanOrEqual(1);
    const count = async () => db.prepare("SELECT COUNT(*) AS n FROM class_sessions WHERE class_id = ? AND origin = 'recurring'")
      .bind(classId).first<{ n: number }>();
    expect((await count())?.n).toBe(57);
    const row = await db.prepare('SELECT generated_until FROM classes WHERE id = ?').bind(classId).first<{ generated_until: string }>();
    expect(row?.generated_until).toBe('2026-12-17');
    await generateUpcomingSessions(db, new Date('2026-10-21T17:00:00.000Z'));
    expect((await count())?.n).toBe(57);
  });

  it('checks the role matrix for every session endpoint and calendar scope', async () => {
    const owner = await registerWorkspaceAtIp('+84900000321', 'Session role matrix', '198.51.100.25');
    const classId = await insertClass(owner.workspaceId, 'C1', owner.userId);
    const otherClass = await insertClass(owner.workspaceId, 'C2', owner.userId);
    const child = await insertStudent(owner.workspaceId, classId, 'Child A', null, owner.userId);
    const otherChild = await insertStudent(owner.workspaceId, otherClass, 'Child B', null, owner.userId);
    const teacherUser = await insertUser('+84900000322');
    const teacherMember = await insertMembership(owner.workspaceId, teacherUser, owner.roles.teacher!, [classId]);
    const assistantUser = await insertUser('+84900000323');
    const assistantMember = await insertMembership(owner.workspaceId, assistantUser, owner.roles.assistant!, [classId]);
    const parentUser = await insertUser('+84900000324');
    const parentMember = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [child]);
    const otherParentUser = await insertUser('+84900000325');
    const otherParentMember = await insertGuardianMembership(owner.workspaceId, otherParentUser, owner.roles.guardian!, [otherChild]);
    const otherWorkspace = await registerWorkspaceAtIp('+84900000326', 'Session matrix workspace B', '198.51.100.26');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const plusDays = (n: number) => {
      const day = new Date(`${today}T00:00:00.000Z`);
      day.setUTCDate(day.getUTCDate() + n);
      return day.toISOString().slice(0, 10);
    };
    const targetSession = await insertSession(owner.workspaceId, classId, plusDays(0), owner.userId);
    await insertSession(owner.workspaceId, otherClass, plusDays(0), owner.userId);
    const actors = [
      { name: 'Admin', token: owner.token, list: 200, calendar: 200, create: 201, cancel: 200 },
      { name: 'Giáo viên', token: await clubToken(owner.workspaceId, teacherUser, teacherMember), list: 200, calendar: 200, create: 201, cancel: 200 },
      { name: 'Trợ giảng', token: await clubToken(owner.workspaceId, assistantUser, assistantMember), list: 200, calendar: 200, create: 201, cancel: 200 },
      { name: 'Phụ huynh', token: await clubToken(owner.workspaceId, parentUser, parentMember), list: 200, calendar: 200, create: 403, cancel: 403 },
      { name: 'Chưa đăng nhập', token: undefined, list: 401, calendar: 401, create: 401, cancel: 401 },
      { name: 'Workspace khác', token: otherWorkspace.token, list: 404, calendar: 200, create: 404, cancel: 404 },
      { name: 'Phụ huynh khác', token: await clubToken(owner.workspaceId, otherParentUser, otherParentMember), list: 404, calendar: 200, create: 404, cancel: 404 },
    ];
    const start = plusDays(0);
    const end = plusDays(15);
    const monthStart = `${start.slice(0, 7)}-01`;
    const monthEndDate = new Date(`${monthStart}T00:00:00.000Z`);
    monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
    monthEndDate.setUTCDate(0);
    const monthEnd = monthEndDate.toISOString().slice(0, 10);
    const dayCalendar = await call(`/v1/calendar?from=${start}&to=${start}`, {}, owner.token);
    expect(dayCalendar.body.items.some((row: any) => row.id === targetSession)).toBe(true);
    expect(dayCalendar.body.items.every((row: any) => row.date === start)).toBe(true);
    const monthCalendar = await call(`/v1/calendar?from=${monthStart}&to=${monthEnd}`, {}, owner.token);
    expect(monthCalendar.body.items.some((row: any) => row.id === targetSession)).toBe(true);
    for (let index = 0; index < actors.length; index += 1) {
      const actor = actors[index]!;
      const list = await call(`/v1/classes/${classId}/sessions?from=${start}&to=${end}`, {}, actor.token);
      expect(list.status, `${actor.name} GET /classes/:id/sessions`).toBe(actor.list);
      if (actor.name === 'Phụ huynh') expect(list.body.items.every((row: any) => !('note' in row))).toBe(true);
      const calendar = await call(`/v1/calendar?from=${start}&to=${end}`, {}, actor.token);
      expect(calendar.status, `${actor.name} GET /calendar`).toBe(actor.calendar);
      if (actor.name === 'Workspace khác' || actor.name === 'Phụ huynh khác') {
        expect(calendar.body.items.some((row: any) => row.id === targetSession)).toBe(false);
      }
      expect((await call(`/v1/classes/${classId}/sessions`, post({ date: plusDays(20), start_time: `19:${String(index).padStart(2, '0')}` }), actor.token)).status,
        `${actor.name} POST /classes/:id/sessions`).toBe(actor.create);
      const cancelId = await insertSession(owner.workspaceId, classId, plusDays(30 + index), owner.userId);
      expect((await call(`/v1/sessions/${cancelId}/cancel`, { method: 'POST' }, actor.token)).status,
        `${actor.name} POST /sessions/:id/cancel`).toBe(actor.cancel);
    }
  });

  it('canceled sessions have no number and the remaining sequence stays continuous', async () => {
    const owner = await registerWorkspaceAtIp('+84900000327', 'Session numbering', '198.51.100.16');
    const classId = await insertClass(owner.workspaceId, 'C1', owner.userId);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const nextDate = (offset: number) => {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    };
    const ids = [0, 1, 2].map((offset) => ({ date: nextDate(offset), offset }));
    const sessions: string[] = [];
    for (const row of ids) sessions.push(await insertSession(owner.workspaceId, classId, row.date, owner.userId));
    const cancel = await call(`/v1/sessions/${sessions[1]}/cancel`, { method: 'POST' }, owner.token);
    expect(cancel.status).toBe(200);
    const list = await call(`/v1/classes/${classId}/sessions?from=${ids[0]!.date}&to=${ids[2]!.date}`, {}, owner.token);
    const byId = new Map(list.body.items.map((row: any) => [row.id, row]));
    expect(byId.get(sessions[1])).toMatchObject({ status: 'cancelled', session_number: null });
    expect(byId.get(sessions[0])).toMatchObject({ session_number: 1 });
    expect(byId.get(sessions[2])).toMatchObject({ session_number: 2 });
  });

  it('replays homework grades when canceling a session changes their grading session', async () => {
    const owner = await registerWorkspaceAtIp('+84900000341', 'Homework grade replay', '198.51.100.29');
    const classId = await insertClass(owner.workspaceId, 'C1', owner.userId);
    const studentId = await insertStudent(owner.workspaceId, classId, 'Child A', null, owner.userId);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const relativeDate = (offset: number) => {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    };
    const assignmentSession = await insertSession(owner.workspaceId, classId, relativeDate(-2), owner.userId);
    const cancelledSession = await insertSession(owner.workspaceId, classId, relativeDate(-1), owner.userId);
    const newGradingSession = await insertSession(owner.workspaceId, classId, relativeDate(0), owner.userId);
    const parentUser = await insertUser('+84900000342');
    const parentMembership = await insertGuardianMembership(owner.workspaceId, parentUser, owner.roles.guardian!, [studentId]);
    const parentToken = await clubToken(owner.workspaceId, parentUser, parentMembership);
    const sectionId = crypto.randomUUID();
    const command = (type: string, payload: Record<string, unknown>) => ({
      id: crypto.randomUUID(), type, payload, base_version: 0, created_at: new Date().toISOString(),
    });
    const push = (commands: ReturnType<typeof command>[]) => call('/v1/sync/push', post({
      membership_id: owner.membershipId, device_id: crypto.randomUUID(), commands,
    }), owner.token);
    const setup = await push([
      command('homework.section.upsert', { id: sectionId, session_id: assignmentSession, kind: 'reading' }),
      command('homework.grade.set', { section_id: sectionId, student_id: studentId, level: 'done' }),
      command('slip.set', { session_id: newGradingSession, student_id: studentId, stars: 3, note: '' }),
    ]);
    expect(setup.body.results.map((result: any) => result.status)).toEqual(['applied', 'applied', 'applied']);
    const sent = await push([command('slip.send', { session_id: newGradingSession, student_ids: [studentId] })]);
    expect(sent.body.results[0].status).toBe('applied');

    const before = await call(`/v1/sync/snapshot?membership_id=${parentMembership}`, {}, parentToken);
    expect(before.status).toBe(200);
    const hidden = await call(`/v1/sync/snapshot/homework_grade?membership_id=${parentMembership}`, {}, parentToken);
    expect(hidden.body.items).toEqual([]);

    const cancelled = await call(`/v1/sessions/${cancelledSession}/cancel`, { method: 'POST' }, owner.token);
    expect(cancelled.status).toBe(200);
    const replay = await call(`/v1/sync/pull?membership_id=${parentMembership}&cursor=${before.body.cursor}&epoch=${before.body.epoch}`, {}, parentToken);
    expect(replay.status).toBe(200);
    expect(replay.body.upserts.homework_grade).toContainEqual(expect.objectContaining({
      section_id: sectionId, student_id: studentId, level: 'done',
    }));
  });
});
