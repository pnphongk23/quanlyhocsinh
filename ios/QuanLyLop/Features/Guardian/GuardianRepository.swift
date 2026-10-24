import Foundation
import SwiftUI

// MARK: - Dữ liệu màn phụ huynh

struct GuardianDashboard: Sendable {
    let children: [GuardianChildData]
    /// When the data was last refreshed from the server; nil when that time is unknown.
    let updatedAt: Date?
    /// The server could not be reached (or answered only in part), so the cache is shown.
    let isOffline: Bool

    init(children: [GuardianChildData], updatedAt: Date? = Date.now, isOffline: Bool = false) {
        self.children = children
        self.updatedAt = updatedAt
        self.isOffline = isOffline
    }
}

struct GuardianChildData: Sendable, Identifiable {
    let student: Student
    let className: String
    let sessions: [ClassSession]
    let attendances: [Attendance]
    let tests: [TestDefinition]
    let scores: [Score]
    let slips: [SessionSlip]
    let homeworkSections: [HomeworkSection]
    let homeworkGrades: [HomeworkGrade]
    let publications: [ReportPublication]

    var id: String { student.id }

    /// Tháng có buổi đã diễn ra (`childMonths` in `guardianRead.ts`), mới nhất trước.
    var months: [String] {
        let held = sessions.filter { $0.status == .held }.map { String($0.date.prefix(7)) }
        return Array(Set(held)).sorted(by: >)
    }

    /// Tháng đang xem: tháng gần nhất còn buổi, chưa có buổi nào thì tháng hiện tại.
    var defaultMonth: String { months.first ?? GuardianFormat.currentMonth }

    /// Published reports of the child: the latest publication of each report, newest range first.
    /// Read from the snapshot the teacher published, never recomputed.
    var publishedReports: [ReportPublication] {
        var latest: [String: ReportPublication] = [:]
        for publication in publications where publication.studentId == student.id {
            if let known = latest[publication.reportId], known.publicationNo >= publication.publicationNo { continue }
            latest[publication.reportId] = publication
        }
        return latest.values.sorted { lhs, rhs in
            if lhs.rangeSortKey != rhs.rangeSortKey { return lhs.rangeSortKey > rhs.rangeSortKey }
            return lhs.publishedAt > rhs.publishedAt
        }
    }

    /// Buổi của lớp con (cũ nhất trước); buổi đã huỷ vẫn giữ để tính buổi chấm.
    var orderedSessions: [ClassSession] {
        sessions.sorted { GuardianFormat.isBefore($0, $1) }
    }

    /// All sessions shown in the child's class list, newest first. Draft slips stay hidden;
    /// the row can still open a session so parents can read homework assigned before a slip is sent.
    var sessionRows: [GuardianSessionRow] {
        orderedSessions.reversed().map { session in
            let attendance = attendances.first { $0.studentId == student.id && $0.sessionId == session.id }
            let sentSlip = slips.first {
                $0.studentId == student.id && $0.sessionId == session.id && $0.status == .sent
            }
            return GuardianSessionRow(session: session, attendance: attendance, sentSlip: sentSlip)
        }
    }

    func session(id: String) -> ClassSession? { sessions.first { $0.id == id } }

    /// `listChildTickets`: phiếu đã gửi, mới nhất trước.
    var sentSlips: [GuardianSentSlip] {
        slips.filter { $0.studentId == student.id && $0.status == .sent }
            .compactMap { slip in session(id: slip.sessionId).map { GuardianSentSlip(session: $0, slip: slip) } }
            .sorted { $0.session.date > $1.session.date }
    }

    func attendanceMonth(_ month: String) -> GuardianAttendanceMonth {
        let rows = orderedSessions
            .filter { $0.status == .held && $0.date.hasPrefix(month) }
            .reversed()
            .map { session -> GuardianAttendanceRow in
                let record = attendances.first { $0.studentId == student.id && $0.sessionId == session.id }
                return GuardianAttendanceRow(session: session, number: session.sessionNumber, attendance: record)
            }
        return GuardianAttendanceMonth(month: month, rows: Array(rows))
    }

    func scoreRows(in month: String) -> [GuardianScoreRow] {
        tests.filter { !$0.archived && $0.date.hasPrefix(month) }
            .sorted { $0.date > $1.date }
            .map { test in
                GuardianScoreRow(test: test,
                                 score: scores.first { $0.studentId == student.id && $0.testId == test.id })
            }
    }

    /// `gradingSessionPlan` in `src/data/homework.ts`: buổi kế tiếp không huỷ, kèm các buổi
    /// bị huỷ nằm giữa buổi giao bài và buổi chấm.
    func grading(for session: ClassSession) -> GuardianGrading {
        var cancelled: [ClassSession] = []
        for next in orderedSessions where GuardianFormat.isBefore(session, next) {
            if next.status == .cancelled { cancelled.append(next); continue }
            return GuardianGrading(session: next, cancelled: cancelled)
        }
        return GuardianGrading(session: nil, cancelled: cancelled)
    }

    /// Buổi gần nhất TRƯỚC buổi này mà không bị huỷ (`previousHomeworkSession`).
    func previousSession(before session: ClassSession) -> ClassSession? {
        orderedSessions.last { GuardianFormat.isBefore($0, session) && $0.status != .cancelled }
    }

    /// `getChildOverview.teacherNote`: nhận xét chung của báo cáo ĐÃ PHÁT HÀNH mới nhất
    /// (khoảng buổi mới nhất, rồi `publishedAt` mới nhất). Báo cáo mới nhất để trống nhận xét thì
    /// ẩn khối, không lấy báo cáo cũ hơn.
    var teacherNote: String? {
        let note = publishedReports.first?.snapshot.generalComment
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return note.isEmpty ? nil : note
    }

    private func parts(of session: ClassSession, graded: Bool) -> [GuardianHomeworkPart] {
        // `.hwList` giữ nguyên thứ tự phần BTVN giáo viên đã lưu; prototype không sắp lại.
        homeworkSections.filter { $0.sessionId == session.id }
            .map { section in
                let level = homeworkGrades.first {
                    $0.studentId == student.id && $0.sectionId == section.id
                }?.level
                return GuardianHomeworkPart(section: section, graded: graded,
                                            level: graded ? level : nil)
            }
    }

    /// `getChildHomework`: các buổi có giao BTVN cho con, mới nhất trước.
    var homeworkSessions: [GuardianHomeworkSession] {
        orderedSessions
            .filter { $0.status != .cancelled }
            .filter { session in homeworkSections.contains { $0.sessionId == session.id } }
            .reversed()
            .map { session in
                let plan = grading(for: session)
                let ticketSent = plan.session.map { gradingSession in
                    slips.contains {
                        $0.sessionId == gradingSession.id && $0.studentId == student.id
                            && $0.status == .sent
                    }
                } ?? false
                return GuardianHomeworkSession(session: session,
                                               parts: parts(of: session, graded: ticketSent),
                                               grading: plan)
            }
    }

    func homeworkSession(id: String) -> GuardianHomeworkSession? {
        homeworkSessions.first { $0.session.id == id }
    }

    /// Kết quả chấm BTVN buổi trước, chỉ hiện khi phiếu của buổi chấm đã gửi.
    func gradedHomework(for gradingSession: ClassSession) -> GuardianHomeworkSession? {
        let sent = slips.contains {
            $0.sessionId == gradingSession.id && $0.studentId == student.id && $0.status == .sent
        }
        guard sent, let previous = previousSession(before: gradingSession) else { return nil }
        let sections = homeworkSections.filter { $0.sessionId == previous.id }
        guard !sections.isEmpty else { return nil }
        return GuardianHomeworkSession(session: previous, parts: parts(of: previous, graded: true),
                                       grading: grading(for: previous))
    }

    /// `getChildTicket` + BTVN mới của buổi: phiếu chỉ có khi giáo viên đã gửi.
    func ticket(for session: ClassSession) -> GuardianTicketDetail {
        let slip = slips.first {
            $0.sessionId == session.id && $0.studentId == student.id && $0.status == .sent
        }
        let previous = previousSession(before: session)
        let previousParts = slip != nil && previous != nil ? parts(of: previous!, graded: true) : []
        let assigned = homeworkSession(id: session.id)
        return GuardianTicketDetail(session: session, slip: slip,
                                    previousSession: previous, previousParts: previousParts,
                                    assigned: assigned)
    }

    /// Dòng phụ trong hồ sơ: "Bé Gia Bảo (6A), Bé Bảo Ngọc (6A)".
    var childrenMeta: String {
        let short = AuthFormat.shortName(student.name)
        return String.localizedStringWithFormat(String(localized: "feature.guardian.be"), String(describing: (short)), String(describing: (AuthFormat.classShortLabel(className))))
    }
}

struct GuardianSentSlip: Identifiable, Sendable {
    let session: ClassSession
    let slip: SessionSlip
    var id: String { session.id }
}

struct GuardianAttendanceRow: Identifiable, Sendable {
    let session: ClassSession
    let number: Int?
    let attendance: Attendance?
    var id: String { session.id }
    var status: AttendanceStatus? { attendance?.status }
    var note: String { attendance?.note ?? "" }
    var lateAt: String? { attendance?.lateAt }
}

struct GuardianSessionRow: Identifiable, Sendable {
    let session: ClassSession
    let attendance: Attendance?
    let sentSlip: SessionSlip?

    var id: String { session.id }
    var destination: GuardianDetail { .ticket(session.id) }
    var month: String { String(session.date.prefix(7)) }

    var statusLabel: String {
        switch session.status {
        case .planned: String(localized: "guardian.session.planned", table: "Guardian")
        case .cancelled: String(localized: "guardian.session.cancelled", table: "Guardian")
        case .held:
            attendance?.status.guardianPillLabel
                ?? String(localized: "guardian.session.notTaken", table: "Guardian")
        }
    }

    var statusColor: Color {
        switch session.status {
        case .planned: AppColors.warning
        case .cancelled: AppColors.muted
        case .held:
            switch attendance?.status {
            case .present: AppColors.success
            case .late: AppColors.warning
            case .excused: AppColors.primary
            case .absent: AppColors.error
            case nil: AppColors.muted
            }
        }
    }
}

struct GuardianAttendanceMonth: Sendable {
    let month: String
    let rows: [GuardianAttendanceRow]
    var present: Int { count(.present) }
    var late: Int { count(.late) }
    var excused: Int { count(.excused) }
    var absent: Int { count(.absent) }
    private func count(_ status: AttendanceStatus) -> Int { rows.filter { $0.status == status }.count }
}

struct GuardianScoreRow: Identifiable, Sendable {
    let test: TestDefinition
    let score: Score?
    var id: String { test.id }
    var value: Double? { score?.value }
}

struct GuardianHomeworkPart: Identifiable, Sendable {
    let section: HomeworkSection
    /// Phiếu của buổi chấm đã gửi: kết quả chấm được hiện cho phụ huynh.
    let graded: Bool
    let level: HomeworkLevel?
    var id: String { section.id }
    var kind: HomeworkKind { section.kind }
    var kindLabel: String { kind.guardianKindLabel }
    var title: String { section.title }
    var detail: String { section.description }
}

struct GuardianGrading: Sendable {
    enum State: Sendable { case exists, moved, none }
    let session: ClassSession?
    let cancelled: [ClassSession]
    var state: State {
        guard session != nil else { return .none }
        return cancelled.isEmpty ? .exists : .moved
    }
}

struct GuardianHomeworkSession: Identifiable, Sendable {
    let session: ClassSession
    let parts: [GuardianHomeworkPart]
    let grading: GuardianGrading
    var id: String { session.id }
}

struct GuardianTicketDetail: Identifiable, Sendable {
    let session: ClassSession
    let slip: SessionSlip?
    let previousSession: ClassSession?
    let previousParts: [GuardianHomeworkPart]
    let assigned: GuardianHomeworkSession?
    var id: String { session.id }
}

// MARK: - Định dạng (`guardianFormat.ts`)

enum GuardianFormat {
    static let currentMonth = String(ISO8601DateFormatter().string(from: .now).prefix(7))

    private static let weekdays = [String(localized: "feature.guardian.chu.nhat"), String(localized: "feature.guardian.thu.hai"), String(localized: "feature.guardian.thu.ba"), String(localized: "feature.guardian.thu.tu"), String(localized: "feature.guardian.thu.nam"), String(localized: "feature.guardian.thu.sau"), String(localized: "feature.guardian.thu.bay")]

    private static func date(of iso: String) -> DateComponents? {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return DateComponents(year: parts[0], month: parts[1], day: parts[2])
    }

    static func isBefore(_ lhs: ClassSession, _ rhs: ClassSession) -> Bool {
        (lhs.date, lhs.startTime) < (rhs.date, rhs.startTime)
    }

    /// "16/10" — `dayMonth` của prototype không đệm số 0 ("7/10", không phải "07/10").
    static func dayMonth(_ iso: String) -> String {
        let parts = iso.split(separator: "-")
        guard parts.count == 3, let day = Int(parts[2]), let month = Int(parts[1]) else { return iso }
        return "\(day)/\(month)"
    }

    /// "Thứ Sáu 16/10"
    static func weekdayDayMonth(_ iso: String) -> String {
        guard let components = date(of: iso), let date = Calendar(identifier: .gregorian).date(from: components) else {
            return dayMonth(iso)
        }
        let weekday = Calendar(identifier: .gregorian).component(.weekday, from: date)
        return "\(weekdays[(weekday - 1) % 7]) \(dayMonth(iso))"
    }

    /// "16 tháng 10"
    static func longDayMonth(_ iso: String) -> String {
        let parts = iso.split(separator: "-")
        guard parts.count == 3, let day = Int(parts[2]), let month = Int(parts[1]) else { return iso }
        return String.localizedStringWithFormat(String(localized: "feature.guardian.thang"), String(describing: (day)), String(describing: (month)))
    }

    /// "Tháng 10"
    static func monthLabel(_ value: String) -> String { String.localizedStringWithFormat(String(localized: "feature.guardian.thang.6a38e3e2"), String(describing: (monthNumber(value)))) }

    static func monthNumber(_ value: String) -> Int { Int(value.dropFirst(5)) ?? 0 }

    /// Điểm theo cách viết tiếng Việt: số nguyên gọn, phần thập phân dùng dấu phẩy.
    static func scoreText(_ value: Double?) -> String {
        guard let value else { return String(localized: "feature.guardian.chua.co.iem") }
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 1
        return formatter.string(from: NSNumber(value: value)) ?? String(value)
    }

    /// Chữ cái đầu của hai từ cuối — chữ trên chip chọn con.
    static func initials(_ name: String) -> String {
        String(name.split(whereSeparator: \.isWhitespace).suffix(2).compactMap(\.first)).uppercased()
    }

    /// Hai từ cuối — nhãn chip chọn con.
    static func shortName(_ name: String) -> String {
        name.split(whereSeparator: \.isWhitespace).suffix(2).joined(separator: " ")
    }

    /// "Buổi 18"; buổi huỷ không có số nên hiện "Buổi bù" / "Buổi học".
    static func sessionPrefix(_ session: ClassSession) -> String {
        SessionLabel.title(for: session)
    }
}

extension AttendanceStatus {
    /// `.pill` chữ hoa đầu ("Có mặt"), khác nhãn thống kê chữ thường.
    var guardianPillLabel: String {
        switch self {
        case .present: String(localized: "feature.guardian.co.mat")
        case .late: String(localized: "feature.guardian.muon")
        case .excused: String(localized: "feature.guardian.co.phep")
        case .absent: String(localized: "feature.guardian.vang")
        }
    }

    /// Tên trong ô thống kê: "có mặt", "muộn", "có phép", "vắng".
    var guardianLabel: String {
        switch self {
        case .present: String(localized: "feature.guardian.co.mat.e40cb3ed")
        case .late: String(localized: "feature.guardian.muon.70dc7b1f")
        case .excused: String(localized: "feature.guardian.co.phep.714fbab4")
        case .absent: String(localized: "feature.guardian.vang.67bfe384")
        }
    }

    var guardianTone: AppPill.Tone {
        switch self {
        case .present: .success
        case .late: .warning
        case .excused: .primary
        case .absent: .error
        }
    }
}

extension HomeworkKind {
    /// `HOMEWORK_KIND_LABELS`: nhãn đầy đủ, màn phụ huynh viết hoa bằng `.textCase`.
    var guardianKindLabel: String {
        switch self {
        case .vocabulary: String(localized: "feature.guardian.luyen.tu.vung")
        case .reading: String(localized: "feature.guardian.luyen.oc")
        case .speaking: String(localized: "feature.guardian.luyen.noi")
        case .exercise: String(localized: "feature.guardian.bai.tap")
        }
    }

    /// Nhãn trong bảng báo cáo tháng ("Luyện từ vựng", "Bài tập").
    var guardianReportLabel: String { guardianKindLabel }
}

extension HomeworkLevel {
    var guardianLabel: String {
        switch self {
        case .excellent: String(localized: "feature.guardian.hoan.thanh.tot")
        case .done: String(localized: "feature.guardian.hoan.thanh")
        case .notDone: String(localized: "feature.guardian.chua.hoan.thanh")
        }
    }

    var guardianTone: AppPill.Tone {
        switch self {
        case .excellent: .success
        case .done: .primary
        case .notDone: .error
        }
    }
}

// MARK: - Nạp dữ liệu

private struct GuardianMeResponse: Decodable, Sendable {
    struct User: Decodable, Sendable { let id: String }
    let user: User
    let activeMembershipId: String?
    let memberships: [Membership]
}

enum GuardianRepository {
    static func load() async throws -> GuardianDashboard {
        let result = AppConfiguration.load()
        guard case .success(let configuration) = result else { throw APIFailure.invalidURL }
        let tokenStore = KeychainTokenStore(service: "vn.quanlylop.\(configuration.environment.rawValue)")
        guard try await tokenStore.token() != nil else { throw APIFailure.missingToken }
        let api = URLSessionAPIClient(configuration: configuration, tokenStore: tokenStore)
        let identity = try await api.send(.init(method: .get, path: "me"), as: GuardianMeResponse.self)
        guard let membershipID = identity.activeMembershipId,
              let membership = identity.memberships.first(where: { $0.id == membershipID }),
              membership.role.scopeKind == .linkedStudents else { throw APIFailure.badStatus(code: 403) }

        let scope = CacheScope(userId: identity.user.id, workspaceId: membership.workspace.id, membershipId: membership.id)
        let store = try SQLiteStore.open(scope: scope)
        let sync = SyncCoordinator(api: api, store: store, deviceId: "ios-guardian")
        var refreshed = true
        do { try await sync.synchronize() } catch {
            guard try await store.position() != nil else { throw error }
            refreshed = false
        }
        if refreshed {
            let studentIDs = try await store.records(Student.self, entity: "student").map(\.id)
            refreshed = await GuardianReportHistory.refresh(api: api, store: store, studentIDs: studentIDs)
        }
        let base = try await dashboard(from: store)
        if refreshed {
            GuardianFreshness.record(scope)
            return GuardianDashboard(children: base.children)
        }
        return GuardianDashboard(children: base.children, updatedAt: GuardianFreshness.last(scope), isOffline: true)
    }

    /// Every published version of a report stays on the server (`api-spec.md` 6.6), including old ones whose
    /// snapshot predates the current shape. Those are decoded one by one and dropped when unreadable, so a
    /// single stale version cannot hide the child's attendance, scores and newer reports.
    static func dashboard(from store: SQLiteStore) async throws -> GuardianDashboard {
        async let childrenTask = store.records(Student.self, entity: "student")
        async let classesTask = store.records(Classroom.self, entity: "class")
        async let sessionsTask = store.classSessions()
        async let attendanceTask = store.records(Attendance.self, entity: "attendance")
        async let testsTask = store.records(TestDefinition.self, entity: "test")
        async let scoresTask = store.records(Score.self, entity: "score")
        async let slipsTask = store.records(SessionSlip.self, entity: "slip")
        async let sectionsTask = store.records(HomeworkSection.self, entity: "homework_section")
        async let gradesTask = store.records(HomeworkGrade.self, entity: "homework_grade")
        async let publicationTask = store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication")

        let (children, classes, sessions, attendances, tests, scores, slips, sections, grades, decodedPublications) = try await (
            childrenTask, classesTask, sessionsTask, attendanceTask, testsTask,
            scoresTask, slipsTask, sectionsTask, gradesTask, publicationTask
        )
        let publications = decodedPublications.values
        #if DEBUG
        if decodedPublications.skipped > 0 { print("GuardianRepository: skipped \(decodedPublications.skipped) unreadable report publication(s)") }
        #endif
        let classNames = Dictionary(uniqueKeysWithValues: classes.map { ($0.id, $0.name) })
        var childData: [GuardianChildData] = []
        for student in children {
            let studentSessions = sessions.filter { session in
                guard session.classId == student.classId, session.date >= student.enrolledAt else { return false }
                return student.leftAt.map { session.date <= $0 } ?? true
            }.sorted { GuardianFormat.isBefore($0, $1) }
            childData.append(GuardianChildData(
                student: student,
                className: classNames[student.classId] ?? "",
                sessions: studentSessions,
                attendances: attendances.filter { $0.studentId == student.id },
                tests: tests.filter { $0.classId == student.classId },
                scores: scores.filter { $0.studentId == student.id },
                slips: slips.filter { $0.studentId == student.id },
                homeworkSections: sections.filter { $0.classId == student.classId },
                homeworkGrades: grades.filter { $0.studentId == student.id },
                publications: publications.filter { $0.studentId == student.id }
            ))
        }
        return GuardianDashboard(children: childData.sorted { $0.student.name.localizedStandardCompare($1.student.name) == .orderedAscending })
    }
}

extension ReportPublication {
    /// Orders publications by the end of their session range; month-only reports sort by month end.
    var rangeSortKey: String {
        if let range = snapshot.range { return range.toKey }
        return "\(month ?? snapshot.month ?? "") 99:99"
    }

    /// "Buổi 1–8 · 01/10–24/10", or "Tháng 10" for a report published before batches existed.
    var rangeLabel: String {
        if let range = snapshot.range { return ReportRangeRules.label(of: range) }
        return GuardianFormat.monthLabel(month ?? snapshot.month ?? "")
    }
}
