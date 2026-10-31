import Foundation
import UserNotifications

/// Push token lifecycle.
///
/// Firebase Messaging is deliberately deferred: `ios/` has no `GoogleService-Info.plist`, so the app
/// has no FCM registration token and never calls the network. The plumbing is real — an FCM token,
/// when it exists, is sent with `PUT /device-tokens` (`api-spec.md` mục 7) — see
/// `ios/docs/report-i6.md` for how to switch it on.
protocol PushRegistrar: Sendable {
    /// `membershipId` records the identity the client believes is active; the API derives
    /// user/membership/session from the bearer token, never from the body, and answers `404` when the
    /// membership is not the session's. Returns `nil` when there is no token to register.
    @discardableResult func register(membershipId: String?) async throws -> DeviceTokenRegistration?
    func clearDeliveredNotifications() async
}

/// Used by tests and by the app while Firebase is absent: no token, no request.
struct NoOpPushRegistrar: PushRegistrar {
    func register(membershipId: String?) async throws -> DeviceTokenRegistration? { nil }
    func clearDeliveredNotifications() async {}
}

/// `PUT /device-tokens` body (`api-spec.md` mục 7): the token plus `ios|web`; the server ignores any
/// user/workspace fields, so none are sent.
struct DeviceTokenRequest: Encodable, Sendable {
    let token: String
    let platform: String
}

/// `PUT /device-tokens` response: management IDs only, never the token back.
struct DeviceTokenRegistration: Codable, Sendable, Equatable {
    let id: String
    let registrationVersion: Int
    let boundAt: String
    let platform: String
    let updatedAt: String
}

/// Where an FCM registration token comes from. After Firebase is added, this is `Messaging.token()`.
protocol DeviceTokenSource: Sendable {
    func currentToken() async -> String?
}

/// Honest "there is no push token yet": Firebase is deferred, so registration is a no-op.
struct UnavailableDeviceTokenSource: DeviceTokenSource {
    func currentToken() async -> String? { nil }
}

/// Token handed over at runtime (FCM callback, or a debug-only handover for a staging check).
final class DeviceTokenBox: DeviceTokenSource, @unchecked Sendable {
    private let lock = NSLock()
    private var token: String?

    init(token: String? = nil) { self.token = token }
    func set(_ value: String?) { lock.withLock { token = value } }
    func currentToken() async -> String? { lock.withLock { token } }
}

struct APIDeviceTokenRegistrar: PushRegistrar {
    let api: any APIClient
    let tokens: any DeviceTokenSource
    var platform = "ios"

    func register(membershipId: String?) async throws -> DeviceTokenRegistration? {
        guard let token = await tokens.currentToken(), !token.isEmpty else { return nil }
        let endpoint = try APIEndpoint.json(method: .put, path: "device-tokens",
                                           body: DeviceTokenRequest(token: token, platform: platform))
        return try await api.send(endpoint, as: DeviceTokenRegistration.self)
    }

    /// The prototype/spec rule is unchanged: old notifications disappear when identity changes.
    func clearDeliveredNotifications() async {
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }
}
