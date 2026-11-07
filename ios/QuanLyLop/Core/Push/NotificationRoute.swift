import Foundation
import Observation

/// A reference to a guardian destination. Every destination is validated against the current linked
/// students and its data is loaded again through the authorized guardian API.
enum NotificationRoute: Hashable, Sendable {
    case ticket(studentID: String, sessionID: String)
    case report(studentID: String, reportID: String)
    case scores(studentID: String, testID: String)

    init?(payload: [AnyHashable: Any]) {
        guard let kind = payload["kind"] as? String,
              let studentID = Self.identifier(payload["student_id"] as? String) else { return nil }
        switch kind {
        case "slip_sent", "homework_assigned":
            guard let sessionID = Self.identifier(payload["session_id"] as? String) else { return nil }
            self = .ticket(studentID: studentID, sessionID: sessionID)
        case "report_published":
            guard let reportID = Self.identifier(payload["report_id"] as? String) else { return nil }
            self = .report(studentID: studentID, reportID: reportID)
        case "score_updated":
            guard let testID = Self.identifier(payload["test_id"] as? String) else { return nil }
            self = .scores(studentID: studentID, testID: testID)
        default:
            return nil
        }
    }

    init?(notification: NotificationInboxItem) {
        guard let studentID = Self.identifier(notification.studentId) else { return nil }
        switch notification.kind {
        case "slip_sent", "homework_assigned":
            guard let sessionID = Self.identifier(notification.sessionId) else { return nil }
            self = .ticket(studentID: studentID, sessionID: sessionID)
        case "report_published":
            guard let reportID = Self.identifier(notification.reportId) else { return nil }
            self = .report(studentID: studentID, reportID: reportID)
        case "score_updated":
            guard let testID = Self.identifier(notification.testId) else { return nil }
            self = .scores(studentID: studentID, testID: testID)
        default:
            return nil
        }
    }

    private static func identifier(_ value: String?) -> String? {
        guard let value, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return value
    }
}

/// App-level handoff for push taps and future inbox actions. Callers must state the active role so
/// notifications received while a staff membership is active are discarded.
@MainActor @Observable
final class PendingNotificationRoute {
    private(set) var route: NotificationRoute?

    func receive(payload: [AnyHashable: Any], isGuardian: Bool) {
        guard isGuardian else { route = nil; return }
        route = NotificationRoute(payload: payload)
    }

    func receive(notification: NotificationInboxItem, isGuardian: Bool) {
        guard isGuardian else { route = nil; return }
        route = NotificationRoute(notification: notification)
    }

    func consume() { route = nil }
}
