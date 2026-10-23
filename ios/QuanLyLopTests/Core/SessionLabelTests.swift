import XCTest
@testable import QuanLyLop

final class SessionLabelTests: XCTestCase {
    private func session(number: Int?, makeup: Bool = false, status: SessionStatus = .planned) -> ClassSession {
        ClassSession(id: "s", classId: "c1", date: "2026-10-01", startTime: "18:00",
                     origin: makeup ? .manual : .recurring, isMakeup: makeup, status: status, sessionNumber: number)
    }

    func testNumberedSessionShowsNumber() {
        let numbered = session(number: 9)
        XCTAssertEqual(SessionLabel.title(for: numbered), "Buổi 9")
        XCTAssertEqual(SessionLabel.inline(for: numbered), "buổi 9")
    }

    func testCancelledSessionHasNoNumber() {
        let cancelled = session(number: 4, status: .cancelled)
        XCTAssertEqual(SessionLabel.title(for: cancelled), "Buổi học")
        XCTAssertEqual(SessionLabel.inline(for: cancelled), "buổi học")
    }

    func testCancelledMakeupSessionIsMakeupLabel() {
        let cancelled = session(number: nil, makeup: true, status: .cancelled)
        XCTAssertEqual(SessionLabel.title(for: cancelled), "Buổi bù")
        XCTAssertEqual(SessionLabel.inline(for: cancelled), "buổi bù")
    }

    func testPreviousLabelNeverShowsZero() {
        XCTAssertEqual(SessionLabel.inlineBefore(session(number: 9)), "buổi 8")
        XCTAssertEqual(SessionLabel.inlineBefore(session(number: 1)), "buổi 1")
        XCTAssertEqual(SessionLabel.inlineBefore(session(number: nil, status: .cancelled)), "buổi học")
    }

    func testFeatureSourcesDoNotDefaultSessionNumberToZero() throws {
        let iosRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let featureRoot = iosRoot.appendingPathComponent("QuanLyLop/Features", isDirectory: true)
        var offenders: [String] = []
        for path in try FileManager.default.subpathsOfDirectory(atPath: featureRoot.path) where path.hasSuffix(".swift") {
            let source = try String(contentsOf: featureRoot.appendingPathComponent(path), encoding: .utf8)
            for (index, line) in source.components(separatedBy: .newlines).enumerated() where line.contains("sessionNumber ?? 0") {
                offenders.append("\(path):\(index + 1)")
            }
        }
        XCTAssertEqual(offenders, [])
    }
}
