import XCTest
@testable import QuanLyLop

/// The notes import from the draft to the outbox: nothing is written before the teacher saves, then every slip goes
/// into one local transaction and one sync request.
@MainActor
final class NotesImportFlowTests: XCTestCase {
    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")

    private func record(_ id: String) -> JSONValue {
        .object(["id": .string(id), "class_id": .string("c"), "name": .string("Em \(id)"), "parent_phone": .null,
                 "enrolled_at": .string("2026-09-01"), "left_at": .null, "status": .string("active"),
                 "version": .number(1)])
    }

    private func slipRecord(_ id: String, status: String) -> JSONValue {
        .object(["session_id": .string("session"), "student_id": .string(id), "stars": .number(5),
                 "criteria": .number(31), "comment": .string("Tốt"), "scale": .number(5), "note": .string("Cũ"),
                 "status": .string(status), "sent_at": .null, "version": .number(1),
                 "updated_at": .string("2026-10-25T10:00:00.000Z")])
    }

    private func roster(_ count: Int) -> [NotesImportRules.Student] {
        (1...count).map {
            NotesImportRules.Student(id: "s\($0)", fullName: "Em s\($0)", attendance: .present, enrollment: .active,
                                     slip: nil, homeworkNotDone: false)
        }
    }

    private func store(students: Int, slips: [JSONValue] = []) async throws -> SQLiteStore {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        var upserts: [String: [JSONValue]] = ["student": (1...students).map { record("s\($0)") }]
        if !slips.isEmpty { upserts["slip"] = slips }
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture", upserts: upserts, deleted: []))
        return store
    }

    private func draft(_ text: String, roster: [NotesImportRules.Student],
                       options: NotesImportRules.Options = .init(createDefaultsForRest: true)) -> NotesImportDraft {
        NotesImportDraft(result: NotesImportRules.analyze(text, students: roster, options: options), students: roster, options: options)
    }

    func testDraftCountsChangesAndNewSlipsAndTapsStayInMemory() {
        var draft = draft("Mất tập trung: Em s1, Em s2", roster: roster(4))
        XCTAssertEqual(draft.newCount, 4)
        XCTAssertEqual(draft.changingCount, 0)
        XCTAssertEqual(draft.unmet(for: "s1"), 1 << 0)
        XCTAssertEqual(draft.unmet(for: "s3"), 0)
        draft.toggle(studentID: "s3", criterion: 3)
        XCTAssertEqual(draft.unmet(for: "s3"), 1 << 3)
        draft.toggle(studentID: "s1", criterion: 0)
        XCTAssertEqual(draft.unmet(for: "s1"), 0)
    }

    func testSavesWriteTheCriteriaTheDraftShows() throws {
        var draft = draft("Mất tập trung: Em s1", roster: roster(2))
        draft.toggle(studentID: "s2", criterion: 4)
        let saves = draft.saves
        XCTAssertEqual(saves.count, 2)
        XCTAssertEqual(saves.first { $0.studentID == "s1" }?.unmetMask, 1)
        XCTAssertEqual(saves.first { $0.studentID == "s2" }?.hwManual, true)
        XCTAssertNil(saves.first { $0.studentID == "s1" }?.hwManual)
    }

    func testNothingIsWrittenUntilSave() async throws {
        let store = try await store(students: 3)
        let data = I4FeatureStore(store: store, api: CountingAPI())
        await data.refresh()
        _ = draft("Mất tập trung: Em s1", roster: roster(3))
        let pending = try await store.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
        XCTAssertTrue(data.slips(sessionID: "session").isEmpty)
    }

    func testTwentyStudentsGoInOneSyncRequest() async throws {
        let api = CountingAPI()
        let store = try await store(students: 20)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()
        let draft = draft("Mất tập trung: Em s1, Em s2\nBTVN: Em s3", roster: roster(20))

        let outcome = await data.saveNotesImport(sessionID: "session", saves: draft.saves, includeSent: false)

        XCTAssertNil(outcome.error)
        XCTAssertEqual(outcome.saved, 20)
        XCTAssertEqual(outcome.rejected, 0)
        XCTAssertEqual(api.pushRequests, 1)
        XCTAssertEqual(api.pushedCommandCount, 20)
        let row = try XCTUnwrap(data.slip(sessionID: "session", studentID: "s1"))
        XCTAssertEqual(row.criteria, SlipRules.allCriteria & ~1)
        XCTAssertEqual(row.status, .draft)
    }

    func testMoreThanOneBatchSplitsAtTheLimit() async throws {
        let api = CountingAPI()
        let store = try await store(students: 60)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()
        let draft = draft("Mất tập trung: Em s1", roster: roster(60))

        let outcome = await data.saveNotesImport(sessionID: "session", saves: draft.saves, includeSent: false)

        XCTAssertEqual(outcome.saved, 60)
        XCTAssertEqual(api.pushedCommandCount, 60)
        XCTAssertEqual(api.pushRequests, 2, "50 commands, then the remaining 10")
    }

    func testSentSlipIsLeftAloneUnlessAllowed() async throws {
        let slips = [slipRecord("s1", status: "sent"), slipRecord("s2", status: "draft")]
        let store = try await store(students: 2, slips: slips)
        let data = I4FeatureStore(store: store, api: SlipPushAPI(mode: .offline))
        await data.refresh()
        let info = { (state: NotesImportRules.SlipState) in
            NotesImportRules.SlipInfo(state: state, isLegacy: false, unmetMask: 0, note: "Cũ")
        }
        var people = roster(2)
        people[0].slip = info(.sent)
        people[1].slip = info(.draft)
        let draft = draft("Mất tập trung: Em s1, Em s2", roster: people, options: .init())
        XCTAssertEqual(draft.skippedCount, 1)

        let forced = [NotesImportSave(studentID: "s1", unmetMask: 1, note: "Cũ", hwManual: nil, criteriaChanged: true)]
        let outcome = await data.saveNotesImport(sessionID: "session", saves: forced + draft.saves, includeSent: false)

        XCTAssertEqual(outcome.saved, 1, "the sent slip is skipped even if a stale save lists it")
        let pending = try await store.pendingCommands().filter { $0.kind == "slip.set" }
        XCTAssertEqual(pending.count, 1)
        guard case .object(let fields) = try XCTUnwrap(pending.first).payload else { return XCTFail("payload is not an object") }
        XCTAssertEqual(fields["student_id"], .string("s2"))
        XCTAssertEqual(fields["criteria"], .number(30))
    }

    /// Refuses the slip of one student until told otherwise.
    private final class RejectingAPI: APIClient, @unchecked Sendable {
        let baseURL = URL(string: "https://fixture.invalid/v1")!
        private let lock = NSLock()
        private var refused: String?
        init(refusing student: String) { refused = student }
        func acceptAll() { lock.withLock { refused = nil } }

        func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
            let json: String
            switch endpoint.path {
            case "sync/push":
                let body = try JSONSerialization.jsonObject(with: endpoint.body ?? Data()) as? [String: Any]
                let refusing = lock.withLock { refused }
                let results = (body?["commands"] as? [[String: Any]] ?? []).compactMap { command -> String? in
                    guard let id = command["id"] as? String else { return nil }
                    let student = (command["payload"] as? [String: Any])?["student_id"] as? String
                    if student == refusing {
                        return "{\"id\":\"\(id)\",\"status\":\"rejected\",\"error\":{\"code\":\"forbidden\",\"message\":null}}"
                    }
                    return "{\"id\":\"\(id)\",\"status\":\"applied\",\"version\":1}"
                }.joined(separator: ",")
                json = "{\"epoch\":1,\"cursor\":1,\"results\":[\(results)]}"
            case "sync/pull":
                json = "{\"cursor\":1,\"epoch\":1,\"has_more\":false,\"server_time\":\"fixture\",\"upserts\":{},\"deleted\":[]}"
            default:
                throw APIFailure.offline
            }
            return try WireJSON.decoder().decode(type, from: Data(json.utf8))
        }
    }

    func testRefusedSlipsAreNamedByIdAndCanBeSentAgain() async throws {
        let api = RejectingAPI(refusing: "s2")
        let store = try await store(students: 3)
        let data = I4FeatureStore(store: store, api: api)
        await data.refresh()
        let draft = draft("Mất tập trung: Em s1", roster: roster(3))

        let first = await data.saveNotesImport(sessionID: "session", saves: draft.saves, includeSent: false)

        XCTAssertNil(first.error)
        XCTAssertEqual(first.saved, 2)
        XCTAssertEqual(first.rejectedStudentIDs, ["s2"])

        api.acceptAll()
        let retry = await data.saveNotesImport(sessionID: "session", saves: draft.saves.filter { $0.studentID == "s2" },
                                               includeSent: false)

        XCTAssertEqual(retry.saved, 1)
        XCTAssertTrue(retry.rejectedStudentIDs.isEmpty)
        let pending = try await store.pendingCommands()
        XCTAssertTrue(pending.isEmpty)
    }
}
