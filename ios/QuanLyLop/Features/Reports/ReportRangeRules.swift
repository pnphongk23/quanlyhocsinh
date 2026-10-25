import Foundation

struct ResolvedReportRange: Equatable {
    let fromKey: String
    let toKey: String
    /// Session numbers of an old range batch; nil for monthly batches.
    var fromNumber: Int? = nil
    var toNumber: Int? = nil
    /// "Tháng 10/2026" for a monthly batch, "Buổi 1–8 · 01/10–24/10" for an old range batch.
    let label: String
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

    /// Non-cancelled sessions of the class in time order.
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

    /// "2026-10" → "Tháng 10/2026"; nil when the text is not a month.
    static func monthTitle(_ month: String) -> String? {
        let parts = month.split(separator: "-")
        guard parts.count == 2, parts[0].count == 4, let year = Int(parts[0]), let number = Int(parts[1]),
              (1...12).contains(number) else { return nil }
        return String.localizedStringWithFormat(String(localized: "reports.month.title", table: "Reports"), number, String(year))
    }

    /// "YYYY-MM" for a Date in the calendar the app shows dates in.
    static func monthKey(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.year, .month], from: date)
        return String(format: "%04d-%02d", parts.year ?? 1970, parts.month ?? 1)
    }

    /// A month batch starts at 00:00 on day 1 and ends at 23:59 inside the same month.
    private static func monthOfWholeMonthKeys(fromKey: String, toKey: String) -> String? {
        guard fromKey.hasSuffix(" 00:00"), toKey.hasSuffix(" 23:59"), fromKey.count >= 7, toKey.count >= 7,
              fromKey.prefix(7) == toKey.prefix(7) else { return nil }
        return String(fromKey.prefix(7))
    }

    static func datesLabel(fromKey: String, toKey: String) -> String {
        let from = dayMonth(fromKey)
        let to = dayMonth(toKey)
        return fromKey.prefix(10) == toKey.prefix(10) ? from : "\(from)–\(to)"
    }

    /// "Buổi 1–8 · 01/10–24/10" (old range batches keep their session numbers), or the dates alone when the
    /// numbers are unknown.
    static func numberedLabel(fromKey: String, toKey: String, fromNumber: Int?, toNumber: Int?) -> String {
        let dates = datesLabel(fromKey: fromKey, toKey: toKey)
        guard let fromNumber, let toNumber else { return dates }
        let sessions = fromNumber == toNumber
            ? String.localizedStringWithFormat(String(localized: "reports.range.single", table: "Reports"), fromNumber)
            : String.localizedStringWithFormat(String(localized: "reports.range.span", table: "Reports"), fromNumber, toNumber)
        return String.localizedStringWithFormat(String(localized: "reports.range.withDates", table: "Reports"), sessions, dates)
    }

    /// Name of a stored batch: "Tháng 10/2026" for a monthly batch; an old range batch keeps its old name
    /// with session numbers, from the server or, when the cache lacks them, counted from the class's sessions.
    static func resolve(_ batch: ReportBatch, sessions: [ClassSession] = []) -> ResolvedReportRange {
        if let month = batch.month, let title = monthTitle(month) {
            return ResolvedReportRange(fromKey: batch.fromKey, toKey: batch.toKey, label: title)
        }
        var from = batch.fromNumber
        var to = batch.toNumber
        if from == nil || to == nil {
            let list = counted(sessions, classID: batch.classId)
            func number(_ id: String?) -> Int? {
                guard let id, let index = list.firstIndex(where: { $0.id == id }) else { return nil }
                return index + 1
            }
            from = number(batch.fromSessionId)
            to = number(batch.toSessionId)
            if from == nil || to == nil { from = nil; to = nil }
        }
        return ResolvedReportRange(fromKey: batch.fromKey, toKey: batch.toKey, fromNumber: from, toNumber: to,
                                   label: numberedLabel(fromKey: batch.fromKey, toKey: batch.toKey,
                                                        fromNumber: from, toNumber: to))
    }

    /// Label of a snapshot: the server's text when the report is of an old range batch (it has session
    /// numbers), "Tháng M/YYYY" for keys that span one whole month, otherwise the dates.
    static func label(of range: ReportRange) -> String {
        if range.fromNumber != nil, range.toNumber != nil, let text = range.label, !text.isEmpty { return text }
        if let whole = monthOfWholeMonthKeys(fromKey: range.fromKey, toKey: range.toKey),
           let title = monthTitle(whole) { return title }
        return numberedLabel(fromKey: range.fromKey, toKey: range.toKey,
                             fromNumber: range.fromNumber, toNumber: range.toNumber)
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

    /// What a batch with no student rows shows: a load in flight or a failed load comes before "empty".
    enum EmptyDetail: Equatable {
        case loading
        case failed(String)
        case empty
    }

    static func emptyDetail(loading: Bool, loadError: String?) -> EmptyDetail {
        if loading { return .loading }
        if let loadError { return .failed(loadError) }
        return .empty
    }

    /// The draft of a general comment once `saved` has been stored: dropped only while it still equals
    /// what was saved, so text typed during a slow save is kept for the next save.
    static func draftAfterSave(draft: String?, saved: String) -> String? {
        draft == saved ? nil : draft
    }

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
                ReportTest(testId: test.id, name: test.name, date: test.date,
                           value: scores.first { $0.testId == test.id && $0.studentId == student.id }?.value)
            }

        let sentSlips = slips.filter { $0.studentId == student.id && $0.status == .sent }
        let sentSessionIDs = Set(sentSlips.map(\.sessionId))
        var three = 0, two = 0, one = 0, ticketCount = 0
        var stars5 = Stars5Summary()
        for slip in sentSlips where sessionIDs.contains(slip.sessionId) {
            guard let stars = slip.stars else { continue }
            if slip.isLegacy {
                switch stars {
                case 3: three += 1
                case 2: two += 1
                case 1: one += 1
                default: continue
                }
            } else {
                switch stars {
                case 5...: stars5.s5 += 1
                case 4: stars5.s4 += 1
                case 3: stars5.s3 += 1
                case 2: stars5.s2 += 1
                case 1: stars5.s1 += 1
                default: stars5.s0 += 1
                }
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
            stars: StarsSummary(three: three, two: two, one: one, stars5: stars5),
            homework: homework,
            generalComment: comment,
            ready: missing.isEmpty)
        return StudentReportContent(student: student, snapshot: snapshot, ticketCount: ticketCount,
                                    missing: missing,
                                    suggestion: suggestion(StarsSummary(three: three, two: two, one: one, stars5: stars5)))
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
                                    ticketCount: stars.legacyTotal + stars.stars5.total, missing: reasons,
                                    suggestion: suggestion(stars))
    }

    /// General-comment hint: the 5-star tally when there is one, the old scale's otherwise.
    static func suggestion(_ stars: StarsSummary) -> String? {
        let five = stars.stars5
        if five.total > 0 {
            return String.localizedStringWithFormat(String(localized: "reports.suggestion.five", table: "Reports"),
                                                    five.total, five.s5 + five.s4)
        }
        guard stars.legacyTotal > 0 else { return nil }
        return String.localizedStringWithFormat(String(localized: "reports.suggestion", table: "Reports"),
                                                stars.three, stars.two, stars.one)
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
