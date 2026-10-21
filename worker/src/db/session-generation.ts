function dateInVietnam(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function plusDays(value: string, count: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
function bitForDate(value: string): number {
  return (new Date(`${value}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

/** Sinh tối đa 20 lớp mỗi lượt, idempotent nhờ UNIQUE(class_id,date,start_time). */
export async function generateUpcomingSessions(db: D1Database, now = new Date()) {
  const today = dateInVietnam(now);
  const until = plusDays(today, 56);
  const nowIsoValue = now.toISOString();
  const { results: classes } = await db.prepare(`SELECT id, workspace_id, weekdays, start_time, generated_until
    FROM classes WHERE status = 'active' AND (generated_until IS NULL OR generated_until < ?)
    ORDER BY COALESCE(generated_until, ''), id LIMIT 20`).bind(until)
    .all<{ id: string; workspace_id: string; weekdays: number; start_time: string; generated_until: string | null }>();

  let inserted = 0;
  for (const cls of classes) {
    const from = cls.generated_until && cls.generated_until >= today
      ? plusDays(cls.generated_until, 1) : today;
    const statements: D1PreparedStatement[] = [];
    for (let day = from; day <= until; day = plusDays(day, 1)) {
      if ((cls.weekdays & (1 << bitForDate(day))) === 0) continue;
      statements.push(db.prepare(`INSERT OR IGNORE INTO class_sessions
        (id, workspace_id, class_id, date, start_time, origin, is_makeup, status, note,
         cancelled_at, cancelled_by, created_at, updated_at, updated_by, version)
        VALUES (?, ?, ?, ?, ?, 'recurring', 0, 'planned', '', NULL, NULL, ?, ?, NULL, 1)`)
        .bind(crypto.randomUUID(), cls.workspace_id, cls.id, day, cls.start_time, nowIsoValue, nowIsoValue));
    }
    statements.push(db.prepare(`UPDATE classes SET generated_until = ?
      WHERE workspace_id = ? AND id = ? AND status = 'active' AND (generated_until IS NULL OR generated_until < ?)`)
      .bind(until, cls.workspace_id, cls.id, until));
    const results = await db.batch(statements);
    inserted += results.slice(0, -1).reduce((total, result) => total + (result.meta.changes ?? 0), 0);
  }
  return { processed_classes: classes.length, inserted_sessions: inserted, generated_until: until };
}

/** Scheduled entry point for the Worker default export once cron binding is registered. */
export async function scheduled(
  _controller: ScheduledController,
  env: { DB: D1Database },
  _context: ExecutionContext,
): Promise<void> {
  await generateUpcomingSessions(env.DB);
}
