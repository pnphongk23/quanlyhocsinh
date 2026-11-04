import SwiftUI
import XCTest
@testable import QuanLyLop

/// The lock the comments tab puts on its rows and chips, read from inside the hosted view: what a control sees of its
/// own environment is what the teacher can do with it.
@MainActor
final class CommentsLockViewTests: XCTestCase {
    private struct Probe: View {
        @Environment(\.isEnabled) private var isEnabled
        let report: (Bool) -> Void
        var body: some View { Color.clear.frame(width: 10, height: 10).onAppear { report(isEnabled) } }
    }

    /// Whether a view carrying the lock is enabled once it is on screen; nil if it never appeared.
    private func isEnabled(lock: Bool) throws -> Bool? {
        var seen: Bool?
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let scene = try XCTUnwrap(scenes.first { $0.activationState == .foregroundActive } ?? scenes.first)
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: 100, height: 100)
        window.rootViewController = UIHostingController(rootView: Probe { seen = $0 }.attendanceLock(lock))
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        for _ in 0..<20 where seen == nil { RunLoop.main.run(until: Date().addingTimeInterval(0.1)) }
        return seen
    }

    func testRowsAndChipsAreDisabledWhileAttendanceIsUnfinished() throws {
        XCTAssertEqual(try isEnabled(lock: true), false)
    }

    func testRowsAndChipsAreLiveOnceAttendanceIsComplete() throws {
        XCTAssertEqual(try isEnabled(lock: false), true)
    }

    // MARK: - The two screens that use the lock

    private static let sessionID = "s1"
    private static let hint = "Điểm danh xong để nhận xét"

    private func store(attendance: [Attendance]) -> I4FeatureStore {
        let students = [("1", "Nguyễn Gia Hân"), ("2", "Trần Minh Khôi")].map {
            Student(id: $0.0, classId: "c", name: $0.1, parentPhone: nil, enrolledAt: "2026-09-01", leftAt: nil,
                    status: .active, version: 1)
        }
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

    private func mark(_ id: String, _ status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: Self.sessionID, studentId: id, status: status, note: "", lateAt: nil, version: 1,
                   updatedAt: "2026-10-27T10:00:00.000Z")
    }

    /// The locks the real comments tab puts on its rows (by student) or chips (by criterion).
    private func locks(mode: CommentsMode, attendance: [Attendance]) throws -> [AttendanceLockReport.Entry] {
        var seen: [AttendanceLockReport.Entry] = []
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let scene = try XCTUnwrap(scenes.first { $0.activationState == .foregroundActive } ?? scenes.first)
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: 390, height: 844)
        let view = SessionCommentsView(sessionID: Self.sessionID, data: store(attendance: attendance), initialMode: mode)
            .environment(AuthModel(configuration: .fallback))
            .onPreferenceChange(AttendanceLockReport.self) { seen = $0 }
        window.rootViewController = UIHostingController(rootView: view)
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        for _ in 0..<30 where seen.isEmpty { RunLoop.main.run(until: Date().addingTimeInterval(0.1)) }
        return seen
    }

    func testEveryStudentRowIsLockedAndSaysWhyWhileAttendanceIsUnfinished() throws {
        let entries = try locks(mode: .byStudent, attendance: [mark("1", .present)])
        XCTAssertEqual(entries.count, 2, "one lock per student row")
        XCTAssertTrue(entries.allSatisfy { $0.locked && $0.hint == Self.hint }, "\(entries)")
    }

    func testEveryCriterionChipIsLockedAndSaysWhyWhileAttendanceIsUnfinished() throws {
        let entries = try locks(mode: .byCriterion, attendance: [mark("1", .present)])
        XCTAssertFalse(entries.isEmpty, "the chips carry the lock")
        XCTAssertTrue(entries.allSatisfy { $0.locked && $0.hint == Self.hint }, "\(entries)")
    }

    func testRowsAndChipsCarryAnOpenLockOnceAttendanceIsComplete() throws {
        let complete = [mark("1", .present), mark("2", .late)]
        for mode in [CommentsMode.byStudent, .byCriterion] {
            let entries = try locks(mode: mode, attendance: complete)
            XCTAssertFalse(entries.isEmpty)
            XCTAssertTrue(entries.allSatisfy { !$0.locked && $0.hint.isEmpty }, "\(entries)")
        }
    }
}
