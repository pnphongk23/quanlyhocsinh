import Foundation

/// Text of a session range: "Buổi 1–8 · 01/10–24/10", or the dates alone when the numbers are unknown.
struct ReportRangeLabels: Equatable {
    let label: String
    let sessionsLabel: String
    let datesLabel: String
}

struct ResolvedReportRange: Equatable {
    let fromKey: String
    let toKey: String
    let fromNumber: Int?
    let toNumber: Int?
    let labels: ReportRangeLabels
    var label: String { labels.label }
}

/// One selectable session in the add-report sheet.
struct ReportSessionChoice: Identifiable, Equatable {
    let session: ClassSession
    let number: Int
    var id: String { session.id }
    var label: String {
        String.localizedStringWithFormat(String(localized: "reports.choice", table: "Reports"),
                                         number, ReportRangeRules.dayMonth(session.date))
    }
}

enum ReportRangeProblem: Equatable {
    case notInClass, cancelled, order

    var message: String {
        switch self {
        case .notInClass: String(localized: "reports.problem.notInClass", table: "Reports")
        case .cancelled: String(localized: "reports.problem.cancelled", table: "Reports")
        case .order: String(localized: "reports.problem.order", table: "Reports")
        }
    }
}

struct ReportBatchCounts: Equatable {
    let total: Int
    let draft: Int
    let published: Int
    let needsRepublish: Int
}

/// One student's report content built from the local cache, so the review list works before the
/// server answers and no average is ever shown (spec mục 3.1).
struct StudentReportContent {
    let student: Student
    let snapshot: ReportSnapshot
    let ticketCount: Int
    let missing: [String]
    let suggestion: String?

    var ready: Bool { missing.isEmpty }
    var gradedTestCount: Int { snapshot.tests.filter { $0.value != nil }.count }
    var attendanceCount: Int { snapshot.attendance.present + snapshot.attendance.late }

    var attendanceDetail: String { ReportRules.attendanceDetail(snapshot.attendance) }
}

enum ReportSlotStatus: Equatable {
    case missing, republish, published, draft, ready
}

struct ReportSlot: Equatable {
    let status: ReportSlotStatus
    let label: String
    let tone: AppPill.Tone
    let detail: String
    let publishable: Bool

    var publishLabel: String { status == .published || status == .republish ? String(localized: "feature.reports.phat.hanh.lai") : String(localized: "feature.reports.phat.hanh") }
}

enum ReportRangeRules {
    /// "YYYY-MM-DD HH:MM", the same key the server stores in `from_key` / `to_key`.
    static func key(_ session: ClassSession) -> String { "\(session.date) \(session.startTime)" }

    /// Non-cancelled sessions of the class in time order; the number of a session is its position + 1.
    static func counted(_ sessions: [ClassSession], classID: String) -> [ClassSession] {
        sessions.filter { $0.classId == classID && $0.status != .cancelled }
            .sorted { key($0) < key($1) }
    }

    /// "2026-10-24" or "2026-10-24 18:00" → "24/10".
    static func dayMonth(_ date: String) -> String {
        guard date.count >= 10 else { return date }
        let parts = date.prefix(10).split(separator: "-")
        guard parts.count == 3 else { return date }
        return "\(parts[2])/\(parts[1])"
    }

    static func choices(_ sessions: [ClassSession], classID: String) -> [ReportSessionChoice] {
        counted(sessions, classID: classID).enumerated().map {
            ReportSessionChoice(session: $0.element, number: $0.offset + 1)
        }
    }

    /// From the first session to the latest held session; nil while no session has been held.
    static func defaultRange(_ sessions: [ClassSession], classID: String) -> (from: ClassSession, to: ClassSession)? {
        let list = counted(sessions, classID: classID)
        guard let first = list.first, let last = list.last(where: { $0.status == .held }) else { return nil }
        return (first, last)
    }

    static func labels(fromKey: String, toKey: String, fromNumber: Int?, toNumber: Int?) -> ReportRangeLabels {
        let from = dayMonth(fromKey)
        let to = dayMonth(toKey)
        let dates = fromKey.prefix(10) == toKey.prefix(10) ? from : "\(from)–\(to)"
        var sessionsLabel = ""
        if let fromNumber, let toNumber {
            sessionsLabel = fromNumber == toNumber
                ? String.localizedStringWithFormat(String(localized: "reports.range.single", table: "Reports"), fromNumber)
                : String.localizedStringWithFormat(String(localized: "reports.range.span", table: "Reports"), fromNumber, toNumber)
        }
        let label = sessionsLabel.isEmpty ? dates
            : String.localizedStringWithFormat(String(localized: "reports.range.withDates", table: "Reports"), sessionsLabel, dates)
        return ReportRangeLabels(label: label, sessionsLabel: sessionsLabel, datesLabel: dates)
    }

    /// Range of a stored batch. Numbers follow the class's current numbering; a batch migrated
    /// from a month, or one whose edge session was cancelled, has dates only.
    static func resolve(_ batch: ReportBatch, sessions: [ClassSession]) -> ResolvedReportRange {
        let list = counted(sessions, classID: batch.classId)
        func number(_ id: String?) -> Int? {
            guard let id, let index = list.firstIndex(where: { $0.id == id }) else { return nil }
            return index + 1
        }
        let from = number(batch.fromSessionId)
        let to = number(batch.toSessionId)
        let complete = from != nil && to != nil
        return ResolvedReportRange(
            fromKey: batch.fromKey, toKey: batch.toKey,
            fromNumber: complete ? from : nil, toNumber: complete ? to : nil,
            labels: labels(fromKey: batch.fromKey, toKey: batch.toKey,
                           fromNumber: complete ? from : nil, toNumber: complete ? to : nil))
    }

    /// Label of a snapshot: the server's text first, then the key-based fallback.
    static func label(of range: ReportRange) -> String {
        if let text = range.label, !text.isEmpty { return text }
        return labels(fromKey: range.fromKey, toKey: range.toKey,
                      fromNumber: range.fromNumber, toNumber: range.toNumber).label
    }

    static func problem(_ sessions: [ClassSession], classID: String, from: String, to: String) -> ReportRangeProblem? {
        guard let start = sessions.first(where: { $0.id == from }), let end = sessions.first(where: { $0.id == to }),
              start.classId == classID, end.classId == classID else { return .notInClass }
        if start.status == .cancelled || end.status == .cancelled { return .cancelled }
        if key(start) > key(end) { return .order }
        return nil
    }

    /// Newest last session first, as the server lists them.
    static func sorted(_ batches: [ReportBatch]) -> [ReportBatch] {
        batches.sorted {
            if $0.toKey != $1.toKey { return $0.toKey > $1.toKey }
            if $0.fromKey != $1.fromKey { return $0.fromKey > $1.fromKey }
            return $0.id < $1.id
        }
    }

    static func counts(_ reports: [StudentReport]) -> ReportBatchCounts {
        let republish = reports.filter(\.needsRepublish).count
        let draft = reports.filter { $0.status == .draft }.count
        return ReportBatchCounts(total: reports.count, draft: draft,
                                 published: reports.count - draft - republish, needsRepublish: republish)
    }

    /// A test counts for a student when it is dated from enrolment on or the student already has a
    /// score for it, and it is not after the day the student left. Blank cells do not count.
    static func testCounts(_ test: TestDefinition, student: Student, scores: [Score]) -> Bool {
        if let left = student.leftAt, test.date > left { return false }
        if test.date >= student.enrolledAt { return true }
        return scores.contains { $0.testId == test.id && $0.studentId == student.id && $0.value != nil }
    }
}

enum ReportRules {
    static let republishNote = String(localized: "feature.reports.iem.co.cap.nhat.can.phat.hanh.lai")

    static func attendanceDetail(_ attendance: AttendanceSummary) -> String {
        [
            attendance.late > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.muon"), String(describing: attendance.late)) : "",
            attendance.excused > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.co.phep"), String(describing: attendance.excused)) : "",
            attendance.absent > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.vang"), String(describing: attendance.absent)) : ""
        ].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    /// Content of one student's report for a session range, from the local cache. Nil when the
    /// student was not in the class during the range.
    static func build(student: Student, range: ResolvedReportRange, batchID: String?, sessions: [ClassSession],
                      attendance: [Attendance], tests: [TestDefinition], scores: [Score],
                      slips: [SessionSlip], sections: [HomeworkSection], grades: [HomeworkGrade],
                      generalComment: String) -> StudentReportContent? {
        let start = String(range.fromKey.prefix(10))
        let end = String(range.toKey.prefix(10))
        if student.enrolledAt > end { return nil }
        if let leftAt = student.leftAt, leftAt < start { return nil }
        func enrolled(_ date: String) -> Bool {
            date >= student.enrolledAt && (student.leftAt == nil || date <= student.leftAt!)
        }

        let rangeSessions = sessions
            .filter {
                $0.classId == student.classId && $0.status != .cancelled
                    && ReportRangeRules.key($0) >= range.fromKey && ReportRangeRules.key($0) <= range.toKey
                    && enrolled($0.date)
            }
            .sorted { ReportRangeRules.key($0) < ReportRangeRules.key($1) }
        let sessionIDs = Set(rangeSessions.map(\.id))
        let rangeAttendance = attendance.filter { $0.studentId == student.id && sessionIDs.contains($0.sessionId) }

        let rangeTests = tests
            .filter {
                $0.classId == student.classId && !$0.archived && $0.date >= start && $0.date <= end
                    && ReportRangeRules.testCounts($0, student: student, scores: scores)
            }
            .sorted { $0.date < $1.date }
            .map { test in
                ReportTest(testId: test.id, name: test.name, date: test.date, max: test.maxScore,
                           value: scores.first { $0.testId == test.id && $0.studentId == student.id }?.value)
            }

        let sentSlips = slips.filter { $0.studentId == student.id && $0.status == .sent }
        let sentSessionIDs = Set(sentSlips.map(\.sessionId))
        var three = 0, two = 0, one = 0, ticketCount = 0
        for slip in sentSlips where sessionIDs.contains(slip.sessionId) {
            guard let stars = slip.stars else { continue }
            switch stars {
            case .three: three += 1
            case .two: two += 1
            case .one: one += 1
            }
            ticketCount += 1
        }

        let sessionByID = Dictionary(sessions.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        var tallies: [HomeworkKind: (excellent: Int, done: Int, notDone: Int)] = [:]
        for section in sections {
            guard let giving = sessionByID[section.sessionId], giving.classId == student.classId,
                  sessionIDs.contains(giving.id) else { continue }
            // Only show a result when the grading session's slip was sent to this student.
            guard let grading = HomeworkRules.gradingPlan(sessions, after: giving).session,
                  sentSessionIDs.contains(grading.id) else { continue }
            guard let level = grades.first(where: { $0.sectionId == section.id && $0.studentId == student.id })?.level
            else { continue }
            var tally = tallies[section.kind] ?? (0, 0, 0)
            switch level {
            case .excellent: tally.excellent += 1
            case .done: tally.done += 1
            case .notDone: tally.notDone += 1
            }
            tallies[section.kind] = tally
        }
        let homework = HomeworkKind.allCases.compactMap { kind -> HomeworkSummary? in
            guard let tally = tallies[kind] else { return nil }
            return HomeworkSummary(kind: kind, excellent: tally.excellent, done: tally.done, notDone: tally.notDone)
        }

        var missing: [String] = []
        if !rangeSessions.isEmpty && rangeAttendance.count < rangeSessions.count {
            missing.append(String(localized: "feature.reports.thieu.iem.danh"))
        }
        for test in rangeTests where test.value == nil {
            missing.append(String.localizedStringWithFormat(String(localized: "feature.reports.thieu.iem"), String(describing: test.name)))
        }
        let comment = generalComment.trimmingCharacters(in: .whitespacesAndNewlines)
        if comment.isEmpty { missing.append(String(localized: "feature.reports.thieu.nhan.xet.chung")) }

        func count(_ status: AttendanceStatus) -> Int { rangeAttendance.filter { $0.status == status }.count }

        let snapshot = ReportSnapshot(
            studentId: student.id,
            batchId: batchID,
            range: ReportRange(fromKey: range.fromKey, toKey: range.toKey, fromNumber: range.fromNumber,
                               toNumber: range.toNumber, label: range.label),
            attendance: AttendanceSummary(present: count(.present), late: count(.late), excused: count(.excused),
                                         absent: count(.absent), heldSessions: rangeSessions.count),
            tests: rangeTests,
            stars: StarsSummary(three: three, two: two, one: one),
            homework: homework,
            generalComment: comment,
            ready: missing.isEmpty)
        return StudentReportContent(student: student, snapshot: snapshot, ticketCount: ticketCount,
                                    missing: missing, suggestion: suggestion(three: three, two: two, one: one))
    }

    /// Content of one student's report as the server computed it (`GET /reports/{id}/preview`): the
    /// readiness and the missing reasons are the server's, not a guess from a windowed cache.
    static func content(student: Student, serverSnapshot snapshot: ReportSnapshot) -> StudentReportContent {
        var reasons: [String] = []
        if !snapshot.ready {
            reasons = missingReasons(snapshot.missing ?? [])
            if reasons.isEmpty { reasons = [String(localized: "reports.preview.notReady", table: "Reports")] }
        }
        let stars = snapshot.stars
        return StudentReportContent(student: student, snapshot: snapshot,
                                    ticketCount: stars.three + stars.two + stars.one, missing: reasons,
                                    suggestion: suggestion(three: stars.three, two: stars.two, one: stars.one))
    }

    static func suggestion(three: Int, two: Int, one: Int) -> String? {
        guard three + two + one > 0 else { return nil }
        return String.localizedStringWithFormat(String(localized: "reports.suggestion", table: "Reports"), three, two, one)
    }

    /// Status pill of one student in the review list.
    static func slot(_ report: StudentReportContent, record: StudentReport?) -> ReportSlot {
        let published = record?.status == .published
        if !report.ready {
            return ReportSlot(status: .missing, label: String(localized: "feature.reports.thieu.du.lieu"), tone: .warning,
                              detail: report.missing.joined(separator: " · "), publishable: false)
        }
        if record?.needsRepublish == true {
            return ReportSlot(status: .republish, label: String(localized: "feature.reports.can.phat.hanh.lai"), tone: .primary,
                              detail: republishNote, publishable: true)
        }
        if published {
            let suffix = record.flatMap { I4Format.dayMonth(timestamp: $0.publishedAt) }.map { " · \($0)" } ?? ""
            return ReportSlot(status: .published, label: String.localizedStringWithFormat(String(localized: "feature.reports.a.phat.hanh.4e3f1cdf"), String(describing: suffix)), tone: .success,
                              detail: "", publishable: false)
        }
        if record != nil {
            return ReportSlot(status: .draft, label: String(localized: "feature.reports.nhap"), tone: .neutral,
                              detail: "", publishable: true)
        }
        return ReportSlot(status: .ready, label: String(localized: "feature.reports.san.sang"), tone: .success,
                          detail: "", publishable: true)
    }

    static func summary(_ slots: [ReportSlot]) -> (total: Int, ready: Int, missing: Int, published: Int, publishable: Int) {
        let missing = slots.filter { $0.status == .missing }.count
        return (slots.count, slots.count - missing, missing,
                slots.filter { $0.status == .published }.count,
                slots.filter(\.publishable).count)
    }

    static func publishAllLabel(_ count: Int) -> String {
        count > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.phat.hanh.bao.cao"), String(describing: count)) : String(localized: "feature.reports.publishReports")
    }

    /// Reason names the server sends in `missing[]` as sentences.
    static func missingReasons(_ codes: [String]) -> [String] {
        codes.compactMap {
            switch $0 {
            case "attendance": String(localized: "reports.missing.attendance", table: "Reports")
            case "scores": String(localized: "reports.missing.scores", table: "Reports")
            case "comment": String(localized: "reports.missing.comment", table: "Reports")
            default: nil
            }
        }
    }
}

extension I4Format {
    /// `publishedAt` timestamps ("2026-10-12T…") as `12/10`.
    static func dayMonth(timestamp: String?) -> String? {
        guard let timestamp else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: timestamp) else {
            let plain = ISO8601DateFormatter()
            guard let fallback = plain.date(from: timestamp) else { return nil }
            return Self.dayMonth(fallback)
        }
        return Self.dayMonth(date)
    }

    private static let dayMonthOnly: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "d/M"
        return formatter
    }()

    static func dayMonth(_ date: Date) -> String { dayMonthOnly.string(from: date) }
}
