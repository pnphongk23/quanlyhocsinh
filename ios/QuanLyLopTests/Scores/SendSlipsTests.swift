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
                                          grading: .criteria(0b01111, comment: SlipRules.generatedSentence(criteria: 0b01111), hwManual: hwManual), note: "")
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

    /// A saved slip for student "a" with a hand-written sentence and a hand-set homework flag.
    private func seededWithHandSentence() async throws -> (SQLiteStore, I4FeatureStore) {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        guard case .object(var fields) = slip("a", stars: 4, note: "Cũ") else { throw APIFailure.offline }
        fields["comment"] = .string("Con tiến bộ rõ")
        fields["hw_manual"] = .number(1)
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture",
                                       upserts: ["slip": [.object(fields)]], deleted: []))
        let data = I4FeatureStore(store: store, api: SlipPushAPI(mode: .offline))
        await data.refresh()
        return (store, data)
    }

    private let studentA = Student(id: "a", classId: "c", name: "Em a", parentPhone: nil, enrolledAt: "2026-09-01",
                                   leftAt: nil, status: .active, version: 1)

    func testSavingOnlyTheNoteKeepsTheHandSentenceAndSendsNoCriteria() async throws {
        let (store, data) = try await seededWithHandSentence()
        let failure = await data.saveSlip(sessionID: "session", student: studentA, grading: .noteOnly, note: "Mới")
        XCTAssertNil(failure)
        let command = try await store.pendingCommands().first { $0.kind == "slip.set" }
        guard case .object(let fields) = try XCTUnwrap(command).payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["note"], .string("Mới"))
        XCTAssertNil(fields["criteria"])
        XCTAssertNil(fields["comment"])
        XCTAssertNil(fields["hw_manual"])
        let row = try XCTUnwrap(data.slip(sessionID: "session", studentID: "a"))
        XCTAssertEqual(row.comment, "Con tiến bộ rõ")
        XCTAssertEqual(row.criteria, 0b1111)
        XCTAssertTrue(row.hwManual)
    }

    func testNilHwManualKeepsAHandSetFlag() async throws {
        let (store, data) = try await seededWithHandSentence()
        let failure = await data.saveSlip(sessionID: "session", student: studentA,
                                          grading: .criteria(0b00111, comment: SlipRules.generatedSentence(criteria: 0b00111), hwManual: nil), note: "Cũ")
        XCTAssertNil(failure)
        let command = try await store.pendingCommands().first { $0.kind == "slip.set" }
        guard case .object(let fields) = try XCTUnwrap(command).payload else { return XCTFail("payload is not an object") }
        XCTAssertNil(fields["hw_manual"])
        XCTAssertEqual(fields["comment"], .string(SlipRules.generatedSentence(criteria: 0b00111)),
                       "criteria never go without a sentence, or the server answers comment_required")
        XCTAssertTrue(try XCTUnwrap(data.slip(sessionID: "session", studentID: "a")).hwManual)
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

    // MARK: - Client-written sentences

    private func session(_ id: String, date: String, status: String = "planned") -> JSONValue {
        .object(["id": .string(id), "class_id": .string("c"), "date": .string(date), "start_time": .string("18:00"),
                 "origin": .string("recurring"), "is_makeup": .bool(false), "status": .string(status), "note": .null,
                 "version": .number(1)])
    }

    private func part(_ id: String, session: String) -> JSONValue {
        .object(["id": .string(id), "class_id": .string("c"), "session_id": .string(session), "kind": .string("vocabulary"),
                 "title": .string("Từ vựng"), "description": .string(""), "version": .number(1)])
    }

    private func attendance(_ student: String, _ status: String, session: String = "session") -> JSONValue {
        .object(["session_id": .string(session), "student_id": .string(student), "status": .string(status),
                 "version": .number(1), "updated_at": .string("2026-10-25T10:00:00.000Z")])
    }

    private func grade(_ section: String, _ student: String, _ level: String) -> JSONValue {
        .object(["section_id": .string(section), "student_id": .string(student), "level": .string(level),
                 "version": .number(1), "updated_at": .string("2026-10-25T10:00:00.000Z")])
    }

    func testSlipSendCarriesNoDefaultForStudentsWithoutASlip() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [
            "class_session": [session("before", date: "2026-10-19"), session("session", date: "2026-10-26")],
            "homework_section": [part("p", session: "before")],
            "homework_grade": [grade("p", "b", "not_done")],
            "attendance": [attendance("b", "late"), attendance("c", "absent"), attendance("a", "present")],
            "slip": [slip("a", stars: 3, note: "Tốt")]
        ], deleted: []))
        let api = SlipPushAPI(mode: .sentAll)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()

        _ = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b", "c"])

        XCTAssertNil(api.pushedDefaults, "b was present and c absent, but neither has a slip")
    }

    func testGradingHomeworkAgainRewritesTheNextSessionsDraftSlipAndSkipsSentOrHandSetOnes() async throws {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        func draft(_ student: String, status: String = "draft", hwManual: Int = 0) -> JSONValue {
            guard case .object(var fields) = slip(student, stars: 5, note: "Ghi chú \(student)") else { fatalError() }
            fields["status"] = .string(status); fields["hw_manual"] = .number(Double(hwManual))
            fields["criteria"] = .number(31); fields["session_id"] = .string("next")
            return .object(fields)
        }
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [
            "class_session": [session("before", date: "2026-10-19"), session("cancelled", date: "2026-10-22", status: "cancelled"),
                              session("next", date: "2026-10-26")],
            "homework_section": [part("p", session: "before")],
            "slip": [draft("a"), draft("b", status: "sent"), draft("c", hwManual: 1)]
        ], deleted: []))
        let data = I4FeatureStore(store: store, api: SlipPushAPI(mode: .offline))
        await data.refresh()
        let section = try XCTUnwrap(data.sections(sessionID: "before").first)

        for id in ["a", "b", "c"] {
            let student = Student(id: id, classId: "c", name: id, parentPhone: nil, enrolledAt: "2026-09-01", leftAt: nil,
                                  status: .active, version: 1)
            await data.grade(section, student: student, level: .notDone)
        }

        let commands = try await store.pendingCommands().filter { $0.kind == "slip.set" }
        XCTAssertEqual(commands.count, 1, "only the draft slip that follows the grades is rewritten")
        guard case .object(let fields) = try XCTUnwrap(commands.first).payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["session_id"], .string("next"), "the cancelled session in between is skipped")
        XCTAssertEqual(fields["student_id"], .string("a"))
        XCTAssertEqual(fields["criteria"], .number(15))
        XCTAssertEqual(fields["comment"], .string(SlipRules.generatedSentence(criteria: 15)))
        XCTAssertEqual(fields["note"], .string("Ghi chú a"))
        XCTAssertNil(fields["hw_manual"], "the flag is left as it is")
    }

    func testAssignAllDefaultsWritesCriteriaWithTheirSentenceAndClearsTheManualFlag() async throws {
        let (store, data) = try await seededWithHandSentence()
        try await store.apply(PullPage(cursor: 2, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [
            "student": [.object(["id": .string("a"), "class_id": .string("c"), "name": .string("Em a"), "parent_phone": .null,
                                 "enrolled_at": .string("2026-09-01"), "left_at": .null, "status": .string("active"),
                                 "version": .number(1)])]], deleted: []))
        await data.refresh()
        let plan = CommentsRules.DefaultSlip(studentID: "a", criteria: SlipRules.allCriteria, note: "Cũ")
        let failure = await data.saveDefaultSlips(sessionID: "session", slips: [plan])
        XCTAssertNil(failure)
        let command = try await store.pendingCommands().first { $0.kind == "slip.set" }
        guard case .object(let fields) = try XCTUnwrap(command).payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["criteria"], .number(31))
        XCTAssertEqual(fields["comment"], .string(SlipRules.generatedSentence(criteria: 31)))
        XCTAssertEqual(fields["hw_manual"], .bool(false))
        XCTAssertEqual(fields["note"], .string("Cũ"))
        let row = try XCTUnwrap(data.slip(sessionID: "session", studentID: "a"))
        XCTAssertFalse(row.hwManual)
        XCTAssertEqual(row.comment, SlipRules.generatedSentence(criteria: 31))
    }

    func testAssignAllDefaultsLeavesASentSlipEvenFromAnOlderPlan() async throws {
        let store = try await seededStore()
        let data = I4FeatureStore(store: store, api: SlipPushAPI(mode: .sentAll))
        await data.refresh()
        let stalePlan = [CommentsRules.DefaultSlip(studentID: "a", criteria: 31, note: "")]
        _ = await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"])
        let failure = await data.saveDefaultSlips(sessionID: "session", slips: stalePlan)
        XCTAssertNil(failure)
        let pending = try await store.pendingCommands()
        XCTAssertFalse(pending.contains { $0.kind == "slip.set" }, "a sent slip is never rewritten")
        XCTAssertEqual(data.slip(sessionID: "session", studentID: "a")?.status, .sent)
    }

    func testAssignAllDefaultsWaitsOutASendInFlight() async throws {
        let store = try await seededStore()
        let data = I4FeatureStore(store: store, api: SlipPushAPI(mode: .slowSentAll))
        await data.refresh()
        let sending = Task { await data.sendSlips(sessionID: "session", studentIDs: ["a", "b"]) }
        while !data.sendingSessionIDs.contains("session") { await Task.yield() }
        let failure = await data.saveDefaultSlips(sessionID: "session",
                                                  slips: [CommentsRules.DefaultSlip(studentID: "a", criteria: 31, note: "")])
        XCTAssertNil(failure)
        _ = await sending.value
        let pending = try await store.pendingCommands()
        XCTAssertFalse(pending.contains { $0.kind == "slip.set" }, "nothing is written while the send waits for the server")
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

    func testAssignAllDefaultsCreatesASlipForAStudentWithNoSlipAndNoAttendance() async throws {
        let store = try await seededStore()
        try await store.apply(PullPage(cursor: 2, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [
            "student": [.object(["id": .string("z"), "class_id": .string("c"), "name": .string("Em z"), "parent_phone": .null,
                                 "enrolled_at": .string("2026-09-01"), "left_at": .null, "status": .string("active"),
                                 "version": .number(1)])]], deleted: []))
        let data = I4FeatureStore(store: store, api: SlipPushAPI(mode: .offline))
        await data.refresh()
        XCTAssertNil(data.slip(sessionID: "session", studentID: "z"))

        let failure = await data.saveDefaultSlips(
            sessionID: "session", slips: [CommentsRules.DefaultSlip(studentID: "z", criteria: SlipRules.allCriteria, note: "")])

        XCTAssertNil(failure)
        let command = try await store.pendingCommands().first { $0.kind == "slip.set" }
        guard case .object(let fields) = try XCTUnwrap(command).payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["student_id"], .string("z"))
        XCTAssertEqual(fields["criteria"], .number(31))
        XCTAssertEqual(fields["comment"], .string(SlipRules.generatedSentence(criteria: 31)))
        XCTAssertEqual(fields["hw_manual"], .bool(false))
        let row = try XCTUnwrap(data.slip(sessionID: "session", studentID: "z"))
        XCTAssertEqual(row.status, .draft)
        XCTAssertEqual(row.stars, 5)
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
    enum Mode { case offline, pushFails, sentAll, slowSentAll, sentOnlyA }

    let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let mode: Mode
    private let lock = NSLock()
    private var types: [String] = []
    private var studentIDs: [String] = []
    private var defaults: [[String: Any]]?

    init(mode: Mode) { self.mode = mode }

    var pushedDefaults: [[String: Any]]? { lock.lock(); defer { lock.unlock() }; return defaults }
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
            if mode == .slowSentAll { try? await Task.sleep(nanoseconds: 300_000_000) }
            let id = commands.compactMap { $0["id"] as? String }.first ?? ""
            let payload = commands.first?["payload"] as? [String: Any]
            lock.withLock {
                studentIDs = payload?["student_ids"] as? [String] ?? []
                defaults = payload?["defaults"] as? [[String: Any]]
            }
            let sent: String
            let skipped: String
            switch mode {
            case .sentAll, .slowSentAll: (sent, skipped) = ("[\"a\",\"b\"]", "[]")
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
