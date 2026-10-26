# Baseline test:click

Baseline worktree: `/tmp/qlh-base-f31150e`, detached at `f31150e`; same installed dependencies as HEAD. Three sequential runs on baseline and three on HEAD, all using the test's fixed port 5191.

| Candidate | Run | PASS | FAIL | Failures |
|---|---:|---:|---:|---|
| `f31150e` | 1 | 17 | 4 | Mobile session cancel target below viewport; desktop session cancel detached; desktop test delete detached; mobile confirm target below viewport |
| `f31150e` | 2 | 19 | 2 | Mobile session cancel target below viewport; desktop test delete detached |
| `f31150e` | 3 | 20 | 1 | Mobile confirm target below viewport |
| `845deac4cb60da5d64abd41f679a7d2c0d35682c` | 1 | 19 | 2 | Desktop session cancel detached; desktop test delete detached |
| `845deac4cb60da5d64abd41f679a7d2c0d35682c` | 2 | 18 | 3 | Desktop session cancel detached; desktop test delete detached; mobile confirm target below viewport |
| `845deac4cb60da5d64abd41f679a7d2c0d35682c` | 3 | 20 | 1 | Desktop session cancel detached |

## Baseline vs HEAD

No new failure type appeared in HEAD. Desktop test delete detached in all three baseline runs and in two of three HEAD runs. Desktop session cancel detached once at baseline and in all three HEAD runs. Mobile off-viewport failures appeared in all three baseline runs collectively and in one of three HEAD runs.

Likely causes are in the click harness's target selection and scrolling: [ui-click-check.mjs](/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/scripts/ui-click-check.mjs:62) samples a target center after scrolling, while session/test menu cases are at lines 154–172 and the mobile confirm case is at lines 226–235. Mobile evidence reported center Y=952/954 with viewport height 844 (`elementFromPoint` returned `none`). Desktop detached locators occurred during `scrollIntoViewIfNeeded`, after menus had re-rendered.

No application source was changed for these failures. The temporary worktree was removed after the three baseline runs.

## Post-A candidate run

| Candidate | Run | PASS | FAIL | Failures |
|---|---:|---:|---:|---|
| `bcc782a` | 1 | 19 | 2 | Desktop student row “edit phone” locator detached; desktop test row “delete” locator detached |

This single post-A sample reproduces the desktop test delete detachment previously seen at baseline, and also observes a student edit-phone detachment not listed in the earlier three-run 845deac run set. One sample is insufficient to estimate its frequency. No `src/**` changes were made for click failures.

## Final candidate `c9337a52b1583216c23eaeb19159cd724d59305e`

Final `npm run test:click` sample: **19 PASS / 2 FAIL**. Both failure types were observed at baseline: desktop test-row delete locator detached during menu re-render (`scripts/ui-click-check.mjs:63`, call site around `:169–171`); mobile confirm target remained below the 390×844 viewport, with center Y=954 (`scripts/ui-click-check.mjs:62–89`, call site `:232–234`). Evidence screenshots: `shots/after/click-failure-desktop-test-row-menu-xo-1440.png` and `shots/after/click-failure-confirm-dialog-button-390.png`. No new failure type was found; app source was not changed.

## Candidate `5947010e5d90bb1cfd20d0f3fdd59c4025064f00`

`npm run test:click`: **19 PASS / 2 FAIL**. Desktop session-row cancel locator detached (`scripts/ui-click-check.mjs:63`, call site `:161`) and desktop test-row delete locator detached (`:63`, call site `:174`). Both failure types have baseline observations. Evidence: `shots/after/click-failure-session-row-menu-cancel-1440.png` and `shots/after/click-failure-desktop-test-row-menu-xo-1440.png`; no app source changes.

## Final candidate `1f266266a2f03ac69712f97cef84fa3ca3cffb20`

| Run | PASS | FAIL | Failure types |
|---:|---:|---:|---|
| 1 | 18 | 3 | Desktop edit-phone detached; desktop test-delete detached; mobile confirm target below viewport |
| 2 | 20 | 1 | Desktop test-delete detached |
| 3 | 19 | 2 | Mobile session-cancel target below viewport; desktop test-delete detached |

Compared with the three original `f31150e` baseline runs, the only failure type not observed there is desktop student edit-phone locator detachment (`scripts/ui-click-check.mjs:63`, call site `:158`), evidence `shots/after/click-failure-student-row-menu-edit-phone-1440.png`. This type did occur in one intermediate `bcc782a` sample. Desktop test-delete detachment and mobile off-viewport failures occurred at baseline. No `src/**` changes.
