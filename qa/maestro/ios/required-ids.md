# iOS selector audit

The following existing identifiers were confirmed against source and successful runtime flows:

- `login.phone`
- `login.password`
- `login.submit`
- `class.name`
- `saveStatus.error`

Source/runtime comparison against HEAD `268cbd5` on 2026-10-25: the live login hierarchy confirmed `login.phone`, `login.password`, and `login.submit`. The app source uses `guardian.register.submit` for parent signup and exposes no stable ID for the root `Cài đặt` tab or `Đăng xuất`; relevant flows now use the visible labels. The parent signup entry is also text-only (`Tạo tài khoản phụ huynh`).

For previously executed flows, other controls used visible text when the source did not assign stable IDs. Additional IDs needed by unrun flows are listed below as requests, not verified app identifiers.


## IDs requested for remaining drafts (not runtime-verified)

These are requests for stable identifiers, not claims that the app already exposes them. Existing flows may use visible text where Maestro can resolve it.

- Session actions: `session.cancel`, `session.cancel.confirm`, `session.cancelled`, `session.number`, `session.status`.
- Attendance: `attendance.status.present`, `attendance.status.late`, `attendance.status.excused`, `attendance.status.absent`, `attendance.save`, `attendance.warning`.
- Comment form/send: `comment.criterion.*` (5 ô tiêu chí), `comment.sentence` (ô nhận xét gộp; `comment.note` bỏ — ID thật chờ iOS lead brief 94), `comment.save`, `comment.sendClass`, `comment.sendClass.disabledReason`, `comment.saveStatus`.
- Homework: `homework.assign.save`, `homework.grade.save`, `homework.grade.bulk`, `homework.sendStatus`.
- Reports: `report.comment`, `report.comment.save`, `report.preview`, `report.releaseStudent`, `report.releaseClass`, `report.downloadPDF`.
- Student/test management: `student.name`, `student.parentPhone`, `student.save`, `student.leave`, `test.name`, `test.date`, `test.edit`, `test.edit.name`, `test.edit.date`, `test.edit.date.nextDay`, `test.score`, `test.save`.
- Offline gates: `network.requiredMessage`, `saveStatus.localPending`, `saveStatus.synced`, `saveStatus.retry`.
- Auth registration submit buttons: `register.submit` for teacher registration and `guardian.register.submit` for parent registration (source-confirmed).
- Login/register entry: `login.registerTeacher` is source-confirmed; parent entry is visible text `Tạo tài khoản phụ huynh` (no identifier in HEAD).
- Class-card targets: `class.card.<classId>` and `class.schedule.<classId>` (requested; cards expose separate visible text but no stable IDs).
- Session rows and time picker: visible session labels use weekday/date text such as `T3 · 21/10` or `CN · 25/10`; `session.row.<sessionId>` and `class.time` are requested, unverified IDs. Flows must not use visible text `Buổi N` as a session selector.
- Future-session attendance read-only state: `attendance.readOnlyNotice` (requested; app renders a localized text notice without an identifier).

- Upcoming-session disclosure: `session.upcoming.toggle` (the visible count button such as “15 buổi” is not discoverable by Maestro text selector on iPhone 16).


## P0 flow selector requests for GL (not yet runtime-verified)

- Navigation: HEAD has no stable identifier for teacher root tabs or the logout button; use visible tab/button text (`Lớp`, `Cài đặt`, `Đăng xuất`). `settings.changePassword`, `settings.workspaceRole`, and `settings.role.admin` remain unverified requests.
- Class setup/detail: source-confirmed fields are `class.name`, `class.time`, and dynamic `class.schedule.<classId>`/`class.card.<classId>`. The create/day/save controls have no IDs in HEAD; use visible text `Tạo lớp mới`, weekday labels (`T2`, `T5`, `CN`), and the create/save button label. Detail-tab IDs remain unverified requests.
- Session detail: `session.tab.attendance`, `session.tab.comments`, `session.tab.homework`; use the observed weekday/date text for visible rows until a stable `session.row.*` identifier is confirmed. The disclosure uses requested ID `session.upcoming.toggle`.
- Student roster: `student.add`, `student.save`, `student.row.<fixture-name>`, `student.editParentPhone`, `student.markLeft`, `student.markLeft.confirm`, `student.status.left`, `student.leaveDate`, `student.enrollmentDate`; retain existing `student.name` and `student.parentPhone`.
- Attendance: `attendance.row.<fixture-name>.<status>`, `attendance.saved`, `attendance.history.<fixture-name>`, `attendance.warning.<fixture-name>`, plus existing save/error/retry IDs.
- Comments: `comment.row.<fixture-name>`, `comment.row.<fixture-name>.unrated`, `comment.template.<rating>`, `comment.template.editable`, `comment.status.sent`, `comment.sendClass.confirm`, `comment.sendClass.confirmation.ungradedCount`, `comment.saveStatus.synced`.
- Homework: `homework.tab.today`, `homework.tab.previous`, `homework.tab.previous.selected`, `homework.addPart`, `homework.part.type`, `homework.type.vocabulary`, `homework.part.title`, `homework.part.save`, `homework.part.<fixture-name>`, `homework.part.delete.disabled`, `homework.grade.<fixture-name>.<outcome>`, `homework.grade.save`, `homework.ungradedCount`.
- Tests/scores: `test.create`, `test.row.<fixture-name>`, `test.score.<fixture-name>`, `test.score.<fixture-name>.saved<value>`, `test.score.<fixture-name>.empty`, `test.score.noValue`, `test.score.error.step`, `test.score.error.range`, `test.score.save`, `test.assignDefault`, `test.assignDefault.confirm`, `test.assignDefault.cancel`, `test.delete`, `test.delete.confirm`, `test.delete.confirm.hardDelete`, `test.delete.confirm.archive`, `test.archive.noRestore`.
- Reports: `report.create`, `report.session.start`, `report.session.end`, `report.session.start.value1`, `report.session.end.latestCompleted`, `report.title.sessionRange`, `report.draft.<fixture-name>`, `report.preview.sheet`, `report.preview.<section>`, `report.status.published`, `report.status.allPublished`, `report.snapshot.version1`.
- Guardian: `guardian.dashboard`, `guardian.noChildren`, `guardian.child.card`, source identifier `guardian.childSwitcher`, `guardian.child.<fixture-name>`, `guardian.child.selected.<fixture-name>`, `guardian.tab.<section>`, `guardian.report.list.published`, `guardian.report.list.draft`, `guardian.report.snapshot`, `guardian.homework.<fixture-name>`, `guardian.score.<fixture-name>`, `guardian.score.<fixture-name>.value<value>`, `guardian.score.trend.<fixture-name>`, `guardian.score.noTrend.zeroPrevious`, `guardian.score.noValue`, `guardian.score.noClassAverage`, `guardian.score.noMax`, `guardian.comment.<fixture-name>`.
- Auth: Parent registration entry uses visible text `Tạo tài khoản phụ huynh`; form identifiers include `guardian.register.phone`, `guardian.register.password`, `guardian.register.confirm`, `guardian.register.submit`, and `guardian.emptyState`.
- Offline saves: `saveStatus.loading`, `saveStatus.localPending`, `saveStatus.synced`, `saveStatus.pendingCount`, `saveStatus.retry`, `network.requiredMessage`.

### Additional P0 flow selectors (all proposed, not runtime-verified)

- Auth forms/error: `login.error`, `register.name`, `register.workspace`, `guardian.register.phone`, `guardian.register.password`, `guardian.register.confirm`, `guardian.register.submit`, `guardian.noChildren`.
- Shared role and navigation state: `settings.workspaceRole`, `settings.role.admin`, `guardian.dashboard`, `guardian.child.card`, `guardian.child.<fixture-name>`, `guardian.child.selected.<fixture-name>`, `guardian.tab.<section>`, `guardian.noChildren`.
- Roster-specific attendance rows use `attendance.row.<fixture-name>.<status>`; saved state is `attendance.saved`; read-only warning is `attendance.warning.<fixture-name>`; prior values use `attendance.history.<fixture-name>`.
- Comment rows and content: `comment.row.<fixture-name>`, `comment.template.<rating>`, `comment.template.editable`, `comment.status.sent`, `comment.sendClass.confirmation.ungradedCount`, `comment.saveStatus.synced`; guardian read-only content uses `guardian.comment.<fixture-name>.<field>`.
- Homework state: `homework.grade.<fixture-name>.<outcome>`, `homework.part.delete.disabled`, `homework.tab.previous.selected`, `homework.tab.today.selected`, `homework.saveStatus.synced`, `homework.ungradedCount`; guardian assignment and result IDs use `guardian.homework.<fixture-name>.<field>`.
- Test and score state: `test.score.<fixture-name>.<state>`, `test.score.error.step`, `test.score.error.range`, `test.score.noValue`, `test.assignDefault`, `test.assignDefault.confirm`, `test.assignDefault.cancel`, `test.classAverage`, `test.average`, `test.weight`, `test.absentOption`, `test.delete.confirm.hardDelete`, `test.delete.confirm.archive`, `test.archive.noRestore`.
- Report state: `report.session.start.value1`, `report.session.end.latestCompleted`, `report.title.sessionRange`, `report.preview.<section>`, `report.release.confirm`, `report.status.allPublished`, `report.snapshot.version1`, `report.test.<fixture-name>`, `report.classAverage`, `report.monthPicker`; guardian report and overview IDs use `guardian.report.<fixture-name>.<field>` and `guardian.overview.<field>`.
- Account switching and read-only checks: `settings.changePassword`, `guardian.edit.<field>`, `guardian.data.<fixture-name>`, `guardian.session.otherClass`, `guardian.comment.otherStudent`.

- TC-CMT-017 long-text case (no character limit, no counter): `comment.sentence`, `comment.save`; `comment.tooLong` and `comment.counter` must be absent.
- TC-RPT-023 report deletion: `report.row.<fixture-name>`, `report.delete`, `report.delete.confirm` are proposed and require source/hierarchy confirmation; parent visibility needs a second concurrent client.

## Web slip ids (web df625e3, chưa deploy)
`slip-criterion-0..3` (aria-pressed), `slip-homework-row`, `slip-homework-auto-label`, `slip-star-panel`, `slip-mascot`, `slip-generated-comment` (chỉ đọc), `slip-note`, `slip-save-button` (mobile), `slip-save-status`, `slip-ticket-status`. iOS dùng cùng tên có tiền tố khi lead iOS chốt.
