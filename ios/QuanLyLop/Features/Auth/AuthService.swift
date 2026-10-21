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

    static func validatePassword(_ password: String, confirmation: String, phone: String,
                                 currentPassword: String? = nil) throws {
        guard (8...128).contains(password.count) else { throw AuthValidationError.passwordLength }
        guard password == confirmation else { throw AuthValidationError.passwordMismatch }
        if let currentPassword, password == currentPassword { throw AuthValidationError.samePassword }
        _ = phone // The server owns the phone/password policy; the client only prevents exact reuse.
    }
}

@MainActor
@Observable
final class AuthModel {
    enum Screen: Equatable { case loading, login, register, forgot, forcedPassword, chooseRole, main, settings, changePassword }

    private(set) var screen: Screen = .loading
    private(set) var session: AuthSession?
    private(set) var identity: CurrentIdentity?
    private(set) var isLocked = false
    private(set) var pendingLogoutCount: Int?
    private(set) var message: String?
    private(set) var recoveryPhone = ""

    private let tokenStore: any TokenStore
    private let api: any APIClient
    private var activeStore: (any LocalStore)?
    private var returnToSettingsAfterRole = false

    init(configuration: AppConfiguration) {
        let store = KeychainTokenStore(service: "vn.quanlylop.\(configuration.environment.rawValue)")
        tokenStore = store
        api = URLSessionAPIClient(configuration: configuration, tokenStore: store)
    }

    func restoreSession() async {
        do {
            guard try await tokenStore.token() != nil else { screen = .login; return }
            let current = try await api.send(.init(method: .get, path: "me"), as: CurrentIdentity.self)
            identity = current
            if current.user.mustChangePassword { screen = .forcedPassword }
            else if current.activeMembershipId == nil { screen = .chooseRole }
            else { try await prepareStore(for: current.user, membershipId: current.activeMembershipId!); screen = .main }
        } catch {
            message = Self.userMessage(error)
            screen = .login
        }
    }

    func show(_ screen: Screen) { message = nil; self.screen = screen }
    func showForgotPassword(phone: String) {
        recoveryPhone = phone.filter(\.isNumber)
        message = nil
        screen = .forgot
    }
    func dismissLogoutBlock() { pendingLogoutCount = nil }

    func login(phone: String, password: String) async {
        message = nil; isLocked = false
        do {
            let request = AuthCredentials(phone: domesticPhone(phone), password: password, deviceLabel: "iPhone")
            let endpoint = try APIEndpoint.json(method: .post, path: "auth/login", body: request, requiresAuthentication: false)
            let result = try await api.send(endpoint, as: AuthSession.self)
            try await tokenStore.setToken(result.token)
            session = result
            if result.user.mustChangePassword { screen = .forcedPassword }
            else if result.activeMembershipId == nil { screen = .chooseRole }
            else {
                try await prepareStore(for: result.user, membershipId: result.activeMembershipId!)
                screen = .main
            }
        } catch {
            if let failure = error as? APIFailure, case .server(let status, _, _) = failure, status == 429 { isLocked = true }
            message = Self.userMessage(error)
        }
    }

    func register(name: String, workspace: String, phone: String, password: String, confirmation: String) async {
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
        } catch { message = Self.userMessage(error) }
    }

    func changePassword(current: String, newPassword: String, confirmation: String) async {
        message = nil
        let forcedChange = screen == .forcedPassword
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
                message = "Mật khẩu hiện tại không đúng."
            } else if let validation = error as? AuthValidationError, validation == .samePassword {
                message = forcedChange ? "Mật khẩu mới không được trùng mật khẩu tạm." : "Mật khẩu mới phải khác mật khẩu hiện tại."
            } else { message = Self.userMessage(error) }
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
        do {
            let scopeStore = try makeStore(user: user, membershipId: "")
            let controller = SessionController(api: api, tokenStore: tokenStore, store: scopeStore)
            try await controller.logout()
            session = nil; identity = nil; activeStore = nil; pendingLogoutCount = nil
            screen = .login
        } catch SessionFailure.pendingCommands(let count) {
            pendingLogoutCount = count
        } catch { message = Self.userMessage(error) }
    }

    func retrySync() async {
        guard let activeStore else { return }
        message = nil
        let key = "vn.quanlylop.device_id"
        let deviceId: String
        if let existing = UserDefaults.standard.string(forKey: key) { deviceId = existing }
        else {
            deviceId = UUID().uuidString
            UserDefaults.standard.set(deviceId, forKey: key)
        }
        do {
            try await SyncCoordinator(api: api, store: activeStore, deviceId: deviceId).synchronize()
        } catch { message = Self.userMessage(error) }
    }

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

    private func prepareStore(for user: User, membershipId: String) async throws {
        let membership = memberships.first { $0.id == membershipId }
        guard let membership else { return }
        activeStore = try makeStore(user: user, membershipId: membershipId, workspaceId: membership.workspace.id)
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
              if detail.code == "invalid_credentials" { return "Số điện thoại hoặc mật khẩu không đúng" }
            return detail.localizedMessage
        }
        if let validation = error as? AuthValidationError {
            switch validation {
            case .missingField: return "Vui lòng điền đầy đủ thông tin."
            case .passwordLength: return "Mật khẩu phải có từ 8 đến 128 ký tự."
              case .passwordMismatch: return "Mật khẩu nhập lại không khớp."
            case .samePassword: return "Mật khẩu mới phải khác mật khẩu hiện tại."
            }
        }
        return "Không thể kết nối dịch vụ. Vui lòng thử lại."
    }
}
