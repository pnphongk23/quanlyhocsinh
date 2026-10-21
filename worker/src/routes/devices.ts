import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { readJsonObject } from '../lib/http';
import { validationError } from '../lib/errors';
import { deleteDeviceToken, upsertDeviceToken } from '../db/devices';

// Nhóm FCM device token (api-spec.md mục 7). Danh tính lấy từ phiên, không từ body.
export const devicesRoutes = new Hono<AppEnv>();

devicesRoutes.put('/device-tokens', async (c) => {
  const body = await readJsonObject(c.req.raw);
  const view = await upsertDeviceToken(c.env.DB, c.get('identity'), {
    token: body.token,
    platform: body.platform,
  });
  return c.json(view);
});

devicesRoutes.delete('/device-tokens/:id', async (c) => {
  const rawVersion = c.req.query('registration_version');
  if (rawVersion === undefined || !/^\d+$/.test(rawVersion)) {
    throw validationError({ registration_version: 'required' });
  }
  await deleteDeviceToken(
    c.env.DB,
    c.get('identity'),
    c.req.param('id'),
    Number(rawVersion),
  );
  return c.body(null, 204);
});
