import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { notImplemented } from '../lib/errors';

/** Router stub cho một nhóm chưa làm ở pha 1 (trả 501 not_implemented). */
export function stubRouter(group: string, paths: string[]): Hono<AppEnv> {
  const router = new Hono<AppEnv>();
  const handler = () => {
    throw notImplemented(group);
  };
  for (const path of paths) router.all(path, handler);
  return router;
}
