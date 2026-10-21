import SwiftUI

/// Text styles measured in `features/auth/auth.module.css` and
/// `features/settings/settings.module.css` (mobile values only).
enum AuthText {
    /// `.title`: 34 / 700 / 1.15 / -0.02em, margin-top 30.
    static let title = AppTextStyle(size: 34, weight: .bold, lineHeight: 39.1, tracking: -0.68)
    /// `.description`: 17 / 1.45, margin-top 8.
    static let description = AppTextStyle(size: 17, weight: .regular, lineHeight: 24.65)
    /// `.field > label`: 15 / 700.
    static let fieldLabel = AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5)
    /// `.phoneInput` / `.passwordInput` / `.textInput`: 17.
    static let input = AppTextStyle(size: 17, weight: .regular, lineHeight: 25.5)
    /// `.prefix`: 17 / 600.
    static let prefix = AppTextStyle(size: 17, weight: .semiBold, lineHeight: 25.5)
    /// `.fieldError`: 15 / 600.
    static let fieldError = AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5)
    /// `.banner`: 16 / 600 / 1.4.
    static let banner = AppTextStyle(size: 16, weight: .semiBold, lineHeight: 22.4)
    /// `.submit`: 17 / 700.
    static let submit = AppTextStyle(size: 17, weight: .bold, lineHeight: 25.5)
    /// `.forgotLink`: 16 / 700.
    static let link = AppTextStyle(size: 16, weight: .bold, lineHeight: 24)
    /// `.registerRow` / `.hintCard` / `.note` / `.pickerFooter`: 15 / 1.5.
    static let note = AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5)
    /// `.registerLink`, `.hintCard strong`: 15 / 700.
    static let noteStrong = AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5)
    /// `.checkRow`: 16.
    static let check = AppTextStyle(size: 16, weight: .regular, lineHeight: 24)
    /// `.strengthLabel`: 15 / 700.
    static let strength = AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5)
    /// `.roleName`: 19 / 700.
    static let roleName = AppTextStyle(size: 19, weight: .bold, lineHeight: 28.5)
    /// `.roleMeta`: 15.
    static let roleMeta = AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5)
    /// `.step`: 16 / 1.45.
    static let step = AppTextStyle(size: 16, weight: .regular, lineHeight: 23.2)
    /// `.stepNum`: 14 / 700.
    static let stepNumber = AppTextStyle(size: 14, weight: .bold, lineHeight: 21)
    /// `.pageTitle` (settings): 32 / 700 / -0.02em.
    static let settingsTitle = AppTextStyle(size: 32, weight: .bold, lineHeight: 36.8, tracking: -0.64)
    /// `.profileName`: 19 / 700.
    static let profileName = AppTextStyle(size: 19, weight: .bold, lineHeight: 28.5)
    /// `.profileMeta`: 15.
    static let profileMeta = AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5)
    /// `.rowLabel`: 16 / 700.
    static let profileLabel = AppTextStyle(size: 16, weight: .bold, lineHeight: 24)
    /// `.rowValue`: 16.
    static let profileValue = AppTextStyle(size: 16, weight: .regular, lineHeight: 24)
    /// `.menuRow`: 17 / 700.
    static let menuLabel = AppTextStyle(size: 17, weight: .bold, lineHeight: 25.5)
    /// `.menuValue`: 16 / 500.
    static let menuValue = AppTextStyle(size: 16, weight: .medium, lineHeight: 24)
    /// `.logout`: 17 / 700.
    static let logout = AppTextStyle(size: 17, weight: .bold, lineHeight: 25.5)
    /// `.confirmText`: 16 / 1.5.
    static let confirm = AppTextStyle(size: 16, weight: .regular, lineHeight: 24)
}

/// `auth.module.css .page`: 32 / 24 / 24 page padding, background, full height.
/// The card is a plain column; on mobile there is no white panel (only ≥1024 has one).
struct AuthPage<Content: View>: View {
    var title: String? = nil
    /// `.page` của auth là 32 24 24; trang Cài đặt nằm trong khung app (`SettingsShell`)
    /// nên đệm theo khung: 16 20 (guardianShell.module.css `.content`).
    var horizontalPadding: CGFloat = 24
    var topPadding: CGFloat = 32
    @ViewBuilder let content: Content

    var body: some View {
        GeometryReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if let title {
                        Text(title).appText(AuthText.settingsTitle).foregroundStyle(AppColors.text)
                            .padding(.bottom, 16)
                    }
                    content
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(minHeight: proxy.size.height - 56, alignment: .top)
                .padding(.horizontal, horizontalPadding)
                .padding(.top, topPadding)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(AppColors.background.ignoresSafeArea())
    }
}

/// `.brand` + `.logo` + `.brandName`.
struct AuthBrand: View {
    var body: some View {
        HStack(spacing: 12) {
            Text("L")
                .font(AppFont.font(size: 24, weight: .bold))
                .foregroundStyle(AppColors.onPrimary)
                .frame(width: 56, height: 56)
                .background(AppColors.primary, in: RoundedRectangle(cornerRadius: 16))
            Text("Quản lý lớp tiếng Anh")
                .appText(AuthText.noteStrong)
                .foregroundStyle(AppColors.text)
        }
    }
}

/// `.title` (34 / 700, margin-top 30).
struct AuthTitle: View {
    let text: String
    var body: some View {
        Text(text)
            .appText(AuthText.title)
            .foregroundStyle(AppColors.text)
            .padding(.top, 30)
    }
}

/// `.description` (17 / 1.45, margin-top 8).
struct AuthDescription: View {
    let text: String
    var body: some View {
        Text(text)
            .appText(AuthText.description)
            .foregroundStyle(AppColors.muted)
            .padding(.top, 8)
    }
}

/// `.banner` / `.bannerError` / `.bannerWarn` / `.bannerTop`.
struct AuthBanner: View {
    enum Tone { case error, warning, info }
    let text: String
    var tone: Tone = .error
    var body: some View {
        Text(text)
            .appText(AuthText.banner)
            .foregroundStyle(foreground)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background, in: RoundedRectangle(cornerRadius: AppRadius.control))
            .padding(.top, 22)
    }

    private var foreground: Color {
        switch tone {
        case .error: AppColors.error
        case .warning: AppColors.warning
        case .info: AppColors.primaryInk
        }
    }
    private var background: Color {
        switch tone {
        case .error: AppColors.errorSoft
        case .warning: AppColors.warningSoft
        case .info: AppColors.primarySoft
        }
    }
}

/// `.submit`: full width, 56 high, `--radius-control`, disabled uses `--color-input-border-strong`.
struct AuthSubmitButton: View {
    let title: String
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .appText(AuthText.submit)
                .foregroundStyle(disabled ? AppColors.surface : AppColors.onPrimary)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 56)
                .background(disabled ? AppColors.inputBorderStrong : AppColors.primary,
                            in: RoundedRectangle(cornerRadius: AppRadius.control))
        }
        .disabled(disabled)
        .padding(.top, 6)
    }
}

/// `.backButton` (48 × 48 surface card) with `.backRow` margin below.
struct AuthBackButton: View {
    var label = "Quay lại đăng nhập"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "chevron.left")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(AppColors.text)
                .frame(width: 48, height: 48)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 14))
                .shadow(color: Color(.sRGB, red: 20 / 255, green: 24 / 255, blue: 31 / 255, opacity: 0.04),
                        radius: 2, x: 0, y: 1)
        }
        .accessibilityLabel(label)
        .padding(.bottom, 20)
    }
}

/// `.note` (15 / 1.5 muted, margin-top 18).
struct AuthNote: View {
    let text: String
    var topPadding: CGFloat = 18
    var body: some View {
        Text(text)
            .appText(AuthText.note)
            .foregroundStyle(AppColors.muted)
            .padding(.top, topPadding)
    }
}

/// `.hintCard`: `--color-neutral-soft`, radius 12, 15 / 1.5, bold lead-in.
struct AuthHintCard: View {
    let lead: String
    let text: String
    var body: some View {
        (Text(lead).font(AppFont.font(size: 15, weight: .bold)) + Text(text))
            .appText(AuthText.note)
            .foregroundStyle(AppColors.text)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.neutralSoft, in: RoundedRectangle(cornerRadius: 12))
    }
}

/// `.checks` + `.checkRow` + `.checkDot`.
struct AuthCheckRow: View {
    let ok: Bool
    let text: String
    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle().fill(ok ? AppColors.successSoft : AppColors.divider)
                if ok {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppColors.success)
                }
            }
            .frame(width: 22, height: 22)
            Text(text)
                .appText(AuthText.check)
                .foregroundStyle(ok ? AppColors.success : AppColors.muted)
        }
    }
}

/// `.strength` with four bars and the label; hidden while the password is empty.
struct AuthPasswordStrength: View {
    let password: String

    private var score: Int {
        guard !password.isEmpty else { return 0 }
        // Mirrors `passwordFeedback` in `src/data/authAccounts.ts`.
        var value = 0
        if password.count >= 8 { value += 1 }
        if password.count >= 12 { value += 1 }
        let lower = password.contains(where: { $0.isLowercase })
        let upper = password.contains(where: { $0.isUppercase })
        if lower && upper { value += 1 }
        let digit = password.contains(where: \.isNumber)
        let symbol = password.contains(where: { !$0.isLetter && !$0.isNumber && !$0.isWhitespace })
        if digit || symbol { value += 1 }
        return min(value, 4)
    }

    private var label: String { ["", "Yếu", "Trung bình", "Khá", "Mạnh"][score] }

    var body: some View {
        if !password.isEmpty {
            HStack(spacing: 10) {
                HStack(spacing: 6) {
                    ForEach(0..<4, id: \.self) { index in
                        Capsule()
                            .fill(index < score ? AppColors.success : AppColors.divider)
                            .frame(height: 6)
                    }
                }
                Text(label)
                    .appText(AuthText.strength)
                    .foregroundStyle(AppColors.success)
                    .frame(minWidth: 52, alignment: .trailing)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Độ mạnh mật khẩu: \(label)")
        }
    }
}

/// `.textBox` / `.textInput`: 56 high, 1.5 border `--color-input-border-strong`, focus ring.
struct AuthTextField: View {
    let label: String
    @Binding var text: String
    var placeholder = ""
    var identifier: String? = nil
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).appText(AuthText.fieldLabel).foregroundStyle(AppColors.text)
            TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(AppColors.placeholder))
                .appText(AuthText.input)
                .foregroundStyle(AppColors.text)
                .tint(AppColors.primary)
                .focused($focused)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(.horizontal, 16)
                .frame(minHeight: 56)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(boxBorder(focused: focused))
                .accessibilityIdentifier(identifier ?? label)
        }
    }
}

/// `.phoneBox` with the fixed `+84` prefix and the `900 000 001` grouping.
/// The binding keeps nine digits; the field shows the grouped value.
struct AuthPhoneField: View {
    let label: String
    @Binding var digits: String
    var readOnly = false
    var disabled = false
    var hasError = false
    var identifier: String? = nil
    @State private var display = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).appText(AuthText.fieldLabel).foregroundStyle(AppColors.text)
            HStack(spacing: 0) {
                Text("+84")
                    .appText(AuthText.prefix)
                    .foregroundStyle(disabled ? AppColors.muted : AppColors.muted)
                    .padding(.horizontal, 16)
                    .frame(maxHeight: .infinity)
                    .overlay(alignment: .trailing) { AppColors.inputBorder.frame(width: 1.5) }
                Group {
                    if readOnly {
                        Text(display.isEmpty ? "" : display)
                            .appText(AuthText.input)
                            .foregroundStyle(AppColors.muted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        TextField("", text: $display,
                                  prompt: Text("900 000 001").foregroundStyle(AppColors.placeholder))
                            .appText(AuthText.input)
                            .foregroundStyle(AppColors.text)
                            .tint(AppColors.primary)
                            .keyboardType(.numberPad)
                            .textContentType(.telephoneNumber)
                            .focused($focused)
                            .disabled(disabled)
                            .accessibilityIdentifier(identifier ?? "auth.phone")
                    }
                }
                .padding(.horizontal, 16)
                .frame(height: 54)

                if readOnly {
                    HStack(spacing: 4) {
                        Image(systemName: "lock").font(.system(size: 15, weight: .regular))
                        Text("Chỉ đọc").appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                    }
                    .foregroundStyle(AppColors.muted)
                    .padding(.trailing, 14)
                    .fixedSize()
                }
            }
            // `.phoneBox` is 56 px tall (min-height with a fixed single-line input). The height is
            // pinned rather than a minimum: the "+84" column below fills the row, and a minimum
            // lets it swallow the free space the surrounding column distributes, doubling the box.
            .frame(height: 56)
            .background(readOnly || disabled ? AppColors.neutralSoft : AppColors.surface,
                        in: RoundedRectangle(cornerRadius: AppRadius.control))
            .overlay(boxBorder(focused: focused, readOnly: readOnly || disabled, hasError: hasError))
            .onAppear { display = Self.grouped(digits) }
            .onChange(of: display) { _, new in
                guard !readOnly else { return }
                let clean = String(new.filter(\.isNumber).prefix(9))
                let formatted = Self.grouped(clean)
                if formatted != new { display = formatted }
                if clean != digits { digits = clean }
            }
            .onChange(of: digits) { _, new in
                let formatted = Self.grouped(new)
                if formatted != display { display = formatted }
            }
        }
    }

    /// `900 000 001`: groups of three, like the prototype field.
    static func grouped(_ digits: String) -> String {
        let clean = String(digits.filter(\.isNumber).prefix(9))
        var parts: [String] = []
        var index = clean.startIndex
        while index < clean.endIndex {
            let end = clean.index(index, offsetBy: 3, limitedBy: clean.endIndex) ?? clean.endIndex
            parts.append(String(clean[index..<end]))
            index = end
        }
        return parts.joined(separator: " ")
    }
}

/// `.passwordBox` with the 48 × 48 eye button, optional error and hint (strength).
struct AuthPasswordField: View {
    let label: String
    @Binding var value: String
    var autoComplete: UITextContentType = .password
    var hasError = false
    var errorText: String? = nil
    var disabled = false
    var identifier: String? = nil
    /// When set, the password-strength bars render under the field (`hint` in the prototype).
    var strengthPassword: String? = nil
    @State private var shown = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).appText(AuthText.fieldLabel).foregroundStyle(AppColors.text)
            HStack(spacing: 0) {
                Group {
                    if shown {
                        TextField("", text: $value).textContentType(autoComplete)
                    } else {
                        SecureField("", text: $value).textContentType(autoComplete)
                    }
                }
                .appText(AuthText.input)
                .foregroundStyle(AppColors.text)
                .tint(AppColors.primary)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focused)
                .disabled(disabled)
                .padding(.leading, 16)
                .padding(.trailing, 8)
                .frame(height: 54)
                .accessibilityIdentifier(identifier ?? label)

                Button { shown.toggle() } label: {
                    Image(systemName: "eye")
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(AppColors.muted)
                        .frame(width: 48, height: 48)
                        .background(Color.clear, in: RoundedRectangle(cornerRadius: 12))
                }
                .padding(.trailing, 4)
                .accessibilityLabel(shown ? "Ẩn mật khẩu" : "Hiện mật khẩu")
            }
            .frame(minHeight: 56)
            .background(disabled ? AppColors.neutralSoft : AppColors.surface,
                        in: RoundedRectangle(cornerRadius: AppRadius.control))
            .overlay(boxBorder(focused: focused, readOnly: disabled, hasError: hasError))

            if let errorText {
                Text(errorText)
                    .appText(AuthText.fieldError)
                    .foregroundStyle(AppColors.error)
            }
            if let strengthPassword { AuthPasswordStrength(password: strengthPassword) }
        }
    }
}

private func boxBorder(focused: Bool, readOnly: Bool = false, hasError: Bool = false) -> some View {
    let stroke = hasError ? AppColors.error : (focused ? AppColors.primary : (readOnly ? AppColors.inputBorder : AppColors.inputBorderStrong))
    return RoundedRectangle(cornerRadius: AppRadius.control)
        .strokeBorder(stroke, lineWidth: 1.5)
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.control)
                .strokeBorder(AppColors.primarySoft, lineWidth: 3)
                .padding(-3)
                .opacity(focused && !hasError ? 1 : 0)
        )
}
