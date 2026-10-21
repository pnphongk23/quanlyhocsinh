import XCTest
@testable import QuanLyLop

@MainActor
final class CoreTests: XCTestCase {
    let scope = CacheScope(userId: "fixture-user", workspaceId: "fixture-workspace", membershipId: "fixture-member")
    func store() throws -> SQLiteStore { try SQLiteStore(path: ":memory:", scope: scope) }
    func cell(_ id: String = "student") -> String { RecordKey(entity: "score", k1: "test", k2: id).storageKey }
    func command(_ key: String, id: UUID = UUID(), version: Int = 0, kind: String = "score.set", time: Date = .now) -> PendingCommand {
        PendingCommand(id: id, recordKey: key, baseVersion: version, kind: kind,
            payload: .object(["test_id": .string("test"), "student_id": .string("student"), "value": .number(12.5)]), createdAt: time)
    }
    func testMaxScoreAndNullableScores() throws {
        let test = try TestDefinition(id: "test", classId: "class", name: "Fixture", date: "2026-10-21")
        XCTAssertEqual(test.maxScore, 15)
        try test.validate(score: 0); try test.validate(score: nil); try test.validate(score: 15)
        XCTAssertThrowsError(try test.validate(score: 15.1))
        XCTAssertThrowsError(try test.validate(score: -.infinity))
        XCTAssertThrowsError(try test.validateNewMaximum(10, highestScore: 12.5))
        XCTAssertThrowsError(try TestDefinition(id: "t", classId: "c", name: "", date: "", maxScore: 0))
        XCTAssertThrowsError(try TestDefinition(id: "t", classId: "c", name: "", date: "", maxScore: 1001))
        let wire = try WireJSON.value(test)
        XCTAssertEqual(wire["max"], .number(15)); XCTAssertNil(wire["max_score"])
        XCTAssertEqual(try WireJSON.decode(TestDefinition.self, from: wire), test)
        let absentMax = Data(#"{"id":"t","class_id":"c","name":"Fixture","date":"2026-10-21","version":1,"archived":false}"#.utf8)
        XCTAssertEqual(try WireJSON.decoder().decode(TestDefinition.self, from: absentMax).maxScore, 15)
    }
    func testSessionNumberComesOnlyFromServer() throws {
        let base = #"{"id":"s","class_id":"c","date":"2026-10-21","start_time":"18:00","origin":"recurring","is_makeup":false,"status":"planned","version":1,"session_number":37}"#
        let session = try WireJSON.decoder().decode(ClassSession.self, from: Data(base.utf8))
        XCTAssertEqual(session.sessionNumber, 37)
        let cancelled = try WireJSON.decoder().decode(ClassSession.self, from: Data(base.replacingOccurrences(of: "planned", with: "cancelled").utf8))
        XCTAssertNil(cancelled.sessionNumber)
        XCTAssertEqual(try WireJSON.value(cancelled)["session_number"], .null)
        let camel = base.replacingOccurrences(of: "session_number", with: "sessionNumber")
        XCTAssertEqual(try WireJSON.decoder().decode(ClassSession.self, from: Data(camel.utf8)).sessionNumber, 37)
    }
    func testEnumsRejectUnsupportedStatesAndTemplates() throws {
        XCTAssertEqual(AttendanceStatus.allCases.count, 4)
        XCTAssertEqual(HomeworkLevel.allCases.count, 3)
        XCTAssertEqual(Stars.allCases.count, 3)
        XCTAssertThrowsError(try WireJSON.decoder().decode(AttendanceStatus.self, from: Data(#""exam_absent""#.utf8)))
        XCTAssertThrowsError(try WireJSON.decoder().decode(Stars.self, from: Data("4".utf8)))
        XCTAssertTrue(Stars.three.template.contains("3 sao"))
    }
    func testIdempotencyTransactionAndCoalescing() async throws {
        let store = try store(), key = cell()
        let first = command(key, version: 3)
        try await store.write(Score(testId: "test", studentId: "student", value: 9, version: 3, updatedAt: "fixture"), forKey: key, enqueueing: first)
        try await store.write(Score(testId: "test", studentId: "student", value: 99, version: 3, updatedAt: "fixture"), forKey: key, enqueueing: first)
        let unchanged = try await store.read(Score.self, forKey: key)
        XCTAssertEqual(unchanged?.value, 9)
        let second = command(key, version: 10)
        try await store.write(Score(testId: "test", studentId: "student", value: 12.5, version: 3, updatedAt: "fixture"), forKey: key, enqueueing: second)
        let commands = try await store.pendingCommands()
        XCTAssertEqual(commands.count, 1); XCTAssertEqual(commands.first?.baseVersion, 3)
        XCTAssertEqual(commands.first?.id, second.id)
        do { try await store.write(123, forKey: "invalid", enqueueing: first); XCTFail("must reject mismatched key") } catch {}
        let invalid = try await store.read(Int.self, forKey: "invalid")
        XCTAssertNil(invalid)
    }
    func testOrderedPartialAcknowledgementAndRetry() async throws {
        let store = try store(), now = Date(timeIntervalSince1970: 1000)
        let first = command(cell("a"), kind: "test.create", time: now)
        let second = command(cell("b"), time: now.addingTimeInterval(1))
        try await store.write(1, forKey: first.recordKey, enqueueing: first)
        try await store.write(2, forKey: second.recordKey, enqueueing: second)
        let batch = try await store.claimBatch(now: now.addingTimeInterval(2))
        XCTAssertEqual(batch.map(\.id), [first.id, second.id])
        try await store.acknowledge([CommandResult(id: first.id, status: .applied, version: 1),
            CommandResult(id: second.id, status: .rejected, error: APIError(code: "forbidden", message: nil, details: nil, requestId: nil))])
        let remaining = try await store.queuedCommands()
        XCTAssertEqual(remaining.count, 1); XCTAssertEqual(remaining[0].state, "rejected")
        let noRetry = try await store.claimBatch(now: now.addingTimeInterval(1000))
        XCTAssertTrue(noRetry.isEmpty)
        let count = try await store.pendingCommandCount()
        XCTAssertEqual(count, 1)
    }
    func testRetryPreservesUUIDAndDoesNotCoalesceAttemptedCommand() async throws {
        let store = try store(), now = Date(timeIntervalSince1970: 1000), key = cell()
        let first = command(key, time: now)
        try await store.write(1, forKey: key, enqueueing: first)
        _ = try await store.claimBatch(now: now)
        try await store.retry([first.id], now: now, minimumDelay: 30)
        let second = command(key, time: now.addingTimeInterval(1))
        try await store.write(2, forKey: key, enqueueing: second)
        let early = try await store.claimBatch(now: now.addingTimeInterval(10))
        XCTAssertTrue(early.isEmpty)
        let retried = try await store.claimBatch(now: now.addingTimeInterval(31))
        XCTAssertEqual(retried.map(\.id), [first.id, second.id])
        try await store.acknowledge([CommandResult(id: first.id, status: .duplicate, originalStatus: .applied),
                                     CommandResult(id: second.id, status: .applied, version: 1)])
        let count = try await store.pendingCommandCount()
        XCTAssertEqual(count, 0)
    }
    func testDuplicateWithoutOriginalStatusReplaysInsteadOfStranding() async throws {
        let store = try store(), now = Date(timeIntervalSince1970: 1000), key = cell()
        let edit = command(key, time: now)
        try await store.write(1, forKey: key, enqueueing: edit)
        _ = try await store.claimBatch(now: now)
        try await store.acknowledge([CommandResult(id: edit.id, status: .duplicate)])
        let replay = try await store.claimBatch(now: now.addingTimeInterval(1))
        XCTAssertEqual(replay.map(\.id), [edit.id], "an unqualified duplicate must stay claimable with its UUID")
    }
    func testReopenAndScopeIsolation() async throws {
        let path = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString + ".sqlite").path
        defer { try? FileManager.default.removeItem(atPath: path) }
        let first = try SQLiteStore(path: path, scope: scope)
        let command = command(cell())
        try await first.write(5, forKey: cell(), enqueueing: command)
        _ = try await first.claimBatch(now: .now)
        let reopened = try SQLiteStore(path: path, scope: scope)
        let replay = try await reopened.claimBatch(now: .now)
        XCTAssertEqual(replay.first?.id, command.id)
        let other = try SQLiteStore(path: path, scope: CacheScope(userId: "other", workspaceId: "fixture-workspace", membershipId: "fixture-member"))
        let value = try await other.read(Int.self, forKey: cell())
        let count = try await other.pendingCommandCount()
        XCTAssertNil(value); XCTAssertEqual(count, 0)
    }
    func testPullVersionGuardDeletesAndAtomicCursor() async throws {
        let store = try store()
        func score(_ value: Double, _ version: Int) -> JSONValue {
            .object(["test_id": .string("test"), "student_id": .string("student"), "value": .number(value), "version": .number(Double(version)), "updated_at": .string("fixture")])
        }
        try await store.apply(PullPage(cursor: 1, epoch: 3, hasMore: false, serverTime: "fixture", upserts: ["score": [score(14, 3)]], deleted: []))
        try await store.apply(PullPage(cursor: 2, epoch: 3, hasMore: false, serverTime: "fixture", upserts: ["score": [score(10, 2)]], deleted: []))
        let latest = try await store.read(Score.self, forKey: cell())
        XCTAssertEqual(latest?.value, 14)
        do {
            try await store.apply(PullPage(cursor: 99, epoch: 3, hasMore: false, serverTime: "fixture", upserts: ["score": [.object([:])]], deleted: []))
            XCTFail("malformed page must roll back")
        } catch {}
        let position = try await store.position(); XCTAssertEqual(position?.cursor, 2)
        try await store.apply(PullPage(cursor: 3, epoch: 3, hasMore: false, serverTime: "fixture", upserts: [:], deleted: [RecordKey(entity: "score", k1: "test", k2: "student")]))
        let deleted = try await store.read(Score.self, forKey: cell()); XCTAssertNil(deleted)
    }
    func testSyncWithSpecFixturesAndUnseenPullCursor() async throws {
        let store = try store(), now = Date(timeIntervalSince1970: 1000)
        let command = command(cell(), time: now)
        try await store.write(1, forKey: cell(), enqueueing: command)
        let push = try APIEndpoint.json(method: .post, path: "sync/push", body: PushRequest(membershipId: scope.membershipId, deviceId: "fixture-device", commands: [command.wire]))
        let manifest = Data(#"{"cursor":5,"epoch":3,"window":{"from":"2026-07-23","to":"2026-12-16"},"entities":[]}"#.utf8)
        let response = PushResponse(epoch: 3, cursor: 99, results: [CommandResult(id: command.id, status: .duplicate, originalStatus: .applied)])
        let page = PullPage(cursor: 6, epoch: 3, hasMore: false, serverTime: "2026-10-21T11:20:00.000Z", upserts: [:], deleted: [])
        let api = StubAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!, fixtures: [
            APIEndpoint(method: .get, path: "sync/snapshot", query: ["membership_id": scope.membershipId]): manifest,
            push: try WireJSON.encoder().encode(response),
            APIEndpoint(method: .get, path: "sync/pull", query: ["membership_id": scope.membershipId, "cursor": "5", "epoch": "3", "limit": "200"]): try WireJSON.encoder().encode(page),
            APIEndpoint(method: .get, path: "sync/pull", query: ["membership_id": scope.membershipId, "cursor": "6", "epoch": "3", "limit": "200"]): try WireJSON.encoder().encode(page)
        ])
        try await SyncCoordinator(api: api, store: store, deviceId: "fixture-device").synchronize(now: now)
        let count = try await store.pendingCommandCount(), position = try await store.position()
        XCTAssertEqual(count, 0); XCTAssertEqual(position?.cursor, 6)
        let encoded = try JSONDecoder().decode(JSONValue.self, from: WireJSON.encoder().encode(command.wire))
        XCTAssertEqual(encoded["base_version"], .number(0))
        XCTAssertEqual(encoded["payload"]?["test_id"], .string("test"))
        XCTAssertNil(encoded["record_key"])
    }
    func testAllMVPFixturesDecodeAndSyncIntoSQLite() async throws {
        let api = try StubAPIClient.demo(baseURL: URL(string: "https://fixture.invalid/v1")!)
        let store = try store()
        try await SyncCoordinator(api: api, store: store, deviceId: "fixture-device").synchronize()
        let classes = try await store.records(Classroom.self, entity: "class")
        let students = try await store.records(Student.self, entity: "student")
        let sessions = try await store.records(ClassSession.self, entity: "class_session")
        let attendance = try await store.records(Attendance.self, entity: "attendance")
        let tests = try await store.records(TestDefinition.self, entity: "test")
        let scores = try await store.records(Score.self, entity: "score")
        let slips = try await store.records(SessionSlip.self, entity: "slip")
        let sections = try await store.records(HomeworkSection.self, entity: "homework_section")
        let grades = try await store.records(HomeworkGrade.self, entity: "homework_grade")
        let reports = try await store.records(MonthlyReport.self, entity: "report")
        let publications = try await store.records(ReportPublication.self, entity: "report_publication")
        XCTAssertEqual([classes.count,students.count,sessions.count,attendance.count,tests.count,scores.count,
                        slips.count,sections.count,grades.count,reports.count,publications.count], Array(repeating: 1, count: 11))
        XCTAssertEqual(sessions.first?.sessionNumber, 8)
        XCTAssertEqual(tests.first?.maxScore, 15)
        XCTAssertEqual(publications.first?.snapshot.homework.first?.excellent, 4)
    }
    /// Pull value wins over an optimistic local cell, even at the same `version` (`-1` placeholder):
    /// after acknowledgement this device's edit is gone and the server row is what the teacher sees.
    func testPullValueReplacesOptimisticSameVersionCell() async throws {
        let store = try store(), key = cell()
        let original = Score(testId: "test", studentId: "student", value: 14, version: 3, updatedAt: "fixture")
        try await store.write(original, forKey: key, enqueueing: nil)
        let edit = command(key, version: 2)
        try await store.write(Score(testId: "test", studentId: "student", value: 12.5, version: 3, updatedAt: "fixture"), forKey: key, enqueueing: edit)
        _ = try await store.claimBatch(now: .now)
        try await store.acknowledge([CommandResult(id: edit.id, status: .applied, version: 4)])
        let canonical = try await store.read(Score.self, forKey: key)
        XCTAssertEqual(canonical, original)
    }
    func testLogoutBlockedAcrossMembershipsAndRequiresServerAck() async throws {
        let store = try store(), token = InMemoryTokenStore(token: "FIXTURE")
        let api = StubAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!, fixtures: [:])
        try await store.write(1, forKey: cell(), enqueueing: command(cell()))
        do {
            try await SessionController(api: api, tokenStore: token, store: store).logout()
            XCTFail("pending edit must block logout")
        } catch SessionFailure.pendingCommands(let count) { XCTAssertEqual(count, 1) }
        let current = await token.token(); XCTAssertEqual(current, "FIXTURE")
        let clean = try self.store()
        do {
            try await SessionController(api: api, tokenStore: token, store: clean).logout()
            XCTFail("missing server acknowledgement must preserve token")
        } catch {}
        let preserved = await token.token(); XCTAssertEqual(preserved, "FIXTURE")
    }
    func testLogoutClearsEveryScopeForThatUserAndKeepsOtherUsersCache() async throws {
        let path = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString + ".sqlite").path
        defer { try? FileManager.default.removeItem(atPath: path) }
        let active = try SQLiteStore(path: path, scope: CacheScope(userId: "fixture-user", workspaceId: "one", membershipId: "teacher"))
        let secondScope = try SQLiteStore(path: path, scope: CacheScope(userId: "fixture-user", workspaceId: "two", membershipId: "guardian"))
        let otherUser = try SQLiteStore(path: path, scope: CacheScope(userId: "another-user", workspaceId: "one", membershipId: "teacher"))
        try await active.write(1, forKey: "cached", enqueueing: nil)
        try await secondScope.write(2, forKey: "cached", enqueueing: nil)
        try await otherUser.write(3, forKey: "cached", enqueueing: nil)
        try await secondScope.apply(PullPage(cursor: 8, epoch: 1, hasMore: false, serverTime: "fixture", upserts: [:], deleted: []))
        let token = InMemoryTokenStore(token: "FIXTURE")
        let api = StubAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!, fixtures: [
            APIEndpoint(method: .post, path: "auth/logout"): Data()
        ])

        try await SessionController(api: api, tokenStore: token, store: active).logout()

        let firstValue = try await active.read(Int.self, forKey: "cached")
        let secondValue = try await secondScope.read(Int.self, forKey: "cached")
        let otherValue = try await otherUser.read(Int.self, forKey: "cached")
        let secondPosition = try await secondScope.position()
        XCTAssertNil(firstValue)
        XCTAssertNil(secondValue)
        XCTAssertNil(secondPosition)
        XCTAssertEqual(otherValue, 3)
    }
    func testTokenStoreReplacementAndClear() async throws {
        let token = InMemoryTokenStore()
        await token.setToken("FIXTURE_NOT_A_TOKEN")
        let first = await token.token(); XCTAssertEqual(first, "FIXTURE_NOT_A_TOKEN")
        await token.setToken("SECOND_FIXTURE")
        let second = await token.token(); XCTAssertEqual(second, "SECOND_FIXTURE")
        await token.clear()
        let cleared = await token.token(); XCTAssertNil(cleared)
    }
}
