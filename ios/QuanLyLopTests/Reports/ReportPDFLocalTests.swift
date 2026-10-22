import XCTest
@testable import QuanLyLop

@MainActor
final class ReportPDFLocalTests: XCTestCase {
    func testRendererCreatesPDFDataFromPublicationSnapshot() {
        let pdf = I4PDFRenderer.render(snapshot: snapshot(), studentName: "Học sinh", className: "Lớp thử")

        XCTAssertFalse(pdf.isEmpty)
        XCTAssertTrue(pdf.starts(with: Data("%PDF-".utf8)))
    }

    func testPDFFileUsesExpectedNameAndTemporaryDirectory() throws {
        let url = try I4ReportPDFFile.write(Data("%PDF-1.7 fixture".utf8), month: "2026-10", publicationNo: 3)
        defer { I4ReportPDFFile.remove(url) }

        XCTAssertEqual(url.lastPathComponent, "bao-cao-thang-10-3.pdf")
        XCTAssertEqual(url.deletingLastPathComponent().standardizedFileURL.path,
                       FileManager.default.temporaryDirectory.standardizedFileURL.path)
        XCTAssertEqual(try Data(contentsOf: url), Data("%PDF-1.7 fixture".utf8))
    }

    func testPublishSendsOnlyPublicationRequest() async throws {
        let scope = CacheScope(userId: "user", workspaceId: "workspace", membershipId: "member")
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let api = RecordingAPIClient()
        let data = I4FeatureStore(store: store, api: api)
        let student = Student(id: "student-1", classId: "class-1", name: "Học sinh", parentPhone: nil,
                              enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)

        let outcome = await data.publish(student: student, month: "2026-10")
        XCTAssertEqual(outcome, .published(publicationNo: 4))
        let requests = await api.recordedRequests()
        XCTAssertEqual(requests.map(\.path), ["students/student-1/reports/2026-10/publish"])
        XCTAssertEqual(requests.map(\.method), [.post])
    }

    private func snapshot() -> ReportSnapshot {
        ReportSnapshot(studentId: "student-1", month: "2026-10",
                       attendance: AttendanceSummary(present: 5, late: 1, excused: 0, absent: 0, heldSessions: 6),
                       tests: [ReportTest(testId: "test-1", name: "Bài kiểm tra", date: "2026-10-15", max: 15, value: 12)],
                       stars: StarsSummary(three: 3, two: 2, one: 1),
                       homework: [HomeworkSummary(kind: .vocabulary, excellent: 2, done: 1, notDone: 0)],
                       generalComment: "Nhận xét chung", ready: true)
    }
}

private actor RecordingAPIClient: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private var requests: [APIEndpoint] = []

    func recordedRequests() -> [APIEndpoint] { requests }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        requests.append(endpoint)
        let data = Self.publishResponse
        return try WireJSON.decoder().decode(type, from: data)
    }

    private static let publishResponse = Data("""
    {
      "report_id": "report-9",
      "publication_no": 4,
      "published_at": "2026-10-21T00:00:00.000Z",
      "snapshot": {
        "student_id": "student-1",
        "month": "2026-10",
        "attendance": {"present": 5, "late": 1, "excused": 0, "absent": 0, "held_sessions": 6},
        "tests": [{"test_id": "test-1", "name": "Bài kiểm tra", "date": "2026-10-15", "max": 15, "value": 12}],
        "stars": {"three": 3, "two": 2, "one": 1},
        "homework": [{"kind": "vocabulary", "excellent": 2, "done": 1, "not_done": 0}],
        "general_comment": "Nhận xét chung",
        "ready": true
      }
    }
    """.utf8)
}
