import XCTest
@testable import QuanLyLop

@MainActor
final class SendSlipsTests: XCTestCase {
    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")

    private func slip(_ studentID: String, stars: Int, note: String) -> JSONValue {
        .object(["session_id": .string("session"), "student_id": .string(studentID), "stars": .number(Double(stars)),
                 "criteria": .number(Double((1 << stars) - 1)), "comment": .null, "scale": .number(5),
                 "note": .string(note), "status": .string("draft"), "sent_at": .null,
                 "version": .number(1), "updated_at": .string("2026-10-25T10:00:00.000Z")])
    }

    private func seed(_ store: SQLiteStore) async throws {
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture",
                                       upserts: ["slip": [slip("a", stars: 3, note: "Tốt"), slip("b", stars: 2, note: "Khá")]],
                                       deleted: []))
    }

    private func seededStore() async throws -> SQLiteStore {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        try await seed(store)
        return store
    }

    func testUnconfirmedSendLeavesNoCommandAndKeepsSlips() async throws {
        let store = try await seededStore()
        let api = SlipPushAPI(mode: .offline)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])

        guard case .failed = outcome else { return XCTFail("expected failure, got \(outcome)") }
        let pending = try await store.pendingCommands()
        XCTAssertFalse(pending.contains { $0.kind == "slip.send" })
        let slips = data.slips(sessionID: "session")
        XCTAssertEqual(slips.count, 2)
        XCTAssertTrue(slips.allSatisfy { $0.status != .sent && $0.sentAt == nil })
        XCTAssertEqual(slips.first { $0.studentId == "a" }?.note, "Tốt")
        XCTAssertEqual(slips.first { $0.studentId == "b" }?.stars, 2)
    }

    private func saveCriteria(hwManual: Bool?) async throws -> (payload: JSONValue, slip: SessionSlip?) {
        let store = try await seededStore()
        let data = I4FeatureStore(store: store, api: SlipPushAPI(mode: .offline))
        await data.refresh()
        let student = Student(id: "a", classId: "c", name: "Em a", parentPhone: nil, enrolledAt: "2026-09-01",
                              leftAt: nil, status: .active, version: 1)
        let failure = await data.saveSlip(sessionID: "session", student: student,
                                          grading: .criteria(0b01111, comment: nil, hwManual: hwManual), note: "")
        XCTAssertNil(failure)
        let command = try await store.pendingCommands().first { $0.kind == "slip.set" }
        return (try XCTUnwrap(command).payload, data.slip(sessionID: "session", studentID: "a"))
    }

    func testSlipSetSendsHwManualWhenTheTeacherSetsIt() async throws {
        let saved = try await saveCriteria(hwManual: true)
        guard case .object(let fields) = saved.payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["hw_manual"], .bool(true))
        XCTAssertEqual(saved.slip?.hwManual, true)
    }

    func testSlipSetOmitsHwManualWhenTheTeacherDidNotTouchHomework() async throws {
        let saved = try await saveCriteria(hwManual: nil)
        guard case .object(let fields) = saved.payload else { return XCTFail("payload is not an object") }
        XCTAssertNil(fields["hw_manual"])
        XCTAssertEqual(saved.slip?.hwManual, false)
    }

    func testFailedPushAfterSyncStillLeavesNoCommand() async throws {
        let store = try await seededStore()
        let api = SlipPushAPI(mode: .pushFails)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])

        guard case .failed = outcome else { return XCTFail("expected failure, got \(outcome)") }
        XCTAssertEqual(api.pushedCommandTypes, ["slip.send"])
        let pending = try await store.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
        XCTAssertTrue(data.slips(sessionID: "session").allSatisfy { $0.status != .sent })
    }

    func testConfirmedSendGoesDirectlyAndNeverEntersTheOutbox() async throws {
        let store = try await seededStore()
        let api = SlipPushAPI(mode: .sentAll)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])

        XCTAssertEqual(outcome, .sent(2))
        XCTAssertEqual(api.pushedCommandTypes, ["slip.send"])
        let pending = try await store.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
        XCTAssertTrue(data.slips(sessionID: "session").allSatisfy { $0.status == .sent })
    }

    func testSkippedSlipsStayUnsentAndAreCounted() async throws {
        let store = try await seededStore()
        let api = SlipPushAPI(mode: .sentOnlyA)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])

        XCTAssertEqual(outcome, .partial(sent: 1, notSent: 1))
        XCTAssertEqual(data.slip(sessionID: "session", studentID: "a")?.status, .sent)
        let skipped = data.slip(sessionID: "session", studentID: "b")
        XCTAssertEqual(skipped?.status, .draft)
        XCTAssertEqual(skipped?.stars, 2)
        XCTAssertNil(skipped?.sentAt)
        let pending = try await store.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
    }

    func testStudentsWithoutASlipAreSentAndNotAttendedIsNotAnError() async throws {
        let store = try await seededStore()
        let api = SlipPushAPI(mode: .notAttended)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b", "c", "d"])

        XCTAssertEqual(outcome, .sent(3))
        XCTAssertEqual(api.pushedStudentIDs, ["a", "b", "c", "d"])
        XCTAssertNil(data.slip(sessionID: "session", studentID: "d"))
        XCTAssertEqual(data.slip(sessionID: "session", studentID: "a")?.status, .sent)
        let pending = try await store.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
    }

    func testAServerSkipForAnotherReasonStillCountsAsNotSent() async throws {
        let store = try await seededStore()
        let api = SlipPushAPI(mode: .sentOnlyA)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()

        let outcome = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])

        XCTAssertEqual(outcome, .partial(sent: 1, notSent: 1))
    }

    func testReopeningTheStoreDropsALeftoverSlipSendAndForcesAResnapshot() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("slip-reopen-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let path = directory.appendingPathComponent("core.sqlite").path
        let slipKey = RecordKey(entity: "slip", k1: "session", k2: "a").storageKey

        do {
            let first = try SQLiteStore(path: path, scope: scope)
            try await seed(first)
            let leftover = PendingCommand(recordKey: slipKey, baseVersion: 1, kind: "slip.send",
                                          payload: .object(["session_id": .string("session"),
                                                            "student_ids": .array([.string("a")])]))
            let row = SessionSlip(sessionId: "session", studentId: "a", stars: 3, note: "Tốt", status: .sent,
                                  sentAt: "2026-10-25T10:00:00.000Z", version: 1, updatedAt: "2026-10-25T10:00:00.000Z")
            try await first.write(row, forKey: slipKey, enqueueing: leftover)
            let queued = try await first.pendingCommands()
            XCTAssertEqual(queued.map(\.kind), ["slip.send"])
        }

        let reopened = try SQLiteStore(path: path, scope: scope)
        let pending = try await reopened.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
        let position = try await reopened.position()
        XCTAssertNil(position)
    }
}

/// Answers the sync endpoints and one `slip.send` push; `pushedCommandTypes` shows what reached the wire.
private final class SlipPushAPI: APIClient, @unchecked Sendable {
    enum Mode { case offline, pushFails, sentAll, sentOnlyA, notAttended }

    let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let mode: Mode
    private let lock = NSLock()
    private var types: [String] = []
    private var studentIDs: [String] = []

    init(mode: Mode) { self.mode = mode }

    var pushedStudentIDs: [String] { lock.lock(); defer { lock.unlock() }; return studentIDs }
    var pushedCommandTypes: [String] { lock.lock(); defer { lock.unlock() }; return types }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        if mode == .offline { throw APIFailure.offline }
        let json: String
        switch endpoint.path {
        case "sync/push":
            let body = try JSONSerialization.jsonObject(with: endpoint.body ?? Data()) as? [String: Any]
            let commands = body?["commands"] as? [[String: Any]] ?? []
            let sentTypes = commands.compactMap { $0["type"] as? String }
            lock.withLock { types.append(contentsOf: sentTypes) }
            if mode == .pushFails { throw APIFailure.offline }
            let id = commands.compactMap { $0["id"] as? String }.first ?? ""
            let payload = commands.first?["payload"] as? [String: Any]
            lock.withLock { studentIDs = payload?["student_ids"] as? [String] ?? [] }
            let sent: String
            let skipped: String
            switch mode {
            case .sentAll: (sent, skipped) = ("[\"a\",\"b\"]", "[]")
            case .notAttended: (sent, skipped) = ("[\"a\",\"b\",\"c\"]", "[{\"student_id\":\"d\",\"reason\":\"not_attended\"}]")
            default: (sent, skipped) = ("[\"a\"]", "[{\"student_id\":\"b\",\"reason\":\"slip_locked\"}]")
            }
            json = "{\"epoch\":1,\"cursor\":1,\"results\":[{\"id\":\"\(id)\",\"status\":\"applied\",\"sent\":\(sent),\"skipped\":\(skipped)}]}"
        case "sync/pull":
            json = "{\"cursor\":1,\"epoch\":1,\"has_more\":false,\"server_time\":\"fixture\",\"upserts\":{},\"deleted\":[]}"
        default:
            throw APIFailure.offline
        }
        return try WireJSON.decoder().decode(type, from: Data(json.utf8))
    }
}
