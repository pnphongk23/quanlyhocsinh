import XCTest
@testable import QuanLyLop

@MainActor
final class PasswordChangeTests: XCTestCase {
    func testForcedPasswordNavigationWaitsForSavedPhaseAndNeedsNoFollowupMeRequest() async throws {
        let api = PasswordChangeAPI()
        let model = AuthModel(configuration: .fallback, apiClient: api)
        model.applyDemo(memberships: [], activeID: "", screen: .forcedPassword)

        try await model.changePassword(current: "old-password", newPassword: "new-password",
                                       confirmation: "new-password")

        XCTAssertEqual(model.screen, .forcedPassword)
        XCTAssertNil(model.message)
        let paths = await api.paths
        XCTAssertEqual(paths, ["auth/change-password"])

        model.completePasswordChange()
        XCTAssertEqual(model.screen, .main)
    }

    func testSettingsPasswordChangeReturnsToSettingsOnlyAfterCompletion() async throws {
        let model = AuthModel(configuration: .fallback, apiClient: PasswordChangeAPI())
        model.applyDemo(memberships: [], activeID: "", screen: .changePassword)

        try await model.changePassword(current: "old-password", newPassword: "new-password",
                                       confirmation: "new-password")

        XCTAssertEqual(model.screen, .changePassword)
        model.completePasswordChange()
        XCTAssertEqual(model.screen, .settings)
    }
}

private actor PasswordChangeAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private(set) var paths: [String] = []

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        paths.append(endpoint.path)
        guard endpoint.path == "auth/change-password" else { throw APIFailure.offline }
        return try WireJSON.decoder().decode(type, from: Data("{\"must_change_password\":false}".utf8))
    }
}
