import XCTest
@testable import QuanLyLop

@MainActor
final class ScoresPublicationDecodeTests: XCTestCase {
    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")

    private func publication(_ number: Int, stale: Bool) -> JSONValue {
        let homework: JSONValue = stale
            ? .array([.object(["kind": .string("vocabulary"), "count": .number(3), "level": .string("done")])])
            : .array([.object(["kind": .string("vocabulary"), "excellent": .number(2), "done": .number(1), "not_done": .number(0)])])
        return .object([
            "id": .string("publication-\(number)"), "report_id": .string("report"),
            "class_id": .string("class"), "student_id": .string("child"), "month": .string("2026-10"),
            "publication_no": .number(Double(number)), "published_at": .string("2026-10-2\(number)T00:00:00.000Z"),
            "snapshot": .object([
                "student_id": .string("child"), "month": .string("2026-10"),
                "attendance": .object(["present": .number(1), "late": .number(0), "excused": .number(0), "absent": .number(0), "held_sessions": .number(1)]),
                "tests": .array([]), "stars": .object(["three": .number(0), "two": .number(0), "one": .number(0)]),
                "homework": homework, "general_comment": .string(""), "ready": .bool(true)
            ])
        ])
    }

    func testStalePublicationDoesNotBlockRefresh() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let student: JSONValue = .object(["id": .string("child"), "class_id": .string("class"), "name": .string("Học sinh"),
                                          "parent_phone": .null, "enrolled_at": .string("2026-10-01"), "left_at": .null,
                                          "status": .string("active"), "version": .number(1)])
        let classroom: JSONValue = .object(["id": .string("class"), "name": .string("Lớp"), "status": .string("active")])
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture",
            upserts: ["student": [student], "class": [classroom],
                      "report_publication": [publication(1, stale: true), publication(2, stale: false), publication(3, stale: false)]],
            deleted: []))
        let data = I4FeatureStore(store: store)
        await data.refresh()
        XCTAssertTrue(data.isReady)
        XCTAssertNil(data.errorMessage)
        XCTAssertEqual(data.publications.map(\.publicationNo).sorted(), [2, 3])
        XCTAssertEqual(data.classes.count, 1)
        XCTAssertEqual(data.students.count, 1)
    }
}
