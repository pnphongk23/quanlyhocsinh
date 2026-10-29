import XCTest
@testable import QuanLyLop

/// Staff and role-permission calls against a mocked network layer (api-spec mục 11).
@MainActor
final class StaffStoreTests: XCTestCase {
    private func store(_ api: RecordingAPI, didChangeSelf: @escaping @MainActor () async -> Void = {}) -> StaffStore {
        StaffStore(api: api, didChangeSelf: didChangeSelf)
    }

    nonisolated private static let member = """
    {"id":"mem_7","kind":"member","user_id":"usr_7","display_name":"Cô Lan","phone":"+84900000007",
     "role":{"id":"role_asst","name":"Trợ giảng","system_key":"assistant"},"class_ids":["cls_1","cls_2"],
     "status":"active","is_self":false,"created_at":"2026-10-28T03:00:00.000Z","version":3}
    """

    func testLoadDecodesStaffAndClasses() async throws {
        let api = RecordingAPI { endpoint in
            switch endpoint.path {
            case "staff": return Data(#"{"items":[\#(Self.member),{"id":"dec_1","kind":"pending","user_id":null,"display_name":"Thầy Minh","phone":"+84900000008","role":{"id":"role_teacher","name":"Giáo viên","system_key":"teacher"},"class_ids":[],"status":"pending","is_self":false,"version":1}]}"#.utf8)
            case "classes": return Data(#"{"items":[{"id":"cls_1","name":"Lớp 6A","status":"active"}]}"#.utf8)
            default: throw APIFailure.badStatus(code: 404)
            }
        }
        let store = store(api)

        await store.load()

        XCTAssertEqual(store.phase, .loaded)
        XCTAssertEqual(store.members.map(\.id), ["mem_7", "dec_1"])
        XCTAssertEqual(store.members[0].roleKey, .assistant)
        XCTAssertEqual(store.members[0].classIds, ["cls_1", "cls_2"])
        XCTAssertEqual(store.members[1].kind, .pending)
        XCTAssertEqual(store.classes.map(\.name), ["Lớp 6A"])
        XCTAssertEqual(store.activeCount, 1)
        let queries = await api.requests.map(\.query)
        XCTAssertEqual(queries.last, ["status": "active"])
    }

    func testMemberWithoutNameStillLoadsAndIsMarkedUnnamed() async {
        let nameless = #"{"id":"mem_9","kind":"member","user_id":"usr_9","display_name":null,"phone":"+84900000009","role":{"id":"role_asst","name":"Trợ giảng","system_key":"assistant"},"class_ids":["cls_1"],"status":"disabled","is_self":false,"created_at":"2026-10-28T03:00:00.000Z","version":4}"#
        let blank = #"{"id":"mem_10","kind":"member","user_id":"usr_10","display_name":"  ","phone":"+84900000010","role":{"id":"role_asst","name":"Trợ giảng","system_key":"assistant"},"class_ids":[],"status":"active","is_self":false,"version":1}"#
        let api = RecordingAPI { endpoint in
            endpoint.path == "staff" ? Data(#"{"items":[\#(Self.member),\#(nameless),\#(blank)]}"#.utf8) : Data(#"{"items":[]}"#.utf8)
        }
        let store = store(api)

        await store.load()

        XCTAssertEqual(store.phase, .loaded)
        XCTAssertEqual(store.members.map(\.id), ["mem_7", "mem_9", "mem_10"])
        XCTAssertEqual(store.members.map(\.isUnnamed), [false, true, true])
        XCTAssertEqual(store.members[1].displayName, "")
        XCTAssertEqual(store.members[2].displayName, "")
        XCTAssertEqual(store.members[1].status, .disabled)
    }

    func testUnnamedMembersSortAfterNamedOnesOfTheSameStatus() throws {
        func member(_ id: String, name: String?) throws -> StaffMember {
            let value = name.map { "\"\($0)\"" } ?? "null"
            let json = #"{"id":"\#(id)","kind":"member","user_id":"u","display_name":\#(value),"phone":"+84900000011","role":{"id":"r","name":"Trợ giảng","system_key":"assistant"},"class_ids":[],"status":"active","is_self":false,"version":1}"#
            return try WireJSON.decoder().decode(StaffMember.self, from: Data(json.utf8))
        }
        let sorted = StaffStore.sorted([try member("none", name: nil), try member("zed", name: "Zed"), try member("amy", name: "Amy")])
        XCTAssertEqual(sorted.map(\.id), ["amy", "zed", "none"])
    }

    func testUnreadableStaffDataIsNotReportedAsAConnectionProblem() {
        let decoding = StaffStore.message(for: APIFailure.decoding)
        XCTAssertNotEqual(decoding, StaffStore.message(for: APIFailure.badStatus(code: 502)))
        XCTAssertNotEqual(decoding, StaffStore.message(for: APIFailure.offline))
    }

    func testLoadFailureKeepsTheMessageAndNoMembers() async {
        let store = store(RecordingAPI { _ in throw APIFailure.offline })
        await store.load()
        XCTAssertEqual(store.phase, .failed(StaffStore.message(for: APIFailure.offline)))
        XCTAssertTrue(store.members.isEmpty)
    }

    func testAddSendsDomesticPhoneRoleAndClassesAndShowsTheNewMember() async throws {
        let api = RecordingAPI { _ in Data(Self.member.utf8) }
        let store = store(api)

        let added = try await store.add(phone: "+84 900 000 007", name: "  Cô Lan ", role: .assistant, classIds: ["cls_1"])

        XCTAssertEqual(added.id, "mem_7")
        XCTAssertEqual(store.members.map(\.id), ["mem_7"])
        let sent = await api.requests
        let request = try XCTUnwrap(sent.first)
        XCTAssertEqual(request.method, .post)
        XCTAssertEqual(request.path, "staff")
        let body = try JSONSerialization.jsonObject(with: try XCTUnwrap(request.body)) as? [String: Any]
        XCTAssertEqual(body?["phone"] as? String, "0900000007")
        XCTAssertEqual(body?["display_name"] as? String, "Cô Lan")
        XCTAssertEqual(body?["role"] as? String, "assistant")
        XCTAssertEqual(body?["class_ids"] as? [String], ["cls_1"])
    }

    func testAddRejectsBadPhoneAndEmptyNameWithoutCallingTheServer() async {
        let api = RecordingAPI { _ in Data() }
        let store = store(api)
        do { _ = try await store.add(phone: "12345", name: "A", role: .teacher, classIds: []); XCTFail() }
        catch { XCTAssertEqual(error as? StaffInputError, .invalidPhone) }
        do { _ = try await store.add(phone: "0900000007", name: "  ", role: .teacher, classIds: []); XCTFail() }
        catch { XCTAssertEqual(error as? StaffInputError, .missingName) }
        let count = await api.requests.count
        XCTAssertEqual(count, 0)
    }

    func testUpdateSendsOnlyChangedFieldsWithTheVersion() async throws {
        let api = RecordingAPI { _ in Data(Self.member.utf8) }
        let store = store(api)
        let member = try JSONDecoder.wire.decode(StaffMember.self, from: Data(Self.member.utf8))

        _ = try await store.update(member, status: "disabled")

        let sent = await api.requests
        let request = try XCTUnwrap(sent.first)
        XCTAssertEqual(request.method, .patch)
        XCTAssertEqual(request.path, "staff/mem_7")
        let body = try JSONSerialization.jsonObject(with: try XCTUnwrap(request.body)) as? NSDictionary
        XCTAssertEqual(body, ["status": "disabled", "base_version": 3])
    }

    func testChangingYourOwnMemberAsksTheAppToRereadTheIdentity() async throws {
        let api = RecordingAPI { _ in Data(Self.member.replacingOccurrences(of: #""is_self":false"#, with: #""is_self":true"#).utf8) }
        let counter = Counter()
        let store = store(api) { counter.value += 1 }
        let member = try JSONDecoder.wire.decode(StaffMember.self, from: Data(Self.member.replacingOccurrences(of: #""is_self":false"#, with: #""is_self":true"#).utf8))

        _ = try await store.update(member, role: .teacher)
        XCTAssertEqual(counter.value, 1)

        let other = try JSONDecoder.wire.decode(StaffMember.self, from: Data(Self.member.utf8))
        _ = try await store.update(other, role: .teacher)
        XCTAssertEqual(counter.value, 1)
    }

    func testDeletePendingCallsDeleteAndRemovesTheRow() async throws {
        let api = RecordingAPI { endpoint in endpoint.method == .delete ? Data() : Data(#"{"items":[]}"#.utf8) }
        let store = store(api)
        let pending = try JSONDecoder.wire.decode(StaffMember.self, from: Data(#"{"id":"dec_1","kind":"pending","user_id":null,"display_name":"A","phone":"+84900000008","role":{"id":"r","name":"Giáo viên","system_key":"teacher"},"class_ids":[],"status":"pending","is_self":false,"version":1}"#.utf8))

        try await store.deletePending(pending)

        let sent = await api.requests
        let request = try XCTUnwrap(sent.last)
        XCTAssertEqual(request.method, .delete)
        XCTAssertEqual(request.path, "staff/dec_1")
    }

    func testPermissionsLoadAndPartialUpdate() async throws {
        let teacher = #"{"role":{"id":"role_teacher","name":"Giáo viên","system_key":"teacher"},"permissions":{"classes":"write","students":"write","sessions_attendance":"write","scores":"write","comments_reports":"write","lectures":"write"}}"#
        let updated = #"{"role":{"id":"role_teacher","name":"Giáo viên","system_key":"teacher"},"permissions":{"classes":"write","students":"write","sessions_attendance":"write","scores":"read","comments_reports":"write"}}"#
        let api = RecordingAPI { endpoint in
            endpoint.method == .put ? Data(updated.utf8) : Data(#"{"items":[\#(teacher)]}"#.utf8)
        }
        let store = store(api)

        await store.loadPermissions()
        XCTAssertEqual(store.roles.first?.permissions[.sessionsAttendance], .write)
        XCTAssertEqual(store.roles.first?.permissions[.commentsReports], .write)

        try await store.setLevel(.teacher, group: .scores, level: .read)

        XCTAssertEqual(store.roles.first?.permissions[.scores], .read)
        let sent = await api.requests
        let request = try XCTUnwrap(sent.last)
        XCTAssertEqual(request.method, .put)
        XCTAssertEqual(request.path, "roles/teacher/permissions")
        let body = try JSONSerialization.jsonObject(with: try XCTUnwrap(request.body)) as? NSDictionary
        XCTAssertEqual(body, ["permissions": ["scores": "read"]])
    }

    func testSendCommentsLoadsAndSavesAsItsOwnKeyWithNoReadLevel() async throws {
        let assistant = #"{"role":{"id":"role_assistant","name":"Trợ giảng","system_key":"assistant"},"permissions":{"comments_reports":"write","send_comments":"none"}}"#
        let updated = #"{"role":{"id":"role_assistant","name":"Trợ giảng","system_key":"assistant"},"permissions":{"comments_reports":"write","send_comments":"write"}}"#
        let api = RecordingAPI { endpoint in
            endpoint.method == .put ? Data(updated.utf8) : Data(#"{"items":[\#(assistant)]}"#.utf8)
        }
        let store = store(api)

        await store.loadPermissions()
        XCTAssertEqual(store.roles.first?.permissions[.sendComments], PermissionLevel.none)
        XCTAssertEqual(StaffPermissionGroup.sendComments.levels, [.none, .write])
        XCTAssertEqual(StaffPermissionGroup.scores.levels, [.none, .read, .write])

        try await store.setLevel(.assistant, group: .sendComments, level: .write)

        XCTAssertEqual(store.roles.first?.permissions[.sendComments], .write)
        let sent = await api.requests
        let request = try XCTUnwrap(sent.last)
        XCTAssertEqual(request.path, "roles/assistant/permissions")
        let body = try JSONSerialization.jsonObject(with: try XCTUnwrap(request.body)) as? NSDictionary
        XCTAssertEqual(body, ["permissions": ["send_comments": "write"]])
    }

    func testServerReasonsMapToDistinctMessages() {
        func failure(_ status: Int, _ code: String, reason: String) -> APIFailure {
            .server(status: status, error: APIError(code: code, message: nil, details: .object(["reason": .string(reason)]), requestId: nil), retryAfter: nil)
        }
        let messages = [
            StaffStore.message(for: failure(409, "conflict", reason: "staff_exists")),
            StaffStore.message(for: failure(409, "conflict", reason: "last_admin")),
            StaffStore.message(for: failure(409, "conflict", reason: "not_pending")),
            StaffStore.message(for: failure(409, "conflict", reason: "role_not_editable")),
            StaffStore.message(for: failure(403, "forbidden", reason: "admin_required")),
        ]
        XCTAssertEqual(Set(messages).count, messages.count)
    }

    func testMaskedPhoneHidesTheMiddleDigits() {
        XCTAssertEqual(StaffStore.maskedPhone("+84900000007"), "+84 900 ••• 007")
    }

    func testListOrdersActiveThenPendingThenDisabled() throws {
        func make(_ id: String, _ name: String, _ status: String) throws -> StaffMember {
            try JSONDecoder.wire.decode(StaffMember.self, from: Data(#"{"id":"\#(id)","kind":"member","user_id":"u","display_name":"\#(name)","phone":"+84900000007","role":{"id":"r","name":"x","system_key":"teacher"},"class_ids":[],"status":"\#(status)","is_self":false,"version":1}"#.utf8))
        }
        let sorted = StaffStore.sorted([try make("1", "An", "disabled"), try make("2", "Bình", "pending"), try make("3", "Chi", "active")])
        XCTAssertEqual(sorted.map(\.id), ["3", "2", "1"])
    }
}

final class MembershipClassIdsTests: XCTestCase {
    func testStaffMembershipCarriesAssignedClasses() throws {
        let json = #"{"id":"mem_1","status":"active","scope_epoch":2,"workspace":{"id":"w","name":"W"},"role":{"id":"r","name":"Trợ giảng","scope_kind":"assigned_classes","system_key":"assistant"},"permissions":{"classes":"read"},"class_ids":["cls_1"]}"#
        let membership = try JSONDecoder.wire.decode(Membership.self, from: Data(json.utf8))
        XCTAssertEqual(membership.classIds, ["cls_1"])
        let guardian = try JSONDecoder.wire.decode(Membership.self, from: Data(json.replacingOccurrences(of: #","class_ids":["cls_1"]"#, with: "").utf8))
        XCTAssertNil(guardian.classIds)
    }
}

/// A role in use that the server stops listing sends the user to the role screen, or to sign-in when nothing is left.
@MainActor
final class RevokedRoleTests: XCTestCase {
    private func membership(_ id: String, workspace: String) -> Membership {
        Membership(id: id, workspace: Workspace(id: workspace, name: "W \(workspace)"),
                   role: Role(id: "role-\(id)", name: "Trợ giảng", systemKey: "assistant", scopeKind: .assignedClasses),
                   status: "active", scopeEpoch: 1, permissions: ["classes": .read])
    }

    private func identity(active: String?, _ memberships: [Membership]) -> CurrentIdentity {
        CurrentIdentity(user: User(id: "usr", phone: "0900000000", displayName: "Fixture", mustChangePassword: false),
                        activeMembershipId: active, memberships: memberships)
    }

    private func model(_ api: MutableIdentityAPI) throws -> AuthModel {
        AuthModel(configuration: .fallback, apiClient: api, tokenStore: InMemoryTokenStore(token: "fixture-session"),
                  identityStore: StaffIdentityBox(),
                  storeFactory: { scope in try SQLiteStore(path: ":memory:", scope: scope) },
                  isOnline: { true })
    }

    func testDisabledActiveRoleWithAnotherRoleLeftOpensTheRoleScreen() async throws {
        let first = membership("a", workspace: "w1"), second = membership("b", workspace: "w2")
        let api = MutableIdentityAPI(identity(active: "a", [first, second]))
        let model = try model(api)
        await model.restoreSession()
        XCTAssertEqual(model.screen, .main)

        await api.set(identity(active: nil, [second, membership("c", workspace: "w3")]))
        await model.synchronizeWhileActive()

        XCTAssertEqual(model.screen, .chooseRole)
        XCTAssertEqual(model.message, AuthCopy.roleRevoked)
        XCTAssertNil(model.activeMembership)
    }

    func testDisabledActiveRoleWithOneRoleLeftStillAsksBeforeSwitching() async throws {
        let first = membership("a", workspace: "w1"), second = membership("b", workspace: "w2")
        let api = MutableIdentityAPI(identity(active: "a", [first, second]))
        let model = try model(api)
        await model.restoreSession()

        await api.set(identity(active: nil, [second]))
        await model.synchronizeWhileActive()

        XCTAssertEqual(model.screen, .chooseRole)
        XCTAssertEqual(model.message, AuthCopy.roleRevoked)
        XCTAssertNil(model.activeMembership)
    }

    func testRoleDisabledWhileAppWasClosedReturnsToSignIn() async throws {
        let only = membership("a", workspace: "w1")
        let cache = StaffIdentityBox()
        await cache.save(identity(active: "a", [only]))
        let api = MutableIdentityAPI(identity(active: nil, []))
        let model = AuthModel(configuration: .fallback, apiClient: api, tokenStore: InMemoryTokenStore(token: "fixture-session"),
                              identityStore: cache,
                              storeFactory: { scope in try SQLiteStore(path: ":memory:", scope: scope) },
                              isOnline: { true })

        await model.restoreSession()

        XCTAssertEqual(model.screen, .login)
        XCTAssertEqual(model.message, AuthCopy.roleRevoked)
    }

    func testMembershipHidesClassesTakenOffTheStaffMember() {
        var assigned = membership("a", workspace: "w1")
        assigned.classIds = ["c1"]
        XCTAssertTrue(assigned.sees(classId: "c1"))
        XCTAssertFalse(assigned.sees(classId: "c2"))
        XCTAssertTrue(membership("b", workspace: "w1").sees(classId: "c2"))
    }

    func testDisabledOnlyRoleReturnsToSignIn() async throws {
        let only = membership("a", workspace: "w1")
        let api = MutableIdentityAPI(identity(active: "a", [only]))
        let model = try model(api)
        await model.restoreSession()
        XCTAssertEqual(model.screen, .main)

        await api.set(identity(active: nil, []))
        await model.synchronizeWhileActive()

        XCTAssertEqual(model.screen, .login)
        XCTAssertEqual(model.message, AuthCopy.roleRevoked)
    }
}

private extension JSONDecoder {
    static var wire: JSONDecoder { WireJSON.decoder() }
}

actor RecordingAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let handler: @Sendable (APIEndpoint) throws -> Data
    private(set) var requests: [APIEndpoint] = []

    init(handler: @escaping @Sendable (APIEndpoint) throws -> Data) { self.handler = handler }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        requests.append(endpoint)
        let data = try handler(endpoint)
        if data.isEmpty, let empty = EmptyResponse() as? Response { return empty }
        do { return try WireJSON.decoder().decode(type, from: data) }
        catch { throw APIFailure.decoding }
    }
}

private actor MutableIdentityAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private var me: CurrentIdentity
    init(_ me: CurrentIdentity) { self.me = me }
    func set(_ me: CurrentIdentity) { self.me = me }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        guard endpoint.path == "me" else { throw APIFailure.offline }
        return try WireJSON.decoder().decode(type, from: try WireJSON.encoder().encode(me))
    }
}

@MainActor private final class Counter { var value = 0 }

private actor StaffIdentityBox: CachedIdentityStore {
    private var value: CurrentIdentity?
    func load() -> CurrentIdentity? { value }
    func save(_ identity: CurrentIdentity) { value = identity }
    func clear() { value = nil }
}
