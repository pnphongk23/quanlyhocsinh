import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { readJsonObject } from '../lib/http';
import { payloadTooLarge, validationError } from '../lib/errors';
import { syncIdentity, push, validatePush } from '../db/sync';
import { pull, snapshot, snapshotPage } from '../db/sync-read';

export const syncRoutes = new Hono<AppEnv>();
function integer(value: string | undefined, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (value === undefined || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw validationError(undefined, 'invalid_cursor');
  return Number(value);
}
syncRoutes.post('/sync/push', async (c) => {
  if ((await c.req.raw.clone().arrayBuffer()).byteLength > 256 * 1024) throw payloadTooLarge();
  const input = validatePush(await readJsonObject(c.req.raw));
  const identity = await syncIdentity(c.env.DB, c.get('identity'), input.membership_id);
  return c.json(await push(c.env.DB, identity, input.commands, c.get('requestId')));
});
syncRoutes.get('/sync/pull', async (c) => {
  const identity = await syncIdentity(c.env.DB, c.get('identity'), c.req.query('membership_id'));
  return c.json(await pull(c.env.DB, identity, integer(c.req.query('cursor')), integer(c.req.query('epoch')),
    Math.min(300, Math.max(1, integer(c.req.query('limit'), 200)))));
});
syncRoutes.get('/sync/snapshot', async (c) => {
  const identity = await syncIdentity(c.env.DB, c.get('identity'), c.req.query('membership_id'));
  return c.json(await snapshot(c.env.DB, identity));
});
syncRoutes.get('/sync/snapshot/:entity', async (c) => {
  const identity = await syncIdentity(c.env.DB, c.get('identity'), c.req.query('membership_id'));
  return c.json(await snapshotPage(c.env.DB, identity, c.req.param('entity'), c.req.query('after'),
    Math.min(300, Math.max(1, integer(c.req.query('limit'), 300)))));
});
