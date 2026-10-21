# QLH Worker

Cloudflare Worker API using Hono and D1. All D1 access belongs in `src/db`; schema and triggers are in `migrations/`.

## Local development

```sh
npm install
npm run migrate:local
npm run dev
```

Run `npm run typecheck`, `npm test`, and `npm run bundle:size` before committing changes. Copy `.dev.vars.example` to `.dev.vars` only when local overrides are needed; keep secrets out of source control.
