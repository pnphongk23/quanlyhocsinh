import XCTest
@testable import QuanLyLop

final class SessionLabelTests: XCTestCase {
    private func session(_ date: String, status: SessionStatus = .planned, makeup: Bool = false) -> ClassSession {
        ClassSession(id: "s", classId: "c1", date: date, startTime: "18:00",
                     origin: makeup ? .manual : .recurring, isMakeup: makeup, status: status)
    }

    func testSessionReadsAsWeekdayAndDate() {
        XCTAssertEqual(SessionLabel.title(for: session("2026-10-20")), "T3 · 20/10")
        XCTAssertEqual(SessionLabel.title(for: session("2026-10-25")), "CN · 25/10")
        XCTAssertEqual(SessionLabel.title(for: session("2026-11-07")), "T7 · 7/11")
        XCTAssertEqual(SessionLabel.inline(for: session("2026-10-21")), "T4 · 21/10")
    }

    func testCancelledAndMakeupSessionsReadTheSameWay() {
        XCTAssertEqual(SessionLabel.title(for: session("2026-10-19", status: .cancelled)), "T2 · 19/10")
        XCTAssertEqual(SessionLabel.title(for: session("2026-10-19", status: .held, makeup: true)), "T2 · 19/10")
    }

    func testNoSessionReadsAsPlainSession() {
        XCTAssertEqual(SessionLabel.inline(for: nil as ClassSession?), "buổi học")
    }

    func testBadDateIsKeptAsIs() {
        XCTAssertEqual(SessionLabel.title(forDate: "không rõ"), "không rõ")
    }

    func testFeatureSourcesDoNotShowSessionNumbers() throws {
        let iosRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let featureRoot = iosRoot.appendingPathComponent("QuanLyLop/Features", isDirectory: true)
        var offenders: [String] = []
        for path in try FileManager.default.subpathsOfDirectory(atPath: featureRoot.path) where path.hasSuffix(".swift") {
            let source = try String(contentsOf: featureRoot.appendingPathComponent(path), encoding: .utf8)
            for (index, line) in source.components(separatedBy: .newlines).enumerated()
            where line.contains("sessionNumber") || line.contains("SessionNumbering") {
                offenders.append("\(path):\(index + 1)")
            }
        }
        XCTAssertEqual(offenders, [])
    }
}
