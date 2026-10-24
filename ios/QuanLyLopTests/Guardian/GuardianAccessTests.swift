import XCTest
@testable import QuanLyLop

final class GuardianAccessTests: XCTestCase {
    private let childID = "child-linked"

    func testDraftSlipsAndGradesBeforeSentSlipStayHidden() throws {
        let child = try fixture(sent: false, gradingNumber: 2)

        XCTAssertTrue(child.sentSlips.isEmpty)
        let assigned = try XCTUnwrap(child.homeworkSession(id: "assignment-session"))
        XCTAssertFalse(assigned.parts[0].graded)
        XCTAssertNil(assigned.parts[0].level)
        XCTAssertNil(child.gradedHomework(for: try XCTUnwrap(child.session(id: "grading-session"))))
    }

    func testSentSlipExposesChildHomeworkGradeOnly() throws {
        let child = try fixture(sent: true)

        XCTAssertEqual(child.sentSlips.map(\.session.id), ["grading-session"])
        let assigned = try XCTUnwrap(child.homeworkSession(id: "assignment-session"))
        XCTAssertTrue(assigned.parts[0].graded)
        XCTAssertEqual(assigned.parts[0].level, .excellent)
        let previous = try XCTUnwrap(child.gradedHomework(for: try XCTUnwrap(child.session(id: "grading-session"))))
        XCTAssertEqual(previous.parts.map(\.level), [.excellent])
    }

    func testGradingPlanSkipsCancelledSessionsAndTicketCarriesNewHomework() throws {
        let child = try fixture(sent: true)
        let graded = try XCTUnwrap(child.session(id: "grading-session"))
        let grading = child.grading(for: graded)

        XCTAssertEqual(grading.session?.id, "third-session")
        XCTAssertEqual(grading.cancelled.map(\.id), ["cancelled-session"])
        XCTAssertEqual(grading.state, .moved)

        let ticket = child.ticket(for: try XCTUnwrap(child.session(id: "grading-session")))
        XCTAssertEqual(ticket.slip?.stars, .three)
        XCTAssertEqual(ticket.previousSession?.id, "assignment-session")
        XCTAssertEqual(ticket.previousParts.map(\.level), [.excellent])
        XCTAssertEqual(ticket.assigned?.session.id, "grading-session")
    }

    func testMonthlyScoresExcludeArchivedTestsAndOtherStudents() throws {
        var child = try fixture(sent: true)
        let archived = try TestDefinition(id: "archived", classId: "class", name: "Ẩn", date: "2026-10-10", maxScore: 15, archived: true)
        let otherStudentScore = Score(testId: "test", studentId: "other-child", value: 15, version: 1, updatedAt: "")
        child = GuardianChildData(student: child.student, className: child.className, sessions: child.sessions,
            attendances: child.attendances, tests: child.tests + [archived], scores: child.scores + [otherStudentScore],
            slips: child.slips, homeworkSections: child.homeworkSections, homeworkGrades: child.homeworkGrades, publications: child.publications)

        let rows = child.scoreRows(in: "2026-10")
        XCTAssertEqual(rows.map(\.test.id), ["test"])
        XCTAssertEqual(rows.first?.score?.value, 12.5)
    }

    func testAttendanceMonthCountsHeldSessionsOnly() throws {
        let child = try fixture(sent: true)
        let month = child.attendanceMonth("2026-10")

        XCTAssertEqual(month.rows.map(\.session.id), ["grading-session", "assignment-session"])
        XCTAssertEqual(month.present, 0)
        XCTAssertEqual(month.excused, 1)
        XCTAssertEqual(month.absent, 0)
        XCTAssertEqual(month.rows.count, 2)
    }

    func testSessionListIncludesFutureAndCancelledNewestFirstAndOpensSessionDetail() throws {
        let child = try fixture(sent: false)
        let rows = child.sessionRows

        XCTAssertEqual(rows.map(\.session.id), ["third-session", "cancelled-session", "grading-session", "assignment-session"])
        XCTAssertEqual(rows.map(\.destination), rows.map { .ticket($0.session.id) })
        XCTAssertNil(rows.first(where: { $0.session.id == "grading-session" })?.sentSlip)
        XCTAssertNotNil(rows.first(where: { $0.session.id == "assignment-session" }))
    }

    func testLatestReportUsesHighestPublicationNumber() throws {
        let child = try fixture(sent: true)
        let snapshot = ReportSnapshot(studentId: childID, month: "2026-10",
            attendance: AttendanceSummary(present: 1, late: 0, excused: 0, absent: 0, heldSessions: 1),
            tests: [], stars: StarsSummary(three: 0, two: 0, one: 0), homework: [], generalComment: "", ready: true)
        let old = ReportPublication(id: "old", reportId: "report", classId: "class", studentId: childID,
            month: "2026-10", publicationNo: 1, publishedAt: "2026-10-15T00:00:00.000Z", snapshot: snapshot)
        let current = ReportPublication(id: "current", reportId: "report", classId: "class", studentId: childID,
            month: "2026-10", publicationNo: 2, publishedAt: "2026-10-21T00:00:00.000Z", snapshot: snapshot)
        let withReports = GuardianChildData(student: child.student, className: child.className, sessions: child.sessions,
            attendances: child.attendances, tests: child.tests, scores: child.scores, slips: child.slips,
            homeworkSections: child.homeworkSections, homeworkGrades: child.homeworkGrades, publications: [old, current])

        XCTAssertEqual(withReports.publishedReports.map(\.id), ["current"])
    }

    func testGuardianDateFormattingMatchesPrototype() {
        XCTAssertEqual(GuardianFormat.dayMonth("2026-10-16"), "16/10")
        // `dayMonth` của prototype không đệm số 0: "7/10" như ảnh Điểm danh.
        XCTAssertEqual(GuardianFormat.dayMonth("2026-10-07"), "7/10")
        XCTAssertEqual(GuardianFormat.weekdayDayMonth("2026-10-07"), "Thứ Tư 7/10")
        XCTAssertEqual(GuardianFormat.weekdayDayMonth("2026-10-16"), "Thứ Sáu 16/10")
        XCTAssertEqual(GuardianFormat.weekdayDayMonth("2026-10-18"), "Chủ nhật 18/10")
        XCTAssertEqual(GuardianFormat.longDayMonth("2026-10-14"), "14 tháng 10")
        XCTAssertEqual(GuardianFormat.monthLabel("2026-10"), "Tháng 10")
        XCTAssertEqual(GuardianFormat.scoreText(nil), "Chưa có điểm")
        XCTAssertEqual(GuardianFormat.scoreText(7.25), "7,2")
        XCTAssertEqual(GuardianFormat.scoreText(82), "82")
        XCTAssertEqual(GuardianFormat.initials("Trần Gia Bảo"), "GB")
        XCTAssertEqual(GuardianFormat.shortName("Trần Gia Bảo"), "Gia Bảo")
    }

    func testGuardianLabelsAndTonesMatchPrototype() {
        XCTAssertEqual(AttendanceStatus.excused.guardianPillLabel, "Có phép")
        XCTAssertEqual(AttendanceStatus.excused.guardianLabel, "có phép")
        XCTAssertEqual(AttendanceStatus.excused.guardianTone, .primary)
        XCTAssertEqual(HomeworkKind.vocabulary.guardianKindLabel, "Luyện từ vựng")
        XCTAssertEqual(HomeworkLevel.excellent.guardianLabel, "Hoàn thành tốt")
        XCTAssertEqual(HomeworkLevel.notDone.guardianTone, .error)
    }

    func testTeacherNoteUsesLatestPublishedReportComment() throws {
        let child = try fixture(sent: true)
        let older = publication(id: "older", month: "2026-09", at: "2026-09-30T00:00:00.000Z",
                                comment: "Nhận xét tháng 9")
        let newer = publication(id: "newer", month: "2026-10", at: "2026-10-21T00:00:00.000Z",
                                comment: "  Tháng này con tiến bộ rõ kỹ năng nghe.  ")

        XCTAssertEqual(published(child, [older, newer]).teacherNote,
                       "Tháng này con tiến bộ rõ kỹ năng nghe.")
        // Báo cáo mới nhất để trống nhận xét thì ẩn khối, không lấy báo cáo cũ hơn.
        let blank = publication(id: "blank", month: "2026-10", at: "2026-10-22T00:00:00.000Z", comment: "   ")
        XCTAssertNil(published(child, [older, newer, blank]).teacherNote)
        XCTAssertNil(published(child, []).teacherNote)
    }

    func testHomeworkPartsKeepTheTeacherOrderNotTheKindOrder() throws {
        let child = try fixture(sent: true)
        let extra = [
            HomeworkSection(id: "vocab", classId: "class", sessionId: "assignment-session",
                            kind: .vocabulary, title: "Từ vựng", description: "", version: 1),
            HomeworkSection(id: "speaking", classId: "class", sessionId: "assignment-session",
                            kind: .speaking, title: "Nói", description: "", version: 1),
            HomeworkSection(id: "exercise", classId: "class", sessionId: "assignment-session",
                            kind: .exercise, title: "Bài tập", description: "", version: 1)
        ]
        let ordered = GuardianChildData(student: child.student, className: child.className,
            sessions: child.sessions, attendances: child.attendances, tests: child.tests,
            scores: child.scores, slips: child.slips, homeworkSections: extra,
            homeworkGrades: child.homeworkGrades, publications: child.publications)

        let assigned = try XCTUnwrap(ordered.homeworkSession(id: "assignment-session"))
        XCTAssertEqual(assigned.parts.map(\.section.id), ["vocab", "speaking", "exercise"])
    }

    private func publication(id: String, month: String, at: String, comment: String) -> ReportPublication {
        let snapshot = ReportSnapshot(studentId: childID, month: month,
            attendance: AttendanceSummary(present: 0, late: 0, excused: 0, absent: 0, heldSessions: 0),
            tests: [], stars: StarsSummary(three: 0, two: 0, one: 0), homework: [],
            generalComment: comment, ready: true)
        return ReportPublication(id: id, reportId: "report-\(id)", classId: "class", studentId: childID,
            month: month, publicationNo: 1, publishedAt: at, snapshot: snapshot)
    }

    private func published(_ child: GuardianChildData, _ publications: [ReportPublication]) -> GuardianChildData {
        GuardianChildData(student: child.student, className: child.className, sessions: child.sessions,
            attendances: child.attendances, tests: child.tests, scores: child.scores, slips: child.slips,
            homeworkSections: child.homeworkSections, homeworkGrades: child.homeworkGrades,
            publications: publications)
    }

    private func fixture(sent: Bool, gradingNumber: Int = 2) throws -> GuardianChildData {
        let student = Student(id: childID, classId: "class", name: "Trần Gia Bảo", parentPhone: nil,
            enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)
        let first = ClassSession(id: "assignment-session", classId: "class", date: "2026-10-10", startTime: "18:00",
            origin: .recurring, status: .held, version: 1, sessionNumber: 1)
        let second = ClassSession(id: "grading-session", classId: "class", date: "2026-10-17", startTime: "18:00",
            origin: .recurring, status: .held, version: 1, sessionNumber: gradingNumber)
        let third = ClassSession(id: "third-session", classId: "class", date: "2026-10-24", startTime: "18:00",
            origin: .recurring, status: .planned, version: 1, sessionNumber: 3)
        let cancelled = ClassSession(id: "cancelled-session", classId: "class", date: "2026-10-22", startTime: "18:00",
            origin: .manual, isMakeup: true, status: .cancelled, note: nil, version: 1)
        let test = try TestDefinition(id: "test", classId: "class", name: "Bài kiểm tra", date: "2026-10-16", maxScore: 15)
        let section = HomeworkSection(id: "section", classId: "class", sessionId: first.id, kind: .vocabulary,
            title: "Từ vựng", description: "Ôn bài", version: 1)
        let nextSection = HomeworkSection(id: "next-section", classId: "class", sessionId: second.id, kind: .reading,
            title: "Luyện đọc", description: "Đọc bài mới", version: 1)
        let slip = SessionSlip(sessionId: second.id, studentId: childID, stars: .three, note: "", status: sent ? .sent : .draft,
            sentAt: sent ? "2026-10-18T00:00:00.000Z" : nil, version: 1, updatedAt: "2026-10-18T00:00:00.000Z")
        return GuardianChildData(student: student, className: "Lớp", sessions: [first, second, third, cancelled],
            attendances: [Attendance(sessionId: second.id, studentId: childID, status: .excused, note: "",
                                     lateAt: nil, version: 1, updatedAt: "2026-10-17T12:00:00.000Z")],
            tests: [test], scores: [Score(testId: test.id, studentId: childID, value: 12.5, version: 1, updatedAt: "")],
            slips: [slip], homeworkSections: [section, nextSection],
            homeworkGrades: [HomeworkGrade(sectionId: section.id, studentId: childID, level: .excellent, version: 1, updatedAt: "")],
            publications: [])
    }
}
