import XCTest
@testable import QuanLyLop

/// The automatic sync triggers: one pull per session entry (open/login/role change), and a push of
/// the pending outbox when the network comes back. `/me` runs at identity sync boundaries.
@MainActor
final class AuthSyncTriggerTests: XCTestCase {
    private func membership(_ id: String, scopeKind: ScopeKind = .assignedClasses) -> Membership {
        Membership(id: id, workspace: Workspace(id: "ws-\(id)", name: "W"),
                   role: Role(id: "role", name: "Teacher", systemKey: nil, scopeKind: scopeKind),
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

    /// One synchronize that has to send two batches (the outbox holds more than one request can carry)
    /// must pull after each push, not once at the end. The earlier two-session-write case above cannot
    /// see that: each of its syncs sent a single batch.
    func testOneSyncPullsAfterEveryPushWhenTwoBatchesGoOut() async throws {
        let only = membership("a")
        let api = SyncTriggerAPI(identity: identity(active: "a", memberships: [only]), pushSucceeds: true)
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        await model.synchronizeOnSessionEntry()
        guard let store = model.activeSQLiteStore else { return XCTFail("expected an active store") }
        // One more than the per-request limit, so this one synchronize pushes two batches.
        for index in 0..<51 {
            let key = RecordKey(entity: "score", k1: "test-\(index)", k2: "student").storageKey
            try await store.write(Score(testId: "test-\(index)", studentId: "student", value: 7,
                                        version: 0, updatedAt: "fixture"),
                                  forKey: key,
                                  enqueueing: PendingCommand(recordKey: key, baseVersion: 0,
                                                             kind: "score.set", payload: .object([:])))
        }

        let pushesBefore = await api.pushCalls()
        let pullsBefore = await api.pullCalls()
        await model.synchronizePendingCommandsIfNeeded()

        let order = await api.syncOrder()
        let steps = order.filter { $0 != "sync/snapshot" }
        XCTAssertEqual(Array(steps.suffix(5)), ["sync/push", "sync/pull", "sync/push", "sync/pull", "sync/pull"],
                       "each batch is followed by its own pull: \(order)")
        XCTAssertEqual(pushesBefore, 0)
        let pushes = await api.pushCalls()
        XCTAssertEqual(pushes, 2, "the 51 queued commands take two requests")
        let pulls = await api.pullCalls()
        XCTAssertEqual(pulls - pullsBefore, 3, "one pull after each batch plus the closing pull")
    }

    /// R3-1: a password sign-in used to leave the in-memory identity empty (`/me` was skipped for the
    /// entry sync), so the guardian page had nothing to load until some other screen refreshed `/me`.
    func testFreshGuardianLoginInstallsIdentitySoTheEntrySyncAndThePageWork() async throws {
        let guardian = membership("guardian", scopeKind: .linkedStudents)
        let current = identity(active: "guardian", memberships: [guardian])
        let session = AuthSession(token: "login-token", expiresAt: "2099-01-01T00:00:00.000Z",
                                  user: current.user, memberships: [guardian], activeMembershipId: "guardian")
        let api = SyncTriggerAPI(identity: current, loginSession: session)
        let model = AuthModel(configuration: .fallback, apiClient: api,
                              tokenStore: InMemoryTokenStore(),
                              identityStore: MemoryIdentityStore(nil),
                              storeFactory: { scope in try SQLiteStore(path: ":memory:", scope: scope) },
                              isOnline: { true })

        try await model.login(phone: "0900000000", password: "strong-pass-1")

        XCTAssertEqual(model.screen, .main)
        XCTAssertEqual(model.identity?.activeMembershipId, "guardian", "the sign-in response is installed as the identity")
        var meCalls = await api.meCalls()
        XCTAssertEqual(meCalls, 0, "a fresh sign-in does not read `/me` again")

        await model.synchronizeOnSessionEntry()

        meCalls = await api.meCalls()
        XCTAssertEqual(meCalls, 0, "the entry sync trusts the server-confirmed sign-in")
        guard let store = model.activeSQLiteStore else { return XCTFail("expected the guardian store") }
        XCTAssertTrue(model.hasSuccessfulSync(for: store.scope))
        let child = Student(id: "child", classId: "class", name: "Trần Gia Bảo", parentPhone: nil,
                            enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)
        try await store.write(child, forKey: RecordKey(entity: "student", k1: child.id, k2: "").storageKey,
                              enqueueing: nil)
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "guardian-login-identity-tests"))
        defaults.removePersistentDomain(forName: "guardian-login-identity-tests")
        let root = GuardianRootView(model: model, freshness: defaults) { identity, store, syncSucceeded in
            try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                              defaults: defaults, knownIdentity: identity, knownStore: store,
                                              synchronize: false, syncSucceeded: syncSucceeded,
                                              recordFreshness: false)
        }

        let loaded = await root.load()

        XCTAssertNotNil(loaded, "the page has an identity to load with")
        XCTAssertEqual(loaded?.dashboard?.children.map(\.student.id), ["child"])
        XCTAssertNil(loaded?.errorMessage, "the entry sync succeeded, so the cache is not shown as offline")
        defaults.removePersistentDomain(forName: "guardian-login-identity-tests")
    }

    /// R3-2: the manual refresh re-reads `/me`, which may switch the role, so the page must load with the
    /// identity AND the store installed after it instead of the store captured before the request.
    func testManualRefreshLoadsTheRoleAndStoreThatMeReturned() async throws {
        let old = membership("old")
        let new = membership("new", scopeKind: .linkedStudents)
        let api = SyncTriggerAPI(identities: [identity(active: "old", memberships: [old]),
                                              identity(active: "new", memberships: [new])])
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        XCTAssertEqual(model.identity?.activeMembershipId, "old")
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "guardian-manual-refresh-tests"))
        defaults.removePersistentDomain(forName: "guardian-manual-refresh-tests")
        var loadedIdentity: CurrentIdentity?
        var loadedScope: CacheScope?
        let root = GuardianRootView(model: model, freshness: defaults) { identity, store, syncSucceeded in
            loadedIdentity = identity
            loadedScope = store.scope
            return try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                                     defaults: defaults, knownIdentity: identity, knownStore: store,
                                                     synchronize: false, syncSucceeded: syncSucceeded,
                                                     recordFreshness: false)
        }

        _ = await root.load(manualSync: true)

        XCTAssertEqual(loadedIdentity?.activeMembershipId, "new", "the loader sees the role `/me` returned")
        XCTAssertEqual(loadedScope?.membershipId, "new")
        XCTAssertEqual(loadedScope, model.activeSQLiteStore?.scope, "the loader reads that role's own store")
        defaults.removePersistentDomain(forName: "guardian-manual-refresh-tests")
    }

    /// R3-3: a load that started earlier must not write over a newer one that already finished.
    func testSupersededLoadDoesNotReplaceTheNewerResult() async throws {
        let guardian = membership("guardian", scopeKind: .linkedStudents)
        let api = SyncTriggerAPI(identity: identity(active: "guardian", memberships: [guardian]))
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        await model.synchronizeOnSessionEntry()
        guard let store = model.activeSQLiteStore else { return XCTFail("expected the guardian store") }
        let scope = store.scope
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "guardian-superseded-load-tests"))
        defaults.removePersistentDomain(forName: "guardian-superseded-load-tests")
        GuardianFreshness.record(scope, at: Date(timeIntervalSince1970: 1_700_000_000), defaults: defaults)
        let html = Student(id: "child", classId: "class", name: "Trần Gia Bảo", parentPhone: nil,
                           enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)
        try await store.write(html, forKey: RecordKey(entity: "student", k1: html.id, k2: "").storageKey,
                              enqueueing: nil)
        let gate = PauseGate()
        var loads = 0
        let root = GuardianRootView(model: model, freshness: defaults) { identity, store, syncSucceeded in
            loads += 1
            if loads == 1 { await gate.pauseUntilReleased() }
            return try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                                     defaults: defaults, knownIdentity: identity, knownStore: store,
                                                     synchronize: false, syncSucceeded: syncSucceeded,
                                                     recordFreshness: false)
        }

        let older = Task { await root.load() }
        await gate.waitUntilEntered()
        let newer = await root.load()
        // The older load reads a cache the newer one never saw, so it would be visible if it won.
        let second = Student(id: "second", classId: "class", name: "Trần Gia Ngọc", parentPhone: nil,
                             enrolledAt: "2026-10-02", leftAt: nil, status: .active, version: 1)
        try await store.write(second, forKey: RecordKey(entity: "student", k1: second.id, k2: "").storageKey,
                              enqueueing: nil)
        await gate.release()
        let olderResult = await older.value

        XCTAssertNil(olderResult, "a superseded load applies nothing")
        XCTAssertEqual(newer?.dashboard?.children.map(\.student.id), ["child"])
        XCTAssertEqual(root.loads.dashboard?.children.map(\.student.id), ["child"],
                       "the screen keeps the newer result")
        XCTAssertEqual(root.loads.dashboard?.updatedAt, newer?.dashboard?.updatedAt)
        defaults.removePersistentDomain(forName: "guardian-superseded-load-tests")
    }

    /// R3-3b: when the newer sync failed, the older (successful) result arriving later must not make the
    /// cache look fresher than the last successful refresh.
    func testLateSuccessfulLoadDoesNotRaiseFreshnessAfterANewerFailedSync() async throws {
        let guardian = membership("guardian", scopeKind: .linkedStudents)
        let api = SyncTriggerAPI(identity: identity(active: "guardian", memberships: [guardian]))
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        await model.synchronizeOnSessionEntry()
        guard let store = model.activeSQLiteStore else { return XCTFail("expected the guardian store") }
        let scope = store.scope
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "guardian-late-freshness-tests"))
        defaults.removePersistentDomain(forName: "guardian-late-freshness-tests")
        let oldDate = Date(timeIntervalSince1970: 1_700_000_000)
        GuardianFreshness.record(scope, at: oldDate, defaults: defaults)
        let gate = PauseGate()
        var loads = 0
        let root = GuardianRootView(model: model, freshness: defaults) { identity, store, syncSucceeded in
            loads += 1
            if loads == 1 { await gate.pauseUntilReleased() }
            return try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                                     defaults: defaults, knownIdentity: identity, knownStore: store,
                                                     synchronize: false, syncSucceeded: syncSucceeded,
                                                     recordFreshness: false)
        }

        let older = Task { await root.load() }
        await gate.waitUntilEntered()
        await api.failSync(true)
        _ = await model.synchronizeWhileActive()
        let newer = await root.load()
        await gate.release()
        let olderResult = await older.value

        XCTAssertNil(olderResult, "the late result is dropped")
        XCTAssertTrue(try XCTUnwrap(newer?.dashboard).isOffline)
        XCTAssertEqual(newer?.dashboard?.updatedAt, oldDate)
        XCTAssertEqual(root.loads.dashboard?.updatedAt, oldDate)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults), oldDate,
                       "a superseded load does not record a refresh")
        defaults.removePersistentDomain(forName: "guardian-late-freshness-tests")
    }

    /// The refresh time belongs to the load the screen accepts. The older read finishes, the newer sync
    /// fails, and only then does the older load reach the point where it would record its time: it must
    /// not move the time, which stays at the last successful refresh.
    func testSupersededReadDoesNotMoveTheRefreshTimeAfterANewerFailedSync() async throws {
        let guardian = membership("guardian", scopeKind: .linkedStudents)
        let api = SyncTriggerAPI(identity: identity(active: "guardian", memberships: [guardian]))
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        await model.synchronizeOnSessionEntry()
        guard let store = model.activeSQLiteStore else { return XCTFail("expected the guardian store") }
        let scope = store.scope
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "guardian-read-freshness-tests"))
        defaults.removePersistentDomain(forName: "guardian-read-freshness-tests")
        let oldDate = Date(timeIntervalSince1970: 1_700_000_000)
        GuardianFreshness.record(scope, at: oldDate, defaults: defaults)
        let gate = PauseGate()
        var loads = 0
        let root = GuardianRootView(model: model, freshness: defaults) { identity, store, syncSucceeded in
            loads += 1
            let dashboard = try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                                              defaults: defaults, knownIdentity: identity,
                                                              knownStore: store, synchronize: false,
                                                              syncSucceeded: syncSucceeded, recordFreshness: false)
            // The read is done and this result counts as refreshed; the screen has not committed it yet.
            if loads == 1 { await gate.pauseUntilReleased() }
            return dashboard
        }

        let older = Task { await root.load() }
        await gate.waitUntilEntered()
        await api.failSync(true)
        _ = await model.synchronizeWhileActive()
        let newer = await root.load()
        await gate.release()
        let olderResult = await older.value

        XCTAssertNil(olderResult, "the dropped load writes nothing")
        XCTAssertTrue(try XCTUnwrap(newer?.dashboard).isOffline)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults), oldDate,
                       "a load a newer one replaced must not make the cache look freshly updated")
        XCTAssertEqual(root.loads.dashboard?.updatedAt, oldDate)
        defaults.removePersistentDomain(forName: "guardian-read-freshness-tests")
    }

    /// The spinner belongs to the newest load: an older load finishing while the newer one still reads
    /// must not hide it.
    func testSupersededLoadDoesNotDropTheNewerLoadSpinner() async throws {
        let guardian = membership("guardian", scopeKind: .linkedStudents)
        let api = SyncTriggerAPI(identity: identity(active: "guardian", memberships: [guardian]))
        let model = makeModel(api: api, online: true)
        await model.restoreSession()
        await model.synchronizeOnSessionEntry()
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "guardian-load-spinner-tests"))
        defaults.removePersistentDomain(forName: "guardian-load-spinner-tests")
        let gates = [PauseGate(), PauseGate()]
        var loads = 0
        let root = GuardianRootView(model: model, freshness: defaults) { identity, store, syncSucceeded in
            let gate = gates[min(loads, gates.count - 1)]
            loads += 1
            await gate.pauseUntilReleased()
            return try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                                     defaults: defaults, knownIdentity: identity, knownStore: store,
                                                     synchronize: false, syncSucceeded: syncSucceeded,
                                                     recordFreshness: false)
        }

        let older = Task { await root.load() }
        await gates[0].waitUntilEntered()
        let newer = Task { await root.load() }
        await gates[1].waitUntilEntered()
        XCTAssertTrue(root.loads.isLoading, "both loads are waiting on the cache")

        await gates[0].release()
        _ = await older.value
        XCTAssertNil(root.loads.dashboard, "the superseded load applied nothing")
        XCTAssertTrue(root.loads.isLoading, "the older load must not end the newer load's spinner")

        await gates[1].release()
        _ = await newer.value
        XCTAssertFalse(root.loads.isLoading)
        defaults.removePersistentDomain(forName: "guardian-load-spinner-tests")
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
        let gate = PauseGate()
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
        let root = GuardianRootView(model: model, freshness: defaults) { identity, store, syncSucceeded in
            do {
                return try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity),
                                                         defaults: defaults, knownIdentity: identity, knownStore: store,
                                                         synchronize: false, syncSucceeded: syncSucceeded,
                                                         recordFreshness: false)
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
        let failedGate = PauseGate()
        let failedAPI = SyncTriggerAPI(identity: guardian, snapshotGate: failedGate, snapshotFails: true)
        let failedModel = makeModel(api: failedAPI, online: true)
        await failedModel.restoreSession()
        let failedRoot = GuardianRootView(model: failedModel, freshness: defaults) { identity, store, syncSucceeded in
            try await GuardianRepository.load(api: failedAPI, identityStore: MemoryIdentityStore(identity),
                                              defaults: defaults, knownIdentity: identity, knownStore: store,
                                              synchronize: false, syncSucceeded: syncSucceeded,
                                              recordFreshness: false)
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

/// Serves `/me`, sign-in, role switching and an empty-but-successful sync feed, counting the sync requests.
private actor SyncTriggerAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private var identity: CurrentIdentity
    private let identityResponses: [CurrentIdentity]
    private let loginSession: AuthSession?
    private let pushSucceeds: Bool
    private let snapshotGate: PauseGate?
    private var snapshotFails: Bool
    /// Fails pulls too, for a sync that must lose after the cache position is already stored.
    private var syncFails = false
    private var snapshots = 0
    private var pulls = 0
    private var pushes = 0
    private var mes = 0
    private var syncRequests: [String] = []
    private var syncMembershipRequests: [String] = []

    init(identity: CurrentIdentity, pushSucceeds: Bool = false, snapshotGate: PauseGate? = nil,
         snapshotFails: Bool = false, loginSession: AuthSession? = nil) {
          self.identity = identity
          self.identityResponses = []
          self.loginSession = loginSession
          self.pushSucceeds = pushSucceeds
          self.snapshotGate = snapshotGate
          self.snapshotFails = snapshotFails
    }
    init(identities: [CurrentIdentity]) {
        self.identity = identities[0]
          self.identityResponses = identities
          self.loginSession = nil
          self.pushSucceeds = false
          self.snapshotGate = nil
          self.snapshotFails = false
    }

    func failSync(_ fail: Bool) { syncFails = fail }

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
          case "auth/login":
              guard let loginSession else { throw APIFailure.offline }
              return try encode(loginSession)
          case let path where path.hasSuffix("/reports"):
              return try encode(StudentReportFixture())
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
              if syncFails { throw APIFailure.offline }
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

private actor PauseGate {
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

/// An empty published-report list for the guardian history read.
private struct StudentReportFixture: Encodable {
    let items: [String] = []
    let nextCursor: String? = nil
}
