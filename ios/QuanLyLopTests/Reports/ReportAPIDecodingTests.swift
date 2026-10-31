import XCTest
@testable import QuanLyLop

final class ReportAPIDecodingTests: XCTestCase {
    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try WireJSON.decoder().decode(type, from: Data(json.utf8))
    }

    func testCreateBatchResponseDecodesBatchAndOneReportPerStudent() throws {
        let response = try decode(CreateReportBatchResponse.self, """
        {"batch":{"id":"b1","class_id":"c1","from_session_id":"s1","to_session_id":"s8","from_key":"2026-10-01 18:00","to_key":"2026-10-24 18:00"},
         "reports":[{"report_id":"r1","batch_id":"b1","student_id":"st1","status":"draft","general_comment":"","needs_republish":false,
                     "publication_count":0,"published_at":null,"version":1}]}
        """)
        XCTAssertEqual(response.batch.toSessionId, "s8")
        XCTAssertEqual(response.reports.map(\.reportId), ["r1"])
        XCTAssertEqual(response.reports.first?.status, .draft)
        XCTAssertNil(response.reports.first?.month)
    }

    /// Shapes copied from worker/tests/report-batches.test.ts: REST returns SQLite flags as 0/1.
    func testServerRestFlagsAsZeroAndOneDecode() throws {
        let created = try decode(CreateReportBatchResponse.self, """
        {"batch":{"id":"b1","class_id":"c1","from_session_id":"s1","to_session_id":"s4","from_key":"2026-10-01 18:00",
                  "to_key":"2026-10-07 18:00","from_number":1,"to_number":3,
                  "counts":{"total":3,"draft":3,"published":0,"needs_republish":0},"created_at":"2026-10-24T10:00:00.000Z"},
         "reports":[{"report_id":"r1","batch_id":"b1","student_id":"st1","student_name":"An","month":"2026-10","status":"draft",
                     "general_comment":"","needs_republish":0,"publication_count":0,"published_at":null,"version":1},
                    {"report_id":"r2","batch_id":"b1","student_id":"st2","student_name":"Bình","month":"2026-10","status":"published",
                     "general_comment":"Tốt","needs_republish":1,"publication_count":1,"published_at":"2026-10-24T10:00:00.000Z","version":2}]}
        """)
        XCTAssertEqual(created.reports.map(\.needsRepublish), [false, true])

        let saved = try decode(ReportCommentResponse.self, """
        {"id":"r1","batch_id":"b1","student_id":"st1","month":"2026-10","status":"published","general_comment":"Cập nhật",
         "needs_republish":1,"version":3}
        """)
        XCTAssertEqual(saved.needsRepublish, true)
        XCTAssertEqual(saved.generalComment, "Cập nhật")

        let draft = try decode(ReportCommentResponse.self, """
        {"id":"r1","status":"draft","general_comment":"Tiến bộ tốt","needs_republish":0,"version":2}
        """)
        XCTAssertEqual(draft.needsRepublish, false)

        let bool = try decode(ReportCommentResponse.self, #"{"general_comment":"x","needs_republish":true,"version":2}"#)
        XCTAssertEqual(bool.needsRepublish, true)
        let absent = try decode(ReportCommentResponse.self, #"{"general_comment":"x"}"#)
        XCTAssertNil(absent.needsRepublish)
    }

    func testBatchRowsFromTheSyncFeedDecodeWithAndWithoutLegacyMonth() throws {
        let current = try decode(StudentReport.self, """
        {"id":"r1","class_id":"c1","student_id":"st1","batch_id":"b1","status":"draft","general_comment":"",
         "needs_republish":false,"publication_count":0,"published_at":null,"version":1}
        """)
        XCTAssertEqual(current.batchId, "b1")
        XCTAssertNil(current.month)
        let legacy = try decode(StudentReport.self, """
        {"id":"r0","class_id":"c1","student_id":"st1","month":"2026-09","status":"published","general_comment":"",
         "needs_republish":false,"publication_count":1,"published_at":"2026-09-30T00:00:00.000Z","version":3}
        """)
        XCTAssertNil(legacy.batchId)
        XCTAssertEqual(legacy.month, "2026-09")
        let batch = try decode(ReportBatch.self, """
        {"id":"b0","class_id":"c1","from_session_id":null,"to_session_id":null,
         "from_key":"2026-09-01 00:00","to_key":"2026-09-30 23:59","version":1}
        """)
        XCTAssertNil(batch.fromSessionId)
        XCTAssertNil(batch.month)
        let monthly = try decode(ReportBatchItem.self, """
        {"id":"b1","class_id":"c1","month":"2026-10","from_session_id":null,"to_session_id":null,
         "from_number":null,"to_number":null,"from_key":"2026-10-01 00:00","to_key":"2026-10-31 23:59"}
        """)
        XCTAssertEqual(monthly.month, "2026-10")
    }

    func testPreviewDecodesTheSnapshotWithRangeAndMissing() throws {
        let snapshot = try decode(ReportSnapshot.self, """
        {"student_id":"st1","batch_id":"b1","ready":false,"general_comment":"",
         "range":{"from_key":"2026-10-01 18:00","to_key":"2026-10-24 18:00","from_number":1,"to_number":8,"label":"Buổi 1–8 · 01/10–24/10"},
         "missing":["comment","score:t1"],
         "attendance":{"present":5,"late":1,"excused":1,"absent":1,"held_sessions":8},
         "stars":{"three":4,"two":3,"one":1},"stars5":{"s5":6,"s4":2,"s3":1,"s2":0,"s1":0,"s0":1},
         "homework":[{"kind":"vocabulary","excellent":4,"done":3,"not_done":1}],
         "tests":[{"test_id":"t1","name":"Kiểm tra","date":"2026-10-07","max":15,"value":null}]}
        """)
        XCTAssertEqual(snapshot.range.map(ReportRangeRules.label(of:)), "Buổi 1–8 · 01/10–24/10")
        XCTAssertEqual(snapshot.stars.stars5, Stars5Summary(s5: 6, s4: 2, s3: 1, s2: 0, s1: 0, s0: 1))
        XCTAssertEqual(snapshot.stars.legacyTotal, 8)
        XCTAssertEqual(snapshot.missing, ["comment", "score:t1"])
        XCTAssertFalse(snapshot.ready)
        XCTAssertNil(snapshot.tests.first?.value)
    }

    func testCachedSnapshotKeepsStars5InsideStars() throws {
        let snapshot = try decode(ReportSnapshot.self, """
        {"student_id":"st1","ready":true,"general_comment":"x","tests":[],"homework":[],
         "attendance":{"present":1,"late":0,"excused":0,"absent":0,"held_sessions":1},
         "stars":{"three":1,"two":0,"one":0}}
        """)
        XCTAssertEqual(snapshot.stars.stars5, Stars5Summary(), "a snapshot without stars5 counts as zero")
        let five = ReportSnapshot(studentId: "st1", attendance: snapshot.attendance, tests: [],
                                  stars: StarsSummary(three: 0, two: 0, one: 0, stars5: Stars5Summary(s5: 2)),
                                  homework: [], generalComment: "x", ready: true)
        let again = try WireJSON.decoder().decode(ReportSnapshot.self, from: try WireJSON.encoder().encode(five))
        XCTAssertEqual(again, five)
    }

    func testPublishResponsesDecodePublishedAndSkipped() throws {
        let one = try decode(ReportPublishResponse.self, """
        {"report_id":"r1","batch_id":"b1","publication_no":2,"published_at":"2026-10-24T10:00:00.000Z",
         "snapshot":{"student_id":"st1","ready":true,"general_comment":"Tốt",
           "attendance":{"present":1,"late":0,"excused":0,"absent":0,"held_sessions":1},
           "stars":{"three":1,"two":0,"one":0},"homework":[],"tests":[]}}
        """)
        XCTAssertEqual(one.publicationNo, 2)
        XCTAssertEqual(one.snapshot.generalComment, "Tốt")

        let all = try decode(BatchPublishResponse.self, """
        {"published":[{"report_id":"r1","publication_no":1}],
         "skipped":[{"report_id":"r2","missing":["comment"]}],"published_at":"2026-10-24T10:00:00.000Z"}
        """)
        XCTAssertEqual(all.published, [.init(reportId: "r1", publicationNo: 1)])
        XCTAssertEqual(all.skipped, [.init(reportId: "r2", missing: ["comment"])])
    }

    func testReportNotReadyConflictBecomesAReadableReason() {
        let error = APIError(code: "conflict", message: nil,
                             details: .object(["reason": .string("report_not_ready"), "missing": .array([.string("comment")])]),
                             requestId: nil)
        let failure = ReportFailure.from(APIFailure.server(status: 409, error: error, retryAfter: nil), fallback: "fallback")
        XCTAssertNotEqual(failure.message, "fallback")
        XCTAssertFalse(failure.message.isEmpty)
        XCTAssertEqual(ReportFailure.from(APIFailure.offline, fallback: "fallback"),
                       ReportFailure.from(APIFailure.missingToken, fallback: "x"))
    }

    func testABadMonthIsAnsweredWithTheMonthMessageNotTheFallback() {
        let error = APIError(code: "validation_error", message: nil,
                             details: .object(["fields": .object(["month": .string("must_be_month")])]), requestId: nil)
        let failure = ReportFailure.from(APIFailure.server(status: 422, error: error, retryAfter: nil), fallback: "fallback")
        XCTAssertNotEqual(failure.message, "fallback")
        XCTAssertTrue(failure.message.contains("Tháng"))
    }
}
