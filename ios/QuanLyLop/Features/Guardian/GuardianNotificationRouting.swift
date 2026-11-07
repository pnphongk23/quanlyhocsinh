import Foundation

enum GuardianNotificationDestination: Hashable, Sendable {
    case ticket(studentID: String, sessionID: String)
    case report(studentID: String)
    case scores(studentID: String)

    var studentID: String {
        switch self {
        case .ticket(let studentID, _), .report(let studentID), .scores(let studentID): studentID
        }
    }

    var detail: GuardianDetail {
        switch self {
        case .ticket(_, let sessionID): .ticket(sessionID)
        case .report: .report
        case .scores: .scores
        }
    }

    static func resolve(_ route: NotificationRoute, linkedStudentIDs: [String]) -> Self? {
        switch route {
        case .ticket(let studentID, let sessionID):
            guard linkedStudentIDs.contains(studentID) else { return nil }
            return .ticket(studentID: studentID, sessionID: sessionID)
        case .report(let studentID, _):
            guard linkedStudentIDs.contains(studentID) else { return nil }
            return .report(studentID: studentID)
        case .scores(let studentID, _):
            guard linkedStudentIDs.contains(studentID) else { return nil }
            return .scores(studentID: studentID)
        }
    }
}
