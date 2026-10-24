import XCTest
@testable import QuanLyLop

private final class RequestLog: @unchecked Sendable {
    private let lock = NSLock()
    private var paths: [String] = []
    func add(_ path: String) { lock.lock(); paths.append(path); lock.unlock() }
    var all: [String] { lock.lock(); defer { lock.unlock() }; return paths }
}

private let snapshotJSON = """
{"student_id":"st1","ready":true,"general_comment":"Tốt","attendance":{"present":1,"late":0,"excused":0,"absent":0,"held_sessions":1},
 "stars":{"three":1,"two":0,"one":0},"homework":[],"tests":[]}
"""

private func publicationJSON(report: String, number: Int) -> String {
    """
    {"id":"p-\(report)-\(number)","workspace_id":"w","class_id":"c1","student_id":"st1","report_id":"\(report)","batch_id":"b-\(report)",
     "month":"2026-01","publication_no":\(number),"snapshot":\(snapshotJSON),"published_by":"u","published_at":"2026-01-06T00:00:00.000Z"}
    """
}

/// The guardian's report list must not stop at the sync window: every page of the server list is read
/// and the snapshot of each latest publication missing from the cache is fetched.
final class GuardianReportHistoryTests: XCTestCase {
    private let scope = CacheScope(userId: "guardian-user", workspaceId: "workspace", membershipId: "guardian")

    private func cachedPublication() -> ReportPublication {
        let snapshot = try! WireJSON.decoder().decode(ReportSnapshot.self, from: Data(snapshotJSON.utf8))
        return ReportPublication(id: "p-r-new-1", reportId: "r-new", classId: "c1", studentId: "st1", batchId: "b-r-new",
                                 month: "2026-10", publicationNo: 1, publishedAt: "2026-10-20T00:00:00.000Z", snapshot: snapshot)
    }

    func testFollowsServerCursorAndFetchesOnlyMissingSnapshots() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let cached = cachedPublication()
        try await store.write(cached, forKey: RecordKey(entity: "report_publication", k1: cached.id, k2: "").storageKey, enqueueing: nil)
        let log = RequestLog()
        let api = RouteAPI { endpoint in
            log.add(endpoint.path + (endpoint.query["cursor"].map { "?cursor=\($0)" } ?? ""))
            switch (endpoint.path, endpoint.query["cursor"]) {
            case ("students/st1/reports", nil):
                return """
                {"items":[{"report_id":"r-new","batch_id":"b-r-new","student_id":"st1","month":"2026-10","status":"published",
                           "needs_republish":0,"publication_count":1,"published_at":"2026-10-20T00:00:00.000Z","version":2,
                           "from_key":"2026-10-01 18:00","to_key":"2026-10-20 18:00","from_number":1,"to_number":6}],
                 "next_cursor":"server-cursor"}
                """
            case ("students/st1/reports", "server-cursor"):
                return """
                {"items":[{"report_id":"r-old","batch_id":"b-r-old","student_id":"st1","month":"2026-01","status":"published",
                           "needs_republish":1,"publication_count":2,"published_at":"2026-01-06T00:00:00.000Z","version":4,
                           "from_key":"2026-01-01 18:00","to_key":"2026-01-30 18:00","from_number":1,"to_number":4}],
                 "next_cursor":null}
                """
            case ("reports/r-old/publications/2", _):
                return publicationJSON(report: "r-old", number: 2)
            default: return nil
            }
        }

        let complete = await GuardianReportHistory.refresh(api: api, store: store, studentIDs: ["st1"])

        XCTAssertTrue(complete)
        XCTAssertEqual(log.all, ["students/st1/reports", "students/st1/reports?cursor=server-cursor",
                                 "reports/r-old/publications/2"])
        let saved = try await store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication").values
        XCTAssertEqual(Set(saved.map(\.reportId)), ["r-new", "r-old"])
        XCTAssertEqual(saved.first { $0.reportId == "r-old" }?.publicationNo, 2)
    }

    func testOfflineKeepsTheCacheAndReportsIncomplete() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let cached = cachedPublication()
        try await store.write(cached, forKey: RecordKey(entity: "report_publication", k1: cached.id, k2: "").storageKey, enqueueing: nil)
        let api = RouteAPI { _ in nil }

        let complete = await GuardianReportHistory.refresh(api: api, store: store, studentIDs: ["st1"])

        XCTAssertFalse(complete)
        let saved = try await store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication").values
        XCTAssertEqual(saved.map(\.reportId), ["r-new"])
    }
}
