# iOS confirmation: 6d279e5 + 1687da0

PASS means static review only. `git log -3` confirmed 1687da0 as newest.

1. **PASS — Homework double tap.** NotesImportDraft.swift:24,28,83,107 retains `hwTouched`, emits `hwManual=true`, and forces criteria persistence after a round trip. Regression test added.
2. **PASS — Waiting for sync.** ScoresFeatureStore.swift:460–465 counts non-rejected queued writes; SessionCommentsView.swift:194 forwards the count to NotesImportViews.swift:79. Later rejection still uses the generic save-error pill; batch-specific eventual reconciliation remains absent.
3. **PASS — Sent since preview.** ScoresFeatureStore.swift:444,456,465 returns `skippedSent`, including all-skipped batches; the result banner displays it.
4. **PASS — Tokens.** All five previously reported size usages now reference AppMetrics. Values 200/132/64/12 match tokens.css:169–172; remaining `12` occurrences are calendar arithmetic.

Verification: inspected both diffs, current source, and added tests. Tôi không thể xác minh điều này hoạt động vì simulator/xcodebuild were prohibited; tests were not executed.

Status: REVIEWED
Verdict: PASS for the four requested static checks.
