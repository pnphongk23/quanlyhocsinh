import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { readJsonObject } from '../lib/http';
import { validationError } from '../lib/errors';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  listNotifications,
  markNotificationsRead,
} from '../db/notifications';

// Nhóm Thông báo trong app (api-spec.md mục 7): chỉ Phụ huynh.
export const notificationsRoutes = new Hono<AppEnv>();

function parseLimit(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw)) throw validationError(undefined, 'invalid_limit');
  return Math.min(MAX_LIMIT, Math.max(1, Number(raw)));
}

notificationsRoutes.get('/notifications', async (c) => {
  const page = await listNotifications(c.env.DB, c.get('identity'), {
    limit: parseLimit(c.req.query('limit')),
    cursor: c.req.query('cursor') ?? null,
  });
  return c.json(page);
});

notificationsRoutes.post('/notifications/read', async (c) => {
  const body = await readJsonObject(c.req.raw);
  const upToId = body.up_to_id;
  if (typeof upToId !== 'number' || !Number.isSafeInteger(upToId) || upToId < 0) {
    throw validationError({ up_to_id: 'must_be_non_negative_integer' });
  }
  return c.json(await markNotificationsRead(c.env.DB, c.get('identity'), upToId));
});
