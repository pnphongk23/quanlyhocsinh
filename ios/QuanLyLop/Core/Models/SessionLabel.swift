import Foundation

/// A session is named by its weekday and date ("T3 · 21/10"); sessions carry no number.
enum SessionLabel {
    private static let weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

    private static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        return calendar
    }

    /// "T3 · 21/10"; a date that is not `yyyy-MM-dd` reads as it came.
    static func title(forDate iso: String) -> String {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3,
              let date = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
        else { return iso }
        let weekday = calendar.component(.weekday, from: date)
        return "\(weekdayNames[weekday - 1]) · \(parts[2])/\(parts[1])"
    }

    static func title(for session: ClassSession) -> String { title(forDate: session.date) }

    /// Same text in the middle of a sentence ("Phiếu T3 · 21/10").
    static func inline(for session: ClassSession) -> String { title(for: session) }

    /// A screen that may open before its session is loaded reads as a plain session.
    static func inline(for session: ClassSession?) -> String {
        session.map(inline(for:)) ?? String(localized: "core.session.label.plain").lowercased()
    }
}
