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

    /// The sentence a slip carries: a scale-5 slip carries the stored sentence or, when none is stored yet, the one
    /// generated from its criteria; an old slip keeps the old template.
    static func sentence(for slip: SessionSlip) -> String {
        if slip.isLegacy { return slip.legacyStars?.template ?? "" }
        if let comment = slip.comment { return comment }
        return generatedSentence(criteria: slip.criteria ?? allCriteria)
    }
}

extension SlipRules {
    /// The sentence a slip sheet opens with: the saved one, unless the criteria it opens with differ from the saved
    /// ones (last session's homework was re-graded), in which case it is written again from the criteria.
    static func openingSentence(slip: SessionSlip?, openingCriteria: Int) -> String {
        if let slip, !slip.isLegacy, let comment = slip.comment, slip.criteria == openingCriteria { return comment }
        return generatedSentence(criteria: openingCriteria)
    }

    /// What a save sends. A toggled criterion sends the criteria alone, so the server rewrites the sentence; a
    /// hand-written sentence goes with the criteria it was written for; a note-only change sends neither.
    static func grading(isLegacy: Bool, hasSlip: Bool, criteria: Int, criteriaTouched: Bool, homeworkTouched: Bool,
                        sentence: String?) -> I4FeatureStore.SlipGrading {
        if isLegacy { return .legacy }
        if hasSlip, !criteriaTouched, sentence == nil { return .noteOnly }
        return .criteria(criteria, comment: sentence, hwManual: homeworkTouched ? true : nil)
    }
}

/// Fixed Vietnamese text of the slip sheet kept next to the sentence phrases, outside the string tables.
enum SlipSheetText {
    private static let criteria = ["Chú ý nghe giảng", "Ghi chép đầy đủ", "Tham gia sôi nổi", "Không mất trật tự",
                                   "Hoàn thành BTVN"]
    static func criterion(_ index: Int) -> String { criteria[index] }
    static func scoreLine(stars: Int, canWrite: Bool) -> String {
        canWrite ? "\(stars)/5 sao · bấm tiêu chí để đổi" : "\(stars)/5 sao"
    }
    static let followsGrades = "Theo chấm BTVN"
    static let noPreviousHomework = "Buổi trước chưa có BTVN"
    /// The note on the homework chip: it follows last session's grades, unless there was nothing to grade.
    static func homeworkChipNote(previousSectionCount: Int) -> String {
        previousSectionCount == 0 ? noPreviousHomework : followsGrades
    }
    static let commentTitle = "Nhận xét gửi phụ huynh"
    static let notePlaceholder = "Thêm nhận xét riêng (không bắt buộc)…"
    /// The line under the send-class dialog; the slip has one merged comment, so it says "nhận xét".
    static func sendDialogNote(homeworkSuffix: String) -> String {
        "Phụ huynh nhận **một thông báo** cho buổi này, gồm sao và nhận xét\(homeworkSuffix)"
    }
    static let unsaved = "Chưa lưu"
}
