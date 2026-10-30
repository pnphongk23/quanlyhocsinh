import XCTest
@testable import QuanLyLop

final class SnapshotCursorTests: XCTestCase {
    func testRepeated404DoesNotRepeatSnapshotWithinAnHour() async throws {
        let id = UUID().uuidString
        let scope = CacheScope(userId: id, workspaceId: id, membershipId: id)
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let api = Snapshot404API()
        let coordinator = SyncCoordinator(api: api, store: store, deviceId: "snapshot-device")
        let now = Date(timeIntervalSince1970: 1_700_000_000)

        for _ in 0..<3 {
            do { _ = try await coordinator.synchronize(now: now); XCTFail("404 should propagate") }
            catch let error as APIFailure { XCTAssertEqual(error, .badStatus(code: 404)) }
        }

        let snapshotCalls = await api.snapshotCalls()
        XCTAssertEqual(snapshotCalls, 1)
    }

    func testPageFailureLeavesCursorUnsetAndSuccessfulSnapshotRetryInstallsEveryPage() async throws {
        let scope = CacheScope(userId: "snapshot-retry-user", workspaceId: "snapshot-retry-workspace", membershipId: "snapshot-retry-member")
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let manifest = Data(#"{"cursor":20,"epoch":3,"window":{"from":"2026-07-01","to":"2026-12-01"},"entities":["class","student"]}"#.utf8)
        let classPage = SnapshotPage(items: [.object(["id": .string("class-2"), "name": .string("6B"),
            "status": .string("active"), "version": .number(1)])], nextAfter: nil)
        let snapshotEndpoint = APIEndpoint(method: .get, path: "sync/snapshot", query: ["membership_id": scope.membershipId])
        let classEndpoint = APIEndpoint(method: .get, path: "sync/snapshot/class", query: ["membership_id": scope.membershipId, "limit": "300"])
        let studentEndpoint = APIEndpoint(method: .get, path: "sync/snapshot/student", query: ["membership_id": scope.membershipId, "limit": "300"])
          let incompleteAPI = StubAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!, fixtures: [
              snapshotEndpoint: manifest,
              classEndpoint: try WireJSON.encoder().encode(classPage),
              studentEndpoint: Data("invalid".utf8)
          ])

        do {
            try await SyncCoordinator(api: incompleteAPI, store: store, deviceId: "snapshot-device").synchronize()
            XCTFail("missing page fixture should fail the snapshot")
        } catch {}
        let positionAfterPageFailure = try await store.position()
        XCTAssertNil(positionAfterPageFailure)

        let studentPage = SnapshotPage(items: [.object(["id": .string("student-2"), "class_id": .string("class-2"),
            "name": .string("Student"), "enrolled_at": .string("2026-10-01"), "status": .string("active"),
            "version": .number(1)])], nextAfter: nil)
        let pull = PullPage(cursor: 20, epoch: 3, hasMore: false, serverTime: "fixture", upserts: [:], deleted: [])
        let retryAPI = StubAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!, fixtures: [
            snapshotEndpoint: manifest,
            classEndpoint: try WireJSON.encoder().encode(classPage),
            studentEndpoint: try WireJSON.encoder().encode(studentPage),
            .init(method: .get, path: "sync/pull", query: ["membership_id": scope.membershipId, "cursor": "20", "epoch": "3", "limit": "200"]):
                try WireJSON.encoder().encode(pull)
        ])
        try await SyncCoordinator(api: retryAPI, store: store, deviceId: "snapshot-device").synchronize()

        let newPosition = try await store.position()
        let classes = try await store.records(Classroom.self, entity: "class")
        let students = try await store.records(Student.self, entity: "student")
        XCTAssertEqual(newPosition, SyncPosition(cursor: 20, epoch: 3))
        XCTAssertEqual(classes.map(\.id), ["class-2"])
        XCTAssertEqual(students.map(\.id), ["student-2"])
    }

    func testFailedSnapshotInstallKeepsOldCursorAndSuccessfulRetryCommitsAllRecords() async throws {
        let scope = CacheScope(userId: "snapshot-user", workspaceId: "snapshot-workspace", membershipId: "snapshot-member")
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let oldPosition = SyncPosition(cursor: 7, epoch: 2)
        try await store.apply(PullPage(cursor: oldPosition.cursor, epoch: oldPosition.epoch,
                                       hasMore: false, serverTime: "fixture", upserts: [:], deleted: []))

        do {
            try await store.installSnapshot(["class": [.object(["name": .string("missing id")])]],
                                            position: SyncPosition(cursor: 20, epoch: 3))
            XCTFail("invalid entity page should fail")
        } catch {}
        let positionAfterFailure = try await store.position()
        XCTAssertEqual(positionAfterFailure, oldPosition)

        let classRecord = JSONValue.object(["id": .string("class-1"), "name": .string("6A"),
                                            "status": .string("active"), "version": .number(1)])
        let studentRecord = JSONValue.object(["id": .string("student-1"), "class_id": .string("class-1"),
                                              "name": .string("Student"), "enrolled_at": .string("2026-10-01"),
                                              "status": .string("active"), "version": .number(1)])
        let newPosition = SyncPosition(cursor: 20, epoch: 3)
        try await store.installSnapshot(["class": [classRecord], "student": [studentRecord]], position: newPosition)

        let positionAfterRetry = try await store.position()
        let classes = try await store.records(Classroom.self, entity: "class")
        let students = try await store.records(Student.self, entity: "student")
        XCTAssertEqual(positionAfterRetry, newPosition)
        XCTAssertEqual(classes.count, 1)
        XCTAssertEqual(students.count, 1)
    }
}

private actor Snapshot404API: APIClient {
    let baseURL = URL(string: "https://fixture.invalid/v1")!
    private var snapshots = 0
    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        if endpoint.path == "sync/snapshot" { snapshots += 1 }
        throw APIFailure.badStatus(code: 404)
    }
    func snapshotCalls() -> Int { snapshots }
}
