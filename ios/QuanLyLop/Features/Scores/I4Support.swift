import Foundation
import SwiftUI

struct I4SaveFailure: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/// Date/number labels in the same `vi-VN` shapes as `design/prototype/src/shared/format`.
/// Shared by the I-8C groups (scores, homework, comments, reports).
enum I4Format {
    private static let parser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    private static let dayMonthFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "d/M"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    private static let dayMonthLongFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = String(localized: "feature.scores.d.thang.m")
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "dd/MM/yyyy"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    private static let weekdayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "EEEE d/M"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    private static let scoreFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 1
        return formatter
    }()

    nonisolated(unsafe) private static let timestampFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    static func dayMonth(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        return dayMonthFormatter.string(from: date)
    }

    static func dayMonthLong(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        return dayMonthLongFormatter.string(from: date)
    }

    static func date(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        return dateFormatter.string(from: date)
    }

    static func weekdayDayMonth(_ iso: String) -> String {
        guard let date = parser.date(from: iso) else { return iso }
        return weekdayFormatter.string(from: date)
    }

    static func score(_ value: Double) -> String {
        scoreFormatter.string(from: NSNumber(value: value)) ?? String(value)
    }

    static func score(_ value: Double?) -> String {
        guard let value else { return String(localized: "scores.value.missing", table: "Scores") }
        return score(value)
    }

    static func monthOption(_ month: String) -> String {
        String.localizedStringWithFormat(String(localized: "feature.scores.thang"), String(describing: (Int(month.dropFirst(5)) ?? 0)), String(describing: (month.prefix(4))))
    }

    static func monthPeriod(_ month: String) -> String {
        String.localizedStringWithFormat(String(localized: "feature.scores.thang.6a38e3e2"), String(describing: (Int(month.dropFirst(5)) ?? 0)))
    }

    static func monthTitle(_ month: String) -> String {
        String.localizedStringWithFormat(String(localized: "feature.scores.bao.cao.thang"), String(describing: (Int(month.dropFirst(5)) ?? 0)))
    }

    static func time(_ timestamp: String?) -> String? {
        guard let timestamp, let date = timestampFormatter.date(from: timestamp) else { return nil }
        return timeFormatter.string(from: date)
    }

    static func todayISO() -> String {
        let components = Calendar(identifier: .gregorian).dateComponents(in: TimeZone.current, from: .now)
        return String(format: "%04d-%02d-%02d", components.year ?? 2026, components.month ?? 1, components.day ?? 1)
    }

    static func currentMonth() -> String { String(todayISO().prefix(7)) }
}

enum I4Style {
    /// Star glyph colour used by the comment cards and the star picker.
    static let star = Color(.sRGB, red: 0xE5 / 255, green: 0xA5 / 255, blue: 0x0A / 255, opacity: 1)
    /// Preview bar colour (`#f2b200`).
    static let starBar = Color(.sRGB, red: 0xF2 / 255, green: 0xB2 / 255, blue: 0x00 / 255, opacity: 1)
}

struct I4Avatar: View {
    let name: String
    var diameter: CGFloat = 36
    var fontSize: CGFloat = 13

    var body: some View {
        Text(AppInitials.of(name).isEmpty ? "–" : AppInitials.of(name))
            .appText(AppTextStyle(size: fontSize, weight: .bold, lineHeight: fontSize * 1.5))
            .foregroundStyle(AppColors.primaryInk)
            .frame(width: diameter, height: diameter)
            .background(AppColors.primarySoft, in: Circle())
    }
}

/// `padding-left` + icon + text notice used by the comments and homework panels.
struct I4Banner: View {
    enum Tone { case info, warning, error }

    let text: String
    var tone: Tone = .info
    var systemImage: String = "info.circle"
    var horizontal: CGFloat = 14
    var vertical: CGFloat = 12

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .regular))
                .padding(.top, 2)
            Text(text)
                .appText(AppTextStyle(size: 14, weight: tone == .error ? .semiBold : .regular, lineHeight: 21))
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(foreground)
        .padding(.horizontal, horizontal)
        .padding(.vertical, vertical)
        .background(background, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private var foreground: Color {
        switch tone {
        case .info: AppColors.primaryInk
        case .warning: AppColors.warning
        case .error: AppColors.error
        }
    }

    private var background: Color {
        switch tone {
        case .info: AppColors.primarySoft
        case .warning: AppColors.warningSoft
        case .error: AppColors.errorSoft
        }
    }
}

/// Dark "Sẽ gửi khi có mạng" bar (`CommentsPanel.module.css .toast`).
struct I4Toast: View {
    let text: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "clock")
                .font(.system(size: 16, weight: .regular))
            Text(text)
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
        .background(AppColors.text, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }
}

/// Prototype confirmation dialog (`dialog` + stacked full-width actions) drawn over the page.
struct I4Dialog<Content: View, Actions: View>: View {
    let title: String
    @ViewBuilder let content: Content
    @ViewBuilder let actions: Actions
    let dismiss: () -> Void

    init(title: String, @ViewBuilder content: () -> Content,
         @ViewBuilder actions: () -> Actions, dismiss: @escaping () -> Void) {
        self.title = title
        self.content = content()
        self.actions = actions()
        self.dismiss = dismiss
    }

    var body: some View {
        ZStack {
            AppColors.scrim.ignoresSafeArea().onTapGesture(perform: dismiss)
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 25, tracking: -0.2))
                    .foregroundStyle(AppColors.text)
                content
                actions
            }
            .padding(20)
            .frame(maxWidth: 350)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
            .padding(20)
        }
    }
}
