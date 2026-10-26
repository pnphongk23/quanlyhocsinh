import SwiftUI
import UIKit

// MARK: - Button (src/shared/ui/Button.tsx + buttonClass.ts + ui.module.css `.button`)

/// `variant` and `size` map to the CSS classes of the prototype button.
struct AppButtonStyle: ButtonStyle {
    enum Variant: Sendable, CaseIterable {
        case primary, secondary, surface, neutral, danger, ghost
    }
    enum Size: Sendable, CaseIterable { case small, medium, large }

    var variant: Variant = .primary
    var size: Size = .small
    /// Save phase of `AppSaveButton`; `.saved` shows the success colours, `.saving` keeps the fill.
    var phase: AppSaveController.Phase = .idle
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .appText(size.textStyle)
            .foregroundStyle(foreground)
            .frame(maxWidth: size == .large ? .infinity : nil)
            .frame(minHeight: size.height)
            .padding(.horizontal, size.padding)
            .background(background(pressed: configuration.isPressed),
                        in: RoundedRectangle(cornerRadius: size.radius))
            .scaleEffect(configuration.isPressed && !dimmed ? AppState.pressedScale : 1)
            .opacity(dimmed && !hasOwnFill ? AppState.disabledOpacity : 1)
            .animation(.easeOut(duration: AppDuration.press), value: configuration.isPressed)
    }

    /// Disabled primary/secondary/danger use `--color-neutral-soft` + `--color-muted`; the ghost has
    /// no fill of its own, so it fades by `--state-disabled-opacity`.
    private var dimmed: Bool { !isEnabled && phase == .idle }
    private var hasOwnFill: Bool { variant != .ghost }

    private var foreground: Color {
        if phase == .saved { return AppState.successFg }
        if dimmed && hasOwnFill { return AppColors.muted }
        switch variant {
        case .primary: return AppColors.onPrimary
        case .secondary: return AppColors.primaryInk
        case .surface, .neutral: return AppColors.text
        case .danger: return AppState.errorFg
        case .ghost: return AppColors.muted
        }
    }
    private func background(pressed: Bool) -> Color {
        if phase == .saved { return AppState.successBg }
        if dimmed && hasOwnFill { return AppColors.neutralSoft }
        switch variant {
        case .primary: return AppColors.primary
        case .secondary: return pressed ? AppState.pressedBg : AppColors.primarySoft
        case .surface: return AppColors.surface
        case .neutral: return AppColors.background
        case .danger: return pressed ? AppState.pressedBg : AppState.errorBg
        case .ghost: return .clear
        }
    }
}

extension AppButtonStyle.Size {
    var height: CGFloat {
        switch self {
        case .small: AppMetrics.buttonHeightSmall
        case .medium: AppMetrics.buttonHeightMedium
        case .large: AppMetrics.buttonHeightLarge
        }
    }
    var padding: CGFloat {
        switch self {
        case .small: AppMetrics.buttonPaddingSmall
        case .medium: AppMetrics.buttonPaddingMedium
        case .large: AppMetrics.buttonPaddingLarge
        }
    }
    var radius: CGFloat {
        switch self {
        case .small: AppRadius.button
        case .medium, .large: AppRadius.control
        }
    }
    var textStyle: AppTextStyle {
        switch self {
        case .small: AppText.buttonSmall
        case .medium: AppText.buttonMedium
        case .large: AppText.buttonLarge
        }
    }
}

/// Label + optional icon with the prototype's `gap: 8px`.
struct AppButton: View {
    let title: String
    var systemImage: String? = nil
    var variant: AppButtonStyle.Variant = .primary
    var size: AppButtonStyle.Size = .small
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let systemImage { Image(systemName: systemImage) }
                Text(title)
            }
        }
        .buttonStyle(AppButtonStyle(variant: variant, size: size))
    }
}

// MARK: - Field (ui.module.css `.field`, `.input`, `.fieldError`)

struct AppTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var error: String? = nil
    var secure = false
    var textContentType: UITextContentType? = nil
    var keyboard: UIKeyboardType = .default
    /// Field specific accessibility identifier used by later feature tests.
    var identifier: String? = nil

    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
            Text(label).appText(AppText.label).foregroundStyle(AppColors.text)
            field
                .appText(AppText.body)
                .foregroundStyle(AppColors.text)
                .tint(AppColors.primary)
                .focused($focused)
                .padding(.horizontal, 16)
                .frame(minHeight: AppMetrics.inputHeight)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.control)
                        .strokeBorder(focused ? AppColors.primary : AppColors.inputBorder,
                                      lineWidth: AppMetrics.borderWidth))
                // `.input:focus` box-shadow: 0 0 0 3px var(--color-primary-soft)
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.control)
                        .strokeBorder(AppColors.primarySoft, lineWidth: AppMetrics.focusRing)
                        .padding(-AppMetrics.focusRing)
                        .opacity(focused ? 1 : 0))
                .accessibilityIdentifier(identifier ?? label)
            if let error {
                Text(error).appText(AppText.fieldError).foregroundStyle(AppColors.error)
            }
        }
    }

    @ViewBuilder private var field: some View {
        let prompt = Text(placeholder).foregroundStyle(AppColors.placeholder)
        if secure {
            SecureField("", text: $text, prompt: prompt)
        } else {
            TextField("", text: $text, prompt: prompt)
                .keyboardType(keyboard)
                .textContentType(textContentType)
        }
    }
}

// MARK: - Card (ui.module.css `.card`; selected is a fill, never a border)

struct AppCard<Content: View>: View {
    var selected = false
    @ViewBuilder let content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, AppMetrics.cardPaddingVertical)
            .background(selected ? AppState.selectedBg : AppColors.surface,
                        in: RoundedRectangle(cornerRadius: AppRadius.card))
    }
}

/// One line of a mobile list: `ui.module.css .row` (surface, 14 radius, 52 min height).
struct AppListRow<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: 12) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(minHeight: 52)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.row))
    }
}

// MARK: - Section (one header style and one spacing for every section of every screen)

/// The only section header: `AppText.sectionHeader`, text colour, aligned with the cards.
struct AppSectionHeader: View {
    let title: String
    /// Link or count at the trailing edge of the header row.
    var trailing: AnyView? = nil

    var body: some View {
        HStack(spacing: AppMetrics.sectionHeaderGap) {
            Text(title)
                .appText(AppText.sectionHeader)
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityAddTraits(.isHeader)
            if let trailing { trailing }
        }
    }
}

/// Header + content. Stack sections with `spacing: AppMetrics.sectionGap`; the header sits
/// `AppMetrics.sectionHeaderGap` above its content.
struct AppSection<Content: View>: View {
    let title: String
    var trailing: AnyView? = nil
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.sectionHeaderGap) {
            AppSectionHeader(title: title, trailing: trailing)
            content
        }
    }
}

// MARK: - Chip and Pill (`.chip` statistics, `.pill` statuses)

/// `.chip`: inline-block, `8px 10px`, 10 radius, `--color-bg`, 14px.
struct AppChip: View {
    let title: String
    /// Selected = `--state-selected-bg` fill with `--state-selected-fg` text, no border.
    var selected = false

    var body: some View {
        Text(title)
            .appText(AppText.chip)
            .foregroundStyle(selected ? AppState.selectedFg : AppColors.text)
            .padding(.horizontal, AppMetrics.chipPaddingHorizontal)
            .padding(.vertical, AppMetrics.chipPaddingVertical)
            .background(selected ? AppState.selectedBg : AppColors.background,
                        in: RoundedRectangle(cornerRadius: AppRadius.chip))
            .accessibilityAddTraits(selected ? [.isSelected] : [])
            .fixedSize(horizontal: true, vertical: false)
    }
}

/// `.pill` with the five tones of `src/shared/ui/Pill.tsx`.
struct AppPill: View {
    enum Tone: Sendable { case neutral, success, warning, error, primary }

    let title: String
    var tone: Tone = .neutral

    var body: some View {
        Text(title)
            .appText(AppText.pill)
            .foregroundStyle(foreground)
            .padding(.horizontal, AppMetrics.pillPaddingHorizontal)
            .padding(.vertical, AppMetrics.pillPaddingVertical)
            .background(background, in: RoundedRectangle(cornerRadius: AppRadius.pill))
            .fixedSize(horizontal: true, vertical: false)
    }

    private var foreground: Color {
        switch tone {
        case .neutral: AppColors.muted
        case .success: AppColors.success
        case .warning: AppColors.warning
        case .error: AppColors.error
        case .primary: AppColors.primaryInk
        }
    }
    private var background: Color {
        switch tone {
        case .neutral: AppColors.neutralSoft
        case .success: AppColors.successSoft
        case .warning: AppColors.warningSoft
        case .error: AppColors.errorSoft
        case .primary: AppColors.primarySoft
        }
    }
}

extension AttendanceStatus {
    /// Labels from `AttendancePanel.tsx`, colours from `.present/.late/.absent`.
    var label: String {
        switch self {
        case .present: String(localized: "design.attendance.present")
        case .late: String(localized: "design.attendance.late")
        case .absent: String(localized: "design.attendance.absent")
        }
    }
    var pillTone: AppPill.Tone {
        switch self {
        case .present: .success
        case .late: .warning
        case .absent: .error
        }
    }
    var pill: AppPill { AppPill(title: label, tone: pillTone) }

    /// "2 buổi muộn · 1 buổi vắng": the detail line of the attendance card, kept outside the string tables.
    static func lateAbsentSummary(late: Int, absent: Int) -> String { "\(late) buổi muộn · \(absent) buổi vắng" }
}

extension HomeworkLevel {
    /// `HOMEWORK_LEVEL_LABELS` in `data/homework.ts`; colours from `.level_*`.
    var label: String {
        switch self {
        case .excellent: String(localized: "design.homework.excellent")
        case .done: String(localized: "design.homework.done")
        case .notDone: String(localized: "design.homework.notDone")
        }
    }
    var foreground: Color {
        switch self {
        case .excellent: AppColors.success
        case .done: AppColors.primaryInk
        case .notDone: AppColors.error
        }
    }
    var background: Color {
        switch self {
        case .excellent: AppColors.successSoft
        case .done: AppColors.primarySoft
        case .notDone: AppColors.errorSoft
        }
    }
    var pillTone: AppPill.Tone {
        switch self {
        case .excellent: .success
        case .done: .primary
        case .notDone: .error
        }
    }
    var pill: AppPill { AppPill(title: label, tone: pillTone) }
}

/// Read-only homework result: `.pendingChip` when the teacher has not graded yet.
struct AppHomeworkPill: View {
    let level: HomeworkLevel?

    var body: some View {
        if let level { level.pill } else { AppPill(title: String(localized: "design.homework.ungraded"), tone: .warning) }
    }
}

// MARK: - HomeworkLevelControl (HomeworkPanel.module.css `.levels`, `.levelButton`, `.level_*`)

/// The three-button grading control, always the same order as `HOMEWORK_LEVELS`.
struct AppHomeworkLevelControl: View {
    let level: HomeworkLevel?
    var isEnabled = true
    let setLevel: (HomeworkLevel?) -> Void

    var body: some View {
        HStack(spacing: 4) {
            ForEach(HomeworkLevel.allCases, id: \.self) { option in
                let selected = level == option
                Button {
                    setLevel(level == option ? nil : option)
                } label: {
                    Text(option.label)
                        .appText(AppText.homeworkLevel)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(selected ? option.foreground : AppColors.muted)
                        .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                        .padding(.horizontal, 4).padding(.vertical, 2)
                        .background(selected ? option.background : .clear,
                                    in: RoundedRectangle(cornerRadius: AppRadius.segment))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? [.isSelected] : [])
                .disabled(!isEnabled)
            }
        }
        .padding(3)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.segmentTrack))
    }
}

// MARK: - Segmented (src/shared/ui/Segmented.tsx + `.segmented`, `.segment`)

struct AppSegmented: View {
    let options: [Option]
    let value: String
    var isEnabled = true
    let select: (String) -> Void

    struct Option: Identifiable, Sendable { let value: String; let label: String; var id: String { value } }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(options) { option in
                let active = option.value == value
                Button { select(option.value) } label: {
                    Text(option.label)
                        .appText(AppText.segment)
                        .foregroundStyle(active ? AppState.selectedFg : AppColors.muted)
                        .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                        .background(active ? AppState.selectedBg : .clear,
                                    in: RoundedRectangle(cornerRadius: AppRadius.segment))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(active ? [.isSelected] : [])
                .disabled(!isEnabled)
            }
        }
        .opacity(isEnabled ? 1 : AppState.disabledOpacity)
        .padding(3)
        .background(AppColors.border, in: RoundedRectangle(cornerRadius: AppRadius.segmentTrack))
    }
}

// MARK: - Sheet / dialog (`.dialog`, `.dialogHeader`, `.dialogBody`, `.dialogFooter`, `.sheet`)

/// Sheet body matching the prototype: header (title + "Đóng"), scrolling content, sticky footer.
/// Present it with `.sheet { AppSheet(title:...) { } footer: { } }`.
struct AppSheet<Content: View, Footer: View>: View {
    let title: String
    @ViewBuilder let content: Content
    @ViewBuilder let footer: Footer
    let close: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 16) {
                Text(title).appText(AppText.heading).foregroundStyle(AppColors.text)
                Spacer(minLength: 0)
                AppButton(title: String(localized: "design.action.close"), variant: .secondary, action: close)
                    .accessibilityIdentifier("sheet.close")
            }
            .padding(.horizontal, 24).padding(.top, 24).padding(.bottom, 16)

            ScrollView { content.padding(.horizontal, 24) }

            VStack(spacing: 8) { footer }
                .padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 16)
                .overlay(alignment: .top) {
                    AppColors.border.frame(height: 1)
                }
        }
        .background(AppColors.surface)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Empty / error / loading (`.empty`, `.emptyTitle`, `.spinner`)

/// The only empty state: Mít + title + optional description + optional action. `.compact` is for
/// small panes and filtered-out lists. Existing `AppEmptyState(title:) { extra }` calls keep working.
struct AppEmptyState<Extra: View>: View {
    enum Size: Sendable { case regular, compact }

    var title: String = String(localized: "design.empty.title")
    var description: String? = nil
    var mascot: MascotPose = .cho
    var size: Size = .regular
    @ViewBuilder var detail: Extra

    var body: some View {
        VStack(spacing: 8) {
            AppMascot(pose: mascot, height: size == .compact ? AppMetrics.emptyMascotCompact : AppMetrics.emptyMascot)
                .padding(.bottom, 4)
            Text(title).appText(AppText.emptyTitle).foregroundStyle(AppColors.text)
            if let description {
                Text(description).appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            detail.foregroundStyle(AppColors.muted)
        }
        .frame(maxWidth: .infinity)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 16).padding(.vertical, size == .compact ? 16 : 24)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        .accessibilityElement(children: .contain)
    }
}

extension AppEmptyState where Extra == EmptyView {
    init(title: String = String(localized: "design.empty.title"), description: String? = nil,
         mascot: MascotPose = .cho, size: Size = .regular) {
        self.init(title: title, description: description, mascot: mascot, size: size) { EmptyView() }
    }
}

extension AppEmptyState where Extra == AppButton {
    init(title: String = String(localized: "design.empty.title"), description: String? = nil,
         mascot: MascotPose = .cho, size: Size = .regular, actionTitle: String, action: @escaping () -> Void) {
        self.init(title: title, description: description, mascot: mascot, size: size) {
            AppButton(title: actionTitle, variant: .secondary, action: action)
        }
    }
}

/// The prototype has no dedicated error component; this keeps the empty-state shell so an
/// error never looks like a different surface, and adds the retry action.
struct AppErrorState: View {
    var message = String(localized: "design.error.message")
    let retry: () -> Void

    var body: some View {
        AppEmptyState(title: String(localized: "design.error.title")) {
            VStack(spacing: 12) {
                Text(message).appText(AppText.muted).foregroundStyle(AppColors.muted)
                AppButton(title: String(localized: "design.action.retry"), action: retry)
            }
        }
    }
}

/// `.spinner`: 24×24, 3px ring in `--color-border` with a `--color-primary` arc. With Reduce Motion
/// the arc stays still instead of turning.
struct AppSpinner: View {
    var tint: Color = AppColors.primary
    var ring: Color = AppColors.border
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var spinning = false
    private var animated: Bool { !reduceMotion }

    var body: some View {
        Circle()
            .trim(from: 0, to: 0.25)
            .stroke(tint, style: StrokeStyle(lineWidth: 3, lineCap: .butt))
            .overlay(Circle().stroke(ring, lineWidth: 3))
            .frame(width: 24, height: 24)
            .rotationEffect(.degrees(spinning ? 360 : 0))
            .animation(animated ? .linear(duration: 1).repeatForever(autoreverses: false) : nil, value: spinning)
            .onAppear { spinning = animated }
            .accessibilityLabel(Text("design.loading"))
    }
}
