import XCTest
@testable import QuanLyLop

final class GuardianAccessTests: XCTestCase {
    private let childID = "child-linked"

    func testDraftSlipsAndGradesBeforeSentSlipStayHidden() throws {
        let child = try fixture(sent: false)

        XCTAssertTrue(child.sentSlips.isEmpty)
        XCTAssertTrue(child.homework(for: child.sessions[1]).isEmpty)
    }

    func testOnlySentSlipAndItsChildHomeworkGradeAreShown() throws {
        let child = try fixture(sent: true)

        XCTAssertEqual(child.sentSlips.map(\.id), ["grading-session"])
        XCTAssertEqual(child.homework(for: child.sessions[1]).map(\.level), [.excellent])
        XCTAssertEqual(child.assignedHomework(for: child.sessions[0]).map(\.level), [nil])
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

    func testLatestReportUsesHighestPublicationNumber() throws {
        let child = try fixture(sent: true)
        let snapshot = ReportSnapshot(studentId: childID, month: "2026-10",
            attendance: AttendanceSummary(present: 1, late: 0, excused: 0, absent: 0, heldSessions: 1),
            tests: [], stars: StarsSummary(three: 0, two: 0, one: 0), homework: [], generalComment: "", ready: true)
        let old = ReportPublication(id: "old", reportId: "report", classId: "class", studentId: childID,
            month: "2026-10", publicationNo: 1, publishedAt: "2026-10-15T00:00:00.000Z", hasPdf: false, snapshot: snapshot)
        let current = ReportPublication(id: "current", reportId: "report", classId: "class", studentId: childID,
            month: "2026-10", publicationNo: 2, publishedAt: "2026-10-21T00:00:00.000Z", hasPdf: true, snapshot: snapshot)
        let withReports = GuardianChildData(student: child.student, className: child.className, sessions: child.sessions,
            attendances: child.attendances, tests: child.tests, scores: child.scores, slips: child.slips,
            homeworkSections: child.homeworkSections, homeworkGrades: child.homeworkGrades, publications: [old, current])

        XCTAssertEqual(withReports.latestReport(in: "2026-10")?.id, "current")
    }

    private func fixture(sent: Bool) throws -> GuardianChildData {
        let student = Student(id: childID, classId: "class", name: "Con", parentPhone: nil,
            enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)
        let first = ClassSession(id: "assignment-session", classId: "class", date: "2026-10-10", startTime: "18:00",
            origin: .recurring, status: .held, version: 1, sessionNumber: 1)
        let second = ClassSession(id: "grading-session", classId: "class", date: "2026-10-17", startTime: "18:00",
            origin: .recurring, status: .held, version: 1, sessionNumber: 2)
        let test = try TestDefinition(id: "test", classId: "class", name: "Bài kiểm tra", date: "2026-10-16", maxScore: 15)
        let section = HomeworkSection(id: "section", classId: "class", sessionId: first.id, kind: .vocabulary,
            title: "Từ vựng", description: "Ôn bài", version: 1)
        let slip = SessionSlip(sessionId: second.id, studentId: childID, stars: .three, note: "", status: sent ? .sent : .draft,
            sentAt: sent ? "2026-10-18T00:00:00.000Z" : nil, version: 1, updatedAt: "2026-10-18T00:00:00.000Z")
        return GuardianChildData(student: student, className: "Lớp", sessions: [first, second],
            attendances: [], tests: [test], scores: [Score(testId: test.id, studentId: childID, value: 12.5, version: 1, updatedAt: "")],
            slips: [slip], homeworkSections: [section],
            homeworkGrades: [HomeworkGrade(sectionId: section.id, studentId: childID, level: .excellent, version: 1, updatedAt: "")],
            publications: [])
    }
}
