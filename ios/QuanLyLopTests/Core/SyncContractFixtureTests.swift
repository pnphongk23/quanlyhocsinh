import XCTest
@testable import QuanLyLop

/// Rows shaped like the keys `GET /sync/*` really sends (`worker/src/db/sync-read.ts`), with made-up values.
/// A required Swift property the server does not send makes the whole row unreadable, so keep both in step.
@MainActor
final class SyncContractFixtureTests: XCTestCase {
    private func rows(_ entity: String) throws -> [JSONValue] {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "SyncContract", withExtension: "json"))
        let root = try JSONDecoder().decode([String: [JSONValue]].self, from: Data(contentsOf: url))
        return try XCTUnwrap(root[entity])
    }
    private func decoded<T: Decodable>(_ type: T.Type, _ entity: String) throws -> [T] {
        try rows(entity).map { try WireJSON.decode(type, from: $0) }
    }

    func testEveryEntityDecodesFromServerKeys() throws {
        XCTAssertEqual(try decoded(Classroom.self, "class").first?.weekdays, [2, 4])
        XCTAssertEqual(try decoded(Student.self, "student").first?.enrolledAt, "2026-09-01")
        let sessions = try decoded(ClassSession.self, "class_session")
        XCTAssertEqual(sessions.map(\.status), [.held, .planned])
        XCTAssertEqual(try decoded(Attendance.self, "attendance").first?.lateAt, "18:10")
        XCTAssertEqual(try decoded(TestDefinition.self, "test").first?.name, "Kiểm tra 15 phút")
        XCTAssertEqual(try decoded(Score.self, "score").first?.value, 12.5)
        XCTAssertEqual(try decoded(SessionSlip.self, "slip").first?.stars, 3)
        XCTAssertEqual(try decoded(HomeworkSection.self, "homework_section").first?.kind, .vocabulary)
        XCTAssertEqual(try decoded(HomeworkGrade.self, "homework_grade").first?.level, .excellent)
        XCTAssertEqual(try decoded(StudentReport.self, "report").first?.publicationCount, 1)
        XCTAssertEqual(try decoded(StudentReport.self, "report").first?.batchId, "batch-1")
        let batch = try XCTUnwrap(decoded(ReportBatch.self, "report_batch").first)
        XCTAssertEqual([batch.fromSessionId, batch.toSessionId, batch.fromKey, batch.toKey], ["session-1", "session-1", "2026-10-02 18:00", "2026-10-02 18:00"])
    }

    func testReportPublicationDecodesWithoutHasPdf() throws {
        let publication = try XCTUnwrap(decoded(ReportPublication.self, "report_publication").first)
        XCTAssertEqual(publication.publicationNo, 1)
        XCTAssertEqual(publication.snapshot.attendance.heldSessions, 1)
        XCTAssertEqual(publication.snapshot.stars.three, 1)
        XCTAssertEqual(publication.snapshot.homework, [HomeworkSummary(kind: .vocabulary, excellent: 1, done: 0, notDone: 0)])
        XCTAssertEqual(publication.snapshot.tests.map(\.value), [12.5, nil])
        XCTAssertEqual(publication.snapshot.generalComment, "Nhận xét giả")
    }

    func testMissingRequiredKeyFailsDecoding() throws {
        guard case .object(var row) = try XCTUnwrap(rows("report_publication").first) else { return XCTFail("not an object") }
        row["publication_no"] = nil
        XCTAssertThrowsError(try WireJSON.decode(ReportPublication.self, from: .object(row))) { error in
            guard case DecodingError.keyNotFound = error else { return XCTFail("expected keyNotFound, got \(error)") }
        }
    }

    func testGuardianSessionWithoutNoteDecodes() throws {
        guard case .object(var row) = try XCTUnwrap(rows("class_session").first) else { return XCTFail("not an object") }
        row["note"] = nil
        XCTAssertNil(try WireJSON.decode(ClassSession.self, from: .object(row)).note)
    }

    // MARK: Publications as the staging snapshot sends them

    private func publication(_ number: Int, staleHomework: Bool) throws -> JSONValue {
        guard case .object(var row) = try XCTUnwrap(rows("report_publication").first),
              case .object(var snapshot) = try XCTUnwrap(row["snapshot"]) else { throw XCTSkip("fixture") }
        row["id"] = .string("publication-\(number)"); row["publication_no"] = .number(Double(number))
        row["published_at"] = .string("2026-10-2\(number)T00:00:00.000Z")
        if staleHomework { snapshot["homework"] = .array([.object(["kind": .string("vocabulary"), "count": .number(3), "level": .string("done")])]) }
        row["snapshot"] = .object(snapshot)
        return .object(row)
    }

    func testPublicationsWithoutHasPdfAreReadableAndNewestWins() async throws {
        let scope = CacheScope(userId: "guardian-user", workspaceId: "workspace", membershipId: "guardian")
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let publications = [try publication(1, staleHomework: true), try publication(2, staleHomework: false),
                            try publication(3, staleHomework: false), try publication(4, staleHomework: false)]
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture",
            upserts: ["student": try rows("student"), "class": try rows("class"), "report_publication": publications], deleted: []))

        let dashboard = try await GuardianRepository.dashboard(from: store)
        let child = try XCTUnwrap(dashboard.children.first)
        XCTAssertEqual(child.publications.map(\.publicationNo).sorted(), [2, 3, 4])
        XCTAssertEqual(child.publishedReports.map(\.publicationNo), [4])

        let teacher = I4FeatureStore(store: store)
        await teacher.refresh()
        XCTAssertEqual(teacher.publications.map(\.publicationNo).sorted(), [2, 3, 4])
    }
}
