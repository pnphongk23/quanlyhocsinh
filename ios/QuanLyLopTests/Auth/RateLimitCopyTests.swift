import XCTest
@testable import QuanLyLop

@MainActor
final class RateLimitCopyTests: XCTestCase {
    func testLoginRateLimitShowsTheWaitTheServerAskedForInMinutes() async {
        let model = AuthModel(configuration: .fallback, apiClient: RateLimitedAPI(retryAfter: 3480))

        try? await model.login(phone: "0900000000", password: "password-1")

        XCTAssertEqual(model.message, LoginText.rateLimited(seconds: 3480))
        XCTAssertEqual(model.message?.contains("58 phút"), true)
        XCTAssertTrue(model.isLocked)
    }

    func testLoginRateLimitWithoutRetryAfterFallsBackToOneMinute() async {
        let model = AuthModel(configuration: .fallback, apiClient: RateLimitedAPI(retryAfter: nil))

        try? await model.login(phone: "0900000000", password: "password-1")

        XCTAssertEqual(model.message?.contains("1 phút"), true)
    }

    func testShortRetryAfterStaysInSeconds() async {
        let model = AuthModel(configuration: .fallback, apiClient: RateLimitedAPI(retryAfter: 30))

        try? await model.login(phone: "0900000000", password: "password-1")

        XCTAssertEqual(model.message?.contains("30 giây"), true)
    }
}

private actor RateLimitedAPI: APIClient {
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let retryAfter: TimeInterval?
    init(retryAfter: TimeInterval?) { self.retryAfter = retryAfter }

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        throw APIFailure.server(status: 429, error: APIError(code: "rate_limited", message: nil, details: nil, requestId: nil),
                                retryAfter: retryAfter)
    }
}
