import XCTest
@testable import QuanLyLop

/// A report the teacher deleted must disappear from the guardian's cache, also when the guardian was
/// offline at the time and learns about it on the next refresh.
@MainActor
final class GuardianDeletedReportTests: XCTestCase {
    private let scope = CacheScope(userId: "guardian-user", workspaceId: "workspace", membershipId: "guardian")

    private func publication(report: String) throws -> ReportPublication {
        let snapshot = try WireJSON.decoder().decode(ReportSnapshot.self, from: Data("""
        {"student_id":"st1","ready":true,"general_comment":"","attendance":{"present":1,"late":0,"excused":0,"absent":0,"held_sessions":1},
         "stars":{"three":1,"two":0,"one":0},"homework":[],"tests":[]}
        """.utf8))
        return ReportPublication(id: "p-\(report)", reportId: report, classId: "c1", studentId: "st1", batchId: "b-\(report)",
                                 month: "2026-10", publicationNo: 1, publishedAt: "2026-10-20T00:00:00.000Z", snapshot: snapshot)
    }

    private func store(reports: [String]) async throws -> SQLiteStore {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        for id in reports {
            let item = try publication(report: id)
            try await store.write(item, forKey: RecordKey(entity: "report_publication", k1: item.id).storageKey, enqueueing: nil)
        }
        return store
    }

    private func cachedReportIDs(_ store: SQLiteStore) async throws -> Set<String> {
        Set(try await store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication").values.map(\.reportId))
    }

    func testCachedPublicationMissingFromTheServerListIsRemoved() async throws {
        let store = try await store(reports: ["r-kept", "r-deleted"])
        let api = RouteAPI { endpoint in
            guard endpoint.path == "students/st1/reports" else { return nil }
            return """
            {"items":[{"report_id":"r-kept","batch_id":"b-r-kept","student_id":"st1","month":"2026-10","status":"published",
                       "needs_republish":0,"publication_count":1,"published_at":"2026-10-20T00:00:00.000Z","version":2,
                       "from_key":"2026-10-01 18:00","to_key":"2026-10-20 18:00","from_number":1,"to_number":6}],"next_cursor":null}
            """
        }

        let complete = await GuardianReportHistory.refresh(api: api, store: store, studentIDs: ["st1"])

        XCTAssertTrue(complete)
        let remaining = try await cachedReportIDs(store)
        XCTAssertEqual(remaining, ["r-kept"])
    }

    func testPublicationAnswered404IsDroppedAndDoesNotMakeTheRefreshIncomplete() async throws {
        let store = try await store(reports: [])
        let api = RouteAPI(route: { endpoint in
            guard endpoint.path == "students/st1/reports" else { return nil }
            return """
            {"items":[{"report_id":"r-gone","batch_id":"b-r-gone","student_id":"st1","month":"2026-10","status":"published",
                       "needs_republish":0,"publication_count":1,"published_at":"2026-10-20T00:00:00.000Z","version":2,
                       "from_key":"2026-10-01 18:00","to_key":"2026-10-20 18:00","from_number":1,"to_number":6}],"next_cursor":null}
            """
        }, failures: ["reports/r-gone/publications/1": 404])

        let complete = await GuardianReportHistory.refresh(api: api, store: store, studentIDs: ["st1"])

        XCTAssertTrue(complete)
        let remaining = try await cachedReportIDs(store)
        XCTAssertTrue(remaining.isEmpty)
    }

    func testOfflineRefreshKeepsCachedPublications() async throws {
        let store = try await store(reports: ["r-kept"])

        let complete = await GuardianReportHistory.refresh(api: RouteAPI { _ in nil }, store: store, studentIDs: ["st1"])

        XCTAssertFalse(complete)
        let remaining = try await cachedReportIDs(store)
        XCTAssertEqual(remaining, ["r-kept"])
    }

    func testSyncDeletedPublicationRemovesItFromTheDashboardHistory() async throws {
        let store = try await store(reports: ["r-kept", "r-deleted"])
        try await store.apply(PullPage(cursor: 2, epoch: 1, hasMore: false, serverTime: "2026-10-25T00:00:00.000Z", upserts: [:],
                                       deleted: [RecordKey(entity: "report_publication", k1: "p-r-deleted")]))

        let remaining = try await cachedReportIDs(store)
        XCTAssertEqual(remaining, ["r-kept"])
    }

    func testReloadAfterSyncDeletionTakesTheReportOffAnOpenDashboard() async throws {
        let store = try await store(reports: ["r-kept", "r-deleted"])
        let student = Student(id: "st1", classId: "c1", name: "Trần Gia Bảo", parentPhone: nil,
                              enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1)
        try await store.write(student, forKey: RecordKey(entity: "student", k1: student.id).storageKey, enqueueing: nil)
        let refreshed = Date(timeIntervalSince1970: 1_700_000_000)
        let open = GuardianDashboard(children: try await GuardianRepository.dashboard(from: store).children,
                                     updatedAt: refreshed, isOffline: true)
        XCTAssertEqual(Set(open.children.first?.publishedReports.map(\.reportId) ?? []), ["r-kept", "r-deleted"])

        try await store.apply(PullPage(cursor: 2, epoch: 1, hasMore: false, serverTime: "2026-10-25T00:00:00.000Z", upserts: [:],
                                       deleted: [RecordKey(entity: "report_publication", k1: "p-r-deleted")]))
        let next = try await GuardianRepository.reload(from: store, keeping: open)

        XCTAssertEqual(next.children.first?.publishedReports.map(\.reportId), ["r-kept"])
        XCTAssertEqual(next.updatedAt, refreshed)
        XCTAssertTrue(next.isOffline)
    }

    func testSyncThatFailsAfterAppliedDeletionStillSignalsTheScreensToRebuild() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        try await store.installSnapshot([:], position: SyncPosition(cursor: 0, epoch: 1))
        let item = try publication(report: "r-deleted")
        try await store.write(item, forKey: RecordKey(entity: "report_publication", k1: item.id).storageKey, enqueueing: nil)
        let user = User(id: "guardian-user", phone: "0900000000", displayName: "Phụ huynh", mustChangePassword: false)
        let role = Role(id: "guardian-role", name: "Guardian", systemKey: nil, scopeKind: .assignedClasses)
        let membership = Membership(id: "guardian", workspace: Workspace(id: "workspace", name: "Lớp"), role: role,
                                    status: "active", scopeEpoch: 1, permissions: [:])
        let identity = CurrentIdentity(user: user, activeMembershipId: "guardian", memberships: [membership])
        let firstPage = PullPage(cursor: 1, epoch: 1, hasMore: true, serverTime: "2026-10-25T00:00:00.000Z", upserts: [:],
                                 deleted: [RecordKey(entity: "report_publication", k1: item.id)])
        let api = RouteAPI(route: { endpoint in
            switch (endpoint.path, endpoint.query["cursor"]) {
            case ("me", _): return String(decoding: try! WireJSON.encoder().encode(identity), as: UTF8.self)
            case ("sync/pull", "0"?): return String(decoding: try! WireJSON.encoder().encode(firstPage), as: UTF8.self)
            default: return nil
            }
        })
        let model = AuthModel(configuration: .fallback, apiClient: api,
                              tokenStore: InMemoryTokenStore(token: "fixture-session"),
                              identityStore: MemoryIdentityCache(identity), storeFactory: { _ in store }, isOnline: { true })
        await model.restoreSession()
        let before = model.syncRevision

        await model.synchronizeWhileActive()

        let remaining = try await cachedReportIDs(store)
        XCTAssertTrue(remaining.isEmpty)
        XCTAssertGreaterThan(model.syncRevision, before)
    }
}

private actor MemoryIdentityCache: CachedIdentityStore {
    private var value: CurrentIdentity?
    init(_ identity: CurrentIdentity?) { value = identity }
    func load() -> CurrentIdentity? { value }
    func save(_ identity: CurrentIdentity) { value = identity }
    func clear() { value = nil }
}
