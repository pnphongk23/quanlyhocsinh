import XCTest
@testable import QuanLyLop

/// A guardian who opens the app without a network still reads the data cached on the last sync,
/// together with when it was refreshed.
final class GuardianOfflineLoadTests: XCTestCase {
    private let scope = CacheScope(userId: "guardian-user", workspaceId: "workspace", membershipId: "guardian")
    private var defaults: UserDefaults!

    override func setUp() {
        defaults = UserDefaults(suiteName: "guardian-offline-load-tests")
        defaults.removePersistentDomain(forName: "guardian-offline-load-tests")
    }

    private func identity(scopeKind: ScopeKind = .linkedStudents) -> CurrentIdentity {
        let user = User(id: scope.userId, phone: "0900000000", displayName: "Fixture Guardian", mustChangePassword: false)
        let role = Role(id: "role", name: "Guardian", systemKey: nil, scopeKind: scopeKind)
        let membership = Membership(id: scope.membershipId, workspace: Workspace(id: scope.workspaceId, name: "Fixture"),
                                    role: role, status: "active", scopeEpoch: 1, permissions: [:])
        return CurrentIdentity(user: user, activeMembershipId: membership.id, memberships: [membership])
    }

    private func syncedStore() async throws -> SQLiteStore {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        try await store.installSnapshot([:], position: SyncPosition(cursor: 1, epoch: 1))
        let student = Student(id: "child", classId: "class", name: "Trần Gia Bảo", parentPhone: nil,
                              enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)
        try await store.write(student, forKey: RecordKey(entity: "student", k1: student.id, k2: "").storageKey, enqueueing: nil)
        return store
    }

    func testOfflineMeFallsBackToCachedIdentityAndCachedData() async throws {
        let store = try await syncedStore()
        let refreshed = Date(timeIntervalSince1970: 1_700_000_000)
        GuardianFreshness.record(scope, at: refreshed, defaults: defaults)

        let dashboard = try await GuardianRepository.load(
            api: RouteAPI { _ in nil }, identityStore: MemoryIdentityStore(identity()),
            storeFactory: { _ in store }, defaults: defaults)

        XCTAssertTrue(dashboard.isOffline)
        XCTAssertEqual(dashboard.updatedAt, refreshed)
        XCTAssertEqual(dashboard.children.map(\.student.id), ["child"])
        let kept = try await store.records(Student.self, entity: "student")
        XCTAssertEqual(kept.count, 1)
    }

    func testFailedPullAndSuccessfulReportHistoryKeepOldFreshness() async throws {
        let store = try await syncedStore()
        let refreshed = Date(timeIntervalSince1970: 1_700_000_000)
        GuardianFreshness.record(scope, at: refreshed, defaults: defaults)
        let api = RouteAPI { endpoint in
            endpoint.path == "students/child/reports" ? #"{"items":[],"next_cursor":null}"# : nil
        }

        let dashboard = try await GuardianRepository.load(
            api: api, identityStore: MemoryIdentityStore(identity()), storeFactory: { _ in store },
            defaults: defaults, knownIdentity: identity(), knownStore: store, synchronize: true)

        XCTAssertTrue(dashboard.isOffline)
        XCTAssertEqual(dashboard.updatedAt, refreshed)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults), refreshed)
    }

    func testEmptyCacheWithFailedSyncDoesNotRecordFreshness() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)

        do {
            _ = try await GuardianRepository.load(
            api: RouteAPI { _ in nil }, identityStore: MemoryIdentityStore(identity()),
                storeFactory: { _ in store }, defaults: defaults, knownIdentity: identity(),
                knownStore: store, synchronize: true)
            XCTFail("a failed initial snapshot should be reported")
        } catch {
            XCTAssertEqual(error as? APIFailure, .offline)
        }
      XCTAssertNil(GuardianFreshness.last(scope, defaults: defaults))
    }

    func testLoadWithoutSyncAndFalseResultKeepsOldFreshnessWhenHistorySucceeds() async throws {
        let store = try await syncedStore()
        let oldDate = Date(timeIntervalSince1970: 1_700_000_000)
        GuardianFreshness.record(scope, at: oldDate, defaults: defaults)
        let api = RouteAPI { endpoint in
            endpoint.path == "students/child/reports" ? #"{"items":[],"next_cursor":null}"# : nil
        }

        let dashboard = try await GuardianRepository.load(
            api: api, identityStore: MemoryIdentityStore(identity()), storeFactory: { _ in store },
            defaults: defaults, knownIdentity: identity(), knownStore: store,
            synchronize: false, syncSucceeded: false)

        XCTAssertTrue(dashboard.isOffline)
        XCTAssertEqual(dashboard.updatedAt, oldDate)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults), oldDate)
    }

    func testLoadWithoutSyncAndFalseResultWithEmptyCacheDoesNotRecordFreshness() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let api = RouteAPI { _ in nil }

        let dashboard = try await GuardianRepository.load(
            api: api, identityStore: MemoryIdentityStore(identity()), storeFactory: { _ in store },
            defaults: defaults, knownIdentity: identity(), knownStore: store,
            synchronize: false, syncSucceeded: false)

        XCTAssertTrue(dashboard.isOffline)
        XCTAssertNil(dashboard.updatedAt)
        XCTAssertNil(GuardianFreshness.last(scope, defaults: defaults))
    }

    func testLoadWithoutSyncAndSuccessfulResultUpdatesFreshnessWhenHistorySucceeds() async throws {
        let store = try await syncedStore()
        let oldDate = Date(timeIntervalSince1970: 1_700_000_000)
        GuardianFreshness.record(scope, at: oldDate, defaults: defaults)
        let api = RouteAPI { endpoint in
            endpoint.path == "students/child/reports" ? #"{"items":[],"next_cursor":null}"# : nil
        }

        let dashboard = try await GuardianRepository.load(
            api: api, identityStore: MemoryIdentityStore(identity()), storeFactory: { _ in store },
            defaults: defaults, knownIdentity: identity(), knownStore: store,
            synchronize: false, syncSucceeded: true)

        XCTAssertFalse(dashboard.isOffline)
        XCTAssertNotEqual(dashboard.updatedAt, oldDate)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults)?.timeIntervalSince1970 ?? 0,
                       dashboard.updatedAt?.timeIntervalSince1970 ?? -1, accuracy: 0.01)
    }

    func testLoadWithoutSyncAndSuccessfulResultKeepsOldFreshnessWhenHistoryFails() async throws {
        let store = try await syncedStore()
        let oldDate = Date(timeIntervalSince1970: 1_700_000_000)
        GuardianFreshness.record(scope, at: oldDate, defaults: defaults)
        let api = RouteAPI { _ in nil }

        let dashboard = try await GuardianRepository.load(
            api: api, identityStore: MemoryIdentityStore(identity()), storeFactory: { _ in store },
            defaults: defaults, knownIdentity: identity(), knownStore: store,
            synchronize: false, syncSucceeded: true)

        XCTAssertTrue(dashboard.isOffline)
        XCTAssertEqual(dashboard.updatedAt, oldDate)
        XCTAssertEqual(GuardianFreshness.last(scope, defaults: defaults), oldDate)
    }

    func testOfflineMeWithoutCachedIdentityStillFails() async throws {
        let store = try await syncedStore()

        do {
            _ = try await GuardianRepository.load(
                api: RouteAPI { _ in nil }, identityStore: MemoryIdentityStore(nil),
                storeFactory: { _ in store }, defaults: defaults)
            XCTFail("expected the offline failure")
        } catch {
            XCTAssertEqual(error as? APIFailure, .offline)
        }
    }

    func testCachedIdentityOfAnotherRoleIsRefused() async throws {
        let store = try await syncedStore()

        do {
            _ = try await GuardianRepository.load(
                api: RouteAPI { _ in nil }, identityStore: MemoryIdentityStore(identity(scopeKind: .assignedClasses)),
                storeFactory: { _ in store }, defaults: defaults)
            XCTFail("expected 403")
        } catch {
            XCTAssertEqual(error as? APIFailure, .badStatus(code: 403))
        }
    }

    func testUnauthorizedMeDoesNotFallBackToTheCache() async throws {
        let store = try await syncedStore()
        let api = FailingAPI(failure: .badStatus(code: 401))

        do {
            _ = try await GuardianRepository.load(api: api, identityStore: MemoryIdentityStore(identity()),
                                                   storeFactory: { _ in store }, defaults: defaults)
            XCTFail("expected 401")
        } catch {
            XCTAssertEqual(error as? APIFailure, .badStatus(code: 401))
        }
    }
}

private struct FailingAPI: APIClient {
    let baseURL = URL(string: "https://fixture.invalid/v1")!
    let failure: APIFailure
    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        throw failure
    }
}

private actor MemoryIdentityStore: CachedIdentityStore {
    private var value: CurrentIdentity?
    init(_ identity: CurrentIdentity?) { value = identity }
    func load() -> CurrentIdentity? { value }
    func save(_ identity: CurrentIdentity) { value = identity }
    func clear() { value = nil }
}
