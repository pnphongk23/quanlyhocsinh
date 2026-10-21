import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from './types';
import type { Env } from './types';
import { apiRoutes } from './routes';
import { ApiError, errorBody, payloadTooLarge } from './lib/errors';
import { MAX_BODY_BYTES } from './lib/http';
import { generateUpcomingSessions } from './db/session-generation';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

function resolveRequestId(request: Request): string {
  const incoming = request.headers.get('x-request-id');
  if (incoming !== null && REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return crypto.randomUUID();
}

const app = new Hono<AppEnv>();

type ScheduledJob = (
  controller: ScheduledController,
  env: Env,
  context: ExecutionContext,
) => Promise<void>;

// Keep cron jobs in one dispatcher so additional scheduled work can be added here.
const scheduledJobs: ScheduledJob[] = [
  async (_controller, env) => {
    await generateUpcomingSessions(env.DB);
  },
];

export async function scheduled(
  controller: ScheduledController,
  env: Env,
  context: ExecutionContext,
): Promise<void> {
  for (const job of scheduledJobs) await job(controller, env, context);
}

app.use('*', async (c, next) => {
  const requestId = resolveRequestId(c.req.raw);
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');

  const path = c.req.path;
  if (path.startsWith('/v1/auth/') || path.endsWith('/guardian-credentials')) {
    c.header('Cache-Control', 'no-store');
  }

  const declared = c.req.header('content-length');
  if (declared !== undefined && Number(declared) > MAX_BODY_BYTES) {
    throw payloadTooLarge();
  }

  await next();
});

app.route('/v1', apiRoutes);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: 'not_found',
        message: 'Not found.',
        request_id: c.get('requestId') ?? crypto.randomUUID(),
      },
    },
    404,
  ),
);

app.onError((error, c) => {
  const requestId = c.get('requestId') ?? crypto.randomUUID();

  if (error instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (error.status === 429) {
      const retryAfter = error.details?.retry_after;
      if (typeof retryAfter === 'number') headers['Retry-After'] = String(retryAfter);
    }
    return c.json(
      errorBody(error, requestId),
      error.status as ContentfulStatusCode,
      headers,
    );
  }

  // Log tối thiểu, không có SĐT/mật khẩu/token/nội dung nhận xét/body.
  console.error(
    JSON.stringify({
      level: 'error',
      request_id: requestId,
      path: c.req.path,
      method: c.req.method,
      code: 'internal',
    }),
  );
  return c.json(
    {
      error: {
        code: 'internal',
        message: 'Internal error.',
        request_id: requestId,
      },
    },
    500,
  );
});

// Preserve Hono's .request() test helper while exposing Worker cron events.
export default Object.assign(app, { scheduled });
