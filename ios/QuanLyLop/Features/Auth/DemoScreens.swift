import SwiftUI

#if DEBUG
/// Debug-only screenshot flag, shared by `DemoScreens` and `GuardianDemo`.
/// Read from the environment (`SIMCTL_CHILD_QLH_DEMO_SCREEN=…`) and from launch arguments
/// (`maestro`'s `launchApp: arguments:`) so a flow can seed a screen without a live account.
enum DemoFlag {
    static var screen: String? {
        if let value = ProcessInfo.processInfo.environment["QLH_DEMO_SCREEN"], !value.isEmpty {
            return value
        }
        // `XCUIApplication.launchArguments` (`maestro`'s `launchApp: arguments:`) land in
        // `NSArgumentDomain` as `-key value` pairs, which `UserDefaults` already parses.
        if let value = UserDefaults.standard.string(forKey: "QLH_DEMO_SCREEN"), !value.isEmpty {
            return value
        }
        let arguments = ProcessInfo.processInfo.arguments
        let prefix = "QLH_DEMO_SCREEN="
        for argument in arguments {
            // `maestro` can forward the pair as a single `-QLH_DEMO_SCREEN=…` argument.
            let body = argument.hasPrefix("-") ? String(argument.dropFirst()) : argument
            if body.hasPrefix(prefix) { return String(body.dropFirst(prefix.count)) }
        }
        if let index = arguments.firstIndex(of: "-QLH_DEMO_SCREEN"), index + 1 < arguments.count {
            return arguments[index + 1]
        }
        return nil
    }
}

/// Screenshot harness for prototype comparison (`SIMCTL_CHILD_QLH_DEMO_SCREEN=…`).
/// Debug builds only; `ContentView` and the normal launch path never read the flag,
/// and Production is a release build so this file compiles to nothing there.
enum DemoScreens {
    /// `QLH_DEMO_SCREEN` from the process environment (`simctl launch`) or from launch
    /// arguments (`maestro`'s `launchApp: arguments:`), so both can seed a screen.
    static var flag: String? { DemoFlag.screen }

    @MainActor static let requested: AnyView? = build()

    static func membership(_ id: String, roleName: String, kind: ScopeKind,
                           systemKey: String? = nil) -> Membership {
        Membership(id: id,
                   workspace: Workspace(id: "demo-workspace", name: "Lớp của cô Lan"),
                   role: Role(id: "role-\(id)", name: roleName, systemKey: systemKey, scopeKind: kind),
                   status: "active", scopeEpoch: 1, permissions: nil)
    }

    @MainActor private static func build() -> AnyView? {
        guard let name = flag else { return nil }
        let admin = membership("demo-admin", roleName: "Quản trị viên", kind: .workspace, systemKey: "admin")
        let teacher = membership("demo-teacher", roleName: "Giáo viên", kind: .assignedClasses, systemKey: "teacher")
        let guardian = membership("demo-guardian", roleName: "Phụ huynh", kind: .linkedStudents)
        let model = AuthModel(configuration: .fallback)

        switch name {
        case "login", "login-error", "login-locked":
            model.applyDemoLogin(message: name == "login-error" ? AuthCopy.invalidCredentials : nil,
                                 locked: name == "login-locked")
            return AnyView(DemoAuthFlow(model: model).environment(model))
        case "register":
            model.applyDemoLogin(message: nil, locked: false)
            model.show(.register)
            return AnyView(DemoAuthFlow(model: model).environment(model))
        case "forgot-guardian", "forgot-teacher":
            model.applyDemo(memberships: [teacher, guardian], activeID: guardian.id, screen: .forgot)
            model.applyDemoRecovery(phone: "900000002", isTeacher: name == "forgot-teacher")
            return AnyView(DemoAuthFlow(model: model).environment(model))
        case "forced-password":
            model.applyDemo(memberships: [guardian], activeID: guardian.id, screen: .forcedPassword)
            return AnyView(DemoAuthFlow(model: model).environment(model))
        case "role-picker":
            // Ảnh 09 của P2: tài khoản có ba vai trò (quản trị viên, giáo viên, phụ huynh).
            model.applyDemo(memberships: [admin, teacher, guardian], activeID: teacher.id, screen: .chooseRole)
            return AnyView(DemoAuthFlow(model: model).environment(model))
        case "settings-teacher":
            model.applyDemo(memberships: [teacher, guardian], activeID: teacher.id, screen: .settings)
            return AnyView(DemoAuthFlow(model: model).environment(model))
        case "settings", "settings-blocked", "change-password":
            let screen: AuthModel.Screen = name == "change-password" ? .changePassword : .settings
            model.applyDemo(memberships: [teacher, guardian], activeID: guardian.id, screen: screen)
            if name == "settings-blocked" { model.demoPendingCommands = 1 }
            return AnyView(GuardianRootView(model: model).environment(model))
        case "guardian", "guardian-empty":
            model.applyDemo(memberships: [guardian], activeID: guardian.id, screen: .main)
            return AnyView(GuardianRootView(model: model).environment(model))
        default:
            return nil
        }
    }
}

/// Screenshot harness for the teacher side of the account screens.
///
/// A flow has to *move* between screens (Đăng nhập → Quên mật khẩu → back), so this mirrors
/// `AuthFlowView.screens` instead of pinning one view; seeding a screen is still done by
/// `build()` above. Debug builds only.
private struct DemoAuthFlow: View {
    let model: AuthModel

    var body: some View {
        switch model.screen {
        case .register: AuthRegisterView(model: model)
        case .forgot: AuthForgotPasswordView(model: model)
        case .forcedPassword: AuthForcedPasswordView(model: model)
        case .chooseRole: AuthRolePickerView(model: model)
        case .settings: AuthSettingsView(model: model)
        case .changePassword: AuthChangePasswordView(model: model) { model.show(.settings) }
        case .login, .main, .loading: AuthLoginView(model: model)
        }
    }
}
#endif
