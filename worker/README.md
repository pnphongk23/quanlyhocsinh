# QLH Worker

Cloudflare Worker API using Hono and D1. All D1 access belongs in `src/db`; schema and triggers are in `migrations/`.

## Local development

```sh
npm install
npm run migrate:local
npm run dev
```

Run `npm run typecheck`, `npm test`, and `npm run bundle:size` before committing changes. Copy `.dev.vars.example` to `.dev.vars` only when local overrides are needed; keep secrets out of source control.

## Staging deployment

Resources (prefix `qlh-staging-` only; there is no production yet): Worker `qlh-staging-api`, D1 `qlh-staging-db` (region APAC). The D1 `database_id` is committed in `wrangler.jsonc` under `env.staging`; the top-level config stays on `REPLACE_AT_DEPLOY` because it is only used for local runs and tests.

```sh
npx wrangler d1 migrations apply DB --remote --env staging
printf '%s' "$REGISTRATION_CODE" | npx wrangler secret put REGISTRATION_CODE --env staging
npx wrangler deploy --env staging
```

- `REGISTRATION_CODE` is a Worker secret. Keep the local value in `.dev.vars` (gitignored); never commit or print it. When it is set, `POST /v1/auth/register` requires the same `registration_code` in the body.
- `PBKDF2_ITERATIONS=100000` is a plain var in the staging config; hashes carry their own iteration count, so changing it does not break stored passwords.
- R2 is not enabled for this account yet, so report PDF upload/download returns `503 pdf_storage_unavailable` until the `REPORT_PDFS` block is uncommented in `wrangler.jsonc` and a bucket exists.
- The cron trigger (`* * * * *`) runs session generation and push dispatch on staging.
- Staging runs on the Workers Free plan: CPU limits cannot be configured (`limits.cpu_ms` is rejected with error `100328`). Measure with `wrangler tail --format json` and read `cpuTime` / `outcome`.

Live URL: https://qlh-staging-api.tolaphamnhuphong.workers.dev

## Enable report PDF storage

R2 is optional and disabled in the deploy config until the account has access. Create the `qlh-staging-reports` bucket in Cloudflare, uncomment the `REPORT_PDFS` block under `env.staging` in `wrangler.jsonc`, then deploy staging. Vitest keeps a local R2 bucket configured for tests.

## Enable FCM push

Set `FCM_PROJECT_ID` in the Worker environment and add the JSON service account as the `FCM_SERVICE_ACCOUNT` secret (`wrangler secret put FCM_SERVICE_ACCOUNT`). For local development, put these variable names in `.dev.vars` with local values; never commit secret values. The scheduled handler runs notification dispatch once per minute.
