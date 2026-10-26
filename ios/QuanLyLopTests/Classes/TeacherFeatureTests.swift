import XCTest
@testable import QuanLyLop

@MainActor
final class TeacherFeatureTests: XCTestCase {
    func testRosterRespectsEnrollmentInterval() {
        let active = Student(id: "s1", classId: "c1", name: "Học sinh", parentPhone: nil,
                             enrolledAt: "2026-10-10", leftAt: nil, status: .active, version: 1)
        XCTAssertTrue(TeacherFeatureData.student(active, isEnrolledOn: "2026-10-10"))
        XCTAssertTrue(TeacherFeatureData.student(active, isEnrolledOn: "2026-10-21"))

        let left = Student(id: "s2", classId: "c1", name: "Học sinh", parentPhone: nil,
                           enrolledAt: "2026-10-10", leftAt: "2026-10-20", status: .left, version: 2)
        XCTAssertTrue(TeacherFeatureData.student(left, isEnrolledOn: "2026-10-20"))
        XCTAssertFalse(TeacherFeatureData.student(left, isEnrolledOn: "2026-10-21"))
    }

    func testSessionDateLineIncludesWeekdayAndOptionalEndTime() {
        XCTAssertEqual(TeacherFormat.sessionDateLine(date: "2026-10-24", start: "18:00", end: "19:30"),
                       "Thứ Bảy, 24/10 · 18:00–19:30")
        XCTAssertEqual(TeacherFormat.sessionDateLine(date: "2026-10-24", start: "18:00", end: nil),
                       "Thứ Bảy, 24/10 · 18:00")
        XCTAssertEqual(TeacherFormat.sessionDateLine(date: "2026-10-25", start: "09:00", end: nil),
                       "Chủ Nhật, 25/10 · 09:00")
    }

    func testAttendanceOpensOnSessionDateAndStaysClosedForCancelledSessions() {
        let future = session(date: "2026-10-22", status: .planned)
        let today = session(date: "2026-10-21", status: .planned)
        let cancelledToday = session(date: "2026-10-21", status: .cancelled)

        XCTAssertFalse(TeacherFeatureData.allowsAttendance(for: future, today: "2026-10-21"))
        XCTAssertTrue(TeacherFeatureData.allowsAttendance(for: today, today: "2026-10-21"))
        XCTAssertFalse(TeacherFeatureData.allowsAttendance(for: cancelledToday, today: "2026-10-21"))
    }

    func testAttendanceHasThreeStatesAndAnOldExcusedRowReadsAsAbsent() throws {
        XCTAssertEqual(AttendanceStatus.allCases.map(\.rawValue), ["present", "late", "absent"])
        let old = try WireJSON.decoder().decode(AttendanceStatus.self, from: Data(#""excused""#.utf8))
        XCTAssertEqual(old, .absent)
        XCTAssertThrowsError(try WireJSON.decoder().decode(AttendanceStatus.self, from: Data(#""unknown""#.utf8)))
        let row = try WireJSON.decoder().decode(Attendance.self, from: Data(#"{"session_id":"s","student_id":"a","status":"excused","note":"Ốm","late_at":null,"version":1,"updated_at":"2026-10-21T10:00:00Z"}"#.utf8))
        XCTAssertEqual(row.status, .absent)
    }

    func testAttendanceDraftTreatsMissingRecordAsUnsavedAndExistingPresentAsUnchanged() {
        XCTAssertTrue(TeacherAttendanceDraft.hasChanges(draft: nil, stored: nil),
                      "a session with no attendance record must be saved even though it displays Present")

        let allPresent = TeacherAttendanceDraft(status: .present)
        XCTAssertTrue(TeacherAttendanceDraft.hasChanges(draft: allPresent, stored: nil),
                      "selecting All present must still create the missing attendance records")

        let storedPresent = Attendance(sessionId: "s1", studentId: "st1", status: .present, note: "",
                                       lateAt: nil, version: 1, updatedAt: "2026-10-21T10:00:00Z")
        XCTAssertFalse(TeacherAttendanceDraft.hasChanges(draft: nil, stored: storedPresent),
                       "a saved Present record with no edits is unchanged")
    }

    private func session(date: String, status: SessionStatus) -> ClassSession {
        ClassSession(id: "session", classId: "class", date: date, startTime: "18:00",
                     origin: .recurring, status: status)
    }

    // MARK: - Prototype rules copied from design/prototype/src/data

    func testSessionPrefixIsWeekdayAndDateForEverySession() {
        let planned = ClassSession(id: "s", classId: "c", date: "2026-10-19", startTime: "18:00",
                                   origin: .recurring, status: .planned, version: 1)
        XCTAssertEqual(TeacherFeatureData.sessionPrefix(planned), "T2 · 19/10")

        let cancelled = ClassSession(id: "s", classId: "c", date: "2026-10-16", startTime: "18:00",
                                     origin: .manual, isMakeup: true, status: .cancelled, version: 1)
        XCTAssertEqual(TeacherFeatureData.sessionPrefix(cancelled), "T6 · 16/10")
    }

    func testSplitSessionsSpotlightsTodayOrTheNextPlannedSession() {
        let data = demoData(sessions: [
            session(id: "past", date: "2026-10-19", status: .planned),
            session(id: "cancelledFuture", date: "2026-10-25", status: .cancelled),
            session(id: "next", date: "2026-10-26", status: .planned),
            session(id: "later", date: "2026-10-28", status: .planned),
        ])
        let groups = data.splitSessions(in: "class", today: "2026-10-21")
        XCTAssertEqual(groups.current.map(\.id), ["next"])
        XCTAssertEqual(groups.upcoming.map(\.id), ["later"])
        XCTAssertEqual(groups.past.map(\.id), ["past"])

        let withToday = demoData(sessions: [
            session(id: "today", date: "2026-10-21", status: .planned),
            session(id: "next", date: "2026-10-26", status: .planned),
        ])
        XCTAssertEqual(withToday.splitSessions(in: "class", today: "2026-10-21").current.map(\.id), ["today"])
    }

    func testAbsenceWarningCountsTheLastTwoHeldSessionsOnly() {
        let sessions = [
            session(id: "s1", date: "2026-10-12", status: .held),
            session(id: "s2", date: "2026-10-14", status: .held),
            session(id: "s3", date: "2026-10-19", status: .planned),
        ]
        let student = Student(id: "st", classId: "class", name: "Học sinh", parentPhone: nil,
                              enrolledAt: "2026-09-01", leftAt: nil, status: .active, version: 1)
        let absentTwice = demoData(sessions: sessions, attendance: [
            attendance(session: "s1", student: "st", status: .absent),
            attendance(session: "s2", student: "st", status: .absent),
        ], students: [student])
        XCTAssertEqual(absentTwice.consecutiveAbsences(of: student), 2)
        XCTAssertTrue(absentTwice.hasAbsenceWarning(student))
        XCTAssertEqual(absentTwice.absenceWarningCount(in: "class"), 1)
        XCTAssertEqual(absentTwice.studentsNeedingAttention(in: [student]).map(\.id), ["st"])
    }

    func testAttendanceRowWithoutNoteOrArrivalTimeDecodes() throws {
        let json = #"{"session_id":"s","student_id":"a","status":"late","version":2,"updated_at":"2026-10-26T10:00:00.000Z"}"#
        let row = try WireJSON.decoder().decode(Attendance.self, from: Data(json.utf8))
        XCTAssertEqual(row.status, .late)
        XCTAssertEqual(row.note, "")
        XCTAssertNil(row.lateAt)
    }

    func testAttendanceRateCountsAnOldExcusedRowAsAbsent() {
        let data = demoData(sessions: [session(id: "s1", date: "2026-10-14", status: .held)],
                            attendance: [
                                attendance(session: "s1", student: "a", status: .present),
                                attendance(session: "s1", student: "b", status: .late),
                                attendance(session: "s1", student: "c", status: .absent),
                                attendance(session: "s1", student: "d", status: .absent),
                            ])
        XCTAssertEqual(data.attendanceRate(in: "class"), 50)
    }

    func testUnfinishedAttendanceIncludesOnlyDueNonCancelledSessionsWithMissingRows() {
        let students = [
            Student(id: "a", classId: "class", name: "A", parentPhone: nil,
                    enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1),
            Student(id: "b", classId: "class", name: "B", parentPhone: nil,
                    enrolledAt: "2026-10-01", leftAt: nil, status: .active, version: 1),
        ]
        let due = session(id: "due", date: "2026-10-20", status: .planned)
        let cancelled = session(id: "cancelled", date: "2026-10-20", status: .cancelled)
        let future = session(id: "future", date: "2026-10-22", status: .planned)
        let existing = Attendance(sessionId: "due", studentId: "a", status: .present, note: "",
                                  lateAt: nil, version: 1, updatedAt: "2026-10-20T10:00:00Z")

        XCTAssertEqual(TeacherFeatureData.unfinishedAttendanceSessions(
            sessions: [due, cancelled, future], students: students, attendance: [existing], today: "2026-10-21"
        ).map(\.id), ["due"])
        let completed = Attendance(sessionId: "due", studentId: "b", status: .absent, note: "",
                                   lateAt: nil, version: 1, updatedAt: "2026-10-20T10:00:00Z")
        XCTAssertTrue(TeacherFeatureData.unfinishedAttendanceSessions(
            sessions: [due], students: students, attendance: [existing, completed], today: "2026-10-21"
        ).isEmpty)
    }

    // MARK: - Fixtures

    private func session(id: String, date: String, status: SessionStatus) -> ClassSession {
        ClassSession(id: id, classId: "class", date: date, startTime: "18:00",
                     origin: .recurring, status: status, version: 1)
    }

    private func attendance(session: String, student: String, status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: session, studentId: student, status: status, note: "",
                   lateAt: nil, version: 1, updatedAt: "2026-10-14T11:00:00Z")
    }

    private func demoData(sessions: [ClassSession] = [], attendance: [Attendance] = [],
                          students: [Student] = []) -> TeacherFeatureData {
        TeacherFeatureData(previewClasses: [
            Classroom(id: "class", name: "Lớp", status: .active, weekdays: [1, 3],
                      startTime: "18:00", version: 1),
        ], previewStudents: students, previewSessions: sessions, previewAttendance: attendance)
    }
}

@MainActor
final class OneOffSessionFormTests: XCTestCase {
    private let scope = CacheScope(userId: "teacher-user", workspaceId: "workspace", membershipId: "teacher")
    private let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!

    private func date(_ iso: String) throws -> Date {
        try XCTUnwrap(ISO8601DateFormatter().date(from: iso))
    }

    func testDayKeepsTheVietnamDateBetweenMidnightAndSevenInTheMorning() throws {
        // 00:30 and 06:59 in Ho Chi Minh City are still the previous day in UTC.
        XCTAssertEqual(TeacherSessionForm.day(try date("2026-10-26T17:30:00Z"), timeZone: vietnam), "2026-10-27")
        XCTAssertEqual(TeacherSessionForm.day(try date("2026-10-26T23:59:00Z"), timeZone: vietnam), "2026-10-27")
        XCTAssertEqual(TeacherSessionForm.day(try date("2026-10-27T16:59:00Z"), timeZone: vietnam), "2026-10-27")
        XCTAssertEqual(TeacherSessionForm.day(try date("2026-10-27T17:00:00Z"), timeZone: vietnam), "2026-10-28")
    }

    func testTimeIsTwentyFourHourWhateverTheLocale() throws {
        XCTAssertEqual(TeacherSessionForm.time(try date("2026-10-27T11:05:00Z"), timeZone: vietnam), "18:05")
        XCTAssertEqual(TeacherSessionForm.time(try date("2026-10-26T17:30:00Z"), timeZone: vietnam), "00:30")
    }

    private func failure(status: Int, code: String, reason: String?) -> APIFailure {
        .server(status: status, error: APIError(code: code, message: nil,
                                                details: reason.map { .object(["reason": .string($0)]) }, requestId: nil),
                retryAfter: nil)
    }

    func testServerReasonsMapToTheirMessages() {
        XCTAssertEqual(TeacherSessionForm.message(for: failure(status: 409, code: "conflict", reason: "session_exists")),
                       "Đã có buổi vào ngày và giờ này")
        XCTAssertEqual(TeacherSessionForm.message(for: failure(status: 422, code: "validation_error", reason: "date_in_past")),
                       "Không sửa được buổi đã qua ngày")
        XCTAssertTrue(TeacherSessionForm.message(for: failure(status: 409, code: "conflict", reason: "version_conflict"))
            .contains("thay đổi ở nơi khác"))
        let generic = TeacherSessionForm.message(for: failure(status: 409, code: "conflict", reason: "session_not_editable"))
        XCTAssertEqual(generic, TeacherSessionForm.message(for: APIFailure.offline))
        XCTAssertNotEqual(generic, "Đã có buổi vào ngày và giờ này")
    }

    func testEditingPatchesTheSessionWithItsVersionInsteadOfCreatingANewOne() async throws {
        let api = SessionAPI()
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        let data = TeacherFeatureData(store: store, api: api)
        let session = ClassSession(id: "11111111-1111-4111-8111-111111111111", classId: "c", date: "2026-10-30", startTime: "18:00",
                                   origin: .manual, isMakeup: false, status: .planned, note: nil, version: 3)

        try await data.updateOneOffSession(session, date: "2026-10-31", time: "19:30", note: "Học bù")

        let request = try XCTUnwrap(api.requests.first)
        XCTAssertEqual(api.requests.count, 1)
        XCTAssertEqual(request.method, .patch)
        XCTAssertEqual(request.path, "sessions/11111111-1111-4111-8111-111111111111")
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: request.body ?? Data()) as? [String: Any])
        XCTAssertEqual(body["base_version"] as? Int, 3)
        XCTAssertEqual(body["date"] as? String, "2026-10-31")
        XCTAssertEqual(body["start_time"] as? String, "19:30")
        XCTAssertEqual(body["note"] as? String, "Học bù")
        XCTAssertEqual(data.session(id: session.id)?.version, 4, "the answer is cached")
        XCTAssertEqual(data.session(id: session.id)?.date, "2026-10-31")
    }

    func testAddingStillPostsANewSession() async throws {
        let api = SessionAPI()
        let data = TeacherFeatureData(store: try SQLiteStore(path: ":memory:", scope: scope), api: api)
        try await data.addOneOffSession(id: "22222222-2222-4222-8222-222222222222", classID: "c", date: "2026-10-31", time: "19:30",
                                        makeup: false)
        XCTAssertEqual(api.requests.map(\.method), [.post])
        XCTAssertEqual(api.requests.first?.path, "classes/c/sessions")
    }
}

/// Answers a session create or edit with the session the request describes, one version ahead.
private final class SessionAPI: APIClient, @unchecked Sendable {
    let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let lock = NSLock()
    private var sent: [APIEndpoint] = []
    var requests: [APIEndpoint] { lock.withLock { sent } }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        lock.withLock { sent.append(endpoint) }
        let body = try JSONSerialization.jsonObject(with: endpoint.body ?? Data()) as? [String: Any] ?? [:]
        let id = endpoint.path.split(separator: "/").dropFirst().first.map(String.init).flatMap { endpoint.method == .patch ? $0 : nil }
            ?? (body["id"] as? String ?? "x")
        let version = ((body["base_version"] as? Int) ?? 0) + 1
        let json = """
        {"id":"\(id)","class_id":"c","date":"\(body["date"] as? String ?? "")","start_time":"\(body["start_time"] as? String ?? "")",\
        "origin":"manual","is_makeup":false,"status":"planned","note":"\(body["note"] as? String ?? "")","version":\(version)}
        """
        return try WireJSON.decoder().decode(type, from: Data(json.utf8))
    }
}
