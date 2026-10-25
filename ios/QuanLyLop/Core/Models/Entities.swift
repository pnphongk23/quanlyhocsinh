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

    /// Rows saved or answered with a `session_number` still decode; the key is ignored.
    init(id: String, classId: String, date: String, startTime: String, origin: SessionOrigin,
         isMakeup: Bool = false, status: SessionStatus = .planned, note: String? = nil, version: Int = 1) {
        self.id = id; self.classId = classId; self.date = date; self.startTime = startTime
        self.origin = origin; self.isMakeup = isMakeup; self.status = status
        self.note = note; self.version = version
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

/// A session comment slip. Scale 5 slips carry the criteria bitmask (bit 0..4 in spec order) and stars equal
/// the number of criteria met; scale 3 slips predate the criteria and keep their 1...3 stars and old sentence.
struct SessionSlip: Codable, Sendable, Equatable {
    static let legacyScale = 3
    static let currentScale = 5

    let sessionId: String
    let studentId: String
    let stars: Int?
    let criteria: Int?
    /// Teacher-edited sentence; nil means "follow the default sentence for the stars".
    let comment: String?
    let scale: Int
    /// The teacher ticked or unticked the homework criterion by hand, so it no longer follows last session's grades.
    /// The server sends 0/1; parents never receive it.
    let hwManual: Bool
    let note: String
    let status: SlipStatus
    let sentAt: String?
    let version: Int
    let updatedAt: String

    init(sessionId: String, studentId: String, stars: Int?, criteria: Int? = nil, comment: String? = nil,
         scale: Int? = nil, hwManual: Bool = false, note: String, status: SlipStatus, sentAt: String?,
         version: Int, updatedAt: String) {
        self.sessionId = sessionId; self.studentId = studentId; self.stars = stars
        self.criteria = criteria; self.comment = comment
        self.scale = scale ?? (criteria == nil ? Self.legacyScale : Self.currentScale)
        self.hwManual = hwManual
        self.note = note; self.status = status; self.sentAt = sentAt; self.version = version
        self.updatedAt = updatedAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try c.decode(String.self, forKey: .sessionId)
        studentId = try c.decode(String.self, forKey: .studentId)
        stars = try c.decodeIfPresent(Int.self, forKey: .stars)
        criteria = try c.decodeIfPresent(Int.self, forKey: .criteria)
        comment = try c.decodeIfPresent(String.self, forKey: .comment)
        scale = try c.decodeIfPresent(Int.self, forKey: .scale) ?? Self.legacyScale
        if let flag = try? c.decodeIfPresent(Bool.self, forKey: .hwManual) {
            hwManual = flag
        } else {
            hwManual = (try c.decodeIfPresent(Int.self, forKey: .hwManual) ?? 0) != 0
        }
        note = try c.decode(String.self, forKey: .note)
        status = try c.decode(SlipStatus.self, forKey: .status)
        sentAt = try c.decodeIfPresent(String.self, forKey: .sentAt)
        version = try c.decode(Int.self, forKey: .version)
        updatedAt = try c.decode(String.self, forKey: .updatedAt)
    }

    var isLegacy: Bool { scale == Self.legacyScale }
    var legacyStars: Stars? { stars.flatMap(Stars.init(rawValue:)) }
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

/// A report batch (đợt) of one class: one calendar month (`month` "YYYY-MM"), or an older session range
/// (`month` nil). Session ids are nil for monthly batches and for ones migrated from months.
struct ReportBatch: Codable, Sendable, Equatable {
    let id: String
    let classId: String
    var month: String? = nil
    let fromSessionId: String?
    let toSessionId: String?
    let fromKey: String
    let toKey: String
    /// Session numbers of an old range batch as the server counted them; nil for monthly batches.
    var fromNumber: Int? = nil
    var toNumber: Int? = nil
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

/// Period printed on a report. Only reports of old session-range batches carry session numbers and a
/// server `label` ("Buổi 1–8 · 01/10–24/10"); the label of a monthly batch is dates only.
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

    private enum CodingKeys: String, CodingKey {
        case studentId, month, batchId, range, attendance, tests, stars, stars5, homework, generalComment, ready, missing
    }

    /// The server sends `stars5` next to `stars`; the copy this app caches nests it inside `stars`.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        studentId = try c.decode(String.self, forKey: .studentId)
        month = try c.decodeIfPresent(String.self, forKey: .month)
        batchId = try c.decodeIfPresent(String.self, forKey: .batchId)
        range = try c.decodeIfPresent(ReportRange.self, forKey: .range)
        attendance = try c.decode(AttendanceSummary.self, forKey: .attendance)
        tests = try c.decode([ReportTest].self, forKey: .tests)
        let plain = try c.decode(StarsSummary.self, forKey: .stars)
        let sibling = try c.decodeIfPresent(Stars5Summary.self, forKey: .stars5)
        stars = sibling.map { StarsSummary(three: plain.three, two: plain.two, one: plain.one, stars5: $0) } ?? plain
        homework = try c.decode([HomeworkSummary].self, forKey: .homework)
        generalComment = try c.decode(String.self, forKey: .generalComment)
        ready = try c.decode(Bool.self, forKey: .ready)
        missing = try c.decodeIfPresent([String].self, forKey: .missing)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(studentId, forKey: .studentId)
        try c.encodeIfPresent(month, forKey: .month)
        try c.encodeIfPresent(batchId, forKey: .batchId)
        try c.encodeIfPresent(range, forKey: .range)
        try c.encode(attendance, forKey: .attendance)
        try c.encode(tests, forKey: .tests)
        try c.encode(stars, forKey: .stars)
        try c.encode(homework, forKey: .homework)
        try c.encode(generalComment, forKey: .generalComment)
        try c.encode(ready, forKey: .ready)
        try c.encodeIfPresent(missing, forKey: .missing)
    }

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

/// Scale-5 counts of sent slips by stars.
struct Stars5Summary: Codable, Sendable, Equatable {
    var s5 = 0, s4 = 0, s3 = 0, s2 = 0, s1 = 0, s0 = 0
    var total: Int { s5 + s4 + s3 + s2 + s1 + s0 }
    /// Counts from `s5` down to `s0`.
    var descending: [(stars: Int, count: Int)] { [(5, s5), (4, s4), (3, s3), (2, s2), (1, s1), (0, s0)] }
}

/// `three/two/one` count only old scale-3 slips; `stars5` counts the 5-criteria slips (absent in old caches).
struct StarsSummary: Codable, Sendable, Equatable {
    let three: Int
    let two: Int
    let one: Int
    let stars5: Stars5Summary

    init(three: Int, two: Int, one: Int, stars5: Stars5Summary = Stars5Summary()) {
        self.three = three; self.two = two; self.one = one; self.stars5 = stars5
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        three = try c.decode(Int.self, forKey: .three)
        two = try c.decode(Int.self, forKey: .two)
        one = try c.decode(Int.self, forKey: .one)
        stars5 = try c.decodeIfPresent(Stars5Summary.self, forKey: .stars5) ?? Stars5Summary()
    }

    var legacyTotal: Int { three + two + one }
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

