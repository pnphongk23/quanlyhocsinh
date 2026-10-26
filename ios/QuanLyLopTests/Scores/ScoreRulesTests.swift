import XCTest
@testable import QuanLyLop

@MainActor
final class ScoreRulesTests: XCTestCase {
    func testEmptyBoxIsNotAnErrorAndInvalidValuesAre() {
        XCTAssertFalse(ScoreRules.isInvalid(""))
        XCTAssertTrue(ScoreRules.isEmpty("  "))
        for value in ["0", "0,5", "7,5", "7.5", "15", "1000"] {
            XCTAssertFalse(ScoreRules.isInvalid(value), "Expected \(value) to be valid")
        }
        XCTAssertFalse(ScoreRules.isInvalid(" 8 "))
        for value in ["7,3", "7,25", "1000,5", "1001", "-0,5", "abc"] {
            XCTAssertTrue(ScoreRules.isInvalid(value), "Expected \(value) to be invalid")
        }
    }

    func testMissingCountOnlyCountsSavedValues() {
        let students = [
            Student(id: "a", classId: "c", name: "An", parentPhone: nil, enrolledAt: "2026-09-01",
                    leftAt: nil, status: .active, version: 1),
            Student(id: "b", classId: "c", name: "Bình", parentPhone: nil, enrolledAt: "2026-09-01",
                    leftAt: nil, status: .active, version: 1)
        ]
        let scores = [
            Score(testId: "t", studentId: "a", value: 0, version: 1, updatedAt: "2026-10-21"),
            Score(testId: "t", studentId: "b", value: nil, version: 1, updatedAt: "2026-10-21")
        ]
        // 0 is a saved score; nil is "Chưa có điểm".
        XCTAssertEqual(ScoreRules.missingCount(testID: "t", students: students, scores: scores), 1)
    }

    func testDeletionArchivesWhenAnyScoreExists() {
        XCTAssertEqual(ScoreRules.deletionMode(hasScores: true), .archive)
        XCTAssertEqual(ScoreRules.deletionMode(hasScores: false), .delete)
        XCTAssertEqual(TestDeletion.archive.title, "Lưu trữ bài kiểm tra?")
        XCTAssertEqual(TestDeletion.delete.title, "Xoá bài kiểm tra?")
        XCTAssertEqual(TestDeletion.archive.actionLabel, "Lưu trữ bài")
        XCTAssertEqual(TestDeletion.delete.actionLabel, "Xoá bài")
        XCTAssertEqual(TestDeletion.delete.message, "Bài chưa có điểm nào nên sẽ bị xoá hẳn.")
    }

    func testInputTextUsesVietnameseDecimalSeparatorWithoutTrailingZeroes() {
        XCTAssertEqual(ScoreRules.inputText(nil), "")
        XCTAssertEqual(ScoreRules.inputText(9), "9")
        XCTAssertEqual(ScoreRules.inputText(7.5), "7,5")
        XCTAssertEqual(ScoreRules.inputText(0), "0")
    }

    func testScoreDisplayUsesVietnameseDecimalsAndDashForMissingValues() {
        XCTAssertEqual(I4Format.score(82.0), "82")
        XCTAssertEqual(I4Format.score(7.5), "7,5")
        XCTAssertEqual(I4Format.score(0.0), "0")
        XCTAssertEqual(I4Format.score(nil), "–")
    }

    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")

    private func seededData(students count: Int, scoredWith value: Double? = nil) async throws -> (I4FeatureStore, SQLiteStore) {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let students: [JSONValue] = (0..<count).map { i in
            .object(["id": .string("s\(i)"), "class_id": .string("c"), "name": .string("HS \(i)"), "parent_phone": .null,
                     "enrolled_at": .string("2026-09-01"), "left_at": .null, "status": .string("active"), "version": .number(1)])
        }
        let test: JSONValue = .object(["id": .string("t"), "class_id": .string("c"), "name": .string("Unit 6"),
                                       "date": .string("2026-10-21"), "archived": .bool(false), "version": .number(1)])
        var upserts: [String: [JSONValue]] = ["student": students, "test": [test]]
        if let value {
            upserts["score"] = (0..<count).map { i in
                .object(["test_id": .string("t"), "student_id": .string("s\(i)"), "value": .number(value),
                         "version": .number(1), "updated_at": .string("2026-10-21T10:00:00.000Z")])
            }
        }
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture", upserts: upserts, deleted: []))
        let data = I4FeatureStore(store: store)
        await data.refresh()
        return (data, store)
    }

    func testAssignDefaultOverwritesEveryScoreAndQueuesInBatchesOf50() async throws {
        let (data, store) = try await seededData(students: 120, scoredWith: 12)
        let test = try XCTUnwrap(data.tests.first)
        let failure = await data.assignDefaultScore(test: test, students: data.activeStudents(in: "c"))
        XCTAssertNil(failure)
        XCTAssertEqual(data.scores.count, 120)
        XCTAssertTrue(data.scores.allSatisfy { $0.value == 15 })
        let pending = try await store.pendingCommands()
        XCTAssertEqual(pending.count, 120)
        XCTAssertTrue(pending.allSatisfy { $0.kind == "score.set" && $0.baseVersion == 1 && $0.payload["value"] == .number(15) })
        var sizes: [Int] = []
        let now = Date.now.addingTimeInterval(60)
        while true {
            let batch = try await store.claimBatch(now: now)
            if batch.isEmpty { break }
            sizes.append(batch.count)
            try await store.acknowledge(batch.map { CommandResult(id: $0.id, status: .applied, error: nil) })
        }
        XCTAssertEqual(sizes, [50, 50, 20])
    }

    func testAssignDefaultSkipsStudentsAlreadyAt15AndFillsEmptyOnes() async throws {
        let (data, store) = try await seededData(students: 3)
        let test = try XCTUnwrap(data.tests.first)
        _ = await data.saveScores(test: test, values: ["s0": "15", "s1": "8"])
        let before = try await store.pendingCommands()
        XCTAssertEqual(before.count, 2)
        let baseVersions = Dictionary(uniqueKeysWithValues: before.map { ($0.recordKey, $0.baseVersion) })
        _ = await data.assignDefaultScore(test: test, students: data.activeStudents(in: "c"))
        let pending = try await store.pendingCommands()
        // s1's unsent 8 is replaced by 15 (the outbox merges unsent commands of one cell): 3 commands, not 4.
        XCTAssertEqual(pending.count, 3)
        XCTAssertEqual(Set(pending.map(\.recordKey)).count, 3)
        XCTAssertTrue(pending.allSatisfy { $0.kind == "score.set" && $0.payload["value"] == .number(15) })
        for command in pending {
            if let base = baseVersions[command.recordKey] { XCTAssertEqual(command.baseVersion, base) }
        }
        XCTAssertEqual(Set(data.scores.compactMap(\.value)), [15])
        XCTAssertEqual(data.scores.count, 3)
    }

    func testDraftsAfterAssignKeepWhatChangedWhileItRan() {
        let atConfirm = ["s0": "8", "s1": "12"]
        // s0 untouched, s1 edited again, s2 typed for the first time during the wait.
        let current = ["s0": "8", "s1": "12,5", "s2": "9"]
        XCTAssertEqual(ScoreRules.draftsAfterAssign(current: current, atConfirm: atConfirm), ["s1": "12,5", "s2": "9"])
        XCTAssertEqual(ScoreRules.draftsAfterAssign(current: atConfirm, atConfirm: atConfirm), [:])
    }

    func testSaveScoresRejectsAnythingOutsideTheScoreRangeBeforeWriting() async throws {
        let (data, store) = try await seededData(students: 2)
        let test = try XCTUnwrap(data.tests.first)
        let failure = await data.saveScores(test: test, values: ["s0": "10", "s1": "1000,5"])
        XCTAssertNotNil(failure)
        let none = try await store.pendingCommands()
        XCTAssertTrue(none.isEmpty)
        let result1 = await data.saveScores(test: test, values: ["s0": "1000", "s1": "0,5"])
        XCTAssertNil(result1)
    }

    func testCreateAndUpdateTestPayloadsCarryOnlyNameAndDate() async throws {
        let (data, store) = try await seededData(students: 1)
        let result2 = await data.saveTest(classID: "c", name: "Bài mới", date: "2026-10-25")
        XCTAssertNil(result2)
        let existing = try XCTUnwrap(data.tests.first { $0.id == "t" })
        let result3 = await data.saveTest(classID: "c", name: "Đổi tên", date: "2026-10-26", existing: existing)
        XCTAssertNil(result3)
        let pending = try await store.pendingCommands()
        let create = try XCTUnwrap(pending.first { $0.kind == "test.create" })
        let update = try XCTUnwrap(pending.first { $0.kind == "test.update" })
        guard case .object(let createFields) = create.payload, case .object(let updateFields) = update.payload else {
            return XCTFail("payloads must be objects")
        }
        XCTAssertEqual(Set(createFields.keys), ["id", "class_id", "name", "date"])
        XCTAssertEqual(Set(updateFields.keys), ["id", "name", "date"])
    }

    /// The store holds every class of the workspace: a new test belongs to the class being viewed, not the first one.
    func testNewTestBelongsToTheViewedClassNotTheFirstClassOfTheWorkspace() async throws {
        let (data, store) = try await seededData(students: 1)
        let classes: [JSONValue] = ["a-first", "c"].map {
            .object(["id": .string($0), "name": .string($0), "status": .string("active"), "weekdays": .null,
                     "start_time": .null, "version": .number(1)])
        }
        try await store.apply(PullPage(cursor: 2, epoch: 1, hasMore: false, serverTime: "fixture",
                                       upserts: ["class": classes], deleted: []))
        await data.refresh()
        let failure = await data.saveTest(classID: "c", name: "Bài mới", date: "2026-10-25")
        XCTAssertNil(failure)
        let create = try await store.pendingCommands().first { $0.kind == "test.create" }
        XCTAssertEqual(create?.payload["class_id"], .string("c"))
        XCTAssertEqual(data.tests(in: "c").map(\.name).sorted(), ["Bài mới", "Unit 6"])
        XCTAssertTrue(data.tests(in: "a-first").isEmpty)
    }
}
