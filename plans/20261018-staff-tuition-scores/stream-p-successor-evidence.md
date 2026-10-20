# Stream P successor evidence — Pending validation

Owner: Tiêu Hà `5a29ca74-0f35-48d5-9bcc-4a960e72df35`; parent `01222fa0-c717-4e61-8fe9-3847e4900fdf`. No channel or lease created.

## Decisions

- Update existing prototype; preserve spec/seed over board sample data. No app-real/docs/reference/export mutations, no commit/push.
- W-AB `7281941d-f768-48fb-bd7e-533def42bf63`: staffing/session/shell; sole shell/router owner. W-CD `e4cca93e-2729-41ea-a2cb-14f9b0225614`: payroll/tuition only. Tokens/shared UI unchanged. Reuse W-AB for E after AB handback; E cannot edit shared while W-CD runs.
- Review selected on stable logical A–E candidate, two distinct lenses: UI/evidence and roles/fee-payroll/deployment risk. No self-review or per-Worker reviewer. Candidate/score pending convergence.

## Reference coverage (observation, not parity)

16 boards opened directly; 82 additional non-PH boards inspected in contact sheets under `/tmp/stream-p-*.jpg`. Desktop thumbnails establish structure/state, not fine text or pixel parity. 98 non-PH boards observed; D083–088 excluded by scope. Source evidence list: `/tmp/stream-p-reference-viewed.json`. No claim of 104/104 matched.

Direct: A001/002/010/011/017, B021/029, C035/042/055, D061/070/077, E089/095/101.

## Initial gaps

| Group | Source-to-board gaps before Worker changes | Validation |
|---|---|---|
| A | Mobile cards lack schedule/explicit edit; no desktop table; assignment modal saves immediately; session visual/confirmation differences | Pending |
| B | Labels/cards and seven-day desktop grid need alignment; person picker and empty states need checking | Pending |
| C | Desktop payroll table, summary/warning, card hierarchy and own-salary presentation | Pending |
| D | Summary/table hierarchy, send-all confirmation, full session charge breakdown; preserve makeup enabled and arithmetic | Pending |
| E | Desktop table-left/three-panels-right, local dot decimals, student navigation and empty states | Pending |

Shared: desktop shell initially has only Lớp/Lịch/Cài đặt. Role-specific expanded navigation pending. Mobile tabbar stays unchanged per plan.

## Verification

Historical 184 tests/typecheck/build are unverified for this candidate. Current checks/build/browser/deploy pending. Puppeteer available via existing user Node packages; installed Google Chrome launches headless successfully. Test fixture membership IDs confirmed from runtime: Cô Lan teacher `member-lan-teacher`; other salary `member-minh`. Dev server on 127.0.0.1:4173 for inspection; final built preview evidence will be separate.

## Risks and unverified states

Local prototype repositories are synchronous. Per-page skeleton/load-error designs may remain gaps compared with common lazy-route spinner/error boundary; do not fabricate loading parity. Save failures, offline sends, empty states and modal lifecycle need runtime checks. Deploy is not yet performed.

## C/D handback 1 (not candidate acceptance)

Worker reports 9 files changed, typecheck/build and 22 files/192 tests pass. Hashes verified against current files. Baseline `/tmp/c035-baseline/features/`; screenshots `/tmp/c035-mobile-final.png`, `/tmp/d077-desktop.png`, `/tmp/d070-detail.png` opened by Lead. Desktop toolbar differs from board (stacked month/class/duplicate fee banner); bounded correction sent to W-CD plus focused policy tests for new `tuitionMonthRows`. Worker reports exercised lock, fee switches, send/offline, filter, payments/overpay guard, discount; final candidate rerun pending. Missing-rate/cancelled/held-makeup/no-fee fixtures remain pending.

## C/D correction handback

Toolbar corrected; Worker reports typecheck + 8 focused policy tests pass, desktop 1280/1360 and mobile 390 no overflow. Fixture screenshots include missing rate, cancelled row, held makeup charge ON, no fee/no students. Snapshot source+hash manifest `/tmp/stream-p-cd-stable/`; original baseline `/tmp/c035-baseline/features/`. Lead opened corrected desktop C055/D077 and D070 fixture screenshot. Candidate-integrated checks/review still pending; 1024 breakpoint untested.

## A/B handback and E continuation

Worker reports 12 changed/new files, 25 files/213 tests, typecheck/build pass; screenshot/browser verification pending Lead harness. Source snapshot `/tmp/stream-p-ab-stable/`. Seed 4B not added (optional; breaks existing scope-count expectations); runtime fixtures will exercise missing-main/empty branches. Known gaps: per-page loading/load-error not implemented for synchronous store, shared Modal has Đóng/no drag handle, session teachers card precedes full attendance UI, start time only (no duration field). W-AB reused for E with report-only write-set and router detail handle; no shared format/tokens edits.

## Lead preliminary runtime check (before E; not final candidate)

Puppeteer smoke ran from fresh seed on dev. Mobile routes A/B/C/C-detail/D/D-detail/E/E-detail rendered before assertion at session route: `document.scrollWidth=402` for 390px viewport; only `.tabs` right=402 width=414. Evidence `/tmp/stream-p-session-overflow.png` and `/tmp/stream-p-pre-e/smoke-failure.json`. W-AB/E receives bounded CSS correction in `sessionDetail.module.css` (negative tabs margin). No final candidate pass claimed.

## Lead actions A–D (pre-E integrated dev)

PASS `/tmp/stream-p-pre-e/actions.json`: assignment draft/cancel/save+scope; substitute cancel-confirm/create; week/person; rate/adjustment/lock readonly; makeup ON+send-all confirmation; discount 20% (3×150k×0.8=360k), two payments and paid state, offline send; browser fixture missing-main/empty classes/unassigned/no-rate/no-fee/no-students/cancelled/held makeup; 1024 A/B/C/D page widths. No console/page errors in this run. First harness attempt stopped because it queried native `dialog[open]` for existing ConfirmDialog div; harness corrected to `[role=dialog]`, no app mutation for that failure. Full candidate production smoke and E validation pending.

## Additional Lead visual measurements (pre-freeze)

Opened A/B mobile + 1024 screenshots from preliminary harness. A mobile actual article bbox width 272.156,left58.922 at390 (not claimed350); `.page` grid with auto margins lacks width100%. A assignment/substitute modal still centered, existing shared Modal supports sheet prop. B1024 renders all7 columns with no page overflow but very narrow card text; 1360 visual pending. Bounded width/sheet correction sent to W-AB/E; no shared UI edits requested.

## Candidate v1 and independent review round 1

- Frozen `/tmp/stream-p-candidate-v1`, identity `b2fccc57f1eace9cddd1abd7356f55ec21472233cf141f04eafca97514ed8c9d`; manifest373 files includes source+dist+raw evidence, raw.diff29 changed files from true AB/CD/E baselines. Snapshot read-only permissions; no commit/push.
- Score S5 (29 files/cross-module), I4 (deploy), U2 (partial edge-state coverage), R11 -> 2 independent lenses. UI `4058413d-5ce0-4c06-98a8-77e5a234681e`; roles/finance/deploy `d4bdc663-610f-40a2-877e-a6c4dc62e9e2`. Codex fallback deviation documented in ledger; auto + plan_mode true, contract read-only, not a native read-only sandbox.
- Lead checks: typecheck exit0; npm test25 files/214 pass; build exit0 (exact log `/tmp/stream-p-verification/build.log`). Production preview4174 smoke11 routes×390/1360 +teacher role guards PASS0 errors (`smoke.json`); A–D actions/fixtures+1024 PASS (`actions.json`); E entry/navigation/teacher menu/no-scores/no-attention/absent+decline390/1360 PASS0 errors (`e-actions.json`). All copied frozen under candidate/evidence.
- Lead opened final mobile A/B/E-detail and desktop B/D/E screenshots. A350px and session390 overflow fixed. Shared modal remains inset with Đóng/nohandle and scrolling; per-page skeleton/load-error designs remain unimplemented (synchronous store); seed data differs from board per spec,4B omitted but missing-main runtime fixture checked. Review verdicts pending.

## Independent review1 risk verdict

Reviewer d4bdc663 verified manifest373 and returned CHANGES_REQUIRED: R1 locked payroll changes with later rates/teaching; R2 reassignment rewrites completed teachers/pay; R3 class-scope bypass through direct class/session reads/writes; R4 own-salary month selector missing/query dropped; R5 multi-commit assignments/notices may partially persist on failure. Full findings in reviewer notification; no cloud mutation. Source/dist remain frozen until UI review ends. Prepared correction packets (not launched): financeWorker owns shared snapshot types/migrations/outbox/seed/teaching/payroll+atomic staffing/notices+salarymonth; accessWorker owns access/helpers/class/session/roster readwrite guards+exact substitute exception. Choose snapshots over effective-date history for smallest prototype correction. Legacy overwritten history cannot be reconstructed; migration will preserve currently known facts.

## Review1 correction dispatch

Both independent reviews ended CHANGES_REQUIRED,7 REQUIRED total. W-CD implements locked-payroll/heldstaff snapshots, atomic assignment/notices, ownsalarymonth selector/query, paidCTA and C/D/A assignment footer integration. W-AB implements scoped reads/writes/exactsubstitute exception, sharedModal optionalfooter/fullwidth mobile +TeacherModalfooter and bounded NITs. AB alone owns sharedUI/access/session/attendance helpers; CD alone commondata types/migrations/outbox/seed/teaching/payroll/staffing/tuition and AssignmentsPage (avoids common-file race). Working source may now change; candidatev1 remains immutable. Corrected actualrisk I5 (scope boundary), S5/U2/R12,2distinct lenses round2; no deployment yet.

## Finance correction handback (not integrated acceptance)

W-CD reports27files/227 tests pass, immutable PayrollSnapshot including lines/counts/rates/adjustments/names captured atomically with lock; heldstaff base hydrated seed/migration and captured before staffing/substitution mutations; atomic setClassStaff/sendTuitionNoticeBatch; ownmonthnav/query; paidCTA removed; C/D/A Save footers migrated. Typecheck7 transient errors while AB footer/scope code unfinished (6footerprops+1NoAccess). Source snapshot `/tmp/stream-p-cd-review1-stable`, baseline `/tmp/c035-review1`. Legacy overwritten facts cannot be restored; migration freezes current readable values, persists on nextstorewrite. Browser/Lead final atomicity and allsource verification pending.

## Integrated correction checks (in progress)

Lead reran typecheck exit0, tests28files/240 pass, build exit0; raw logs `/tmp/stream-p-verification-v2/{typecheck,tests,build}.log`. Previous preview4174 process was no longer listening, causing first browser attempts ERR_CONNECTION_REFUSED before assertions. Restarted preview; preserved environment-failure attempts `/tmp/stream-p-v2-attempts`. Four browser suites rerunning against latest built dist; no candidate pass claimed until outputs complete.

## Review corrections convergence — 2026-10-19
Lead verification: typecheck exit0, npm test 28 files/240 tests pass, build exit0. Production 390/1360 smoke11 routes+roles, A–D actions/fixtures/1024, E navigation/empty/absence-decline and review-regressions passed with zero console errors. Raw outputs/screenshots: /tmp/stream-p-verification-v2. Harness unassigned fixture was corrected to remove completed sessions and sessionStaffBase, since preserving historical teaching is now intended; previous fixture-failure JSON archived in /tmp/stream-p-v2-attempts, no source change. Review-regressions include browser storage failure atomicity/draft retention, exact substitute scope, locked amounts after rate/assignment+reload, own month navigation, fullwidth sheet visible Save and fully paid CTA. Residual: synchronous-store loading/load-error board states remain unimplemented/unverified; legacy overwritten historical facts cannot be reconstructed. No deployment yet.
