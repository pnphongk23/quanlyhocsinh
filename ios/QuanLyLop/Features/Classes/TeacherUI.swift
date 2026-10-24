import SwiftUI

/// Measurements copied from the prototype mobile screens (390×844) of the teacher
/// package: `shell.module.css` (content padding 12/20, tabbar 64), `classes.module.css`,
/// `classSpace.module.css`, `sessions.module.css`, `AttendancePanel.module.css`,
/// `students.module.css` and `schedule.module.css`.
enum TeacherMetrics {
    /// `.content { padding: 12px 20px 16px }`
    static let screenPaddingHorizontal: CGFloat = 20
    static let screenPaddingTop: CGFloat = 12
    /// `.mobile { padding-bottom: calc(tabbar + safe-area + 16px) }`
    static let tabBarHeight: CGFloat = 64
    static let contentGap: CGFloat = 12
    static let fabSize: CGFloat = 56
    static let cardPadding: CGFloat = 16
    static let rowMinHeight: CGFloat = 56
    static let listGap: CGFloat = 8
}

/// Prototype date labels (`src/shared/format/index.ts`) in the same `vi-VN` shapes.
enum TeacherFormat {
    private static let parser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    /// `formatDate`: 01/09/2026.
    static func date(_ iso: String) -> String { format(iso, "dd/MM/yyyy") }
    /// `formatDayMonth`: 19/10.
    static func dayMonth(_ iso: String) -> String { format(iso, "d/M") }
    /// `formatWeekdayDate`: "Thứ Hai, 19 tháng 10" (`Intl` capitalises “Chủ Nhật”).
    static func weekdayDate(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        return String.localizedStringWithFormat(String(localized: "feature.classes.thang.bfb6f23e"), String(describing: (capitalizedWeekdayName(iso))), String(describing: (calendar.component(.day, from: date))), String(describing: (calendar.component(.month, from: date))))
    }

    /// Compact teaching-date context used under every session title.
    static func sessionDateLine(date: String, start: String?, end: String?) -> String {
        let time = end.map { "\(start ?? "")–\($0)" } ?? (start ?? "")
        return String.localizedStringWithFormat(
            String(localized: "session.date.line", table: "Teacher"),
            String(describing: capitalizedWeekdayName(date)),
            String(describing: dayMonth(date)),
            String(describing: time)
        )
    }

    /// Same list as `Intl.DateTimeFormat(weekday: "long")`: “Chủ Nhật”.
    static func capitalizedWeekdayName(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        let index = calendar.component(.weekday, from: date) - 1
        return capitalizedWeekdayNames[index]
    }

    static let capitalizedWeekdayNames = [String(localized: "feature.classes.chu.nhat"), String(localized: "feature.classes.thu.hai"), String(localized: "feature.classes.thu.ba"), String(localized: "feature.classes.thu.tu"), String(localized: "feature.classes.thu.nam"), String(localized: "feature.classes.thu.sau"), String(localized: "feature.classes.thu.bay")]
    /// `fullDateLabel`: "Ngày 21 tháng 10 năm 2026".
    static func fullDate(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        let day = calendar.component(.day, from: date)
        let month = calendar.component(.month, from: date)
        let year = calendar.component(.year, from: date)
        return String.localizedStringWithFormat(String(localized: "feature.classes.ngay.thang.nam"), String(describing: (day)), String(describing: (month)), String(describing: (year)))
    }
    /// `weekdayNames` of `shared/format`.
    static func weekdayName(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        let index = calendar.component(.weekday, from: date) - 1
        return weekdayNames[index]
    }
    /// `monthTitle` of the month view: "Tháng 10, 2026".
    static func monthTitle(year: Int, month: Int) -> String { String.localizedStringWithFormat(String(localized: "feature.classes.thang.271d373b"), String(describing: (month)), String(describing: (year))) }

    static func todayISO() -> String {
        let now = Date.now
        let parts = calendar.dateComponents([.year, .month, .day], from: now)
        return String(format: "%04d-%02d-%02d", parts.year ?? 2000, parts.month ?? 1, parts.day ?? 1)
    }

    static func iso(year: Int, month: Int, day: Int) -> String {
        String(format: "%04d-%02d-%02d", year, month, day)
    }

    static func components(_ iso: String) -> (year: Int, month: Int, day: Int) {
        guard let date = parser.date(from: iso) else { return (2000, 1, 1) }
        return (calendar.component(.year, from: date),
                calendar.component(.month, from: date),
                calendar.component(.day, from: date))
    }

    static let weekdayNames = [String(localized: "feature.classes.chu.nhat.9d3bbd28"), String(localized: "feature.classes.thu.hai"), String(localized: "feature.classes.thu.ba"), String(localized: "feature.classes.thu.tu"), String(localized: "feature.classes.thu.nam"), String(localized: "feature.classes.thu.sau"), String(localized: "feature.classes.thu.bay")]

    private static let calendar = Calendar(identifier: .gregorian)

    private static func format(_ iso: String, _ pattern: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = pattern
        return formatter.string(from: date)
    }
}

/// `ScrollView` of the screens below. `ImageRenderer` in the screenshot harness cannot lay
/// out a scroll view, so the harness sets `teacherStaticLayout` and the content is stacked
/// directly instead. Never set outside the comparison screenshots.
struct TeacherScroll<Content: View>: View {
    @Environment(\.teacherStaticLayout) private var isStatic
    @ViewBuilder let content: Content

    var body: some View {
        if isStatic {
            VStack(spacing: 0) {
                content
                Spacer(minLength: 0)
            }
        } else {
            ScrollView { content }
        }
    }
}

private struct TeacherStaticLayoutKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var teacherStaticLayout: Bool {
        get { self[TeacherStaticLayoutKey.self] }
        set { self[TeacherStaticLayoutKey.self] = newValue }
    }
}

// MARK: - Avatar (`.avatar` 40/44/36 circles of the prototype)

struct TeacherAvatar: View {
    let initials: String
    var size: CGFloat = 40
    /// `.avatarEmpty`: neutral background with a dash instead of the initials.
    var isEmpty = false

    private static let textStyle = AppTextStyle(size: 14, weight: .bold, lineHeight: 21)

    var body: some View {
        Text(isEmpty ? "–" : initials)
            .appText(Self.textStyle)
            .foregroundStyle(isEmpty ? AppColors.muted : AppColors.primaryInk)
            .frame(width: size, height: size)
            .background(isEmpty ? AppColors.background : AppColors.primarySoft, in: Circle())
    }
}

extension TeacherAvatar {
    init(name: String, size: CGFloat = 40) {
        let initials = AppInitials.of(name)
        self.init(initials: initials.isEmpty ? "–" : initials, size: size)
    }
}

/// `NavigationLink(value:)` with the prototype's plain style. When the screenshot harness
/// renders without a navigation stack the label is drawn as-is, so it keeps its colours
/// (a bare `NavigationLink` outside a stack renders disabled).
struct TeacherLink<Label: View>: View {
    @Environment(\.teacherStaticLayout) private var isStatic
    let route: TeacherRoute
    @ViewBuilder let label: Label

    var body: some View {
        if isStatic {
            label
        } else {
            NavigationLink(value: route) { label }
                .buttonStyle(.plain)
        }
    }
}

/// Horizontal scroller for the schedule filter chips. Same `teacherStaticLayout` escape as
/// `TeacherScroll`, because `ImageRenderer` cannot lay out a scroll view.
struct TeacherHorizontalScroll<Content: View>: View {
    @Environment(\.teacherStaticLayout) private var isStatic
    @ViewBuilder let content: Content

    var body: some View {
        if isStatic {
            content
        } else {
            ScrollView(.horizontal, showsIndicators: false) { content }
        }
    }
}

// MARK: - Icon button (`.iconButton` / `.moreButton` 44×44)

struct TeacherIconButton: View {
    let systemImage: String
    let label: String
    var tint: Color = AppColors.text
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 20, weight: .regular))
                .foregroundStyle(tint)
                .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

// MARK: - Floating action button (`fab.module.css`)

struct TeacherFab: View {
    var body: some View {
        Image(systemName: "plus")
            .font(.system(size: 26, weight: .regular))
            .foregroundStyle(AppColors.onPrimary)
            .frame(width: TeacherMetrics.fabSize, height: TeacherMetrics.fabSize)
            .background(AppColors.primary, in: Circle())
            .shadow(color: Color(red: 35 / 255, green: 71 / 255, blue: 230 / 255, opacity: 0.35),
                    radius: 16, x: 0, y: 6)
            .accessibilityLabel(String(localized: "feature.classes.them"))
    }
}

// MARK: - Pinned bottom bar (main action of a screen or sheet, `.stickyBar`)

/// Main action pinned to the bottom edge with `safeAreaInset(edge: .bottom)`: it does not scroll with
/// the list and the list keeps its last row above it.
struct TeacherPinnedBar<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: TeacherMetrics.listGap) { content }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.vertical, TeacherMetrics.listGap)
            .frame(maxWidth: .infinity)
            .background(AppColors.surface)
            .overlay(alignment: .top) { AppColors.border.frame(height: AppMetrics.hairline) }
    }
}

// MARK: - Count chip (`.chips .chip` with a bold number)

struct TeacherCountChip: View {
    var before = ""
    let count: String
    var after = ""

    var body: some View {
        HStack(spacing: 0) {
            if !before.isEmpty {
                Text(before).appText(AppText.chip).foregroundStyle(AppColors.text)
            }
            Text(count)
                .appText(AppTextStyle(size: 14, weight: .bold, lineHeight: 21))
                .foregroundStyle(AppColors.text)
            if !after.isEmpty {
                Text(after).appText(AppText.chip).foregroundStyle(AppColors.text)
            }
        }
        .fixedSize(horizontal: true, vertical: false)
        .padding(.horizontal, AppMetrics.chipPaddingHorizontal)
        .padding(.vertical, AppMetrics.chipPaddingVertical)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.chip))
    }
}

// MARK: - Status pill (`.cardStatus` / `.statusPill`: 13/600, padding 4 12)

struct TeacherStatusPill: View {
    enum Tone: Sendable { case neutral, success, warning, error, primary }

    let text: String
    var tone: Tone = .neutral

    var body: some View {
        Text(text)
            .appText(AppText.pill)
            .foregroundStyle(foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(background, in: Capsule())
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

// MARK: - Text tabs (`.subTabs` 13/600 · `.tabs` 14/600, 48 high, indicator under the selected tab)

struct TeacherTextTabs: View {
    struct Item: Identifiable, Sendable {
        let id: String
        let label: String
    }

    let items: [Item]
    let selection: String
    var fontSize: CGFloat = 13
    var fillsWidth = false
    let select: (String) -> Void

    var body: some View {
        Group {
            if fillsWidth {
                row
            } else {
                ScrollViewReader { proxy in
                    ScrollView(.horizontal) { row }
                        .scrollIndicators(.hidden)
                        .onChange(of: selection) { _, id in withAnimation { proxy.scrollTo(id) } }
                }
            }
        }
        .overlay(alignment: .bottom) { AppColors.border.frame(height: 1) }
    }

    private var row: some View {
        HStack(spacing: fillsWidth ? 0 : 4) {
            ForEach(items) { item in tabButton(item).id(item.id) }
        }
        .padding(.horizontal, fillsWidth ? 20 : 12)
    }

    private func tabButton(_ item: Item) -> some View {
        let active = item.id == selection
        return Button { select(item.id) } label: {
              Text(item.label)
                  .appText(AppTextStyle(size: fontSize, weight: .semiBold, lineHeight: fontSize * 1.5))
                  .foregroundStyle(active ? AppState.selectedFg : AppColors.muted)
                  .lineLimit(1)
                  .fixedSize(horizontal: !fillsWidth, vertical: false)
                  .frame(maxWidth: fillsWidth ? .infinity : nil)
                  .padding(.horizontal, fillsWidth ? 4 : 8)
                  .frame(height: 48)
                  .contentShape(Rectangle())
                  .overlay(alignment: .bottom) {
                      (active ? AppColors.primary : .clear).frame(height: AppMetrics.borderWidth * 2)
                  }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }
}

// MARK: - Segmented (shared fill-selected component)

struct TeacherSegmented: View {
    let options: [TeacherTextTabs.Item]
    let value: String
    let select: (String) -> Void

    var body: some View {
        AppSegmented(options: options.map { .init(value: $0.id, label: $0.label) }, value: value, select: select)
    }
}

// MARK: - Empty state compatibility wrapper

struct TeacherEmptyState: View {
    let systemImage: String
    let title: String
    let message: String

    var body: some View {
        AppEmptyState(title: title, description: message, mascot: .cho, size: .regular)
    }
}

// MARK: - Form controls (`.input` 52 high, radius 14, `.field` label 14/600)

struct TeacherField: View {
    @Environment(\.teacherStaticLayout) private var isStatic
    let label: String
    @Binding var text: String
    var placeholder = ""
    var keyboard: UIKeyboardType = .default
    var identifier: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).appText(AppText.label).foregroundStyle(AppColors.text)
            input
                .padding(.horizontal, 16)
                .frame(minHeight: AppMetrics.inputHeight)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.control)
                        .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
                .accessibilityIdentifier(identifier ?? label)
        }
    }

    /// `ImageRenderer` cannot rasterise a UIKit text field, so the screenshot harness draws the
    /// text inside the same box. The layout and the real control are unchanged.
    @ViewBuilder private var input: some View {
        if isStatic {
            Text(text.isEmpty ? placeholder : text)
                .appText(AppText.body)
                .foregroundStyle(text.isEmpty ? AppColors.placeholder : AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(AppColors.placeholder))
                .appText(AppText.body)
                .foregroundStyle(AppColors.text)
                .keyboardType(keyboard)
        }
    }
}

// MARK: - Bottom sheet (`ui.module.css .dialog` + `.sheet`)

struct TeacherSheet<Content: View, Footer: View>: View {
    let title: String
    @ViewBuilder let content: Content
    @ViewBuilder let footer: Footer
    let close: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 16) {
                Text(title).appText(AppText.heading).foregroundStyle(AppColors.text)
                Spacer(minLength: 0)
                AppButton(title: String(localized: "feature.classes.ong"), variant: .secondary, action: close)
                    .accessibilityIdentifier("sheet.close")
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 16)

            TeacherScroll { content.padding(.horizontal, 24) }
                .frame(maxHeight: .infinity, alignment: .top)

            VStack(spacing: 8) { footer }
                .padding(.horizontal, 24)
                .padding(.top, 12)
                .padding(.bottom, 16)
        }
        .background(AppColors.surface)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

extension TeacherSheet where Footer == EmptyView {
    init(title: String, @ViewBuilder content: () -> Content, close: @escaping () -> Void) {
        self.init(title: title, content: content, footer: { EmptyView() }, close: close)
    }
}

// MARK: - Error banner (`.error` of the feature modules)

struct TeacherErrorBanner: View {
    let message: String
    var retry: (() -> Void)?

    var body: some View {
        HStack(spacing: 8) {
            Text(message)
                .appText(AppText.muted)
                .foregroundStyle(AppColors.error)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let retry {
                Button(action: retry) {
                    Text(String(localized: "feature.classes.thu.lai"))
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(AppColors.onPrimary)
                        .padding(.horizontal, 16)
                        .frame(minHeight: AppMetrics.tap)
                        .background(AppColors.error, in: RoundedRectangle(cornerRadius: AppRadius.button))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.leading, 16)
        .padding(.trailing, retry == nil ? 16 : 8)
        .padding(.vertical, retry == nil ? 12 : 0)
        .frame(minHeight: retry == nil ? nil : 52)
        .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }
}
