import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { encodeCursor, getSessionAttendance, getStudentAttendance, parseAttendanceCursor, validateAttendanceRange } from '../db/attendance';

export const attendanceRoutes = new Hono<AppEnv>();

attendanceRoutes.get('/sessions/:id/attendance', async (c) => c.json({ items: await getSessionAttendance(
  c.env.DB, c.get('identity'), c.req.param('id'),
)}));
attendanceRoutes.get('/students/:id/attendance', async (c) => {
  const range = validateAttendanceRange(c.req.query('from') ?? null, c.req.query('to') ?? null,
    c.req.query('limit') ?? null);
  const page = await getStudentAttendance(c.env.DB, c.get('identity'), c.req.param('id'), {
    ...range, cursor: parseAttendanceCursor(c.req.query('cursor') ?? null),
  });
  return c.json({ items: page.items, next_cursor: encodeCursor(page.next) });
});
