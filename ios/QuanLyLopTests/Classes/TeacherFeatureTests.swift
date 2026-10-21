import XCTest
@testable import QuanLyLop

@MainActor
final class TeacherFeatureTests: XCTestCase {
    func testRosterRespectsEnrollmentInterval() {
        let active = Student(id: "s1", classId: "c1", name: "Học sinh", parentPhone: nil,
                             enrolledAt: "2026-10-10", leftAt: nil, status: .active, version: 1)
        XCTAssertTrue(TeacherFeatureData.student(active, isEnrolledOn: "2026-10-10"))
        XCTAssertTrue(TeacherFeatureData.student(active, isEnrolledOn: "2026-10-21"))

        let left = Student(id: "s2", classId: "c1", name: "Học sinh", parentPhone: nil,
                           enrolledAt: "2026-10-10", leftAt: "2026-10-20", status: .left, version: 2)
        XCTAssertTrue(TeacherFeatureData.student(left, isEnrolledOn: "2026-10-20"))
        XCTAssertFalse(TeacherFeatureData.student(left, isEnrolledOn: "2026-10-21"))
    }

    func testAttendanceOpensOnSessionDateAndStaysClosedForCancelledSessions() {
        let future = session(date: "2026-10-22", status: .planned)
        let today = session(date: "2026-10-21", status: .planned)
        let cancelledToday = session(date: "2026-10-21", status: .cancelled)

        XCTAssertFalse(TeacherFeatureData.allowsAttendance(for: future, today: "2026-10-21"))
        XCTAssertTrue(TeacherFeatureData.allowsAttendance(for: today, today: "2026-10-21"))
        XCTAssertFalse(TeacherFeatureData.allowsAttendance(for: cancelledToday, today: "2026-10-21"))
    }

    func testAttendanceKeepsAllFourContractStates() {
        XCTAssertEqual(AttendanceStatus.allCases.map(\.rawValue), ["present", "late", "excused", "absent"])
    }

    private func session(date: String, status: SessionStatus) -> ClassSession {
        ClassSession(id: "session", classId: "class", date: date, startTime: "18:00",
                     origin: .recurring, status: status)
    }

    // MARK: - Prototype rules copied from design/prototype/src/data

    func testSessionPrefixUsesServerNumberAndHidesItForCancelledSessions() {
        let numbered = ClassSession(id: "s", classId: "c", date: "2026-10-19", startTime: "18:00",
                                    origin: .recurring, status: .planned, version: 1, sessionNumber: 9)
        XCTAssertEqual(TeacherFeatureData.sessionPrefix(numbered), "Buổi 9")

        let cancelled = ClassSession(id: "s", classId: "c", date: "2026-10-16", startTime: "18:00",
                                     origin: .manual, isMakeup: true, status: .cancelled,
                                     version: 1, sessionNumber: 9)
        XCTAssertEqual(TeacherFeatureData.sessionPrefix(cancelled), "Buổi bù")

        let unnumbered = ClassSession(id: "s2", classId: "c", date: "2026-10-16", startTime: "18:00",
                                      origin: .recurring, status: .planned, version: 1)
        XCTAssertEqual(TeacherFeatureData.sessionPrefix(unnumbered), "Buổi học")
    }

    func testSplitSessionsSpotlightsTodayOrTheNextPlannedSession() {
        let data = demoData(sessions: [
            session(id: "past", date: "2026-10-19", status: .planned),
            session(id: "cancelledFuture", date: "2026-10-25", status: .cancelled),
            session(id: "next", date: "2026-10-26", status: .planned),
            session(id: "later", date: "2026-10-28", status: .planned),
        ])
        let groups = data.splitSessions(in: "class", today: "2026-10-21")
        XCTAssertEqual(groups.current.map(\.id), ["next"])
        XCTAssertEqual(groups.upcoming.map(\.id), ["later"])
        XCTAssertEqual(groups.past.map(\.id), ["past"])

        let withToday = demoData(sessions: [
            session(id: "today", date: "2026-10-21", status: .planned),
            session(id: "next", date: "2026-10-26", status: .planned),
        ])
        XCTAssertEqual(withToday.splitSessions(in: "class", today: "2026-10-21").current.map(\.id), ["today"])
    }

    func testAbsenceWarningCountsTheLastTwoHeldSessionsOnly() {
        let sessions = [
            session(id: "s1", date: "2026-10-12", status: .held),
            session(id: "s2", date: "2026-10-14", status: .held),
            session(id: "s3", date: "2026-10-19", status: .planned),
        ]
        let student = Student(id: "st", classId: "class", name: "Học sinh", parentPhone: nil,
                              enrolledAt: "2026-09-01", leftAt: nil, status: .active, version: 1)
        let absentTwice = demoData(sessions: sessions, attendance: [
            attendance(session: "s1", student: "st", status: .absent),
            attendance(session: "s2", student: "st", status: .absent),
        ], students: [student])
        XCTAssertEqual(absentTwice.consecutiveAbsences(of: student), 2)
        XCTAssertTrue(absentTwice.hasAbsenceWarning(student))
        XCTAssertEqual(absentTwice.absenceWarningCount(in: "class"), 1)

        let excusedLatest = demoData(sessions: sessions, attendance: [
            attendance(session: "s1", student: "st", status: .absent),
            attendance(session: "s2", student: "st", status: .excused),
        ], students: [student])
        XCTAssertEqual(excusedLatest.consecutiveAbsences(of: student), 0)
        XCTAssertFalse(excusedLatest.hasAbsenceWarning(student))
    }

    func testAttendanceRateExcludesExcusedSessions() {
        let data = demoData(sessions: [session(id: "s1", date: "2026-10-14", status: .held)],
                            attendance: [
                                attendance(session: "s1", student: "a", status: .present),
                                attendance(session: "s1", student: "b", status: .late),
                                attendance(session: "s1", student: "c", status: .excused),
                                attendance(session: "s1", student: "d", status: .absent),
                            ])
        XCTAssertEqual(data.attendanceRate(in: "class"), 67)
    }

    // MARK: - Fixtures

    private func session(id: String, date: String, status: SessionStatus) -> ClassSession {
        ClassSession(id: id, classId: "class", date: date, startTime: "18:00",
                     origin: .recurring, status: status, version: 1)
    }

    private func attendance(session: String, student: String, status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: session, studentId: student, status: status, note: "",
                   lateAt: nil, version: 1, updatedAt: "2026-10-14T11:00:00Z")
    }

    private func demoData(sessions: [ClassSession] = [], attendance: [Attendance] = [],
                          students: [Student] = []) -> TeacherFeatureData {
        TeacherFeatureData(previewClasses: [
            Classroom(id: "class", name: "Lớp", status: .active, weekdays: [1, 3],
                      startTime: "18:00", version: 1),
        ], previewStudents: students, previewSessions: sessions, previewAttendance: attendance)
    }
}
