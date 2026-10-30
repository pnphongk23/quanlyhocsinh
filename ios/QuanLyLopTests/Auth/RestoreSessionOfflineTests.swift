import XCTest
@testable import QuanLyLop

@MainActor
final class RestoreSessionOfflineTests: XCTestCase {
    private let scope = CacheScope(userId: "offline-user", workspaceId: "offline-workspace", membershipId: "offline-member")
    private var clock = Date(timeIntervalSince1970: 1_800_000_000)

    func testNetworkFailureUsesCachedIdentityAndRetriesMeWhenOnline() async throws {
        let identity = fixtureIdentity()
        let cache = MemoryIdentityStore(identity)
        let token = InMemoryTokenStore(token: "fixture-session")
        let api = AuthFixtureAPI(meResults: [.failure(.offline), .failure(.offline)])
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let model = makeModel(api: api, token: token, cache: cache, store: store, online: true)

        await model.restoreSession()

        XCTAssertEqual(model.screen, .main)
        XCTAssertEqual(model.identity, identity)
        XCTAssertNotNil(model.activeStoreForLogout)
        XCTAssertNil(model.message)

        await model.synchronizeWhileActive()
        let meCalls = await api.meCallCount()
        XCTAssertEqual(meCalls, 1)
    }

    func testMeRevalidationIsThrottledToTenMinutesAndPull401ForcesIt() async throws {
        let identity = fixtureIdentity()
        let data = try WireJSON.encoder().encode(identity)
        let api = AuthFixtureAPI(meResults: [.success(data), .success(data), .success(data)])
        let model = makeModel(api: api, token: InMemoryTokenStore(token: "fixture-session"), cache: MemoryIdentityStore(identity),
                              store: try SQLiteStore(path: ":memory:", scope: scope), online: true)
        await model.restoreSession()
        await model.synchronizeWhileActive()
        var calls = await api.meCallCount()
        XCTAssertEqual(calls, 1)
        clock = clock.addingTimeInterval(10 * 60 + 1)
        await model.synchronizeWhileActive()
        calls = await api.meCallCount()
        XCTAssertEqual(calls, 2)
    }

    func testPull401ImmediatelyRevalidatesIdentity() async throws {
        let data = try WireJSON.encoder().encode(fixtureIdentity())
        let api = AuthFixtureAPI(meResults: [.success(data), .success(data)],
            syncError: .server(status: 401, error: APIError(code: "unauthorized", message: nil, details: nil, requestId: nil), retryAfter: nil))
        let model = makeModel(api: api, token: InMemoryTokenStore(token: "fixture-session"), cache: MemoryIdentityStore(fixtureIdentity()),
                              store: try SQLiteStore(path: ":memory:", scope: scope), online: true)
        await model.restoreSession()
        await model.synchronizeWhileActive()
        let calls = await api.meCallCount()
        XCTAssertEqual(calls, 2)
    }

    func testUnauthorizedRestoreClearsTokenAndCachedIdentity() async throws {
        let cache = MemoryIdentityStore(fixtureIdentity())
        let token = InMemoryTokenStore(token: "fixture-session")
        let api = AuthFixtureAPI(meResults: [.failure(.server(status: 401,
            error: APIError(code: "unauthorized", message: nil, details: nil, requestId: nil), retryAfter: nil))])
        let model = makeModel(api: api, token: token, cache: cache, store: try SQLiteStore(path: ":memory:", scope: scope), online: false)

        await model.restoreSession()

        XCTAssertEqual(model.screen, .login)
        let savedToken = await token.token()
        let cachedIdentity = await cache.load()
        XCTAssertNil(savedToken)
        XCTAssertNil(cachedIdentity)
    }

    func testRevokedMembershipHidesCacheAndKeepsQueuedCommands() async throws {
        let identity = fixtureIdentity()
        let cache = MemoryIdentityStore(identity)
        let token = InMemoryTokenStore(token: "fixture-session")
        let api = AuthFixtureAPI(meResults: [.failure(.offline), .failure(.server(status: 403,
            error: APIError(code: "forbidden", message: nil, details: nil, requestId: nil), retryAfter: nil))])
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let key = RecordKey(entity: "score", k1: "fixture-test", k2: "fixture-student").storageKey
        try await store.write(Score(testId: "fixture-test", studentId: "fixture-student", value: 7,
                                    version: 0, updatedAt: "fixture"), forKey: key,
                             enqueueing: PendingCommand(recordKey: key, baseVersion: 0, kind: "score.set", payload: .object([:])))
        let model = makeModel(api: api, token: token, cache: cache, store: store, online: true)

        await model.restoreSession()
        clock = clock.addingTimeInterval(10 * 60 + 1)
        await model.synchronizeWhileActive()

        XCTAssertEqual(model.screen, .login)
        XCTAssertNil(model.identity?.activeMembershipId)
        XCTAssertTrue(model.identity?.memberships.isEmpty == true)
        let cachedIdentity = await cache.load()
        let pendingCount = try await store.pendingCommandCount()
        XCTAssertNil(cachedIdentity?.activeMembershipId)
        XCTAssertTrue(cachedIdentity?.memberships.isEmpty == true)
        XCTAssertEqual(pendingCount, 1)
    }

    func testRevokedMembershipClearsTheSaveErrorOfTheCutOffSession() async throws {
        let center = SyncStatusCenter()
        center.record(syncFailed: true, rejectedCommands: 0)
        let api = AuthFixtureAPI(meResults: [.failure(.offline), .failure(.server(status: 403,
            error: APIError(code: "account_disabled", message: nil, details: nil, requestId: nil), retryAfter: nil))])
        let model = makeModel(api: api, token: InMemoryTokenStore(token: "fixture-session"), cache: MemoryIdentityStore(fixtureIdentity()),
                              store: try SQLiteStore(path: ":memory:", scope: scope), online: true, status: center)
        await model.restoreSession()
        XCTAssertEqual(center.state, .error)

        clock = clock.addingTimeInterval(10 * 60 + 1)
        await model.synchronizeWhileActive()

        XCTAssertEqual(model.screen, .login)
        XCTAssertEqual(center.state, .synced)
    }

    func testExpiredTokenClearsTheSaveErrorOfTheCutOffSession() async throws {
        let center = SyncStatusCenter()
        center.record(syncFailed: true, rejectedCommands: 0)
        let api = AuthFixtureAPI(meResults: [.failure(.server(status: 401,
            error: APIError(code: "unauthorized", message: nil, details: nil, requestId: nil), retryAfter: nil))])
        let model = makeModel(api: api, token: InMemoryTokenStore(token: "fixture-session"), cache: MemoryIdentityStore(fixtureIdentity()),
                              store: try SQLiteStore(path: ":memory:", scope: scope), online: false, status: center)

        await model.restoreSession()

        XCTAssertEqual(model.screen, .login)
        XCTAssertEqual(center.state, .synced)
    }

    func testLogoutClearsTokenAndCachedIdentitySoReopeningShowsLogin() async throws {
        let cache = MemoryIdentityStore(fixtureIdentity())
        let token = InMemoryTokenStore(token: "fixture-session")
        let api = AuthFixtureAPI(meResults: [.failure(.offline)])
        let model = makeModel(api: api, token: token, cache: cache, store: try SQLiteStore(path: ":memory:", scope: scope), online: true)
        await model.restoreSession()
        XCTAssertEqual(model.screen, .main)

        await model.logout()

        XCTAssertEqual(model.screen, .login)
        XCTAssertNil(model.identity)
        let savedToken = await token.token()
        let cachedIdentity = await cache.load()
        XCTAssertNil(savedToken)
        XCTAssertNil(cachedIdentity)

        // A fresh launch finds neither token nor identity, so it cannot restore the old session.
        let reopened = makeModel(api: AuthFixtureAPI(meResults: []), token: token, cache: cache,
                                 store: try SQLiteStore(path: ":memory:", scope: scope), online: true)
        await reopened.restoreSession()
        XCTAssertEqual(reopened.screen, .login)
        XCTAssertNil(reopened.identity)
    }

    func testNetworkFailureWithoutCachedIdentityShowsLogin() async throws {
        let cache = MemoryIdentityStore(nil)
        let token = InMemoryTokenStore(token: "fixture-session")
        let api = AuthFixtureAPI(meResults: [.failure(.offline)])
        let model = makeModel(api: api, token: token, cache: cache, store: try SQLiteStore(path: ":memory:", scope: scope), online: false)

        await model.restoreSession()

        XCTAssertEqual(model.screen, .login)
        XCTAssertNil(model.identity)
    }

    private func makeModel(api: AuthFixtureAPI, token: InMemoryTokenStore, cache: MemoryIdentityStore,
                           store: SQLiteStore, online: Bool, status: SyncStatusCenter = .shared) -> AuthModel {
        AuthModel(configuration: .fallback, apiClient: api, tokenStore: token,
                  identityStore: cache, storeFactory: { _ in store }, isOnline: { online }, syncStatus: status,
                  now: { self.clock })
    }

    private func fixtureIdentity() -> CurrentIdentity {
        let user = User(id: "offline-user", phone: "0900000000", displayName: "Fixture User", mustChangePassword: false)
        let role = Role(id: "fixture-role", name: "Teacher", systemKey: nil, scopeKind: .assignedClasses)
        let membership = Membership(id: "offline-member", workspace: Workspace(id: "offline-workspace", name: "Fixture Workspace"),
                                    role: role, status: "active", scopeEpoch: 1, permissions: [:])
        return CurrentIdentity(user: user, activeMembershipId: membership.id, memberships: [membership])
    }
}

private actor MemoryIdentityStore: CachedIdentityStore {
    private var value: CurrentIdentity?
    init(_ identity: CurrentIdentity?) { value = identity }
    func load() -> CurrentIdentity? { value }
    func save(_ identity: CurrentIdentity) { value = identity }
    func clear() { value = nil }
}

private actor AuthFixtureAPI: APIClient {
    let baseURL = URL(string: "https://fixture.invalid/v1")!
    private var meResults: [Result<Data, APIFailure>]
    private(set) var calls = 0
    private let syncError: APIFailure?

    init(meResults: [Result<Data, APIFailure>], syncError: APIFailure? = nil) {
        self.meResults = meResults
        self.syncError = syncError
    }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
          if endpoint.path == "auth/logout" { return try WireJSON.decoder().decode(type, from: Data("{}".utf8)) }
          if endpoint.path.hasPrefix("sync/") { throw syncError ?? APIFailure.offline }
        guard endpoint.path == "me" else { throw APIFailure.offline }
        calls += 1
        guard !meResults.isEmpty else { throw APIFailure.offline }
        switch meResults.removeFirst() {
        case .success(let data): return try WireJSON.decoder().decode(type, from: data)
        case .failure(let error): throw error
        }
    }

    func meCallCount() -> Int { calls }
}
