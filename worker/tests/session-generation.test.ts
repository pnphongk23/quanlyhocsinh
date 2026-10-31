import { describe, expect, it } from 'vitest';
import { db, fakePhone, insertClass, insertSession, registerWorkspace } from './helpers';
import { generateUpcomingSessions } from '../src/db/session-generation';

/** 2026-10-21T17:00Z = 2026-10-22 00:00 giờ Việt Nam ⇒ cửa sổ cron 2026-10-22 … 2026-12-17. */
const NOW = new Date('2026-10-21T17:00:00.000Z');

async function daysOf(classId: string) {
  const { results } = await db.prepare(`SELECT date, COUNT(*) AS n FROM class_sessions
    WHERE class_id = ? GROUP BY date ORDER BY date`).bind(classId).all<{ date: string; n: number }>();
  return results;
}

describe('recurring session generation (cron)', () => {
  it('never adds a second session on a day that already has a one-off or cancelled session', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Cron one session per day');
    const classId = await insertClass(owner.workspaceId, 'Recurring', owner.userId);
    await db.prepare(`UPDATE classes SET weekdays = 127, start_time = '18:00', generated_until = NULL WHERE id = ?`)
      .bind(classId).run();

    // Buổi lẻ (make-up) lệch giờ so với giờ lặp, nằm trong cửa sổ cron.
    const manualId = await insertSession(owner.workspaceId, classId, '2026-11-05', owner.userId);
    await db.prepare(`UPDATE class_sessions SET origin = 'manual', is_makeup = 1, start_time = '19:00' WHERE id = ?`)
      .bind(manualId).run();
    // Buổi đã hủy lệch giờ: UNIQUE(class_id,date,start_time) không chặn được buổi lặp 18:00.
    const cancelledId = await insertSession(owner.workspaceId, classId, '2026-11-10', owner.userId, 'cancelled');
    await db.prepare(`UPDATE class_sessions SET start_time = '19:30' WHERE id = ?`).bind(cancelledId).run();

    const result = await generateUpcomingSessions(db, NOW);
    expect(result.generated_until).toBe('2026-12-17');

    const days = await daysOf(classId);
    expect(days.filter((row) => row.n > 1)).toEqual([]);
    expect(days.map((row) => row.date)).toContain('2026-11-05');
    expect(days.map((row) => row.date)).toContain('2026-11-10');
    expect(days.length, 'one session on each of the 57 days in the window').toBe(57);

    const manualDay = await db.prepare(`SELECT id, start_time, origin, status FROM class_sessions
      WHERE class_id = ? AND date = '2026-11-05'`).bind(classId).all();
    expect(manualDay.results).toEqual([{ id: manualId, start_time: '19:00', origin: 'manual', status: 'planned' }]);
    const cancelledDay = await db.prepare(`SELECT id, start_time, status FROM class_sessions
      WHERE class_id = ? AND date = '2026-11-10'`).bind(classId).all();
    expect(cancelledDay.results).toEqual([{ id: cancelledId, start_time: '19:30', status: 'cancelled' }]);

    await generateUpcomingSessions(db, NOW);
    expect(await daysOf(classId)).toEqual(days);
    const repeated = await db.prepare('SELECT generated_until FROM classes WHERE id = ?')
      .bind(classId).first<{ generated_until: string }>();
    expect(repeated?.generated_until).toBe('2026-12-17');
  });

  it('does not duplicate a one-off session once the sliding window reaches it', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Cron sliding window');
    const classId = await insertClass(owner.workspaceId, 'Recurring', owner.userId);
    await db.prepare(`UPDATE classes SET weekdays = 127, start_time = '18:00', generated_until = NULL WHERE id = ?`)
      .bind(classId).run();
    await generateUpcomingSessions(db, NOW);

    // Buổi make-up đặt trước, xa hơn `generated_until` của lượt cron đầu (2026-12-17).
    const makeUpId = await insertSession(owner.workspaceId, classId, '2026-12-20', owner.userId);
    await db.prepare(`UPDATE class_sessions SET origin = 'manual', is_makeup = 1, start_time = '19:00' WHERE id = ?`)
      .bind(makeUpId).run();

    const sliding = await generateUpcomingSessions(db, new Date('2026-12-16T17:00:00.000Z'));
    expect(sliding.generated_until).toBe('2027-02-11');
    const days = await daysOf(classId);
    expect(days.filter((row) => row.n > 1)).toEqual([]);
    const makeUpDay = await db.prepare(`SELECT id, start_time, origin FROM class_sessions
      WHERE class_id = ? AND date = '2026-12-20'`).bind(classId).all();
    expect(makeUpDay.results).toEqual([{ id: makeUpId, start_time: '19:00', origin: 'manual' }]);

    await generateUpcomingSessions(db, new Date('2026-12-16T17:00:00.000Z'));
    expect(await daysOf(classId)).toEqual(days);
  });
});
