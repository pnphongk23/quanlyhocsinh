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

/// Holds the answers of `report-batches/b1/reports` until `release()`, so a read can be in flight while a delete finishes.
private actor Gate {
    private var waiting: [CheckedContinuation<Void, Never>] = []
    private var released = false
    private var arrivals = 0
    func wait() async {
        arrivals += 1
        if released { return }
        await withCheckedContinuation { waiting.append($0) }
    }
    func release() { released = true; waiting.forEach { $0.resume() }; waiting = [] }
    var arrived: Int { arrivals }
}

private struct GatedAPI: APIClient {
    let baseURL = URL(string: "https://fixture.invalid/v1")!
    let gate: Gate

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        let json: String
        switch (endpoint.method, endpoint.path) {
        case (.delete, "report-batches/b1"): json = deletedJSON
        case (.get, "classes/c1/report-batches"):
            let item = { (id: String) in "{\"id\":\"\(id)\",\"class_id\":\"c1\",\"from_session_id\":null,\"to_session_id\":null,\"from_key\":\"2026-10-01 18:00\",\"to_key\":\"2026-10-20 18:00\"}" }
            json = "{\"items\":[\(item("b1")),\(item("b2"))]}"
        case (.get, "report-batches/b1/reports"):
            await gate.wait()
            json = "{\"batch\":{\"id\":\"b1\",\"class_id\":\"c1\",\"from_session_id\":null,\"to_session_id\":null,\"from_key\":\"2026-10-01 18:00\",\"to_key\":\"2026-10-20 18:00\"},\"items\":[{\"report_id\":\"r1\",\"batch_id\":\"b1\",\"student_id\":\"st-r1\",\"month\":\"2026-10\",\"status\":\"draft\",\"general_comment\":\"\",\"needs_republish\":0,\"publication_count\":0,\"published_at\":null,\"version\":1}]}"
        case (.get, "report-batches/b2/reports"): json = "{\"batch\":{\"id\":\"b2\",\"class_id\":\"c1\",\"from_session_id\":null,\"to_session_id\":null,\"from_key\":\"2026-10-01 18:00\",\"to_key\":\"2026-10-20 18:00\"},\"items\":[]}"
        default: throw APIFailure.offline
        }
        do { return try WireJSON.decoder().decode(type, from: Data(json.utf8)) } catch { throw APIFailure.decoding }
    }
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

    func testAReadStartedBeforeTheDeleteDoesNotBringTheBatchBack() async throws {
        let gate = Gate()
        let (data, store) = try await seeded(api: GatedAPI(gate: gate))

        let load = Task { await data.loadClassReports(classID: "c1") }
        while await gate.arrived == 0 { await Task.yield() }
        let failure = await data.deleteReportBatch(batchID: "b1")
        XCTAssertNil(failure)
        await gate.release()
        let loadFailure = await load.value
        XCTAssertNil(loadFailure)

        XCTAssertFalse(data.batches.map(\.id).contains("b1"))
        XCTAssertFalse(data.reports.map(\.batchId).contains("b1"))
        let cached = try await store.recordsSkippingInvalid(ReportBatch.self, entity: "report_batch").values
        XCTAssertEqual(cached.map(\.id), ["b2"])
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
