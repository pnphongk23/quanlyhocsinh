import XCTest
@testable import QuanLyLop

final class ReportRulesTests: XCTestCase {
    private func student(leftAt: String? = nil) -> Student {
        Student(id: "stu", classId: "c", name: "Nguyễn Minh Anh", parentPhone: nil,
                enrolledAt: "2026-09-01", leftAt: leftAt, status: leftAt == nil ? .active : .left,
                version: 1)
    }

    private func session(_ id: String, _ date: String, status: SessionStatus = .held,
                         number: Int) -> ClassSession {
        ClassSession(id: id, classId: "c", date: date, startTime: "18:00", origin: .recurring,
                     isMakeup: false, status: status, note: nil, version: 1, sessionNumber: number)
    }

    private func attendance(_ session: String, _ status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: session, studentId: "stu", status: status, note: "", lateAt: nil,
                   version: 1, updatedAt: "2026-10-05T11:00:00.000Z")
    }

    private func slip(_ session: String, _ stars: Stars?, sent: Bool) -> SessionSlip {
        SessionSlip(sessionId: session, studentId: "stu", stars: stars, note: "",
                    status: sent ? .sent : .draft,
                    sentAt: sent ? "2026-10-12T11:00:00.000Z" : nil, version: 1,
                    updatedAt: "2026-10-12T11:00:00.000Z")
    }

    private var sessions: [ClassSession] {
        [
            session("s0", "2026-09-28", number: 1),
            session("s1", "2026-10-05", number: 2),
            session("s2", "2026-10-12", number: 3),
            session("s3", "2026-10-19", status: .cancelled, number: 3)
        ]
    }

    private var tests: [TestDefinition] {
        [
            try! TestDefinition(id: "t1", classId: "c", name: "Từ vựng", date: "2026-10-07", maxScore: 15),
            try! TestDefinition(id: "t2", classId: "c", name: "Nghe", date: "2026-10-14", maxScore: 100)
        ]
    }

    private var sections: [HomeworkSection] {
        [
            HomeworkSection(id: "v", classId: "c", sessionId: "s1", kind: .vocabulary,
                            title: "Unit 6", description: "", version: 1),
            HomeworkSection(id: "r", classId: "c", sessionId: "s1", kind: .reading,
                            title: "Unit 6 reading", description: "", version: 1),
            HomeworkSection(id: "e", classId: "c", sessionId: "s2", kind: .exercise,
                            title: "Workbook", description: "", version: 1)
        ]
    }

    private func build(comment: String = "") -> I4MonthlyReport? {
        ReportRules.build(
            student: student(), month: "2026-10",
            sessions: sessions,
            attendance: [attendance("s1", .present), attendance("s2", .late)],
            tests: tests,
            scores: [Score(testId: "t1", studentId: "stu", value: 12, version: 1, updatedAt: "2026-10-07")],
            slips: [slip("s1", .three, sent: true), slip("s2", .two, sent: true),
                    slip("s0", .one, sent: false)],
            sections: sections,
            grades: [
                HomeworkGrade(sectionId: "v", studentId: "stu", level: .excellent, version: 1,
                              updatedAt: "2026-10-12"),
                HomeworkGrade(sectionId: "v", studentId: "stu2", level: .done, version: 1,
                              updatedAt: "2026-10-12")
            ],
            generalComment: comment
        )
    }

    func testBuildsTheMonthFromLocalData() throws {
        let report = try XCTUnwrap(build())
        XCTAssertEqual(report.snapshot.attendance.heldSessions, 2)
        XCTAssertEqual(report.attendanceCount, 2)
        XCTAssertEqual(report.snapshot.attendance.present, 1)
        XCTAssertEqual(report.snapshot.attendance.late, 1)
        XCTAssertEqual(report.snapshot.tests.map(\.name), ["Từ vựng", "Nghe"])
        XCTAssertEqual(report.gradedTestCount, 1)
        XCTAssertEqual(report.snapshot.stars, StarsSummary(three: 1, two: 1, one: 0))
        XCTAssertEqual(report.ticketCount, 2)
        // Only the vocabulary section was graded for this student and its grading slip (s2) was sent.
        XCTAssertEqual(report.snapshot.homework.count, 1)
        XCTAssertEqual(report.snapshot.homework.first?.kind, .vocabulary)
        XCTAssertEqual(report.snapshot.homework.first?.excellent, 1)
        XCTAssertEqual(report.snapshot.homework.first?.done, 0)
        XCTAssertFalse(report.ready)
        XCTAssertEqual(report.missing, ["Thiếu điểm Nghe", "Thiếu nhận xét chung"])
        XCTAssertEqual(report.suggestion,
                       "Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có 1 buổi 3 sao, 1 buổi 2 sao, 0 buổi 1 sao.")
    }

    func testReadyNeedsEveryScoreAndTheGeneralComment() throws {
        let report = try XCTUnwrap(build(comment: "Con tiến bộ đều trong tháng."))
        XCTAssertEqual(report.missing, ["Thiếu điểm Nghe"])
        XCTAssertFalse(report.ready)
        XCTAssertEqual(report.snapshot.generalComment, "Con tiến bộ đều trong tháng.")
    }

    func testAttendanceMissingIsReported() throws {
        let partial = ReportRules.build(
            student: student(), month: "2026-10", sessions: sessions,
            attendance: [attendance("s1", .present)], tests: [], scores: [], slips: [],
            sections: [], grades: [], generalComment: "Nhận xét"
        )
        XCTAssertEqual(partial?.missing, ["Thiếu điểm danh"])
    }

    func testStudentOutsideTheMonthIsSkipped() {
        let left = student(leftAt: "2026-09-30")
        let report = ReportRules.build(
            student: left, month: "2026-10", sessions: sessions, attendance: [], tests: [],
            scores: [], slips: [], sections: [], grades: [], generalComment: ""
        )
        XCTAssertNil(report)
    }

    func testSlotStatesForReadyDraftPublishedAndRepublish() {
        let snapshot = ReportSnapshot(
            studentId: "stu", month: "2026-10",
            attendance: AttendanceSummary(present: 2, late: 0, excused: 0, absent: 0, heldSessions: 2),
            tests: [ReportTest(testId: "t2", name: "Nghe", date: "2026-10-14", max: 100, value: 80)],
            stars: StarsSummary(three: 1, two: 1, one: 0),
            homework: [],
            generalComment: "Nhận xét",
            ready: true
        )
        let ready = I4MonthlyReport(student: student(), month: "2026-10", snapshot: snapshot,
                                    ticketCount: 2, missing: [], suggestion: nil)
        let readySlot = ReportRules.slot(ready, record: nil)
        XCTAssertEqual(readySlot.status, .ready)
        XCTAssertEqual(readySlot.label, "Sẵn sàng")
        XCTAssertEqual(readySlot.tone, .success)
        XCTAssertTrue(readySlot.publishable)

        let draft = MonthlyReport(id: "r", classId: "c", studentId: "stu", month: "2026-10",
                                  status: .draft, generalComment: "Nhận xét", needsRepublish: false,
                                  publicationCount: 0, publishedAt: nil, version: 1)
        XCTAssertEqual(ReportRules.slot(ready, record: draft).status, .draft)
        XCTAssertEqual(ReportRules.slot(ready, record: draft).label, "Nháp")

        let published = MonthlyReport(id: "r", classId: "c", studentId: "stu", month: "2026-10",
                                      status: .published, generalComment: "Nhận xét",
                                      needsRepublish: false, publicationCount: 1,
                                      publishedAt: "2026-10-12T09:00:00.000Z", version: 2)
        XCTAssertEqual(ReportRules.slot(ready, record: published).status, .published)
        XCTAssertEqual(ReportRules.slot(ready, record: published).label, "Đã phát hành · 12/10")
        XCTAssertFalse(ReportRules.slot(ready, record: published).publishable)

        let republish = MonthlyReport(id: "r", classId: "c", studentId: "stu", month: "2026-10",
                                      status: .published, generalComment: "Nhận xét",
                                      needsRepublish: true, publicationCount: 2,
                                      publishedAt: "2026-10-12T09:00:00.000Z", version: 3)
        XCTAssertEqual(ReportRules.slot(ready, record: republish).status, .republish)
        XCTAssertEqual(ReportRules.slot(ready, record: republish).label, "Cần phát hành lại")
        XCTAssertEqual(ReportRules.slot(ready, record: republish).tone, .primary)
        XCTAssertTrue(ReportRules.slot(ready, record: republish).publishable)
    }

    func testSummaryAndPublishAllLabel() {
        let slots = [
            ReportSlot(status: .ready, label: "Sẵn sàng", tone: .success, detail: "", publishable: true),
            ReportSlot(status: .missing, label: "Thiếu dữ liệu", tone: .warning, detail: "", publishable: false),
            ReportSlot(status: .published, label: "Đã phát hành", tone: .success, detail: "", publishable: false),
            ReportSlot(status: .draft, label: "Nháp", tone: .neutral, detail: "", publishable: true)
        ]
        let summary = ReportRules.summary(slots)
        XCTAssertEqual(summary.total, 4)
        XCTAssertEqual(summary.ready, 3)
        XCTAssertEqual(summary.missing, 1)
        XCTAssertEqual(summary.published, 1)
        XCTAssertEqual(summary.publishable, 2)
        XCTAssertEqual(ReportRules.publishAllLabel(2), "Phát hành 2 báo cáo")
        XCTAssertEqual(ReportRules.publishAllLabel(0), "Phát hành báo cáo")
    }

    func testMonthChoicesAreNewestFirst() {
        let choices = ReportRules.monthChoices(sessions: sessions, tests: tests, reports: [], selected: "2026-11")
        XCTAssertEqual(choices, ["2026-11", "2026-10", "2026-09"])
    }
}
