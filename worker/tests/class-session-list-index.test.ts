import { describe, expect, it } from 'vitest';
import { db } from './helpers';

/**
 * Bất biến: liệt kê buổi học không được sắp xếp bằng TEMP B-TREE.
 * SQL dưới đây là bản sao mệnh đề WHERE/ORDER BY của `src/db/sessions.ts`
 * (`listClassSessions` và `listCalendar`) — cùng thứ tự cột, cùng dạng tham số.
 * D1 không chạy ANALYZE nên kế hoạch truy vấn ổn định theo lược đồ, không cần dữ liệu mẫu.
 */
const CLASS_PAGE = `SELECT cs.id FROM class_sessions cs
  WHERE cs.workspace_id = ? AND cs.class_id = ? AND cs.date >= ? AND cs.date <= ?
  ORDER BY cs.date, cs.start_time, cs.id LIMIT ?`;

const CLASS_PAGE_CURSOR = `SELECT cs.id FROM class_sessions cs
  WHERE cs.workspace_id = ? AND cs.class_id = ? AND cs.date >= ? AND cs.date <= ?
    AND (cs.date > ? OR (cs.date = ? AND cs.start_time > ?)
      OR (cs.date = ? AND cs.start_time = ? AND cs.id > ?))
  ORDER BY cs.date, cs.start_time, cs.id LIMIT ?`;

const CALENDAR = `SELECT cs.id FROM class_sessions cs
  WHERE cs.workspace_id = ? AND cs.date >= ? AND cs.date <= ?
  ORDER BY cs.date, cs.start_time, cs.class_id, cs.id`;

const CALENDAR_SCOPED = `SELECT cs.id FROM class_sessions cs
  WHERE cs.workspace_id = ? AND cs.date >= ? AND cs.date <= ? AND cs.class_id IN (?, ?)
  ORDER BY cs.date, cs.start_time, cs.class_id, cs.id`;

const RANGE = ['2026-10-01', '2026-10-31'] as const;

async function planOf(sql: string, ...args: unknown[]): Promise<string> {
  const { results } = await db.prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .bind(...args).all<{ detail: string }>();
  return results.map((row) => row.detail).join('\n');
}

describe('class session list index', () => {
  it('reads the per-class page in (date, start_time, id) order without a temp b-tree', async () => {
    const first = await planOf(CLASS_PAGE, 'ws', 'class', ...RANGE, 51);
    expect(first).not.toContain('TEMP B-TREE');
    const cursor = await planOf(CLASS_PAGE_CURSOR, 'ws', 'class', ...RANGE,
      '2026-10-02', '2026-10-02', '08:00', '2026-10-02', '08:00', 'session', 51);
    expect(cursor).not.toContain('TEMP B-TREE');
  });

  it('walks class_sessions_ws_list for the calendar ordered by date, start_time, class_id, id', async () => {
    const workspace = await planOf(CALENDAR, 'ws', ...RANGE);
    expect(workspace).toContain('class_sessions_ws_list');
    expect(workspace).not.toContain('TEMP B-TREE');
    const scoped = await planOf(CALENDAR_SCOPED, 'ws', ...RANGE, 'class-a', 'class-b');
    expect(scoped).not.toContain('TEMP B-TREE');
  });
});
