import { describe, expect, it, vi } from 'vitest';
import worker, { MINUTE_CRON, SLOW_CRON, scheduled } from '../src/index';
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

  describe('trigger routing', () => {
    async function statementsFor(cron: string | undefined) {
      const seen: string[] = [];
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const env = { DB: { prepare(sql: string) { seen.push(sql); throw new Error('stop'); } } } as any;
      await scheduled({ cron } as ScheduledController, env, {} as ExecutionContext);
      vi.restoreAllMocks();
      const touches = (needle: RegExp) => seen.some((sql) => needle.test(sql));
      return { push: touches(/FROM notifications|push_deliveries/), generation: touches(/FROM classes/), cleanup: touches(/password_reset_tokens|test_mailbox/) };
    }

    it('runs only push on the every-minute trigger', async () => {
      expect(await statementsFor(MINUTE_CRON)).toEqual({ push: true, generation: false, cleanup: false });
    });

    it('runs only generation and cleanup on the 30-minute trigger', async () => {
      expect(await statementsFor(SLOW_CRON)).toEqual({ push: false, generation: true, cleanup: true });
    });

    it('runs every job for an unknown or missing cron expression', async () => {
      for (const cron of [undefined, '0 17 * * *']) {
        expect(await statementsFor(cron)).toEqual({ push: true, generation: true, cleanup: true });
      }
    });
  });
});
