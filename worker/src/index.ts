import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv, Env } from './types';
import { apiRoutes } from './routes';
import { ApiError, errorBody, payloadTooLarge } from './lib/errors';
import { isPdfUploadRequest, maxBodyBytes } from './lib/http';
import { generateUpcomingSessions } from './db/session-generation';
import { runScheduledPush } from './db/notification-dispatch';

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

interface ScheduledJob {
  name: string;
  run: (controller: ScheduledController, env: Env, context: ExecutionContext) => Promise<void>;
}

// Keep cron jobs in one dispatcher so additional scheduled work can be added here.
const scheduledJobs: ScheduledJob[] = [
  {
    name: 'session_generation',
    run: async (_controller, env) => { await generateUpcomingSessions(env.DB); },
  },
  {
    name: 'notification_dispatch',
    run: async (_controller, env) => { await runScheduledPush(env); },
  },
];

export async function scheduled(
  controller: ScheduledController,
  env: Env,
  context: ExecutionContext,
): Promise<void> {
  for (const job of scheduledJobs) {
    try {
      await job.run(controller, env, context);
    } catch {
      // A failed cron task must not prevent the other task from running.
      console.error(JSON.stringify({ level: 'error', code: 'scheduled_job_failed', job: job.name }));
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
  const limit = maxBodyBytes(c.req.raw);
  if (declared !== undefined && Number(declared) > limit) {
    throw payloadTooLarge();
  }
  if (isPdfUploadRequest(c.req.raw)
    && (await c.req.raw.clone().arrayBuffer()).byteLength > limit) {
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
