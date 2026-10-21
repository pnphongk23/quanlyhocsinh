import XCTest
@testable import QuanLyLop

final class ReportPDFUploadTests: XCTestCase {
    private let pdf = Data("%PDF-1.7 tháng 10".utf8)

    func testEndpointFollowsPublicationContract() {
        let endpoint = ReportPDFUpload.endpoint(reportId: "report-1", publicationNo: 3, pdf: pdf)

        XCTAssertEqual(endpoint.method, .put)
        XCTAssertEqual(endpoint.path, "reports/report-1/publications/3/pdf")
        XCTAssertEqual(endpoint.contentType, "application/pdf")
        XCTAssertEqual(endpoint.body, pdf)
        XCTAssertTrue(endpoint.requiresAuthentication)
        XCTAssertTrue(endpoint.query.isEmpty)
    }

    func testUploadSendsOneBinaryRequest() async throws {
        let api = RecordingAPIClient()
        try await ReportPDFUpload.upload(pdf: pdf, reportId: "report-1", publicationNo: 2, api: api)
        let requests = await api.recordedRequests()

        XCTAssertEqual(requests.count, 1)
        XCTAssertEqual(requests.first?.method, .put)
        XCTAssertEqual(requests.first?.path, "reports/report-1/publications/2/pdf")
        XCTAssertEqual(requests.first?.contentType, "application/pdf")
        XCTAssertEqual(requests.first?.body, pdf)
    }

    func testUploadAcceptsExactlyTheFiveMegabyteLimit() async throws {
        let api = RecordingAPIClient()
        let boundary = Data(repeating: 0x20, count: ReportPDFUpload.maximumBytes)
        try await ReportPDFUpload.upload(pdf: boundary, reportId: "report-1", publicationNo: 1, api: api)
        let requests = await api.recordedRequests()

        XCTAssertEqual(requests.count, 1)
        XCTAssertEqual(requests.first?.body?.count, ReportPDFUpload.maximumBytes)
    }

    func testUploadRejectsPDFLargerThanFiveMegabytesBeforeSending() async {
        let api = RecordingAPIClient()
        let tooLarge = Data(repeating: 0x20, count: ReportPDFUpload.maximumBytes + 1)

        do {
            try await ReportPDFUpload.upload(pdf: tooLarge, reportId: "report-1", publicationNo: 1, api: api)
            XCTFail("Expected the size guard to reject a PDF above 5 MB")
        } catch let error as ReportPDFUploadError {
            XCTAssertEqual(error, .pdfTooLarge(bytes: tooLarge.count))
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
        let requests = await api.recordedRequests()
        XCTAssertTrue(requests.isEmpty)
    }

    @MainActor
    func testPublishUploadsTheRenderedPDF() async throws {
        let scope = CacheScope(userId: "user", workspaceId: "workspace", membershipId: "member")
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let api = RecordingAPIClient()
        let data = I4FeatureStore(store: store, api: api)
        let student = Student(id: "student-1", classId: "class-1", name: "Học sinh", parentPhone: nil,
                              enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)

        let outcome = await data.publish(student: student, month: "2026-10")
        XCTAssertEqual(outcome, .published(publicationNo: 4))

        let requests = await api.recordedRequests()
        let upload = requests.first { $0.contentType == "application/pdf" }
        XCTAssertNotNil(upload)
        XCTAssertEqual(upload?.method, .put)
        XCTAssertEqual(upload?.path, "reports/report-9/publications/4/pdf")
        XCTAssertTrue(upload?.body?.starts(with: Data("%PDF".utf8)) ?? false)
        XCTAssertNotNil(requests.first { $0.method == .post })
    }
}

/// Records every endpoint and answers the publish flow with synthetic data.
private actor RecordingAPIClient: APIClient {
    nonisolated let baseURL = URL(string: "https://staging.invalid/v1")!
    private var requests: [APIEndpoint] = []

    func recordedRequests() -> [APIEndpoint] { requests }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        requests.append(endpoint)
        let data = responseBody(for: endpoint)
        if data.isEmpty, let empty = EmptyResponse() as? Response { return empty }
        return try WireJSON.decoder().decode(type, from: data)
    }

    private func responseBody(for endpoint: APIEndpoint) -> Data {
        if endpoint.contentType == "application/pdf" { return Data() }
        if endpoint.method == .post { return Self.publishResponse }
        if endpoint.method == .put { return Data("{}".utf8) }
        return Data()
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
