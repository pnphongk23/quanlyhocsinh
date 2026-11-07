import Observation
import UIKit
import UserNotifications

enum PushAuthorizationStatus: Equatable, Sendable {
    case notDetermined
    case authorized
    case denied
}

@MainActor
protocol PushPermissionClient {
    func authorizationStatus() async -> PushAuthorizationStatus
    func requestAuthorization() async -> Bool
    func registerForRemoteNotifications()
    func openSystemSettings()
}

@MainActor
struct SystemPushPermissionClient: PushPermissionClient {
    func authorizationStatus() async -> PushAuthorizationStatus {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .notDetermined:
            .notDetermined
        case .authorized, .provisional, .ephemeral:
            .authorized
        case .denied:
            .denied
        @unknown default:
            .denied
        }
    }

    func requestAuthorization() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
            return false
        }
    }

    func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

@MainActor @Observable
final class PushPermission {
    private(set) var status: PushAuthorizationStatus = .notDetermined
    private(set) var isGuardian = false
    private(set) var userID: String?

    @ObservationIgnored private let client: any PushPermissionClient
    @ObservationIgnored private let defaults: UserDefaults

    init(client: any PushPermissionClient = SystemPushPermissionClient(),
         defaults: UserDefaults = .standard) {
        self.client = client
        self.defaults = defaults
    }

    var shouldShowExplainer: Bool {
        guard isGuardian, status == .notDetermined, let userID else { return false }
        return !defaults.bool(forKey: Self.deferredKey(for: userID))
    }

    func updateContext(userID: String?, isGuardian: Bool) async {
        self.userID = userID
        self.isGuardian = isGuardian && userID != nil
        await refreshStatus()
    }

    func refreshStatus() async {
        status = await client.authorizationStatus()
        if isGuardian, status == .authorized {
            client.registerForRemoteNotifications()
        }
    }

    func `defer`() {
        guard isGuardian, let userID else { return }
        defaults.set(true, forKey: Self.deferredKey(for: userID))
    }

    func request() async {
        guard isGuardian, userID != nil, status == .notDetermined else {
            if isGuardian, status == .authorized { client.registerForRemoteNotifications() }
            return
        }
        _ = await client.requestAuthorization()
        await refreshStatus()
    }

    func openSystemSettings() {
        guard isGuardian else { return }
        client.openSystemSettings()
    }

    private static func deferredKey(for userID: String) -> String {
        "push.permission.deferred.\(userID)"
    }
}
