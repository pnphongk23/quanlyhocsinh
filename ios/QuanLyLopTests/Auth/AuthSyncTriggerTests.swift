import XCTest
@testable import QuanLyLop

/// The automatic sync triggers: one pull per session entry (open/login/role change), and a push of
/// the pending outbox when the network comes back. `/me` runs at identity sync boundaries.
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
          XCTAssertEqual(meCount, 2, "session entry revalidates identity before using its coordinator")
          XCTAssertTrue(model.hasSuccessfulSync(for: try XCTUnwrap(model.activeSQLiteStore).scope))

        // Role change opens a new store/scope, so the next entry sync runs again.
        let switched = await model.selectMembership(second)
          XCTAssertTrue(switched)
          await model.synchronizeOnSessionEntry()
          snapshots = await api.snapshotCalls()
          XCTAssertEqual(snapshots, 2, "a role change is a new session entry and syncs once")
          let meCalls = await api.meCalls()
          XCTAssertEqual(meCalls, 3)
          XCTAssertTrue(model.hasSuccessfulSync(for: try XCTUnwrap(model.activeSQLiteStore).scope))
      }

      func testChangedRoleFromMeNeverSyncsThePreviousMembership() async throws {
          let old = membership("old"), new = membership("new")
          let api = SyncTriggerAPI(identities: [
              identity(active: "old", memberships: [old, new]),
              identity(active: "new", memberships: [new])
          ])
          let model = makeModel(api: api, online: true)

          await model.restoreSession()
          await model.synchronizeOnSessionEntry()

          XCTAssertEqual(model.identity?.activeMembershipId, "new")
          let syncMemberships = await api.syncMemberships()
          XCTAssertEqual(syncMemberships, ["new", "new"])
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

      func testSuccessfulPushIsFollowedByPullAndRefreshCanRunAgainInSameSession() async throws {
          let only = membership("a")
          let api = SyncTriggerAPI(identity: identity(active: "a", memberships: [only]), pushSucceeds: true)
          let model = makeModel(api: api, online: true)
          await model.restoreSession()
          guard let store = model.activeSQLiteStore else { return XCTFail("expected an active store") }
          let key = RecordKey(entity: "score", k1: "test", k2: "student").storageKey
          try await store.write(Score(testId: "test", studentId: "student", value: 7, version: 0, updatedAt: "fixture"),
                                forKey: key,
                                enqueueing: PendingCommand(recordKey: key, baseVersion: 0, kind: "score.set", payload: .object([:])))

          await model.synchronizePendingCommandsIfNeeded()
          let orderAfterPush = await api.syncOrder()
          let pushIndex = try XCTUnwrap(orderAfterPush.firstIndex(of: "sync/push"))
          XCTAssertEqual(orderAfterPush.dropFirst(pushIndex + 1).first, "sync/pull")
          let pullsAfterPush = await api.pullCalls()

          let firstRefresh = await model.synchronizeWhileActive()
          let secondRefresh = await model.synchronizeWhileActive()
          XCTAssertTrue(firstRefresh.succeeded)
          XCTAssertTrue(secondRefresh.succeeded)
          let pullsAfterRefresh = await api.pullCalls()
          XCTAssertEqual(pullsAfterRefresh, pullsAfterPush + 2)
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
    private var identity: CurrentIdentity
    private let identityResponses: [CurrentIdentity]
    private let pushSucceeds: Bool
    private var snapshots = 0
    private var pulls = 0
    private var pushes = 0
    private var mes = 0
    private var syncRequests: [String] = []
    private var syncMembershipRequests: [String] = []

    init(identity: CurrentIdentity, pushSucceeds: Bool = false) {
        self.identity = identity
        self.identityResponses = []
        self.pushSucceeds = pushSucceeds
    }
    init(identities: [CurrentIdentity]) {
        self.identity = identities[0]
        self.identityResponses = identities
        self.pushSucceeds = false
    }

    func snapshotCalls() -> Int { snapshots }
    func pullCalls() -> Int { pulls }
    func pushCalls() -> Int { pushes }
    func meCalls() -> Int { mes }
    func syncOrder() -> [String] { syncRequests }
    func syncMemberships() -> [String] { syncMembershipRequests }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        func encode<T: Encodable>(_ value: T) throws -> Response {
            try WireJSON.decoder().decode(type, from: WireJSON.encoder().encode(value))
        }
          switch endpoint.path {
          case "me":
              let response = identityResponses.isEmpty ? identity : identityResponses[min(mes, identityResponses.count - 1)]
              mes += 1
              return try encode(response)
          case "session/membership":
              let body = try WireJSON.decoder().decode(JSONValue.self, from: endpoint.body ?? Data())
              let requested = body["membership_id"]?.string ?? ""
              identity = CurrentIdentity(user: identity.user, activeMembershipId: requested, memberships: identity.memberships)
              return try encode(MembershipSelection(activeMembershipId: requested, deviceRegistrationCleared: true))
          case "sync/snapshot":
              syncRequests.append(endpoint.path)
              syncMembershipRequests.append(endpoint.query["membership_id"] ?? "")
              snapshots += 1
              return try encode(SnapshotManifest(cursor: 0, epoch: 1, window: .init(from: "2026-07-01", to: "2026-12-01"), entities: []))
          case "sync/pull":
              syncRequests.append(endpoint.path)
              syncMembershipRequests.append(endpoint.query["membership_id"] ?? "")
              pulls += 1
              return try encode(PullPage(cursor: 0, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [:], deleted: []))
          case "sync/push":
              pushes += 1
              syncRequests.append(endpoint.path)
              syncMembershipRequests.append(endpoint.query["membership_id"] ?? "")
              guard pushSucceeds, let body = endpoint.body else { throw APIFailure.offline }
              let request = try WireJSON.decoder().decode(PushFixtureRequest.self, from: body)
              let results = request.commands.map { CommandResult(id: $0.id, status: .applied) }
              return try encode(PushResponse(epoch: 1, cursor: 0, results: results))
        default:
            throw APIFailure.offline
        }
    }
}

private struct PushFixtureRequest: Decodable {
    let commands: [PushFixtureCommand]
}

private struct PushFixtureCommand: Decodable {
    let id: UUID
}
