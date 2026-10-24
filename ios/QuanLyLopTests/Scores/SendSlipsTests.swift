import XCTest
@testable import QuanLyLop

@MainActor
final class SendSlipsTests: XCTestCase {
    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")

    private func slip(_ studentID: String, stars: Int, note: String) -> JSONValue {
        .object(["session_id": .string("session"), "student_id": .string(studentID), "stars": .number(Double(stars)),
                 "note": .string(note), "status": .string("draft"), "sent_at": .null,
                 "version": .number(1), "updated_at": .string("2026-10-25T10:00:00.000Z")])
    }

    private func seededStore() async throws -> SQLiteStore {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture",
                                       upserts: ["slip": [slip("a", stars: 3, note: "Tốt"), slip("b", stars: 2, note: "Khá")]],
                                       deleted: []))
        return store
    }

    func testUnconfirmedSendLeavesNoCommandAndRestoresSlips() async throws {
        let store = try await seededStore()
        let data = I4FeatureStore(store: store, api: SendSlipsAPI(confirmsPush: false))
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])

        guard case .failed = outcome else { return XCTFail("expected failure, got \(outcome)") }
        let pending = try await store.pendingCommands()
        XCTAssertFalse(pending.contains { $0.kind == "slip.send" })
        let slips = data.slips(sessionID: "session")
        XCTAssertEqual(slips.count, 2)
        XCTAssertTrue(slips.allSatisfy { $0.status != .sent && $0.sentAt == nil })
        XCTAssertEqual(slips.first { $0.studentId == "a" }?.note, "Tốt")
        XCTAssertEqual(slips.first { $0.studentId == "b" }?.stars, .two)
    }

    func testConfirmedSendReportsSentAndEmptiesQueue() async throws {
        let store = try await seededStore()
        let data = I4FeatureStore(store: store, api: SendSlipsAPI(confirmsPush: true))
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])

        XCTAssertEqual(outcome, .sent(2))
        let pending = try await store.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
    }
}

private actor SendSlipsAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let confirmsPush: Bool

    init(confirmsPush: Bool) { self.confirmsPush = confirmsPush }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        guard confirmsPush else { throw APIFailure.offline }
        let json: String
        switch endpoint.path {
        case "sync/push":
            let body = try JSONSerialization.jsonObject(with: endpoint.body ?? Data()) as? [String: Any]
            let commands = body?["commands"] as? [[String: Any]] ?? []
            let results = commands.compactMap { $0["id"] as? String }.map { "{\"id\":\"\($0)\",\"status\":\"applied\"}" }
            json = "{\"epoch\":1,\"cursor\":1,\"results\":[\(results.joined(separator: ","))]}"
        case "sync/pull":
            json = "{\"cursor\":1,\"epoch\":1,\"has_more\":false,\"server_time\":\"fixture\",\"upserts\":{},\"deleted\":[]}"
        default:
            throw APIFailure.offline
        }
        return try WireJSON.decoder().decode(type, from: Data(json.utf8))
    }
}
