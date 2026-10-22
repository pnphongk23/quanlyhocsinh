import SwiftUI

struct AuthFlowView: View {
    @State private var model: AuthModel
    private let configurationIsValid: Bool

    init(configuration: Result<AppConfiguration, AppConfigurationError>) {
        switch configuration {
        case .success(let value):
            _model = State(initialValue: AuthModel(configuration: value))
            configurationIsValid = true
        case .failure:
            _model = State(initialValue: AuthModel(configuration: .fallback))
            configurationIsValid = false
        }
    }

    var body: some View {
        Group {
            if !configurationIsValid {
                Text(String(localized: "feature.auth.khong.the.oc.cau.hinh.ung.dung"))
                    .appText(AppText.body)
                    .foregroundStyle(AppColors.error)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(AppColors.background)
            } else if let demo = requestedDemo {
                demo
            } else {
                screens
            }
        }
        .task { if model.screen == .loading { await model.restoreSession() } }
        .preferredColorScheme(.light)
        .environment(model)
    }

    private var requestedDemo: AnyView? {
#if DEBUG
        DemoScreens.requested
#else
        nil
#endif
    }

    @ViewBuilder private var screens: some View {
        switch model.screen {
        case .loading: loading
        case .login: AuthLoginView(model: model)
        case .register: AuthRegisterView(model: model)
        case .forgot: AuthForgotPasswordView(model: model)
        case .forcedPassword: AuthForcedPasswordView(model: model)
        case .chooseRole: AuthRolePickerView(model: model)
        case .main: mainRoot
        case .settings: settingsRoot
        case .changePassword: changePasswordRoot
        }
    }

    private var loading: some View {
        VStack(spacing: 12) {
            AppSpinner()
            Text(String(localized: "feature.auth.ang.tai.tai.khoan")).appText(AppText.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.background)
    }

    /// Guardians get the prototype's five-tab shell, which also hosts Cài đặt so the tab bar
    /// stays visible (`SettingsShell` in `src/app/routes.tsx`). Teachers keep their own shell.
    @ViewBuilder private var mainRoot: some View {
        if isGuardian {
            GuardianRootView(model: model)
        } else {
            teacherShell
        }
    }

    private var teacherShell: some View {
        NavigationStack {
            TeacherRootView(auth: model) {
                AnyView(AuthSettingsView(model: model, onClose: { model.show(.main) }))
            }
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { model.show(.settings) } label: {
                            Image(systemName: "person.crop.circle")
                        }
                        .accessibilityLabel(String(localized: "feature.auth.cai.at.tai.khoan"))
                    }
                }
        }
    }

    @ViewBuilder private var settingsRoot: some View {
        if isGuardian {
            GuardianRootView(model: model)
        } else {
            TeacherRootView(auth: model, initialTab: .settings) {
                AnyView(AuthSettingsView(model: model, onClose: { model.show(.main) }))
            }
        }
    }

    @ViewBuilder private var changePasswordRoot: some View {
        if isGuardian {
            GuardianRootView(model: model)
        } else {
            AuthChangePasswordView(model: model) { model.show(.settings) }
        }
    }

    private var isGuardian: Bool {
        model.activeMembership?.role.scopeKind == .linkedStudents
    }
}
