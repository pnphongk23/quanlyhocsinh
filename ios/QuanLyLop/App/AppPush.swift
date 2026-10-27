import Foundation
import OSLog

/// Push wiring for the app frame.
///
/// Firebase Messaging is not integrated yet (`ios/` has no `GoogleService-Info.plist`), so there is
/// no FCM registration token and this is a no-op: `registerIfSignedIn` never reaches the network.
/// The API call itself is implemented (`APIDeviceTokenRegistrar`, `PUT /device-tokens`) and is used
/// as soon as a token exists — see `ios/docs/report-i6.md` for the switch-on steps.
@MainActor
final class AppPush {
    private let registrar: APIDeviceTokenRegistrar
    private let tokenStore: any TokenStore
    private let logger = Logger(subsystem: "\(AppConfiguration.identifierPrefix).push", category: "registration")

    init(configuration: AppConfiguration) {
        let tokenStore = KeychainTokenStore(service: configuration.tokenStoreService)
        self.tokenStore = tokenStore
        let api = URLSessionAPIClient(baseURL: configuration.apiBaseURL, tokenStore: tokenStore)
        registrar = APIDeviceTokenRegistrar(api: api, tokens: Self.tokenSource())
    }

    /// Debug-only handover (`SIMCTL_CHILD_QLH_PUSH_TOKEN`) so a staging run can prove the API call
    /// without shipping a token source. Release builds always get `UnavailableDeviceTokenSource`.
    static func tokenSource() -> any DeviceTokenSource {
        #if DEBUG
        if let token = ProcessInfo.processInfo.environment["QLH_PUSH_TOKEN"], !token.isEmpty {
            return DeviceTokenBox(token: token)
        }
        #endif
        return UnavailableDeviceTokenSource()
    }

    /// Called on launch and every time the app becomes active (open app/token change ⇒ re-register,
    /// `offline-plan.md` mục "Push và offline"). No session, no request.
    func registerIfSignedIn() async {
        guard let current = try? await tokenStore.token(), !current.isEmpty else { return }
        do {
            if let registration = try await registrar.register(membershipId: nil) {
                // IDs only: the token never reaches a log.
                logger.info("device token registered id=\(registration.id, privacy: .public) version=\(registration.registrationVersion, privacy: .public)")
            }
        } catch {
            // Losing push never blocks the app; the next foreground tries again.
            logger.error("device token registration failed")
        }
    }
}
