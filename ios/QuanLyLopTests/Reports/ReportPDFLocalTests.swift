import XCTest
@testable import QuanLyLop

@MainActor
final class ReportPDFLocalTests: XCTestCase {
    func testRendererCreatesPDFDataFromPublicationSnapshot() {
        let pdf = I4PDFRenderer.render(snapshot: snapshot(), studentName: "Học sinh", className: "Lớp thử")

        XCTAssertFalse(pdf.isEmpty)
        XCTAssertTrue(pdf.starts(with: Data("%PDF-".utf8)))
    }

    func testTitleIsTheRangeLabelAndFallsBackToTheMonth() {
        XCTAssertEqual(I4PDFRenderer.title(for: snapshot()), "Báo cáo · Buổi 1–8 · 01/10–24/10")
        XCTAssertEqual(I4PDFRenderer.title(for: snapshot(range: nil, month: "2026-10")), "Báo cáo tháng 10")
    }

    func testPDFFileNameFollowsTheRange() throws {
        XCTAssertEqual(I4ReportPDFFile.fileName(for: snapshot(), publicationNo: 3), "bao-cao-2026-10-01-2026-10-24-3.pdf")
        XCTAssertEqual(I4ReportPDFFile.fileName(for: snapshot(range: nil, month: "2026-10"), publicationNo: 3), "bao-cao-thang-10-3.pdf")

        let url = try I4ReportPDFFile.write(Data("%PDF-1.7 fixture".utf8), name: "bao-cao-test.pdf")
        defer { I4ReportPDFFile.remove(url) }
        XCTAssertEqual(url.lastPathComponent, "bao-cao-test.pdf")
        XCTAssertEqual(url.deletingLastPathComponent().standardizedFileURL.path,
                       FileManager.default.temporaryDirectory.standardizedFileURL.path)
        XCTAssertEqual(try Data(contentsOf: url), Data("%PDF-1.7 fixture".utf8))
    }

    private func snapshot(range: ReportRange? = ReportRange(fromKey: "2026-10-01 18:00", toKey: "2026-10-24 18:00",
                                                           fromNumber: 1, toNumber: 8, label: "Buổi 1–8 · 01/10–24/10"),
                          month: String? = nil) -> ReportSnapshot {
        ReportSnapshot(studentId: "student-1", month: month, range: range,
                       attendance: AttendanceSummary(present: 5, late: 1, excused: 0, absent: 0, heldSessions: 6),
                       tests: [ReportTest(testId: "test-1", name: "Bài kiểm tra", date: "2026-10-15", value: 12)],
                       stars: StarsSummary(three: 3, two: 2, one: 1),
                       homework: [HomeworkSummary(kind: .vocabulary, excellent: 2, done: 1, notDone: 0)],
                       generalComment: "Nhận xét chung", ready: true)
    }
}
