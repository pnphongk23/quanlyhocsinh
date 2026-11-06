import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { readJsonObject } from '../lib/http';
import { criteriaLevelsEnabled } from '../lib/flags';
import { readCriteriaSet, replaceCriteriaSet } from '../db/criteria-set';

export const criteriaSetRoutes = new Hono<AppEnv>();
criteriaSetRoutes.get('/criteria-set', async c => c.json(await readCriteriaSet(c.env.DB, c.get('identity'))));
criteriaSetRoutes.put('/criteria-set', async c => c.json(await replaceCriteriaSet(c.env.DB, c.get('identity'),
  await readJsonObject(c.req.raw), criteriaLevelsEnabled(c.env))));
