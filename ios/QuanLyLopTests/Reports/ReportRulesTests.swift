import XCTest
@testable import QuanLyLop

final class ReportRulesTests: XCTestCase {
    private func student(enrolledAt: String = "2026-09-01", leftAt: String? = nil) -> Student {
        Student(id: "stu", classId: "c", name: "Nguyễn Minh Anh", parentPhone: nil,
                enrolledAt: enrolledAt, leftAt: leftAt, status: leftAt == nil ? .active : .left, version: 1)
    }

    private func session(_ id: String, _ date: String, _ status: SessionStatus = .held) -> ClassSession {
        ClassSession(id: id, classId: "c", date: date, startTime: "18:00", origin: .recurring,
                     isMakeup: false, status: status, note: nil, version: 1)
    }

    /// s0 #1, s1 #2, s2 #3, s3 cancelled, s4 #4 (planned).
    private var sessions: [ClassSession] {
        SessionNumbering.numbered([
            session("s0", "2026-09-28"), session("s1", "2026-10-05"), session("s2", "2026-10-12"),
            session("s3", "2026-10-19", .cancelled), session("s4", "2026-10-26", .planned)
        ])
    }

    private func attendance(_ session: String, _ status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: session, studentId: "stu", status: status, note: "", lateAt: nil,
                   version: 1, updatedAt: "2026-10-05T11:00:00.000Z")
    }

    private func slip(_ session: String, _ stars: Stars?, sent: Bool) -> SessionSlip {
        SessionSlip(sessionId: session, studentId: "stu", stars: stars, note: "",
                    status: sent ? .sent : .draft, sentAt: sent ? "2026-10-12T11:00:00.000Z" : nil,
                    version: 1, updatedAt: "2026-10-12T11:00:00.000Z")
    }

    private func test(_ id: String, _ name: String, _ date: String) -> TestDefinition {
        TestDefinition(id: id, classId: "c", name: name, date: date)
    }

    private func score(_ test: String, _ value: Double?) -> Score {
        Score(testId: test, studentId: "stu", value: value, version: 1, updatedAt: "2026-10-07")
    }

    private func batch(from: String? = "s1", to: String? = "s2",
                       fromKey: String = "2026-10-05 18:00", toKey: String = "2026-10-12 18:00") -> ReportBatch {
        ReportBatch(id: "b", classId: "c", fromSessionId: from, toSessionId: to, fromKey: fromKey, toKey: toKey, version: 1)
    }

    private func build(student: Student? = nil, range: ResolvedReportRange? = nil, tests: [TestDefinition]? = nil,
                       scores: [Score]? = nil, comment: String = "") -> StudentReportContent? {
        ReportRules.build(
            student: student ?? self.student(), range: range ?? ReportRangeRules.resolve(batch(), sessions: sessions),
            batchID: "b", sessions: sessions,
            attendance: [attendance("s1", .present), attendance("s2", .late), attendance("s0", .absent)],
            tests: tests ?? [test("t1", "Từ vựng", "2026-10-07"), test("t2", "Nghe", "2026-10-14")],
            scores: scores ?? [score("t1", 12)],
            slips: [slip("s1", .three, sent: true), slip("s2", .two, sent: true), slip("s0", .one, sent: true),
                    slip("s4", .three, sent: false)],
            sections: [
                HomeworkSection(id: "v", classId: "c", sessionId: "s1", kind: .vocabulary, title: "U6", description: "", version: 1),
                HomeworkSection(id: "e", classId: "c", sessionId: "s2", kind: .exercise, title: "WB", description: "", version: 1)
            ],
            grades: [
                HomeworkGrade(sectionId: "v", studentId: "stu", level: .excellent, version: 1, updatedAt: "2026-10-12"),
                HomeworkGrade(sectionId: "e", studentId: "stu", level: .done, version: 1, updatedAt: "2026-10-12")
            ],
            generalComment: comment)
    }

    // MARK: Default range and choices

    func testDefaultRangeRunsFromFirstSessionToLatestHeldSession() throws {
        let range = try XCTUnwrap(ReportRangeRules.defaultRange(sessions, classID: "c"))
        XCTAssertEqual(range.from.id, "s0")
        XCTAssertEqual(range.to.id, "s2")
    }

    func testDefaultRangeIsNilBeforeAnySessionIsHeld() {
        let planned = SessionNumbering.numbered([session("p1", "2026-10-05", .planned), session("p2", "2026-10-12", .planned)])
        XCTAssertNil(ReportRangeRules.defaultRange(planned, classID: "c"))
        XCTAssertNil(ReportRangeRules.defaultRange([], classID: "c"))
    }

    func testCancelledSessionsAreNotChoicesAndDoNotTakeANumber() {
        let choices = ReportRangeRules.choices(sessions, classID: "c")
        XCTAssertEqual(choices.map(\.id), ["s0", "s1", "s2", "s4"])
        XCTAssertEqual(choices.map(\.number), [1, 2, 3, 4])
        XCTAssertEqual(choices.last?.label, "Buổi 4 · 26/10")
    }

    func testRangeProblems() {
        XCTAssertNil(ReportRangeRules.problem(sessions, classID: "c", from: "s0", to: "s0"))
        XCTAssertEqual(ReportRangeRules.problem(sessions, classID: "c", from: "s2", to: "s1"), .order)
        XCTAssertEqual(ReportRangeRules.problem(sessions, classID: "c", from: "s0", to: "s3"), .cancelled)
        XCTAssertEqual(ReportRangeRules.problem(sessions, classID: "c", from: "s0", to: "nope"), .notInClass)
        XCTAssertEqual(ReportRangeRules.problem(sessions, classID: "other", from: "s0", to: "s1"), .notInClass)
    }

    // MARK: Range naming

    func testRangeNameWithSessionNumbers() {
        let labels = ReportRangeRules.labels(fromKey: "2026-10-01 18:00", toKey: "2026-10-24 18:00", fromNumber: 1, toNumber: 8)
        XCTAssertEqual(labels.label, "Buổi 1–8 · 01/10–24/10")
        XCTAssertEqual(labels.sessionsLabel, "Buổi 1–8")
        XCTAssertEqual(labels.datesLabel, "01/10–24/10")
        XCTAssertEqual(ReportRangeRules.labels(fromKey: "2026-10-14 18:00", toKey: "2026-10-14 18:00", fromNumber: 8, toNumber: 8).label,
                       "Buổi 8 · 14/10")
    }

    func testRangeNameIsDatesOnlyWithoutNumbers() {
        XCTAssertEqual(ReportRangeRules.labels(fromKey: "2026-10-01 00:00", toKey: "2026-10-31 23:59", fromNumber: nil, toNumber: nil).label,
                       "01/10–31/10")
        // A batch migrated from a month has no session ids, so no numbers either.
        let migrated = batch(from: nil, to: nil, fromKey: "2026-10-01 00:00", toKey: "2026-10-31 23:59")
        XCTAssertEqual(ReportRangeRules.resolve(migrated, sessions: sessions).label, "01/10–31/10")
    }

    func testResolvedRangeUsesCurrentNumbersAndDropsThemWhenAnEdgeIsCancelled() {
        XCTAssertEqual(ReportRangeRules.resolve(batch(), sessions: sessions).label, "Buổi 2–3 · 05/10–12/10")
        XCTAssertEqual(ReportRangeRules.resolve(batch(to: "s3"), sessions: sessions).label, "05/10–12/10")
    }

    func testSnapshotLabelPrefersTheServerText() {
        XCTAssertEqual(ReportRangeRules.label(of: ReportRange(fromKey: "a", toKey: "b", label: "Buổi 1–8 · 01/10–24/10")),
                       "Buổi 1–8 · 01/10–24/10")
        XCTAssertEqual(ReportRangeRules.label(of: ReportRange(fromKey: "2026-10-01 18:00", toKey: "2026-10-02 18:00",
                                                               fromNumber: 1, toNumber: 2)),
                       "Buổi 1–2 · 01/10–02/10")
    }

    func testBatchesAreListedNewestFirst() {
        let old = ReportBatch(id: "a", classId: "c", fromSessionId: nil, toSessionId: nil, fromKey: "2026-09-01 18:00", toKey: "2026-09-30 18:00", version: 1)
        let new = ReportBatch(id: "b", classId: "c", fromSessionId: nil, toSessionId: nil, fromKey: "2026-10-01 18:00", toKey: "2026-10-24 18:00", version: 1)
        let wider = ReportBatch(id: "c", classId: "c", fromSessionId: nil, toSessionId: nil, fromKey: "2026-09-01 18:00", toKey: "2026-10-24 18:00", version: 1)
        XCTAssertEqual(ReportRangeRules.sorted([old, wider, new]).map(\.id), ["b", "c", "a"])
    }

    // MARK: Content of a range

    func testBuildsOnlyTheSessionsOfTheRangeAndSkipsCancelledOnes() throws {
        let range = ReportRangeRules.resolve(batch(to: "s4", toKey: "2026-10-26 18:00"), sessions: sessions)
        let report = try XCTUnwrap(build(range: range))
        // s1, s2 and s4 are in the range; s3 is cancelled and s0 is before it.
        XCTAssertEqual(report.snapshot.attendance.heldSessions, 3)
        XCTAssertEqual(report.snapshot.attendance.present, 1)
        XCTAssertEqual(report.snapshot.attendance.late, 1)
        XCTAssertEqual(report.missing.first, "Thiếu điểm danh")
    }

    func testBuildsTheRangeFromLocalData() throws {
        let report = try XCTUnwrap(build())
        XCTAssertEqual(report.snapshot.attendance.heldSessions, 2)
        XCTAssertEqual(report.attendanceCount, 2)
        XCTAssertEqual(report.snapshot.tests.map(\.name), ["Từ vựng"])
        XCTAssertEqual(report.gradedTestCount, 1)
        // s0's slip is before the range and s4's is not sent.
        XCTAssertEqual(report.snapshot.stars, StarsSummary(three: 1, two: 1, one: 0))
        XCTAssertEqual(report.ticketCount, 2)
        XCTAssertEqual(report.snapshot.homework, [HomeworkSummary(kind: .vocabulary, excellent: 1, done: 0, notDone: 0)])
        XCTAssertEqual(report.missing, ["Thiếu nhận xét chung"])
        XCTAssertEqual(report.snapshot.range?.label, "Buổi 2–3 · 05/10–12/10")
        XCTAssertEqual(report.snapshot.batchId, "b")
        XCTAssertEqual(report.suggestion,
                       "Gợi ý theo số buổi 3/2/1 sao của đợt: Trong đợt này con có 1 buổi 3 sao, 1 buổi 2 sao, 0 buổi 1 sao.")
    }

    func testReadyNeedsEveryScoreAndTheGeneralComment() throws {
        let ready = try XCTUnwrap(build(comment: "Con tiến bộ đều."))
        XCTAssertTrue(ready.ready)
        let missingScore = try XCTUnwrap(build(scores: [], comment: "Con tiến bộ đều."))
        XCTAssertEqual(missingScore.missing, ["Thiếu điểm Từ vựng"])
    }

    func testStudentOutsideTheRangeIsSkipped() {
        XCTAssertNil(build(student: student(leftAt: "2026-10-01")))
        XCTAssertNil(build(student: student(enrolledAt: "2026-10-20")))
    }

    // MARK: Makeup tests

    func testTestBeforeEnrolmentCountsOnlyWhenTheStudentAlreadyHasAScore() throws {
        let late = student(enrolledAt: "2026-10-10")
        let early = test("t1", "Từ vựng", "2026-10-07")
        XCTAssertFalse(ReportRangeRules.testCounts(early, student: late, scores: []))
        XCTAssertFalse(ReportRangeRules.testCounts(early, student: late, scores: [score("t1", nil)]))
        XCTAssertTrue(ReportRangeRules.testCounts(early, student: late, scores: [score("t1", 9)]))

        let withoutScore = try XCTUnwrap(build(student: late, tests: [early], scores: [], comment: "ok"))
        XCTAssertTrue(withoutScore.snapshot.tests.isEmpty)
        let withScore = try XCTUnwrap(build(student: late, tests: [early], scores: [score("t1", 9)], comment: "ok"))
        XCTAssertEqual(withScore.snapshot.tests.map(\.value), [9])
    }

    func testTestAfterTheStudentLeftNeverCounts() {
        let gone = student(leftAt: "2026-10-09")
        let after = test("t2", "Nghe", "2026-10-10")
        XCTAssertFalse(ReportRangeRules.testCounts(after, student: gone, scores: [score("t2", 8)]))
    }

    // MARK: Slot status

    private func content(ready: Bool) -> StudentReportContent {
        let snapshot = ReportSnapshot(
            studentId: "stu", attendance: AttendanceSummary(present: 2, late: 0, excused: 0, absent: 0, heldSessions: 2),
            tests: [], stars: StarsSummary(three: 1, two: 1, one: 0), homework: [], generalComment: "Nhận xét", ready: ready)
        return StudentReportContent(student: student(), snapshot: snapshot, ticketCount: 2,
                                    missing: ready ? [] : ["Thiếu nhận xét chung"], suggestion: nil)
    }

    private func record(status: ReportStatus, republish: Bool = false, count: Int = 0) -> StudentReport {
        StudentReport(id: "r", classId: "c", studentId: "stu", batchId: "b", status: status, generalComment: "Nhận xét",
                      needsRepublish: republish, publicationCount: count,
                      publishedAt: status == .published ? "2026-10-12T09:00:00.000Z" : nil, version: 1)
    }

    func testSlotStatusMissingRepublishPublishedDraftReady() {
        let ready = content(ready: true)
        let missing = ReportRules.slot(content(ready: false), record: record(status: .published))
        XCTAssertEqual(missing.status, .missing)
        XCTAssertEqual(missing.detail, "Thiếu nhận xét chung")
        XCTAssertFalse(missing.publishable)

        XCTAssertEqual(ReportRules.slot(ready, record: nil).status, .ready)
        XCTAssertEqual(ReportRules.slot(ready, record: record(status: .draft)).status, .draft)
        XCTAssertEqual(ReportRules.slot(ready, record: record(status: .draft)).label, "Nháp")

        let published = ReportRules.slot(ready, record: record(status: .published, count: 1))
        XCTAssertEqual(published.status, .published)
        XCTAssertEqual(published.label, "Đã phát hành · 12/10")
        XCTAssertFalse(published.publishable)

        let republish = ReportRules.slot(ready, record: record(status: .published, republish: true, count: 2))
        XCTAssertEqual(republish.status, .republish)
        XCTAssertEqual(republish.label, "Cần phát hành lại")
        XCTAssertEqual(republish.tone, .primary)
        XCTAssertTrue(republish.publishable)
    }

    func testBatchCountsAndSummary() {
        let counts = ReportRangeRules.counts([
            record(status: .draft), record(status: .published, count: 1),
            record(status: .published, republish: true, count: 2), record(status: .published, count: 1)
        ])
        XCTAssertEqual(counts, ReportBatchCounts(total: 4, draft: 1, published: 2, needsRepublish: 1))

        let slots = [
            ReportSlot(status: .ready, label: "Sẵn sàng", tone: .success, detail: "", publishable: true),
            ReportSlot(status: .missing, label: "Thiếu dữ liệu", tone: .warning, detail: "", publishable: false),
            ReportSlot(status: .published, label: "Đã phát hành", tone: .success, detail: "", publishable: false)
        ]
        let summary = ReportRules.summary(slots)
        XCTAssertEqual(summary.total, 3)
        XCTAssertEqual(summary.ready, 2)
        XCTAssertEqual(summary.missing, 1)
        XCTAssertEqual(summary.published, 1)
        XCTAssertEqual(summary.publishable, 1)
        XCTAssertEqual(ReportRules.publishAllLabel(2), "Phát hành 2 báo cáo")
        XCTAssertEqual(ReportRules.publishAllLabel(0), "Phát hành báo cáo")
    }

    func testDraftIsDroppedOnlyWhileItStillEqualsTheSavedComment() {
        // Typed A, tapped save, then typed on to AB while the PUT of A was in flight.
        XCTAssertEqual(ReportRules.draftAfterSave(draft: "AB", saved: "A"), "AB")
        XCTAssertNil(ReportRules.draftAfterSave(draft: "A", saved: "A"))
        XCTAssertNil(ReportRules.draftAfterSave(draft: nil, saved: "A"))
    }

    func testEmptyBatchShowsLoadingOrFailureBeforeEmpty() {
        XCTAssertEqual(ReportRules.emptyDetail(loading: true, loadError: nil), .loading)
        XCTAssertEqual(ReportRules.emptyDetail(loading: true, loadError: "x"), .loading)
        XCTAssertEqual(ReportRules.emptyDetail(loading: false, loadError: "lỗi"), .failed("lỗi"))
        XCTAssertEqual(ReportRules.emptyDetail(loading: false, loadError: nil), .empty)
    }
}
