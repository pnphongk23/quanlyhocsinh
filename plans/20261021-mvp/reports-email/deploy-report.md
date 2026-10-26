# Staging deployment report

Date: 2026-10-24

## Backend and D1

- Environment: staging only (`qlh-staging-db`, `qlh-staging-api`). No production resources touched.
- Backend HEAD: `f5b5753f867d4de9cce181e1c12463cdca775c30`. Worktree status matched the brief: only `?? docs/erd-mvp.md`.
- Migrations before: `0003_class_teacher_sync.sql`, `0004_report_batches.sql`, `0005_account_email.sql` pending; expected list matched. Migration apply succeeded. Migrations after: none pending.
- D1 Time Travel bookmark: `00000030-0000007a-0000510e-fbb687b828f70ee9dc796e8357c12204`. Retrieved 2026-10-24; Wrangler did not print the retrieval time. Shell UTC time checked at 2026-10-24 06:31:08 UTC.
- Worker version listed before deploy (first ID in the command output): `99db74bf-63d9-491d-8815-162b2d14bd7d`.
- Worker deploy succeeded; new version: `cee1f39e-4d8a-403e-8cba-4988217e5b13`; URL: `https://qlh-staging-api.tolaphamnhuphong.workers.dev`.
- Health: `GET /v1/health` → 200; unauthenticated `GET /v1/me` → 401.

## Web Pages

- Source web HEAD: `4b8d4e01f949b7e271d46f165a81ce1a7a9675fa`. Built from a clean detached temporary worktree; its status was clean. `npm ci` succeeded (169 packages, zero vulnerabilities); staging `npm run build` and bundle check passed.
- Pages project: `qlh-staging-web`, branch `main`. Deploy succeeded. Deployment ID/URL slug: `0a623228`; deployment URL: `https://0a623228.qlh-staging-web.pages.dev`; canonical staging URL: `https://qlh-staging-web.pages.dev`.
- SHA-256 `dist/index.html`: `0e1ce2022e1507b6b34786c73102a99b088ebe0fffcf2d6079a2ca536c313f52`.
- SHA-256 `dist/assets/index-DsXiUBmp.js`: `a6994a18f70867af51c2b0594491b4aa9800dbf10dcec1c82e4f30c0c0242602`.
- SHA-256 `dist/assets/index-Bsu1deE8.css`: `a824219410649380d790b4e3ec4fd8a47f3c845b09674ba18f1336605c4b3443`.
- Temporary web worktree was removed.

## Staging smoke checks

- Synthetic teacher registration, class, student, and three manual sessions: PASS (201 each).
- Report batch and comment update: PASS (201/200). Incomplete preview showed missing attendance; individual publish returned 409 `report_not_ready`: PASS. Attendance sync and ready preview: PASS. Batch publish: PASS (200).
- Parent account registered with the student's phone: PASS (201). Parent report list showed the published batch and excluded the added draft: PASS (200).
- Legacy month GET returned 200; month PUT and POST returned 410: PASS.
- Email: wrong current password on `PUT /me/email` → 401; masked lookup → 200; mismatched email request → 422 validation error; matching request → 202 and exactly one test mailbox row; confirmation → 200; token reuse → 400; old session → 401; new password login → 200. All PASS. Mailbox row was deleted; count verified zero. Token/link and account details were never printed.
- Headless Playwright: reset request → 202 and confirmation → 200. The harness stopped before it recorded `/dat-lai-mat-khau` or `/cai-dat` render results at 390px; these UI checks are unverified. No retry was made.

## Cleanup and limitations

- Attempt to delete only the synthetic workspace was blocked. Per instruction, no trigger or delete guard was bypassed. Remaining workspace: `smoke-reports-email-20261024-03db9c`.
- No other synthetic workspace or test mailbox row remains. No source code was modified or committed.

## 390px staging

- Environment: `https://qlh-staging-web.pages.dev`, web build `4b8d4e0`, responsive viewport 390×844; no production/demo workspace used.
- `/dat-lai-mat-khau` without a token: FAIL on mobile layout: expired/used text and “Quên mật khẩu” action render, but their right edges are clipped at 390px. `/quen-mat-khau`: PASS, phone form renders within viewport. Screenshots: `390-reset-error.png`, `390-quen-mat-khau.png`.
- `/cai-dat`: FAIL on mobile layout: “Email khôi phục” card renders, but its right-side status and other row content are clipped at 390px. Settings ↔ another page ×3, reload ×3, and 390→1280→390: PASS; 0 blank-root renders; 0 console errors. DevTools recorded 0 console messages on the later smoke window; one earlier Chrome DOM password-form accessibility advisory was observed, not a JS error. Screenshot: `390-cai-dat.png`.
- Fake workspace `smoke-390-24oct2`; class `Smoke Reports 2` and one fake student created through UI. Reports empty state: PASS (“Chưa có báo cáo nào”); screenshot `390-bao-cao-empty.png`. “Thêm báo cáo” dialog: BLOCKED / not opened because UI requires at least one past session and rendered no add action; the session form remained at the current date and its native time/date controls could not be changed through this smoke UI session. No claim about dialog rendering.
- New fake workspace is left in staging: `smoke-390-24oct2`. No cleanup/delete attempt was made. No tokens, phone numbers, emails, or passwords recorded here.

## Thêm báo cáo staging

- Phạm vi: chỉ staging web/API; không production, demo hoặc workspace có sẵn. Đã tạo đúng một workspace giả: `smoke-reports-ui-20261024`; lớp `Smoke Reports`, một học sinh và ba buổi manual trong quá khứ. Điểm danh cả ba buổi tạo trạng thái held. API registration, class, student, sessions và attendance: PASS.
- Playwright Chromium headless (Google Chrome): 390×844, DPR 2, isMobile=true — PASS: mở hộp “Thêm báo cáo”; mặc định Buổi 1 → Buổi 3 (gần nhất đã diễn ra); chọn khoảng; tạo đợt; mở đợt; xem trước trong sheet; phát hành.
- Playwright Chromium headless (Google Chrome): 1280×800, DPR 1, isMobile=false — PASS: mở hộp “Thêm báo cáo”; mặc định Buổi 1 → Buổi 3; chọn khoảng; tạo đợt; mở đợt; xem trước trong popup; phát hành.
- Nhận xét tổng hợp giả được thêm để báo cáo đủ điều kiện phát hành. Kết quả sau phát hành: 1/1 sẵn sàng, 0 thiếu dữ liệu, 1 đã phát hành ở mỗi luồng.
- Ảnh từng bước: `shots/staging/390c-01-dialog.png` đến `390c-05-published.png` (thêm `390c-03-comment-filled.png`); `shots/staging/1280c-01-dialog.png` đến `1280c-05-published.png`.
- Credential được lưu riêng tại `~/.config/qlh/staging-smoke.txt` với mode 600; báo cáo không chứa thông tin đăng nhập. Browser instances đã đóng; không có server nào được khởi chạy. Mã nguồn không sửa.
