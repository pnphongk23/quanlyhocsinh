import XCTest
@testable import QuanLyLop

final class GuardianPublicationDecodeTests: XCTestCase {
    private let scope = CacheScope(userId: "guardian-user", workspaceId: "workspace", membershipId: "guardian")

    private func homework(_ shape: String) -> JSONValue {
        switch shape {
        case "stale": return .array([.object(["kind": .string("vocabulary"), "count": .number(3), "level": .string("done")])])
        default: return .array([.object(["kind": .string("vocabulary"), "excellent": .number(2), "done": .number(1), "not_done": .number(0)])])
        }
    }

    private func publication(_ number: Int, student: String = "child", shape: String) -> JSONValue {
        .object([
            "id": .string("publication-\(student)-\(number)"), "report_id": .string("report-\(student)"),
            "class_id": .string("class"), "student_id": .string(student), "month": .string("2026-10"),
            "publication_no": .number(Double(number)), "published_at": .string("2026-10-2\(number)T00:00:00.000Z"),
            "has_pdf": .bool(false),
            "snapshot": .object([
                "student_id": .string(student), "month": .string("2026-10"),
                "attendance": .object(["present": .number(1), "late": .number(0), "excused": .number(0), "absent": .number(0), "held_sessions": .number(1)]),
                "tests": .array([]), "stars": .object(["three": .number(0), "two": .number(0), "one": .number(0)]),
                "homework": homework(shape), "general_comment": .string(""), "ready": .bool(true)
            ])
        ])
    }

    private func student(_ id: String) -> JSONValue {
        .object(["id": .string(id), "class_id": .string("class"), "name": .string("Học sinh \(id)"), "parent_phone": .null,
                 "enrolled_at": .string("2026-10-01"), "left_at": .null, "status": .string("active"), "version": .number(1)])
    }

    private func seed(_ publications: [JSONValue]) async throws -> SQLiteStore {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let attendance: JSONValue = .object(["session_id": .string("session"), "student_id": .string("child"), "status": .string("present"),
                                             "note": .string(""), "late_at": .null, "version": .number(1), "updated_at": .string("2026-10-10T00:00:00.000Z")])
        let session: JSONValue = .object(["id": .string("session"), "class_id": .string("class"), "date": .string("2026-10-10"),
                                          "start_time": .string("18:00"), "origin": .string("recurring"), "is_makeup": .bool(false),
                                          "status": .string("held"), "note": .null, "version": .number(1), "session_number": .number(1)])
        let classroom: JSONValue = .object(["id": .string("class"), "name": .string("Lớp"), "status": .string("active")])
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture",
            upserts: ["student": [student("child"), student("other")], "class": [classroom], "class_session": [session],
                      "attendance": [attendance], "report_publication": publications], deleted: []))
        return store
    }

    func testStalePublicationDoesNotHideTheChild() async throws {
        let store = try await seed([publication(1, shape: "stale"), publication(2, shape: "ok"), publication(3, shape: "ok")])
        let dashboard = try await GuardianRepository.dashboard(from: store)
        let child = try XCTUnwrap(dashboard.children.first { $0.student.id == "child" })
        XCTAssertEqual(child.publications.map(\.publicationNo).sorted(), [2, 3])
        XCTAssertEqual(child.attendances.count, 1)
    }

    func testChildWithOnlyUnreadablePublicationsLoadsWithoutReport() async throws {
        let store = try await seed([publication(1, shape: "stale"), publication(2, shape: "stale"), publication(1, student: "other", shape: "ok")])
        let dashboard = try await GuardianRepository.dashboard(from: store)
        let child = try XCTUnwrap(dashboard.children.first { $0.student.id == "child" })
        XCTAssertTrue(child.publications.isEmpty)
        XCTAssertEqual(child.attendances.count, 1)
        XCTAssertEqual(try XCTUnwrap(dashboard.children.first { $0.student.id == "other" }).publications.count, 1)
    }
}
