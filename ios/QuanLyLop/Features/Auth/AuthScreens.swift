import SwiftUI

// MARK: - Đăng nhập (`src/features/auth/LoginPage.tsx`)

struct AuthLoginView: View {
    let model: AuthModel
    @State private var phone = ""
    @State private var password = ""

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
                AuthSubmitButton(title: String(localized: "feature.auth.ang.nhap"), disabled: model.isLocked) {
                    Task { await model.login(phone: phone, password: password) }
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
                AuthHintCard(lead: String(localized: "feature.auth.phu.huynh.c87f8d0d"), text: String(localized: "feature.auth.dung.so.ien.thoai.a.ang.ky.voi.giao.vien.va.mat"))
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

    private var mismatch: Bool { !confirmation.isEmpty && confirmation != password }

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
                AuthSubmitButton(title: String(localized: "feature.auth.tao.khong.gian.lam.viec")) {
                    Task {
                        await model.register(name: name, workspace: workspace, phone: phone,
                                             password: password, confirmation: confirmation)
                    }
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

    private var tooShort: Bool { !newPassword.isEmpty && newPassword.count < 8 }
    private var matchesTypedTemp: Bool { !newPassword.isEmpty && newPassword == current }
    private var mismatch: Bool { !confirmation.isEmpty && confirmation != newPassword }
    private var duplicateTemp: Bool { matchesTypedTemp || model.message == AuthCopy.sameAsTemp }
    private var blocked: Bool {
        duplicateTemp || tooShort || mismatch || current.isEmpty || newPassword.isEmpty || confirmation.isEmpty
    }

    var body: some View {
        AuthPage {
            AuthTitle(text: String(localized: "feature.auth.oi.mat.khau"))
            AuthDescription(text: String(localized: "feature.auth.ban.ang.dung.mat.khau.tam.do.giao.vien.cap.hay.a"))
            VStack(spacing: 20) {
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau.hien.tai.mat.khau.tam"), value: $current,
                                  identifier: "forced.current")
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau.moi"), value: $newPassword,
                                  autoComplete: .newPassword,
                                  hasError: tooShort || duplicateTemp,
                                  errorText: duplicateTemp ? AuthCopy.sameAsTemp : nil,
                                  identifier: "forced.new",
                                  strengthPassword: newPassword)
                AuthPasswordField(label: String(localized: "feature.auth.nhap.lai.mat.khau.moi"), value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "forced.confirm")
                VStack(spacing: 10) {
                    AuthCheckRow(ok: newPassword.count >= 8, text: String(localized: "feature.auth.toi.thieu.8.ky.tu"))
                    AuthCheckRow(ok: !newPassword.isEmpty && !duplicateTemp, text: String(localized: "feature.auth.khac.mat.khau.tam"))
                }
                if let message = model.message, !duplicateTemp {
                    Text(message).appText(AuthText.fieldError).foregroundStyle(AppColors.error)
                }
                AuthSubmitButton(title: String(localized: "feature.auth.oi.mat.khau.va.tiep.tuc"), disabled: blocked) {
                    Task {
                        await model.changePassword(current: current, newPassword: newPassword,
                                                   confirmation: confirmation)
                    }
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

    private var isTeacher: Bool { model.recoveryIsTeacher }

    var body: some View {
        AuthPage {
            AuthBackButton { model.show(.login) }
            AuthTitle(text: String(localized: "feature.auth.quen.mat.khau"))
            AuthDescription(text: isTeacher
                            ? String(localized: "feature.auth.giao.vien.chua.tu.at.lai.mat.khau.uoc")
                            : String(localized: "feature.auth.nho.giao.vien.cap.lai.mat.khau.cho.so.ien.thoai"))
            AuthPhoneField(label: String(localized: "feature.auth.so.ien.thoai.cua.ban"), digits: $phone, readOnly: true,
                           identifier: "forgot.phone")
                .padding(.top, 22)

            if isTeacher {
                AuthBanner(text: String(localized: "feature.auth.lien.he.quan.tri.vien.khong.gian.lam.viec"), tone: .warning)
                AuthNote(text: String(localized: "feature.auth.hien.chua.co.tu.phuc.hoi.mat.khau.cho.giao.vien"))
            } else {
                steps
            }
            AuthNote(text: String(localized: "feature.auth.khong.co.ma.nao.uoc.gui.en.ien.thoai.cua.ban"))
            Spacer(minLength: 0)
            AuthSubmitButton(title: String(localized: "feature.auth.quay.lai.ang.nhap")) { model.show(.login) }
                .padding(.top, 24)
        }
        .onAppear { phone = model.recoveryPhone }
    }

    private var steps: some View {
        VStack(spacing: 18) {
            step(1, String(localized: "feature.auth.bao.so.ien.thoai.nay.cho.giao.vien.cua.con"))
            step(2, String(localized: "feature.auth.giao.vien.bam.cap.lai.mat.khau.o.ho.so.hoc.sinh"))
            step(3, String(localized: "feature.auth.ang.nhap.bang.mat.khau.tam.roi.oi.mat.khau.moi"))
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
