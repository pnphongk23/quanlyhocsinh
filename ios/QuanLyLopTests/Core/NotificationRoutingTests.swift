import XCTest
@testable import QuanLyLop

@MainActor
final class NotificationRoutingTests: XCTestCase {
    func testPayloadRoutesEachSupportedKind() throws {
        XCTAssertEqual(NotificationRoute(payload: [
            "kind": "slip_sent", "student_id": "stu_1", "session_id": "ses_1"
        ]), .ticket(studentID: "stu_1", sessionID: "ses_1"))
        XCTAssertEqual(NotificationRoute(payload: [
            "kind": "homework_assigned", "student_id": "stu_2", "session_id": "ses_2"
        ]), .ticket(studentID: "stu_2", sessionID: "ses_2"))
        XCTAssertEqual(NotificationRoute(payload: [
            "kind": "report_published", "student_id": "stu_3", "report_id": "rep_3"
        ]), .report(studentID: "stu_3", reportID: "rep_3"))
        XCTAssertEqual(NotificationRoute(payload: [
            "kind": "score_updated", "student_id": "stu_4", "test_id": "tst_4"
        ]), .scores(studentID: "stu_4", testID: "tst_4"))
    }

    func testInboxRowsRouteUsingTheSameReferences() throws {
        XCTAssertEqual(NotificationRoute(notification: item(kind: "slip_sent", sessionID: "ses_1")),
                       .ticket(studentID: "stu_1", sessionID: "ses_1"))
        XCTAssertEqual(NotificationRoute(notification: item(kind: "homework_assigned", sessionID: "ses_2")),
                       .ticket(studentID: "stu_1", sessionID: "ses_2"))
        XCTAssertEqual(NotificationRoute(notification: item(kind: "report_published", reportID: "rep_3")),
                       .report(studentID: "stu_1", reportID: "rep_3"))
        XCTAssertEqual(NotificationRoute(notification: item(kind: "score_updated", testID: "tst_4")),
                       .scores(studentID: "stu_1", testID: "tst_4"))
    }

    func testMissingIdentifiersAndUnknownKindsAreIgnored() {
        let invalid: [[AnyHashable: Any]] = [
            [:],
            ["kind": "unknown", "student_id": "stu_1"],
            ["kind": "slip_sent", "student_id": "stu_1"],
            ["kind": "homework_assigned", "student_id": "stu_1", "session_id": "  "],
            ["kind": "report_published", "student_id": "stu_1"],
            ["kind": "score_updated", "student_id": "stu_1", "test_id": 8],
            ["kind": "score_updated", "test_id": "tst_1"]
        ]
        for payload in invalid { XCTAssertNil(NotificationRoute(payload: payload)) }

        XCTAssertNil(NotificationRoute(notification: item(kind: "unknown")))
        XCTAssertNil(NotificationRoute(notification: item(kind: "slip_sent")))
        XCTAssertNil(NotificationRoute(notification: item(kind: "report_published")))
        XCTAssertNil(NotificationRoute(notification: item(kind: "score_updated")))
    }

    func testRouteResolvesToExistingGuardianDetailAndLinkedStudent() throws {
        let ticket = try XCTUnwrap(NotificationRoute(payload: [
            "kind": "homework_assigned", "student_id": "stu_2", "session_id": "ses_2"
        ]))
        XCTAssertEqual(GuardianNotificationDestination.resolve(ticket, linkedStudentIDs: ["stu_1", "stu_2"]),
                       .ticket(studentID: "stu_2", sessionID: "ses_2"))

        let report = try XCTUnwrap(NotificationRoute(payload: [
            "kind": "report_published", "student_id": "stu_1", "report_id": "rep_1"
        ]))
        XCTAssertEqual(GuardianNotificationDestination.resolve(report, linkedStudentIDs: ["stu_1"])?.detail,
                       .report)

        let score = try XCTUnwrap(NotificationRoute(payload: [
            "kind": "score_updated", "student_id": "stu_1", "test_id": "tst_1"
        ]))
        XCTAssertEqual(GuardianNotificationDestination.resolve(score, linkedStudentIDs: ["stu_1"])?.detail,
                       .scores)
        XCTAssertNil(GuardianNotificationDestination.resolve(ticket, linkedStudentIDs: ["stu_1"]))
    }

    func testDestinationUsesOnlyFreshlyReloadedLinksAndSessions() async throws {
        let ticket = try XCTUnwrap(NotificationRoute(payload: [
            "kind": "slip_sent", "student_id": "stu_1", "session_id": "ses_new"
        ]))
        let revoked = try await GuardianNotificationDestination.resolveAfterReload(ticket) {
            GuardianNotificationSnapshot(linkedStudentIDs: [], sessionIDsByStudent: [:], reportIDsByStudent: [:], testMonthsByStudent: [:])
        }
        XCTAssertNil(revoked)

        let newlyAvailable = try await GuardianNotificationDestination.resolveAfterReload(ticket) {
            GuardianNotificationSnapshot(linkedStudentIDs: ["stu_1"],
                                         sessionIDsByStudent: ["stu_1": ["ses_old", "ses_new"]],
                                         reportIDsByStudent: [:], testMonthsByStudent: [:])
        }
        XCTAssertEqual(newlyAvailable, .ticket(studentID: "stu_1", sessionID: "ses_new"))
    }

    func testReportAndScoreDestinationsRetainTargetsAndFallBackToGeneralPages() throws {
        let report = try XCTUnwrap(NotificationRoute(payload: [
            "kind": "report_published", "student_id": "stu_1", "report_id": "rep_1"
        ]))
        let reportDestination = GuardianNotificationDestination.resolve(
            report, linkedStudentIDs: ["stu_1"], reportIDsByStudent: ["stu_1": ["rep_1"]])
        XCTAssertEqual(reportDestination, .report(studentID: "stu_1", reportID: "rep_1"))
        XCTAssertEqual(reportDestination?.detail, .reportByID("rep_1"))
        XCTAssertEqual(GuardianNotificationDestination.resolve(
            report, linkedStudentIDs: ["stu_1"], reportIDsByStudent: [:])?.detail, .report)

        let score = try XCTUnwrap(NotificationRoute(payload: [
            "kind": "score_updated", "student_id": "stu_1", "test_id": "test_1"
        ]))
        let scoreDestination = GuardianNotificationDestination.resolve(
            score, linkedStudentIDs: ["stu_1"], testMonthsByStudent: ["stu_1": ["test_1": "2026-10"]])
        XCTAssertEqual(scoreDestination, .scores(studentID: "stu_1", testID: "test_1", month: "2026-10"))
        XCTAssertEqual(scoreDestination?.detail, .scoresInMonth("2026-10"))
        XCTAssertEqual(GuardianNotificationDestination.resolve(
            score, linkedStudentIDs: ["stu_1"], testMonthsByStudent: [:])?.detail, .scores)
    }

    func testIntentFromSettingsReturnsToMainBeforeOpeningDestination() {
        XCTAssertTrue(GuardianNotificationDestination.shouldSwitchToMain(from: .settings))
        XCTAssertTrue(GuardianNotificationDestination.shouldSwitchToMain(from: .changePassword))
        XCTAssertFalse(GuardianNotificationDestination.shouldSwitchToMain(from: .main))
    }

    func testNonGuardianDoesNotRetainIncomingRoute() {
        let pending = PendingNotificationRoute()
        pending.receive(payload: [
            "kind": "slip_sent", "student_id": "stu_1", "session_id": "ses_1"
        ], isGuardian: false)
        XCTAssertNil(pending.route)
    }

    private func item(kind: String, studentID: String = "stu_1", sessionID: String? = nil,
                      reportID: String? = nil, testID: String? = nil) -> NotificationInboxItem {
        NotificationInboxItem(id: 42, kind: kind, studentId: studentID, sessionId: sessionID,
                              reportId: reportID, testId: testID,
                              createdAt: "2026-11-07T00:00:00.000Z", readAt: nil)
    }
}
