import SwiftUI
import UIKit

/// Tokens copied one-for-one from `design/prototype/src/shared/styles/tokens.css`
/// (plus sizes from `src/shared/ui/ui.module.css` and `src/shared/styles/reset.css`).
/// The prototype is light-only, so these are fixed values, not dark-mode adaptives.
enum AppColors {
    static let canvas = fixed(0xEAECF1)
    static let background = fixed(0xF6F7F9)
    static let surface = fixed(0xFFFFFF)
    static let border = fixed(0xE6E9EE)
    static let divider = fixed(0xEEF0F3)
    static let inputBorder = fixed(0xD2D7DF)
    static let inputBorderStrong = fixed(0xB7BEC9)
    static let text = fixed(0x14181F)
    static let muted = fixed(0x4A5361)
    static let placeholder = fixed(0x6B7280)
    static let primary = fixed(0x2F5BEA)
    static let primaryInk = fixed(0x1E43B8)
    static let primarySoft = fixed(0xE8EEFE)
    static let onPrimary = fixed(0xFFFFFF)
    static let success = fixed(0x14663F)
    static let successSoft = fixed(0xE7F6EC)
    static let warning = fixed(0x8A5300)
    static let warningSoft = fixed(0xFFF3D6)
    static let error = fixed(0xB42318)
    static let errorSoft = fixed(0xFDECEC)
    static let neutralSoft = fixed(0xF0F2F5)
    /// `--color-scrim: rgb(20 24 31 / 0.4)`.
    static let scrim = Color(.sRGB, red: 20 / 255, green: 24 / 255, blue: 31 / 255, opacity: 0.4)

    private static func fixed(_ hex: UInt32) -> Color {
        Color(.sRGB, red: Double((hex >> 16) & 255) / 255,
              green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, opacity: 1)
    }
}

/// `--radius-*` in tokens.css and the component radii in ui.module.css.
enum AppRadius {
    static let card: CGFloat = 16
    static let row: CGFloat = 14
    static let control: CGFloat = 14
    static let button: CGFloat = 12
    static let chip: CGFloat = 10
    static let pill: CGFloat = 999
    static let sheet: CGFloat = 20
    static let segmentTrack: CGFloat = 12
    static let segment: CGFloat = 10
}

/// `--tap`, button sizes, input height and paddings measured in ui.module.css.
enum AppMetrics {
    static let tap: CGFloat = 44
    static let inputHeight: CGFloat = 52
    static let buttonHeightSmall: CGFloat = 44
    static let buttonHeightMedium: CGFloat = 48
    static let buttonHeightLarge: CGFloat = 52
    static let buttonPaddingSmall: CGFloat = 16
    static let buttonPaddingMedium: CGFloat = 20
    static let buttonPaddingLarge: CGFloat = 20
    static let cardPaddingHorizontal: CGFloat = 16
    static let cardPaddingVertical: CGFloat = 14
    static let fieldGap: CGFloat = 6
    /// `--space-8`, used between save feedback icon and text.
    static let saveFeedbackGap: CGFloat = 8
    static let chipPaddingHorizontal: CGFloat = 10
    static let chipPaddingVertical: CGFloat = 8
    static let pillPaddingHorizontal: CGFloat = 10
    static let pillPaddingVertical: CGFloat = 5
    static let focusRing: CGFloat = 3
    static let borderWidth: CGFloat = 1.5
    /// Divider line above sticky bars.
    static let hairline: CGFloat = 1
    /// Small chevron inside a menu-style status pill.
    static let pillChevronSize: CGFloat = 10
    /// `--section-gap`: between two sections of one screen; clearly larger than the gap between cards.
    static let sectionGap: CGFloat = 24
    /// Section header → first card of that section.
    static let sectionHeaderGap: CGFloat = 12
}

/// The prototype ships one variable font (`Plus Jakarta Sans`); weights are `wght` axis values.
enum AppFontWeight: Int, Sendable {
    case extraLight = 200, light = 300, regular = 400, medium = 500
    case semiBold = 600, bold = 700, extraBold = 800
}

enum AppFont {
    static let postScriptName = "PlusJakartaSans-Regular"
    private static let weightAxis: UInt32 = 0x7767_6874 // 'wght'

    /// Falls back to the system font only if the bundled font is missing from the app.
    @MainActor static func uiFont(size: CGFloat, weight: AppFontWeight) -> UIFont {
        guard let base = UIFont(name: postScriptName, size: size) else {
            return UIFont.systemFont(ofSize: size, weight: weight.uiKit)
        }
        let variation = UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String)
        let descriptor = base.fontDescriptor.addingAttributes([variation: [NSNumber(value: weightAxis): weight.rawValue]])
        return UIFont(descriptor: descriptor, size: size)
    }

    @MainActor static func font(size: CGFloat, weight: AppFontWeight) -> Font {
        Font(uiFont(size: size, weight: weight))
    }
}

private extension AppFontWeight {
    var uiKit: UIFont.Weight {
        switch self {
        case .extraLight: .ultraLight
        case .light: .light
        case .regular: .regular
        case .medium: .medium
        case .semiBold: .semibold
        case .bold: .bold
        case .extraBold: .heavy
        }
    }
}

/// Type scale from reset.css (`h1..h3`, `body`), tokens.css (`line-height: 1.5`) and ui.module.css.
struct AppTextStyle: Sendable {
    let size: CGFloat
    let weight: AppFontWeight
    let lineHeight: CGFloat
    var tracking: CGFloat = 0

    @MainActor var font: Font { AppFont.font(size: size, weight: weight) }

    /// SwiftUI adds `lineSpacing` on top of the font's natural line height.
    @MainActor var extraLineSpacing: CGFloat {
        max(0, lineHeight - AppFont.uiFont(size: size, weight: weight).lineHeight)
    }
}

enum AppText {
    /// `body`: 16px / 1.5.
    static let body = AppTextStyle(size: 16, weight: .regular, lineHeight: 24)
    /// `h1`: 26px / 700 / 1.15 / letter-spacing -0.01em.
    static let title = AppTextStyle(size: 26, weight: .bold, lineHeight: 29.9, tracking: -0.26)
    /// `.compactTitle h1`: 22px.
    static let titleCompact = AppTextStyle(size: 22, weight: .bold, lineHeight: 25.3, tracking: -0.22)
    /// `h2`: 18px / 700 (dialog headers and card headings).
    static let heading = AppTextStyle(size: 18, weight: .bold, lineHeight: 27)
    /// Section header of every screen: 20px / 700, above the 18px card headings.
    static let sectionHeader = AppTextStyle(size: 20, weight: .bold, lineHeight: 26, tracking: -0.2)
    /// `h3`: 16px / 700.
    static let subheading = AppTextStyle(size: 16, weight: .bold, lineHeight: 24)
    /// `.pageTitle .eyebrow` and `.field > label` (14 / 600).
    static let label = AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21)
    /// `.eyebrow`, body copy at 14px.
    static let muted = AppTextStyle(size: 14, weight: .regular, lineHeight: 21)
    /// `.tab` label: 12px / 600.
    static let caption = AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18)
    /// `.chip`: 14px / 400.
    static let chip = AppTextStyle(size: 14, weight: .regular, lineHeight: 21)
    /// `.pill`: 13px / 600.
    static let pill = AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5)
    /// `.segment`: 15px / 600.
    static let segment = AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5)
    /// `.button`: 14px / 600.
    static let buttonSmall = AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21)
    /// `.md`: 15px / 600.
    static let buttonMedium = AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5)
    /// `.lg`: 16px / 600.
    static let buttonLarge = AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24)
    /// `.levelButton`: 12px / 600 / line-height 1.2.
    static let homeworkLevel = AppTextStyle(size: 12, weight: .semiBold, lineHeight: 14.4)
    /// `.noticeTitle`: 16px / 700 / 1.4.
    static let noticeTitle = AppTextStyle(size: 16, weight: .bold, lineHeight: 22.4)
    /// `.noticeBody`: 14px / 400 / 1.45.
    static let noticeBody = AppTextStyle(size: 14, weight: .regular, lineHeight: 20.3)
    /// `.emptyTitle`: 16px / 700 / 1.5.
    static let emptyTitle = AppTextStyle(size: 16, weight: .bold, lineHeight: 24)
    /// `.fieldError`: 14px / 400.
    static let fieldError = AppTextStyle(size: 14, weight: .regular, lineHeight: 21)
}

extension View {
    /// Applies a prototype text style (font, line height and tracking).
    func appText(_ style: AppTextStyle) -> some View {
        modifier(AppTextModifier(style: style))
    }
}

private struct AppTextModifier: ViewModifier {
    let style: AppTextStyle
    @ScaledMetric(relativeTo: .body) private var dynamicTypeScale: CGFloat = 1

    func body(content: Content) -> some View {
        content
            .font(AppFont.font(size: style.size * dynamicTypeScale, weight: style.weight))
            .lineSpacing(style.extraLineSpacing * dynamicTypeScale)
            .tracking(style.tracking * dynamicTypeScale)
    }
}

/// `--state-*` in tokens.css (state contract: `design/ux-v2/rules.md` mục 6).
enum AppState {
    static let selectedBg = AppColors.primarySoft
    static let selectedFg = AppColors.primaryInk
    static let hoverBg = AppColors.neutralSoft
    static let pressedBg = AppColors.border
    static let disabledOpacity: Double = 0.5
    static let successBg = AppColors.successSoft
    static let successFg = AppColors.success
    static let errorBg = AppColors.errorSoft
    static let errorFg = AppColors.error
    /// Saved on the device, not on the server yet.
    static let pendingBg = AppColors.warningSoft
    static let pendingFg = AppColors.warning
    /// `scale(0.98)` while a button or card is pressed.
    static let pressedScale: CGFloat = 0.98
}

/// `--dur-loading-min`, `--dur-success-hold` (seconds) and the "Chờ đồng bộ" delay.
enum AppDuration {
    static let loadingMin: TimeInterval = 0.4
    static let successHold: TimeInterval = 1.6
    /// SaveStatus shows "Chờ đồng bộ" only once the push queue has been non-empty this long.
    static let pendingAfter: TimeInterval = 1.0
    /// `--dur-press`.
    static let press: TimeInterval = 0.1
}

extension AppMetrics {
    /// `--empty-mascot` / `--empty-mascot-compact`.
    static let emptyMascot: CGFloat = 96
    static let emptyMascotCompact: CGFloat = 56
}
