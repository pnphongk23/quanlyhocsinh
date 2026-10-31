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
}
