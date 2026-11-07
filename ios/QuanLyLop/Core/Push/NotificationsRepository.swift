import Foundation

struct NotificationInboxItem: Codable, Sendable, Equatable {
    let id: Int
    let kind: String
    let studentId: String
    let sessionId: String?
    let reportId: String?
    let testId: String?
    let createdAt: String
    let readAt: String?
}

struct NotificationInboxPage: Codable, Sendable, Equatable {
    let items: [NotificationInboxItem]
    let nextCursor: String?
}

struct NotificationReadResult: Decodable, Sendable, Equatable {
    let updated: Int
}

struct NotificationsRepository: Sendable {
    private let api: any APIClient

    init(api: any APIClient) { self.api = api }

    func list(limit: Int = 50, cursor: String? = nil) async throws -> NotificationInboxPage {
        var query = ["limit": String(limit)]
        if let cursor { query["cursor"] = cursor }
        return try await api.send(.init(method: .get, path: "notifications", query: query),
                                  as: NotificationInboxPage.self)
    }

    @discardableResult
    func markRead(upToID: Int) async throws -> NotificationReadResult {
        struct Request: Encodable { let upToID: Int }
        let endpoint = try APIEndpoint.json(method: .post, path: "notifications/read",
                                            body: Request(upToID: upToID))
        return try await api.send(endpoint, as: NotificationReadResult.self)
    }
}
