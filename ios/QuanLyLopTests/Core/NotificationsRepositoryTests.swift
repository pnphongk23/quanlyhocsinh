import XCTest
@testable import QuanLyLop

final class NotificationsRepositoryTests: XCTestCase {
    private let baseURL = URL(string: "https://fixture.invalid/v1")!

    func testListEncodesCursorAndDecodesNotificationPage() async throws {
        let endpoint = APIEndpoint(method: .get, path: "notifications",
                                   query: ["limit": "12", "cursor": "n3"])
        let response = Data(#"""
        {"items":[
          {"id":124,"kind":"slip_sent","student_id":"stu_1","session_id":"ses_3","report_id":null,"test_id":null,"created_at":"2026-10-21T11:30:00.000Z","read_at":null},
          {"id":125,"kind":"report_published","student_id":"stu_1","session_id":null,"report_id":"rep_1","test_id":null,"created_at":"2026-10-31T10:00:00.000Z","read_at":"2026-11-01T10:00:00.000Z"}
        ],"next_cursor":"n2"}
        """#.utf8)
        let repository = NotificationsRepository(api: StubAPIClient(baseURL: baseURL, fixtures: [endpoint: response]))

        let page = try await repository.list(limit: 12, cursor: "n3")

        XCTAssertEqual(page.nextCursor, "n2")
        XCTAssertEqual(page.items.map(\.id), [124, 125])
        XCTAssertEqual(page.items[0].sessionId, "ses_3")
        XCTAssertNil(page.items[0].reportId)
        XCTAssertEqual(page.items[1].reportId, "rep_1")
        XCTAssertEqual(page.items[1].readAt, "2026-11-01T10:00:00.000Z")
    }

    func testListOmitsMissingCursor() async throws {
        let endpoint = APIEndpoint(method: .get, path: "notifications", query: ["limit": "50"])
        let response = Data(#"{"items":[],"next_cursor":null}"#.utf8)
        let repository = NotificationsRepository(api: StubAPIClient(baseURL: baseURL, fixtures: [endpoint: response]))

        let page = try await repository.list()

        XCTAssertTrue(page.items.isEmpty)
        XCTAssertNil(page.nextCursor)
    }

    func testMarkReadEncodesUpToIDAndDecodesUpdatedCount() async throws {
        let endpoint = try APIEndpoint.json(method: .post, path: "notifications/read",
                                            body: ReadRequest(upToID: 125))
        let repository = NotificationsRepository(api: StubAPIClient(
            baseURL: baseURL, fixtures: [endpoint: Data(#"{"updated":2}"#.utf8)]))

        let result = try await repository.markRead(upToID: 125)

        XCTAssertEqual(result.updated, 2)
    }

    private struct ReadRequest: Encodable { let upToID: Int }
}
