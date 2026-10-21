import Foundation

/// Filter pills of the comment tab (`TICKET_FILTERS`).
enum TicketFilter: String, CaseIterable {
    case all, none, unsent

    var label: String {
        switch self {
        case .all: "Tất cả"
        case .none: "Chưa chọn sao"
        case .unsent: "Chưa gửi"
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
        case .all: "Tất cả (\(counts.all))"
        case .none: "Chưa chọn sao (\(counts.none))"
        case .unsent: "Chưa gửi (\(counts.unsent))"
        }
    }

    /// Starred, not yet sent: what the "Gửi phiếu cả lớp" button will send.
    static func sendable(_ rows: [I4TicketRow]) -> [I4TicketRow] {
        rows.filter { $0.stars != nil && !$0.isSent }
    }

    static func badge(_ row: I4TicketRow) -> (label: String, tone: AppPill.Tone) {
        if row.isSent {
            if let time = I4Format.time(row.slip?.sentAt) {
                return ("Đã gửi · \(time)", .success)
            }
            return ("Đã gửi", .success)
        }
        return ("Chưa gửi", .neutral)
    }

    static func homeworkLine(_ row: I4TicketRow) -> (text: String, warning: Bool) {
        let prefix: String
        if let number = row.previousSessionNumber {
            prefix = "BTVN buổi \(number)"
        } else {
            prefix = "BTVN buổi trước"
        }
        if row.previousHomework.total == 0 {
            if row.previousSessionNumber == nil && !row.previousHadSections {
                return ("Buổi đầu · chưa có BTVN buổi trước", false)
            }
            return ("Buổi trước không giao BTVN", false)
        }
        if row.previousHomework.ungraded > 0 {
            return ("\(prefix): \(row.previousHomework.ungraded) phần Chưa chấm", true)
        }
        return ("\(prefix): \(row.previousHomework.graded)/\(row.previousHomework.total) phần đã chấm", false)
    }

    /// Students (and parts) still "Chưa chấm" among the slips that will be sent.
    static func ungradedNotice(_ rows: [I4TicketRow]) -> (students: Int, parts: Int) {
        let sending = sendable(rows)
        let ungradedRows = sending.filter { $0.previousHomework.ungraded > 0 }
        return (ungradedRows.count, ungradedRows.reduce(0) { $0 + $1.previousHomework.ungraded })
    }
}
