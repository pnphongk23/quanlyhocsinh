# W4 account and PWA report

## Delivered

### W-4 (commit `2d9002a`)

- Implemented login, teacher registration, forgot password, role selection, account settings, password change, and logout using the existing auth API.
- Added installable PWA metadata, manifest, 192/512 icons, and a production service worker. The worker precaches the app entry and bypasses `/v1/` API traffic.
- Used the shared staff shell for account settings so the desktop sidebar and mobile navigation are present.
- Added five focused account-flow tests.

### W-4b (this round)

- Reviewed the uncommitted W-4 changes and kept the ones that move Cài đặt / Đổi mật khẩu / Chọn vai trò closer to the prototype.
- **Dropped guardian registration** from the teacher registration screen (`RegisterPage.tsx` restored to the committed version, `registerGuardian.module.css` deleted) per the GL decision: guardian registration and guardian screens ship together later, after the new prototype.
- **Root cause of the cross-screen mismatch found and fixed:** `index.html` never loaded Plus Jakarta Sans (tokens declared the family but nothing provided it), so every screen rendered with the fallback system font — different text widths, wraps and glyph shapes on login, register, forgot, role, settings, change password. Added the same `preconnect` + `fonts.googleapis.com` stylesheet as `design/prototype/index.html`.
- **Cài đặt rewritten to the prototype structure** (`design/prototype/src/features/settings/SettingsPage.tsx`): `section.card` instead of the shared `Card` (the shared card injected its own `14/16`–`18/20px` padding on top of `settings.module.css`, shifting every block), mobile/desktop split, breadcrumb + "Tài khoản của tôi", profile role line, phone shown as `+84 900 000 001`, "Đổi vai trò" row with the current role label, pending-sync banner (`Đang đồng bộ · N thay đổi chưa đồng bộ` / `Đang ngoại tuyến · …`), and the prototype's "Chưa thể đăng xuất" dialog (bottom sheet on mobile) instead of the invented inline note + error banner. Logout still cannot happen while the outbox has pending commands.
- **Chọn vai trò:** description shows the real phone (`Số +84 900 000 001 có hơn một vai trò…`) as in the prototype instead of the masked `Số •••`.
- Guardian role subtitle (Chọn vai trò + Cài đặt role list) is derived from data already available through `src/data`: `store.students` matched on the guardian phone, class label shortened like the prototype (`Bảo Ngọc (6A)`). Cài đặt falls back to the prototype's `Chưa liên kết con`; Chọn vai trò falls back to `Phụ huynh`. See "Cần W-1" below for the missing payload field.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 156 passed, 1 skipped, 0 failed (16 files passed, 1 skipped). The previously failing `src/test/routes.test.tsx` expectation for `/doi-mat-khau-bat-buoc` was already fixed in `1417b71`.
- `npx vitest run src/features/auth/account.test.tsx`: 5 passed.
- `npm run build`: passed. Initial entry gzip: **143,925 bytes JS** and **2,059 bytes CSS** (budget 200 KB JS / 250 KB JS+CSS). Staff first route 147,496 B JS; guardian first route 146,055 B JS.
- Manifest JSON and icon files checked; generated service worker contains the `/v1/` bypass.
- Screenshots regenerated for every screen at 390×844 and 1360×934 in `plans/20261021-mvp/web/shots/w4/` (`proto-*.png` = prototype, `real-*.png` = app), each pair pixel-diffed (PIL `ImageChops`) after the fixes; see the table.

### How the prototype was captured

`design/prototype` ships `features.skipLogin` (auto demo session) and a seed store that already contains an auth session, so `/dang-nhap` and `/dang-ky` redirect away. To photograph those two screens the prototype was copied to `/tmp/proto-shot`, `src/data/seed.ts` was changed to `auth: null` **in the copy only**, and the copy was served with `npx vite --mode test --port 5299` (`MODE=test` turns `skipLogin` off). Nothing under `design/prototype` was modified. `/quen-mat-khau`, `/chon-vai-tro`, `/cai-dat`, `/cai-dat/doi-mat-khau` were 1:1 the real prototype source. The app ran on `--port 5298` against the fake auth API `src/test/w4-auth-server.mjs` (port 5190), logging in as the two-role demo account and choosing the Giáo viên role first, exactly the prototype flow. No real phone number, password or token appears in the report or the screenshots (demo data only).

## Prototype vs app difference table (after this round)

| Screen | Viewports | Difference | Status / reason |
| --- | --- | --- | --- |
| Đăng nhập | both | Prototype footer: "Chưa có tài khoản? Tạo tài khoản" (points at the shared teacher/guardian register screen). App: "Chưa có không gian làm việc? Đăng ký cho giáo viên" + the parent hint card ("Phụ huynh: dùng số điện thoại đã khai trong hồ sơ học sinh…"). | **Left as is, GL decision 74.1** — guardian registration is deferred, so the app must not offer it yet. The parent hint replaces the prototype hint that was removed together with the guardian form. Restore the prototype wording when the guardian registration screen lands. |
| Đăng ký | both | Prototype has the "Bạn đăng ký với vai trò / Giáo viên–Phụ huynh" segmented control and the guardian variant (title "Tạo tài khoản phụ huynh", no workspace field, guardian note, button "Tạo tài khoản"). App shows the teacher form only. | **Left as is, GL decision 74.1** (guardian registration ships later). Everything else on the screen is pixel-identical. |
| Quên mật khẩu | both | — | **Identical** (pixel diff empty). |
| Chọn vai trò | both | Guardian card subtitle: prototype "Bé Gia Bảo", app "Phụ huynh". | **Data/API gap** — see "Cần W-1". Code path is in place and will print "Bé …" as soon as the store/payload provides the child. |
| Cài đặt (mobile) | mobile | Prototype-only row "Dữ liệu mẫu của prototype · Đặt lại". | **Not ported (out of MVP)** — it resets the prototype seed; the app has no seed, and `web-common-ui`/W-4 scope excludes prototype-only tooling. |
| Cài đặt (desktop) | desktop | Sidebar "Đang xem lớp": prototype "Tiếng Anh giao tiếp 6A", app "Chưa chọn lớp"; workspace title casing "Lớp của cô Lan" vs "Lớp của Cô Lan"; guardian role line "Phụ huynh · Gia Bảo (6A), Bảo Ngọc (6A)" vs "Phụ huynh · Chưa liên kết con". | **Data only** — the fake API returns no classes/students snapshot and one hard-coded workspace name; the guardian children gap is the W-1 item below. Page layout, spacing, typography and states are pixel-identical. |
| Đổi mật khẩu | both | — | **Identical** on mobile; on desktop the route redirects to Cài đặt in both prototype and app (same page). |

Font/metrics check: `document.fonts.ready` before each shot; `ImageChops` diff is empty for Quên mật khẩu (both viewports), Đổi mật khẩu (mobile) and equals only the listed regions for the others.

## Cần W-1

1. **Linked children for guardian memberships.** `design/prototype` renders "Bé Gia Bảo" and "Bảo Ngọc (6A)" from `Member.studentIds`; `src/data/api/types.ts` `ApiMembership` has no such field (`id`, `workspace`, `role` only). Proposal: add `student_ids: string[]` (ids are already in the snapshot) **or** `students: { id, name, class_name }[]` to `ApiMembership` in `GET /me` **and** in the membership list returned by `POST /auth/login` / `POST /auth/register`, so `src/data/auth/session` can expose it without a second request. Until then the app derives children from `store.students.parentPhone === session.user.phone`, which needs the guardian-scope snapshot to include those students — please confirm `GET /sync/snapshot` returns a guardian's linked students (and their `class_id`), otherwise the subtitle stays at the fallback text.
2. **Pending-command count for the logout dialog.** Settings shows the prototype's `pending` banner from `store.pending` and blocks logout with `pendingCommandCount()` from `src/data/outbox`. No change requested; noted only so W-1 keeps `store.pending` in sync with the outbox when offline rows are flushed/compacted.
