import XCTest
@testable import QuanLyLop

final class NotificationSessionOrderingTests: XCTestCase {
    func testLogoutServerFailureKeepsSessionTokenAndDeliveredNotifications() async throws {
        let events = SessionEventLog()
        let tokenStore = OrderedTokenStore(token: "FIXTURE_SESSION_TOKEN", events: events)
        let controller = SessionController(api: OrderedSessionAPI(events: events, fails: true),
                                           tokenStore: tokenStore, store: try store(),
                                           push: OrderedPushRegistrar(events: events))

        do {
            try await controller.logout()
            XCTFail("logout should fail when the server does not acknowledge it")
        } catch {}

        let token = await tokenStore.token()
        let recorded = await events.values()
        XCTAssertEqual(token, "FIXTURE_SESSION_TOKEN")
        XCTAssertEqual(recorded, ["api.failure"])
    }

    func testLogoutClearsTokenAndDeliveredNotificationsOnlyAfterServerSuccess() async throws {
        let events = SessionEventLog()
        let tokenStore = OrderedTokenStore(token: "FIXTURE_SESSION_TOKEN", events: events)
        let controller = SessionController(api: OrderedSessionAPI(events: events, fails: false),
                                           tokenStore: tokenStore, store: try store(),
                                           push: OrderedPushRegistrar(events: events))

        try await controller.logout()

        let token = await tokenStore.token()
        let recorded = await events.values()
        XCTAssertNil(token)
        XCTAssertEqual(recorded, ["api.success.auth/logout", "token.clear", "push.clear"])
    }

    func testMembershipFailureDoesNotClearNotificationsOrReregisterPush() async throws {
        let events = SessionEventLog()
        let tokenStore = OrderedTokenStore(token: "FIXTURE_SESSION_TOKEN", events: events)
        let controller = SessionController(api: OrderedSessionAPI(events: events, fails: true),
                                           tokenStore: tokenStore, store: try store(),
                                           push: OrderedPushRegistrar(events: events))

        do {
            _ = try await controller.selectMembership("member_new")
            XCTFail("membership selection should fail without server acknowledgement")
        } catch {}

        let token = await tokenStore.token()
        let recorded = await events.values()
        XCTAssertEqual(token, "FIXTURE_SESSION_TOKEN")
        XCTAssertEqual(recorded, ["api.failure"])
    }

    func testMembershipReregistersOnlyAfterServerSuccessAndLocalClear() async throws {
        let events = SessionEventLog()
        let controller = SessionController(api: OrderedSessionAPI(events: events, fails: false),
                                           tokenStore: OrderedTokenStore(token: "FIXTURE_SESSION_TOKEN", events: events),
                                           store: try store(), push: OrderedPushRegistrar(events: events))

        let selection = try await controller.selectMembership("member_new")
        await events.waitFor("push.register.member_new")

        let recorded = await events.values()
        XCTAssertEqual(selection.activeMembershipId, "member_new")
        XCTAssertEqual(recorded, ["api.success.session/membership", "push.clear", "push.register.member_new"])
    }

    private func store() throws -> SQLiteStore {
        try SQLiteStore(path: ":memory:", scope: CacheScope(userId: "fixture-user", workspaceId: "fixture-ws", membershipId: "fixture-member"))
    }
}

private actor SessionEventLog {
    private var events: [String] = []
    private var waiters: [String: [CheckedContinuation<Void, Never>]] = [:]

    func record(_ event: String) {
        events.append(event)
        for waiter in waiters.removeValue(forKey: event) ?? [] { waiter.resume() }
    }

    func values() -> [String] { events }

    func waitFor(_ event: String) async {
        guard !events.contains(event) else { return }
        await withCheckedContinuation { continuation in
            waiters[event, default: []].append(continuation)
        }
    }
}

private actor OrderedTokenStore: TokenStore {
    private var value: String?
    private let events: SessionEventLog

    init(token: String?, events: SessionEventLog) { value = token; self.events = events }
    func token() -> String? { value }
    func setToken(_ token: String) { value = token }
    func clear() async throws {
        await events.record("token.clear")
        value = nil
    }
}

private struct OrderedSessionAPI: APIClient {
    let baseURL = URL(string: "https://fixture.invalid/v1")!
    let events: SessionEventLog
    let fails: Bool

    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response {
        if fails {
            await events.record("api.failure")
            throw APIFailure.offline
        }
        await events.record("api.success.\(endpoint.path)")
        let data = endpoint.path == "session/membership"
            ? Data(#"{"active_membership_id":"member_new","device_registration_cleared":true}"#.utf8)
            : Data("{}".utf8)
        return try WireJSON.decoder().decode(type, from: data)
    }
}

private actor OrderedPushRegistrar: PushRegistrar {
    private let events: SessionEventLog
    init(events: SessionEventLog) { self.events = events }

    func register(membershipId: String?) async throws -> DeviceTokenRegistration? {
        await events.record("push.register.\(membershipId ?? "nil")")
        return nil
    }

    func clearDeliveredNotifications() async { await events.record("push.clear") }
}
