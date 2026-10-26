# F-3 — Session revocation and logout races

## Changes

- Revoking the active membership clears its cache identity and store immediately. The client refreshes identity with `GET /me` and hydrates a membership cache only when the response names an active membership. If the confirmed account has no memberships, the session is cleared. Role switching still requires the server-confirmed `PUT /session/membership` response.
- Logout writes a shared IndexedDB lock before waiting for the server. Outbox writes check that lock in their write transaction and return “Đang đăng xuất, thử lại sau.” After server confirmation, cache cleanup checks the outbox in the same transaction; a raced command preserves the user cache and outbox and leaves a `needs_login` lock until the next login. A failed logout removes its pending lock.
- Added fake-IndexedDB and fake-server regression coverage for push rejection with two cached memberships, rejected `/me` followed by confirmation, no remaining memberships, cross-tab enqueue during pending logout, and a command racing final cleanup. The new regression tests failed before the fixes and pass after them.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 27 files passed, 1 skipped; 221 tests passed, 1 skipped.
- Staging build: passed. Initial JavaScript gzip: **146,401 B** (under the 200 KB target).
- Deployed to `https://fe06fcb9.qlh-staging-web.pages.dev`; both that deployment and `https://qlh-staging-web.pages.dev/dang-nhap` return HTTP 200.

Status: DONE
