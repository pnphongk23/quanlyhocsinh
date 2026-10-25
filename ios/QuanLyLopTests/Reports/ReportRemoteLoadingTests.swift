import XCTest
@testable import QuanLyLop

/// The teacher's report screens must not depend on the 90-day sync window: sessions, batches and
/// reports come from the list endpoints, with pagination followed to the end.
private func sessionJSON(_ id: String, _ date: String, status: String = "held", number: Int?) -> String {
    let value = number.map(String.init) ?? "null"
    return """
    {"id":"\(id)","class_id":"c1","date":"\(date)","start_time":"18:00","origin":"recurring","is_makeup":false,
     "status":"\(status)","note":null,"session_number":\(value),"version":1}
    """
}

@MainActor
final class ReportRemoteLoadingTests: XCTestCase {
    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")

    private func store() throws -> SQLiteStore { try SQLiteStore(path: ":memory:", scope: scope) }

    func testFullSessionListFollowsServerCursorAndDrivesTheDefaultRange() async throws {
        let api = RouteAPI { endpoint in
            switch (endpoint.path, endpoint.query["cursor"]) {
            case ("classes/c1/sessions", nil):
                return "{\"items\":[\(sessionJSON("s1", "2026-05-01", status: "cancelled", number: nil)),\(sessionJSON("s2", "2026-05-08", number: 1))],\"next_cursor\":\"page2\"}"
            case ("classes/c1/sessions", "page2"):
                return "{\"items\":[\(sessionJSON("s3", "2026-10-20", number: 2))],\"next_cursor\":null}"
            case ("classes/c1/report-batches", _):
                return "{\"items\":[]}"
            default: return nil
            }
        }
        let data = I4FeatureStore(store: try store(), api: api)

        let failure = await data.loadClassReports(classID: "c1")

        XCTAssertNil(failure)
        XCTAssertTrue(data.hasFullSessions("c1"))
        let range = ReportRangeRules.defaultRange(data.reportSessions(in: "c1"), classID: "c1")
        XCTAssertEqual(range?.from.id, "s2")
        XCTAssertEqual(range?.to.id, "s3")
        XCTAssertEqual(ReportRangeRules.choices(data.reportSessions(in: "c1"), classID: "c1").map(\.number), [1, 2])
    }

    func testBatchesAndTheirReportsAreCachedWithRestFlags() async throws {
        let api = RouteAPI { endpoint in
            switch endpoint.path {
            case "classes/c1/sessions":
                return "{\"items\":[\(sessionJSON("s1", "2026-01-05", number: 1))],\"next_cursor\":null}"
            case "classes/c1/report-batches":
                return """
                {"items":[{"id":"b-old","class_id":"c1","from_session_id":"s1","to_session_id":"s1","from_key":"2026-01-05 18:00",
                           "to_key":"2026-01-05 18:00","from_number":1,"to_number":1,
                           "counts":{"total":1,"draft":0,"published":1,"needs_republish":1},"created_at":"2026-01-06T00:00:00.000Z"}]}
                """
            case "report-batches/b-old/reports":
                return """
                {"batch":{"id":"b-old","class_id":"c1","from_session_id":"s1","to_session_id":"s1","from_key":"2026-01-05 18:00","to_key":"2026-01-05 18:00"},
                 "items":[{"report_id":"r1","batch_id":"b-old","student_id":"st1","student_name":"An","month":"2026-01","status":"published",
                           "general_comment":"Tốt","needs_republish":1,"publication_count":1,"published_at":"2026-01-06T00:00:00.000Z","version":3}]}
                """
            default: return nil
            }
        }
        let data = I4FeatureStore(store: try store(), api: api)

        let failure = await data.loadClassReports(classID: "c1")

        XCTAssertNil(failure)
        XCTAssertEqual(data.batches(in: "c1").map(\.id), ["b-old"])
        let reports = data.reports(batchID: "b-old")
        XCTAssertEqual(reports.map(\.id), ["r1"])
        XCTAssertEqual(reports.first?.needsRepublish, true)
        XCTAssertEqual(reports.first?.status, .published)
    }

    func testListFailureIsReportedNotTurnedIntoAnEmptyList() async throws {
        let api = RouteAPI { _ in nil }
        let data = I4FeatureStore(store: try store(), api: api)

        let failure = await data.loadClassReports(classID: "c1")

        XCTAssertNotNil(failure)
        XCTAssertFalse(data.hasFullSessions("c1"))
    }

    func testBatchesStillLoadWhenTheRoleCannotReadSessions() async throws {
        let api = RouteAPI(
            route: { endpoint in
                switch endpoint.path {
                case "classes/c1/report-batches":
                    return """
                    {"items":[{"id":"b1","class_id":"c1","from_session_id":null,"to_session_id":null,"from_key":"2026-01-05 18:00",
                               "to_key":"2026-01-30 18:00","counts":{"total":0,"draft":0,"published":0,"needs_republish":0}}]}
                    """
                case "report-batches/b1/reports":
                    return "{\"batch\":{\"id\":\"b1\",\"class_id\":\"c1\",\"from_session_id\":null,\"to_session_id\":null,\"from_key\":\"2026-01-05 18:00\",\"to_key\":\"2026-01-30 18:00\"},\"items\":[]}"
                default: return nil
                }
            },
            failures: ["classes/c1/sessions": 403])
        let data = I4FeatureStore(store: try store(), api: api)

        let failure = await data.loadClassReports(classID: "c1")

        XCTAssertNil(failure)
        XCTAssertEqual(data.batches(in: "c1").map(\.id), ["b1"])
        XCTAssertFalse(data.hasFullSessions("c1"))
        XCTAssertEqual(data.sessionListFailure["c1"], String(localized: "reports.error.sessionsForbidden", table: "Reports"))
    }

    func testBatchDetailKeepsServerPreviewReadiness() async throws {
        let api = RouteAPI { endpoint in
            switch endpoint.path {
            case "report-batches/b1/reports":
                return """
                {"batch":{"id":"b1","class_id":"c1","from_session_id":null,"to_session_id":null,"from_key":"2026-01-05 18:00","to_key":"2026-01-30 18:00"},
                 "items":[{"report_id":"r1","batch_id":"b1","student_id":"st1","month":"2026-01","status":"draft","general_comment":"",
                           "needs_republish":0,"publication_count":0,"published_at":null,"version":1}]}
                """
            case "reports/r1/preview":
                return """
                {"student_id":"st1","batch_id":"b1","ready":false,"general_comment":"","missing":["comment"],
                 "attendance":{"present":3,"late":0,"excused":0,"absent":0,"held_sessions":3},
                 "stars":{"three":1,"two":0,"one":0},"homework":[],"tests":[]}
                """
            default: return nil
            }
        }
        let data = I4FeatureStore(store: try store(), api: api)

        let failure = await data.loadBatchDetail(batchID: "b1")

        XCTAssertNil(failure)
        XCTAssertEqual(data.previews["r1"]?.ready, false)
        XCTAssertEqual(data.previews["r1"]?.missing, ["comment"])
        XCTAssertEqual(data.reports(batchID: "b1").first?.needsRepublish, false)
    }
}

/// Answers each endpoint from a closure; a path the closure does not know fails like an offline call.
struct RouteAPI: APIClient {
    let baseURL = URL(string: "https://fixture.invalid/v1")!
    let route: @Sendable (APIEndpoint) -> String?
    /// Paths answered with a server error of this status (e.g. 403 for a missing permission).
    let failures: [String: Int]

    init(route: @escaping @Sendable (APIEndpoint) -> String?, failures: [String: Int] = [:]) {
        self.route = route
        self.failures = failures
    }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        if let status = failures[endpoint.path] {
            throw APIFailure.server(status: status, error: APIError(code: "forbidden", message: nil, details: nil, requestId: nil),
                                    retryAfter: nil)
        }
        guard let json = route(endpoint) else { throw APIFailure.offline }
        do { return try WireJSON.decoder().decode(type, from: Data(json.utf8)) }
        catch { throw APIFailure.decoding }
    }
}
