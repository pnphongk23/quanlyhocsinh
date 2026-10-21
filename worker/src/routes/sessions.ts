import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { cancelSession, createManualSession, listCalendar, listClassSessions } from '../db/sessions';
import { encodeCursor, parseSessionCursor } from '../db/attendance';
import { isDate } from '../db/classes';
import { validationError } from '../lib/errors';
import { readJsonObject } from '../lib/http';

export const sessionsRoutes = new Hono<AppEnv>();

function requiredDate(value: string | undefined, name: string): string {
  if (!isDate(value)) throw validationError({ [name]: 'must_be_date' });
  return value;
}
function limitValue(value: string | undefined): number {
  const limit = value === undefined ? 50 : Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw validationError({ limit: 'must_be_1_to_200' });
  return limit;
}

sessionsRoutes.get('/classes/:id/sessions', async (c) => {
  const from = requiredDate(c.req.query('from'), 'from');
  const to = requiredDate(c.req.query('to'), 'to');
  if (from > to) throw validationError({ to: 'must_not_precede_from' });
  const page = await listClassSessions(c.env.DB, c.get('identity'), c.req.param('id'), {
    from, to, limit: limitValue(c.req.query('limit')), cursor: parseSessionCursor(c.req.query('cursor') ?? null),
  });
  return c.json({ items: page.items, next_cursor: encodeCursor(page.next) });
});
sessionsRoutes.get('/calendar', async (c) => {
  const from = requiredDate(c.req.query('from'), 'from');
  const to = requiredDate(c.req.query('to'), 'to');
  if (from > to) throw validationError({ to: 'must_not_precede_from' });
  return c.json({ items: await listCalendar(c.env.DB, c.get('identity'), from, to) });
});
sessionsRoutes.post('/classes/:id/sessions', async (c) => {
  const body = await readJsonObject(c.req.raw);
  return c.json(await createManualSession(c.env.DB, c.get('identity'), c.req.param('id'), body), 201);
});
sessionsRoutes.post('/sessions/:id/cancel', async (c) =>
  c.json(await cancelSession(c.env.DB, c.get('identity'), c.req.param('id'))));
