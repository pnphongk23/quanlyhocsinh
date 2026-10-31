import XCTest
@testable import QuanLyLop

/// `PUT /device-tokens` wiring (`api-spec.md` mục 7). Firebase is not integrated, so the app's token
/// source is empty today; these tests pin both halves: no token ⇒ no request, token ⇒ one exact request.
final class PushRegistrationTests: XCTestCase {
    private func baseURL() -> URL { URL(string: "https://fixture.invalid/v1")! }

    func testNoTokenMakesNoRequest() async throws {
        // An empty fixture table makes any unexpected request fail loudly.
        let registrar = APIDeviceTokenRegistrar(api: StubAPIClient(baseURL: baseURL()),
                                                tokens: UnavailableDeviceTokenSource())
        let registration = try await registrar.register(membershipId: nil)
        XCTAssertNil(registration)
    }

    func testBlankTokenCountsAsNoToken() async throws {
        let registrar = APIDeviceTokenRegistrar(api: StubAPIClient(baseURL: baseURL()),
                                                tokens: DeviceTokenBox(token: ""))
        let registration = try await registrar.register(membershipId: "mem_1")
        XCTAssertNil(registration)
    }

    func testTokenIsRegisteredWithTheSpecifiedBody() async throws {
        let token = "FIXTURE_FCM_REGISTRATION_TOKEN"
        let endpoint = try APIEndpoint.json(method: .put, path: "device-tokens",
                                            body: DeviceTokenRequest(token: token, platform: "ios"))
        let response = Data(#"""
        {"id":"dev_example","registration_version":2,"bound_at":"2026-10-21T11:30:00.000Z","platform":"ios","updated_at":"2026-10-21T11:30:00.000Z"}
        """#.utf8)
        let api = StubAPIClient(baseURL: baseURL(), fixtures: [endpoint: response])
        let registrar = APIDeviceTokenRegistrar(api: api, tokens: DeviceTokenBox(token: token))

        let registration = try await registrar.register(membershipId: "mem_1")

        XCTAssertEqual(registration, DeviceTokenRegistration(id: "dev_example", registrationVersion: 2,
                                                             boundAt: "2026-10-21T11:30:00.000Z",
                                                             platform: "ios",
                                                             updatedAt: "2026-10-21T11:30:00.000Z"))
    }

    func testBodyCarriesOnlyTokenAndPlatform() throws {
        // user/workspace/membership come from the session on the server, never from the body.
        let wire = try WireJSON.value(DeviceTokenRequest(token: "FIXTURE", platform: "ios"))
        guard case .object(let fields) = wire else { return XCTFail("body must be an object") }
        XCTAssertEqual(Set(fields.keys), ["token", "platform"])
        XCTAssertEqual(fields["platform"], .string("ios"))
    }

    func testFailureLeavesNoRegistration() async throws {
        let endpoint = try APIEndpoint.json(method: .put, path: "device-tokens",
                                            body: DeviceTokenRequest(token: "FIXTURE", platform: "ios"))
        // An empty body is what a broken/plain 204 would look like: never a registration.
        let api = StubAPIClient(baseURL: baseURL(), fixtures: [endpoint: Data()])
        let registrar = APIDeviceTokenRegistrar(api: api, tokens: DeviceTokenBox(token: "FIXTURE"))
        do {
            let registration = try await registrar.register(membershipId: nil)
            XCTFail("expected a failure, got \(String(describing: registration))")
        } catch {}
    }
}
