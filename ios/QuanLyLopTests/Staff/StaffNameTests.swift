import XCTest
@testable import QuanLyLop

/// Only an Admin names staff (api-spec mục 11): the PATCH, its 422 text, and how the new name reaches the signed-in screens.
@MainActor
final class StaffNameTests: XCTestCase {
    nonisolated private static func member(name: String, isSelf: Bool) -> String {
        """
        {"id":"mem_1","kind":"member","user_id":"usr_1","display_name":"\(name)","phone":"+84900000001",
         "role":{"id":"role_admin","name":"Admin","system_key":"admin"},"class_ids":[],
         "status":"active","is_self":\(isSelf),"version":4}
        """
    }

    private func loaded(isSelf: Bool, didChangeSelf: @escaping @MainActor () async -> Void = {}) async throws -> (StaffStore, RecordingAPI) {
        let api = RecordingAPI { endpoint in
            switch (endpoint.method, endpoint.path) {
            case (.patch, "staff/mem_1"): return Data(Self.member(name: "Cô Hà", isSelf: isSelf).utf8)
            case (_, "staff"): return Data(#"{"items":[\#(Self.member(name: "Cô Lan", isSelf: isSelf))]}"#.utf8)
            default: return Data(#"{"items":[]}"#.utf8)
            }
        }
        let store = StaffStore(api: api, didChangeSelf: didChangeSelf)
        await store.load()
        return (store, api)
    }

    func testRenamingAnAccountSendsOnlyTheNameAndTheVersion() async throws {
        let (store, api) = try await loaded(isSelf: false)

        _ = try await store.update(store.members[0], displayName: "Cô Hà")

        let requests = await api.requests
        let request = try XCTUnwrap(requests.last)
        let body = try JSONSerialization.jsonObject(with: try XCTUnwrap(request.body)) as? NSDictionary
        XCTAssertEqual(body, ["display_name": "Cô Hà", "base_version": 4])
        XCTAssertEqual(store.members[0].displayName, "Cô Hà")
    }

    func testAdminRenamingThemselvesRereadsTheirIdentity() async throws {
        var rereads = 0
        let (store, _) = try await loaded(isSelf: true) { rereads += 1 }

        _ = try await store.update(store.members[0], displayName: "Cô Hà")

        XCTAssertEqual(rereads, 1)
    }

    func testRenamingSomeoneElseDoesNotRereadIdentity() async throws {
        var rereads = 0
        let (store, _) = try await loaded(isSelf: false) { rereads += 1 }

        _ = try await store.update(store.members[0], displayName: "Cô Hà")

        XCTAssertEqual(rereads, 0)
    }

    func testNameFieldErrorsComeFromTheServerFields() {
        func failure(_ field: String) -> APIFailure {
            .server(status: 422, error: APIError(code: "validation_failed", message: nil,
                                                 details: .object(["fields": .object(["display_name": .string(field)])]),
                                                 requestId: nil), retryAfter: nil)
        }
        let required = StaffStore.nameError(for: failure("required"))
        let tooLong = StaffStore.nameError(for: failure("must_be_at_most_100"))
        XCTAssertNotNil(required)
        XCTAssertNotNil(tooLong)
        XCTAssertNotEqual(required, tooLong)
        XCTAssertNil(StaffStore.nameError(for: failure("other")))
        XCTAssertNil(StaffStore.nameError(for: APIFailure.offline))
    }

    func testMembershipNameIsNullableAndMayBeMissing() throws {
        func membership(_ extra: String) throws -> Membership {
            let json = #"{"id":"m","workspace":{"id":"w","name":"W"},"role":{"id":"r","name":"Admin","system_key":"admin","scope_kind":"workspace"}\#(extra)}"#
            return try WireJSON.decoder().decode(Membership.self, from: Data(json.utf8))
        }
        XCTAssertNil(try membership("").displayName)
        XCTAssertNil(try membership(#","display_name":null"#).displayName)
        XCTAssertEqual(try membership(#","display_name":"Cô Hà""#).displayName, "Cô Hà")
    }

    func testWorkspaceNameBeatsTheAccountNameAndBlankFallsThrough() throws {
        func membership(_ name: String?) -> Membership {
            Membership(id: "m", workspace: Workspace(id: "w", name: "W"),
                       role: Role(id: "r", name: "Admin", systemKey: "admin", scopeKind: .workspace),
                       status: nil, scopeEpoch: nil, permissions: nil, displayName: name)
        }
        let user = User(id: "u", phone: "900000001", displayName: "Tài khoản", mustChangePassword: false)
        XCTAssertEqual(ProfileName.resolve(user: user, membership: membership("Cô Hà")), "Cô Hà")
        XCTAssertEqual(ProfileName.resolve(user: user, membership: membership("  ")), "Tài khoản")
        XCTAssertNil(ProfileName.resolve(user: User(id: "u", phone: "9", displayName: nil, mustChangePassword: false),
                                         membership: membership(nil)))
    }
}

extension StaffNameTests {
    func testOnlyAnAdminsOwnRowIsNameOnly() throws {
        func member(key: String, isSelf: Bool) throws -> StaffMember {
            let json = #"{"id":"m","kind":"member","user_id":"u","display_name":"A","phone":"+84900000001","role":{"id":"r","name":"R","system_key":"\#(key)"},"class_ids":[],"status":"active","is_self":\#(isSelf),"version":1}"#
            return try WireJSON.decoder().decode(StaffMember.self, from: Data(json.utf8))
        }
        XCTAssertTrue(try member(key: "admin", isSelf: true).editsNameOnly)
        XCTAssertFalse(try member(key: "admin", isSelf: false).editsNameOnly)
        XCTAssertFalse(try member(key: "teacher", isSelf: false).editsNameOnly)
    }
}
