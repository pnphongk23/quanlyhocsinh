import Foundation

/// One student's monthly report built from the local cache
/// (`design/prototype/src/data/reportModel.ts`), so the review screen works before the
/// server answers and no average is ever shown (spec mục 3.1).
struct I4MonthlyReport {
    let student: Student
    let month: String
    let snapshot: ReportSnapshot
    let ticketCount: Int
    let missing: [String]
    let suggestion: String?

    var ready: Bool { missing.isEmpty }
    var gradedTestCount: Int { snapshot.tests.filter { $0.value != nil }.count }
    var attendanceCount: Int { snapshot.attendance.present + snapshot.attendance.late }

    var attendanceDetail: String {
        [
            snapshot.attendance.late > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.muon"), String(describing: (snapshot.attendance.late))) : "",
            snapshot.attendance.excused > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.co.phep"), String(describing: (snapshot.attendance.excused))) : "",
            snapshot.attendance.absent > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.vang"), String(describing: (snapshot.attendance.absent))) : ""
        ].filter { !$0.isEmpty }.joined(separator: " · ")
    }
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

enum ReportRules {
    static let republishNote = String(localized: "feature.reports.iem.co.cap.nhat.can.phat.hanh.lai")

    static func build(student: Student, month: String, sessions: [ClassSession], attendance: [Attendance],
                      tests: [TestDefinition], scores: [Score], slips: [SessionSlip],
                      sections: [HomeworkSection], grades: [HomeworkGrade],
                      generalComment: String) -> I4MonthlyReport? {
        guard month.count == 7 else { return nil }
        let start = "\(month)-01"
        let end = "\(month)-31"
        if student.enrolledAt > end { return nil }
        if let leftAt = student.leftAt, leftAt < start { return nil }
        func inRange(_ date: String) -> Bool {
            date >= student.enrolledAt && (student.leftAt == nil || date <= student.leftAt!)
        }

        let monthSessions = sessions
            .filter {
                $0.classId == student.classId && $0.status == .held
                    && $0.date >= start && $0.date <= end && inRange($0.date)
            }
            .sorted { ($0.date, $0.startTime) < ($1.date, $1.startTime) }
        let sessionIDs = Set(monthSessions.map(\.id))
        let monthAttendance = attendance.filter {
            $0.studentId == student.id && sessionIDs.contains($0.sessionId)
        }

        let monthTests = tests.filter {
            $0.classId == student.classId && !$0.archived
                && $0.date >= start && $0.date <= end && inRange($0.date)
        }
        .sorted { $0.date < $1.date }
        .map { test in
            ReportTest(testId: test.id, name: test.name, date: test.date, max: test.maxScore,
                       value: scores.first { $0.testId == test.id && $0.studentId == student.id }?.value)
        }

        let sentSlips = slips.filter { $0.studentId == student.id && $0.status == .sent }
        let sentSessionIDs = Set(sentSlips.map(\.sessionId))
        var three = 0
        var two = 0
        var one = 0
        var ticketCount = 0
        for slip in sentSlips {
            guard let session = sessions.first(where: { $0.id == slip.sessionId }) else { continue }
            guard session.date >= start, session.date <= end, let stars = slip.stars else { continue }
            switch stars {
            case .three: three += 1
            case .two: two += 1
            case .one: one += 1
            }
            ticketCount += 1
        }

        let sessionByID = Dictionary(uniqueKeysWithValues: sessions.map { ($0.id, $0) })
        var tallies: [HomeworkKind: (excellent: Int, done: Int, notDone: Int)] = [:]
        for section in sections {
            guard let giving = sessionByID[section.sessionId], giving.classId == student.classId,
                  giving.date >= start, giving.date <= end, inRange(giving.date) else { continue }
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
            return HomeworkSummary(kind: kind, excellent: tally.excellent, done: tally.done,
                                   notDone: tally.notDone)
        }

        var missing: [String] = []
        if !monthSessions.isEmpty && monthAttendance.count < monthSessions.count {
            missing.append(String(localized: "feature.reports.thieu.iem.danh"))
        }
        for test in monthTests where test.value == nil {
            missing.append(String.localizedStringWithFormat(String(localized: "feature.reports.thieu.iem"), String(describing: (test.name))))
        }
        let comment = generalComment.trimmingCharacters(in: .whitespacesAndNewlines)
        if comment.isEmpty { missing.append(String(localized: "feature.reports.thieu.nhan.xet.chung")) }

        func count(_ status: AttendanceStatus) -> Int {
            monthAttendance.filter { $0.status == status }.count
        }

        let snapshot = ReportSnapshot(
            studentId: student.id,
            month: month,
            attendance: AttendanceSummary(present: count(.present), late: count(.late),
                                         excused: count(.excused), absent: count(.absent),
                                         heldSessions: monthSessions.count),
            tests: monthTests,
            stars: StarsSummary(three: three, two: two, one: one),
            homework: homework,
            generalComment: comment,
            ready: missing.isEmpty
        )
        return I4MonthlyReport(student: student, month: month, snapshot: snapshot,
                               ticketCount: ticketCount, missing: missing,
                               suggestion: suggestion(three: three, two: two, one: one))
    }

    static func suggestion(three: Int, two: Int, one: Int) -> String? {
        guard three + two + one > 0 else { return nil }
        return String.localizedStringWithFormat(String(localized: "feature.reports.goi.y.theo.so.buoi.3.2.1.sao.cua.thang.thang.nay"), String(describing: (three)), String(describing: (two)), String(describing: (one)))
    }

    /// Status pill of one student in the review list (`reportSlot`).
    static func slot(_ report: I4MonthlyReport, record: MonthlyReport?) -> ReportSlot {
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
            return ReportSlot(status: .published, label: String.localizedStringWithFormat(String(localized: "feature.reports.a.phat.hanh.4e3f1cdf"), String(describing: (suffix))), tone: .success,
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
        count > 0 ? String.localizedStringWithFormat(String(localized: "feature.reports.phat.hanh.bao.cao"), String(describing: (count))) : String(localized: "feature.reports.publishReports")
    }

    /// Month choices: sessions, tests, saved reports and the selected month, newest first.
    static func monthChoices(sessions: [ClassSession], tests: [TestDefinition],
                             reports: [MonthlyReport], selected: String) -> [String] {
        var values = Set(sessions.map { String($0.date.prefix(7)) })
        values.formUnion(tests.map { String($0.date.prefix(7)) })
        values.formUnion(reports.map(\.month))
        values.insert(selected)
        return values.filter { $0.count == 7 }.sorted(by: >)
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
