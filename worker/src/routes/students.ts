import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { createStudent, getStudent, listStudents, updateStudent } from '../db/students';
import { readJsonObject } from '../lib/http';

export const studentsRoutes = new Hono<AppEnv>();

studentsRoutes.get('/classes/:id/students', async (c) => c.json({ items: await listStudents(
  c.env.DB, c.get('identity'), c.req.param('id'), c.req.query('status') ?? null,
)}));
studentsRoutes.post('/classes/:id/students', async (c) => {
  const body = await readJsonObject(c.req.raw);
  return c.json(await createStudent(c.env.DB, c.get('identity'), c.req.param('id'), {
    name: body.name, parent_phone: body.parent_phone, enrolled_at: body.enrolled_at,
  }), 201);
});
studentsRoutes.get('/students/:id', async (c) =>
  c.json(await getStudent(c.env.DB, c.get('identity'), c.req.param('id'))));
studentsRoutes.patch('/students/:id', async (c) => {
  const body = await readJsonObject(c.req.raw);
  return c.json(await updateStudent(c.env.DB, c.get('identity'), c.req.param('id'), body));
});
