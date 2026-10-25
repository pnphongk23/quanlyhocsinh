import Foundation

enum AttendanceStatus: String, Codable, Sendable, CaseIterable { case present, late, excused, absent }
enum HomeworkLevel: String, Codable, Sendable, CaseIterable { case excellent, done, notDone = "not_done" }
enum HomeworkKind: String, Codable, Sendable, CaseIterable { case vocabulary, reading, speaking, exercise }
enum SessionStatus: String, Codable, Sendable { case planned, held, cancelled }
enum SessionOrigin: String, Codable, Sendable { case recurring, manual }
enum ClassStatus: String, Codable, Sendable { case active, archived }
enum StudentStatus: String, Codable, Sendable { case active, left }
enum SlipStatus: String, Codable, Sendable { case draft, sent }
enum ReportStatus: String, Codable, Sendable { case draft, published }
enum ScopeKind: String, Codable, Sendable { case workspace, assignedClasses = "assigned_classes", linkedStudents = "linked_students" }
enum PermissionLevel: String, Codable, Sendable { case none, read, write }
enum PermissionGroup: String, Codable, Sendable, CaseIterable {
    case classes, students, sessionsAttendance = "sessions_attendance", scores, lectures, commentsReports = "comments_reports"
}
enum Stars: Int, Codable, Sendable, CaseIterable {
    case one = 1, two, three
    var template: String {
        switch self {
        case .three: String(localized: "core.stars.three")
        case .two: String(localized: "core.stars.two")
        case .one: String(localized: "core.stars.one")
        }
    }
}

struct ClassSession: Codable, Sendable, Equatable, Identifiable {
    let id: String
    let classId: String
    let date: String
    let startTime: String
    let origin: SessionOrigin
    let isMakeup: Bool
    let status: SessionStatus
    let note: String?
    let version: Int
    // Stored value is only a hint: `SessionNumbering` recomputes it whenever sessions are read.
    private let serverSessionNumber: Int?
    var sessionNumber: Int? { status == .cancelled ? nil : serverSessionNumber }

    enum CodingKeys: String, CodingKey {
        case id, classId, date, startTime, origin, isMakeup, status, note, version
        case serverSessionNumber = "sessionNumber"
    }
    init(id: String, classId: String, date: String, startTime: String, origin: SessionOrigin,
         isMakeup: Bool = false, status: SessionStatus = .planned, note: String? = nil,
         version: Int = 1, sessionNumber: Int? = nil) {
        self.id = id; self.classId = classId; self.date = date; self.startTime = startTime
        self.origin = origin; self.isMakeup = isMakeup; self.status = status
        self.note = note; self.version = version
        self.serverSessionNumber = status == .cancelled ? nil : sessionNumber
    }
    func withSessionNumber(_ number: Int?) -> ClassSession {
        ClassSession(id: id, classId: classId, date: date, startTime: startTime, origin: origin, isMakeup: isMakeup,
                     status: status, note: note, version: version, sessionNumber: number)
    }
    func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id); try c.encode(classId, forKey: .classId)
        try c.encode(date, forKey: .date); try c.encode(startTime, forKey: .startTime)
        try c.encode(origin, forKey: .origin); try c.encode(isMakeup, forKey: .isMakeup)
        try c.encode(status, forKey: .status); try c.encodeIfPresent(note, forKey: .note)
        try c.encode(version, forKey: .version)
        try c.encode(sessionNumber, forKey: .serverSessionNumber)
    }
}

enum ModelError: Error { case scoreOutsideRange }
struct TestDefinition: Codable, Sendable, Equatable, Identifiable {
    let id: String
    let classId: String
    let name: String
    let date: String
    let archived: Bool
    let version: Int
    enum CodingKeys: String, CodingKey { case id, classId, name, date, archived, version }
    init(id: String, classId: String, name: String, date: String,
         archived: Bool = false, version: Int = 1) {
        self.id = id; self.classId = classId; self.name = name; self.date = date
        self.archived = archived; self.version = version
    }
    /// Rows saved before the maximum was dropped still carry a `max` key; it is ignored here.
    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(id: try c.decode(String.self, forKey: .id), classId: try c.decode(String.self, forKey: .classId),
            name: try c.decode(String.self, forKey: .name), date: try c.decode(String.self, forKey: .date),
            archived: try c.decodeIfPresent(Bool.self, forKey: .archived) ?? false,
            version: try c.decodeIfPresent(Int.self, forKey: .version) ?? 1)
    }
    func validate(score: Double?) throws {
        if let score, ScoreRules.isInvalid(score) { throw ModelError.scoreOutsideRange }
    }
}

struct Classroom: Codable, Sendable, Equatable {
    let id: String
    let name: String
    let status: ClassStatus
    let weekdays: [Int]?
    let startTime: String?
    let version: Int?
}

struct Student: Codable, Sendable, Equatable {
    let id: String
    let classId: String
    let name: String
    let parentPhone: String?
    let enrolledAt: String
    let leftAt: String?
    let status: StudentStatus
    let version: Int
}

struct Attendance: Codable, Sendable, Equatable {
    let sessionId: String
    let studentId: String
    let status: AttendanceStatus
    let note: String
    let lateAt: String?
    let version: Int
    let updatedAt: String
}

struct Score: Codable, Sendable, Equatable {
    let testId: String
    let studentId: String
    let value: Double?
    let version: Int
    let updatedAt: String
}

struct SessionSlip: Codable, Sendable, Equatable {
    let sessionId: String
    let studentId: String
    let stars: Stars?
    let note: String
    let status: SlipStatus
    let sentAt: String?
    let version: Int
    let updatedAt: String
}

struct HomeworkSection: Codable, Sendable, Equatable {
    let id: String
    let classId: String
    let sessionId: String
    let kind: HomeworkKind
    let title: String
    let description: String
    let version: Int
}

struct HomeworkGrade: Codable, Sendable, Equatable {
    let sectionId: String
    let studentId: String
    let level: HomeworkLevel?
    let version: Int
    let updatedAt: String
}

/// One student's report inside a batch. `month` is only kept for rows that predate batches.
struct StudentReport: Codable, Sendable, Equatable {
    let id: String
    let classId: String
    let studentId: String
    var batchId: String?
    var month: String?
    let status: ReportStatus
    let generalComment: String
    let needsRepublish: Bool
    let publicationCount: Int
    let publishedAt: String?
    let version: Int

    init(id: String, classId: String, studentId: String, batchId: String? = nil, month: String? = nil,
         status: ReportStatus, generalComment: String, needsRepublish: Bool, publicationCount: Int,
         publishedAt: String?, version: Int) {
        self.id = id; self.classId = classId; self.studentId = studentId; self.batchId = batchId
        self.month = month; self.status = status; self.generalComment = generalComment
        self.needsRepublish = needsRepublish; self.publicationCount = publicationCount
        self.publishedAt = publishedAt; self.version = version
    }
}

/// A report batch (đợt): one session range of one class. Session ids are nil for batches migrated from months.
struct ReportBatch: Codable, Sendable, Equatable {
    let id: String
    let classId: String
    let fromSessionId: String?
    let toSessionId: String?
    let fromKey: String
    let toKey: String
    let version: Int
}

struct ReportPublication: Codable, Sendable, Equatable {
    let id: String
    let reportId: String
    let classId: String
    let studentId: String
    var batchId: String?
    var month: String?
    let publicationNo: Int
    let publishedAt: String
    let snapshot: ReportSnapshot

    init(id: String, reportId: String, classId: String, studentId: String, batchId: String? = nil,
         month: String? = nil, publicationNo: Int, publishedAt: String, snapshot: ReportSnapshot) {
        self.id = id; self.reportId = reportId; self.classId = classId; self.studentId = studentId
        self.batchId = batchId; self.month = month; self.publicationNo = publicationNo
        self.publishedAt = publishedAt; self.snapshot = snapshot
    }
}

/// Session range printed on a report; `label` is the server's text ("Buổi 1–8 · 01/10–24/10").
struct ReportRange: Codable, Sendable, Equatable {
    let fromKey: String
    let toKey: String
    var fromNumber: Int?
    var toNumber: Int?
    var label: String?
}

struct ReportSnapshot: Codable, Sendable, Equatable {
    let studentId: String
    var month: String?
    var batchId: String?
    var range: ReportRange?
    let attendance: AttendanceSummary
    let tests: [ReportTest]
    let stars: StarsSummary
    let homework: [HomeworkSummary]
    let generalComment: String
    let ready: Bool
    /// Only in previews: which data is still missing (`attendance`, `scores`, `comment`).
    var missing: [String]?

    init(studentId: String, month: String? = nil, batchId: String? = nil, range: ReportRange? = nil,
         attendance: AttendanceSummary, tests: [ReportTest], stars: StarsSummary,
         homework: [HomeworkSummary], generalComment: String, ready: Bool, missing: [String]? = nil) {
        self.studentId = studentId; self.month = month; self.batchId = batchId; self.range = range
        self.attendance = attendance; self.tests = tests; self.stars = stars; self.homework = homework
        self.generalComment = generalComment; self.ready = ready; self.missing = missing
    }
}

struct AttendanceSummary: Codable, Sendable, Equatable {
    let present: Int
    let late: Int
    let excused: Int
    let absent: Int
    let heldSessions: Int
}

struct ReportTest: Codable, Sendable, Equatable {
    let testId: String
    let name: String
    let date: String
    let value: Double?
}

struct StarsSummary: Codable, Sendable, Equatable {
    let three: Int
    let two: Int
    let one: Int
}

struct HomeworkSummary: Codable, Sendable, Equatable {
    let kind: HomeworkKind
    let excellent: Int
    let done: Int
    let notDone: Int
}

struct Workspace: Codable, Sendable, Equatable {
    let id: String
    let name: String
}

struct Role: Codable, Sendable, Equatable {
    let id: String
    let name: String
    let systemKey: String?
    let scopeKind: ScopeKind
}

struct Membership: Codable, Sendable, Equatable {
    let id: String
    let workspace: Workspace
    let role: Role
    let status: String?
    let scopeEpoch: Int?
    let permissions: [String:PermissionLevel]?
}

struct User: Codable, Sendable, Equatable {
    let id: String
    let phone: String
    let displayName: String?
    let mustChangePassword: Bool
}

struct AuthSession: Codable, Sendable, Equatable {
    let token: String
    let expiresAt: String
    let user: User
    let memberships: [Membership]
    let activeMembershipId: String?
}

struct CurrentIdentity: Codable, Sendable, Equatable {
    let user: User
    let activeMembershipId: String?
    let memberships: [Membership]
}

