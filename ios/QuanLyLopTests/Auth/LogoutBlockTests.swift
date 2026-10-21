import XCTest
@testable import QuanLyLop

/// Sign-out stays blocked while commands are pending (spec mục 5.3) and the dialog uses
/// the prototype's exact wording (`SettingsPage.tsx` `LogoutBlocked`).
final class LogoutBlockTests: XCTestCase {
    func testBlockedCopyMatchesPrototypeWhileSyncing() {
        XCTAssertEqual(LogoutBlock(pending: 1, online: true).message,
                       "Còn 1 thay đổi chưa đồng bộ. Hãy chờ đồng bộ xong rồi đăng xuất.")
        XCTAssertEqual(LogoutBlock(pending: 4, online: true).message,
                       "Còn 4 thay đổi chưa đồng bộ. Hãy chờ đồng bộ xong rồi đăng xuất.")
    }

    func testBlockedCopyMatchesPrototypeWhileOffline() {
        XCTAssertEqual(LogoutBlock(pending: 2, online: false).message,
                       "Còn 2 thay đổi chưa đồng bộ. Máy đang ngoại tuyến, đăng xuất bây giờ sẽ làm mất dữ liệu. Hãy kết nối mạng để đồng bộ rồi thử lại.")
    }

    func testPendingCommandsBlockSignOutBeforeAnyRequest() async throws {
        let store = try store(scope: CacheScope(userId: "user", workspaceId: "ws", membershipId: "member"))
        let key = RecordKey(entity: "score", k1: "test", k2: "student").storageKey
        try await store.write(Score(testId: "test", studentId: "student", value: 12.5, version: 3, updatedAt: "fixture"),
                              forKey: key, enqueueing: command(key, version: 2))
        let otherKey = RecordKey(entity: "score", k1: "test", k2: "other").storageKey
        try await store.write(Score(testId: "test", studentId: "other", value: 9, version: 1, updatedAt: "fixture"),
                              forKey: otherKey, enqueueing: command(otherKey, version: 0))
        let token = InMemoryTokenStore(token: "FIXTURE_NOT_A_REAL_TOKEN")
        // No fixtures: any request would fail with a different error, so the pending count
        // proves the block happens before the network call.
        let api = StubAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!, fixtures: [:])

        do {
            try await SessionController(api: api, tokenStore: token, store: store).logout()
            XCTFail("pending commands must block sign-out")
        } catch SessionFailure.pendingCommands(let count) {
            XCTAssertEqual(count, 2)
            XCTAssertTrue(LogoutBlock(pending: count, online: true).message.hasPrefix("Còn 2 thay đổi chưa đồng bộ."))
            let cached = try await store.read(Score.self, forKey: key)
            XCTAssertEqual(cached?.value, 12.5)
        }
        let preserved = await token.token()
        XCTAssertEqual(preserved, "FIXTURE_NOT_A_REAL_TOKEN")
    }

    func testSignOutClearsThePreviousUsersCacheAfterServerAcknowledgement() async throws {
        let store = try store(scope: CacheScope(userId: "user", workspaceId: "ws", membershipId: "member"))
        let key = RecordKey(entity: "score", k1: "test", k2: "student").storageKey
        try await store.write(Score(testId: "test", studentId: "student", value: 12.5, version: 3, updatedAt: "fixture"),
                              forKey: key, enqueueing: nil)
        try await store.apply(PullPage(cursor: 7, epoch: 2, hasMore: false, serverTime: "fixture", upserts: [:], deleted: []))
        let token = InMemoryTokenStore(token: "FIXTURE_NOT_A_REAL_TOKEN")
        let api = StubAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!, fixtures: [
            APIEndpoint(method: .post, path: "auth/logout"): Data()
        ])

        try await SessionController(api: api, tokenStore: token, store: store).logout()
        let cleared = await token.token()
        XCTAssertNil(cleared)
        let cached = try await store.read(Score.self, forKey: key)
        let position = try await store.position()
        XCTAssertNil(cached)
        XCTAssertNil(position)
    }

    private func store(scope: CacheScope) throws -> SQLiteStore {
        try SQLiteStore(path: ":memory:", scope: scope)
    }

    private func command(_ key: String, version: Int) -> PendingCommand {
        PendingCommand(recordKey: key, baseVersion: version, kind: "score.set", payload: .object([:]))
    }
}
