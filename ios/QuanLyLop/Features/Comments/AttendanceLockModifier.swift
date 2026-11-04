import SwiftUI

/// What each lock in a view reports upward, so a test can read which rows and chips the screen put it on.
struct AttendanceLockReport: PreferenceKey, Equatable {
    struct Entry: Equatable { let locked: Bool; let hint: String }

    static let defaultValue: [Entry] = []
    static func reduce(value: inout [Entry], nextValue: () -> [Entry]) { value += nextValue() }
}

/// A row or chip of the comments tab while attendance is unfinished: it cannot be used and says why when read aloud.
private struct AttendanceLock: ViewModifier {
    let locked: Bool

    func body(content: Content) -> some View {
        let hint = locked ? String(localized: "comments.locked.hint", table: "Teacher") : ""
        content
            .disabled(locked)
            .accessibilityHint(hint)
            .preference(key: AttendanceLockReport.self, value: [.init(locked: locked, hint: hint)])
    }
}

extension View {
    func attendanceLock(_ locked: Bool) -> some View { modifier(AttendanceLock(locked: locked)) }
}
