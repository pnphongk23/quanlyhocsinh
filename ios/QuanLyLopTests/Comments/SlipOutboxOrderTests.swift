import XCTest
@testable import QuanLyLop

/// How the outbox treats slip edits next to attendance: attendance always goes first, and a refused slip edit is
/// neither resent nor lost.
@MainActor
final class SlipOutboxOrderTests: XCTestCase {
    private let scope = CacheScope(userId: "u", workspaceId: "w", membershipId: "m")

    private func slip(_ criteria: Int) -> SessionSlip {
        SessionSlip(sessionId: "session", studentId: "a", stars: SlipRules.stars(criteria: criteria), criteria: criteria,
                    note: "", status: .draft, sentAt: nil, version: -1, updatedAt: "2026-10-27T11:00:00.000Z")
    }

    private func attendance(_ student: String) -> Attendance {
        Attendance(sessionId: "session", studentId: student, status: .present, note: "", lateAt: nil, version: -1,
                   updatedAt: "2026-10-27T10:00:00.000Z")
    }

    private func slipCommand(_ criteria: Int, at time: TimeInterval) -> PendingCommand {
        PendingCommand(recordKey: RecordKey(entity: "slip", k1: "session", k2: "a").storageKey, baseVersion: 0, kind: "slip.set",
                       payload: .object(["session_id": .string("session"), "student_id": .string("a"),
                                         "criteria": .number(Double(criteria)), "comment": .string("c"), "note": .string("")]),
                       createdAt: Date(timeIntervalSince1970: time))
    }

    private func attendanceCommand(_ student: String, at time: TimeInterval) -> PendingCommand {
        PendingCommand(recordKey: RecordKey(entity: "attendance", k1: "session", k2: student).storageKey, baseVersion: 0,
                       kind: "attendance.set",
                       payload: .object(["session_id": .string("session"), "student_id": .string(student),
                                         "status": .string("present")]),
                       createdAt: Date(timeIntervalSince1970: time))
    }

    func testAttendanceQueuedBeforeASlipIsClaimedBeforeIt() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let command = attendanceCommand("a", at: 1_000)
        try await store.write(attendance("a"), forKey: command.recordKey, enqueueing: command)
        let edit = slipCommand(31, at: 1_001)
        try await store.write(slip(31), forKey: edit.recordKey, enqueueing: edit)

        let claimed = try await store.claimBatch(now: Date(timeIntervalSince1970: 2_000))

        XCTAssertEqual(claimed.map(\.kind), ["attendance.set", "slip.set"])
    }

    func testASlipEditMergedAfterANewerAttendanceCommandDoesNotJumpAheadOfIt() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let first = slipCommand(31, at: 1_000)
        try await store.write(slip(31), forKey: first.recordKey, enqueueing: first)
        let newcomer = attendanceCommand("b", at: 1_001)
        try await store.write(attendance("b"), forKey: newcomer.recordKey, enqueueing: newcomer)
        let again = slipCommand(15, at: 1_002)
        try await store.write(slip(15), forKey: again.recordKey, enqueueing: again)

        let claimed = try await store.claimBatch(now: Date(timeIntervalSince1970: 2_000))

        XCTAssertEqual(claimed.map(\.kind), ["attendance.set", "slip.set"])
        XCTAssertEqual(claimed.filter { $0.kind == "slip.set" }.count, 1, "the two edits are still one command")
        guard case .object(let fields) = claimed.last?.payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["criteria"], .number(15))
    }

    func testARefusedSlipEditIsNotResentAndTheNextSaveUsesANewCommand() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [
            "student": [.object(["id": .string("a"), "class_id": .string("c"), "name": .string("Em a"), "parent_phone": .null,
                                 "enrolled_at": .string("2026-09-01"), "left_at": .null, "status": .string("active"),
                                 "version": .number(1)])]], deleted: []))
        let api = SlipPushAPI(mode: .attendanceIncomplete)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()
        let student = try XCTUnwrap(data.students.first)
        let grading = I4FeatureStore.SlipGrading.criteria(15, comment: SlipRules.generatedSentence(criteria: 15))

        let first = await data.saveSlip(sessionID: "session", student: student, grading: grading, note: "Giữ")
        XCTAssertEqual(first, "Điểm danh chưa đồng bộ xong, thử lại sau.")
        let refused = try await store.queuedCommands().filter { $0.command.kind == "slip.set" }
        XCTAssertEqual(refused.map(\.state), ["rejected"])

        // Another sync does not send the refused command again.
        _ = try await SyncCoordinator(api: api, store: store, deviceId: DeviceIdentity.current()).synchronize()
        XCTAssertEqual(api.pushedCommandTypes.filter { $0 == "slip.set" }.count, 1)

        let second = await data.saveSlip(sessionID: "session", student: student, grading: grading, note: "Giữ")
        XCTAssertEqual(second, "Điểm danh chưa đồng bộ xong, thử lại sau.")
        let latest = try await store.queuedCommands().filter { $0.command.kind == "slip.set" }
        XCTAssertEqual(latest.count, 1, "the new save replaces the refused one")
        XCTAssertNotEqual(latest.first?.command.id, refused.first?.command.id, "the retry has its own command id")
        XCTAssertEqual(api.pushedCommandTypes.filter { $0 == "slip.set" }.count, 2)
    }
}
