# QLH Worker

Cloudflare Worker API using Hono and D1. All D1 access belongs in `src/db`; schema and triggers are in `migrations/`.

## Local development

```sh
npm install
npm run migrate:local
npm run dev
```

Run `npm run typecheck`, `npm test`, and `npm run bundle:size` before committing changes. Copy `.dev.vars.example` to `.dev.vars` only when local overrides are needed; keep secrets out of source control.

## CORS for the web client

The web app runs on Cloudflare Pages, a different origin from the Worker, so `/v1/*` answers CORS. `ALLOWED_ORIGINS` is a comma-separated allow list of exact origins (`https://qlh-staging.pages.dev,http://localhost:5173`); an empty or unset value allows no cross-origin caller. The Worker never answers with `*` and reflects only an origin from that list, adds `Vary: Origin`, allows `Authorization, Content-Type, X-Request-Id, X-Client` (plus `GET, POST, PUT, PATCH, DELETE`), and answers `OPTIONS` preflight with `204` and `Access-Control-Max-Age: 600`. CORS headers are also set on error responses so the browser can read the error code. iOS does not use CORS. Set the staging value in the `env.staging` vars block of `wrangler.jsonc` and redeploy.

## Staging deployment

Resources (prefix `qlh-staging-` only; there is no production yet): Worker `qlh-staging-api`, D1 `qlh-staging-db` (region APAC). The D1 `database_id` is committed in `wrangler.jsonc` under `env.staging`; the top-level config stays on `REPLACE_AT_DEPLOY` because it is only used for local runs and tests.

```sh
npx wrangler d1 migrations apply DB --remote --env staging
npx wrangler deploy --env staging
```

- `PBKDF2_ITERATIONS=30000` is the default Worker Free setting; hashes carry their own iteration count, so existing hashes remain readable and are rehashed after a successful login when needed.
- Parent accounts do not have a first-password or temporary-password issuance flow yet. Operators can reset a password manually using `plans/20261021-mvp/backend/runbook-reset-password.md`.
- The cron trigger (`* * * * *`) runs session generation and push dispatch on staging.
- Staging runs on the Workers Free plan: CPU limits cannot be configured (`limits.cpu_ms` is rejected with error `100328`). Measure with `wrangler tail --format json` and read `cpuTime` / `outcome`.

Live URL: https://qlh-staging-api.tolaphamnhuphong.workers.dev

## Enable FCM push

Set `FCM_PROJECT_ID` in the Worker environment and add the JSON service account as the `FCM_SERVICE_ACCOUNT` secret (`wrangler secret put FCM_SERVICE_ACCOUNT`). For local development, put these variable names in `.dev.vars` with local values; never commit secret values. The scheduled handler runs notification dispatch once per minute.
