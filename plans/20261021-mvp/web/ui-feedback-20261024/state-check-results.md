# State check results

Candidate: `1f266266a2f03ac69712f97cef84fa3ca3cffb20` (HEAD). `test:state` was run twice for web and once for prototype across 390×844, 1024×800, 1280×800, and 1440×900.

| Target/run | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| Web 1 | 87 | 0 | 24 |
| Web 2 | 87 | 0 | 24 |
| Prototype 1 | 54 | 0 | 60 |

| Area | Web | Prototype |
|---|---|---|
| F1 no class / class selected | PASS, all widths | no-class SKIP (seed selects 6A); class selected PASS, all widths |
| F1 desktop sidebar one selected fill | PASS on `/lop`, class page, attendance, session detail at desktop widths | PASS on `/lop` and class page; attendance/session-detail SKIP (unsupported routes) |
| F2–F4 routes/cards | PASS; F3 card selection uses the visible class picker, all desktop widths | PASS for supported route and F3 picker/card states; mobile desktop-only card SKIP |
| F5 no class breadcrumb | PASS, all widths | PASS, all widths |
| F6 current-session card | PASS, all widths | PASS, all widths |
| F6 upcoming single “Xem buổi” action | PASS at 1024/1280/1440; mobile SKIP (no card) | SKIP (prototype has no separate upcoming card) |
| F7 filtered empty + mascot | PASS, all widths | SKIP (no empty fixture) |
| Selected nav / segmented / chip / row fill | PASS where target renders; mobile tabbar and absent targets SKIP | SKIP where no selected target renders |
| F8 busy/spinner ≥350 ms + “Đã lưu” | PASS, both runs and all widths | SKIP (no save/backend flow) |
| F8 delayed pending and offline pills | PASS, both runs and all widths; waits up to 4 s | SKIP (no outbox/offline flow) |
| F8 injected IndexedDB error keeps editor/value | PASS, all widths | SKIP (no IndexedDB save flow) |
| F9 score keyboard navigation | PASS at desktop widths; mobile SKIP | PASS at desktop widths; mobile key action SKIP |

Both web runs and the prototype run had no state failures. Run JSON: `tools/state-check-web-run-1f26626-web-{1,2}.json`, `tools/state-check-proto-run-1f26626-proto-1.json`; latest summaries: `tools/state-check-{web,proto}.json`.

## Save and click checks

On this candidate, `npm run test:save`: **158 PASS / 0 FAIL / 24 INFO**. The script's dirty-navigation cases choose “Ở lại”; it does not test saving from a leave-screen dialog. Full report: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/ui-save-check-results.md`.

On this candidate, `npm run test:click` produced 18/3, 20/1, and 19/2 PASS/FAIL across three runs. Failure types: mobile session cancel below viewport (`scripts/ui-click-check.mjs:63`, call `:170–171`); desktop edit-phone locator detaches (`:63`, call `:158`); desktop session cancel detaches (`:63`, call `:165`); desktop test delete detaches (`:63`, call `:177`); mobile confirm button below viewport (`:63`, call `:241`). Against the original `f31150e` baseline, edit-phone detachment is the only failure type not observed there. It had appeared in one intermediate `bcc782a` run. Screenshot: `shots/after/click-failure-student-row-menu-edit-phone-1440.png`; other click failure screenshots are also in `shots/after/`.

## Screenshots

`shots/after/index.json` has 55 records, including every one of the 27 filenames from `shots/before/index.json`; broad F1/F3/F5/F6/F7 captures predate this candidate. F8 state captures and click-failure screenshots were refreshed during these runs. Prototype 1280 table overflow is visible in `proto-F5-class-1280.png`; the before index has no prototype screenshot, so there is no prototype baseline comparison.
