# iOS review 7b92939..105a2a6

Paths below are relative to `ios/QuanLyLop/`. PASS means static evidence only.

- **FAIL · High — B, homework manual override.** `Core/Models/NotesImportRules.swift:356` drops a homework instruction as `noChange` when homework is already unchecked by grading. No `hw_manual=true` command follows; subsequent grading can check it again. `NotesImportDraft.swift:26,105` likewise discards a manual toggle round trip unless criteria/note changes. Track manual-flag changes independently of bit changes.
- **FAIL · High — B, rejected results after deferred sync.** `Features/Scores/ScoresFeatureStore.swift:454` checks rejections only immediately after synchronization. Offline/network failure still returns success and clears the draft (`Features/Comments/SessionCommentsView.swift:184`). Later rejection only refreshes generic save status (`:101`), never updates the import’s count/failed slips/retry banner. Preserve batch identity and observe eventual outcomes.
- **FAIL · Medium — B, stale sent slips silently disappear.** `Features/Scores/ScoresFeatureStore.swift:438` skips slips that became sent since preview, without reporting their IDs; `:459` reports only written entries. Saving clears the preview despite these omitted changes. Return skipped/conflicted IDs with an actionable result.
- **FAIL · Medium — token-only UI.** New numeric sizes remain: `Features/Comments/CriteriaModeView.swift:68` (132), `NotesImportViews.swift:32` (200), `Features/Classes/StudentImportView.swift:65` (200), `Features/Guardian/GuardianScheduleView.swift:72,85` (64,12).
- **PASS · Low — pre-save isolation/A.** Import chips mutate memory (`CriteriaModeView.swift:125`); ordinary A taps intentionally save immediately (`:147`), as scope A.7 requires. Enrollment filtering: `SessionCommentsView.swift:48`; legacy lock, note preservation, confirmation: `Core/Models/CriteriaModeRules.swift:26,59,72`.
- **PASS · Low — B transaction/batching/sent protection.** One `writeAll` then sync (`ScoresFeatureStore.swift:451`); SQLite transaction `Core/Storage/SQLiteStore.swift:185`, batch limit `:251`; explicit sent opt-in `ScoresFeatureStore.swift:438`.
- **PASS · Low — C/offline.** Sequential REST, stable retry UUIDs: `Features/Classes/StudentImportModel.swift:93,111`; offline button gating `StudentImportView.swift:211,221`; duplicate rules `Core/Models/StudentImportRules.swift:107`.
- **PASS · Low — D/privacy.** Send UI hidden `SessionCommentsView.swift:310`; matrix `Features/Staff/StaffViews.swift:382`; fallback `Core/Models/Entities.swift:424`. No added logging calls found. New import copy uses Core enums.

Verification: inspected git log/diff; parsed golden JSON (14 student/23 notes cases). Round-4 role loading, schedule, picker, launch-icon wiring and homework layout inspected; visual behavior unverified. Tôi không thể xác minh điều này hoạt động vì simulator/xcodebuild were prohibited; XCTest was not executed. Backend authorization was outside this review.

Status: DONE
Verdict: Request changes for B correctness and token compliance before acceptance.
