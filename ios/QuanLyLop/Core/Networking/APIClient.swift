import Foundation

struct APIEndpoint: Sendable, Hashable {
    enum Method: String, Sendable { case get = "GET", post = "POST", put = "PUT", patch = "PATCH", delete = "DELETE" }
    let method: Method
    let path: String
    let query: [String: String]
    let body: Data?
    let requiresAuthentication: Bool
    init(method: Method, path: String, query: [String: String] = [:], body: Data? = nil,
         requiresAuthentication: Bool = true) {
        self.method = method; self.path = path; self.query = query; self.body = body
        self.requiresAuthentication = requiresAuthentication
    }
    static func json<T: Encodable>(method: Method, path: String, body: T,
                                    requiresAuthentication: Bool = true) throws -> Self {
        .init(method: method, path: path, body: try WireJSON.encoder().encode(body),
              requiresAuthentication: requiresAuthentication)
    }
}

struct APIError: Codable, Sendable, Equatable {
    let code: String
    let message: String?
    let details: JSONValue?
    let requestId: String?
    var localizedMessage: String {
        switch code {
        case "unauthorized": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        case "invalid_credentials": "Số điện thoại hoặc mật khẩu không đúng."
        case "password_change_required": "Vui lòng đổi mật khẩu trước khi tiếp tục."
        case "account_disabled": "Tài khoản hoặc vai trò đã bị vô hiệu hóa."
        case "forbidden": "Bạn không có quyền thực hiện thao tác này."
        case "not_found": "Không tìm thấy dữ liệu hoặc bạn không còn quyền truy cập."
        case "account_not_resettable": "Không thể cấp lại mật khẩu cho tài khoản này."
        case "version_conflict", "conflict": "Dữ liệu đã thay đổi. Vui lòng kiểm tra lại."
        case "resync_required", "snapshot_required": "Cần tải lại dữ liệu."
        case "validation_error", "bad_request": "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại."
        case "payload_too_large": "Dữ liệu gửi lên quá lớn."
        case "rate_limited": "Bạn thao tác quá nhanh. Vui lòng thử lại sau."
        default: "Không thể kết nối dịch vụ. Vui lòng thử lại."
        }
    }
}
struct APIErrorEnvelope: Decodable { let error: APIError }
enum APIFailure: Error, Sendable, Equatable {
    case badStatus(code: Int), decoding, offline, invalidURL, missingToken
    case server(status: Int, error: APIError, retryAfter: TimeInterval?)
    var requiresSnapshot: Bool {
        if case .server(_, let error, _) = self { return ["resync_required", "snapshot_required"].contains(error.code) }
        return false
    }
    var retryable: Bool {
        switch self {
        case .offline: true
        case .server(let status, _, _): status == 429 || status >= 500
        case .badStatus(let code): code == 429 || code >= 500
        default: false
        }
    }
}
struct EmptyResponse: Codable, Sendable, Equatable {}
protocol APIClient: Sendable {
    var baseURL: URL { get }
    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response
}

struct URLSessionAPIClient: APIClient {
    let baseURL: URL
    let tokenStore: any TokenStore
    private let session: URLSession
    init(baseURL: URL, tokenStore: any TokenStore, session: URLSession? = nil) {
        self.baseURL = baseURL; self.tokenStore = tokenStore
        if let session { self.session = session }
        else {
            let config = URLSessionConfiguration.ephemeral
            config.urlCache = nil; config.httpCookieStorage = nil
            config.timeoutIntervalForRequest = 30
            self.session = URLSession(configuration: config)
        }
    }
    init(configuration: AppConfiguration, tokenStore: any TokenStore) {
        self.init(baseURL: configuration.apiBaseURL, tokenStore: tokenStore)
    }
    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        guard !endpoint.path.contains("://"), !endpoint.path.contains(".."),
              var parts = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { throw APIFailure.invalidURL }
        parts.path = parts.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        parts.path = "/" + ([parts.path, endpoint.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))]
            .filter { !$0.isEmpty }.joined(separator: "/"))
        parts.queryItems = endpoint.query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }
        guard let url = parts.url, url.scheme == "https" else { throw APIFailure.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.httpBody = endpoint.body
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if endpoint.body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        request.setValue("ios/1.0.0", forHTTPHeaderField: "X-Client")
        request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Request-Id")
        if endpoint.requiresAuthentication {
            guard let token = try await tokenStore.token() else { throw APIFailure.missingToken }
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }
        let data: Data
        let response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch let error as URLError {
            if error.code == .cancelled { throw CancellationError() }
            throw APIFailure.offline
        }
        guard let http = response as? HTTPURLResponse else { throw APIFailure.badStatus(code: 0) }
        guard (200..<300).contains(http.statusCode) else {
            if let envelope = try? WireJSON.decoder().decode(APIErrorEnvelope.self, from: data) {
                throw APIFailure.server(status: http.statusCode, error: envelope.error,
                    retryAfter: http.value(forHTTPHeaderField: "Retry-After").flatMap(Double.init))
            }
            throw APIFailure.badStatus(code: http.statusCode)
        }
        if http.statusCode == 204, let empty = EmptyResponse() as? Response { return empty }
        do { return try WireJSON.decoder().decode(type, from: data) }
        catch { throw APIFailure.decoding }
    }
}

/// Exact method/path/query fixtures; a missing fixture fails instead of silently calling live API.
struct StubAPIClient: APIClient {
    let baseURL: URL
    let fixtures: [APIEndpoint: Data]
    init(baseURL: URL, fixtures: [APIEndpoint: Data] = [:]) { self.baseURL = baseURL; self.fixtures = fixtures }
    init(configuration: AppConfiguration) { self.init(baseURL: configuration.apiBaseURL) }
    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        guard let data = fixtures[endpoint] else { throw APIFailure.badStatus(code: 404) }
        if data.isEmpty, let empty = EmptyResponse() as? Response { return empty }
        do { return try WireJSON.decoder().decode(type, from: data) }
        catch { throw APIFailure.decoding }
    }
}
