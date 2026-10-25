import XCTest
@testable import QuanLyLop

@MainActor
final class I4FeatureTests: XCTestCase {
    func testTeacherStoreAndRootConstructWithoutProductionFixtures() {
        let store = I4FeatureStore()
        let root = TeacherRootView()

        XCTAssertFalse(store.isReady)
        XCTAssertNil(store.store)
        XCTAssertNil(store.api)
        _ = root
    }

    func testScoreBoundariesWithoutAMaximum() throws {
        let test = TestDefinition(id: "test", classId: "class", name: "Unit 6", date: "2026-10-21")
        try test.validate(score: 0)
        try test.validate(score: 1000)
        try test.validate(score: nil)
        XCTAssertThrowsError(try test.validate(score: 1000.5))
    }

    func testStarsUseTheFixedVietnameseTemplates() {
        XCTAssertEqual(Stars.three.template, "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!")
        XCTAssertEqual(Stars.two.template, "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.")
        XCTAssertEqual(Stars.one.template, "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.")
    }

    func testReportPDFRendererProducesPDFData() throws {
        let snapshot = ReportSnapshot(
            studentId: "student", month: "2026-10",
            attendance: AttendanceSummary(present: 6, late: 1, excused: 1, absent: 0, heldSessions: 8),
            tests: [ReportTest(testId: "test", name: "Bài kiểm tra", date: "2026-10-21", value: 12.5)],
            stars: StarsSummary(three: 5, two: 2, one: 0),
            homework: [HomeworkSummary(kind: .vocabulary, excellent: 4, done: 3, notDone: 1)],
            generalComment: "", ready: true
        )
        let data = I4PDFRenderer.render(snapshot: snapshot, studentName: "Học sinh mẫu")
        XCTAssertTrue(data.starts(with: Data("%PDF".utf8)))
        XCTAssertGreaterThan(data.count, 500)
    }
}
