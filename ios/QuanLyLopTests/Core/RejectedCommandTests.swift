import XCTest
@testable import QuanLyLop

/// A `rejected` command is kept as the error label the teacher sees, never as a value
/// (`api-spec.md` mục 6.1 "rejected: giữ lệnh, đánh dấu lỗi, không tự xoá"). Two consequences are
/// tested here: the cell shows what the server has (no hidden second value, mục 6 pull wins), and a
/// fresh edit of the same cell replaces the stale rejection instead of keeping the pill forever.
final class RejectedCommandTests: XCTestCase {
    let scope = CacheScope(userId: "reject-user", workspaceId: "reject-workspace", membershipId: "reject-member")
    let now = Date(timeIntervalSince1970: 1_000)

    private func store() throws -> SQLiteStore { try SQLiteStore(path: ":memory:", scope: scope) }
    private func row() -> String { RecordKey(entity: "score", k1: "test", k2: "student").storageKey }
    private func serverScore(_ value: Double?) -> Score {
        Score(testId: "test", studentId: "student", value: value, version: 3, updatedAt: "fixture")
    }
    private func edit(_ version: Int = 0, value: Double? = 12.5, time: Date? = nil) -> PendingCommand {
        PendingCommand(recordKey: row(), baseVersion: version, kind: "score.set",
                       payload: .object(["test_id": .string("test"), "student_id": .string("student"),
                                         "value": value.map { .number($0) } ?? .null]),
                       createdAt: time ?? now)
    }

    func testRejectedEditFallsBackToTheServerValue() async throws {
        let store = try store(), key = row()
        try await store.write(serverScore(14), forKey: key, enqueueing: nil)
        let command = edit()
        try await store.write(serverScore(12.5), forKey: key, enqueueing: command)
        _ = try await store.claimBatch(now: now)
        try await store.acknowledge([CommandResult(id: command.id, status: .rejected,
            error: APIError(code: "score_above_max", message: nil, details: nil, requestId: nil))])
        let shown = try await store.read(Score.self, forKey: key)
        XCTAssertEqual(shown, serverScore(14), "a rejected edit must not stay visible as the cell's value")
        let rejected = try await store.rejectedCommandCount()
        XCTAssertEqual(rejected, 1, "the rejected command itself stays as the error label")
    }

    func testRejectedFirstValueLeavesTheCellEmpty() async throws {
        let store = try store(), key = row()
        let command = edit()
        try await store.write(serverScore(12.5), forKey: key, enqueueing: command)
        _ = try await store.claimBatch(now: now)
        try await store.acknowledge([CommandResult(id: command.id, status: .rejected,
            error: APIError(code: "forbidden", message: nil, details: nil, requestId: nil))])
        let shown = try await store.read(Score.self, forKey: key)
        XCTAssertNil(shown, "the optimistic placeholder goes away; pull decides what the cell holds")
    }

    func testEditingTheSameCellAgainReplacesTheStaleRejection() async throws {
        let store = try store(), key = row()
        let first = edit()
        try await store.write(serverScore(12.5), forKey: key, enqueueing: first)
        _ = try await store.claimBatch(now: now)
        try await store.acknowledge([CommandResult(id: first.id, status: .rejected,
            error: APIError(code: "score_above_max", message: nil, details: nil, requestId: nil))])
        let before = try await store.rejectedCommandCount()
        XCTAssertEqual(before, 1)

        let second = edit(value: 10)
        try await store.write(serverScore(10), forKey: key, enqueueing: second)
        let after = try await store.rejectedCommandCount()
        let queued = try await store.pendingCommands()
        XCTAssertEqual(after, 0, "the corrected edit supersedes the rejected one")
        XCTAssertEqual(queued.map(\.id), [second.id])
        let shown = try await store.read(Score.self, forKey: key)
        XCTAssertEqual(shown, serverScore(10), "the queued edit is the cell's value until the server answers")
    }

    func testQueuedEditStillOverlaysTheCacheBeforeTheServerAnswers() async throws {
        let store = try store(), key = row()
        try await store.write(serverScore(14), forKey: key, enqueueing: nil)
        let command = edit()
        try await store.write(serverScore(12.5), forKey: key, enqueueing: command)
        let shown = try await store.read(Score.self, forKey: key)
        XCTAssertEqual(shown, serverScore(12.5))
    }
}
