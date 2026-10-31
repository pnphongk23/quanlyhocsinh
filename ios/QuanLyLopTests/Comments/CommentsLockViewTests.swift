import SwiftUI
import XCTest
@testable import QuanLyLop

/// The comments tab as drawn: while attendance is unfinished its rows and chips are disabled and say why, and once it
/// is complete they are live. Read from the accessibility tree of the hosted view, so removing a `.disabled` fails here.
@MainActor
final class CommentsLockViewTests: XCTestCase {
    private static let sessionID = "s1"

    private func student(_ id: String, _ name: String) -> Student {
        Student(id: id, classId: "c", name: name, parentPhone: nil, enrolledAt: "2026-09-01", leftAt: nil,
                status: .active, version: 1)
    }

    private func mark(_ id: String, _ status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: Self.sessionID, studentId: id, status: status, note: "", lateAt: nil, version: 1,
                   updatedAt: "2026-10-27T10:00:00.000Z")
    }

    private func store(attendance: [Attendance]) -> I4FeatureStore {
        let students = [student("1", "Nguyễn Gia Hân"), student("2", "Trần Minh Khôi")]
        let session = ClassSession(id: Self.sessionID, classId: "c", date: "2026-10-27", startTime: "18:00",
                                   origin: .recurring, isMakeup: false, status: .held, note: nil, version: 1)
        let classroom = Classroom(id: "c", name: "S19A", status: .active, weekdays: [2], startTime: "18:00", version: 1)
        let slips = ["1", "2"].map {
            SessionSlip(sessionId: Self.sessionID, studentId: $0, stars: 5, criteria: 0b11111, note: "", status: .draft,
                        sentAt: nil, version: 1, updatedAt: "2026-10-27T11:00:00.000Z")
        }
        return I4FeatureStore(demoClasses: [classroom], students: students, sessions: [session], attendance: attendance,
                              slips: slips)
    }

    /// Every accessibility element of the hosted view, with the identifier and traits SwiftUI gave it.
    private func elements(of mode: CommentsMode, attendance: [Attendance]) throws -> [(id: String, traits: UIAccessibilityTraits)] {
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: 390, height: 844)
        let view = SessionCommentsView(sessionID: Self.sessionID, data: store(attendance: attendance), initialMode: mode)
            .environment(AuthModel(configuration: .fallback))
        window.rootViewController = UIHostingController(rootView: view)
        window.makeKeyAndVisible()
        RunLoop.main.run(until: Date().addingTimeInterval(0.8))
        defer { window.isHidden = true }
        var found: [(id: String, traits: UIAccessibilityTraits)] = []
        func walk(_ node: Any) {
            if let object = node as? NSObject {
                if let id = (object as? UIAccessibilityIdentification)?.accessibilityIdentifier, !id.isEmpty {
                    found.append((id, object.accessibilityTraits))
                }
                for child in (object.accessibilityElements ?? []) { walk(child) }
                if let view = object as? UIView {
                    for sub in view.subviews { walk(sub) }
                    for index in 0..<view.accessibilityElementCount() where view.accessibilityElementCount() != NSNotFound {
                        if let element = view.accessibilityElement(at: index) { walk(element) }
                    }
                }
            }
        }
        walk(window)
        return found
    }

    func testLockedTabDisablesItsRowsAndBulkButtonsAndOffersTheAttendanceTab() throws {
        let found = try elements(of: .byStudent, attendance: [mark("1", .present)])
        XCTAssertTrue(found.contains { $0.id == "comment.locked" || $0.id == "comment.locked.goAttendance" }, "ids: \(found.map(\.id))")
        let disabled = found.filter { $0.traits.contains(.notEnabled) }.map(\.id)
        XCTAssertTrue(disabled.contains("comment.assignDefaults"), "ids: \(found.map(\.id)) disabled: \(disabled)")
        XCTAssertTrue(disabled.contains("comment.row.1") && disabled.contains("comment.row.2"), "disabled: \(disabled)")
    }
}
