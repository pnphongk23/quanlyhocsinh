import SwiftUI

/// A row or chip of the comments tab while attendance is unfinished: it cannot be used and says why when read aloud.
private struct AttendanceLock: ViewModifier {
    let locked: Bool

    func body(content: Content) -> some View {
        content
            .disabled(locked)
            .accessibilityHint(locked ? String(localized: "comments.locked.hint", table: "Teacher") : "")
    }
}

extension View {
    func attendanceLock(_ locked: Bool) -> some View { modifier(AttendanceLock(locked: locked)) }
}
