import Foundation

/// Rules of the five-criteria session slip: stars, default sentences and the sentence the parent reads.
enum SlipRules {
    static let criteriaCount = 5
    static let allCriteria = (1 << criteriaCount) - 1

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

    /// Spec phrases (met, unmet) per criterion, in criterion order. Fixed Vietnamese text of the generated sentence.
    private static let autoPhrases: [(met: String, unmet: String)] = [
        ("chú ý nghe giảng", "chưa chú ý nghe giảng"),
        ("ghi bài đầy đủ", "chưa ghi bài đầy đủ"),
        ("tích cực tham gia các hoạt động trong lớp", "chưa tích cực tham gia hoạt động"),
        ("ngồi học ngoan ngoãn, không mất trật tự", "còn mất trật tự"),
        ("hoàn thành tốt bài tập về nhà", "chưa hoàn thành bài tập về nhà"),
    ]

    /// Items joined as "a, b và c": a comma between all but the last two, "và" before the last.
    private static func joined(_ items: [String]) -> String {
        guard items.count > 1, let last = items.last else { return items.first ?? "" }
        return items.dropLast().joined(separator: ", ") + " " + "và" + " " + last
    }

    /// The sentence generated from the ticked criteria (bit 0...4 in spec order): "Con", the met criteria first,
    /// then the unmet ones after ", nhưng", ending with a full stop. With nothing met only the unmet ones are listed.
    /// Replaces `defaultSentence(stars:)` once the sheet follows the criteria.
    static func generatedSentence(criteria: Int) -> String {
        var met: [String] = []
        var unmet: [String] = []
        for (index, phrase) in autoPhrases.enumerated() {
            if isMet(criteria, index: index) { met.append(phrase.met) } else { unmet.append(phrase.unmet) }
        }
        var sentence = "Con "
        if met.isEmpty {
            sentence += joined(unmet)
        } else if unmet.isEmpty {
            sentence += joined(met)
        } else {
            sentence += joined(met) + ", " + "nhưng" + " " + joined(unmet)
        }
        return sentence + "."
    }

    /// Old star-based sentence; goes away when the sheet moves to `generatedSentence(criteria:)`.
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
    /// The sentence has no length limit: it is only trimmed, never shortened.
    static func normalizedComment(_ text: String, stars: Int) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed == defaultSentence(stars: stars) { return nil }
        return trimmed
    }
}
