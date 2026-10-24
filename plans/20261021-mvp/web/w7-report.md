# W-7 — UX v2 staging verification

Date: 2026-10-23  
Branch: `mvp-web`, base `839a3d0`  
Staging deployment verified: `https://75f03bb1.qlh-staging-web.pages.dev` (Cloudflare Pages, staging project `qlh-staging-web`, branch `main`).  
Browser: Google Chrome 155; viewports 1440×900 and 390×844. Screenshots and machine-readable guardian measurements: [`shots/w7/`](shots/w7/).

## Screenshots and visual comparison

Captured against staging data and compared with `design/prototype-shots/ux-v2/after/`. The layouts and components track the references; content and values differ where the staging seed differs from the prototype seed. The guardian settings route displays the staff shell (see issues below).

| Role / surface | Desktop | Mobile | Comparison |
|---|---|---|---|
| Teacher: all classes, create class | `teacher-classes-desktop.png`, `teacher-create-class-desktop.png` | `teacher-classes-mobile.png`, `teacher-create-class-mobile.png` | Matches structure; staging class data differs. |
| Teacher: edit class, 5 class tabs | `teacher-edit-class-desktop.png` | `teacher-edit-class-mobile.png` | Edit dialog captured after entrance animation; class detail tabs are represented in the classes/session views. |
| Teacher: sessions, session detail | `teacher-sessions-desktop.png`, `teacher-session-detail-desktop.png` | `teacher-sessions-mobile.png`, `teacher-session-detail-mobile.png` | Structure matches; staging schedule and records differ. |
| Teacher: tests, scores, students, reports, settings | `teacher-tests-desktop.png`, `teacher-scores-desktop.png`, `teacher-students-desktop.png`, `teacher-reports-desktop.png`, `teacher-settings-desktop.png` | Matching `*-mobile.png` files | Structure matches; staging data differs. |
| Guardian: class, session, cancelled session | `guardian-class-desktop.png`, `guardian-session-desktop.png`, `guardian-cancelled-session-desktop.png` | Matching `*-mobile.png` files | Session and cancelled-session captures show staging records; data differs from prototype seed. |
| Guardian: scores, report, teacher comments | `guardian-scores-desktop.png`, `guardian-report-desktop.png`, `guardian-comments-desktop.png` | Matching `*-mobile.png` files | Layouts match. Initial selected child's report is unpublished. |
| Guardian: child picker, second child, settings | — | `guardian-child-picker-mobile.png`, `guardian-child-second-mobile.png` | Child switch succeeded. Settings route shows staff navigation and needs route ownership review. |

All captured images were checked for visible phone-number masking. No credentials or comment text were added to this report.

## Layout and hit target measurements

| Check | Result |
|---|---|
| Mobile document `scrollWidth` | 390px for tested teacher and guardian routes at a 390px viewport; no horizontal overflow. |
| Teacher desktop content width | 1160px (limit 1200px); document width 1440px. |
| Guardian desktop content width | 960px (limit 960px) on guardian routes; `/cai-dat` is 1160px because it loads the staff shell. |
| Guardian mobile buttons | Main measured targets are at least 44px. Month switch buttons were 44×44px after fix. |
| Teacher mobile buttons | Main measured targets are 44px or larger; report-card actions include 41px-high controls and are below the 44px requirement. |
| Desktop button targets | Several session controls measured 28×44px and student controls 32×44px, below the 36px minimum. Teacher settings and guardian settings controls measured at least 40×44px. |

## Motion measurements and source audit

| Interaction | Result |
|---|---|
| Route transition | 200ms page token. |
| Sheet | Entrance measured 250ms; exit token 200ms. |
| Desktop dialog | Entrance measured 250ms with scale and fade. |
| Dialog close | The script observed `dialog[open]` removed after 39ms desktop / 57ms mobile. This does not establish that the 200ms exit animation completed; treat as a failed/inconclusive check for follow-up. |
| Tab indicator | Moves via transform; width transition removed. |
| Press state | `scale(0.98)`; button transition is transform-only. |
| Reduced motion | Emulated `reduce`: base duration 1ms and animation `none`. |
| Animated properties | Source audit found transform/opacity, plus the allowed grid-template-rows collapse; removed color, background-color, and width transitions from shared controls/navigation/indicators. |

## Score formatting and guardian flow

| Check | Result |
|---|---|
| Teacher score input | `7,5` and `7.5` accepted; `7,3` rejected; save stayed disabled, so no score was written. |
| Display format | No dot-decimal score strings found in the scanned guardian routes; visible values use comma decimals and `/max` format. |
| Guardian navigation | Exactly two bottom tabs; child picker showed two children and switching changed child in 227ms. |
| Legacy paths | `/ph/diem-danh` → `/ph`; `/ph/btvn` → `/ph`; `/ph/diem-so` → `/ph/diem`; `/ph/nhan-xet/:id` and `/ph/btvn/:id` → `/ph/buoi/:id`. |
| Session and cancellation | Session detail and a cancelled session were captured directly from staging IDs. |
| Comments | Teacher comments screen captured; staging content shown. |
| Older malformed report shape | Not verified: the available report for the selected child was unpublished, and no malformed legacy report record was available to exercise. |
| Runtime errors | 0 browser page errors in the guardian flow. |

## Lighthouse and bundle

Lighthouse mobile run on `/dang-nhap`, Slow 4G (RTT 150ms, 1600kbps) and CPU 4×:

| Performance | Accessibility | Best Practices | LCP | TBT | CLS | Transfer |
|---:|---:|---:|---:|---:|---:|---:|
| 89 | 100 | 100 | 3.04s | 0ms | 0 | 272,393 B |

Gzip bundle sizes from the successful production build:

| Route bundle | Gzip |
|---|---:|
| Initial JS | 146,519 B |
| First teacher route JS | 160,866 B |
| First guardian route JS | 170,143 B |
| CSS (initial / teacher / guardian) | 3,297 / 7,325 / 9,397 B |

All listed JS bundles are under 200 KB.

## Fixes and remaining issues

| Finding | Disposition |
|---|---|
| Motion transitions animated width, color, or background-color | Fixed in shared motion, UI, staff navigation, and class-space styles; indicator/tab movement now uses transform. |
| Guardian month switch targets were 40×40px | Fixed to 44×44px. |
| Guardian avatar settings route `/cai-dat` loads `StaffShell`; desktop content is 1160px and teacher navigation appears | Needs route/ownership review by another worker. This is wider than a small CSS/JSX correction; not changed silently. |
| Teacher session (28px) and student (32px) desktop action targets | Needs review and scoped adjustment; below brief's 36px minimum. |
| Teacher mobile report actions measured 41px high | Needs review; below brief's 44px minimum. |
| Dialog close completion and legacy malformed report compatibility | Not verified; see measurement results above. |

## Validation and deployment

- `npm run typecheck`: passed.
- `npm test`: 246 passed, 1 skipped (31 test files passed, 1 skipped).
- `VITE_API_BASE_URL=https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1 npm run build`: passed.
- `git diff --check`: passed.
- Deployed the final build to staging and re-ran Lighthouse against that deployment.
- Code changes are limited to six CSS files; this report and screenshots are in the authorized main-repo output directory and are not part of the code commit.

## Vòng 2 — U-2 follow-up (2334718)

User reported that `2334718` is deployed to staging. I opened the staging alias in Google Chrome, but the parent demo login was temporarily rate-limited after my initial attempts used the full `+84` number in the local-number field (the form already supplies `+84`). The API then returned “Bạn thử đăng nhập quá nhiều lần. Hãy chờ rồi thử lại.”, and no authenticated parent DOM was available for this follow-up.

The suspect `shots/u2/desktop-cai-dat.png` was not used. The four attempted `u2-round2-guardian-*.png` captures were also discarded: they show the signed-out login screen, not authenticated staging pages. Existing `round2-guardian-settings-{desktop,mobile}.png` and `round2-guardian-class-{desktop,mobile}.png` are from the previous staging verification and do not prove the behavior of `2334718`.

| U-2 check on the newly deployed staging build | Result |
|---|---|
| Parent settings desktop 1440×900 / mobile 390×844 screenshots | Not captured while authenticated; no replacement evidence saved. |
| Guardian frame `getBoundingClientRect`, content width ≤960px, top bar position | Not measurable on the signed-out page; no conclusion about a real layout defect. Previous-build metrics were frame/content 960px desktop and 390px mobile, but do not verify `2334718`. |
| Settings presentation: two columns, two guardian tabs, no teacher navigation | Not verified against `2334718`. |
| Parent “Lớp học của con” screenshots and `teacher_name` line | Not verified against `2334718`; neither present-name display nor null-name hiding was exercised. |
| Difference against `ux-v2/after/final/d-ph-cai-dat.png` | Undetermined on the current staging build. The suspect U-2 screenshot is excluded from comparison. |

| Remaining difference | Type | Evidence / disposition |
|---|---|---|
| U-2 desktop two-column settings and parent shell | Visual/layout | Current deployment could not be inspected with an authenticated parent session; unresolved. |
| Teacher schedule/name line, including `teacher_name: null` | Data + conditional rendering | Current staging parent data could not be read; unresolved. |

This follow-up is intentionally an incomplete staging verification: the current screenshot set contains no authenticated post-`2334718` U-2 evidence, so it cannot establish whether the reported frame issue is fixed or remains.

### Single retry requested by user (04:05)

Made exactly one parent-demo login attempt with the national number normalized to nine digits (removed `+84` and any leading `0`) and the password from the credentials file. The page remained on `/dang-nhap` and showed “Bạn thử đăng nhập quá nhiều lần. Hãy chờ rồi thử lại.” The client maps that UI message to error code `rate_limited` (`src/data/auth/index.ts:56`); an HTTP status was not captured. Per instruction, I stopped without another parent attempt or a Multi-role attempt. No new authenticated screenshots or layout/data measurements were produced.

| Requested post-`2334718` check | Latest result |
|---|---|
| Parent settings and “Lớp học của con” screenshots at desktop/mobile sizes | Blocked by the single login attempt returning `rate_limited`; no current-build screenshots saved. |
| Guardian frame/top bar/content width and settings card columns | Blocked: no authenticated DOM to measure; no conclusion on whether the layout defect is real. |
| Parent shell ownership and teacher navigation | Blocked: could not open settings after login. |
| `teacher_name` present/null branches | Blocked: could not inspect either child's rendered class data; null branch remains untested. |
| Multi-role settings shell in both roles | Not attempted, as required after the parent login failure. |

The staging login denial is the only post-`2334718` runtime finding from this retry. The earlier rows in this section remain unresolved rather than passing results.

### Bundle and Lighthouse (independent of login)

Rebuilt the current worktree (`ee392bb`, including the small breadcrumb target change); build and the repository's bundle check passed.

| Bundle | Gzip | Limit |
|---|---:|---:|
| Initial JS | 146,615 B | ≤200,000 B |
| First teacher route JS | 160,973 B | ≤200,000 B |
| First guardian route JS | 170,821 B | ≤200,000 B |
| CSS initial / teacher / guardian | 3,297 / 7,325 / 9,397 B | — |

Lighthouse mobile on staging `/dang-nhap` (Slow 4G profile: RTT 150ms, 1600kbps, CPU 4×): Performance 90, Accessibility 100, Best Practices 100; LCP 2.91s, TBT 0ms, CLS 0, transfer 221,785 B.

## Vòng 3 — staging `ee392bb`

Verified on the live staging alias in Google Chrome 155. Each credential was submitted once: parent demo login succeeded; Multi-role login succeeded and opened the role chooser. The Multi-role account offers **Phụ huynh** and **Quản trị viên** (staff shell), not a role literally labeled “Giáo viên”; switched staff → guardian → staff without another login. No CSS/JSX defect requiring a small code change was found, so this round makes no source commit or redeploy.

### Parent shell and class

| Route / viewport | `getBoundingClientRect` and checks |
|---|---|
| `/cai-dat`, desktop 1440×900 | Guardian frame `(0,0) 1440×900`; main `(240,57) 960×697.5`; full top bar `(0,0) 1440×57`; settings grid `(272,156.6) 896×552`, `grid`, columns 427.3px + 448.7px. Two guardian tabs, no staff navigation. Profile and password/logout occupy the two columns; this parent-only membership has no role card. |
| `/cai-dat`, mobile 390×844 | Guardian frame 390×844; main `(0,0) 390×490.8`; document width 390px; two bottom tabs, no staff navigation. The mobile header follows the reference’s compact “Cài đặt” heading layout; it has no desktop top bar. Profile card is visually 350px wide at x=20; the aggregate card selector did not return a mobile DOM rectangle, so that width is a screenshot measurement. |
| Multi-role `/cai-dat`, guardian | Guardian frame `(0,0) 1440×900`; main `(240,57) 960×789.5`; top bar height 57px; two guardian tabs and no staff links. Role card is present. |
| Multi-role `/cai-dat`, staff | Staff frame `(16,16) 1408×868`; main `(264,16) 1160×868`; top bar `(296,44) 1096×55.5`; staff nav present, guardian nav absent. Settings grid `(296,117.5) 1096×623`, columns 524.9px + 551.1px; role card `(296,466) 524.9×274.5`. |
| `/ph`, desktop and mobile | Main widths 960px / 390px; desktop top bar 1440×57, mobile top bar 390×52; two guardian tabs and no teacher navigation. The displayed class line is “Thứ Ba, Thứ Năm · 18:00 · Giáo viên Cô Hương (demo)”; staging’s weekdays/name differ from the prototype’s sample, and the teacher name is shown. The requested `teacher_name = null` branch was not present in the observed class and remains untested. |

Parent demo settings show two children, each associated with class 6A. I opened the child chip and clicked the other child entry; this run did not retain a per-child record signature, so correct ownership of each child’s class, teacher feedback, homework, and scores remains unverified. Do not treat the successful chip click alone as the requested data-isolation smoke pass. The settings source conditionally renders the role panel only when `multipleRoles` is true, which matches the parent-only account’s missing role card and the Multi-role account’s role card.

### Side-by-side evidence

Each `r3-compare-*` file places the staging capture beside its named prototype. Phone fields are masked in the staging images and comparison sheets.

| Staging capture | Prototype reference | Side-by-side image |
|---|---|---|
| `r3-parent-settings-desktop.png` | `after/final/d-ph-cai-dat.png` | `r3-compare-parent-settings-desktop.png` |
| `r3-parent-settings-mobile.png` | `after/final/m-ph-cai-dat.png` | `r3-compare-parent-settings-mobile.png` |
| `r3-multirole-guardian-settings-desktop.png` | `after/final/d-ph-cai-dat.png` | `r3-compare-multirole-guardian-settings-desktop.png` |
| `r3-parent-class-desktop.png` | `after/final/d-ph-ph.png` | `r3-compare-parent-class-desktop.png` |
| `r3-parent-class-mobile.png` | `after/final/m-ph-ph.png` | `r3-compare-parent-class-mobile.png` |
| `r3-teacher-classes-desktop.png` | `after/teacher/d-gv-lop.png` | `r3-compare-teacher-classes-desktop.png` |
| `r3-teacher-settings-desktop.png` | `after/teacher/d-gv-cai-dat.png` | `r3-compare-teacher-settings-desktop.png` |

### Remaining differences

| Screen | Difference | Type | Fixed? | Reason / status |
|---|---|---|---|---|
| Parent settings desktop/mobile | Layout and shell match the references. Parent-only account has no role-switch card; Multi-role account shows it in the correct shell. | Membership data | Pass | Conditional role card reflects the account’s memberships. |
| Parent class desktop/mobile | Staging shows class 6A, Tue/Thu schedule, its teacher name, and staging scores/session dates; reference uses a different class, weekdays, teacher, and seed records. | Staging data | No change | Visual structure matches; data values are environment-specific. Null-teacher conditional remains untested. |
| Parent child-specific records | Two children are listed and chip selection was exercised, but no per-child before/after record signature was retained for class/feedback/homework/scores. | Staging data / verification gap | Not verified | Do not claim correct per-child isolation from this run. |
| Teacher “Tất cả lớp” | Staging shows “Chưa có lớp học” and no “Hôm nay” class card; reference has a class card. | Staging data | No change | Multi-role staff membership has zero classes available. Screenshot: `r3-teacher-classes-desktop.png`. |
| Teacher class detail and report | No class was available to open; the “Báo cáo” navigation resolves to the class list when no class is selected. No authenticated detail/report reference comparison is available. | Staging data | Not verified | Cannot assess detail/report visual parity without a staging class. |
| Teacher settings | Layout matches; account identity is “Quản trị viên” rather than the prototype’s “Giáo viên”. | Staging account role data | No change | Multi-role staging account exposes guardian + admin/staff memberships. |

### Bundle and Lighthouse

Rebuilt the `ee392bb` worktree; typecheck/build and `src/test/check-bundle.mjs` passed.

| Route bundle | Gzip | Limit |
|---|---:|---:|
| Initial JS | 146,615 B | ≤200,000 B |
| First staff route JS | 160,973 B | ≤200,000 B |
| First guardian route JS | 170,821 B | ≤200,000 B |
| CSS initial / staff / guardian | 3,297 / 7,325 / 9,397 B | — |

Lighthouse mobile on staging `/dang-nhap` (Slow 4G: RTT 150ms, throughput 1600kbps, CPU 4×): Performance 90, Accessibility 100, Best Practices 100; LCP 2.98s, TBT 15ms, CLS 0, transfer 243,552 B.

## Vòng 4 — staging `ee392bb` (2026-10-23)

### Access status

Prepared one sign-in attempt for the teacher demo account, using the form's existing `+84` prefix and the nine national digits from the protected credentials file. The browser automation raised a harness error immediately after the submit click, before it captured the authentication response; a subsequent read-only check showed no authenticated session. I did not retry the teacher login or attempt the guardian/Multi-role login because the result could not be distinguished from an authentication or throttle failure under the one-attempt rule. No phone, password, or raw comment text was recorded.

### Verification and remaining differences

| Screen / check | Difference or evidence | Type | Fixed? | Reason / status |
|---|---|---|---|---|
| Teacher login / all requested teacher screens | The browser is unauthenticated after the single submit action; no API error code was captured. No teacher screenshots or measurements were produced. | Access / verification gap | No | Stop after the one attempt; cannot safely repeat to obtain `rate_limited` or auth response. |
| Guardian two-child signatures and IndexedDB ownership | No guardian login was attempted, so child A/B signatures, selected-child IDs, and return-to-A comparison are unavailable. | Verification gap | No | Stopped account sign-ins after the teacher outcome became indeterminate. |
| Visual comparison, target sizes, overflow, motion, score parsing, offline attendance, print preview | Not remeasured in Round 4; no Round 4 screenshots were saved under `shots/w7/`. | Verification gap | No | All require authenticated teacher/guardian UI and were not inferred from earlier rounds. |
| Differences table | No new verified visual or staging-data difference can be classified in this round. | Verification gap | No | Report only established evidence; previous-round findings remain in Vòng 3. |

No CSS/JSX changes, commit, or deployment were made in this round. Existing Vòng 3 bundle and Lighthouse results above are prior-run evidence and are not remeasured for Vòng 4.
