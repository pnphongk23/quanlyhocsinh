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
}
