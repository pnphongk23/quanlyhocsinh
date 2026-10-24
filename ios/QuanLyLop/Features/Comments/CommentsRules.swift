import Foundation

/// Filter pills of the comment tab (`TICKET_FILTERS`).
enum TicketFilter: String, CaseIterable {
    case all, none, unsent

    var label: String {
        switch self {
        case .all: String(localized: "feature.comments.tat.ca")
        case .none: String(localized: "feature.comments.chua.chon.sao")
        case .unsent: String(localized: "feature.comments.chua.gui")
        }
    }
}

/// One row of the comment list: the student, their slip and last session's homework tally.
struct I4TicketRow: Identifiable {
    let student: Student
    let slip: SessionSlip?
    let previousHomework: I4HomeworkSummary
    let previousSessionNumber: Int?
    /// Whether the session before this one had homework sections at all.
    let previousHadSections: Bool

    var id: String { student.id }
    var stars: Stars? { slip?.stars }
    var isSent: Bool { slip?.status == .sent }
}

enum CommentsRules {
    /// Buttons of the star picker, left to right: best level first.
    static let starPickerOrder: [Stars] = [.three, .two, .one]

    static func matches(_ row: I4TicketRow, _ filter: TicketFilter) -> Bool {
        switch filter {
        case .all: true
        case .none: row.stars == nil
        case .unsent: !row.isSent
        }
    }

    static func filtered(_ rows: [I4TicketRow], _ filter: TicketFilter) -> [I4TicketRow] {
        rows.filter { matches($0, filter) }
    }

    static func counts(_ rows: [I4TicketRow]) -> (all: Int, none: Int, unsent: Int) {
        (rows.count, rows.filter { $0.stars == nil }.count, rows.filter { !$0.isSent }.count)
    }

    static func filterLabel(_ filter: TicketFilter, _ counts: (all: Int, none: Int, unsent: Int)) -> String {
        switch filter {
        case .all: String.localizedStringWithFormat(String(localized: "feature.comments.tat.ca.9c49d886"), String(describing: (counts.all)))
        case .none: String.localizedStringWithFormat(String(localized: "feature.comments.chua.chon.sao.c7aef4ad"), String(describing: (counts.none)))
        case .unsent: String.localizedStringWithFormat(String(localized: "feature.comments.chua.gui.52c3c8f7"), String(describing: (counts.unsent)))
        }
    }

    /// Starred, not yet sent: what the "Gửi phiếu cả lớp" button will send.
    static func sendable(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        rows.filter { $0.stars != nil && !$0.isSent }
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
        let prefix: String
        if let number = row.previousSessionNumber {
            prefix = String.localizedStringWithFormat(String(localized: "feature.comments.btvn.buoi"), String(describing: (number)))
        } else {
            prefix = String(localized: "feature.comments.btvn.buoi.truoc")
        }
        if row.previousHomework.total == 0 {
            if row.previousSessionNumber == nil && !row.previousHadSections {
                return (String(localized: "feature.comments.buoi.au.chua.co.btvn.buoi.truoc"), false)
            }
            return (String(localized: "feature.comments.buoi.truoc.khong.giao.btvn"), false)
        }
        if row.previousHomework.ungraded > 0 {
            return (String.localizedStringWithFormat(String(localized: "feature.comments.phan.chua.cham"), String(describing: (prefix)), String(describing: (row.previousHomework.ungraded))), true)
        }
        return (String.localizedStringWithFormat(String(localized: "feature.comments.phan.a.cham"), String(describing: (prefix)), String(describing: (row.previousHomework.graded)), String(describing: (row.previousHomework.total))), false)
    }

    /// Students (and parts) still "Chưa chấm" among the slips that will be sent.
    static func ungradedNotice(_ rows: [I4TicketRow]) -> (students: Int, parts: Int) {
        let sending = sendable(rows)
        let ungradedRows = sending.filter { $0.previousHomework.ungraded > 0 }
        return (ungradedRows.count, ungradedRows.reduce(0) { $0 + $1.previousHomework.ungraded })
    }
}
