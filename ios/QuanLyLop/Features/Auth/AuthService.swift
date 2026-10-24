import Foundation
import Observation

struct AuthCredentials: Encodable, Sendable {
    let phone: String
    let password: String
    let deviceLabel: String?
}

struct RegistrationRequest: Encodable, Sendable {
    let phone: String
    let password: String
    let displayName: String
    let workspaceName: String
}

struct GuardianRegistrationRequest: Encodable, Sendable {
    let phone: String
    let password: String
    let displayName: String
}

struct PasswordChangeRequest: Encodable, Sendable {
    let currentPassword: String
    let newPassword: String
}

struct PasswordChangeResponse: Decodable, Sendable {
    let mustChangePassword: Bool
}

enum AuthValidationError: Error, Equatable {
    case missingField
    case passwordLength
    case passwordMismatch
    case samePassword
}

enum AuthValidation {
    static func validateRegistration(name: String, workspace: String, phone: String,
                                     password: String, confirmation: String) throws {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !workspace.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !phone.isEmpty, !password.isEmpty, !confirmation.isEmpty else {
            throw AuthValidationError.missingField
        }
        try validatePassword(password, confirmation: confirmation, phone: phone)
    }

    static func validateGuardianRegistration(name: String, phone: String,
                                             password: String, confirmation: String) throws {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !phone.isEmpty,
              !password.isEmpty, !confirmation.isEmpty else { throw AuthValidationError.missingField }
        try validatePassword(password, confirmation: confirmation, phone: phone)
    }

    static func validatePassword(_ password: String, confirmation: String, phone: String,
                                 currentPassword: String? = nil) throws {
        guard (8...128).contains(password.count) else { throw AuthValidationError.passwordLength }
        guard password == confirmation else { throw AuthValidationError.passwordMismatch }
        if let currentPassword, password == currentPassword { throw AuthValidationError.samePassword }
        _ = phone // The server owns the phone/password policy; the client only prevents exact reuse.
    }
}

extension AppConfiguration {
    /// Placeholder configuration for screens that never touch the network
    /// (invalid configuration screen and the debug screenshot harness).
    static let fallback = AppConfiguration(environment: .staging,
                                          apiBaseURL: URL(string: "https://staging.invalid")!,
                                          bundleIdentifier: "vn.quanlylop.app",
                                          appVersion: "0", buildNumber: "0")
}

@MainActor
@Observable
final class AuthModel {
      enum Screen: Equatable { case loading, login, register, guardianRegister, forgot, forcedPassword, chooseRole, main, settings, changePassword }

    private(set) var screen: Screen = .loading
    private(set) var session: AuthSession?
    private(set) var identity: CurrentIdentity?
    private(set) var isLocked = false
    private(set) var logoutBlock: LogoutBlock?
    private(set) var message: String?
    private(set) var recoveryPhone = ""
    private(set) var recoveryIsTeacher = false
#if DEBUG
    /// Screenshot harness only: makes `logout()` report pending commands.
    var demoPendingCommands: Int?
#endif

    private let tokenStore: any TokenStore
    private let api: any APIClient
    private var activeStore: (any LocalStore)?
    private(set) var activeSync: SyncCoordinator?
    private var returnToSettingsAfterRole = false

    init(configuration: AppConfiguration, apiClient: (any APIClient)? = nil) {
        let store = KeychainTokenStore(service: "vn.quanlylop.\(configuration.environment.rawValue)")
        tokenStore = store
        api = apiClient ?? URLSessionAPIClient(configuration: configuration, tokenStore: store)
    }

    func restoreSession() async {
        do {
            guard try await tokenStore.token() != nil else { screen = .login; return }
            let current = try await api.send(.init(method: .get, path: "me"), as: CurrentIdentity.self)
            identity = current
            if current.user.mustChangePassword { screen = .forcedPassword }
              else if current.activeMembershipId == nil && current.memberships.isEmpty { screen = .main }
              else if current.activeMembershipId == nil { screen = .chooseRole }
            else { try await prepareStore(for: current.user, membershipId: current.activeMembershipId!); screen = .main }
        } catch {
            message = Self.userMessage(error)
            screen = .login
        }
    }

    func show(_ screen: Screen) { message = nil; self.screen = screen }
    func showForgotPassword(phone: String, isTeacher: Bool) {
        recoveryPhone = AuthFormat.phoneInput(phone)
        recoveryIsTeacher = isTeacher
        message = nil
        screen = .forgot
    }
    func dismissLogoutBlock() { logoutBlock = nil }

    /// Label under a role card: "Bé Gia Bảo" for guardians (children are not part of the
    /// auth payload, so the prototype's fallback "Phụ huynh" is used) and the workspace name
    /// for staff roles.
    func subtitle(for membership: Membership) -> String {
        membership.role.scopeKind == .linkedStudents ? String(localized: "feature.auth.phu.huynh") : membership.workspace.name
    }

    func login(phone: String, password: String) async throws {
        message = nil; isLocked = false
        do {
            let request = AuthCredentials(phone: domesticPhone(phone), password: password, deviceLabel: "iPhone")
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/login", body: request, requiresAuthentication: false)
            let result = try await api.send(endpoint, as: AuthSession.self)
            try await tokenStore.setToken(result.token)
            session = result
            if result.user.mustChangePassword { screen = .forcedPassword }
              else if result.activeMembershipId == nil && result.memberships.isEmpty { screen = .main }
              else if result.activeMembershipId == nil { screen = .chooseRole }
            else {
                try await prepareStore(for: result.user, membershipId: result.activeMembershipId!)
                screen = .main
            }
        } catch {
            if let failure = error as? APIFailure, case .server(let status, _, _) = failure, status == 429 { isLocked = true }
            message = Self.userMessage(error)
            throw error
        }
    }

    func register(name: String, workspace: String, phone: String, password: String, confirmation: String) async throws {
        message = nil
        do {
            try AuthValidation.validateRegistration(name: name, workspace: workspace, phone: phone,
                                                    password: password, confirmation: confirmation)
            let request = RegistrationRequest(phone: domesticPhone(phone), password: password,
                                              displayName: name.trimmingCharacters(in: .whitespacesAndNewlines),
                                              workspaceName: workspace.trimmingCharacters(in: .whitespacesAndNewlines))
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/register", body: request, requiresAuthentication: false)
            let result = try await api.send(endpoint, as: AuthSession.self)
            try await tokenStore.setToken(result.token)
            session = result
            if let membership = result.activeMembershipId {
                try await prepareStore(for: result.user, membershipId: membership)
                screen = .main
            } else { screen = .chooseRole }
        } catch { message = Self.userMessage(error); throw error }
    }

    func registerGuardian(name: String, phone: String, password: String, confirmation: String) async throws {
        message = nil
        do {
            try AuthValidation.validateGuardianRegistration(name: name, phone: phone,
                                                            password: password, confirmation: confirmation)
            let request = GuardianRegistrationRequest(phone: domesticPhone(phone), password: password,
                                                       displayName: name.trimmingCharacters(in: .whitespacesAndNewlines))
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/register-guardian",
                                                body: request, requiresAuthentication: false)
            let result = try await api.send(endpoint, as: AuthSession.self)
            try await tokenStore.setToken(result.token)
            session = result
            if result.user.mustChangePassword { screen = .forcedPassword }
            else if result.activeMembershipId == nil && result.memberships.isEmpty { screen = .main }
            else if result.activeMembershipId == nil { screen = .chooseRole }
            else {
                try await prepareStore(for: result.user, membershipId: result.activeMembershipId!)
                screen = .main
            }
        } catch {
            message = Self.userMessage(error)
            throw error
        }
    }

    func changePassword(current: String, newPassword: String, confirmation: String) async throws {
        message = nil
        let user = session?.user ?? identity?.user
        do {
            guard let user else { throw AuthValidationError.missingField }
            try AuthValidation.validatePassword(newPassword, confirmation: confirmation, phone: user.phone,
                                                currentPassword: current)
            let body = PasswordChangeRequest(currentPassword: current, newPassword: newPassword)
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/change-password", body: body)
            _ = try await api.send(endpoint, as: PasswordChangeResponse.self)
            if let old = session {
                session = AuthSession(token: old.token, expiresAt: old.expiresAt,
                                      user: User(id: old.user.id, phone: old.user.phone, displayName: old.user.displayName, mustChangePassword: false),
                                      memberships: old.memberships, activeMembershipId: old.activeMembershipId)
            }
            if let old = identity {
                identity = CurrentIdentity(user: User(id: old.user.id, phone: old.user.phone, displayName: old.user.displayName, mustChangePassword: false),
                                           activeMembershipId: old.activeMembershipId, memberships: old.memberships)
            }
            screen = screen == .forcedPassword ? postPasswordScreen : .settings
        } catch {
            if let failure = error as? APIFailure, case .server(_, let detail, _) = failure,
                 detail.code == "invalid_credentials" {
                 message = AuthCopy.wrongCurrent
            } else if let validation = error as? AuthValidationError, validation == .samePassword {
                message = AuthCopy.sameAsCurrent
            } else { message = Self.userMessage(error) }
            throw error
        }
    }

    func selectMembership(_ membership: Membership) async {
        guard let currentUser = session?.user ?? identity?.user else { return }
        message = nil
        do {
            let scopeStore = try makeStore(user: currentUser, membershipId: "")
            let controller = SessionController(api: api, tokenStore: tokenStore, store: scopeStore)
            let selection = try await controller.selectMembership(membership.id)
            if let old = session {
                session = AuthSession(token: old.token, expiresAt: old.expiresAt, user: old.user,
                                      memberships: old.memberships, activeMembershipId: selection.activeMembershipId)
            }
            if let old = identity {
                identity = CurrentIdentity(user: old.user, activeMembershipId: selection.activeMembershipId,
                                           memberships: old.memberships)
            }
            try await prepareStore(for: currentUser, membershipId: selection.activeMembershipId)
            screen = returnToSettingsAfterRole ? .settings : .main
            returnToSettingsAfterRole = false
        } catch { message = Self.userMessage(error) }
    }

    func changeRoleFromSettings() {
        returnToSettingsAfterRole = true
        show(.chooseRole)
    }

    func logout() async {
        guard let user = session?.user ?? identity?.user else { return }
        message = nil
        #if DEBUG
        // Screenshot harness (`QLH_DEMO_SCREEN=settings-blocked`) only: stand in for a store
        // that still holds pending commands so the dialog can be driven without an account.
        if let demo = demoPendingCommands {
            logoutBlock = LogoutBlock(pending: demo, online: ConnectivityMonitor.shared.isOnline)
            return
        }
        #endif
        do {
            let scopeStore = try makeStore(user: user, membershipId: "")
            let controller = SessionController(api: api, tokenStore: tokenStore, store: scopeStore)
            try await controller.logout()
            session = nil; identity = nil; activeStore = nil; activeSync = nil; logoutBlock = nil
            screen = .login
        } catch SessionFailure.pendingCommands(let count) {
            // Sign-out stays blocked while commands are pending (spec mục 5.3).
            logoutBlock = LogoutBlock(pending: count, online: ConnectivityMonitor.shared.isOnline)
        } catch {
            guard let count = await pendingCommandCount() else { message = AuthCopy.logoutFailed; return }
            logoutBlock = LogoutBlock(pending: count, online: ConnectivityMonitor.shared.isOnline)
        }
    }

    func retrySync() async {
        guard let activeSync else { return }
        message = nil
        do {
            try await activeSync.synchronize()
        } catch { message = Self.userMessage(error) }
    }

    func synchronizeWhileActive() async {
        guard isSyncEligible, let activeSync else { return }
        try? await activeSync.synchronize()
    }

    var isSyncEligible: Bool {
        guard let currentUser = session?.user ?? identity?.user,
              !(currentUser.mustChangePassword), activeMembership != nil else { return false }
        return screen == .main || screen == .settings || screen == .changePassword
    }

#if DEBUG
    /// Screenshot harness only (never reachable in a normal launch): seeds an account
    /// without touching the keychain or the network.
    func applyDemo(memberships: [Membership], activeID: String, screen: Screen,
                   logoutBlock: LogoutBlock? = nil) {
        let user = User(id: "demo-user", phone: "900000001", displayName: String(localized: "feature.auth.co.lan"),
                        mustChangePassword: false)
        session = AuthSession(token: "demo-token", expiresAt: "2099-01-01T00:00:00.000Z",
                              user: user, memberships: memberships, activeMembershipId: activeID)
        self.screen = screen
        self.logoutBlock = logoutBlock
        message = nil
    }

    /// Screenshot harness only: the login screen with its two prototype failure states.
    func applyDemoLogin(message: String?, locked: Bool) {
          session = nil; identity = nil; activeStore = nil; activeSync = nil
        self.screen = .login
        self.message = message
        self.isLocked = locked
    }

    /// Screenshot harness only: read-only phone and role variant of the forgot-password screen.
    func applyDemoRecovery(phone: String, isTeacher: Bool) {
        recoveryPhone = AuthFormat.phoneInput(phone)
        recoveryIsTeacher = isTeacher
    }
#endif

    var currentUser: User? { session?.user ?? identity?.user }
    var memberships: [Membership] { session?.memberships ?? identity?.memberships ?? [] }
    var activeMembership: Membership? {
        let id = session?.activeMembershipId ?? identity?.activeMembershipId
        return memberships.first { $0.id == id }
    }
    private var postPasswordScreen: Screen {
        (session?.activeMembershipId ?? identity?.activeMembershipId) == nil ? .chooseRole : .main
    }
    var activeStoreForLogout: (any LocalStore)? { activeStore }

    private func pendingCommandCount() async -> Int? {
        guard let activeStore else { return nil }
        return try? await activeStore.pendingCommandCount()
    }

    private func prepareStore(for user: User, membershipId: String) async throws {
        let membership = memberships.first { $0.id == membershipId }
        guard let membership else { return }
        let store = try makeStore(user: user, membershipId: membershipId, workspaceId: membership.workspace.id)
        activeStore = store
        let key = "vn.quanlylop.device_id"
        let deviceId = UserDefaults.standard.string(forKey: key) ?? UUID().uuidString
        UserDefaults.standard.set(deviceId, forKey: key)
        activeSync = SyncCoordinator(api: api, store: store, deviceId: deviceId)
    }

    private func makeStore(user: User, membershipId: String, workspaceId: String = "") throws -> SQLiteStore {
        try SQLiteStore.open(scope: CacheScope(userId: user.id, workspaceId: workspaceId, membershipId: membershipId))
    }

    private func domesticPhone(_ value: String) -> String {
        let digits = value.filter(\.isNumber)
        if digits.hasPrefix("+84") { return "0" + digits.dropFirst(3) }
        if digits.hasPrefix("84") { return "0" + digits.dropFirst(2) }
        return digits.hasPrefix("0") ? digits : "0" + digits
    }

    private static func userMessage(_ error: Error) -> String {
        if let apiError = error as? APIFailure,
           case .server(_, let detail, _) = apiError {
              if detail.code == "invalid_credentials" { return AuthCopy.invalidCredentials }
            return detail.localizedMessage
        }
        if let validation = error as? AuthValidationError {
            switch validation {
            case .missingField: return String(localized: "feature.auth.vui.long.ien.ay.u.thong.tin")
            case .passwordLength: return AuthCopy.passwordTooShort
            case .passwordMismatch: return AuthCopy.passwordMismatch
            case .samePassword: return AuthCopy.sameAsCurrent
            }
        }
        return String(localized: "feature.auth.khong.the.ket.noi.dich.vu.vui.long.thu.lai")
    }
}
