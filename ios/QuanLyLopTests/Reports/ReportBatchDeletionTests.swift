import XCTest
@testable import QuanLyLop

private final class Requests: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [String] = []
    func add(_ endpoint: APIEndpoint) { lock.lock(); items.append("\(endpoint.method.rawValue) \(endpoint.path)"); lock.unlock() }
    var all: [String] { lock.lock(); defer { lock.unlock() }; return items }
}

private let deletedJSON = "{\"id\":\"b1\",\"deleted\":true}"

private func report(_ id: String, batch: String, status: ReportStatus = .draft, published: Int = 0) -> StudentReport {
    StudentReport(id: id, classId: "c1", studentId: "st-\(id)", batchId: batch, month: "2026-10", status: status,
                  generalComment: "", needsRepublish: false, publicationCount: published,
                  publishedAt: published > 0 ? "2026-10-20T00:00:00.000Z" : nil, version: 1)
}

@MainActor
final class ReportBatchDeletionTests: XCTestCase {
    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")

    private func key(_ entity: String, _ id: String) -> String { RecordKey(entity: entity, k1: id).storageKey }

    private func publication(id: String, report: String, batch: String?) throws -> ReportPublication {
        let snapshot = try WireJSON.decoder().decode(ReportSnapshot.self, from: Data("""
        {"student_id":"st","ready":true,"general_comment":"","attendance":{"present":1,"late":0,"excused":0,"absent":0,"held_sessions":1},
         "stars":{"three":1,"two":0,"one":0},"homework":[],"tests":[]}
        """.utf8))
        return ReportPublication(id: id, reportId: report, classId: "c1", studentId: "st-\(report)", batchId: batch,
                                 month: "2026-10", publicationNo: 1, publishedAt: "2026-10-20T00:00:00.000Z", snapshot: snapshot)
    }

    /// Two batches: `b1` (one published and one draft report, one publication) and `b2` (untouched).
    private func seeded(api: any APIClient) async throws -> (I4FeatureStore, SQLiteStore) {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        for id in ["b1", "b2"] {
            try await store.write(ReportBatch(id: id, classId: "c1", fromSessionId: nil, toSessionId: nil,
                                              fromKey: "2026-10-01 18:00", toKey: "2026-10-20 18:00", version: 1),
                                  forKey: key("report_batch", id), enqueueing: nil)
        }
        let reports = [report("r1", batch: "b1", status: .published, published: 1), report("r2", batch: "b1"),
                       report("r3", batch: "b2", status: .published, published: 1)]
        for item in reports { try await store.write(item, forKey: key("report", item.id), enqueueing: nil) }
        for (id, reportID, batch) in [("p1", "r1", "b1"), ("p3", "r3", "b2")] {
            try await store.write(try publication(id: id, report: reportID, batch: batch),
                                  forKey: key("report_publication", id), enqueueing: nil)
        }
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()
        return (data, store)
    }

    private func assertOnlyB2Left(_ data: I4FeatureStore, _ store: SQLiteStore, file: StaticString = #filePath, line: UInt = #line) async throws {
        XCTAssertEqual(data.batches.map(\.id), ["b2"], file: file, line: line)
        XCTAssertEqual(data.reports.map(\.id), ["r3"], file: file, line: line)
        let publications = try await store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication").values
        XCTAssertEqual(publications.map(\.id), ["p3"], file: file, line: line)
    }

    func testDeleteSendsDeleteAndDropsBatchReportsAndPublications() async throws {
        let requests = Requests()
        let (data, store) = try await seeded(api: RouteAPI { endpoint in requests.add(endpoint); return deletedJSON })

        let failure = await data.deleteReportBatch(batchID: "b1")

        XCTAssertNil(failure)
        XCTAssertEqual(requests.all, ["DELETE report-batches/b1"])
        try await assertOnlyB2Left(data, store)
    }

    func testDeletingAnAlreadyDeletedBatchStillSucceeds() async throws {
        let (data, store) = try await seeded(api: RouteAPI { _ in deletedJSON })

        let first = await data.deleteReportBatch(batchID: "b1")
        let second = await data.deleteReportBatch(batchID: "b1")
        XCTAssertNil(first)
        XCTAssertNil(second)
        try await assertOnlyB2Left(data, store)
    }

    func testNotFoundCountsAsDeletedAndCleansTheCache() async throws {
        let (data, store) = try await seeded(api: RouteAPI(route: { _ in nil }, failures: ["report-batches/b1": 404]))

        let failure = await data.deleteReportBatch(batchID: "b1")

        XCTAssertNil(failure)
        try await assertOnlyB2Left(data, store)
    }

    func testOfflineKeepsTheBatchAndNothingIsQueued() async throws {
        let (data, store) = try await seeded(api: RouteAPI { _ in nil })

        let failure = await data.deleteReportBatch(batchID: "b1")

        XCTAssertEqual(failure?.message, String(localized: "reports.error.offline", table: "Reports"))
        XCTAssertEqual(Set(data.batches.map(\.id)), ["b1", "b2"])
        XCTAssertEqual(data.reports.count, 3)
        let queued = try await store.pendingCommandCount()
        XCTAssertEqual(queued, 0)
    }

    func testForbiddenAndServerErrorsKeepTheBatch() async throws {
        let (data, _) = try await seeded(api: RouteAPI(route: { _ in nil }, failures: ["report-batches/b1": 403]))
        let forbidden = await data.deleteReportBatch(batchID: "b1")
        XCTAssertEqual(forbidden?.message, String(localized: "reports.error.forbidden", table: "Reports"))
        XCTAssertEqual(Set(data.batches.map(\.id)), ["b1", "b2"])

        let (other, _) = try await seeded(api: RouteAPI(route: { _ in nil }, failures: ["report-batches/b1": 500]))
        let broken = await other.deleteReportBatch(batchID: "b1")
        XCTAssertEqual(broken?.message, String(localized: "reports.error.delete", table: "Reports"))
        XCTAssertEqual(Set(other.batches.map(\.id)), ["b1", "b2"])
    }

    func testOpeningABatchDeletedElsewhereDropsItFromTheCache() async throws {
        let (data, store) = try await seeded(api: RouteAPI(route: { _ in nil }, failures: ["report-batches/b1/reports": 404]))

        let failure = await data.loadBatchDetail(batchID: "b1")

        XCTAssertNil(failure)
        try await assertOnlyB2Left(data, store)
    }

    func testDeletionTargetNamesPublishedAndDraftBatches() async throws {
        let (data, _) = try await seeded(api: RouteAPI { _ in nil })
        XCTAssertEqual(data.deletionTarget(batchID: "b1")?.published, true)
        try await data.store?.write(report("r1", batch: "b1"), forKey: key("report", "r1"), enqueueing: nil)
        await data.refresh()
        XCTAssertEqual(data.deletionTarget(batchID: "b1")?.published, false)
        XCTAssertNil(data.deletionTarget(batchID: "missing"))
    }

    func testConfirmationTextDiffersForDraftAndPublished() {
        let draft = ReportDeletionTarget(batchID: "b", rangeLabel: "Buổi 1–8", published: false)
        let published = ReportDeletionTarget(batchID: "b", rangeLabel: "Buổi 1–8", published: true)
        XCTAssertNotEqual(ReportDeletionRules.message(for: draft), ReportDeletionRules.message(for: published))
        XCTAssertTrue(ReportDeletionRules.message(for: published).contains("phụ huynh sẽ không còn thấy"))
        XCTAssertTrue(ReportDeletionRules.message(for: draft).contains("Buổi 1–8"))
    }

    func testAvailabilityNeedsPermissionAndNetwork() {
        XCTAssertEqual(ReportDeletionRules.availability(canWrite: true, isOnline: true), .allowed)
        XCTAssertEqual(ReportDeletionRules.availability(canWrite: true, isOnline: false), .offline)
        XCTAssertEqual(ReportDeletionRules.availability(canWrite: false, isOnline: true), .noPermission)
        XCTAssertEqual(ReportDeletionRules.availability(canWrite: false, isOnline: false), .noPermission)
    }

    func testSyncDeletedKeysRemoveTeacherAndGuardianRecords() async throws {
        let (_, store) = try await seeded(api: RouteAPI { _ in nil })
        let page = PullPage(cursor: 5, epoch: 1, hasMore: false, serverTime: "2026-10-25T00:00:00.000Z", upserts: [:], deleted: [
            RecordKey(entity: "report_batch", k1: "b1"), RecordKey(entity: "report", k1: "r1"),
            RecordKey(entity: "report", k1: "r2"), RecordKey(entity: "report_publication", k1: "p1")])
        try await store.apply(page)

        let publications = try await store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication").values
        XCTAssertEqual(publications.map(\.id), ["p3"])
        let reports = try await store.records(StudentReport.self, entity: "report")
        XCTAssertEqual(reports.map(\.id), ["r3"])
        let batches = try await store.records(ReportBatch.self, entity: "report_batch")
        XCTAssertEqual(batches.map(\.id), ["b2"])
    }
}
