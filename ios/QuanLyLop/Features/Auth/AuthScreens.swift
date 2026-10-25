import SwiftUI

// MARK: - Đăng nhập (`src/features/auth/LoginPage.tsx`)

struct AuthLoginView: View {
    let model: AuthModel
    @State private var phone = ""
    @State private var password = ""
    @State private var saveController = AppSaveController()

    var body: some View {
        AuthPage {
            AuthBrand()
            AuthTitle(text: String(localized: "feature.auth.ang.nhap"))
            AuthDescription(text: String(localized: "feature.auth.danh.cho.giao.vien.va.phu.huynh"))
            if model.isLocked {
                AuthBanner(text: AuthCopy.loginLocked, tone: .warning)
            } else if let message = model.message {
                AuthBanner(text: message, tone: .error)
            }
            VStack(spacing: 20) {
                AuthPhoneField(label: String(localized: "feature.auth.so.ien.thoai"), digits: $phone,
                               disabled: model.isLocked,
                               hasError: model.message != nil && !model.isLocked,
                               identifier: "login.phone")
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau"), value: $password,
                                  hasError: model.message != nil && !model.isLocked,
                                  disabled: model.isLocked,
                                  identifier: "login.password")
                HStack {
                    Spacer(minLength: 0)
                    Button(String(localized: "feature.auth.quen.mat.khau")) {
                        model.showForgotPassword(phone: phone,
                                                 isTeacher: model.activeMembership?.role.scopeKind == .workspace)
                    }
                    .appText(AuthText.link)
                    .foregroundStyle(AppColors.primary)
                }
                  AppSaveButton(title: String(localized: "feature.auth.ang.nhap"), controller: saveController,
                                isEnabled: !model.isLocked, identifier: "login.submit") {
                      try await model.login(phone: phone, password: password)
                  }
            }
            .padding(.top, 24)

            VStack(spacing: 16) {
              Button { model.show(.register) } label: {
                    (Text(String(localized: "feature.auth.chua.co.khong.gian.lam.viec")).foregroundStyle(AppColors.muted)
                     + Text(String(localized: "feature.auth.ang.ky.cho.giao.vien")).foregroundStyle(AppColors.primary))
                        .appText(AuthText.note)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
              }
              .buttonStyle(.plain)
              .accessibilityIdentifier("login.registerTeacher")
              Button { model.show(.guardianRegister) } label: {
                  Text(String(localized: "auth.guardian.registerLink", table: "Guardian"))
                      .appText(AuthText.noteStrong)
                      .foregroundStyle(AppColors.primary)
                      .frame(maxWidth: .infinity, alignment: .center)
              }
              .buttonStyle(.plain)
                  AuthHintCard(lead: String(localized: "feature.auth.phu.huynh.c87f8d0d"), text: String(localized: "feature.auth.phu.huynh.dung.so.trong.ho.so.hoc.sinh"))
            }
            .padding(.top, 32)
            Spacer(minLength: 0)
        }
    }
}

// MARK: - Đăng ký (`src/features/auth/RegisterPage.tsx`)

struct AuthRegisterView: View {
    let model: AuthModel
    @State private var name = ""
    @State private var workspace = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmation = ""
    @State private var saveController = AppSaveController()

    private var mismatch: Bool { !confirmation.isEmpty && confirmation != password }
    private var blocked: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
        workspace.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || phone.isEmpty ||
        password.count < 8 || confirmation.isEmpty || mismatch
    }

    var body: some View {
        AuthPage {
            AuthBackButton { model.show(.login) }
            AuthTitle(text: String(localized: "feature.auth.tao.khong.gian.lam.viec"))
            if let message = model.message { AuthBanner(text: message, tone: .error) }
            VStack(spacing: 20) {
                AuthTextField(label: String(localized: "feature.auth.ten.hien.thi"), text: $name, placeholder: String(localized: "feature.auth.co.lan"),
                              identifier: "register.name")
                AuthTextField(label: String(localized: "feature.auth.ten.khong.gian.lam.viec"), text: $workspace,
                              placeholder: String(localized: "feature.auth.lop.cua.co.lan"), identifier: "register.workspace")
                AuthPhoneField(label: String(localized: "feature.auth.so.ien.thoai"), digits: $phone, identifier: "register.phone")
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau"), value: $password, autoComplete: .newPassword,
                                  identifier: "register.password",
                                  strengthPassword: password)
                AuthCheckRow(ok: password.count >= 8, text: String(localized: "feature.auth.toi.thieu.8.ky.tu"))
                AuthPasswordField(label: String(localized: "feature.auth.nhap.lai.mat.khau"), value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "register.confirm")
                Text(String(localized: "feature.auth.nguoi.tao.la.quan.tri.vien.au.tien.cua.khong.gia"))
                    .appText(AuthText.note)
                    .foregroundStyle(AppColors.muted)
                  AppSaveButton(title: String(localized: "feature.auth.tao.khong.gian.lam.viec"),
                                controller: saveController, isEnabled: !blocked, identifier: "register.submit") {
                      try await model.register(name: name, workspace: workspace, phone: phone,
                                               password: password, confirmation: confirmation)
                  }
            }
            .padding(.top, 24)
        }
    }
}

// MARK: - Đổi mật khẩu bắt buộc (`src/features/auth/ForcedPasswordPage.tsx`)

struct AuthForcedPasswordView: View {
    let model: AuthModel
    @State private var current = ""
    @State private var newPassword = ""
    @State private var confirmation = ""
    @State private var saveController = AppSaveController()

    private var tooShort: Bool { !newPassword.isEmpty && newPassword.count < 8 }
    private var matchesCurrent: Bool { !newPassword.isEmpty && newPassword == current }
    private var mismatch: Bool { !confirmation.isEmpty && confirmation != newPassword }
    private var duplicateCurrent: Bool { matchesCurrent || model.message == AuthCopy.sameAsCurrent }
    private var blocked: Bool {
        duplicateCurrent || tooShort || mismatch || current.isEmpty || newPassword.isEmpty || confirmation.isEmpty
    }

    var body: some View {
        AuthPage {
              AuthTitle(text: String(localized: "feature.auth.oi.mat.khau"))
            VStack(spacing: 20) {
                  AuthPasswordField(label: String(localized: "feature.auth.mat.khau.hien.tai"), value: $current,
                                    identifier: "forced.current")
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau.moi"), value: $newPassword,
                                  autoComplete: .newPassword,
                                    hasError: tooShort || duplicateCurrent,
                                    errorText: duplicateCurrent ? AuthCopy.sameAsCurrent : nil,
                                  identifier: "forced.new",
                                  strengthPassword: newPassword)
                AuthPasswordField(label: String(localized: "feature.auth.nhap.lai.mat.khau.moi"), value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "forced.confirm")
                VStack(spacing: 10) {
                    AuthCheckRow(ok: newPassword.count >= 8, text: String(localized: "feature.auth.toi.thieu.8.ky.tu"))
                      AuthCheckRow(ok: !newPassword.isEmpty && !duplicateCurrent, text: String(localized: "feature.auth.khac.mat.khau.hien.tai"))
                }
                    if let message = model.message, !duplicateCurrent {
                      Text(message).appText(AuthText.fieldError).foregroundStyle(AppColors.error)
                  }
                  AppSaveButton(title: String(localized: "feature.auth.oi.mat.khau.va.tiep.tuc"),
                                controller: saveController, isEnabled: !blocked) {
                      try await model.changePassword(current: current, newPassword: newPassword,
                                                     confirmation: confirmation)
                  }
            }
            .padding(.top, 24)
        }
    }
}

// MARK: - Quên mật khẩu (`src/features/auth/ForgotPasswordPage.tsx`)

struct AuthForgotPasswordView: View {
    let model: AuthModel
    @State private var phone = ""

    var body: some View {
        AuthPage {
            AuthBackButton { model.show(.login) }
              AuthTitle(text: String(localized: "feature.auth.quen.mat.khau"))
              AuthDescription(text: AuthCopy.forgotPasswordDescription)
            AuthPhoneField(label: String(localized: "feature.auth.so.ien.thoai.cua.ban"), digits: $phone, readOnly: true,
                           identifier: "forgot.phone")
                .padding(.top, 22)

              steps
            Spacer(minLength: 0)
            AuthSubmitButton(title: String(localized: "feature.auth.quay.lai.ang.nhap")) { model.show(.login) }
                .padding(.top, 24)
        }
        .onAppear { phone = model.recoveryPhone }
    }

    private var steps: some View {
        VStack(spacing: 18) {
              step(1, AuthCopy.forgotPasswordStepOne)
              step(2, AuthCopy.forgotPasswordStepTwo)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
        .padding(.top, 22)
    }

    private func step(_ number: Int, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .appText(AuthText.stepNumber)
                .foregroundStyle(AppColors.primary)
                .frame(width: 28, height: 28)
                .background(AppColors.primarySoft, in: Circle())
            Text(text)
                .appText(AuthText.step)
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Chọn vai trò (`src/features/auth/RolePickerPage.tsx`)

struct AuthRolePickerView: View {
    let model: AuthModel

    var body: some View {
        AuthPage {
            AuthTitle(text: String(localized: "feature.auth.chon.vai.tro"))
            if let user = model.currentUser {
                AuthDescription(text: String.localizedStringWithFormat(String(localized: "feature.auth.so.co.hon.mot.vai.tro.chon.mot.e.vao"), String(describing: (AuthFormat.phone(user.phone)))))
            }
            if model.memberships.isEmpty {
                AuthNote(text: String(localized: "feature.auth.tai.khoan.cua.ban.chua.co.vai.tro.nao.ang.hoat.o"))
            }
            VStack(spacing: 14) {
                ForEach(model.memberships, id: \.id) { membership in
                    roleCard(membership)
                }
            }
            .padding(.top, 26)
            if let message = model.message { AuthBanner(text: message, tone: .error) }
            // `.pickerFooter` chỉ cách danh sách 28 pt, không bị đẩy xuống đáy màn.
            Text(String(localized: "feature.auth.ban.oi.uoc.vai.tro.bat.cu.luc.nao.trong.cai.at"))
                .appText(AuthText.note)
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)
                .padding(.top, 28)
        }
    }

    private func roleCard(_ membership: Membership) -> some View {
        Button { Task { await model.selectMembership(membership) } } label: {
            HStack(spacing: 14) {
                Text(AuthRoleBadge.initials(membership.role))
                    .font(AppFont.font(size: 17, weight: .bold))
                    .foregroundStyle(AppColors.primary)
                    .frame(width: 52, height: 52)
                    .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 2) {
                    Text(AuthRoleBadge.label(membership.role))
                        .appText(AuthText.roleName)
                        .foregroundStyle(AppColors.text)
                    Text(roleSubtitle(for: membership))
                        .appText(AuthText.roleMeta)
                        .foregroundStyle(AppColors.muted)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(AppColors.muted)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.row))
        }
        .buttonStyle(.plain)
    }

    private func roleSubtitle(for membership: Membership) -> String {
#if DEBUG
        if DemoFlag.screen == "role-picker",
           membership.role.scopeKind == .linkedStudents {
            return String(localized: "feature.auth.be.gia.bao")
        }
#endif
        return model.subtitle(for: membership)
    }
}

struct AuthGuardianRegisterView: View {
    let model: AuthModel
    @State private var name = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmation = ""
    @State private var saveController = AppSaveController()

    private var mismatch: Bool { !confirmation.isEmpty && confirmation != password }
    private var disabled: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || phone.isEmpty ||
        password.count < 8 || confirmation.isEmpty || mismatch
    }

    var body: some View {
        AuthPage {
            AuthBackButton { model.show(.login) }
            AuthTitle(text: String(localized: "auth.guardian.registerTitle", table: "Guardian"))
            AuthDescription(text: String(localized: "auth.guardian.registerDescription", table: "Guardian"))
            if let message = model.message {
                AuthBanner(text: message, tone: .error)
            } else if let error = saveController.error {
                AuthBanner(text: String(describing: error), tone: .error)
            }
            VStack(spacing: AppMetrics.buttonPaddingMedium) {
                AuthTextField(label: String(localized: "feature.auth.ten.hien.thi"), text: $name,
                              placeholder: String(localized: "feature.auth.co.lan"), identifier: "guardian.register.name")
                AuthPhoneField(label: String(localized: "feature.auth.so.ien.thoai"), digits: $phone,
                               identifier: "guardian.register.phone")
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau"), value: $password,
                                  autoComplete: .newPassword, identifier: "guardian.register.password",
                                  strengthPassword: password)
                AuthCheckRow(ok: password.count >= 8, text: String(localized: "feature.auth.toi.thieu.8.ky.tu"))
                AuthPasswordField(label: String(localized: "feature.auth.nhap.lai.mat.khau"), value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "guardian.register.confirm")
                AppSaveButton(title: String(localized: "auth.guardian.createAccount", table: "Guardian"),
                              controller: saveController, isEnabled: !disabled,
                              identifier: "guardian.register.submit") {
                    try await model.registerGuardian(name: name, phone: phone,
                                                     password: password, confirmation: confirmation)
                }
            }
            .padding(.top, AppMetrics.buttonHeightMedium / 2)
        }
    }
}
