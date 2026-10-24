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
                   workspace: Workspace(id: "demo-workspace", name: String(localized: "feature.auth.lop.cua.co.lan")),
                   role: Role(id: "role-\(id)", name: roleName, systemKey: systemKey, scopeKind: kind),
                   status: "active", scopeEpoch: 1, permissions: nil)
    }

    @MainActor private static func build() -> AnyView? {
        guard let name = flag else { return nil }
        let admin = membership("demo-admin", roleName: String(localized: "feature.auth.quan.tri.vien"), kind: .workspace, systemKey: "admin")
        let teacher = membership("demo-teacher", roleName: String(localized: "feature.auth.giao.vien"), kind: .assignedClasses, systemKey: "teacher")
        let guardian = membership("demo-guardian", roleName: String(localized: "feature.auth.phu.huynh"), kind: .linkedStudents)
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
          case "scores", "score-grid", "homework", "comments", "reports":
              return AnyView(DemoI4Screen(kind: name))
          case "guardian", "guardian-empty":
            model.applyDemo(memberships: [guardian], activeID: guardian.id, screen: .main)
            return AnyView(GuardianRootView(model: model).environment(model))
        default:
            return nil
        }
    }
}

/// Read-only debug harness for I-8C feature comparisons. The feature store reads the bundled
/// synthetic CoreFixtures snapshot; it never uses a real account or writes production data.
@MainActor
private struct DemoI4Screen: View {
    let kind: String
    @State private var model: AuthModel
    @StateObject private var data: I4FeatureStore
    @State private var rootTab = TeacherTab.classes

    private var sessionFeature: Bool { kind == "homework" || kind == "comments" }
    private var selectedTab: String {
        switch kind {
        case "score-grid": "diem"
        case "reports": "bao-cao"
        case "homework": "btvn"
        case "comments": "nhan-xet"
        default: "bai-kiem-tra"
        }
    }

    private var tabs: [TeacherTextTabs.Item] {
        if sessionFeature {
            return [
                .init(id: "diem-danh", label: String(localized: "feature.auth.iem.danh")),
                .init(id: "nhan-xet", label: String(localized: "feature.auth.nhan.xet")),
                .init(id: "btvn", label: String(localized: "feature.auth.bai.tap.ve.nha")),
            ]
        }
        return [
            .init(id: "buoi-hoc", label: String(localized: "feature.auth.buoi.hoc")),
            .init(id: "bai-kiem-tra", label: String(localized: "feature.auth.bai.kiem.tra")),
            .init(id: "diem", label: String(localized: "feature.auth.iem")),
            .init(id: "hoc-sinh", label: String(localized: "feature.auth.hoc.sinh")),
            .init(id: "bao-cao", label: String(localized: "feature.auth.bao.cao")),
        ]
    }

    init(kind: String) {
        self.kind = kind
        let teacher = DemoScreens.membership("demo-teacher", roleName: String(localized: "feature.auth.giao.vien"),
                                             kind: .assignedClasses, systemKey: "teacher")
        let model = AuthModel(configuration: .fallback)
        model.applyDemo(memberships: [teacher], activeID: teacher.id, screen: .main)
        _model = State(initialValue: model)
        _data = StateObject(wrappedValue: I4FeatureStore())
    }

    var body: some View {
        VStack(spacing: 0) {
            NavigationStack {
                VStack(spacing: 0) {
                    header
                    TeacherScroll {
                        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                            switch kind {
                            case "scores":
                                TestsTabView(classID: data.classID, data: data)
                            case "score-grid":
                                if let test = data.tests(in: data.classID).first {
                                    TestScoresView(classID: data.classID, testID: test.id, data: data)
                                } else {
                                    AppEmptyState(title: String(localized: "feature.auth.chua.co.bai.kiem.tra"))
                                }
                            case "homework":
                                SessionHomeworkView(sessionID: data.defaultSession?.id ?? "fixture-session", data: data)
                            case "comments":
                                SessionCommentsView(sessionID: data.defaultSession?.id ?? "fixture-session", data: data)
                            default:
                                MonthlyReportView(classID: data.classID, data: data)
                            }
                        }
                        .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                        .padding(.top, 8)
                        .padding(.bottom, TeacherMetrics.tabBarHeight)
                    }
                }
            }
            TeacherTabBar(selection: $rootTab)
        }
        .background(AppColors.background.ignoresSafeArea())
        .environment(model)
    }

    private var header: some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                TeacherIconButton(systemImage: "chevron.backward", label: String(localized: "feature.auth.quay.lai")) {}
                VStack(alignment: .leading, spacing: sessionFeature ? 0 : 0) {
                    if sessionFeature {
                        Text(String(localized: "feature.auth.tieng.anh.giao.tiep.6a"))
                            .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                            .foregroundStyle(AppColors.muted)
                            .lineLimit(1)
                    }
                    Text(sessionFeature ? String(localized: "feature.auth.buoi.9.19.10") : String(localized: "feature.auth.tieng.anh.giao.tiep.6a"))
                        .appText(sessionFeature ? AppTextStyle(size: 20, weight: .bold, lineHeight: 25)
                                                 : AppText.titleCompact)
                        .foregroundStyle(AppColors.text)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                TeacherIconButton(systemImage: "ellipsis", label: String(localized: "feature.auth.tuy.chon.lop"), tint: AppColors.muted) {}
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, sessionFeature ? 0 : 4)
            TeacherTextTabs(items: tabs, selection: selectedTab,
                            fontSize: sessionFeature ? 14 : 13,
                            fillsWidth: sessionFeature) { _ in }
        }
        .background(AppColors.surface)
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
        case .guardianRegister: AuthGuardianRegisterView(model: model)
        case .forgot: AuthForgotPasswordView(model: model)
        case .forcedPassword: AuthForcedPasswordView(model: model)
        case .chooseRole: AuthRolePickerView(model: model)
        case .settings:
            if model.activeMembership?.role.scopeKind == .linkedStudents {
                AuthSettingsView(model: model)
            } else {
                TeacherRootView(initialTab: .settings) {
                    AnyView(AuthSettingsView(model: model, onClose: { model.show(.main) }))
                }
            }
        case .changePassword: AuthChangePasswordView(model: model) { model.show(.settings) }
        case .main: TeacherRootView()
        case .login, .loading: AuthLoginView(model: model)
        }
    }
}
#endif
