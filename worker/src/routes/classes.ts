import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { createClass, getClass, listClasses, updateClass } from '../db/classes';
import { readJsonObject } from '../lib/http';

export const classesRoutes = new Hono<AppEnv>();

classesRoutes.get('/classes', async (c) => {
  const rows = await listClasses(c.env.DB, c.get('identity'), c.req.query('status') ?? null);
  return c.json({ items: rows });
});
classesRoutes.post('/classes', async (c) => {
  const body = await readJsonObject(c.req.raw);
  const { record, created } = await createClass(c.env.DB, c.get('identity'), {
    name: body.name, weekdays: body.weekdays, start_time: body.start_time, id: body.id,
  });
  return c.json(record, created ? 201 : 200);
});
classesRoutes.get('/classes/:id', async (c) =>
  c.json(await getClass(c.env.DB, c.get('identity'), c.req.param('id'))));
classesRoutes.patch('/classes/:id', async (c) => {
  const body = await readJsonObject(c.req.raw);
  return c.json(await updateClass(c.env.DB, c.get('identity'), c.req.param('id'), body));
});
