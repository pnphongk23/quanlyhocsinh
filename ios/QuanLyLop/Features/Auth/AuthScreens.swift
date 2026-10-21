import SwiftUI

// MARK: - Đăng nhập (`src/features/auth/LoginPage.tsx`)

struct AuthLoginView: View {
    let model: AuthModel
    @State private var phone = ""
    @State private var password = ""

    var body: some View {
        AuthPage {
            AuthBrand()
            AuthTitle(text: "Đăng nhập")
            AuthDescription(text: "Dành cho giáo viên và phụ huynh.")
            if model.isLocked {
                AuthBanner(text: AuthCopy.loginLocked, tone: .warning)
            } else if let message = model.message {
                AuthBanner(text: message, tone: .error)
            }
            VStack(spacing: 20) {
                AuthPhoneField(label: "Số điện thoại", digits: $phone,
                               disabled: model.isLocked,
                               hasError: model.message != nil && !model.isLocked,
                               identifier: "login.phone")
                AuthPasswordField(label: "Mật khẩu", value: $password,
                                  hasError: model.message != nil && !model.isLocked,
                                  disabled: model.isLocked,
                                  identifier: "login.password")
                HStack {
                    Spacer(minLength: 0)
                    Button("Quên mật khẩu?") {
                        model.showForgotPassword(phone: phone,
                                                 isTeacher: model.activeMembership?.role.scopeKind == .workspace)
                    }
                    .appText(AuthText.link)
                    .foregroundStyle(AppColors.primary)
                }
                AuthSubmitButton(title: "Đăng nhập", disabled: model.isLocked) {
                    Task { await model.login(phone: phone, password: password) }
                }
            }
            .padding(.top, 24)

            VStack(spacing: 16) {
                Button { model.show(.register) } label: {
                    (Text("Chưa có không gian làm việc? ").foregroundStyle(AppColors.muted)
                     + Text("Đăng ký cho giáo viên").foregroundStyle(AppColors.primary))
                        .appText(AuthText.note)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }
                .buttonStyle(.plain)
                AuthHintCard(lead: "Phụ huynh: ", text: "dùng số điện thoại đã đăng ký với giáo viên và mật khẩu giáo viên cấp.")
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
            AuthTitle(text: "Tạo không gian làm việc")
            if let message = model.message { AuthBanner(text: message, tone: .error) }
            VStack(spacing: 20) {
                AuthTextField(label: "Tên hiển thị", text: $name, placeholder: "Cô Lan",
                              identifier: "register.name")
                AuthTextField(label: "Tên không gian làm việc", text: $workspace,
                              placeholder: "Lớp của cô Lan", identifier: "register.workspace")
                AuthPhoneField(label: "Số điện thoại", digits: $phone, identifier: "register.phone")
                AuthPasswordField(label: "Mật khẩu", value: $password, autoComplete: .newPassword,
                                  identifier: "register.password",
                                  strengthPassword: password)
                AuthCheckRow(ok: password.count >= 8, text: "Tối thiểu 8 ký tự")
                AuthPasswordField(label: "Nhập lại mật khẩu", value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "register.confirm")
                Text("Người tạo là quản trị viên đầu tiên của không gian làm việc.")
                    .appText(AuthText.note)
                    .foregroundStyle(AppColors.muted)
                AuthSubmitButton(title: "Tạo không gian làm việc") {
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
            AuthTitle(text: "Đổi mật khẩu")
            AuthDescription(text: "Bạn đang dùng mật khẩu tạm do giáo viên cấp. Hãy đặt mật khẩu mới để tiếp tục.")
            VStack(spacing: 20) {
                AuthPasswordField(label: "Mật khẩu hiện tại (mật khẩu tạm)", value: $current,
                                  identifier: "forced.current")
                AuthPasswordField(label: "Mật khẩu mới", value: $newPassword,
                                  autoComplete: .newPassword,
                                  hasError: tooShort || duplicateTemp,
                                  errorText: duplicateTemp ? AuthCopy.sameAsTemp : nil,
                                  identifier: "forced.new",
                                  strengthPassword: newPassword)
                AuthPasswordField(label: "Nhập lại mật khẩu mới", value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "forced.confirm")
                VStack(spacing: 10) {
                    AuthCheckRow(ok: newPassword.count >= 8, text: "Tối thiểu 8 ký tự")
                    AuthCheckRow(ok: !newPassword.isEmpty && !duplicateTemp, text: "Khác mật khẩu tạm")
                }
                if let message = model.message, !duplicateTemp {
                    Text(message).appText(AuthText.fieldError).foregroundStyle(AppColors.error)
                }
                AuthSubmitButton(title: "Đổi mật khẩu và tiếp tục", disabled: blocked) {
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
            AuthTitle(text: "Quên mật khẩu?")
            AuthDescription(text: isTeacher
                            ? "Giáo viên chưa tự đặt lại mật khẩu được."
                            : "Nhờ giáo viên cấp lại mật khẩu cho số điện thoại của bạn.")
            AuthPhoneField(label: "Số điện thoại của bạn", digits: $phone, readOnly: true,
                           identifier: "forgot.phone")
                .padding(.top, 22)

            if isTeacher {
                AuthBanner(text: "Liên hệ quản trị viên không gian làm việc", tone: .warning)
                AuthNote(text: "Hiện chưa có tự phục hồi mật khẩu cho giáo viên. Quản trị viên sẽ cấp mật khẩu mới cho bạn.")
            } else {
                steps
            }
            AuthNote(text: "Không có mã nào được gửi đến điện thoại của bạn.")
            Spacer(minLength: 0)
            AuthSubmitButton(title: "Quay lại đăng nhập") { model.show(.login) }
                .padding(.top, 24)
        }
        .onAppear { phone = model.recoveryPhone }
    }

    private var steps: some View {
        VStack(spacing: 18) {
            step(1, "Báo số điện thoại này cho giáo viên của con.")
            step(2, "Giáo viên bấm “Cấp lại mật khẩu” ở hồ sơ học sinh.")
            step(3, "Đăng nhập bằng mật khẩu tạm rồi đổi mật khẩu mới.")
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
            AuthTitle(text: "Chọn vai trò")
            if let user = model.currentUser {
                AuthDescription(text: "Số \(AuthFormat.phone(user.phone)) có hơn một vai trò. Chọn một để vào.")
            }
            if model.memberships.isEmpty {
                AuthNote(text: "Tài khoản của bạn chưa có vai trò nào đang hoạt động trong không gian làm việc này.")
            }
            VStack(spacing: 14) {
                ForEach(model.memberships, id: \.id) { membership in
                    roleCard(membership)
                }
            }
            .padding(.top, 26)
            if let message = model.message { AuthBanner(text: message, tone: .error) }
            // `.pickerFooter` chỉ cách danh sách 28 pt, không bị đẩy xuống đáy màn.
            Text("Bạn đổi được vai trò bất cứ lúc nào trong Cài đặt.")
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
            return "Bé Gia Bảo"
        }
#endif
        return model.subtitle(for: membership)
    }
}
