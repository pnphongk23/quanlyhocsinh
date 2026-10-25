import XCTest
@testable import QuanLyLop

/// A guardian linked after signing up has one active membership but no active one on the session:
/// the app picks it instead of showing the role screen.
@MainActor
final class SoleMembershipSelectionTests: XCTestCase {
    private let scope = CacheScope(userId: "late-user", workspaceId: "late-workspace", membershipId: "late-member")

    private func membership(id: String = "late-member", status: String = "active") -> Membership {
        Membership(id: id, workspace: Workspace(id: "late-workspace", name: "Fixture"),
                   role: Role(id: "role", name: "Guardian", systemKey: nil, scopeKind: .linkedStudents),
                   status: status, scopeEpoch: 1, permissions: [:])
    }

    private func identity(_ memberships: [Membership]) -> CurrentIdentity {
        CurrentIdentity(user: User(id: scope.userId, phone: "0900000000", displayName: "Fixture", mustChangePassword: false),
                        activeMembershipId: nil, memberships: memberships)
    }

    private func model(api: SelectionAPI, cache: IdentityBox) throws -> AuthModel {
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        return AuthModel(configuration: .fallback, apiClient: api, tokenStore: InMemoryTokenStore(token: "fixture-session"),
                         identityStore: cache, storeFactory: { _ in store }, isOnline: { true })
    }

    func testSingleActiveMembershipIsSelectedOnceAndOpensTheMainScreen() async throws {
        let api = SelectionAPI(me: identity([membership()]))
        let cache = IdentityBox(nil)
        let model = try model(api: api, cache: cache)

        await model.restoreSession()

        XCTAssertEqual(model.screen, .main)
        XCTAssertEqual(model.identity?.activeMembershipId, "late-member")
        XCTAssertEqual(model.activeMembership?.id, "late-member")
        let saved = await cache.load()
        XCTAssertEqual(saved?.activeMembershipId, "late-member")
        let calls = await api.calls
        XCTAssertEqual(calls, ["GET me", "PUT session/membership"])
    }

    func testSeveralMembershipsKeepTheRoleScreen() async throws {
        let api = SelectionAPI(me: identity([membership(), membership(id: "second")]))
        let model = try model(api: api, cache: IdentityBox(nil))

        await model.restoreSession()

        XCTAssertEqual(model.screen, .chooseRole)
        let calls = await api.calls
        XCTAssertEqual(calls, ["GET me"])
    }

    func testInactiveSingleMembershipKeepsTheRoleScreen() async throws {
        let api = SelectionAPI(me: identity([membership(status: "revoked")]))
        let model = try model(api: api, cache: IdentityBox(nil))

        await model.restoreSession()

        XCTAssertEqual(model.screen, .chooseRole)
        let calls = await api.calls
        XCTAssertEqual(calls, ["GET me"])
    }

    func testFailedSelectionFallsBackToTheRoleScreenWithoutRetrying() async throws {
        let api = SelectionAPI(me: identity([membership()]), selectionFails: true)
        let model = try model(api: api, cache: IdentityBox(nil))

        await model.restoreSession()

        XCTAssertEqual(model.screen, .chooseRole)
        let calls = await api.calls
        XCTAssertEqual(calls, ["GET me", "PUT session/membership"])
    }
}

private actor SelectionAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let me: CurrentIdentity
    private let selectionFails: Bool
    private(set) var calls: [String] = []

    init(me: CurrentIdentity, selectionFails: Bool = false) {
        self.me = me
        self.selectionFails = selectionFails
    }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        calls.append("\(endpoint.method.rawValue.uppercased()) \(endpoint.path)")
        switch endpoint.path {
        case "me":
            return try WireJSON.decoder().decode(type, from: try WireJSON.encoder().encode(me))
        case "session/membership":
            if selectionFails { throw APIFailure.offline }
            let body = #"{"active_membership_id":"late-member","device_registration_cleared":false}"#
            return try WireJSON.decoder().decode(type, from: Data(body.utf8))
        default:
            throw APIFailure.offline
        }
    }
}

private actor IdentityBox: CachedIdentityStore {
    private var value: CurrentIdentity?
    init(_ identity: CurrentIdentity?) { value = identity }
    func load() -> CurrentIdentity? { value }
    func save(_ identity: CurrentIdentity) { value = identity }
    func clear() { value = nil }
}
