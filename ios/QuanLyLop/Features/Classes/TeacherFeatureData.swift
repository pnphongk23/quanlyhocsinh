import Foundation
import Observation
import UIKit

struct ClientGeneratedID: Equatable, Sendable {
    let rawValue: String

    init(uuid: UUID = UUID()) {
        rawValue = uuid.uuidString.lowercased()
    }
}

struct TeacherClassRequest: Encodable {
    let id: String
    let name: String
    let weekdays: [Int]
    let startTime: String
}

struct TeacherStudentRequest: Encodable {
    let id: String
    let name: String
    let parentPhone: String?
    let enrolledAt: String
}

struct TeacherSessionRequest: Encodable {
    let id: String
    let date: String
    let startTime: String
    let isMakeup: Bool
    let note: String
}

/// The day, time and error text of the one-off session form. Days and times are written by the device calendar
/// (or the given zone), never by UTC, so a session picked after midnight keeps its day.
enum TeacherSessionForm {
    private static func calendar(_ timeZone: TimeZone) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    /// `yyyy-MM-dd`.
    static func day(_ date: Date, timeZone: TimeZone = .current) -> String {
        let parts = calendar(timeZone).dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// `HH:mm` on a 24-hour clock whatever the device locale.
    static func time(_ date: Date, timeZone: TimeZone = .current) -> String {
        let parts = calendar(timeZone).dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    /// What the sheet footer shows under the save button: the reason the server gave when there is one, the
    /// general save-error pill when the save failed without a reason of its own, otherwise the usual save status.
    enum FooterNotice: Equatable {
        case reason(String)
        case genericError
        case status
    }

    static func footerNotice(reason: String?, saveFailed: Bool) -> FooterNotice {
        if let reason { return .reason(reason) }
        return saveFailed ? .genericError : .status
    }

    /// What the form says for a failed save, from the reason the server gives (`details.reason`, or the code).
    static func message(for error: Error) -> String {
        specificMessage(for: error) ?? String(localized: "feature.classes.khong.luu.uoc.buoi.hoc.hay.kiem.tra.thong.tin.va")
    }

    /// Only the reasons the form knows; nil leaves the general save-error pill.
    static func specificMessage(for error: Error) -> String? {
        if case APIFailure.server(_, let apiError, _) = error {
            switch apiError.details?["reason"]?.string ?? apiError.code {
            case "session_exists": return String(localized: "classes.session.exists", table: "Teacher")
            case "date_in_past": return String(localized: "classes.session.datePast", table: "Teacher")
            case "version_conflict": return String(localized: "classes.session.versionConflict", table: "Teacher")
            default: break
            }
        }
        return nil
    }
}

@MainActor
@Observable
final class TeacherFeatureData {
    private(set) var classes: [Classroom] = []
    private(set) var students: [Student] = []
    private(set) var sessions: [ClassSession] = []
    private(set) var attendance: [Attendance] = []
    private(set) var tests: [TestDefinition] = []
    private(set) var scores: [Score] = []
    private(set) var errorMessage: String?
    private(set) var isReady = false
    private(set) var canReadClasses = false
    private(set) var canWriteClasses = false
    private(set) var canReadStudents = false
    private(set) var canWriteStudents = false
    private(set) var canReadAttendance = false
    private(set) var canWriteAttendance = false
    private(set) var canReadScores = false
    private(set) var canReadReports = false
    private(set) var roleName = String(localized: "feature.classes.giao.vien")
    private(set) var displayName = ""
    private(set) var saveStatusSource: AppSaveStatusSource?

    private var store: SQLiteStore?
    private var api: (any APIClient)?
    private var sync: SyncCoordinator?
    private var observer: Task<Void, Never>?

    init() {}

    /// Runs the screens' writes against a given store and API, without a signed-in session (tests).
    init(store: SQLiteStore, api: any APIClient) {
        self.store = store
        self.api = api
    }

    /// Screenshot/preview harness only: fills the observable with synthetic records so the
    /// teacher screens can be rendered without a session. No runtime path calls this.
    init(previewClasses: [Classroom], previewStudents: [Student], previewSessions: [ClassSession],
         previewAttendance: [Attendance] = [], displayName: String = String(localized: "feature.classes.co.lan")) {
        classes = previewClasses
        students = previewStudents
        sessions = previewSessions.sorted { ($0.date, $0.startTime) < ($1.date, $1.startTime) }
        attendance = previewAttendance
        self.displayName = displayName
        roleName = String(localized: "feature.classes.giao.vien")
        canReadClasses = true
        canWriteClasses = true
        canReadStudents = true
        canWriteStudents = true
        canReadAttendance = true
        canWriteAttendance = true
        canReadScores = true
        canReadReports = true
        isReady = true
    }

    func configure(auth: AuthModel) async {
        guard let membership = auth.activeMembership,
              let store = auth.activeStoreForLogout as? SQLiteStore,
              case .success(let configuration) = AppConfiguration.load() else { return }
        self.store = store
        saveStatusSource = AppSaveStatusSource(store: store)
        api = URLSessionAPIClient(configuration: configuration,
                                  tokenStore: KeychainTokenStore(service: configuration.tokenStoreService))
        sync = auth.activeSync
        roleName = membership.role.name
        displayName = auth.currentUser?.displayName ?? membership.role.name
        canReadClasses = allows(membership, group: "classes", write: false)
        canWriteClasses = allows(membership, group: "classes", write: true)
        canReadStudents = allows(membership, group: "students", write: false)
        canWriteStudents = allows(membership, group: "students", write: true)
        canReadAttendance = allows(membership, group: "sessions_attendance", write: false)
        canWriteAttendance = allows(membership, group: "sessions_attendance", write: true)
        canReadScores = allows(membership, group: "scores", write: false)
        canReadReports = allows(membership, group: "comments_reports", write: false)

        if observer == nil {
            observer = Task { [weak self, store] in
                let updates = await store.changes()
                for await _ in updates {
                      guard !Task.isCancelled else { return }
                      await self?.reload()
                      await self?.saveStatusSource?.refresh()
                  }
            }
        }
        await refresh()
    }

    func refresh() async {
        if let sync {
            do { try await sync.synchronize(); errorMessage = nil }
            catch { errorMessage = String(localized: "feature.classes.khong.the.ong.bo.du.lieu.vui.long.thu.lai") }
        }
        await reload()
        await saveStatusSource?.refresh()
    }

    func reload() async {
        guard let store else { return }
        do {
            classes = try await store.records(Classroom.self, entity: "class").sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            students = try await store.records(Student.self, entity: "student")
            sessions = try await store.classSessions().sorted { ($0.date, $0.startTime) < ($1.date, $1.startTime) }
            attendance = try await store.records(Attendance.self, entity: "attendance")
            tests = try await store.records(TestDefinition.self, entity: "test").filter { !$0.archived }
            scores = try await store.records(Score.self, entity: "score")
            isReady = true
        } catch {
            errorMessage = String(localized: "feature.classes.khong.oc.uoc.du.lieu.tren.thiet.bi")
        }
    }

    func createClass(id: String, name: String, weekdays: [Int], time: String) async throws {
        let response = try await send(.post, path: "classes", body: TeacherClassRequest(id: id.lowercased(), name: name, weekdays: weekdays.sorted(), startTime: time), as: Classroom.self)
        try await cache(response, entity: "class")
        await refresh()
    }

    func updateClass(_ klass: Classroom, name: String, weekdays: [Int], time: String) async throws {
        struct Request: Encodable { let name: String; let weekdays: [Int]; let startTime: String; let baseVersion: Int }
        guard let version = klass.version else { throw TeacherDataFailure.missingVersion }
        struct Response: Decodable { let id: String; let name: String; let status: ClassStatus; let weekdays: [Int]?; let startTime: String?; let version: Int }
        let value = try await send(.patch, path: "classes/\(klass.id)", body: Request(name: name, weekdays: weekdays.sorted(), startTime: time, baseVersion: version), as: Response.self)
        try await cache(Classroom(id: value.id, name: value.name, status: value.status, weekdays: value.weekdays, startTime: value.startTime, version: value.version), entity: "class")
        await refresh()
    }

    func archiveClass(_ klass: Classroom) async throws {
        struct Request: Encodable { let status: String; let baseVersion: Int }
        struct Response: Decodable { let id: String; let name: String; let status: ClassStatus; let weekdays: [Int]?; let startTime: String?; let version: Int }
        guard let version = klass.version else { throw TeacherDataFailure.missingVersion }
        let value = try await send(.patch, path: "classes/\(klass.id)", body: Request(status: "archived", baseVersion: version), as: Response.self)
        try await cache(Classroom(id: value.id, name: value.name, status: value.status, weekdays: value.weekdays, startTime: value.startTime, version: value.version), entity: "class")
        await refresh()
    }

    func addStudent(id: String, to classID: String, name: String, parentPhone: String?) async throws {
        let request = TeacherStudentRequest(id: id.lowercased(), name: name.trimmingCharacters(in: .whitespacesAndNewlines), parentPhone: parentPhone?.nilIfBlank, enrolledAt: Self.todayString)
        let value = try await send(.post, path: "classes/\(classID)/students", body: request, as: Student.self)
        try await cache(value, entity: "student")
        await refresh()
    }

    func updateStudent(_ student: Student, parentPhone: String?) async throws {
        struct Request: Encodable { let parentPhone: String?; let baseVersion: Int }
        let value = try await send(.patch, path: "students/\(student.id)", body: Request(parentPhone: parentPhone?.nilIfBlank, baseVersion: student.version), as: Student.self)
        try await cache(value, entity: "student")
        await refresh()
    }

    func markLeft(_ student: Student) async throws {
        struct Request: Encodable { let status: String; let leftAt: String; let baseVersion: Int }
        let value = try await send(.patch, path: "students/\(student.id)", body: Request(status: "left", leftAt: Self.todayString, baseVersion: student.version), as: Student.self)
        try await cache(value, entity: "student")
        await refresh()
    }

    func addOneOffSession(id: String, classID: String, date: String, time: String, makeup: Bool, note: String = "") async throws {
        let value = try await send(.post, path: "classes/\(classID)/sessions", body: TeacherSessionRequest(id: id.lowercased(), date: date, startTime: time, isMakeup: makeup, note: note), as: ClassSession.self)
        try await cache(value, entity: "class_session")
        await refresh()
    }

    /// Edits a one-off session that has not been held: the server checks the version, the day and the clash.
    func updateOneOffSession(_ session: ClassSession, date: String, time: String, note: String) async throws {
        struct Request: Encodable { let date: String; let startTime: String; let note: String; let baseVersion: Int }
        let value = try await send(.patch, path: "sessions/\(session.id)",
                                   body: Request(date: date, startTime: time, note: note, baseVersion: session.version),
                                   as: ClassSession.self)
        try await cache(value, entity: "class_session")
        await refresh()
    }

    func cancel(_ session: ClassSession) async throws {
        struct Response: Decodable { let id: String; let status: SessionStatus; let version: Int }
        let value = try await send(.post, path: "sessions/\(session.id)/cancel", body: EmptyResponse(), as: Response.self)
        guard let existing = sessions.first(where: { $0.id == value.id }) else { return }
        let changed = ClassSession(id: existing.id, classId: existing.classId, date: existing.date, startTime: existing.startTime,
                                   origin: existing.origin, isMakeup: existing.isMakeup, status: value.status, note: existing.note,
                                   version: value.version)
        try await cache(changed, entity: "class_session")
        await refresh()
    }

    func saveAttendance(session: ClassSession, drafts: [String: TeacherAttendanceDraft]) async throws {
        guard let store else { throw TeacherDataFailure.unavailable }
        for student in students(in: session.classId) where Self.student(student, isEnrolledOn: session.date) {
            let draft = drafts[student.id] ?? TeacherAttendanceDraft(status: attendanceFor(sessionID: session.id, studentID: student.id)?.status ?? .present)
            try await enqueueAttendance(session: session, student: student, draft: draft, store: store)
        }
        await reload()
        if let sync {
            do { try await sync.synchronize(); errorMessage = nil }
            catch { errorMessage = String(localized: "feature.classes.khong.the.luu.hoac.ong.bo.iem.danh.hay.thu.lai") }
        }
        await saveStatusSource?.refresh()
    }

    /// Only the status goes to the server; an old arrival time or note stays in the cached row and is never shown or sent.
    private func enqueueAttendance(session: ClassSession, student: Student, draft: TeacherAttendanceDraft, store: SQLiteStore) async throws {
        let old = attendance.first { $0.sessionId == session.id && $0.studentId == student.id }
        let value = Attendance(sessionId: session.id, studentId: student.id, status: draft.status, note: old?.note ?? "",
                               lateAt: old?.lateAt,
                               version: old?.version ?? 0, updatedAt: Date.now.ISO8601Format())
        let key = RecordKey(entity: "attendance", k1: session.id, k2: student.id).storageKey
        let payload = try WireJSON.value(AttendanceCommand(sessionId: session.id, studentId: student.id, status: draft.status))
        let command = PendingCommand(recordKey: key, baseVersion: old?.version ?? 0, kind: "attendance.set", payload: payload)
        try await store.write(value, forKey: key, enqueueing: command)
    }

    func attendanceFor(sessionID: String, studentID: String) -> Attendance? {
        attendance.first { $0.sessionId == sessionID && $0.studentId == studentID }
    }
    func students(in classID: String) -> [Student] {
        students.filter { $0.classId == classID }.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
    func activeStudents(in classID: String) -> [Student] {
        students(in: classID).filter { $0.status == .active }
    }
    func sessions(in classID: String) -> [ClassSession] { sessions.filter { $0.classId == classID } }
    func session(id: String) -> ClassSession? { sessions.first { $0.id == id } }
    func classroom(id: String) -> Classroom? { classes.first { $0.id == id } }
    func attendanceCount(in classID: String) -> Int { attendance.filter { record in sessions.contains(where: { $0.classId == classID && $0.id == record.sessionId }) }.count }
    /// `attendanceRate` of `data/logic.ts`: “Có phép” is excluded from the denominator
    /// (điểm danh footnote: “Có phép không bị trừ chuyên cần”).
    func attendanceRate(in classID: String) -> Int? {
        let classSessionIDs = Set(sessions.filter { $0.classId == classID && $0.status == .held }.map(\.id))
        let rows = attendance.filter { classSessionIDs.contains($0.sessionId) }
        guard !rows.isEmpty else { return nil }
        let attending = rows.filter { $0.status == .present || $0.status == .late }.count
        return Int((Double(attending) / Double(rows.count) * 100).rounded())
    }

    /// `splitSessions` of `data/sessionGroups.ts`: one spotlight session (today, or the next
    /// planned one), the sessions after it, and everything before today.
    func splitSessions(in classID: String, today: String) -> (current: [ClassSession], upcoming: [ClassSession], past: [ClassSession]) {
        let all = sessions(in: classID)
        var current = all.filter { $0.date == today }
        if current.isEmpty,
           let next = all.filter({ $0.status == .planned && $0.date > today })
                .sorted(by: Self.sessionOrder).first {
            current.append(next)
        }
        let currentIDs = Set(current.map(\.id))
        let upcoming = all.filter { $0.status == .planned && $0.date > today && !currentIDs.contains($0.id) }
            .sorted(by: Self.sessionOrder)
        let past = all.filter { $0.date < today }.sorted(by: Self.sessionOrder).reversed()
        return (current.sorted(by: Self.sessionOrder), upcoming, Array(past))
    }

    /// `consecutiveAbsences` of `data/logic.ts`: trailing “Vắng” rows of held sessions.
    func consecutiveAbsences(of student: Student) -> Int {
        let held = sessions.filter {
            $0.classId == student.classId && $0.status == .held && $0.date >= student.enrolledAt
                && (student.leftAt == nil || $0.date <= student.leftAt!)
        }
        .sorted { $0.date > $1.date }
        var count = 0
        for session in held {
            guard attendanceFor(sessionID: session.id, studentID: student.id)?.status == .absent else { break }
            count += 1
        }
        return count
    }

    /// `hasAbsenceWarning` of `data/logic.ts`.
    func hasAbsenceWarning(_ student: Student) -> Bool {
        student.status == .active && consecutiveAbsences(of: student) >= 2
    }

    /// Học sinh của buổi cần hiện trong thẻ “Cần chú ý”; rỗng thì thẻ ẩn hẳn.
    func studentsNeedingAttention(in roster: [Student]) -> [Student] {
        roster.filter(hasAbsenceWarning)
    }

    func absenceWarningCount(in classID: String) -> Int {
        activeStudents(in: classID).filter(hasAbsenceWarning).count
    }

    /// "T3 · 21/10": how a session is named.
    static func sessionPrefix(_ session: ClassSession) -> String {
        SessionLabel.title(for: session)
    }

    static func sessionOrder(_ first: ClassSession, _ second: ClassSession) -> Bool {
        (first.date, first.startTime) < (second.date, second.startTime)
    }

    /// `buildTodayAgenda` entries of `todayModel.ts`: every non-cancelled session of an active class
    /// today, held ones included, ordered by the session start time then class name.
    static func todaySessions(_ sessions: [ClassSession], classes: [Classroom], today: String) -> [ClassSession] {
        let active = Dictionary(uniqueKeysWithValues: classes.filter { $0.status == .active }.map { ($0.id, $0) })
        func name(_ session: ClassSession) -> String { active[session.classId]?.name ?? "" }
        return sessions
            .filter { $0.date == today && $0.status != .cancelled && active[$0.classId] != nil }
            .sorted { ($0.startTime, name($0)) < ($1.startTime, name($1)) }
    }

    static func nextPlannedSessions(_ sessions: [ClassSession], today: String) -> [ClassSession] {
        sessions.filter { $0.status == .planned && $0.date >= today }.sorted(by: sessionOrder)
    }

    /// Number of non-cancelled sessions on or before today that still have an unmarked student.
    static func unfinishedAttendanceCount(sessions: [ClassSession], students: [Student], attendance: [Attendance], today: String) -> Int {
        unfinishedAttendanceSessions(sessions: sessions, students: students, attendance: attendance, today: today).count
    }

    static func unfinishedAttendanceSessions(sessions: [ClassSession], students: [Student], attendance: [Attendance], today: String) -> [ClassSession] {
        sessions.filter { $0.status != .cancelled && $0.date <= today }.filter { session in
            let roster = students.filter { $0.classId == session.classId && student($0, isEnrolledOn: session.date) }
            guard !roster.isEmpty else { return false }
            return roster.contains { student in
                !attendance.contains { $0.sessionId == session.id && $0.studentId == student.id }
            }
        }.sorted(by: sessionOrder)
    }

    func unfinishedAttendanceCount(today: String) -> Int {
        Self.unfinishedAttendanceCount(sessions: sessions, students: students, attendance: attendance, today: today)
    }

    func unfinishedAttendanceSessions(today: String) -> [ClassSession] {
        Self.unfinishedAttendanceSessions(sessions: sessions, students: students, attendance: attendance, today: today)
    }

    func tests(in classID: String) -> [TestDefinition] { tests.filter { $0.classId == classID } }
    private func send<Response: Decodable & Sendable, Body: Encodable>(_ method: APIEndpoint.Method, path: String, body: Body, as type: Response.Type) async throws -> Response {
        guard let api else { throw TeacherDataFailure.unavailable }
        let endpoint = try APIEndpoint.json(method: method, path: path, body: body)
        return try await api.send(endpoint, as: type)
    }

    private func cache<Value: Encodable & Sendable>(_ value: Value, entity: String) async throws {
        guard let store else { throw TeacherDataFailure.unavailable }
        let json = try WireJSON.value(value)
        let key = try SQLiteStore.recordKey(entity: entity, value: json).storageKey
        try await store.write(value, forKey: key, enqueueing: nil)
    }

    private func allows(_ membership: Membership, group: String, write: Bool) -> Bool {
        if membership.role.scopeKind == .workspace { return true }
        guard let level = membership.permissions?[group] else { return false }
        return level == .write || (!write && level == .read)
    }

    static var todayString: String { TeacherSessionForm.day(.now) }

    static func student(_ student: Student, isEnrolledOn date: String) -> Bool {
        student.enrolledAt <= date && (student.leftAt == nil || student.leftAt! >= date)
    }

    static func allowsAttendance(for session: ClassSession, today: String) -> Bool {
        session.status != .cancelled && session.date <= today
    }
}

private struct AttendanceCommand: Encodable {
    let sessionId: String
    let studentId: String
    let status: AttendanceStatus
}

enum TeacherDataFailure: Error { case unavailable, missingVersion }

struct TeacherAttendanceDraft: Sendable, Equatable {
    var status: AttendanceStatus

    static func hasChanges(draft: TeacherAttendanceDraft?, stored: Attendance?) -> Bool {
        guard let stored else { return true }
        guard let draft else { return false }
        return draft != TeacherAttendanceDraft(status: stored.status)
    }
}

private extension String {
    var nilIfBlank: String? { trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : self }
}

extension Student: Identifiable {}
