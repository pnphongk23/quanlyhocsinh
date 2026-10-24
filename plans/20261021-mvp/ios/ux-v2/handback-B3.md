# Handback B3

- **Status:** DONE_WITH_CONCERNS · commit `70beecb` (`feat(ios): refresh guardian and account screens`).
- **Implemented:** Guardian has two bottom tabs, child picker chip, account settings entry, childless state, embedded scores/report/attendance, session detail and comments; shared empty state, Vietnamese score formatting, and fetched-data timestamp. Auth settings support linked and unlinked guardian accounts; login, teacher registration, guardian registration, and password change use `AppSaveButton`. Guardian registration calls `POST /auth/register-guardian` with phone/password/display name and no email field.
- **Tests added/updated:** guardian registration validation/request/response (including empty memberships), score format, password-change call. `git diff --check` and Guardian catalog JSON validation passed.
- **Build/test:** Staging build in `/tmp/qlh-B3-src` failed in another lane's `Features/Scores/TestsTabView.swift:469` (`savedNotice` unresolved). Compiler emitted no B3 diagnostics. Full test run skipped; final suite remains pending.
- **Concerns/deviation:** Current guardian data model exposes class name but no class schedule or teacher name, so those overview fields could not be added without an interface/data change. No after screenshots were captured.
- **Next:** B2 resolves the compile error; rerun the single final Staging build+test. Lead should decide how class schedule/teacher metadata reaches the guardian read model and capture changed-screen screenshots.
