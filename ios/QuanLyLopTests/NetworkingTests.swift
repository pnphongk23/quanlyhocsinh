import XCTest
import Security
@testable import QuanLyLop

private final class FixtureTransport: @unchecked Sendable {
    struct Reply: Sendable { let status: Int; let data: Data; let headers: [String: String] }
    private let lock = NSLock()
    private var replies: [String: Reply] = [:]
    private var requests: [String: URLRequest] = [:]
    func add(_ url: String, status: Int, json: String = "", headers: [String: String] = [:]) {
        lock.lock(); defer { lock.unlock() }
        replies[url] = Reply(status: status, data: Data(json.utf8), headers: headers)
    }
    func handle(_ request: URLRequest) -> Reply? {
        lock.lock(); defer { lock.unlock() }
        let key = request.url!.absoluteString
        requests[key] = request
        return replies[key]
    }
    func request(_ url: String) -> URLRequest? {
        lock.lock(); defer { lock.unlock() }
        return requests[url]
    }
}
private final class FixtureURLProtocol: URLProtocol, @unchecked Sendable {
    static let transport = FixtureTransport()
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard let reply = Self.transport.handle(observable(request)) else {
            client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)); return
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: reply.status, httpVersion: nil, headerFields: reply.headers)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: reply.data)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
    /// URLSession hands the body over as a stream, so `httpBody` is nil inside URLProtocol.
    private func observable(_ request: URLRequest) -> URLRequest {
        guard request.httpBody == nil, let stream = request.httpBodyStream else { return request }
        stream.open(); defer { stream.close() }
        var data = Data()
        let bufferSize = 4096
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }
        while stream.hasBytesAvailable {
            let read = stream.read(buffer, maxLength: bufferSize)
            guard read > 0 else { break }
            data.append(buffer, count: read)
        }
        var copy = request
        copy.httpBody = data.isEmpty ? nil : data
        return copy
    }
}
@MainActor
final class NetworkingTests: XCTestCase {
    func api() -> URLSessionAPIClient {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [FixtureURLProtocol.self]
        return URLSessionAPIClient(baseURL: URL(string: "https://fixture.invalid/v1")!,
            tokenStore: InMemoryTokenStore(token: "FIXTURE_NOT_A_REAL_TOKEN"), session: URLSession(configuration: config))
    }
    func testBearerVersionedPathAndSnakeCaseBody() async throws {
        FixtureURLProtocol.transport.add("https://fixture.invalid/v1/classes/fixture?status=active", status: 200,
            json: #"{"id":"fixture","name":"Lớp mẫu","status":"active","version":1}"#)
        struct Patch: Encodable { let baseVersion: Int; let name: String }
        let endpoint = APIEndpoint(method: .patch, path: "/classes/fixture", query: ["status": "active"],
            body: try WireJSON.encoder().encode(Patch(baseVersion: 3, name: "Lớp mẫu")))
        let classroom = try await api().send(endpoint, as: Classroom.self)
        XCTAssertEqual(classroom.name, "Lớp mẫu")
        let request = try XCTUnwrap(FixtureURLProtocol.transport.request("https://fixture.invalid/v1/classes/fixture?status=active"))
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer FIXTURE_NOT_A_REAL_TOKEN")
        XCTAssertEqual(request.httpMethod, "PATCH")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        let body = try JSONDecoder().decode(JSONValue.self, from: XCTUnwrap(request.httpBody))
        XCTAssertEqual(body["base_version"], .number(3))
    }
    func testErrorMappingRetryAfterAndSafeUserMessage() async throws {
        FixtureURLProtocol.transport.add("https://fixture.invalid/v1/limited", status: 429,
            json: #"{"error":{"code":"rate_limited","message":"Developer detail","request_id":"fixture-request"}}"#,
            headers: ["Retry-After": "23"])
        do {
            _ = try await api().send(APIEndpoint(method: .get, path: "limited"), as: EmptyResponse.self)
            XCTFail("must throw")
        } catch APIFailure.server(let status, let error, let delay) {
            XCTAssertEqual(status, 429); XCTAssertEqual(delay, 23)
            XCTAssertEqual(error.requestId, "fixture-request")
            XCTAssertFalse(error.localizedMessage.contains("Developer detail"))
        }
    }
    func testPublicRequest204AndOffline() async throws {
        FixtureURLProtocol.transport.add("https://fixture.invalid/v1/logout-fixture", status: 204)
        _ = try await api().send(APIEndpoint(method: .post, path: "logout-fixture", requiresAuthentication: false), as: EmptyResponse.self)
        let request = try XCTUnwrap(FixtureURLProtocol.transport.request("https://fixture.invalid/v1/logout-fixture"))
        XCTAssertEqual(request.url?.absoluteString, "https://fixture.invalid/v1/logout-fixture")
        XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
        do {
            _ = try await api().send(APIEndpoint(method: .get, path: "offline-fixture"), as: EmptyResponse.self)
            XCTFail("must throw")
        } catch { XCTAssertEqual(error as? APIFailure, .offline) }
    }
    func testKeychainRoundTripUpdateAndScopedDelete() async throws {
        let service = "vn.quanlylop.test." + UUID().uuidString
        let first = KeychainTokenStore(service: service, account: "first")
        let second = KeychainTokenStore(service: service, account: "second")
        do { try await first.setToken("FIXTURE_ONE") }
        catch let failure as KeychainFailure where failure.status == errSecMissingEntitlement {
            // The app carries the keychain entitlement in CODE_SIGN_ENTITLEMENTS, but a build with
            // CODE_SIGNING_ALLOWED=NO is not signed, so the simulator strips it (-34018).
            throw XCTSkip("Keychain needs a signed host app; rerun without CODE_SIGNING_ALLOWED=NO.")
        }
        try await second.setToken("FIXTURE_OTHER")
        try await first.setToken("FIXTURE_UPDATED")
        let updated = try await first.token(); XCTAssertEqual(updated, "FIXTURE_UPDATED")
        try await first.clear()
        let cleared = try await first.token(), other = try await second.token()
        XCTAssertNil(cleared); XCTAssertEqual(other, "FIXTURE_OTHER")
        try await second.clear()
    }
}
