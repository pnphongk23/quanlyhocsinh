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
        XCTAssertEqual(recorded, ["api.POST.auth/logout.<none>.failure"])
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
        XCTAssertEqual(recorded, ["api.POST.auth/logout.<none>.success", "token.clear", "push.clear"])
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
        XCTAssertEqual(recorded, ["api.PUT.session/membership.{\"membership_id\":\"member_new\"}.failure"])
    }

    func testMembershipReregistersOnlyAfterServerSuccessAndLocalClear() async throws {
        let events = SessionEventLog()
        let controller = SessionController(api: OrderedSessionAPI(events: events, fails: false),
                                           tokenStore: OrderedTokenStore(token: "FIXTURE_SESSION_TOKEN", events: events),
                                           store: try store(), push: OrderedPushRegistrar(events: events))

        let selection = try await controller.selectMembership("member_new")
        let registrationArrived = await events.waitFor("push.register.member_new", timeout: .seconds(2))
        XCTAssertTrue(registrationArrived)

        let recorded = await events.values()
        XCTAssertEqual(selection.activeMembershipId, "member_new")
        XCTAssertEqual(recorded, ["api.PUT.session/membership.{\"membership_id\":\"member_new\"}.success", "push.clear", "push.register.member_new"])
    }

    private func store() throws -> SQLiteStore {
        try SQLiteStore(path: ":memory:", scope: CacheScope(userId: "fixture-user", workspaceId: "fixture-ws", membershipId: "fixture-member"))
    }
}

private actor SessionEventLog {
    private var events: [String] = []
    private var waiters: [String: [(UUID, CheckedContinuation<Bool, Never>)]] = [:]

    func record(_ event: String) {
        events.append(event)
        for (_, waiter) in waiters.removeValue(forKey: event) ?? [] { waiter.resume(returning: true) }
    }

    func values() -> [String] { events }

    func waitFor(_ event: String, timeout: Duration) async -> Bool {
        guard !events.contains(event) else { return true }
        let id = UUID()
        return await withCheckedContinuation { continuation in
            waiters[event, default: []].append((id, continuation))
            Task {
                try? await Task.sleep(for: timeout)
                self.expire(event, id: id)
            }
        }
    }

    private func expire(_ event: String, id: UUID) {
        guard let index = waiters[event]?.firstIndex(where: { $0.0 == id }) else { return }
        let (_, continuation) = waiters[event]!.remove(at: index)
        if waiters[event]?.isEmpty == true { waiters[event] = nil }
        continuation.resume(returning: false)
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
        let body: String
        if let data = endpoint.body, let object = try JSONSerialization.jsonObject(with: data) as? [String: String],
           let membershipId = object["membership_id"] {
            body = "{\"membership_id\":\"\(membershipId)\"}"
        } else {
            body = "<none>"
        }
        let descriptor = "api.\(endpoint.method.rawValue).\(endpoint.path).\(body)"
        let matchesExpectedRequest = (endpoint.path == "auth/logout" && endpoint.method == .post && endpoint.body == nil)
            || (endpoint.path == "session/membership" && endpoint.method == .put && body == "{\"membership_id\":\"member_new\"}")
        guard matchesExpectedRequest else {
            await events.record("\(descriptor).invalid")
            throw APIFailure.decoding
        }
        if fails {
            await events.record("\(descriptor).failure")
            throw APIFailure.offline
        }
        await events.record("\(descriptor).success")
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
