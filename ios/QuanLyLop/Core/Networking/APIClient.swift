import Foundation

/// Một yêu cầu API ở dạng mô tả, chưa gắn với thư viện mạng nào.
///
/// Tạm đặt ở đây chờ API spec (`plans/20261021-mvp/backend/api-spec.md`).
struct APIEndpoint: Sendable, Hashable {
    enum Method: String, Sendable {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case patch = "PATCH"
        case delete = "DELETE"
    }

    let method: Method
    let path: String
    let query: [String: String]
    let body: Data?

    init(method: Method, path: String, query: [String: String] = [:], body: Data? = nil) {
        self.method = method
        self.path = path
        self.query = query
        self.body = body
    }
}

enum APIFailure: Error, Sendable, Equatable {
    /// Bản nền chưa nối mạng: mọi lời gọi đều dừng ở đây.
    case notImplemented
    case badStatus(code: Int)
    case decoding
    case offline
}

/// Cổng gọi API của app. Chưa có API spec nên chưa cài đặt bản thật.
protocol APIClient: Sendable {
    var baseURL: URL { get }

    func send<Response: Decodable & Sendable>(
        _ endpoint: APIEndpoint,
        as type: Response.Type
    ) async throws -> Response
}

/// Bản giả: không gọi mạng, chỉ giữ URL để màn khởi động hiện đúng môi trường.
///
/// TODO(chờ API spec): thay bằng `URLSessionAPIClient` khi có đặc tả API
/// (đường dẫn, mã lỗi, phân trang, lệnh đồng bộ idempotent).
struct StubAPIClient: APIClient {
    let baseURL: URL

    init(baseURL: URL) {
        self.baseURL = baseURL
    }

    /// Tiện dụng cho màn khởi động; ném lỗi nếu chưa đọc được cấu hình.
    init(configuration: AppConfiguration) {
        self.init(baseURL: configuration.apiBaseURL)
    }

    func send<Response: Decodable & Sendable>(
        _ endpoint: APIEndpoint,
        as type: Response.Type
    ) async throws -> Response {
        throw APIFailure.notImplemented
    }
}
