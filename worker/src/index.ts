import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv, Env } from './types';
import { apiRoutes } from './routes';
import { ApiError, errorBody, payloadTooLarge } from './lib/errors';
import { maxBodyBytes } from './lib/http';
import { generateUpcomingSessions } from './db/session-generation';
import { runScheduledPush } from './db/notification-dispatch';
import { purgeResetData } from './db/password-reset';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

// Web chạy ở Cloudflare Pages (miền khác), nên `/v1/*` phải trả header CORS. Danh sách
// origin do `ALLOWED_ORIGINS` chốt (phân tách dấu phẩy); rỗng = không cho origin nào.
// Không bao giờ dùng `*`: phản chiếu đúng origin đã cấu hình.
const CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const CORS_HEADERS = 'Authorization, Content-Type, X-Request-Id, X-Client';
const CORS_EXPOSE_HEADERS = 'X-Request-Id, Retry-After';
const CORS_MAX_AGE_SECONDS = '600';

function allowedOrigins(raw: string | undefined): Set<string> {
  const origins = new Set<string>();
  for (const entry of (raw ?? '').split(',')) {
    // Chấp nhận khoảng trắng và dấu `/` cuối (origin không có dấu `/`).
    const origin = entry.trim().replace(/\/$/, '');
    if (origin !== '' && origin !== '*') origins.add(origin);
  }
  return origins;
}

function resolveRequestId(request: Request): string {
  const incoming = request.headers.get('x-request-id');
  if (incoming !== null && REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return crypto.randomUUID();
}

const app = new Hono<AppEnv>();
const requestStartedAt = new WeakMap<Request, number>();

function logPath(path: string): string {
  return path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id');
}

// Two cron triggers (wrangler.jsonc): push must run every minute (retry backoff is minutes), while
// session generation and table cleanup scan whole tables and only need a slow cadence.
export const MINUTE_CRON = '* * * * *';
export const SLOW_CRON = '*/30 * * * *';

interface ScheduledJob {
  name: string;
  /** Trigger that runs this job; any other cron expression (manual or test invocation) runs every job. */
  cron: typeof MINUTE_CRON | typeof SLOW_CRON;
  run: (controller: ScheduledController, env: Env, context: ExecutionContext) => Promise<void>;
}

// Keep cron jobs in one dispatcher so additional scheduled work can be added here.
const scheduledJobs: ScheduledJob[] = [
  {
    name: 'session_generation',
    cron: SLOW_CRON,
    run: async (_controller, env) => { await generateUpcomingSessions(env.DB); },
  },
  {
    name: 'notification_dispatch',
    cron: MINUTE_CRON,
    run: async (_controller, env) => { await runScheduledPush(env); },
  },
  {
    name: 'password_reset_cleanup',
    cron: SLOW_CRON,
    run: async (_controller, env) => { await purgeResetData(env.DB); },
  },
];

export async function scheduled(
  controller: ScheduledController,
  env: Env,
  context: ExecutionContext,
): Promise<void> {
  const known = controller.cron === MINUTE_CRON || controller.cron === SLOW_CRON;
  for (const job of scheduledJobs) {
    if (known && job.cron !== controller.cron) continue;
    const startedAt = performance.now();
    try {
      await job.run(controller, env, context);
    } catch {
      // A failed cron task must not prevent the other task from running.
      console.error(JSON.stringify({ request_id: crypto.randomUUID(), path: '/scheduled', code: 'scheduled_job_failed',
        duration_ms: Math.round(performance.now() - startedAt) }));
    }
  }
}

app.use('/v1/*', async (c, next) => {
  const origin = c.req.header('origin');
  c.header('Vary', 'Origin');
  const reflected = origin !== undefined && allowedOrigins(c.env.ALLOWED_ORIGINS).has(origin);
  if (reflected) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Expose-Headers', CORS_EXPOSE_HEADERS);
  }
  if (c.req.method === 'OPTIONS') {
    // Preflight: không xác thực, luôn 204; origin lạ không được phản chiếu nên trình duyệt chặn.
    if (reflected) {
      c.header('Access-Control-Allow-Methods', CORS_METHODS);
      c.header('Access-Control-Allow-Headers', CORS_HEADERS);
      c.header('Access-Control-Max-Age', CORS_MAX_AGE_SECONDS);
    }
    return c.body(null, 204);
  }
  await next();
});

app.use('*', async (c, next) => {
  requestStartedAt.set(c.req.raw, performance.now());
  const requestId = resolveRequestId(c.req.raw);
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');

  const path = c.req.path;
    if (path.startsWith('/v1/auth/')) {
    c.header('Cache-Control', 'no-store');
  }

  const declared = c.req.header('content-length');
  const limit = maxBodyBytes(c.req.raw);
  if (declared !== undefined && Number(declared) > limit) {
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
        request_id: requestId,
        path: logPath(c.req.path),
        code: 'internal',
        duration_ms: Math.round(performance.now() - (requestStartedAt.get(c.req.raw) ?? performance.now())),
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
