import Foundation

/// Rules of the five-criteria session slip: stars, default sentences and the sentence the parent reads.
enum SlipRules {
    static let criteriaCount = 5
    static let allCriteria = (1 << criteriaCount) - 1
    static let maxCommentLength = 300

    /// Bit 0...4 in spec order.
    static let criterionKeys = ["slip.criterion.listen", "slip.criterion.notes", "slip.criterion.participate",
                                "slip.criterion.quiet", "slip.criterion.homework"]

    static func criterionTitle(_ index: Int) -> String {
        String(localized: String.LocalizationValue(criterionKeys[index]), table: "Teacher")
    }

    /// One star per criterion met; bits above the fifth are ignored.
    static func stars(criteria: Int) -> Int { (criteria & allCriteria).nonzeroBitCount }

    static func isMet(_ criteria: Int, index: Int) -> Bool { criteria & (1 << index) != 0 }

    static func toggled(_ criteria: Int, index: Int) -> Int { (criteria ^ (1 << index)) & allCriteria }

    static func defaultSentence(stars: Int) -> String {
        let key = switch stars {
        case 5...: "slip.default.five"
        case 4: "slip.default.four"
        case 3: "slip.default.three"
        default: "slip.default.low"
        }
        return String(localized: String.LocalizationValue(key), table: "Teacher")
    }

    /// The sentence a slip carries: a scale-5 slip follows its stars until edited, an old slip keeps the old template.
    static func sentence(for slip: SessionSlip) -> String {
        if slip.isLegacy { return slip.legacyStars?.template ?? "" }
        if let comment = slip.comment { return comment }
        return defaultSentence(stars: slip.stars ?? stars(criteria: slip.criteria ?? allCriteria))
    }

    /// What to send as `comment`: nil when the text is empty or still the default for these stars.
    /// Never shortens the text: a sentence over `maxCommentLength` is refused by `isCommentTooLong` before it gets here.
    static func normalizedComment(_ text: String, stars: Int) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed == defaultSentence(stars: stars) { return nil }
        return trimmed
    }

    /// Length the server counts: the sentence is saved trimmed.
    static func commentLength(_ text: String) -> Int {
        text.trimmingCharacters(in: .whitespacesAndNewlines).count
    }

    static func isCommentTooLong(_ text: String) -> Bool { commentLength(text) > maxCommentLength }
}
