import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { createStaff, deleteStaff, getRolePermissions, listStaff, updateRolePermissions, updateStaff } from '../db/staff';
import { readJsonObject } from '../lib/http';

export const staffRoutes = new Hono<AppEnv>();

staffRoutes.get('/staff', async (c) => c.json({ items: await listStaff(c.env.DB, c.get('identity')) }));
staffRoutes.post('/staff', async (c) => c.json(
  await createStaff(c.env.DB, c.get('identity'), await readJsonObject(c.req.raw)), 201));
staffRoutes.patch('/staff/:id', async (c) => c.json(
  await updateStaff(c.env.DB, c.get('identity'), c.req.param('id'), await readJsonObject(c.req.raw))));
staffRoutes.delete('/staff/:id', async (c) => {
  await deleteStaff(c.env.DB, c.get('identity'), c.req.param('id'));
  return c.body(null, 204);
});
staffRoutes.get('/roles/permissions', async (c) => c.json(await getRolePermissions(c.env.DB, c.get('identity'))));
staffRoutes.put('/roles/:system_key/permissions', async (c) => {
  const body = await readJsonObject(c.req.raw);
  return c.json(await updateRolePermissions(c.env.DB, c.get('identity'), c.req.param('system_key'), body.permissions));
});
