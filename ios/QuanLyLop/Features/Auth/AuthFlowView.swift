import SwiftUI

struct AuthFlowView: View {
    @State private var model: AuthModel
    private let configurationIsValid: Bool

    init(configuration: Result<AppConfiguration, AppConfigurationError>) {
        switch configuration {
        case .success(let value):
            let model = AuthModel(configuration: value)
            _model = State(initialValue: model)
            configurationIsValid = true
        case .failure:
            let model = AuthModel(configuration: .fallback)
            _model = State(initialValue: model)
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
            .task {
                if model.screen == .loading { await model.restoreSession() }
                await model.synchronizeOnSessionEntry()
            }
            .onChange(of: model.screen) { _, _ in
                Task { await model.synchronizeOnSessionEntry() }
            }
            .onChange(of: model.activeMembership?.id) { _, _ in
                Task { await model.synchronizeOnSessionEntry() }
            }
            .onChange(of: ConnectivityMonitor.shared.isOnline) { wasOnline, isOnline in
                if !wasOnline && isOnline { Task { await model.synchronizePendingCommandsIfNeeded() } }
            }
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
          case .guardianRegister: AuthGuardianRegisterView(model: model)
        case .forgot: AuthForgotPasswordView(model: model)
        case .forcedPassword: AuthForcedPasswordView(model: model)
        case .chooseRole: AuthRolePickerView(model: model)
        case .main, .settings, .changePassword: mainRoot
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
        TeacherRootView(auth: model) {
            AnyView(
                AuthSettingsView(model: model, isRootTab: true)
                    .navigationDestination(isPresented: changePasswordPresented) {
                        AuthChangePasswordView(model: model, isPushed: true) { model.show(.settings) }
                    }
            )
        }
    }

    private var changePasswordPresented: Binding<Bool> {
        Binding(get: { model.screen == .changePassword },
                set: { if !$0 && model.screen == .changePassword { model.show(.settings) } })
    }

    private var isGuardian: Bool {
        model.activeMembership?.role.scopeKind == .linkedStudents
            || (model.currentUser != nil && model.memberships.isEmpty)
    }
}
