import XCTest
@testable import QuanLyLop

/// The automatic sync triggers: one pull per session entry (open/login/role change), and a push of
/// the pending outbox when the network comes back. `/me` stays throttled and is never a per-tick call.
@MainActor
final class AuthSyncTriggerTests: XCTestCase {
    private var clock = Date(timeIntervalSince1970: 1_800_000_000)

    private func membership(_ id: String) -> Membership {
        Membership(id: id, workspace: Workspace(id: "ws-\(id)", name: "W"),
                   role: Role(id: "role", name: "Teacher", systemKey: nil, scopeKind: .assignedClasses),
                   status: "active", scopeEpoch: 1, permissions: [:])
    }

    private func identity(active: String, memberships: [Membership]) -> CurrentIdentity {
        CurrentIdentity(user: User(id: "sync-user", phone: "0900000000", displayName: "Fixture", mustChangePassword: false),
                        activeMembershipId: active, memberships: memberships)
    }

    private func makeModel(api: SyncTriggerAPI, online: Bool) -> AuthModel {
        AuthModel(configuration: .fallback, apiClient: api,
                  tokenStore: InMemoryTokenStore(token: "fixture-session"),
                  identityStore: MemoryIdentityStore(nil),
                  storeFactory: { scope in try SQLiteStore(path: ":memory:", scope: scope) },
                  isOnline: { online }, now: { self.clock })
    }

    func testSessionEntrySyncsOncePerScopeAndAgainAfterRoleChange() async throws {
        let first = membership("a"), second = membership("b")
        let api = SyncTriggerAPI(identity: identity(active: "a", memberships: [first, second]))
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        XCTAssertEqual(model.screen, .main)

        // App open: the entry sync runs once even if the screen/role observers fire again.
        await model.synchronizeOnSessionEntry()
        await model.synchronizeOnSessionEntry()
        var snapshots = await api.snapshotCalls()
        let meCount = await api.meCalls()
        XCTAssertEqual(snapshots, 1, "one pull per session entry, not one per repeated callback")
        XCTAssertEqual(meCount, 1, "restoreSession's /me is not repeated by the entry sync within 10 minutes")

        // Role change opens a new store/scope, so the next entry sync runs again.
        let switched = await model.selectMembership(second)
        XCTAssertTrue(switched)
        await model.synchronizeOnSessionEntry()
        snapshots = await api.snapshotCalls()
        XCTAssertEqual(snapshots, 2, "a role change is a new session entry and syncs once")
    }

    func testPendingCommandsPushOnlyWhenThereIsSomethingToSendAndNetworkIsBack() async throws {
        let only = membership("a")
        let api = SyncTriggerAPI(identity: identity(active: "a", memberships: [only]))
        var online = false
        let model = AuthModel(configuration: .fallback, apiClient: api,
                              tokenStore: InMemoryTokenStore(token: "fixture-session"),
                              identityStore: MemoryIdentityStore(nil),
                              storeFactory: { scope in try SQLiteStore(path: ":memory:", scope: scope) },
                              isOnline: { online }, now: { self.clock })
        await model.restoreSession()
        guard let store = model.activeSQLiteStore else { return XCTFail("expected an active store") }

        let key = RecordKey(entity: "score", k1: "test", k2: "student").storageKey
        try await store.write(Score(testId: "test", studentId: "student", value: 7, version: 0, updatedAt: "fixture"),
                              forKey: key,
                              enqueueing: PendingCommand(recordKey: key, baseVersion: 0, kind: "score.set", payload: .object([:])))

        // Offline: nothing is attempted.
        await model.synchronizePendingCommandsIfNeeded()
        var pushes = await api.pushCalls()
        XCTAssertEqual(pushes, 0, "no push while offline")

        // Network back: the outbox is pushed straight away.
        online = true
        await model.synchronizePendingCommandsIfNeeded()
        pushes = await api.pushCalls()
        XCTAssertEqual(pushes, 1, "the outbox is pushed once when the network returns")
    }
}

private actor MemoryIdentityStore: CachedIdentityStore {
    private var value: CurrentIdentity?
    init(_ identity: CurrentIdentity?) { value = identity }
    func load() -> CurrentIdentity? { value }
    func save(_ identity: CurrentIdentity) { value = identity }
    func clear() { value = nil }
}

/// Serves `/me`, role switching and an empty-but-successful sync feed, counting the sync requests.
private actor SyncTriggerAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let identity: CurrentIdentity
    private var snapshots = 0
    private var pulls = 0
    private var pushes = 0
    private var mes = 0

    init(identity: CurrentIdentity) { self.identity = identity }

    func snapshotCalls() -> Int { snapshots }
    func pullCalls() -> Int { pulls }
    func pushCalls() -> Int { pushes }
    func meCalls() -> Int { mes }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        func encode<T: Encodable>(_ value: T) throws -> Response {
            try WireJSON.decoder().decode(type, from: WireJSON.encoder().encode(value))
        }
        switch endpoint.path {
        case "me":
            mes += 1
            return try encode(identity)
        case "session/membership":
            let body = try WireJSON.decoder().decode(JSONValue.self, from: endpoint.body ?? Data())
            let requested = body["membership_id"]?.string ?? ""
            return try encode(MembershipSelection(activeMembershipId: requested, deviceRegistrationCleared: true))
        case "sync/snapshot":
            snapshots += 1
            return try encode(SnapshotManifest(cursor: 0, epoch: 1, window: .init(from: "2026-07-01", to: "2026-12-01"), entities: []))
        case "sync/pull":
            pulls += 1
            return try encode(PullPage(cursor: 0, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [:], deleted: []))
        case "sync/push":
            pushes += 1
            // The trigger under test only cares that a push was attempted; the outbox stays queued.
            throw APIFailure.offline
        default:
            throw APIFailure.offline
        }
    }
}
