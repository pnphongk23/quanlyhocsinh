import { describe, expect, it } from 'vitest';
import worker, { scheduled } from '../src/index';
import { db, fakePhone, insertClass, registerWorkspace, testEnv } from './helpers';

describe('scheduled Worker handler', () => {
  it('dispatches cron work to recurring session generation', async () => {
    const owner = await registerWorkspace(fakePhone(), 'Scheduled generation');
    const classId = await insertClass(owner.workspaceId, 'Recurring class', owner.userId);
    await db.prepare('UPDATE classes SET weekdays = 127 WHERE id = ?').bind(classId).run();

    const context = { waitUntil: () => undefined } as unknown as ExecutionContext;
    await scheduled(
      { cron: '0 17 * * *', scheduledTime: Date.now() } as ScheduledController,
      testEnv,
      context,
    );

    const classRow = await db.prepare('SELECT generated_until FROM classes WHERE id = ?')
      .bind(classId).first<{ generated_until: string | null }>();
    const sessions = await db.prepare('SELECT COUNT(*) AS count FROM class_sessions WHERE class_id = ?')
      .bind(classId).first<{ count: number }>();

    expect(worker.scheduled).toBe(scheduled);
    expect(classRow?.generated_until).toBeTruthy();
    expect(sessions?.count).toBeGreaterThan(0);
  });
});
