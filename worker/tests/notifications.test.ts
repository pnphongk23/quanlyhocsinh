import { beforeAll, describe, expect, it } from 'vitest';
import {
  call,
  clubToken,
  db,
  fakePhone,
  insertClass,
  insertGuardianLink,
  insertMembership,
  insertSession,
  insertStudent,
  insertTest,
  insertUser,
  registerWorkspace,
} from './helpers';
import { nowIso } from '../src/lib/time';

interface NotificationSeed {
  workspaceId: string;
  userId: string;
  membershipId: string;
  kind: 'slip_sent' | 'report_published' | 'homework_assigned' | 'score_updated';
  studentId: string;
  sessionId?: string | null;
  reportId?: string | null;
  testId?: string | null;
  eventKey: string;
}

async function insertNotification(seed: NotificationSeed): Promise<number> {
  const now = nowIso();
  const row = await db
    .prepare(
      `INSERT INTO notifications
        (workspace_id, user_id, membership_id, kind, event_key, student_id, session_id,
         report_id, test_id, created_at, ready_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
    )
    .bind(
      seed.workspaceId,
      seed.userId,
      seed.membershipId,
      seed.kind,
      seed.eventKey,
      seed.studentId,
      seed.sessionId ?? null,
      seed.reportId ?? null,
      seed.testId ?? null,
      now,
      now,
    )
    .first<{ id: number }>();
  return row!.id;
}

async function insertReport(
  workspaceId: string,
  classId: string,
  studentId: string,
  month = '2026-10',
): Promise<string> {
  const id = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO reports
        (id, workspace_id, class_id, student_id, month, status, general_comment,
         needs_republish, publication_count, published_at, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'published', '', 0, 1, ?, 1, ?, ?)`,
    )
    .bind(id, workspaceId, classId, studentId, month, now, now, now)
    .run();
  return id;
}

describe('notification inbox routes (guardian only)', () => {
  let fixture: {
    ws: { workspaceId: string; userId: string; membershipId: string; token: string; roles: Record<string, string> };
    otherWs: { workspaceId: string; userId: string; roles: Record<string, string> };
    classId: string;
    otherClassId: string;
    studentId: string;
    otherStudentId: string;
    sessionId: string;
    reportId: string;
    testId: string;
    archivedTestId: string;
    guardian: { userId: string; membershipId: string; token: string };
    secondGuardian: { userId: string; membershipId: string; token: string };
    otherWorkspaceGuardian: { userId: string; membershipId: string; token: string };
    admin: string;
    teacher: string;
    assistant: string;
    ids: Record<string, number>;
  };

  beforeAll(async () => {
    const ws = await registerWorkspace(fakePhone(), 'inbox workspace');
    const otherWs = await registerWorkspace(fakePhone(), 'other inbox workspace');
    const classId = await insertClass(ws.workspaceId, 'C1', ws.userId);
    const otherClassId = await insertClass(ws.workspaceId, 'C2', ws.userId);
    const studentId = await insertStudent(
      ws.workspaceId,
      classId,
      'Học sinh giả A',
      '+84900000011',
      ws.userId,
    );
    const otherStudentId = await insertStudent(
      ws.workspaceId,
      otherClassId,
      'Học sinh giả B',
      '+84900000012',
      ws.userId,
    );
    const sessionId = await insertSession(ws.workspaceId, classId, '2026-10-21', ws.userId, 'held');
    const reportId = await insertReport(ws.workspaceId, classId, studentId);
    const testId = await insertTest(ws.workspaceId, classId, ws.userId);
    const archivedTestId = await insertTest(ws.workspaceId, classId, ws.userId, 15, '2026-10-07');
    await db
      .prepare('UPDATE tests SET archived = 1 WHERE id = ?')
      .bind(archivedTestId)
      .run();

    async function staff(role: string, classes: string[]): Promise<string> {
      const user = await insertUser(fakePhone());
      const membership = await insertMembership(ws.workspaceId, user, ws.roles[role]!, classes);
      return clubToken(ws.workspaceId, user, membership);
    }

    async function guardian(
      memberWorkspace: { workspaceId: string; roles: Record<string, string> },
      studentIds: string[],
    ): Promise<{ userId: string; membershipId: string; token: string }> {
      const user = await insertUser(fakePhone());
      for (const id of studentIds) {
        await insertGuardianLink(memberWorkspace.workspaceId, user, id);
      }
      const membershipId = await insertMembership(
        memberWorkspace.workspaceId,
        user,
        memberWorkspace.roles.guardian!,
      );
      return {
        userId: user,
        membershipId,
        token: await clubToken(memberWorkspace.workspaceId, user, membershipId),
      };
    }

    const foreignClassId = await insertClass(otherWs.workspaceId, 'CB', otherWs.userId);
    const foreignStudentId = await insertStudent(
      otherWs.workspaceId,
      foreignClassId,
      'Học sinh giả CB',
      '+84900000013',
      otherWs.userId,
    );

    const primary = await guardian(ws, [studentId]);
    const foreignGuardian = await guardian(otherWs, [foreignStudentId]);

    // Phụ huynh thứ hai trong cùng workspace: liên kết phải có trước membership
    // (trigger `guardian_without_link`).
    const secondUser = await insertUser(fakePhone());
    await insertGuardianLink(ws.workspaceId, secondUser, otherStudentId);
    const secondMembership = await insertMembership(
      ws.workspaceId,
      secondUser,
      ws.roles.guardian!,
    );
    const second = { userId: secondUser, membershipId: secondMembership };
    const secondToken = await clubToken(ws.workspaceId, secondUser, secondMembership);

    const ids: Record<string, number> = {};
    ids.slip = await insertNotification({
      workspaceId: ws.workspaceId,
      userId: primary.userId,
      membershipId: primary.membershipId,
      kind: 'slip_sent',
      studentId,
      sessionId,
      eventKey: `slip:${sessionId}:${studentId}`,
    });
    ids.report = await insertNotification({
      workspaceId: ws.workspaceId,
      userId: primary.userId,
      membershipId: primary.membershipId,
      kind: 'report_published',
      studentId,
      reportId,
      eventKey: 'report:1',
    });
    ids.score = await insertNotification({
      workspaceId: ws.workspaceId,
      userId: primary.userId,
      membershipId: primary.membershipId,
      kind: 'score_updated',
      studentId,
      testId,
      eventKey: 'score:1',
    });
    ids.archivedScore = await insertNotification({
      workspaceId: ws.workspaceId,
      userId: primary.userId,
      membershipId: primary.membershipId,
      kind: 'score_updated',
      studentId,
      testId: archivedTestId,
      eventKey: 'score:2',
    });
    ids.otherStudent = await insertNotification({
      workspaceId: ws.workspaceId,
      userId: second.userId,
      membershipId: secondMembership,
      kind: 'slip_sent',
      studentId: otherStudentId,
      sessionId,
      eventKey: `slip:${sessionId}:${otherStudentId}`,
    });

    fixture = {
      ws,
      otherWs,
      classId,
      otherClassId,
      studentId,
      otherStudentId,
      sessionId,
      reportId,
      testId,
      archivedTestId,
      guardian: primary,
      secondGuardian: { userId: second.userId, membershipId: secondMembership, token: secondToken },
      otherWorkspaceGuardian: {
        userId: foreignGuardian.userId,
        membershipId: foreignGuardian.membershipId,
        token: foreignGuardian.token,
      },
      admin: ws.token,
      teacher: await staff('teacher', [classId]),
      assistant: await staff('assistant', [classId]),
      ids,
    };
  });

  it('requires authentication and rejects staff roles', async () => {
    expect((await call('/v1/notifications')).status).toBe(401);
    expect((await call('/v1/notifications/read', { method: 'POST', body: '{"up_to_id":1}' })).status).toBe(401);
    for (const token of [fixture.admin, fixture.teacher, fixture.assistant]) {
      const list = await call('/v1/notifications', {}, token);
      expect(list.status).toBe(403);
      expect(list.body.error.code).toBe('forbidden');
      const read = await call(
        '/v1/notifications/read',
        { method: 'POST', body: JSON.stringify({ up_to_id: 1 }) },
        token,
      );
      expect(read.status).toBe(403);
    }
  });

  it('shows only the guardian own inbox, without sensitive content', async () => {
    const own = await call('/v1/notifications', {}, fixture.guardian.token);
    expect(own.status).toBe(200);
    const ids = own.body.items.map((item: any) => item.id);
    expect(ids).toContain(fixture.ids.slip);
    expect(ids).toContain(fixture.ids.report);
    expect(ids).toContain(fixture.ids.score);
    // Bài lưu trữ không còn là thông báo hiệu lực.
    expect(ids).not.toContain(fixture.ids.archivedScore);

    const serialized = JSON.stringify(own.body);
    for (const secret of ['note', 'stars', 'value', 'parent_phone', 'FAKE_FCM']) {
      expect(serialized).not.toContain(secret);
    }
    const byKind = Object.fromEntries(
      own.body.items.map((item: any) => [item.kind, item]),
    );
    expect(byKind.report_published.report_id).toBe(fixture.reportId);
    expect(byKind.report_published.test_id).toBeNull();
    expect(byKind.score_updated.test_id).toBe(fixture.testId);
    expect(byKind.score_updated.report_id).toBeNull();
    expect(byKind.slip_sent.session_id).toBe(fixture.sessionId);
    expect(byKind.slip_sent.report_id).toBeNull();
    expect(byKind.slip_sent.test_id).toBeNull();
  });

  it('does not leak between guardians or workspaces', async () => {
    const otherGuardian = await call('/v1/notifications', {}, fixture.secondGuardian.token);
    expect(otherGuardian.status).toBe(200);
    const otherIds = otherGuardian.body.items.map((item: any) => item.id);
    expect(otherIds).toEqual([fixture.ids.otherStudent]);

    const foreign = await call('/v1/notifications', {}, fixture.otherWorkspaceGuardian.token);
    expect(foreign.status).toBe(200);
    expect(foreign.body.items).toEqual([]);
  });

  it('paginates with an opaque cursor stable under new rows', async () => {
    const first = await call('/v1/notifications?limit=2', {}, fixture.guardian.token);
    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(2);
    expect(typeof first.body.next_cursor).toBe('string');
    const firstIds = first.body.items.map((item: any) => item.id);

    // Dòng mới xen vào không làm lệch trang sau.
    await insertNotification({
      workspaceId: fixture.ws.workspaceId,
      userId: fixture.guardian.userId,
      membershipId: fixture.guardian.membershipId,
      kind: 'homework_assigned',
      studentId: fixture.studentId,
      sessionId: fixture.sessionId,
      eventKey: `homework:${crypto.randomUUID()}`,
    });

    const second = await call(
      `/v1/notifications?limit=2&cursor=${encodeURIComponent(first.body.next_cursor)}`,
      {},
      fixture.guardian.token,
    );
    expect(second.status).toBe(200);
    const secondIds = second.body.items.map((item: any) => item.id);
    for (const id of secondIds) expect(firstIds).not.toContain(id);
    expect(Math.max(...secondIds)).toBeLessThan(Math.min(...firstIds));
  });

  it('rejects a forged cursor and invalid up_to_id', async () => {
    const badCursor = await call('/v1/notifications?cursor=not-a-cursor', {}, fixture.guardian.token);
    expect(badCursor.status).toBe(422);
    const badLimit = await call('/v1/notifications?limit=abc', {}, fixture.guardian.token);
    expect(badLimit.status).toBe(422);
    const missing = await call('/v1/notifications/read', { method: 'POST', body: '{}' }, fixture.guardian.token);
    expect(missing.status).toBe(422);
    const negative = await call(
      '/v1/notifications/read',
      { method: 'POST', body: JSON.stringify({ up_to_id: -1 }) },
      fixture.guardian.token,
    );
    expect(negative.status).toBe(422);
  });

  it('marks read only the current membership inbox and stops hiding linked students', async () => {
    const read = await call(
      '/v1/notifications/read',
      { method: 'POST', body: JSON.stringify({ up_to_id: fixture.ids.score }) },
      fixture.guardian.token,
    );
    expect(read.status).toBe(200);
    expect(read.body.updated).toBeGreaterThan(0);

    const rows = await db
      .prepare(
        `SELECT membership_id, read_at FROM notifications
          WHERE id IN (?, ?, ?) ORDER BY id`,
      )
      .bind(fixture.ids.slip, fixture.ids.report, fixture.ids.score)
      .all<{ membership_id: string; read_at: string | null }>();
    for (const row of rows.results) {
      expect(row.membership_id).toBe(fixture.guardian.membershipId);
      expect(row.read_at).not.toBeNull();
    }
    const other = await db
      .prepare('SELECT read_at FROM notifications WHERE id = ?')
      .bind(fixture.ids.otherStudent)
      .first<{ read_at: string | null }>();
    expect(other!.read_at).toBeNull();

    // Gỡ liên kết con ⇒ inbox của em đó biến mất, kể cả dòng chưa đọc.
    await db
      .prepare('DELETE FROM guardian_student WHERE user_id = ? AND student_id = ?')
      .bind(fixture.guardian.userId, fixture.studentId)
      .run();
    const after = await call('/v1/notifications', {}, fixture.guardian.token);
    expect(after.body.items).toEqual([]);
  });

  it('blocks must_change_password before serving the inbox', async () => {
    const user = await insertUser(fakePhone());
    await insertGuardianLink(fixture.ws.workspaceId, user, fixture.otherStudentId);
    const membershipId = await insertMembership(
      fixture.ws.workspaceId,
      user,
      fixture.ws.roles.guardian!,
    );
    const token = await clubToken(fixture.ws.workspaceId, user, membershipId);
    await db.prepare('UPDATE users SET must_change_password = 1 WHERE id = ?').bind(user).run();
    const result = await call('/v1/notifications', {}, token);
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe('password_change_required');
  });
});
