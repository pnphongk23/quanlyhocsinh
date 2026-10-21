import SwiftUI

/// Exact Vietnamese copy of the prototype account screens
/// (`src/data/authAccounts.ts`, `src/features/settings/SettingsPage.tsx`).
enum AuthCopy {
    static let invalidCredentials = "Số điện thoại hoặc mật khẩu không đúng"
    static let loginLocked = "Thử sai quá nhiều lần, thử lại sau 15 phút"
    static let passwordTooShort = "Mật khẩu phải có ít nhất 8 ký tự."
    static let passwordMismatch = "Mật khẩu nhập lại không khớp."
    static let sameAsTemp = "Mật khẩu mới không được trùng mật khẩu tạm."
    static let sameAsCurrent = "Mật khẩu mới phải khác mật khẩu hiện tại."
    static let wrongCurrent = "Mật khẩu hiện tại không đúng."
    static let logoutFailed = "Không thể đăng xuất."
}

/// Why sign-out was refused: `pendingCommandCount()` was above zero
/// (spec mục 5.3, `SettingsPage.tsx` `LogoutBlocked`).
struct LogoutBlock: Equatable {
    let pending: Int
    let online: Bool

    /// Exact prototype text, one variant per connectivity state.
    var message: String {
        let lead = "Còn \(pending) thay đổi chưa đồng bộ. "
        return lead + (online
            ? "Hãy chờ đồng bộ xong rồi đăng xuất."
            : "Máy đang ngoại tuyến, đăng xuất bây giờ sẽ làm mất dữ liệu. Hãy kết nối mạng để đồng bộ rồi thử lại.")
    }
}

/// Role badge labels and initials from `src/features/auth/roleBadge.ts`.
enum AuthRoleBadge {
    static func label(_ role: Role) -> String {
        if role.scopeKind == .linkedStudents { return "Phụ huynh" }
        if role.name == "Trợ giảng" { return "Trợ giảng" }
        if role.name.localizedCaseInsensitiveContains("quản trị") { return "Quản trị viên" }
        return role.name
    }

    static func initials(_ role: Role) -> String {
        if role.scopeKind == .linkedStudents { return "PH" }
        if role.name == "Trợ giảng" { return "TG" }
        if role.name.localizedCaseInsensitiveContains("quản trị") { return "QT" }
        return "GV"
    }
}

/// Phone display of `src/data/authAccounts.ts` (`formatPhone`) and the read-only
/// field value (`phoneInputValue`).
enum AuthFormat {
    /// "+84 900 000 001"
    static func phone(_ raw: String) -> String {
        let digits = national(raw)
        guard digits.count == 9 else { return raw }
        return "+84 \(digits.prefix(3)) \(digits.dropFirst(3).prefix(3)) \(digits.suffix(3))"
    }

    /// "900 000 001"
    static func phoneInput(_ raw: String) -> String {
        let digits = national(raw)
        guard digits.count == 9 else { return digits }
        return "\(digits.prefix(3)) \(digits.dropFirst(3).prefix(3)) \(digits.suffix(3))"
    }

    static func national(_ raw: String) -> String {
        var digits = raw.filter(\.isNumber)
        if digits.hasPrefix("84") { digits = String(digits.dropFirst(2)) }
        if digits.hasPrefix("0") { digits = String(digits.dropFirst()) }
        return String(digits.prefix(9))
    }

    /// `initialsOf` in `SettingsPage.tsx`: first letter of the last two words.
    static func initials(_ name: String) -> String {
        let parts = name.split(whereSeparator: \.isWhitespace)
        return String(parts.suffix(2).compactMap(\.first)).uppercased()
    }

    /// `classShortLabel` in `SettingsPage.tsx`: "Tiếng Anh giao tiếp 6A" → "6A".
    static func classShortLabel(_ name: String) -> String {
        let pattern = try? NSRegularExpression(pattern: "\\d+[A-Za-z]?")
        let range = NSRange(name.startIndex..., in: name)
        guard let match = pattern?.matches(in: name, range: range).last,
              let found = Range(match.range, in: name) else { return name }
        return String(name[found])
    }

    /// `shortNameOf` in `guardianFormat.ts`: the last two words.
    static func shortName(_ name: String) -> String {
        name.split(whereSeparator: \.isWhitespace).suffix(2).joined(separator: " ")
    }
}
