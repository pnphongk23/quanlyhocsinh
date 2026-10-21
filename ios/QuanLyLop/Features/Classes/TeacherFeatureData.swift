import Foundation
import Observation
import UIKit

struct TeacherClassRequest: Encodable {
    let name: String
    let weekdays: [Int]
    let startTime: String
}

struct TeacherStudentRequest: Encodable {
    let name: String
    let parentPhone: String?
    let enrolledAt: String
}

struct TeacherSessionRequest: Encodable {
    let date: String
    let startTime: String
    let isMakeup: Bool
    let note: String
}

struct GuardianCredentialResponse: Decodable {
    let temporaryPassword: String
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
    private(set) var roleName = "Giáo viên"
    private(set) var displayName = ""

    private var store: SQLiteStore?
    private var api: (any APIClient)?
    private var sync: SyncCoordinator?
    private var observer: Task<Void, Never>?

    func configure(auth: AuthModel) async {
        guard let membership = auth.activeMembership,
              let store = auth.activeStoreForLogout as? SQLiteStore,
              case .success(let configuration) = AppConfiguration.load() else { return }
        self.store = store
        api = URLSessionAPIClient(configuration: configuration,
                                  tokenStore: KeychainTokenStore(service: "vn.quanlylop.\(configuration.environment.rawValue)"))
        sync = SyncCoordinator(api: api!, store: store, deviceId: UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString)
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
                }
            }
        }
        await refresh()
    }

    func refresh() async {
        if let sync {
            do { try await sync.synchronize(); errorMessage = nil }
            catch { errorMessage = "Không thể đồng bộ dữ liệu. Vui lòng thử lại." }
        }
        await reload()
    }

    func reload() async {
        guard let store else { return }
        do {
            classes = try await store.records(Classroom.self, entity: "class").sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            students = try await store.records(Student.self, entity: "student")
            sessions = try await store.records(ClassSession.self, entity: "class_session").sorted { ($0.date, $0.startTime) < ($1.date, $1.startTime) }
            attendance = try await store.records(Attendance.self, entity: "attendance")
            tests = try await store.records(TestDefinition.self, entity: "test").filter { !$0.archived }
            scores = try await store.records(Score.self, entity: "score")
            isReady = true
        } catch {
            errorMessage = "Không đọc được dữ liệu trên thiết bị."
        }
    }

    func createClass(name: String, weekdays: [Int], time: String) async throws {
        let response = try await send(.post, path: "classes", body: TeacherClassRequest(name: name, weekdays: weekdays.sorted(), startTime: time), as: Classroom.self)
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

    func addStudent(to classID: String, name: String, parentPhone: String?) async throws {
        let request = TeacherStudentRequest(name: name.trimmingCharacters(in: .whitespacesAndNewlines), parentPhone: parentPhone?.nilIfBlank, enrolledAt: Self.todayString)
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

    func issueGuardianPassword(for student: Student) async throws -> String {
        struct Request: Encodable { let displayName: String }
        let value = try await send(.post, path: "students/\(student.id)/guardian-credentials", body: Request(displayName: student.name), as: GuardianCredentialResponse.self)
        return value.temporaryPassword
    }

    func addOneOffSession(classID: String, date: String, time: String, makeup: Bool) async throws {
        let value = try await send(.post, path: "classes/\(classID)/sessions", body: TeacherSessionRequest(date: date, startTime: time, isMakeup: makeup, note: ""), as: ClassSession.self)
        try await cache(value, entity: "class_session")
        await refresh()
    }

    func cancel(_ session: ClassSession) async throws {
        struct Response: Decodable { let id: String; let status: SessionStatus; let version: Int }
        let value = try await send(.post, path: "sessions/\(session.id)/cancel", body: EmptyResponse(), as: Response.self)
        guard let existing = sessions.first(where: { $0.id == value.id }) else { return }
        let changed = ClassSession(id: existing.id, classId: existing.classId, date: existing.date, startTime: existing.startTime,
                                   origin: existing.origin, isMakeup: existing.isMakeup, status: value.status, note: existing.note,
                                   version: value.version, sessionNumber: existing.sessionNumber)
        try await cache(changed, entity: "class_session")
        await refresh()
    }

    func saveAttendance(session: ClassSession, drafts: [String: TeacherAttendanceDraft]) async throws {
        guard let store else { throw TeacherDataFailure.unavailable }
        for student in students(in: session.classId) where Self.student(student, isEnrolledOn: session.date) {
            let draft = drafts[student.id] ?? TeacherAttendanceDraft(status: attendanceFor(sessionID: session.id, studentID: student.id)?.status ?? .present,
                                                                    lateAt: attendanceFor(sessionID: session.id, studentID: student.id)?.lateAt,
                                                                    note: attendanceFor(sessionID: session.id, studentID: student.id)?.note ?? "")
            try await enqueueAttendance(session: session, student: student, draft: draft, store: store)
        }
        await reload()
        if let sync {
            do { try await sync.synchronize(); errorMessage = nil }
            catch { errorMessage = "Không thể lưu hoặc đồng bộ điểm danh. Hãy thử lại." }
        }
    }

    private func enqueueAttendance(session: ClassSession, student: Student, draft: TeacherAttendanceDraft, store: SQLiteStore) async throws {
        let old = attendance.first { $0.sessionId == session.id && $0.studentId == student.id }
        let lateAt = draft.status == .late ? draft.lateAt : nil
        let value = Attendance(sessionId: session.id, studentId: student.id, status: draft.status, note: draft.note,
                               lateAt: lateAt,
                               version: old?.version ?? 0, updatedAt: Date.now.ISO8601Format())
        let key = RecordKey(entity: "attendance", k1: session.id, k2: student.id).storageKey
        let payload = try WireJSON.value(AttendanceCommand(sessionId: session.id, studentId: student.id, status: draft.status, lateAt: lateAt, note: draft.note.trimmingCharacters(in: .whitespacesAndNewlines)))
        let command = PendingCommand(recordKey: key, baseVersion: old?.version ?? 0, kind: "attendance.set", payload: payload)
        try await store.write(value, forKey: key, enqueueing: command)
    }

    func attendanceFor(sessionID: String, studentID: String) -> Attendance? {
        attendance.first { $0.sessionId == sessionID && $0.studentId == studentID }
    }
    func students(in classID: String) -> [Student] {
        students.filter { $0.classId == classID }.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
    func sessions(in classID: String) -> [ClassSession] { sessions.filter { $0.classId == classID } }
    func session(id: String) -> ClassSession? { sessions.first { $0.id == id } }
    func classroom(id: String) -> Classroom? { classes.first { $0.id == id } }
    func attendanceCount(in classID: String) -> Int { attendance.filter { record in sessions.contains(where: { $0.classId == classID && $0.id == record.sessionId }) }.count }
    func attendanceRate(in classID: String) -> Int? {
        let classSessionIDs = Set(sessions.filter { $0.classId == classID && $0.status == .held }.map(\.id))
        let rows = attendance.filter { classSessionIDs.contains($0.sessionId) }
        guard !rows.isEmpty else { return nil }
        return Int((Double(rows.filter { $0.status == .present || $0.status == .late }.count) / Double(rows.count) * 100).rounded())
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

    static var todayString: String { Date.now.formatted(.iso8601.year().month().day().dateSeparator(.dash)) }

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
    let lateAt: String?
    let note: String
}

enum TeacherDataFailure: Error { case unavailable, missingVersion }

struct TeacherAttendanceDraft: Sendable, Equatable {
    var status: AttendanceStatus
    var lateAt: String?
    var note: String
}

private extension String {
    var nilIfBlank: String? { trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : self }
}

extension Student: Identifiable {}
