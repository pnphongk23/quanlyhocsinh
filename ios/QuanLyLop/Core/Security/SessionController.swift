import Foundation

enum SessionFailure: Error { case pendingCommands(Int) }
struct MembershipSelection: Codable, Sendable {
    let activeMembershipId: String
    let deviceRegistrationCleared: Bool
}
/// The caller disables editing while changing identity and activates new UI/cache only after this returns.
actor SessionController {
    private let api: any APIClient
    private let tokenStore: any TokenStore
    private let store: any LocalStore
    private let push: any PushRegistrar
    private let status: SyncStatusCenter
    init(api: any APIClient, tokenStore: any TokenStore, store: any LocalStore,
         push: any PushRegistrar = NoOpPushRegistrar(), status: SyncStatusCenter = .shared) {
        self.api = api; self.tokenStore = tokenStore; self.store = store; self.push = push
        self.status = status
    }
    func logout() async throws {
        let count = try await store.pendingCommandCount()
        guard count == 0 else { throw SessionFailure.pendingCommands(count) }
        _ = try await api.send(.init(method: .post, path: "auth/logout"), as: EmptyResponse.self)
        try await store.resetCacheForUser()
        try await tokenStore.clear()
        await push.clearDeliveredNotifications()
        // The previous account's save failures must not leak into the next identity.
        status.reset()
    }
    func selectMembership(_ id: String) async throws -> MembershipSelection {
        struct Selection: Encodable { let membershipId: String }
        let result = try await api.send(try .json(method: .put, path: "session/membership", body: Selection(membershipId: id)), as: MembershipSelection.self)
        await push.clearDeliveredNotifications()
        status.reset()
        // Registration failure only loses push, not the acknowledged identity change.
        _ = try? await push.register(membershipId: result.activeMembershipId)
        return result
    }
}
