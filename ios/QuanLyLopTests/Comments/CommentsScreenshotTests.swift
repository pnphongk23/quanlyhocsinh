import SwiftUI
import XCTest
@testable import QuanLyLop

/// Draws the comments tab of a session with synthetic students at 390×844: attendance unfinished, and finished with
/// absent students, each in both modes. Set `QLH_COMMENTS_SHOTS` to an output directory and `QLH_COMMENTS_PREFIX` to the
/// file prefix; without them the test skips, so a normal `xcodebuild test` stays green.
@MainActor
final class CommentsScreenshotTests: XCTestCase {
    private static let sessionID = "s1"

    private func student(_ id: String, _ name: String) -> Student {
        Student(id: id, classId: "c", name: name, parentPhone: nil, enrolledAt: "2026-09-01", leftAt: nil,
                status: .active, version: 1)
    }

    private func mark(_ id: String, _ status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: Self.sessionID, studentId: id, status: status, note: "", lateAt: nil, version: 1,
                   updatedAt: "2026-10-27T10:00:00.000Z")
    }

    private func slip(_ id: String, _ criteria: Int, sent: Bool = false) -> SessionSlip {
        SessionSlip(sessionId: Self.sessionID, studentId: id, stars: SlipRules.stars(criteria: criteria), criteria: criteria,
                    note: "", status: sent ? .sent : .draft, sentAt: nil, version: 1, updatedAt: "2026-10-27T11:00:00.000Z")
    }

    private func store(attendance: [Attendance]) -> I4FeatureStore {
        let students = [student("1", "Nguyễn Gia Hân"), student("2", "Trần Minh Khôi"), student("3", "Lê Bảo An"),
                        student("4", "Phạm Thu Hà"), student("5", "Đỗ Quang Huy")]
        let session = ClassSession(id: Self.sessionID, classId: "c", date: "2026-10-27", startTime: "18:00",
                                   origin: .recurring, isMakeup: false, status: .held, note: nil, version: 1)
        let classroom = Classroom(id: "c", name: "S19A", status: .active, weekdays: [2], startTime: "18:00", version: 1)
        return I4FeatureStore(demoClasses: [classroom], students: students, sessions: [session], attendance: attendance,
                              slips: [slip("1", 0b11111), slip("2", 0b10111, sent: true), slip("3", 0b11011)])
    }

    func testRenderCommentsTab() throws {
        let env = ProcessInfo.processInfo.environment
        guard let directory = env["QLH_COMMENTS_SHOTS"], let prefix = env["QLH_COMMENTS_PREFIX"] else {
            throw XCTSkip("QLH_COMMENTS_SHOTS / QLH_COMMENTS_PREFIX not set: screenshot run only")
        }
        let folder = URL(fileURLWithPath: directory, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let states: [(name: String, attendance: [Attendance])] = [
            ("chua-diem-danh-xong", [mark("1", .present), mark("2", .late), mark("3", .absent)]),
            ("da-xong-co-vang", [mark("1", .present), mark("2", .late), mark("3", .absent), mark("4", .present), mark("5", .absent)])
        ]
        let modes: [(name: String, mode: CommentsMode)] = [("theo-hoc-sinh", .byStudent), ("theo-tieu-chi", .byCriterion)]
        for state in states {
            for mode in modes {
                let auth = AuthModel(configuration: .fallback)
                let view = SessionCommentsView(sessionID: Self.sessionID, data: store(attendance: state.attendance),
                                               initialMode: mode.mode, onGoAttendance: {})
                    .environment(auth)
                    .background(AppColors.background)
                try TeacherScreenshotTests.snapshot(view, to: folder.appendingPathComponent("\(prefix)-\(state.name)-\(mode.name).png"))
            }
        }
    }
}
