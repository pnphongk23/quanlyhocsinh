import XCTest
@testable import QuanLyLop

/// Who may send slips: the "send_comments" row, falling back to "comments_reports" when the server has none.
@MainActor
final class SendCommentsPermissionTests: XCTestCase {
    private func membership(scope: ScopeKind = .assignedClasses, permissions: [String: PermissionLevel]?) -> Membership {
        Membership(id: "m", workspace: Workspace(id: "w", name: "W"),
                   role: Role(id: "r", name: "R", systemKey: nil, scopeKind: scope),
                   status: "active", scopeEpoch: 1, permissions: permissions)
    }

    func testTheAdminMayAlwaysSend() {
        XCTAssertTrue(membership(scope: .workspace, permissions: nil).allows(group: "send_comments", write: true))
    }

    func testAnExplicitNoneBlocksSendingEvenWithCommentsWrite() {
        let assistant = membership(permissions: ["comments_reports": .write, "send_comments": PermissionLevel.none])
        XCTAssertTrue(assistant.allows(group: "comments_reports", write: true))
        XCTAssertFalse(assistant.allows(group: "send_comments", write: true))
    }

    func testAnExplicitWriteAllowsSending() {
        XCTAssertTrue(membership(permissions: ["comments_reports": .write, "send_comments": .write]).allows(group: "send_comments", write: true))
    }

    func testAMissingRowFollowsCommentsReports() {
        XCTAssertTrue(membership(permissions: ["comments_reports": .write]).allows(group: "send_comments", write: true))
        XCTAssertFalse(membership(permissions: ["comments_reports": .read]).allows(group: "send_comments", write: true))
        XCTAssertFalse(membership(permissions: [:]).allows(group: "send_comments", write: true))
    }

    func testTheNewKeyDecodesFromAMembershipAndOldClientsKeepWorking() throws {
        let json = #"{"id":"m","status":"active","scope_epoch":2,"workspace":{"id":"w","name":"W"},"role":{"id":"r","name":"Trợ giảng","scope_kind":"assigned_classes","system_key":"assistant"},"permissions":{"comments_reports":"write","send_comments":"none"},"class_ids":["c"]}"#
        let decoded = try WireJSON.decoder().decode(Membership.self, from: Data(json.utf8))
        XCTAssertEqual(decoded.permissions?["send_comments"], PermissionLevel.none)
        XCTAssertFalse(decoded.allows(group: "send_comments", write: true))
    }
}
