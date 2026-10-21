import SwiftUI

// MARK: - Cài đặt tài khoản (`src/features/settings/SettingsPage.tsx`, mobile)

struct AuthSettingsView: View {
    let model: AuthModel
    /// Guardian meta from the live dashboard: "Phụ huynh · Bé Gia Bảo (6A), Bé Bảo Ngọc (6A)".
    var guardianMeta: String? = nil
    /// Teacher chrome is owned by the teacher shell; this back control is its exit.
    var onClose: (() -> Void)? = nil

    var body: some View {
        AuthPage(title: onClose == nil ? "Cài đặt" : nil) {
            if let onClose { backRow(onClose) }
            if let user = model.currentUser, let membership = model.activeMembership {
                profileCard(user: user, membership: membership)
                    .padding(.top, 16)
                menuCard(user: user, membership: membership)
                    .padding(.top, 16)
                if let message = model.message {
                    Text(message)
                        .appText(AuthText.banner)
                        .foregroundStyle(AppColors.error)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: AppRadius.control))
                        .padding(.top, 16)
                }
                logoutButton
                    .padding(.top, 16)
            }
        }
        .sheet(item: logoutBlockBinding) { block in
            logoutSheet(block)
        }
    }

    private func backRow(_ close: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Button(action: close) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(AppColors.text)
                        .frame(width: 48, height: 48)
                        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 14))
                }
                .accessibilityLabel("Quay lại")
                Spacer(minLength: 0)
            }
            .padding(.bottom, 8)
            Text("Cài đặt").appText(AuthText.settingsTitle).foregroundStyle(AppColors.text)
        }
    }

    private func profileCard(user: User, membership: Membership) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 16) {
                Text(AuthFormat.initials(displayName(user, membership)) .isEmpty
                     ? "GV" : AuthFormat.initials(displayName(user, membership)))
                    .font(AppFont.font(size: 20, weight: .bold))
                    .foregroundStyle(AppColors.primaryInk)
                    .frame(width: 64, height: 64)
                    .background(AppColors.primarySoft, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(displayName(user, membership))
                        .appText(AuthText.profileName)
                        .foregroundStyle(AppColors.text)
                    Text(roleLine(membership))
                        .appText(AuthText.profileMeta)
                        .foregroundStyle(AppColors.muted)
                }
                Spacer(minLength: 0)
            }
            .padding(20)
            profileRow("Tên hiển thị") {
                Text(displayName(user, membership))
                    .appText(AuthText.profileValue)
                    .foregroundStyle(AppColors.text)
            }
            profileRow("Số điện thoại") {
                HStack(spacing: 6) {
                    Image(systemName: "lock")
                        .font(.system(size: 16, weight: .regular))
                        .foregroundStyle(AppColors.muted)
                    Text(AuthFormat.phone(user.phone))
                        .appText(AuthText.profileValue)
                        .foregroundStyle(AppColors.text)
                }
            }
        }
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func profileRow<Value: View>(_ label: String, @ViewBuilder value: () -> Value) -> some View {
        HStack(alignment: .center, spacing: 16) {
            Text(label).appText(AuthText.profileLabel).foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
            value()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 18)
        .overlay(alignment: .top) { AppColors.divider.frame(height: 1) }
    }

    private func menuCard(user: User, membership: Membership) -> some View {
        VStack(spacing: 0) {
            Button { model.show(.changePassword) } label: {
                menuRow("Đổi mật khẩu") {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(AppColors.muted)
                }
            }
            .buttonStyle(.plain)
            if model.memberships.count > 1 {
                Button { model.changeRoleFromSettings() } label: {
                    menuRow("Đổi vai trò") {
                        HStack(spacing: 6) {
                            Text(AuthRoleBadge.label(membership.role))
                                .appText(AuthText.menuValue)
                                .foregroundStyle(AppColors.muted)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(AppColors.muted)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func menuRow<Trailing: View>(_ title: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        HStack(spacing: 12) {
            Text(title).appText(AuthText.menuLabel).foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
            trailing()
        }
        .padding(.horizontal, 20)
        .frame(minHeight: 60)
        .contentShape(Rectangle())
        .overlay(alignment: .top) {
            if title == "Đổi vai trò" { AppColors.divider.frame(height: 1) }
        }
    }

    private var logoutButton: some View {
        Button { Task { await model.logout() } } label: {
            Text("Đăng xuất")
                .appText(AuthText.logout)
                .foregroundStyle(AppColors.error)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 56)
                .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: AppRadius.control))
        }
        .buttonStyle(.plain)
    }

    private var logoutBlockBinding: Binding<LogoutBlock?> {
        Binding(
            get: { model.logoutBlock },
            set: { if $0 == nil { model.dismissLogoutBlock() } }
        )
    }

    private func logoutSheet(_ block: LogoutBlock) -> some View {
        AppSheet(title: "Chưa thể đăng xuất") {
            Text(block.message)
                .appText(AuthText.confirm)
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        } footer: {
            SettingsDialogButton(title: "Đã hiểu", variant: .secondary) { model.dismissLogoutBlock() }
            SettingsDialogButton(title: "Thử đồng bộ lại", variant: .primary) {
                Task {
                    await model.retrySync()
                    model.dismissLogoutBlock()
                }
            }
        } close: {
            model.dismissLogoutBlock()
        }
    }

    private func displayName(_ user: User, _ membership: Membership) -> String {
        if let name = user.displayName, !name.isEmpty { return name }
        return AuthRoleBadge.label(membership.role)
    }

    private func roleLine(_ membership: Membership) -> String {
        let badge = AuthRoleBadge.label(membership.role)
        if membership.role.scopeKind == .linkedStudents, let guardianMeta, !guardianMeta.isEmpty {
            return "\(badge) · \(guardianMeta)"
        }
        return "\(badge) · \(membership.workspace.name)"
    }
}

extension LogoutBlock: Identifiable {
    var id: String { "\(pending)-\(online)" }
}

/// `.confirmPrimary` / `.confirmSecondary`: 48 high, radius `--radius-button`, 16 / 700.
struct SettingsDialogButton: View {
    enum Variant { case primary, secondary }
    let title: String
    let variant: Variant
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .appText(AuthText.submit)
                .foregroundStyle(variant == .primary ? AppColors.onPrimary : AppColors.primaryInk)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 48)
                .background(variant == .primary ? AppColors.primary : AppColors.primarySoft,
                            in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Đổi mật khẩu trong Cài đặt (`src/features/settings/ChangePasswordPage.tsx`)

struct AuthChangePasswordView: View {
    let model: AuthModel
    var onBack: () -> Void
    @State private var current = ""
    @State private var newPassword = ""
    @State private var confirmation = ""

    private var mismatch: Bool { !confirmation.isEmpty && confirmation != newPassword }

    var body: some View {
        AuthPage {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppColors.text)
                    .frame(width: 48, height: 48)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 14))
            }
            .accessibilityLabel("Quay lại")
            .padding(.bottom, 8)
            Text("Đổi mật khẩu").appText(AuthText.settingsTitle).foregroundStyle(AppColors.text)
            VStack(spacing: 20) {
                AuthPasswordField(label: "Mật khẩu hiện tại", value: $current,
                                  identifier: "change.current")
                AuthPasswordField(label: "Mật khẩu mới", value: $newPassword,
                                  autoComplete: .newPassword,
                                  hasError: model.message != nil,
                                  errorText: model.message,
                                  identifier: "change.new",
                                  strengthPassword: newPassword)
                AuthPasswordField(label: "Nhập lại mật khẩu mới", value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "change.confirm")
                AuthCheckRow(ok: newPassword.count >= 8, text: "Tối thiểu 8 ký tự")
                AuthSubmitButton(title: "Lưu mật khẩu mới", disabled: blocked) {
                    Task {
                        await model.changePassword(current: current, newPassword: newPassword,
                                                   confirmation: confirmation)
                    }
                }
            }
            .padding(.top, 24)
        }
    }

    private var blocked: Bool {
        current.isEmpty || newPassword.count < 8 || mismatch || confirmation.isEmpty
    }
}
