# Web guardian UI implementation report

## Scope

Implemented the parent registration option in the shared registration form, the guardian pages and navigation, linked-child context, settings subtitle, and print-only report layout. The parent registration flow treats a successful `register-guardian` response with `memberships: []` as success and navigates to `/ph`; the existing no-child screen remains available for accounts with no linked children.

Applied the latest 2026-10-23 decision, item 2: there is no unmatched-phone rejection mapping or unmatched-phone error copy. The note below the guardian password fields matches the current `design/guardian/strings.md`: “Con sẽ tự hiện ở đây khi hồ sơ học sinh có đúng số điện thoại này. Chưa khớp hồ sơ nào thì bạn vẫn dùng được tài khoản.” The existing `phone_registered` message remains distinct. No invitation flow strings, routes, or comments were added to the guardian/auth implementation.

## Screenshots

Captured using the development-only guardian harness with the app’s real page components and fixture data, at 390×844 (phone) and 1360×934 (desktop).

| Screen | Phone | Desktop |
|---|---|---|
| Teacher registration | [register-teacher-phone.png](shots/gb/register-teacher-phone.png) | [register-teacher-desktop.png](shots/gb/register-teacher-desktop.png) |
| Guardian registration | [register-guardian-phone.png](shots/gb/register-guardian-phone.png) | [register-guardian-desktop.png](shots/gb/register-guardian-desktop.png) |
| No linked child | [no-child-phone.png](shots/gb/no-child-phone.png) | [no-child-desktop.png](shots/gb/no-child-desktop.png) |
| Settings with child | [settings-with-child-phone.png](shots/gb/settings-with-child-phone.png) | [settings-with-child-desktop.png](shots/gb/settings-with-child-desktop.png) |
| Settings without child | [settings-no-child-phone.png](shots/gb/settings-no-child-phone.png) | [settings-no-child-desktop.png](shots/gb/settings-no-child-desktop.png) |
| Overview / child switch | [overview-phone.png](shots/gb/overview-phone.png), [child-switch-phone.png](shots/gb/child-switch-phone.png) | [overview-desktop.png](shots/gb/overview-desktop.png), [child-switch-desktop.png](shots/gb/child-switch-desktop.png) |
| Attendance | [attendance-phone.png](shots/gb/attendance-phone.png) | [attendance-desktop.png](shots/gb/attendance-desktop.png) |
| Scores | [scores-phone.png](shots/gb/scores-phone.png) | [scores-desktop.png](shots/gb/scores-desktop.png) |
| Comments / ticket | [comments-phone.png](shots/gb/comments-phone.png), [ticket-phone.png](shots/gb/ticket-phone.png) | [comments-desktop.png](shots/gb/comments-desktop.png), [ticket-desktop.png](shots/gb/ticket-desktop.png) |
| Homework / detail | [homework-phone.png](shots/gb/homework-phone.png), [homework-detail-phone.png](shots/gb/homework-detail-phone.png) | [homework-desktop.png](shots/gb/homework-desktop.png), [homework-detail-desktop.png](shots/gb/homework-detail-desktop.png) |
| Monthly report | [report-phone.png](shots/gb/report-phone.png) | [report-desktop.png](shots/gb/report-desktop.png) |

## Difference notes

| Area | Implementation difference / note |
|---|---|
| Registration | Shared teacher/guardian form; guardian mode removes workspace name and calls the parent registration API. Success with zero memberships enters the no-child screen. |
| No-child state | Retained for a parent whose linked student list is empty, including after a teacher changes/removes the phone on a student profile. |
| Settings | Child names and class labels are read through `listMyChildren()` and the guardian membership, not by scanning all students for a matching phone. |
| Guardian screens | Copied prototype layouts and 5-tab navigation are active. Ticket and homework detail routes are nested under the related tabs. |
| Monthly report | Uses `window.print()`; print CSS hides app navigation and the PDF button so the report content is what prints. |
| Teacher name | The current W-1 membership snapshot has no class staff field; `childTeacherName()` currently returns `null`. Reconnect this label when the API snapshot includes teacher names. |
| Fixture coverage | Screenshot sessions use read permissions and seeded attendance, comments, and scores; the overview cards and child switching are visible in the fixture captures. |

## Verification

- `npm run typecheck` — passed.
- `npm test` — 23 test files passed, 1 skipped; 208 tests passed, 1 skipped (209 total).
- `npm run build` — passed, including the bundle-size check. JS gzip: 145,841 bytes initial; 158,230 bytes through the first staff route; 165,414 bytes through the first guardian route.
- `npx vitest run src/features/auth/registerGuardianErrors.test.ts` — passed (3 tests).
- The guardian render/routing tests now construct API-style `WebSession` memberships with `students` from `src/test/fixtures/seed.ts`; archived-score, child-isolation, ungraded-homework, and published-ticket assertions use that fixture's actual records.
- The registration regression test covers the new single-membership response; registration no longer rerenders into role selection before navigating to the created workspace.
- `srcwalk discover 'mời,invite,invitation,phone_not_linked,Số điện thoại này chưa được giáo viên khai' --match any --as text --scope src` — no invitation or rejected-phone UI copy remains; the temporary unmatched-code test literal was removed after the scan.
- Opened the phone and desktop harness pages in headless Chrome and saved the linked screenshots above. The no-child fixture shows the retained no-child state.

The parent API is not deployed in this worktree, so the `201` response containing `memberships: []` is verified through the UI response path and fixture harness, not against a live backend.
