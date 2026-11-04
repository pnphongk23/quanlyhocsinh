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

    /// The slip's last save was refused: the server holds an older version, so a send would hand parents that one.
    let hasUnappliedEdit: Bool

    init(student: Student, slip: SessionSlip?, attendance: AttendanceStatus? = nil,
         previousHomework: I4HomeworkSummary, previousDate: String?, previousHadSections: Bool,
         hasUnappliedEdit: Bool = false) {
        self.hasUnappliedEdit = hasUnappliedEdit
        self.student = student; self.slip = slip; self.attendance = attendance
        self.previousHomework = previousHomework; self.previousDate = previousDate
        self.previousHadSections = previousHadSections
    }

    var id: String { student.id }
    var stars: Int? { slip?.stars }
    var isSent: Bool { slip?.status == .sent }
    var isAbsent: Bool { attendance == .absent }
    /// Marked Có mặt or Muộn: the students "Gán mặc định" and "Gửi phiếu cả lớp" act on.
    var isAttending: Bool { attendance == .present || attendance == .late }
}

enum CommentsRules {
    /// "Điểm danh xong": every student of the session has a saved attendance status (pending sync included).
    /// A student added after attendance was taken has none, so the session is unfinished again until they are marked.
    static func isAttendanceComplete(_ rows: [I4TicketRow]) -> Bool {
        rows.allSatisfy { $0.attendance != nil }
    }

    static func unmarkedCount(_ rows: [I4TicketRow]) -> Int {
        rows.filter { $0.attendance == nil }.count
    }

    /// The list order once attendance is complete: absent students last, everyone else keeps their order.
    static func absentLast(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        rows.filter { !$0.isAbsent } + rows.filter(\.isAbsent)
    }

    static func matches(_ row: I4TicketRow, _ filter: TicketFilter) -> Bool {
        switch filter {
        case .all: true
        case .unsent: !row.isSent
        }
    }

    /// What the student card says under the name when the slip has no stars: a student with no slip (or an old
    /// unscored draft) has nothing to show yet.
    static func starsCaption(_ row: I4TicketRow) -> String? {
        row.stars == nil ? SlipSheetText.notCommented : nil
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

    /// What "Gửi phiếu cả lớp" sends: the unsent slips of students marked Có mặt or Muộn. An absent student is left
    /// out even with a slip (it can still be sent on its own); a student with no slip has nothing to send; a slip whose
    /// last save the server refused is left out too, as the send would carry the older version. Nothing is sent
    /// while attendance is unfinished.
    static func sendable(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        guard isAttendanceComplete(rows) else { return [] }
        return rows.filter { !$0.isSent && $0.slip != nil && $0.isAttending && !$0.hasUnappliedEdit }
    }

    struct DefaultSlip: Equatable {
        let studentID: String
        let criteria: Int
        let note: String
        /// Always written from the criteria; the server stores what it is given.
        var comment: String { SlipRules.generatedSentence(criteria: criteria) }
    }

    /// The default slips `slip.send` carries: only an old unscored draft, which has no stars to send. A student
    /// with no slip gets nothing here, whatever their attendance.
    static func sendDefaults(studentIDs: [String], slip: (String) -> SessionSlip?,
                             sections: [HomeworkSection], grades: [HomeworkGrade]) -> [DefaultSlip] {
        studentIDs.compactMap { id in
            guard let existing = slip(id), existing.isLegacy, existing.stars == nil else { return nil }
            return DefaultSlip(studentID: id,
                               criteria: HomeworkRules.openingCriteria(slip: nil, sections: sections, grades: grades, studentID: id),
                               note: existing.note)
        }
    }

    /// Who "Gán tất cả mặc định" acts on: students marked Có mặt or Muộn whose slip is not sent. Absent students
    /// get no slip and keep theirs; nothing is assigned while attendance is unfinished.
    static func defaultTargets(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        guard isAttendanceComplete(rows) else { return [] }
        return rows.filter { !$0.isSent && $0.isAttending }
    }

    /// "Gán tất cả mặc định": each target gets all five criteria (a new slip when it has none). Homework follows
    /// last session's grades, the sentence is regenerated and a slip's own note is kept.
    static func defaultSlips(_ rows: [I4TicketRow], sections: [HomeworkSection], grades: [HomeworkGrade]) -> [DefaultSlip] {
        defaultTargets(rows).map {
            DefaultSlip(studentID: $0.student.id,
                        criteria: HomeworkRules.openingCriteria(slip: nil, sections: sections, grades: grades,
                                                                studentID: $0.student.id),
                        note: $0.slip?.note ?? "")
        }
    }

    /// Present or late students the class send leaves out because they have no slip.
    static func withoutSlip(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        rows.filter { $0.slip == nil && $0.isAttending }
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
        if row.isSent { return (String(localized: "feature.comments.a.gui"), .success) }
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

/// How a server refusal of a slip write or send reads to the teacher. The server's code for "attendance is not
/// complete" lives here only.
enum SlipServerError {
    static let attendanceIncompleteCode = APIError.attendanceIncompleteCode

    /// The message for a refusal the screen explains itself; nil leaves the usual failure text.
    static func message(for error: APIError?) -> String? {
        error?.code == attendanceIncompleteCode
            ? String(localized: "comments.error.attendanceIncomplete", table: "Teacher") : nil
    }
}
