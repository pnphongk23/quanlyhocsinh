import XCTest
@testable import QuanLyLop

/// `SyncCoordinator` is the only writer of the offline-UX state: a failed sync and a rejected
/// command must each surface in the app frame, and a clean sync must clear it again.
final class SyncReportingTests: XCTestCase {
    let scope = CacheScope(userId: "status-user", workspaceId: "status-workspace", membershipId: "status-member")
    let deviceId = "status-device"
    let now = Date(timeIntervalSince1970: 1_000)

    private func store() throws -> SQLiteStore { try SQLiteStore(path: ":memory:", scope: scope) }
    private func baseURL() -> URL { URL(string: "https://fixture.invalid/v1")! }

    private func attendanceCommand(status: String = "present") -> PendingCommand {
        let key = RecordKey(entity: "attendance", k1: "session", k2: "student").storageKey
        return PendingCommand(recordKey: key, baseVersion: 0, kind: "attendance.set",
                              payload: .object(["session_id": .string("session"),
                                                "student_id": .string("student"),
                                                "status": .string(status),
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
                      body: PushRequest(membershipId: scope.membershipId, deviceId: deviceId, commands: [command.currentContract.wire])):
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

    func testUnknownSnapshotEntitiesAreIgnored() async throws {
        let store = try store()
        let manifest = Data(#"{"cursor":5,"epoch":3,"window":{"from":"2026-07-23","to":"2026-12-16"},"entities":["conflict","future_entity"]}"#.utf8)
        let pull = PullPage(cursor: 5, epoch: 3, hasMore: false, serverTime: "fixture", upserts: [:], deleted: [])
        let api = StubAPIClient(baseURL: baseURL(), fixtures: [
            .init(method: .get, path: "sync/snapshot", query: ["membership_id": scope.membershipId]): manifest,
            .init(method: .get, path: "sync/pull", query: ["membership_id": scope.membershipId, "cursor": "5", "epoch": "3", "limit": "200"]):
                try WireJSON.encoder().encode(pull)
        ])
        try await SyncCoordinator(api: api, store: store, deviceId: deviceId).synchronize(now: now)
        let position = try await store.position()
        XCTAssertEqual(position, SyncPosition(cursor: 5, epoch: 3))
    }

    func testConflictStatusIsInvalidAndReplaysTheSameUUID() async throws {
        let store = try store(), command = attendanceCommand()
        try await store.apply(PullPage(cursor: 5, epoch: 3, hasMore: false, serverTime: "fixture", upserts: [:], deleted: []))
        try await store.write(1, forKey: command.recordKey, enqueueing: command)
        let request = try APIEndpoint.json(method: .post, path: "sync/push",
            body: PushRequest(membershipId: scope.membershipId, deviceId: deviceId, commands: [command.wire]))
        let malformed = Data("{\"epoch\":3,\"cursor\":9,\"results\":[{\"id\":\"\(command.id.uuidString.lowercased())\",\"status\":\"conflict\"}]}".utf8)
        let pull = PullPage(cursor: 5, epoch: 3, hasMore: false, serverTime: "fixture", upserts: [:], deleted: [])
        let api = StubAPIClient(baseURL: baseURL(), fixtures: [
            request: malformed,
            .init(method: .get, path: "sync/pull", query: ["membership_id": scope.membershipId, "cursor": "5", "epoch": "3", "limit": "200"]):
                try WireJSON.encoder().encode(pull)
        ])
        do {
            try await SyncCoordinator(api: api, store: store, deviceId: deviceId).synchronize(now: now)
            XCTFail("unknown command statuses must fail decoding")
        } catch {}
        let replay = try await store.claimBatch(now: now.addingTimeInterval(10))
        XCTAssertEqual(replay.map(\.id), [command.id])
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

    func testAnOldExcusedAttendanceCommandGoesOutAsAbsentWithoutTheRemovedFields() async throws {
        let store = try store(), command = attendanceCommand(status: "excused")
        try await store.write(1, forKey: command.recordKey, enqueueing: command)
        let claimed = try await store.claimBatch(now: now)
        XCTAssertEqual(claimed.count, 1)
        guard case .object(let fields) = try XCTUnwrap(claimed.first).payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["status"], .string("absent"))
        XCTAssertNil(fields["late_at"])
        XCTAssertNil(fields["note"])
        XCTAssertEqual(fields["session_id"], .string("session"))
    }

    private func slipCommand(_ fields: [String: JSONValue]) -> PendingCommand {
        let key = RecordKey(entity: "slip", k1: "session", k2: "student").storageKey
        var payload: [String: JSONValue] = ["session_id": .string("session"), "student_id": .string("student")]
        payload.merge(fields) { _, new in new }
        return PendingCommand(recordKey: key, baseVersion: 0, kind: "slip.set", payload: .object(payload), createdAt: now)
    }

    private func claimedSlipFields(_ edits: [[String: JSONValue]]) async throws -> [String: JSONValue] {
        let store = try store()
        for edit in edits {
            let command = slipCommand(edit)
            try await store.write(1, forKey: command.recordKey, enqueueing: command)
        }
        let claimed = try await store.claimBatch(now: now)
        XCTAssertEqual(claimed.count, 1, "edits of one never-sent slip share one command")
        guard case .object(let fields) = try XCTUnwrap(claimed.first).payload else { XCTFail("payload is not an object"); return [:] }
        return fields
    }

    func testToggleAfterAHandEditedSentenceReplacesCriteriaAndSentenceInTheQueuedCommand() async throws {
        let fields = try await claimedSlipFields([
            ["criteria": .number(31), "comment": .string("Con học rất tốt."), "note": .string("Ghi chú")],
            ["criteria": .number(15), "comment": .string(SlipRules.generatedSentence(criteria: 15))]
        ])
        XCTAssertEqual(fields["criteria"], .number(15))
        XCTAssertEqual(fields["comment"], .string(SlipRules.generatedSentence(criteria: 15)))
        XCTAssertEqual(fields["note"], .string("Ghi chú"), "the note stays separate")
    }

    func testHandEditAfterAToggleKeepsTheCriteriaAndTheSentence() async throws {
        let fields = try await claimedSlipFields([
            ["criteria": .number(15), "comment": .string(SlipRules.generatedSentence(criteria: 15))],
            ["criteria": .number(15), "comment": .string("Con học rất tốt.")]
        ])
        XCTAssertEqual(fields["criteria"], .number(15))
        XCTAssertEqual(fields["comment"], .string("Con học rất tốt."))
    }

    func testANoteOnlyEditKeepsTheQueuedCriteriaAndSentence() async throws {
        let fields = try await claimedSlipFields([
            ["criteria": .number(15), "comment": .string("Con học rất tốt."), "hw_manual": .bool(true)],
            ["note": .string("Nhắc con ghi bài")]
        ])
        XCTAssertEqual(fields["criteria"], .number(15))
        XCTAssertEqual(fields["comment"], .string("Con học rất tốt."))
        XCTAssertEqual(fields["hw_manual"], .bool(true))
        XCTAssertEqual(fields["note"], .string("Nhắc con ghi bài"))
    }
}
