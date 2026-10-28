import Foundation
import Observation
import Security

protocol CachedIdentityStore: Sendable {
    func load() async throws -> CurrentIdentity?
    func save(_ identity: CurrentIdentity) async throws
    func clear() async throws
}

/// Keeps the last server-confirmed identity in the app's Keychain access group.
/// The encoded value contains its user ID so cached memberships remain tied to that user.
actor KeychainCachedIdentityStore: CachedIdentityStore {
    private let service: String
    private let account = "current-identity"

    init(service: String) { self.service = service }

    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }

    func load() throws -> CurrentIdentity? {
        var query = query
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else {
            throw KeychainFailure(status: status == errSecSuccess ? errSecDecode : status)
        }
        do { return try JSONDecoder().decode(CurrentIdentity.self, from: data) }
        catch { throw KeychainFailure(status: errSecDecode) }
    }

    func save(_ identity: CurrentIdentity) throws {
        let attributes: [String: Any] = [
            kSecValueData as String: try JSONEncoder().encode(identity),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            let addStatus = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil)
            guard addStatus == errSecSuccess else { throw KeychainFailure(status: addStatus) }
        } else if status != errSecSuccess { throw KeychainFailure(status: status) }
    }

    func clear() throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainFailure(status: status)
        }
    }
}

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
}

struct PhoneCheckRequest: Encodable, Sendable { let phone: String }

struct PhoneCheckResult: Decodable, Sendable {
    enum Next: String, Decodable, Sendable { case login, guardianSetup = "guardian_setup", teacherRegister = "teacher_register" }
    let next: Next
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
    case invalidPhone
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

    static func validateGuardianSetup(phone: String, password: String, confirmation: String) throws {
        guard !phone.isEmpty, !password.isEmpty, !confirmation.isEmpty else { throw AuthValidationError.missingField }
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
                                          bundleIdentifier: AppConfiguration.identifierPrefix,
                                          appVersion: "0", buildNumber: "0")
}

@MainActor
@Observable
final class AuthModel {
      enum Screen: Equatable { case loading, login, register, guardianRegister, forgot, forcedPassword, chooseRole, main, settings, changePassword }

    private(set) var screen: Screen = .loading {
        didSet { if screen != .login { loginStep = .phone } }
    }
    private(set) var session: AuthSession?
    private(set) var identity: CurrentIdentity?
    private(set) var isLocked = false
    private(set) var logoutBlock: LogoutBlock?
    private(set) var message: String?
    private(set) var recoveryPhone = ""
    enum LoginStep: Equatable { case phone, password }
    private(set) var loginStep: LoginStep = .phone
    /// The number the server accepted at step one, in the domestic form `0900000001`.
    private(set) var loginPhone = ""
    private(set) var recoveryIsTeacher = false
#if DEBUG
    /// Screenshot harness only: makes `logout()` report pending commands.
    var demoPendingCommands: Int?
#endif

    private let tokenStore: any TokenStore
    private let api: any APIClient
    private var activeStore: (any LocalStore)?
    /// Counts the sync attempts, failed ones too, that may have changed the cache, so a screen built from it can rebuild.
    private(set) var syncRevision = 0
    var activeSQLiteStore: SQLiteStore? { activeStore as? SQLiteStore }
    private(set) var activeSync: SyncCoordinator?
    private var returnToSettingsAfterRole = false

    private let identityStore: any CachedIdentityStore
    /// Where "Xoá tài khoản" sends the user; nil only for placeholder configurations.
    let deleteAccountFormURL: URL?
    private let storeFactory: (CacheScope) throws -> SQLiteStore
    private let isOnline: @MainActor () -> Bool

    init(configuration: AppConfiguration, apiClient: (any APIClient)? = nil,
         tokenStore injectedTokenStore: (any TokenStore)? = nil,
         identityStore injectedIdentityStore: (any CachedIdentityStore)? = nil,
         storeFactory: ((CacheScope) throws -> SQLiteStore)? = nil,
         isOnline: @escaping @MainActor () -> Bool = { ConnectivityMonitor.shared.isOnline }) {
        let service = configuration.tokenStoreService
        deleteAccountFormURL = configuration.deleteAccountFormURL
        let store = injectedTokenStore ?? KeychainTokenStore(service: service)
        tokenStore = store
        identityStore = injectedIdentityStore ?? KeychainCachedIdentityStore(service: service)
        self.storeFactory = storeFactory ?? { scope in try SQLiteStore.open(scope: scope) }
        self.isOnline = isOnline
        api = apiClient ?? URLSessionAPIClient(configuration: configuration, tokenStore: store)
    }

    func restoreSession() async {
        guard (try? await tokenStore.token()) != nil else {
            try? await identityStore.clear()
            screen = .login
            return
        }
        do {
            let current = try await api.send(.init(method: .get, path: "me"), as: CurrentIdentity.self)
            await installIdentity(current)
        } catch {
            if Self.statusCode(error) == 401 {
                await clearIdentityAndToken()
                message = Self.userMessage(error)
                screen = .login
            } else if Self.statusCode(error) == 403 {
                await hideRevokedIdentity(error)
            } else if Self.isRecoverable(error), let cached = try? await identityStore.load() {
                await installIdentity(cached, persist: false)
            } else {
                message = Self.userMessage(error)
                screen = .login
            }
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

    /// Step one of sign-in: asks the server what the number is. `login` asks for the password, `guardian_setup`
    /// lets a guardian whose number a teacher declared choose a first password, `teacher_register` opens workspace
    /// registration with the number filled in.
    func checkPhone(_ input: String) async throws {
        message = nil
        guard let phone = AuthFormat.normalizedPhone(input) else {
            message = LoginText.invalidPhone
            throw AuthValidationError.invalidPhone
        }
        do {
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/phone-check", body: PhoneCheckRequest(phone: phone),
                                                requiresAuthentication: false)
            let result = try await api.send(endpoint, as: PhoneCheckResult.self)
            loginPhone = phone
            switch result.next {
            case .login: loginStep = .password
            case .guardianSetup: screen = .guardianRegister
            case .teacherRegister: screen = .register
            }
        } catch {
            if let failure = error as? APIFailure, case .server(let status, let detail, let retryAfter) = failure {
                if status == 429 {
                    let seconds = max(Int((retryAfter ?? 60).rounded(.up)), 1)
                    lockPhoneCheck(seconds: seconds)
                    message = LoginText.rateLimited(seconds: seconds)
                    throw error
                }
                if status == 422, detail.details?["fields"]?["phone"]?.string == "invalid_phone" {
                    message = LoginText.invalidPhone
                    throw error
                }
            }
            message = Self.userMessage(error)
            throw error
        }
    }

    /// While set, the server asked to wait before another phone check; the Tiếp tục button stays locked until then.
    private(set) var phoneCheckLockedUntil: Date?
    private var phoneCheckUnlock: Task<Void, Never>?

    private func lockPhoneCheck(seconds: Int) {
        phoneCheckLockedUntil = Date().addingTimeInterval(TimeInterval(seconds))
        phoneCheckUnlock?.cancel()
        phoneCheckUnlock = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(seconds) * 1_000_000_000)
            guard !Task.isCancelled else { return }
            self?.phoneCheckLockedUntil = nil
            self?.message = nil
        }
    }

    /// Back to the phone box from the password step or the guardian and teacher screens.
    func changePhone() {
        loginStep = .phone
        show(.login)
    }

    func login(phone: String, password: String) async throws {
        message = nil; isLocked = false
        do {
            let request = AuthCredentials(phone: domesticPhone(phone), password: password, deviceLabel: "iPhone")
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/login", body: request, requiresAuthentication: false)
              let result = try await api.send(endpoint, as: AuthSession.self)
              try await tokenStore.setToken(result.token)
              session = result
              try? await identityStore.save(Self.currentIdentity(from: result))
            if result.user.mustChangePassword { screen = .forcedPassword }
              else if result.activeMembershipId == nil && result.memberships.isEmpty { screen = .main }
              else if result.activeMembershipId == nil {
                if !(await selectSoleMembership(result.memberships)) { screen = .chooseRole }
            }
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
              try? await identityStore.save(Self.currentIdentity(from: result))
            if let membership = result.activeMembershipId {
                try await prepareStore(for: result.user, membershipId: membership)
                screen = .main
            } else { screen = .chooseRole }
        } catch { message = Self.userMessage(error); throw error }
    }

    /// A guardian whose number a teacher declared sets a first password and goes straight into the app.
    func setUpGuardian(password: String, confirmation: String) async throws {
        message = nil
        do {
            try AuthValidation.validateGuardianSetup(phone: loginPhone, password: password, confirmation: confirmation)
            let request = GuardianRegistrationRequest(phone: domesticPhone(loginPhone), password: password)
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/register-guardian",
                                                body: request, requiresAuthentication: false)
              let result = try await api.send(endpoint, as: AuthSession.self)
              try await tokenStore.setToken(result.token)
              session = result
              try? await identityStore.save(Self.currentIdentity(from: result))
            if result.user.mustChangePassword { screen = .forcedPassword }
            else if result.activeMembershipId == nil && result.memberships.isEmpty { screen = .main }
            else if result.activeMembershipId == nil { screen = .chooseRole }
            else {
                try await prepareStore(for: result.user, membershipId: result.activeMembershipId!)
                screen = .main
            }
        } catch {
            if let failure = error as? APIFailure, case .server(let status, let detail, _) = failure,
               status == 403, detail.details?["reason"]?.string == "phone_not_declared" {
                loginStep = .phone
                screen = .login
                message = LoginText.phoneNotDeclared
                throw error
            }
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

    /// Password forms wait for AppSaveController's saved phase before leaving the editor.
    func completePasswordChange() {
        screen = screen == .forcedPassword ? postPasswordScreen : .settings
    }

    /// True once the role is selected on the server and its store is open; on failure `message` says why
    /// and the caller keeps the role screen so the user can try again.
    @discardableResult
    func selectMembership(_ membership: Membership) async -> Bool {
        guard let currentUser = session?.user ?? identity?.user else { return false }
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
                  try? await identityStore.save(identity!)
            }
            try await prepareStore(for: currentUser, membershipId: selection.activeMembershipId)
            screen = returnToSettingsAfterRole ? .settings : .main
            returnToSettingsAfterRole = false
            return true
        } catch {
            message = Self.userMessage(error)
            return false
        }
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
              try? await identityStore.clear()
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
        defer { syncRevision += 1 }
        do {
            try await activeSync.synchronize()
        } catch { message = Self.userMessage(error) }
    }

    func synchronizeWhileActive() async {
        guard isSyncEligible else { return }
        if isOnline(), !(await revalidateIdentityWhileOnline()) { return }
        guard isSyncEligible, let activeSync else { return }
        // Pages are committed one by one, so a sync that fails half way may already have changed the cache.
        defer { syncRevision += 1 }
        try? await activeSync.synchronize()
    }

    /// Rechecks server identity when ConnectivityMonitor or SyncScheduler reports reachability.
    /// A transient failure leaves the cached session usable without a persistent banner.
    private func revalidateIdentityWhileOnline() async -> Bool {
        do {
            let current = try await api.send(.init(method: .get, path: "me"), as: CurrentIdentity.self)
            await installIdentity(current)
            return true
        } catch {
            if Self.statusCode(error) == 401 {
                await clearIdentityAndToken()
                message = Self.userMessage(error)
                screen = .login
                return false
            }
            if Self.statusCode(error) == 403 {
                await hideRevokedIdentity(error)
                return false
            }
            return false
        }
    }

    private func installIdentity(_ current: CurrentIdentity, persist: Bool = true) async {
        identity = current
        if persist { try? await identityStore.save(current) }
        if current.user.mustChangePassword {
            screen = .forcedPassword
        } else if current.activeMembershipId == nil && current.memberships.isEmpty {
            activeStore = nil; activeSync = nil
            screen = .main
        } else if let membershipId = current.activeMembershipId,
                  current.memberships.contains(where: { $0.id == membershipId }) {
            let membership = current.memberships.first { $0.id == membershipId }!
            let scope = CacheScope(userId: current.user.id, workspaceId: membership.workspace.id, membershipId: membershipId)
            if activeStore?.scope == scope {
                screen = .main
                return
            }
            do {
                try await prepareStore(for: current.user, membershipId: membershipId)
                screen = .main
            } catch {
                message = Self.userMessage(error)
                screen = .login
            }
        } else if current.activeMembershipId == nil, await selectSoleMembership(current.memberships) {
            return
        } else {
            activeStore = nil; activeSync = nil
            screen = .chooseRole
        }
    }

    /// A guardian linked after signing up has exactly one active membership but the server has no active one
    /// stored for the session yet (`/me` answers `active_membership_id: null`). Picking it for them is the
    /// only sensible choice, so the role screen is skipped. `selectMembership` does not read `/me`, so this
    /// cannot loop; when the call fails the caller falls back to the role screen.
    private func selectSoleMembership(_ memberships: [Membership]) async -> Bool {
        let active = memberships.filter { $0.status == "active" }
        guard memberships.count == 1, let only = active.first else { return false }
        return await selectMembership(only)
    }

    private func hideRevokedIdentity(_ error: Error) async {
        var previous = identity
        if previous == nil { previous = try? await identityStore.load() }
        if let previous, let revokedId = previous.activeMembershipId {
            let remaining = previous.memberships.filter { $0.id != revokedId }
            let filtered = CurrentIdentity(user: previous.user, activeMembershipId: nil, memberships: remaining)
            identity = filtered
            try? await identityStore.save(filtered)
            screen = remaining.isEmpty ? .login : .chooseRole
        } else {
            try? await identityStore.clear()
            identity = nil
            screen = .login
        }
        activeStore = nil; activeSync = nil
        message = Self.userMessage(error)
    }

    private func clearIdentityAndToken() async {
        try? await identityStore.clear()
        try? await tokenStore.clear()
        session = nil; identity = nil
        activeStore = nil; activeSync = nil
    }

    nonisolated static func statusCode(_ error: Error) -> Int? {
        guard let failure = error as? APIFailure else { return nil }
        if case .server(let status, _, _) = failure { return status }
        if case .badStatus(let status) = failure { return status }
        return nil
    }

    nonisolated static func isRecoverable(_ error: Error) -> Bool {
        guard let failure = error as? APIFailure else { return false }
        switch failure {
        case .offline, .invalidURL: return true
        case .badStatus(let status): return status >= 500
        case .server(let status, _, _): return status >= 500
        default: return false
        }
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

      private static func currentIdentity(from session: AuthSession) -> CurrentIdentity {
          CurrentIdentity(user: session.user, activeMembershipId: session.activeMembershipId,
                          memberships: session.memberships)
      }

    private func pendingCommandCount() async -> Int? {
        guard let activeStore else { return nil }
        return try? await activeStore.pendingCommandCount()
    }

    private func prepareStore(for user: User, membershipId: String) async throws {
        let membership = memberships.first { $0.id == membershipId }
        guard let membership else { return }
        let scope = CacheScope(userId: user.id, workspaceId: membership.workspace.id, membershipId: membershipId)
        let store = try storeFactory(scope)
        activeStore = store
        activeSync = SyncCoordinator(api: api, store: store, deviceId: DeviceIdentity.current())
    }

    private func makeStore(user: User, membershipId: String, workspaceId: String = "") throws -> SQLiteStore {
        try storeFactory(CacheScope(userId: user.id, workspaceId: workspaceId, membershipId: membershipId))
    }

    private func domesticPhone(_ value: String) -> String {
        let digits = value.filter(\.isNumber)
        if digits.hasPrefix("+84") { return "0" + digits.dropFirst(3) }
        if digits.hasPrefix("84") { return "0" + digits.dropFirst(2) }
        return digits.hasPrefix("0") ? digits : "0" + digits
    }

    private static func userMessage(_ error: Error) -> String {
        if let apiError = error as? APIFailure,
           case .server(let status, let detail, let retryAfter) = apiError {
            if status == 429 { return LoginText.rateLimited(seconds: Int((retryAfter ?? 60).rounded(.up))) }
              if detail.code == "invalid_credentials" { return AuthCopy.invalidCredentials }
            return detail.localizedMessage
        }
        if let validation = error as? AuthValidationError {
            switch validation {
            case .missingField: return String(localized: "feature.auth.vui.long.ien.ay.u.thong.tin")
            case .passwordLength: return AuthCopy.passwordTooShort
            case .passwordMismatch: return AuthCopy.passwordMismatch
            case .samePassword: return AuthCopy.sameAsCurrent
            case .invalidPhone: return LoginText.invalidPhone
            }
        }
        return String(localized: "feature.auth.khong.the.ket.noi.dich.vu.vui.long.thu.lai")
    }
}
