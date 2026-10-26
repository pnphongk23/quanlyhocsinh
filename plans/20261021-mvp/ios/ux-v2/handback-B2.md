# B2 handback — Comments, Homework, Scores

- B2 implementation committed as `a923dd9`; shared-build compile fix committed separately as `68082b9` (`TestsTabView` now routes deletion feedback through its existing visible error state).
- Aligned Comments, Homework and Scores flows with UX v2 shared components/states; added missing-score dash formatting and coverage.
- Verification: Staging build succeeded on iPhone 16 simulator. `xcodebuild build test` ran 151 tests: 2 failed, 2 skipped. All Comments/Homework/Scores-relevant tests passed, including Vietnamese score formatting and dash for missing score. The two failures are Guardian localization catalog checks: missing `feature.guardian.iem`, `feature.guardian.danh.sach.buoi.hoc`, and `Guardian/guardian.updatedAt`; report to B3 for resolution. Skips were keychain signing and screenshot-only tests.
- `git diff --check` clean. No screenshots captured in this verification run.
