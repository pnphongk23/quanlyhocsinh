import Foundation

/// Avatar initials: first letter of each of the last two words, upper-cased (`initialsOf` in the
/// prototype). Parenthesised parts ("Cô Hương (demo)") and characters that are not letters are
/// dropped first, so the result is never "H(". Empty when the name has no letters; the caller
/// picks the fallback ("GV", "–").
enum AppInitials {
    static func of(_ name: String) -> String {
        let withoutNotes = name
            .replacingOccurrences(of: #"\([^)]*\)?"#, with: " ", options: .regularExpression)
        let words = withoutNotes.split(whereSeparator: \.isWhitespace).compactMap { word in
            word.first(where: \.isLetter).map(String.init)
        }
        return words.suffix(2).joined().uppercased(with: Locale(identifier: "vi_VN"))
    }
}
