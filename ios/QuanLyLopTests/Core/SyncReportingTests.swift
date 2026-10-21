import XCTest
@testable import QuanLyLop

/// `SyncCoordinator` is the only writer of the offline-UX state: a failed sync and a rejected
/// command must each surface in the app frame, a clean sync must clear it again, and a legacy
/// `conflict` result must stay invisible (last write wins, `api-spec.md` mục 6).
final class SyncReportingTests: XCTestCase {
    let scope = CacheScope(userId: "status-user", workspaceId: "status-workspace", membershipId: "status-member")
    let deviceId = "status-device"
    let now = Date(timeIntervalSince1970: 1_000)

    private func store() throws -> SQLiteStore { try SQLiteStore(path: ":memory:", scope: scope) }
    private func baseURL() -> URL { URL(string: "https://fixture.invalid/v1")! }

    private func attendanceCommand() -> PendingCommand {
        let key = RecordKey(entity: "attendance", k1: "session", k2: "student").storageKey
        return PendingCommand(recordKey: key, baseVersion: 0, kind: "attendance.set",
                              payload: .object(["session_id": .string("session"),
                                                "student_id": .string("student"),
                                                "status": .string("present"),
                                                "late_at": .null,
                                                "note": .string("")]),
                              createdAt: now)
    }

    private func fixtures(command: PendingCommand, result: CommandResult) throws -> [APIEndpoint: Data] {
        let manifest = Data(#"{"cursor":5,"epoch":3,"window":{"from":"2026-07-23","to":"2026-12-16"},"entities":[]}"#.utf8)
        let page = PullPage(cursor: 5, epoch: 3, hasMore: false, serverTime: "2026-10-21T11:20:00.000Z", upserts: [:], deleted: [])
        return [
            .init(method: .get, path: "sync/snapshot", query: ["membership_id": scope.membershipId]): manifest,
            try .json(method: .post, path: "sync/push",
                      body: PushRequest(membershipId: scope.membershipId, deviceId: deviceId, commands: [command.wire])):
                try WireJSON.encoder().encode(PushResponse(epoch: 3, cursor: 9, results: [result])),
            .init(method: .get, path: "sync/pull",
                  query: ["membership_id": scope.membershipId, "cursor": "5", "epoch": "3", "limit": "200"]):
                try WireJSON.encoder().encode(page)
        ]
    }

    func testRejectedCommandShowsTheSaveError() async throws {
        let store = try store(), center = SyncStatusCenter(), command = attendanceCommand()
        try await store.write(1, forKey: command.recordKey, enqueueing: command)
        let api = StubAPIClient(baseURL: baseURL(), fixtures: try fixtures(command: command,
            result: CommandResult(id: command.id, status: .rejected,
                                  error: APIError(code: "forbidden", message: nil, details: nil, requestId: nil))))
        try await SyncCoordinator(api: api, store: store, deviceId: deviceId, status: center).synchronize(now: now)
        let rejected = try await store.rejectedCommandCount()
        XCTAssertEqual(rejected, 1)
        XCTAssertEqual(center.state, .error)
        XCTAssertEqual(center.rejectedCommandCount, 1)
    }

    func testLegacyConflictIsAcknowledgedLikeAppliedAndStaysQuiet() async throws {
        let store = try store(), center = SyncStatusCenter(), command = attendanceCommand()
        try await store.write(1, forKey: command.recordKey, enqueueing: command)
        let api = StubAPIClient(baseURL: baseURL(), fixtures: try fixtures(command: command,
            result: CommandResult(id: command.id, status: .conflict, version: 4)))
        try await SyncCoordinator(api: api, store: store, deviceId: deviceId, status: center).synchronize(now: now)
        // The server keeps the other device's value; the outbox row is done and nothing is flagged.
        let pending = try await store.pendingCommandCount()
        XCTAssertEqual(pending, 0)
        XCTAssertEqual(center.state, .synced)
    }

    func testFailedSyncShowsErrorAndALaterCleanSyncClearsIt() async throws {
        let store = try store(), center = SyncStatusCenter(), command = attendanceCommand()
        do {
            // No fixtures at all: the first request fails, exactly like being offline.
            try await SyncCoordinator(api: StubAPIClient(baseURL: baseURL()), store: store,
                                      deviceId: deviceId, status: center).synchronize(now: now)
            XCTFail("a sync without fixtures must fail")
        } catch {}
        XCTAssertEqual(center.state, .error)

        let api = StubAPIClient(baseURL: baseURL(), fixtures: try fixtures(command: command,
            result: CommandResult(id: command.id, status: .applied, version: 1)))
        try await store.write(1, forKey: command.recordKey, enqueueing: command)
        try await SyncCoordinator(api: api, store: store, deviceId: deviceId, status: center).synchronize(now: now)
        XCTAssertEqual(center.state, .synced)
    }

    func testCleanSyncKeepsTheAppFrameQuiet() async throws {
        let store = try store(), center = SyncStatusCenter(), command = attendanceCommand()
        try await store.write(1, forKey: command.recordKey, enqueueing: command)
        let api = StubAPIClient(baseURL: baseURL(), fixtures: try fixtures(command: command,
            result: CommandResult(id: command.id, status: .duplicate, originalStatus: .applied)))
        try await SyncCoordinator(api: api, store: store, deviceId: deviceId, status: center).synchronize(now: now)
        XCTAssertEqual(center.state, .synced)
        let pending = try await store.pendingCommandCount()
        XCTAssertEqual(pending, 0)
    }
}
