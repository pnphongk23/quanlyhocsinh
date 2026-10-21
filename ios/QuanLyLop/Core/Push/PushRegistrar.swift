import Foundation

protocol PushRegistrar: Sendable {
    func register(membershipId: String) async throws
    func clearDeliveredNotifications() async
}

/// Firebase is deliberately deferred; switching identity is acknowledged by the API first.
struct NoOpPushRegistrar: PushRegistrar {
    func register(membershipId: String) async throws {}
    func clearDeliveredNotifications() async {}
}
