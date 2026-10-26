import Foundation

/// Filter pills of the comment tab.
enum TicketFilter: String, CaseIterable {
    case all, unsent

    var label: String {
        switch self {
        case .all: String(localized: "feature.comments.tat.ca")
        case .unsent: String(localized: "feature.comments.chua.gui")
        }
    }
}

/// One row of the comment list: the student, their slip and last session's homework tally.
struct I4TicketRow: Identifiable {
    let student: Student
    let slip: SessionSlip?
    let attendance: AttendanceStatus?
    let previousHomework: I4HomeworkSummary
    /// Date of the session before this one, when there is one.
    let previousDate: String?
    /// Whether the session before this one had homework sections at all.
    let previousHadSections: Bool

    init(student: Student, slip: SessionSlip?, attendance: AttendanceStatus? = nil,
         previousHomework: I4HomeworkSummary, previousDate: String?, previousHadSections: Bool) {
        self.student = student; self.slip = slip; self.attendance = attendance
        self.previousHomework = previousHomework; self.previousDate = previousDate
        self.previousHadSections = previousHadSections
    }

    var id: String { student.id }
    var stars: Int? { slip?.stars }
    var isSent: Bool { slip?.status == .sent }
    /// Marked present or late: the only students who get a default slip when the class is sent.
    var attended: Bool { attendance == .present || attendance == .late }
    /// No slip yet, but sending the class will create the default five-star one.
    var getsDefaultSlip: Bool { slip == nil && attended }
}

enum CommentsRules {
    static func matches(_ row: I4TicketRow, _ filter: TicketFilter) -> Bool {
        switch filter {
        case .all: true
        case .unsent: !row.isSent
        }
    }

    static func filtered(_ rows: [I4TicketRow], _ filter: TicketFilter) -> [I4TicketRow] {
        rows.filter { matches($0, filter) }
    }

    static func counts(_ rows: [I4TicketRow]) -> (all: Int, unsent: Int) {
        (rows.count, rows.filter { !$0.isSent }.count)
    }

    static func filterLabel(_ filter: TicketFilter, _ counts: (all: Int, unsent: Int)) -> String {
        switch filter {
        case .all: String.localizedStringWithFormat(String(localized: "feature.comments.tat.ca.9c49d886"), String(describing: (counts.all)))
        case .unsent: String.localizedStringWithFormat(String(localized: "feature.comments.chua.gui.52c3c8f7"), String(describing: (counts.unsent)))
        }
    }

    /// What "Gửi phiếu cả lớp" sends: every unsent slip, plus a default slip for each student present or late
    /// who has none. Absent or not-yet-marked students without a slip are left out.
    static func sendable(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        rows.filter { !$0.isSent && ($0.slip != nil || $0.attended) }
    }

    struct DefaultSlip: Equatable {
        let studentID: String
        let criteria: Int
        let note: String
        /// Always written from the criteria; the server stores what it is given.
        var comment: String { SlipRules.generatedSentence(criteria: criteria) }
    }

    /// The default slips `slip.send` carries: each student with no slip (or an old unscored draft) who was present
    /// or late, with the criteria their homework result gives.
    static func sendDefaults(studentIDs: [String], slip: (String) -> SessionSlip?, attendance: (String) -> AttendanceStatus?,
                             sections: [HomeworkSection], grades: [HomeworkGrade]) -> [DefaultSlip] {
        studentIDs.compactMap { id in
            let existing = slip(id)
            let needsDefault = existing == nil || (existing?.isLegacy == true && existing?.stars == nil)
            guard needsDefault, attendance(id) == .present || attendance(id) == .late else { return nil }
            return DefaultSlip(studentID: id,
                               criteria: HomeworkRules.openingCriteria(slip: nil, sections: sections, grades: grades, studentID: id),
                               note: existing?.note ?? "")
        }
    }

    /// "Gán tất cả mặc định": every slip the class send would send (so never a sent one) gets all five criteria,
    /// with homework following last session's grades, a regenerated sentence and its own note kept.
    static func defaultSlips(_ rows: [I4TicketRow], sections: [HomeworkSection], grades: [HomeworkGrade]) -> [DefaultSlip] {
        sendable(rows).map {
            DefaultSlip(studentID: $0.student.id,
                        criteria: HomeworkRules.openingCriteria(slip: nil, sections: sections, grades: grades,
                                                                studentID: $0.student.id),
                        note: $0.slip?.note ?? "")
        }
    }

    /// Unsent students the class send leaves out because they have no slip and did not attend.
    static func withoutSlip(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        rows.filter { $0.slip == nil && !$0.attended }
    }

    enum SendAvailability: Equatable {
        case ready
        case nothingToSend
        case needsNetwork
    }

    /// Sending is never queued: without a connection the button locks and says why.
    static func sendAvailability(sendableCount: Int, isOnline: Bool) -> SendAvailability {
        if !isOnline { return .needsNetwork }
        return sendableCount > 0 ? .ready : .nothingToSend
    }

    enum SendGate: Equatable { case go, blocked, alreadySent }

    /// What the dialog's send button does. Once every slip is sent nothing is left to send, so a press that lands
    /// before the dialog has closed does nothing instead of sending again or reporting a fault.
    static func sendGate(_ availability: SendAvailability) -> SendGate {
        switch availability {
        case .ready: .go
        case .needsNetwork: .blocked
        case .nothingToSend: .alreadySent
        }
    }

    static func badge(_ row: I4TicketRow) -> (label: String, tone: AppPill.Tone) {
        if row.isSent {
            if let time = I4Format.time(row.slip?.sentAt) {
                return (String.localizedStringWithFormat(String(localized: "feature.comments.a.gui.4c29c834"), String(describing: (time))), .success)
            }
            return (String(localized: "feature.comments.a.gui"), .success)
        }
        return (String(localized: "feature.comments.chua.gui"), .neutral)
    }

    static func homeworkLine(_ row: I4TicketRow) -> (text: String, warning: Bool) {
        let prefix = homeworkPrefix(date: row.previousDate)
        if row.previousHomework.total == 0 {
            if row.previousDate == nil && !row.previousHadSections {
                return (String(localized: "feature.comments.buoi.au.chua.co.btvn.buoi.truoc"), false)
            }
            return (String(localized: "feature.comments.buoi.truoc.khong.giao.btvn"), false)
        }
        if row.previousHomework.ungraded > 0 {
            return (String.localizedStringWithFormat(String(localized: "feature.comments.phan.chua.cham"), String(describing: (prefix)), String(describing: (row.previousHomework.ungraded))), true)
        }
        return (String.localizedStringWithFormat(String(localized: "feature.comments.phan.a.cham"), String(describing: (prefix)), String(describing: (row.previousHomework.graded)), String(describing: (row.previousHomework.total))), false)
    }

    /// "BTVN ngày 21/10", or "BTVN buổi trước" before the first session.
    static func homeworkPrefix(date: String?) -> String {
        guard let date else { return String(localized: "feature.comments.btvn.buoi.truoc") }
        return String.localizedStringWithFormat(String(localized: "comments.homework.prefixOnDate", table: "Teacher"),
                                                I4Format.dayMonth(date))
    }

    /// "ngày 21/10", or "buổi trước" before the first session: how a sentence names the previous homework.
    static func previousLabel(date: String?) -> String {
        guard let date else { return String(localized: "feature.comments.previousSession") }
        return String.localizedStringWithFormat(String(localized: "comments.previous.onDate", table: "Teacher"),
                                                I4Format.dayMonth(date))
    }

    /// Students (and parts) still "Chưa chấm" among the slips that will be sent.
    static func ungradedNotice(_ rows: [I4TicketRow]) -> (students: Int, parts: Int) {
        let sending = sendable(rows)
        let ungradedRows = sending.filter { $0.previousHomework.ungraded > 0 }
        return (ungradedRows.count, ungradedRows.reduce(0) { $0 + $1.previousHomework.ungraded })
    }
}
