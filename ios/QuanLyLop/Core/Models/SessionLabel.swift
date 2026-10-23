import Foundation

/// `sessionPrefix` of `data/repositories/sessions.ts`: "Buổi 9"; a session without a number
/// (cancelled) reads "Buổi bù" when it is a makeup session, otherwise "Buổi học".
enum SessionLabel {
    static func title(for session: ClassSession) -> String {
        if let number = session.sessionNumber {
            return String.localizedStringWithFormat(String(localized: "core.session.label.numbered"), String(describing: number))
        }
        return session.isMakeup ? String(localized: "core.session.label.makeup") : String(localized: "core.session.label.plain")
    }

    /// Lower-case form for the middle of a sentence ("Phiếu buổi 9", "BTVN buổi bù").
    static func inline(for session: ClassSession) -> String {
        title(for: session).lowercased()
    }

    /// A screen that may open before its session is loaded reads as a plain session.
    static func inline(for session: ClassSession?) -> String {
        session.map(inline(for:)) ?? String(localized: "core.session.label.plain").lowercased()
    }

    /// The numbered session right before `session`; falls back to `session` itself when there is none.
    static func inlineBefore(_ session: ClassSession) -> String {
        guard let number = session.sessionNumber, number > 1 else { return inline(for: session) }
        return String.localizedStringWithFormat(String(localized: "core.session.label.numbered"), String(describing: number - 1)).lowercased()
    }
}
