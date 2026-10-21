# QLH Worker

Cloudflare Worker API using Hono and D1. All D1 access belongs in `src/db`; schema and triggers are in `migrations/`.

## Local development

```sh
npm install
npm run migrate:local
npm run dev
```

Run `npm run typecheck`, `npm test`, and `npm run bundle:size` before committing changes. Copy `.dev.vars.example` to `.dev.vars` only when local overrides are needed; keep secrets out of source control.

## Enable report PDF storage

R2 is optional and disabled in the deploy config until the account has access. Create the `qlh-staging-reports` bucket in Cloudflare, uncomment the `REPORT_PDFS` block under `env.staging` in `wrangler.jsonc`, then deploy staging. Vitest keeps a local R2 bucket configured for tests.

## Enable FCM push

Set `FCM_PROJECT_ID` in the Worker environment and add the JSON service account as the `FCM_SERVICE_ACCOUNT` secret (`wrangler secret put FCM_SERVICE_ACCOUNT`). For local development, put these variable names in `.dev.vars` with local values; never commit secret values. The scheduled handler runs notification dispatch once per minute.
