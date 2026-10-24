import SwiftUI

// MARK: - Cài đặt tài khoản (`src/features/settings/SettingsPage.tsx`, mobile)

struct AuthSettingsView: View {
    /// Trang Cài đặt nằm trong khung app, không phải trang auth: khung phụ huynh đệm 16 20
    /// (`guardianShell.module.css` `.content`), nên tiêu đề và thẻ canh theo đệm đó.
    static let shellPadding: CGFloat = 20
    static let shellTopPadding: CGFloat = 16

    let model: AuthModel
    /// Guardian meta from the live dashboard: "Phụ huynh · Bé Gia Bảo (6A), Bé Bảo Ngọc (6A)".
    var guardianMeta: String? = nil
    /// Teacher chrome is owned by the teacher shell; this back control is its exit.
    var onClose: (() -> Void)? = nil
    /// Root of the teacher Cài đặt tab: the system navigation bar owns the large title, so the
    /// page draws no title, no back control and no extra top padding.
    var isRootTab = false

    var body: some View {
        AuthPage(title: onClose == nil && !isRootTab ? String(localized: "feature.auth.cai.at") : nil,
                 horizontalPadding: AuthSettingsView.shellPadding,
                 topPadding: isRootTab ? 0 : AuthSettingsView.shellTopPadding) {
            if let onClose { backRow(onClose) }
              if let user = model.currentUser {
                  let membership = model.activeMembership
                  profileCard(user: user, membership: membership)
                      .padding(.top, isRootTab ? TeacherMetrics.listGap : TeacherMetrics.cardPadding)
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
        .modifier(RootTabTitle(isRootTab: isRootTab))
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
                .accessibilityLabel(String(localized: "feature.auth.quay.lai"))
                Spacer(minLength: 0)
            }
            .padding(.bottom, 8)
            Text(String(localized: "feature.auth.cai.at")).appText(AuthText.settingsTitle).foregroundStyle(AppColors.text)
        }
    }

    private func profileCard(user: User, membership: Membership?) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 16) {
                  Text(AppInitials.of(displayName(user, membership)))
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
            profileRow(String(localized: "feature.auth.ten.hien.thi")) {
                Text(displayName(user, membership))
                    .appText(AuthText.profileValue)
                    .foregroundStyle(AppColors.text)
            }
            profileRow(String(localized: "feature.auth.so.ien.thoai")) {
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

    private func menuCard(user: User, membership: Membership?) -> some View {
        VStack(spacing: 0) {
            Button { model.show(.changePassword) } label: {
                menuRow(String(localized: "feature.auth.oi.mat.khau")) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(AppColors.muted)
                }
            }
            .buttonStyle(.plain)
              if model.memberships.count > 1, let membership {
                Button { model.changeRoleFromSettings() } label: {
                    menuRow(String(localized: "feature.auth.oi.vai.tro")) {
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
            if title == String(localized: "feature.auth.oi.vai.tro") { AppColors.divider.frame(height: 1) }
        }
    }

    private var logoutButton: some View {
        Button { Task { await model.logout() } } label: {
            Text(String(localized: "feature.auth.ang.xuat"))
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
        AuthLogoutBlockedSheet(message: block.message) {
            model.dismissLogoutBlock()
        } retry: {
            Task {
                await model.retrySync()
                model.dismissLogoutBlock()
            }
        }
    }

    private func displayName(_ user: User, _ membership: Membership?) -> String {
          if let name = user.displayName, !name.isEmpty { return name }
          return membership.map { AuthRoleBadge.label($0.role) } ?? String(localized: "feature.auth.phu.huynh")
      }

    private func roleLine(_ membership: Membership?) -> String {
          guard let membership else { return String(localized: "feature.auth.phu.huynh") }
        let badge = AuthRoleBadge.label(membership.role)
        if membership.role.scopeKind == .linkedStudents, let guardianMeta, !guardianMeta.isEmpty {
            return "\(badge) · \(guardianMeta)"
        }
        return "\(badge) · \(membership.workspace.name)"
    }
}

private struct RootTabTitle: ViewModifier {
    let isRootTab: Bool

    func body(content: Content) -> some View {
        if isRootTab {
            content
                .navigationTitle(String(localized: "feature.auth.cai.at"))
                .navigationBarTitleDisplayMode(.large)
        } else {
            content
        }
    }
}

private struct PushedTitle: ViewModifier {
    let isPushed: Bool

    func body(content: Content) -> some View {
        if isPushed {
            content
                .navigationTitle(String(localized: "feature.auth.oi.mat.khau"))
                .navigationBarTitleDisplayMode(.inline)
        } else {
            content
        }
    }
}

extension LogoutBlock: Identifiable {
    var id: String { "\(pending)-\(online)" }
}

/// `LogoutBlocked` mở dạng `sheet` trong `SettingsPage.tsx` (`.dialog .sheet`): rộng hết màn,
/// bo trên 20, đệm 24, đầu mục 18/700 kèm nút "Đóng", thân 16/1.5, hai nút 48 xếp dọc cách 10.
///
/// Không dùng `AppSheet` của lõi: nó mở detent `.medium`/`.large` (cao gần nửa màn) và có
/// thanh kéo, trong khi prototype cao theo nội dung và không có thanh kéo.
private struct AuthLogoutBlockedSheet: View {
    let message: String
    let close: () -> Void
    let retry: () -> Void

    @State private var height: CGFloat = 300

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 16) {
                Text(String(localized: "feature.auth.chua.the.ang.xuat"))
                    .appText(AppText.heading)
                    .foregroundStyle(AppColors.text)
                Spacer(minLength: 0)
                Button(action: close) {
                    Text(String(localized: "feature.auth.ong"))
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(AppColors.primaryInk)
                        .padding(.horizontal, 16)
                        .frame(minHeight: AppMetrics.tap)
                        .background(AppColors.primarySoft,
                                    in: RoundedRectangle(cornerRadius: AppRadius.button))
                }
                .buttonStyle(.plain)
            }
            .padding(.bottom, 16)
            Text(message)
                .appText(AppTextStyle(size: 16, weight: .regular, lineHeight: 24))
                .foregroundStyle(AppColors.text)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
            VStack(spacing: 10) {
                SettingsDialogButton(title: String(localized: "feature.auth.a.hieu"), variant: .secondary, action: close)
                SettingsDialogButton(title: String(localized: "feature.auth.thu.ong.bo.lai"), variant: .primary, action: retry)
            }
            .padding(.top, 18)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            GeometryReader { proxy in
                AppColors.surface
                    .onAppear { height = proxy.size.height }
                    .onChange(of: proxy.size.height) { _, value in height = value }
            }
        }
        .presentationDetents([.height(height)])
        .presentationDragIndicator(.hidden)
        .presentationCornerRadius(20)
    }
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
    /// Pushed inside a tab's NavigationStack: the system bar owns the title and back control.
    var isPushed = false
    var onBack: () -> Void
    @State private var current = ""
    @State private var newPassword = ""
    @State private var confirmation = ""
    @State private var saveController = AppSaveController()

    private var mismatch: Bool { !confirmation.isEmpty && confirmation != newPassword }

    var body: some View {
        AuthPage(horizontalPadding: AuthSettingsView.shellPadding,
                 topPadding: isPushed ? 0 : AuthSettingsView.shellTopPadding) {
            if !isPushed {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(AppColors.text)
                        .frame(width: 48, height: 48)
                        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 14))
                }
                .accessibilityLabel(String(localized: "feature.auth.quay.lai"))
                .padding(.bottom, 8)
                Text(String(localized: "feature.auth.oi.mat.khau")).appText(AuthText.settingsTitle).foregroundStyle(AppColors.text)
            }
            VStack(spacing: 20) {
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau.hien.tai"), value: $current,
                                  identifier: "change.current")
                AuthPasswordField(label: String(localized: "feature.auth.mat.khau.moi"), value: $newPassword,
                                  autoComplete: .newPassword,
                                  hasError: model.message != nil,
                                  errorText: model.message,
                                  identifier: "change.new",
                                  strengthPassword: newPassword)
                AuthPasswordField(label: String(localized: "feature.auth.nhap.lai.mat.khau.moi"), value: $confirmation,
                                  autoComplete: .newPassword, hasError: mismatch,
                                  errorText: mismatch ? AuthCopy.passwordMismatch : nil,
                                  identifier: "change.confirm")
                AuthCheckRow(ok: newPassword.count >= 8, text: String(localized: "feature.auth.toi.thieu.8.ky.tu"))
                    AppSaveButton(title: String(localized: "feature.auth.luu.mat.khau.moi"),
                                controller: saveController, isEnabled: !blocked) {
                      try await model.changePassword(current: current, newPassword: newPassword,
                                                     confirmation: confirmation)
                  }
            }
            .padding(.top, isPushed ? TeacherMetrics.listGap : AppMetrics.sectionGap)
        }
        .modifier(PushedTitle(isPushed: isPushed))
        .onChange(of: saveController.phase) { _, phase in
            if phase == .saved { model.completePasswordChange() }
        }
    }

    private var blocked: Bool {
        current.isEmpty || newPassword.count < 8 || mismatch || confirmation.isEmpty
    }
}
