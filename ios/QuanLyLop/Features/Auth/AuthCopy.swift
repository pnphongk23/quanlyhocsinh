import SwiftUI

/// Exact Vietnamese copy of the prototype account screens
/// (`src/data/authAccounts.ts`, `src/features/settings/SettingsPage.tsx`).
enum AuthCopy {
    static let invalidCredentials = String(localized: "feature.auth.so.ien.thoai.hoac.mat.khau.khong.ung")
    static let loginLocked = String(localized: "feature.auth.thu.sai.qua.nhieu.lan.thu.lai.sau.15.phut")
    static let passwordTooShort = String(localized: "feature.auth.mat.khau.phai.co.it.nhat.8.ky.tu")
    static let passwordMismatch = String(localized: "feature.auth.mat.khau.nhap.lai.khong.khop")
    static let sameAsCurrent = String(localized: "feature.auth.mat.khau.moi.phai.khac.mat.khau.hien.tai")
    static let wrongCurrent = String(localized: "feature.auth.mat.khau.hien.tai.khong.ung")
    static let logoutFailed = String(localized: "feature.auth.khong.the.ang.xuat")
    static let forgotPasswordDescription = String(localized: "feature.auth.nguoi.van.hanh.dat.lai.mat.khau")
    static let forgotPasswordStepOne = String(localized: "feature.auth.lien.he.nguoi.van.hanh")
    static let forgotPasswordStepTwo = String(localized: "feature.auth.nguoi.van.hanh.dat.lai.thu.cong")
}

/// Why sign-out was refused: `pendingCommandCount()` was above zero
/// (spec mục 5.3, `SettingsPage.tsx` `LogoutBlocked`).
struct LogoutBlock: Equatable {
    let pending: Int
    let online: Bool

    /// Exact prototype text, one variant per connectivity state.
    var message: String {
        let lead = String.localizedStringWithFormat(String(localized: "feature.auth.con.thay.oi.chua.ong.bo"), String(describing: (pending)))
        return lead + (online
            ? String(localized: "feature.auth.hay.cho.ong.bo.xong.roi.ang.xuat")
            : String(localized: "feature.auth.may.ang.ngoai.tuyen.ang.xuat.bay.gio.se.lam.mat"))
    }
}

/// Role badge labels and initials from `src/features/auth/roleBadge.ts`.
enum AuthRoleBadge {
    static func label(_ role: Role) -> String {
        if role.scopeKind == .linkedStudents { return String(localized: "feature.auth.phu.huynh") }
        if role.name == String(localized: "feature.auth.tro.giang") { return String(localized: "feature.auth.tro.giang") }
        if role.name.localizedCaseInsensitiveContains(String(localized: "feature.auth.quan.tri")) { return String(localized: "feature.auth.quan.tri.vien") }
        return role.name
    }

    static func initials(_ role: Role) -> String {
        if role.scopeKind == .linkedStudents { return "PH" }
        if role.name == String(localized: "feature.auth.tro.giang") { return "TG" }
        if role.name.localizedCaseInsensitiveContains(String(localized: "feature.auth.quan.tri")) { return "QT" }
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
