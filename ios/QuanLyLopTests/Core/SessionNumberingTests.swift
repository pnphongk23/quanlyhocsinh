import XCTest
@testable import QuanLyLop

final class SessionNumberingTests: XCTestCase {
    private func session(_ id: String, _ date: String, _ time: String = "18:00", classId: String = "c1",
                         status: SessionStatus = .planned) -> ClassSession {
        ClassSession(id: id, classId: classId, date: date, startTime: time, origin: .recurring, status: status)
    }
    private func numbers(_ sessions: [ClassSession]) -> [String: Int?] {
        Dictionary(uniqueKeysWithValues: SessionNumbering.numbered(sessions).map { ($0.id, $0.sessionNumber) })
    }

    func testCancelledSessionInTheMiddleIsSkipped() {
        let result = numbers([session("a", "2026-10-01"), session("b", "2026-10-03", status: .cancelled),
                              session("c", "2026-10-05"), session("d", "2026-10-07")])
        XCTAssertEqual(result["a"]!, 1)
        XCTAssertNil(result["b"]!)
        XCTAssertEqual(result["c"]!, 2)
        XCTAssertEqual(result["d"]!, 3)
    }

    func testSameDayOrdersByStartTimeRegardlessOfInputOrder() {
        let result = numbers([session("late", "2026-10-01", "19:30"), session("early", "2026-10-01", "08:00"),
                              session("next", "2026-10-02")])
        XCTAssertEqual(result["early"]!, 1)
        XCTAssertEqual(result["late"]!, 2)
        XCTAssertEqual(result["next"]!, 3)
    }

    func testSessionsWithSameDateAndTimeShareTheServerNumber() {
        let result = numbers([session("a", "2026-10-01"), session("b", "2026-10-02"), session("c", "2026-10-02"),
                              session("d", "2026-10-03")])
        XCTAssertEqual(result["a"]!, 1)
        XCTAssertEqual(result["b"]!, 3)
        XCTAssertEqual(result["c"]!, 3)
        XCTAssertEqual(result["d"]!, 4)
    }

    func testFutureAndHeldSessionsAreAllNumbered() {
        let result = numbers([session("held", "2026-10-01", status: .held), session("planned", "2099-01-01")])
        XCTAssertEqual(result["held"]!, 1)
        XCTAssertEqual(result["planned"]!, 2)
    }

    func testClassesAreNumberedIndependently() {
        let result = numbers([session("a1", "2026-10-01"), session("b1", "2026-10-01", classId: "c2"),
                              session("a2", "2026-10-02"), session("b2", "2026-10-02", classId: "c2", status: .cancelled)])
        XCTAssertEqual(result["a1"]!, 1)
        XCTAssertEqual(result["a2"]!, 2)
        XCTAssertEqual(result["b1"]!, 1)
        XCTAssertNil(result["b2"]!)
    }

    func testLocalNumberReplacesWhateverWasStored() {
        let stale = ClassSession(id: "a", classId: "c1", date: "2026-10-01", startTime: "18:00", origin: .recurring, sessionNumber: 40)
        XCTAssertEqual(SessionNumbering.numbered([stale]).first?.sessionNumber, 1)
    }

    // MARK: Guardian dashboard from a snapshot without session numbers

    private func wireSession(_ id: String, _ date: String, status: String) -> JSONValue {
        .object(["id": .string(id), "class_id": .string("class"), "date": .string(date), "start_time": .string("18:00"),
                 "origin": .string("recurring"), "is_makeup": .bool(false), "status": .string(status),
                 "note": .null, "version": .number(1)])
    }

    func testGuardianDashboardCountsHeldSessionsWhenSnapshotHasNoNumbers() async throws {
        let scope = CacheScope(userId: "guardian-user", workspaceId: "workspace", membershipId: "guardian")
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let student: JSONValue = .object(["id": .string("child"), "class_id": .string("class"), "name": .string("Học sinh"), "parent_phone": .null,
                                          "enrolled_at": .string("2026-09-01"), "left_at": .null, "status": .string("active"), "version": .number(1)])
        let classroom: JSONValue = .object(["id": .string("class"), "name": .string("Lớp"), "status": .string("active")])
        func attendance(_ session: String, _ status: String) -> JSONValue {
            .object(["session_id": .string(session), "student_id": .string("child"), "status": .string(status), "note": .string(""),
                     "late_at": .null, "version": .number(1), "updated_at": .string("2026-10-10T00:00:00.000Z")])
        }
        let slip: JSONValue = .object(["session_id": .string("s3"), "student_id": .string("child"), "stars": .number(3),
                                       "note": .string(""), "status": .string("sent"), "sent_at": .string("2026-10-12T00:00:00.000Z"),
                                       "version": .number(1), "updated_at": .string("2026-10-12T00:00:00.000Z")])
        try await store.apply(PullPage(cursor: 1, epoch: 1, hasMore: false, serverTime: "fixture",
            upserts: ["student": [student], "class": [classroom],
                      "class_session": [wireSession("s1", "2026-10-02", status: "held"), wireSession("s2", "2026-10-05", status: "cancelled"),
                                        wireSession("s3", "2026-10-09", status: "held"), wireSession("s4", "2026-10-16", status: "planned")],
                      "attendance": [attendance("s1", "present"), attendance("s3", "late")], "slip": [slip]], deleted: []))

        let dashboard = try await GuardianRepository.dashboard(from: store)
        let child = try XCTUnwrap(dashboard.children.first)
        let month = child.attendanceMonth("2026-10")
        XCTAssertEqual(month.rows.map(\.session.id), ["s3", "s1"])
        XCTAssertEqual(month.rows.map(\.number), [2, 1])
        XCTAssertEqual(month.present + month.late, 2)
        let sent = try XCTUnwrap(child.sentSlips.first)
        XCTAssertEqual(sent.session.sessionNumber, 2)
        XCTAssertEqual(child.session(id: "s4")?.sessionNumber, 3)
        XCTAssertNil(child.session(id: "s2")?.sessionNumber)
    }
}
