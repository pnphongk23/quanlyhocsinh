import Foundation

struct GuardianNotificationSnapshot: Sendable {
    let linkedStudentIDs: [String]
    let sessionIDsByStudent: [String: Set<String>]
    let reportIDsByStudent: [String: Set<String>]
    let testMonthsByStudent: [String: [String: String]]

    init(linkedStudentIDs: [String], sessionIDsByStudent: [String: Set<String>],
         reportIDsByStudent: [String: Set<String>], testMonthsByStudent: [String: [String: String]]) {
        self.linkedStudentIDs = linkedStudentIDs
        self.sessionIDsByStudent = sessionIDsByStudent
        self.reportIDsByStudent = reportIDsByStudent
        self.testMonthsByStudent = testMonthsByStudent
    }

    init(dashboard: GuardianDashboard) {
        linkedStudentIDs = dashboard.children.map { $0.student.id }
        sessionIDsByStudent = Dictionary(uniqueKeysWithValues: dashboard.children.map {
            ($0.student.id, Set($0.sessions.map(\.id)))
        })
        reportIDsByStudent = Dictionary(uniqueKeysWithValues: dashboard.children.map {
            ($0.student.id, Set($0.publishedReports.map(\.reportId)))
        })
        testMonthsByStudent = Dictionary(uniqueKeysWithValues: dashboard.children.map { child in
            (child.student.id, Dictionary(uniqueKeysWithValues: child.tests.filter { !$0.archived }.map {
                ($0.id, String($0.date.prefix(7)))
            }))
        })
    }
}

enum GuardianNotificationDestination: Hashable, Sendable {
    case ticket(studentID: String, sessionID: String)
    case report(studentID: String, reportID: String?)
    case scores(studentID: String, testID: String?, month: String?)

    var studentID: String {
        switch self {
        case .ticket(let studentID, _), .report(let studentID, _), .scores(let studentID, _, _): studentID
        }
    }

    var detail: GuardianDetail {
        switch self {
        case .ticket(_, let sessionID): .ticket(sessionID)
        case .report(_, let reportID): reportID.map(GuardianDetail.reportByID) ?? .report
        case .scores(_, _, let month): month.map(GuardianDetail.scoresInMonth) ?? .scores
        }
    }

    static func resolve(_ route: NotificationRoute, linkedStudentIDs: [String],
                        sessionIDsByStudent: [String: Set<String>] = [:],
                        reportIDsByStudent: [String: Set<String>] = [:],
                        testMonthsByStudent: [String: [String: String]] = [:]) -> Self? {
        switch route {
        case .ticket(let studentID, let sessionID):
            guard linkedStudentIDs.contains(studentID) else { return nil }
            if let sessionIDs = sessionIDsByStudent[studentID], !sessionIDs.contains(sessionID) { return nil }
            return .ticket(studentID: studentID, sessionID: sessionID)
        case .report(let studentID, let reportID):
            guard linkedStudentIDs.contains(studentID) else { return nil }
            let available = reportIDsByStudent[studentID]?.contains(reportID) == true ? reportID : nil
            return .report(studentID: studentID, reportID: available)
        case .scores(let studentID, let testID):
            guard linkedStudentIDs.contains(studentID) else { return nil }
            let month = testMonthsByStudent[studentID]?[testID]
            let availableTest = month == nil ? nil : testID
            return .scores(studentID: studentID, testID: availableTest, month: month)
        }
    }

    static func resolve(_ route: NotificationRoute, in snapshot: GuardianNotificationSnapshot) -> Self? {
        resolve(route, linkedStudentIDs: snapshot.linkedStudentIDs,
                sessionIDsByStudent: snapshot.sessionIDsByStudent,
                reportIDsByStudent: snapshot.reportIDsByStudent,
                testMonthsByStudent: snapshot.testMonthsByStudent)
    }

    static func shouldSwitchToMain(from screen: AuthModel.Screen) -> Bool {
        screen != .main
    }
}

@MainActor
final class GuardianNotificationIntentHandler {
    private let pendingRoute: PendingNotificationRoute

    init(pendingRoute: PendingNotificationRoute) {
        self.pendingRoute = pendingRoute
    }

    /// Failed/offline loads pass no snapshot and preserve the intent for the next successful load.
    @discardableResult
    func loadCompleted(snapshot: GuardianNotificationSnapshot?, screen: AuthModel.Screen,
                       isGuardian: Bool = true,
                       open: (GuardianNotificationDestination, Bool) -> Void) -> Bool {
        guard let intent = pendingRoute.pendingIntent else { return false }
        guard let snapshot else { return false }
        guard isGuardian else {
            pendingRoute.consume(id: intent.id)
            return false
        }
        guard let destination = GuardianNotificationDestination.resolve(intent.route, in: snapshot) else {
            pendingRoute.consume(id: intent.id)
            return false
        }
        open(destination, GuardianNotificationDestination.shouldSwitchToMain(from: screen))
        pendingRoute.consume(id: intent.id)
        return true
    }
}
