import SwiftUI
import UIKit

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
                Text("Không thể đọc cấu hình ứng dụng.").appText(AppText.body).foregroundStyle(AppColors.error)
                    .frame(maxWidth: .infinity, maxHeight: .infinity).background(AppColors.background)
            } else { switch model.screen {
            case .loading: loading
            case .login: LoginView(model: model)
            case .register: RegisterView(model: model)
            case .forgot: ForgotPasswordView(model: model)
            case .forcedPassword: PasswordFormView(model: model, forced: true)
            case .chooseRole: RolePickerView(model: model)
            case .main: authenticatedRoot
            case .settings: SettingsView(model: model)
            case .changePassword: PasswordFormView(model: model, forced: false)
            } }
        }
        .task { if model.screen == .loading { await model.restoreSession() } }
        .preferredColorScheme(.light)
    }

    private var loading: some View {
        VStack(spacing: 12) { ProgressView(); Text("Đang tải tài khoản…").appText(AppText.muted) }
            .frame(maxWidth: .infinity, maxHeight: .infinity).background(AppColors.background)
    }

    @ViewBuilder private var authenticatedRoot: some View {
        if model.activeMembership?.role.scopeKind == .linkedStudents {
            NavigationStack {
                GuardianRootView()
                    .toolbar { accountToolbar }
            }
        } else {
            NavigationStack {
                TeacherRootView()
                    .toolbar { accountToolbar }
            }
        }
    }

    @ToolbarContentBuilder private var accountToolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button { model.show(.settings) } label: { Image(systemName: "person.crop.circle") }
                .accessibilityLabel("Cài đặt tài khoản")
        }
    }
}

private struct LoginView: View {
    let model: AuthModel
    @State private var phone = ""
    @State private var password = ""
    @State private var showPassword = false

    var body: some View {
        AuthPage {
            AuthBrand()
            Text("Đăng nhập").appText(AuthText.title).padding(.top, 28)
            Text("Dành cho giáo viên và phụ huynh.").appText(AuthText.body).foregroundStyle(AppColors.muted)
            if model.isLocked { NoticeBox(text: "Thử sai quá nhiều lần, thử lại sau 15 phút", tone: .warning) }
            else if let message = model.message { NoticeBox(text: message, tone: .error) }
            PhoneField(value: $phone)
            SecureEntry(label: "Mật khẩu", value: $password, shown: $showPassword)
            HStack { Spacer(); Button("Quên mật khẩu?") { model.showForgotPassword(phone: phone) }.foregroundStyle(AppColors.primaryInk) }
            AuthActionButton(title: "Đăng nhập", disabled: phone.isEmpty || password.isEmpty || model.isLocked) {
                Task { await model.login(phone: phone, password: password) }
            }
            Spacer(minLength: 40)
            Text("Chưa có không gian làm việc?").appText(AuthText.body).foregroundStyle(AppColors.muted)
            Button("Đăng ký cho giáo viên") { model.show(.register) }.foregroundStyle(AppColors.primaryInk)
            Text("Phụ huynh: dùng số điện thoại đã đăng ký với giáo viên và mật khẩu giáo viên cấp.")
                .appText(AuthText.body).foregroundStyle(AppColors.muted).padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
    }
}

private struct RegisterView: View {
    let model: AuthModel
    @State private var name = ""
    @State private var workspace = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmation = ""
    @State private var showPassword = false
    @State private var showConfirmation = false

    var body: some View {
        AuthPage {
            BackLink(title: "Quay lại đăng nhập") { model.show(.login) }
            Text("Tạo không gian làm việc").appText(AuthText.title).padding(.top, 24)
            if let message = model.message { NoticeBox(text: message, tone: .error) }
            TextEntry(label: "Tên hiển thị", value: $name, placeholder: "Cô Lan")
            TextEntry(label: "Tên không gian làm việc", value: $workspace, placeholder: "Lớp của cô Lan")
            PhoneField(value: $phone)
            SecureEntry(label: "Mật khẩu", value: $password, shown: $showPassword, contentType: .newPassword)
            PasswordStrength(password: password)
            CheckRow(ok: password.count >= 8) { Text("Tối thiểu 8 ký tự") }
            SecureEntry(label: "Nhập lại mật khẩu", value: $confirmation, shown: $showConfirmation,
                        contentType: .newPassword,
                        error: confirmation.isEmpty || confirmation == password ? nil : "Mật khẩu nhập lại chưa khớp.")
            Text("Người tạo là quản trị viên đầu tiên của không gian làm việc.")
                .appText(AppText.muted).foregroundStyle(AppColors.muted)
            AuthActionButton(title: "Tạo không gian làm việc", disabled: name.isEmpty || workspace.isEmpty || phone.isEmpty || password.isEmpty || confirmation.isEmpty) {
                Task { await model.register(name: name, workspace: workspace, phone: phone,
                                            password: password, confirmation: confirmation) }
            }
        }
    }
}

private struct PasswordFormView: View {
    let model: AuthModel
    let forced: Bool
    @State private var current = ""
    @State private var newPassword = ""
    @State private var confirmation = ""
    @State private var showCurrent = false
    @State private var showNew = false
    @State private var showConfirm = false

    var body: some View {
        AuthPage {
            Text("Đổi mật khẩu").appText(AuthText.title)
            if forced {
                Text("Bạn đang dùng mật khẩu tạm do giáo viên cấp. Hãy đặt mật khẩu mới để tiếp tục.")
                    .appText(AuthText.body).foregroundStyle(AppColors.muted)
            } else {
                BackLink(title: "Quay lại") { model.show(.settings) }
            }
            if let message = model.message { NoticeBox(text: message, tone: .error) }
            SecureEntry(label: forced ? "Mật khẩu hiện tại (mật khẩu tạm)" : "Mật khẩu hiện tại",
                        value: $current, shown: $showCurrent)
            SecureEntry(label: "Mật khẩu mới", value: $newPassword, shown: $showNew,
                        contentType: .newPassword,
                        error: forced && !newPassword.isEmpty && newPassword == current
                            ? "Mật khẩu mới không được trùng mật khẩu tạm." : nil)
            PasswordStrength(password: newPassword)
            SecureEntry(label: "Nhập lại mật khẩu mới", value: $confirmation, shown: $showConfirm,
                        contentType: .newPassword,
                        error: confirmation.isEmpty || confirmation == newPassword ? nil : "Mật khẩu nhập lại chưa khớp.")
            CheckRow(ok: newPassword.count >= 8) { Text("Tối thiểu 8 ký tự") }
            if forced { CheckRow(ok: !newPassword.isEmpty && newPassword != current) { Text("Khác mật khẩu tạm") } }
            AuthActionButton(title: forced ? "Đổi mật khẩu và tiếp tục" : "Lưu mật khẩu mới",
                             disabled: current.isEmpty || newPassword.count < 8 || confirmation.isEmpty || newPassword != confirmation || (forced && current == newPassword)) {
                Task { await model.changePassword(current: current, newPassword: newPassword, confirmation: confirmation) }
            }
        }
    }
}

private struct ForgotPasswordView: View {
    let model: AuthModel
    var body: some View {
        AuthPage {
            BackLink(title: "Quay lại đăng nhập") { model.show(.login) }
            Text("Quên mật khẩu?").appText(AuthText.title).padding(.top, 24)
            Text("Phụ huynh: nhờ giáo viên cấp lại mật khẩu cho số điện thoại của bạn. Giáo viên chưa tự đặt lại mật khẩu được.")
                .appText(AuthText.body).foregroundStyle(AppColors.muted)
            if !model.recoveryPhone.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Số điện thoại của bạn").appText(AppText.label)
                    HStack {
                        Text("+84").foregroundStyle(AppColors.muted).padding(.trailing, 12)
                        AppColors.divider.frame(width: 1, height: 28)
                        Text(model.recoveryPhone).foregroundStyle(AppColors.muted)
                        Spacer()
                        Image(systemName: "lock.fill").foregroundStyle(AppColors.muted)
                    }.appText(AppText.body).padding(.horizontal, 16).frame(minHeight: 52)
                        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                }
            }
            NoticeBox(text: "Phụ huynh liên hệ giáo viên của con. Giáo viên liên hệ quản trị viên không gian làm việc.", tone: .neutral)
            Spacer()
        }
    }
}

private struct RolePickerView: View {
    let model: AuthModel
    var body: some View {
        AuthPage {
              Text("Chọn vai trò").appText(AuthText.title)
            if let user = model.currentUser {
                Text("Số \(formattedPhone(user.phone)) có hơn một vai trò. Chọn một để vào.")
                      .appText(AuthText.body).foregroundStyle(AppColors.muted)
            }
            if let message = model.message { NoticeBox(text: message, tone: .error) }
            ForEach(model.memberships, id: \.id) { membership in
                Button { Task { await model.selectMembership(membership) } } label: {
                    HStack(spacing: 14) {
                        Text(membership.role.scopeKind == .linkedStudents ? "PH" : "GV")
                            .font(.system(size: 16, weight: .bold)).foregroundStyle(AppColors.primaryInk)
                            .frame(width: 44, height: 44).background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: 12))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(membership.role.name).appText(AppText.heading).foregroundStyle(AppColors.text)
                            Text(membership.workspace.name).appText(AppText.body).foregroundStyle(AppColors.muted)
                        }
                        Spacer(); Image(systemName: "chevron.right").foregroundStyle(AppColors.muted)
                    }
                    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
                }.buttonStyle(.plain)
            }
            Spacer(minLength: 80)
            Text("Bạn đổi được vai trò bất cứ lúc nào trong Cài đặt.")
                  .appText(AuthText.body).foregroundStyle(AppColors.muted)
        }
    }
}

private struct SettingsView: View {
    let model: AuthModel
    var body: some View {
        AuthPage {
            HStack {
                Button { model.show(.main) } label: { Image(systemName: "chevron.left") }
                    .accessibilityLabel("Quay lại")
                  Text("Cài đặt").appText(AuthText.settingsTitle)
            }
            if let message = model.message { NoticeBox(text: message, tone: .error) }
            if let user = model.currentUser, let membership = model.activeMembership {
                VStack(spacing: 0) {
                    HStack(spacing: 16) {
                        Text(initials(user.displayName ?? membership.role.name))
                            .font(.system(size: 20, weight: .bold)).foregroundStyle(AppColors.primaryInk)
                            .frame(width: 64, height: 64).background(AppColors.primarySoft, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(user.displayName ?? membership.role.name).appText(AppText.heading)
                            Text("\(membership.role.name) · \(membership.workspace.name)").appText(AppText.body).foregroundStyle(AppColors.muted)
                        }
                        Spacer(minLength: 0)
                    }.padding(20)
                    settingsRow("Tên hiển thị", value: user.displayName ?? "—")
                    settingsRow("Số điện thoại", value: formattedPhone(user.phone), locked: true)
                }.background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
                VStack(spacing: 0) {
                    Button { model.show(.changePassword) } label: { menuRow("Đổi mật khẩu", value: nil) }
                    if model.memberships.count > 1 {
                        Button { model.changeRoleFromSettings() } label: { menuRow("Đổi vai trò", value: membership.role.name) }
                    }
                }.background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
                  AuthActionButton(title: "Đăng xuất", disabled: false, danger: true) { Task { await model.logout() } }
            }
            Spacer(minLength: 0)
        }
        .sheet(isPresented: Binding(
            get: { model.pendingLogoutCount != nil }, set: { if !$0 { model.dismissLogoutBlock() } }
        )) {
            AppSheet(title: "Chưa thể đăng xuất", content: {
                Text("Còn \(model.pendingLogoutCount ?? 0) thay đổi chưa đồng bộ. Hãy kết nối mạng để đồng bộ rồi thử lại.")
                    .appText(AppText.body).foregroundStyle(AppColors.text)
            }, footer: {
                AppButton(title: "Thử đồng bộ lại", size: .medium) {
                    Task { await model.retrySync(); model.dismissLogoutBlock() }
                }
                AppButton(title: "Đã hiểu", variant: .secondary, size: .medium) { model.dismissLogoutBlock() }
            }, close: { model.dismissLogoutBlock() })
        }
    }

    private func settingsRow(_ title: String, value: String, locked: Bool = false) -> some View {
        HStack { Text(title).appText(AppText.subheading); Spacer(); if locked { Image(systemName: "lock.fill").foregroundStyle(AppColors.muted) }; Text(value).appText(AppText.body).foregroundStyle(AppColors.muted) }
            .padding(.horizontal, 20).padding(.vertical, 18).overlay(alignment: .top) { AppColors.divider.frame(height: 1) }
    }
    private func menuRow(_ title: String, value: String?) -> some View {
        HStack { Text(title).appText(AppText.heading).foregroundStyle(AppColors.text); Spacer(); if let value { Text(value).appText(AppText.body).foregroundStyle(AppColors.muted) }; Image(systemName: "chevron.right").foregroundStyle(AppColors.muted) }
            .padding(.horizontal, 20).frame(minHeight: 60).contentShape(Rectangle())
            .overlay(alignment: .top) { if title == "Đổi vai trò" { AppColors.divider.frame(height: 1) } }
    }
}

private struct AuthPage<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) { content }
                .padding(.horizontal, 24).padding(.top, 32).padding(.bottom, 32)
                .frame(maxWidth: 520, alignment: .leading).frame(maxWidth: .infinity, alignment: .top)
        }
        .background(AppColors.background.ignoresSafeArea())
        .scrollDismissesKeyboard(.interactively)
    }
}

private struct AuthBrand: View {
    var body: some View {
        HStack(spacing: 12) {
            Text("L").appText(AppText.heading).foregroundStyle(AppColors.onPrimary)
                .frame(width: 56, height: 56).background(AppColors.primary, in: RoundedRectangle(cornerRadius: 16))
            Text("Quản lý lớp tiếng Anh").appText(AppText.subheading)
        }
    }
}

private enum AuthText {
    static let title = AppTextStyle(size: 34, weight: .bold, lineHeight: 39.1, tracking: -0.68)
    static let settingsTitle = AppTextStyle(size: 32, weight: .bold, lineHeight: 36.8, tracking: -0.64)
    static let body = AppTextStyle(size: 17, weight: .regular, lineHeight: 24.65)
    static let label = AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5)
}

private struct AuthActionButton: View {
    let title: String
    var disabled = false
    var danger = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title).font(AppFont.font(size: 17, weight: .bold))
                .foregroundStyle(danger ? AppColors.error : AppColors.onPrimary)
                .frame(maxWidth: .infinity).frame(minHeight: 56)
                .background(danger ? AppColors.errorSoft : (disabled ? AppColors.inputBorderStrong : AppColors.primary),
                            in: RoundedRectangle(cornerRadius: AppRadius.control))
        }
        .disabled(disabled)
    }
}

private struct BackLink: View {
    let title: String
    let action: () -> Void
    var body: some View { Button(action: action) { Label(title, systemImage: "chevron.left") }.foregroundStyle(AppColors.primaryInk) }
}

private struct PhoneField: View {
    @Binding var value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Số điện thoại").appText(AuthText.label).foregroundStyle(AppColors.text)
            HStack(spacing: 0) {
                Text("+84").appText(AuthText.body).foregroundStyle(AppColors.muted).padding(.horizontal, 14)
                AppColors.inputBorder.frame(width: 1, height: 52)
                TextField("900 000 001", text: $value).keyboardType(.numberPad).textContentType(.telephoneNumber)
                    .appText(AuthText.body).padding(.horizontal, 14).accessibilityIdentifier("auth.phone")
            }.frame(minHeight: 56).background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.control).stroke(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
        }
        .onChange(of: value) { _, new in
            let inputDigits = String(new.filter(\.isNumber))
            let national = inputDigits.hasPrefix("84") && inputDigits.count > 9
                ? String(inputDigits.dropFirst(2))
                : String(inputDigits.drop(while: { $0 == "0" }))
            let digits = String(national.prefix(9))
            if digits != new { value = digits }
        }
    }
}

private struct TextEntry: View {
    let label: String
    @Binding var value: String
    var placeholder = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).appText(AuthText.label)
            TextField(placeholder, text: $value).textInputAutocapitalization(.words)
                .appText(AuthText.body).padding(.horizontal, 16).frame(minHeight: 56)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.control).stroke(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
        }
    }
}

private struct SecureEntry: View {
    let label: String
    @Binding var value: String
    @Binding var shown: Bool
    var contentType: UITextContentType? = .password
    var error: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).appText(AuthText.label)
            HStack(spacing: 8) {
                Group {
                    if shown { TextField("", text: $value).textContentType(contentType) }
                    else { SecureField("", text: $value).textContentType(contentType) }
                }
                .textInputAutocapitalization(.never).autocorrectionDisabled().appText(AuthText.body)
                Button { shown.toggle() } label: { Image(systemName: shown ? "eye.slash" : "eye").foregroundStyle(AppColors.muted) }
                    .accessibilityLabel(shown ? "Ẩn mật khẩu" : "Hiện mật khẩu")
            }
            .padding(.horizontal, 16).frame(minHeight: 56)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
            .overlay(RoundedRectangle(cornerRadius: AppRadius.control).stroke(error == nil ? AppColors.inputBorder : AppColors.error, lineWidth: AppMetrics.borderWidth))
            if let error { Text(error).appText(AppText.fieldError).foregroundStyle(AppColors.error) }
        }
    }
}

private struct PasswordStrength: View {
    let password: String
    private var score: Int {
        guard !password.isEmpty else { return 0 }
        let hasLower = password.contains(where: { $0.isLowercase })
        let hasUpper = password.contains(where: { $0.isUppercase })
        let hasNumber = password.contains(where: \.isNumber)
        let hasSymbol = password.contains(where: { !$0.isLetter && !$0.isNumber && !$0.isWhitespace })
        return min(4, (password.count >= 8 ? 1 : 0) + (password.count >= 12 ? 1 : 0) + (hasLower && hasUpper ? 1 : 0) + (hasNumber || hasSymbol ? 1 : 0))
    }
    private var title: String { ["", "Yếu", "Trung bình", "Khá", "Mạnh"][score] }
    var body: some View {
        if !password.isEmpty {
            HStack(spacing: 6) {
                ForEach(0..<4) { index in Capsule().fill(index < score ? AppColors.success : AppColors.border).frame(height: 6) }
                Text(title).appText(AppText.label).foregroundStyle(score > 2 ? AppColors.success : AppColors.muted).fixedSize()
            }
        }
    }
}

private struct CheckRow<Content: View>: View {
    let ok: Bool
    @ViewBuilder let content: Content
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: ok ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(ok ? AppColors.success : AppColors.muted)
            content.appText(AppText.body).foregroundStyle(ok ? AppColors.success : AppColors.muted)
        }
    }
}

private struct NoticeBox: View {
    enum Tone: Equatable { case error, warning, neutral }
    let text: String
    let tone: Tone
    private var background: Color { tone == .error ? AppColors.errorSoft : tone == .warning ? AppColors.warningSoft : AppColors.surface }
    private var foreground: Color { tone == .error ? AppColors.error : tone == .warning ? AppColors.warning : AppColors.muted }
    var body: some View { Text(text).appText(AppText.body).foregroundStyle(foreground).padding(14).frame(maxWidth: .infinity, alignment: .leading).background(background, in: RoundedRectangle(cornerRadius: AppRadius.control)) }
}

private extension AppConfiguration {
    static let fallback = AppConfiguration(environment: .staging,
                                           apiBaseURL: URL(string: "https://staging.invalid")!,
                                           bundleIdentifier: "vn.quanlylop.app",
                                           appVersion: "0", buildNumber: "0")
}

private func formattedPhone(_ raw: String) -> String {
    let digits = raw.filter(\.isNumber)
    let national = digits.hasPrefix("84") ? String(digits.dropFirst(2)) : digits
    return "+84 " + national.chunked(into: 3).joined(separator: " ")
}

private func initials(_ name: String) -> String {
    let pieces = name.split(whereSeparator: \.isWhitespace)
    return String(pieces.suffix(2).compactMap(\.first)).uppercased()
}

private extension String {
    func chunked(into size: Int) -> [String] {
        stride(from: 0, to: count, by: size).map { start in
            let lower = index(startIndex, offsetBy: start)
            let upper = index(lower, offsetBy: min(size, count - start))
            return String(self[lower..<upper])
        }
    }
}
