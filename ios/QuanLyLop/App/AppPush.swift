import Foundation
import Observation
import OSLog

/// App-level push wiring. Firebase supplies tokens and notification routes through this boundary;
/// authorization and registration remain parent-only.
@MainActor @Observable
final class AppPush {
    let permission: PushPermission
    let pendingNotificationRoute: PendingNotificationRoute

    @ObservationIgnored private let registrar: any PushRegistrar
    @ObservationIgnored private let tokenSource: any DeviceTokenSource
    @ObservationIgnored private let tokenStore: FirebaseTokenStore?
    @ObservationIgnored private let tokenStoreService: any TokenStore
    @ObservationIgnored private let logger = Logger(subsystem: "\(AppConfiguration.identifierPrefix).push", category: "registration")

    private(set) var currentUserID: String?
    private(set) var isGuardian = false
    private var identityResolved = false

    init(configuration: AppConfiguration, apiClient: (any APIClient)? = nil,
         tokenSource injectedTokenSource: (any DeviceTokenSource)? = nil,
         tokenStore: FirebaseTokenStore? = nil,
         permission: PushPermission? = nil,
         pendingNotificationRoute: PendingNotificationRoute? = nil) {
        let store = KeychainTokenStore(service: configuration.tokenStoreService)
        tokenStoreService = store
        let firebaseTokenStore = tokenStore ?? FirebaseTokenStore()
        self.tokenStore = tokenStore ?? (injectedTokenSource == nil ? firebaseTokenStore : nil)
        let source = injectedTokenSource ?? Self.tokenSource(firebase: firebaseTokenStore)
        tokenSource = source
        let api = apiClient ?? URLSessionAPIClient(baseURL: configuration.apiBaseURL, tokenStore: store)
        registrar = APIDeviceTokenRegistrar(api: api, tokens: source)
        self.permission = permission ?? PushPermission()
        self.pendingNotificationRoute = pendingNotificationRoute ?? PendingNotificationRoute()
    }

    /// DEBUG-only handover (`SIMCTL_CHILD_QLH_PUSH_TOKEN`) remains available for local API checks.
    static func tokenSource(firebase: FirebaseTokenStore) -> any DeviceTokenSource {
#if DEBUG
        if let token = ProcessInfo.processInfo.environment["QLH_PUSH_TOKEN"], !token.isEmpty {
            return DeviceTokenBox(token: token)
        }
#endif
        return firebase
    }

    /// AuthFlowView calls this after restore/login/logout or a membership change has completed.
    @discardableResult
    func identityDidChange(userID: String?, isGuardian: Bool) async -> DeviceTokenRegistration? {
        currentUserID = userID
        self.isGuardian = userID != nil && isGuardian
        identityResolved = userID != nil
        if identityResolved && !self.isGuardian {
            pendingNotificationRoute.discard()
        }
        await permission.updateContext(userID: userID, isGuardian: self.isGuardian)
        return await registerIfSignedIn()
    }

    /// Refreshes system permission when the app returns to the foreground. Authorized parents register APNs
    /// each time, while an available FCM token is also re-registered with the API.
    @discardableResult
    func appBecameActive() async -> DeviceTokenRegistration? {
        await permission.refreshStatus()
        return await registerIfSignedIn()
    }

    @discardableResult
    func registerIfSignedIn() async -> DeviceTokenRegistration? {
        guard identityResolved, currentUserID != nil, isGuardian,
              permission.status == .authorized,
              let current = try? await tokenStoreService.token(), !current.isEmpty else { return nil }
        do {
            guard let registration = try await registrar.register(membershipId: nil) else { return nil }
            // IDs only: the FCM token never reaches a log.
            logger.info("device token registered id=\(registration.id, privacy: .public) version=\(registration.registrationVersion, privacy: .public)")
            return registration
        } catch {
            // Losing push never blocks the app; the next foreground tries again.
            logger.error("device token registration failed")
            return nil
        }
    }

    @discardableResult
    func tokenDidRefresh(_ token: String?) async -> DeviceTokenRegistration? {
        guard let tokenStore else { return await registerIfSignedIn() }
        await tokenStore.setToken(token)
        return await registerIfSignedIn()
    }

    func receiveNotification(userInfo: [AnyHashable: Any]) {
        receiveNotification(route: NotificationRoute(payload: userInfo))
    }

    func receiveNotification(route: NotificationRoute?) {
        guard !identityResolved || isGuardian else { return }
        pendingNotificationRoute.receive(route: route, isGuardian: true)
    }
}
