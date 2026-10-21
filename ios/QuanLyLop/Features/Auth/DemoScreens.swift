import SwiftUI

#if DEBUG
/// Screenshot harness for prototype comparison (`SIMCTL_CHILD_QLH_DEMO_SCREEN=…`).
/// Debug builds only; `ContentView` and the normal launch path never read the flag,
/// and Production is a release build so this file compiles to nothing there.
enum DemoScreens {
    @MainActor static let requested: AnyView? = build()

    static func membership(_ id: String, roleName: String, kind: ScopeKind,
                           systemKey: String? = nil) -> Membership {
        Membership(id: id,
                   workspace: Workspace(id: "demo-workspace", name: "Lớp của cô Lan"),
                   role: Role(id: "role-\(id)", name: roleName, systemKey: systemKey, scopeKind: kind),
                   status: "active", scopeEpoch: 1, permissions: nil)
    }

    @MainActor private static func build() -> AnyView? {
        guard let name = ProcessInfo.processInfo.environment["QLH_DEMO_SCREEN"] else { return nil }
        let teacher = membership("demo-teacher", roleName: "Giáo viên", kind: .assignedClasses, systemKey: "teacher")
        let guardian = membership("demo-guardian", roleName: "Phụ huynh", kind: .linkedStudents)
        let model = AuthModel(configuration: .fallback)

        switch name {
        case "role-picker":
            model.applyDemo(memberships: [teacher, guardian], activeID: teacher.id, screen: .chooseRole)
            return AnyView(AuthRolePickerView(model: model).environment(model))
        case "settings", "settings-blocked", "change-password":
            let screen: AuthModel.Screen = name == "change-password" ? .changePassword : .settings
            model.applyDemo(memberships: [teacher, guardian], activeID: guardian.id, screen: screen,
                            logoutBlock: name == "settings-blocked"
                                ? LogoutBlock(pending: 1, online: true) : nil)
            return AnyView(GuardianRootView(model: model).environment(model))
        default:
            return nil
        }
    }
}
#endif
