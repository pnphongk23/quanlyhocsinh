import XCTest
@testable import QuanLyLop

/// The automatic sync triggers: one pull per session entry (open/login/role change), and a push of
/// the pending outbox when the network comes back. `/me` runs at identity sync boundaries.
@MainActor
final class AuthSyncTriggerTests: XCTestCase {
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
                    isOnline: { online })
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
          XCTAssertEqual(meCount, 1, "restore already validated the identity used for entry sync")
          XCTAssertTrue(model.hasSuccessfulSync(for: try XCTUnwrap(model.activeSQLiteStore).scope))

          _ = await model.synchronizeWhileActive()
          let meAfterManualRefresh = await api.meCalls()
          XCTAssertEqual(meAfterManualRefresh, 2, "a manual refresh revalidates identity")

          // Role change opens a new store/scope, so the next entry sync runs again.
        let switched = await model.selectMembership(second)
          XCTAssertTrue(switched)
          await model.synchronizeOnSessionEntry()
          snapshots = await api.snapshotCalls()
          XCTAssertEqual(snapshots, 2, "a role change is a new session entry and syncs once")
          let meCalls = await api.meCalls()
          XCTAssertEqual(meCalls, 2, "role selection validates the new active membership")
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
        _ = await model.synchronizeWhileActive()

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
                                isOnline: { online })
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

    func testEverySuccessfulPushIsFollowedByPullAcrossTwoBatchesInOneSession() async throws {
          let only = membership("a")
          let api = SyncTriggerAPI(identity: identity(active: "a", memberships: [only]), pushSucceeds: true)
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        await model.synchronizeOnSessionEntry()
        guard let store = model.activeSQLiteStore else { return XCTFail("expected an active store") }
        func enqueueScore(_ value: Double) async throws {
            let key = RecordKey(entity: "score", k1: "test", k2: "student").storageKey
            try await store.write(Score(testId: "test", studentId: "student", value: value, version: 0, updatedAt: "fixture"),
                                  forKey: key,
                                  enqueueing: PendingCommand(recordKey: key, baseVersion: 0, kind: "score.set", payload: .object([:])))
        }

        try await enqueueScore(7)
        await model.synchronizePendingCommandsIfNeeded()
        try await enqueueScore(8)
        await model.synchronizePendingCommandsIfNeeded()

        let order = await api.syncOrder()
        let pushes = order.indices.filter { order[$0] == "sync/push" }
        XCTAssertEqual(pushes.count, 2, "a second write in the same session is not blocked by the entry gate")
        let pullAfterEachPush = pushes.allSatisfy { index in
            order.dropFirst(index + 1).first == "sync/pull"
        }
        XCTAssertTrue(pullAfterEachPush, "each push is immediately followed by its pull: \(order)")
        XCTAssertLessThan(pushes[0], pushes[1])
        XCTAssertEqual(order[pushes[0] + 1], "sync/pull")
        XCTAssertEqual(order[pushes[1] + 1], "sync/pull")
        let pushCount = await api.pushCalls()
        let pullCount = await api.pullCalls()
        XCTAssertEqual(pushCount, 2)
        XCTAssertGreaterThanOrEqual(pullCount, 3)
    }

    func testGuardianEntrySyncCompletionRefreshesOfflineDashboardAndFailureKeepsFreshness() async throws {
        let only = Membership(id: "guardian", workspace: Workspace(id: "ws-guardian", name: "W"),
                              role: Role(id: "role", name: "Guardian", systemKey: nil, scopeKind: .linkedStudents),
                              status: "active", scopeEpoch: 1, permissions: [:])
        let guardian = identity(active: "guardian", memberships: [only])
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "guardian-entry-sync-tests"))
        defaults.removePersistentDomain(forName: "guardian-entry-sync-tests")
        let oldDate = Date(timeIntervalSince1970: 1_700_000_000)
        let scope = CacheScope(userId: guardian.user.id, workspaceId: only.workspace.id, membershipId: only.id)
        let gate = SyncGate()
        let api = SyncTriggerAPI(identity: guardian, snapshotGate: gate)
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        XCTAssertEqual(model.screen, .main)
        XCTAssertEqual(model.identity?.activeMembershipId, "guardian")
        XCTAssertEqual(model.activeMembership?.role.scopeKind, .linkedStudents)
        XCTAssertTrue(model.isSyncEligible)
        XCTAssertNotNil(model.activeSQLiteStore)
        GuardianFreshness.record(scope, at: oldDate, defaults: defaults)
        var loadFailure: String?
        let root = GuardianRootView(model: model) { identity, store, syncSucceeded in
            do {
                return try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                                         defaults: defaults, knownIdentity: identity, knownStore: store,
                                                         synchronize: false, syncSucceeded: syncSucceeded)
            } catch {
                loadFailure = String(describing: error)
                throw error
            }
        }

        let entry = Task { await model.synchronizeOnSessionEntry() }
        await gate.waitUntilEntered()
        let initialLoad = await root.load()
        XCTAssertNil(loadFailure, "guardian load failed: \(loadFailure ?? "")")
        XCTAssertTrue(initialLoad?.dashboard?.isOffline == true)
        XCTAssertNotNil(initialLoad?.errorMessage)
        XCTAssertEqual(initialLoad?.dashboard?.updatedAt, oldDate)

        await gate.release()
        await entry.value
        let refreshedLoad = await root.syncRevisionDidChange()
        XCTAssertFalse(try XCTUnwrap(refreshedLoad?.dashboard).isOffline)
        XCTAssertNil(refreshedLoad?.errorMessage)
        XCTAssertNotEqual(refreshedLoad?.dashboard?.updatedAt, oldDate)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults)?.timeIntervalSince1970 ?? 0,
                       refreshedLoad?.dashboard?.updatedAt?.timeIntervalSince1970 ?? -1, accuracy: 0.01)

        defaults.removePersistentDomain(forName: "guardian-entry-sync-tests")
        GuardianFreshness.record(scope, at: oldDate, defaults: defaults)
        let failedGate = SyncGate()
        let failedAPI = SyncTriggerAPI(identity: guardian, snapshotGate: failedGate, snapshotFails: true)
        let failedModel = makeModel(api: failedAPI, online: true)
        await failedModel.restoreSession()
        let failedRoot = GuardianRootView(model: failedModel) { identity, store, syncSucceeded in
            try await GuardianRepository.load(api: failedAPI, identityStore: MemoryIdentityStore(identity),
                                              defaults: defaults, knownIdentity: identity, knownStore: store,
                                              synchronize: false, syncSucceeded: syncSucceeded)
        }
        let failedEntry = Task { await failedModel.synchronizeOnSessionEntry() }
        await failedGate.waitUntilEntered()
        _ = await failedRoot.load()
        await failedGate.release()
        await failedEntry.value
        let failedLoad = await failedRoot.syncRevisionDidChange()
        XCTAssertTrue(try XCTUnwrap(failedLoad?.dashboard).isOffline)
        XCTAssertNotNil(failedLoad?.errorMessage)
        XCTAssertEqual(failedLoad?.dashboard?.updatedAt, oldDate)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults), oldDate)
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
    private let snapshotGate: SyncGate?
    private let snapshotFails: Bool
    private var snapshots = 0
    private var pulls = 0
    private var pushes = 0
    private var mes = 0
    private var syncRequests: [String] = []
    private var syncMembershipRequests: [String] = []

    init(identity: CurrentIdentity, pushSucceeds: Bool = false, snapshotGate: SyncGate? = nil,
         snapshotFails: Bool = false) {
          self.identity = identity
          self.identityResponses = []
          self.pushSucceeds = pushSucceeds
          self.snapshotGate = snapshotGate
          self.snapshotFails = snapshotFails
    }
    init(identities: [CurrentIdentity]) {
        self.identity = identities[0]
          self.identityResponses = identities
          self.pushSucceeds = false
          self.snapshotGate = nil
          self.snapshotFails = false
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
              if let snapshotGate { await snapshotGate.pauseUntilReleased() }
              if snapshotFails { throw APIFailure.offline }
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

private actor SyncGate {
    private var entered = false
    private var released = false
    private var entryContinuation: CheckedContinuation<Void, Never>?
    private var releaseContinuation: CheckedContinuation<Void, Never>?

    func pauseUntilReleased() async {
        entered = true
        entryContinuation?.resume()
        entryContinuation = nil
        guard !released else { return }
        await withCheckedContinuation { releaseContinuation = $0 }
    }

    func waitUntilEntered() async {
        guard !entered else { return }
        await withCheckedContinuation { entryContinuation = $0 }
    }

    func release() {
        released = true
        releaseContinuation?.resume()
        releaseContinuation = nil
    }
}

private struct PushFixtureRequest: Decodable {
    let commands: [PushFixtureCommand]
}

private struct PushFixtureCommand: Decodable {
    let id: UUID
}
