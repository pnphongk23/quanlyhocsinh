# iOS P0 run plan (45-minute cap)

Static plan only. Do not start until GL returns the updated app on the existing `iPhone 16` and QA confirms at least 4 GiB free. Use the supplied simulator UDID as the first argument to `preflight.sh`; do not create a simulator. Run groups in order, record each result in `status.tsv`, and stop a flow after two selector attempts. The budget is about 39 minutes for the teacher smoke path plus a 4-minute parent-lane reserve; skip parent cases if the register lane is still occupied or the reserve is exhausted.

Before preflight, build Staging with Manual ad-hoc signing: `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`. Do not set `CODE_SIGNING_REQUIRED=NO`; an unsigned simulator build can leave auth-token persistence broken while the login API returns HTTP 200. The preflight verifies `Signature=adhoc` on the installed app before reading credentials.

## Ordered run list

Fixture baseline: staging smoke workspace; create a shared class `QA-iOS-P0-SharedClass` (T2/T5) and a Sunday-only class `QA-iOS-20261025-CLS017-R2-CN` at 18:00; create four students `QA-iOS-P0-Student-1..4` with fake parent numbers, one upcoming session, one homework part `QA-iOS-P0-GradedPart` on the previous session, and two isolated tests: `QA-iOS-P0-Test-1` (four visible students) and `QA-iOS-P0-Test-Default` (student 3 excluded, student 1 scored 12, student 2 blank). Keep all created fixture names prefixed `QA-iOS-`. The create-class case establishes the shared class; add the remaining student/session/homework/test fixtures through their UI before dependent flows. Do not use or alter `QA-Web-*` data.

| 1 | TC-ID | Flow | Fixture needed | Estimate |
|---:|---|---|---|---:|
| 2 | TC-AUTH-002 | `auth/login.yaml` (via `preflight.sh`) | One teacher smoke account; normalized phone is held in memory | 2 min |
| 3 | TC-CLS-001 | `classes/TC-CLS-001.yaml` | Creates `QA-iOS-P0-SharedClass`, T2/T5 | 1 min |
| 4 | TC-CLS-006 | `classes/TC-CLS-006.yaml` | Shared class with 16 generated sessions | 1 min |
| 5 | TC-CLS-007 | `classes/TC-CLS-007.yaml` | Shared class with upcoming session available to cancel | 1 min |
| 6 | TC-CLS-016 | `classes/TC-CLS-016.yaml` | Shared class and a future session | 1 min |
| 7 | TC-CLS-017* | `classes/create-sunday-class.yaml` | Sunday-only class, 18:00; inspect the `CN · dd/mm` session label | 1 min |
| 8 | TC-STU-001 | `students/TC-STU-001.yaml` | Shared class; fake parent number; student 1 | 2 min |
| 9 | TC-ATT-001 | `attendance/TC-ATT-001.yaml` | Four visible QA-iOS students in the shared session | 2 min |
| 10 | TC-ATT-002 | `attendance/TC-ATT-002.yaml` | Attendance saved by TC-ATT-001 | 1 min |
| 11 | TC-ATT-003 | `attendance/TC-ATT-003.yaml` | Future session in shared class | 1 min |
| 12 | TC-CMT-001 | `comments/TC-CMT-001.yaml` | Four-student roster and shared session; flow uses placeholder ratings only | 1.5 min |
| 13 | TC-CMT-006 | `comments/TC-CMT-006.yaml` | Unsent forms for all students in the shared session | 1.5 min |
| 14 | TC-CMT-017 | `comments/TC-CMT-017.yaml` | Shared session + Student-1; synthetic 301-char string | 1 min |
| 15 | TC-HW-001 | `homework/TC-HW-001.yaml` | Shared session; no duplicate vocabulary part | 2 min |
| 16 | TC-HW-008 | `homework/TC-HW-008.yaml` | Prior session has `QA-iOS-P0-GradedPart`; four students | 1 min |
| 17 | TC-TST-001 | `tests/TC-TST-001.yaml` | Shared class and four students; create `QA-iOS-P0-Test-1` | 1.5 min |
| 18 | TC-TST-003 | `tests/TC-TST-003.yaml` | Test 1 and four visible score rows | 2 min |
| 19 | TC-TST-018 | `tests/TC-TST-018.yaml` | Separate `QA-iOS-P0-Test-Default` fixture; student 1 has 12, student 2 blank, student 3 excluded, student 4 visible | 1.5 min |
| 20 | TC-RPT-001 | `reports/TC-RPT-001.yaml` | Shared class with a completed session and enrolled students | 1.5 min |
| 21 | TC-RPT-008 | `reports/TC-RPT-008.yaml` | Draft report for student 1; network available; placeholder report note | 1.5 min |
| 22 | TC-OFF-001 | `offline/TC-OFF-001.yaml` | Shared session with student 1; network on | 1 min |
| 23 | TC-OFF-003 | `offline/TC-OFF-003.yaml` | Shared session with student 1; offline toggle is controlled by QA | 1.5 min |
| 24 | TC-OFF-004 | `offline/TC-OFF-004.yaml` | Controlled rejected write followed by accepted retry | 1.5 min |
| 25 | TC-PRM-001 | `permissions/TC-PRM-001.yaml` | Signed-in workspace creator/Admin; at least one class | 1.5 min |
| 26 | TC-AUTH-019 | `auth/TC-AUTH-019.yaml` | Active teacher session; terminal sign-out after all teacher flows | 0.5 min |
| 27 | TC-AUTH-007 | `auth/TC-AUTH-007.yaml` | Student 1 linked to the fake PH number; register one parent only if the backend lane is released | 2 min; last group |
| 28 | TC-GRD-001 | `guardian/TC-GRD-001.yaml` | Same linked PH account; teacher-created attendance/score/comment data | 2 min; terminal parent check |

Estimated teacher path: about 33 minutes of listed flow actions, plus 4 minutes for fixtures and 2 minutes of transition buffer (39 total). Parent flows are the final group, use only the reserved four minutes, and remain blocked if the other lane is still registering parents. `*` TC-CLS-017 is marked P1 in `classes-schedule.md`; it is included because QA lead explicitly requested the Sunday regression check.

| 29 | TC-RPT-023 | `reports/TC-RPT-023.yaml` | Published report + linked PH + concurrent second client | 2 min; last, only if available |

## Definitely blocked or manual for this window

| TC-ID | Flow | Reason |
|---|---|---|
| TC-AUTH-001 | `auth/TC-AUTH-001.yaml` | Fake registration phone and registration IDs are not ready. |
| TC-AUTH-003 | `auth/TC-AUTH-003.yaml` | The one-submit-per-account limit is reserved for valid login preflight. |
| TC-AUTH-007 | `auth/TC-AUTH-007.yaml` | Student 1 linked to fake PH number; 2 min | Blocked now while the backend registration lane is occupied; run as the first parent case only after release. |
| TC-GRD-001 | `guardian/TC-GRD-001.yaml` | Linked PH account; 2 min | Blocked now without the PH account; terminal parent check if AUTH-007 succeeds. |
| TC-AUTH-008 | `auth/TC-AUTH-008.yaml` | Separate unlinked fake PH number; 1 min | Registration lane occupied; no secure runtime variable/fixture is prepared for the unlinked number. |
| TC-AUTH-009 | `auth/TC-AUTH-009.yaml` | Student 5 and registered PH account; 2 min | Depends on unavailable PH account and student 5 fixture. |
| TC-GRD-002 | `guardian/TC-GRD-002.yaml` | PH account linked to students 2 and 6; 1 min | Student 6 and linked PH account are not in the base fixture. |
| TC-GRD-005 | `guardian/TC-GRD-005.yaml` | PH account linked to QA-iOS student; 1 min | Parent registration/backend lane is currently in use. |
| TC-GRD-006 | `guardian/TC-GRD-006.yaml` | PH account and published report; 1 min | Parent registration/backend lane is currently in use. |
| TC-GRD-007 | `guardian/TC-GRD-007.yaml` | PH account and homework fixture; 1 min | Parent registration/backend lane is currently in use. |
| TC-GRD-008 | `guardian/TC-GRD-008.yaml` | PH account and score fixture; 1 min | Parent registration/backend lane is currently in use. |
| TC-GRD-009 | `guardian/TC-GRD-009.yaml` | PH account with two linked children; 1 min | Two-child PH fixture is not prepared; parent registration lane is busy. |
| TC-GRD-010 | `guardian/TC-GRD-010.yaml` | PH account and a second workspace's student; 1 min | Requires a second workspace fixture, not available in this iOS lane. |
| TC-PRM-003 | No flow assigned | PH account; 0.5 min | Parent registration/backend lane is currently in use. |
| TC-HW-013 | `homework/TC-HW-013.yaml` | Linked PH account and published homework result; 1 min | Parent registration/backend lane is currently in use. |
| TC-RPT-009/010 | `reports/TC-RPT-009.yaml`, `reports/TC-RPT-010.yaml` | Both require a linked PH account and each flow logs out the teacher. PH account setup is blocked by the occupied registration lane; running one would also end the teacher session needed by the other. Defer to a separate authorized run. |
| TC-PRM-004/005/006/007 | Manual/HTTP, no iOS Maestro flow | Needs a separate HTTP or second-workspace harness. |
| TC-OFF-005 | Manual | Cutting connectivity at the exact sync boundary is not reliably controllable by the iOS Maestro flow. |
| TC-ATT-010 | `classes/session-numbering.yaml` | `status.tsv` maps this case to a flow that does not assert the three attendance tabs; needs a dedicated flow before it can be counted. |
| TC-CLS-015 | Web-only; no iOS flow | Not applicable to this iOS lane. |
| TC-CMT-014 | No flow assigned | Revised five-criteria UI is still pending implementation. |
| TC-RPT-019/020 | No flow assigned | Report deletion UI is still pending implementation per `status.tsv`. |

Remaining P0 cases not listed in the 45-minute smoke subset are deferred to a separately authorized run; they are not counted as passed. If a prerequisite fixture is missing, mark that test blocked with the specific missing fixture, then continue to the next independent case.
