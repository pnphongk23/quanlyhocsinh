import Foundation

/// "Theo tiêu chí" mode of the comments tab: one group per criterion, one chip per student; a tapped chip means the
/// criterion is not met. Every tap is one `slip.set` for that student.
enum CriteriaModeRules {
    /// What a chip shows for one student and one criterion.
    struct Chip: Identifiable, Equatable {
        let studentID: String
        let name: String
        let unmet: Bool
        /// Old three-star slip: shown dimmed and cannot be edited.
        let isLegacy: Bool
        let isSent: Bool
        let isAbsent: Bool
        var id: String { studentID }
        /// An old three-star slip cannot be edited; a chip of the notes draft can also be closed for other reasons.
        let isEditable: Bool

        init(studentID: String, name: String, unmet: Bool, isLegacy: Bool, isSent: Bool, isAbsent: Bool, isEditable: Bool? = nil) {
            self.studentID = studentID; self.name = name; self.unmet = unmet; self.isLegacy = isLegacy
            self.isSent = isSent; self.isAbsent = isAbsent; self.isEditable = isEditable ?? !isLegacy
        }
    }

    /// An old three-star slip with stars keeps its scale; an unscored old draft has nothing to protect.
    static func isLocked(_ slip: SessionSlip?) -> Bool {
        guard let slip else { return false }
        return slip.isLegacy && slip.stars != nil
    }

    /// The criteria the student's slip shows now: the saved ones with homework following last session's grades
    /// unless set by hand, or the default (all five, homework by grades) when there is no slip.
    static func effectiveCriteria(slip: SessionSlip?, sections: [HomeworkSection], grades: [HomeworkGrade],
                                  studentID: String) -> Int {
        HomeworkRules.openingCriteria(slip: isLocked(slip) ? nil : slip, sections: sections, grades: grades,
                                      studentID: studentID)
    }

    static func chips(rows: [I4TicketRow], criterion: Int, sections: [HomeworkSection],
                      grades: [HomeworkGrade]) -> [Chip] {
        rows.map { row in
            let locked = isLocked(row.slip)
            let criteria = effectiveCriteria(slip: row.slip, sections: sections, grades: grades, studentID: row.student.id)
            return Chip(studentID: row.student.id, name: row.student.name,
                        unmet: !locked && !SlipRules.isMet(criteria, index: criterion),
                        isLegacy: locked, isSent: row.isSent, isAbsent: row.attendance == .absent)
        }
    }

    static func unmetCount(_ chips: [Chip]) -> Int { chips.filter(\.unmet).count }

    /// The save a chip tap makes: the criterion flipped, the sentence written again from the criteria, the note
    /// untouched (the caller passes the slip's own note). Homework is marked hand-set only when that group was tapped.
    static func tapGrading(slip: SessionSlip?, criterion: Int, sections: [HomeworkSection], grades: [HomeworkGrade],
                           studentID: String) -> I4FeatureStore.SlipGrading? {
        guard !isLocked(slip) else { return nil }
        let current = effectiveCriteria(slip: slip, sections: sections, grades: grades, studentID: studentID)
        let next = SlipRules.toggled(current, index: criterion)
        return .criteria(next, comment: SlipRules.generatedSentence(criteria: next),
                         hwManual: criterion == SlipRules.criteriaCount - 1 ? true : nil)
    }

    /// The sentence was typed over by hand, so a tap would replace it with the generated one.
    static func overwritesHandEditedSentence(_ slip: SessionSlip?) -> Bool {
        guard let slip, !slip.isLegacy, let comment = slip.comment else { return false }
        return comment != SlipRules.generatedSentence(criteria: slip.criteria ?? SlipRules.allCriteria)
    }

    /// Why a tap needs a yes first. Each kind is asked once per open session of the tab.
    enum Warning: Hashable { case sent, handEdited }

    static func warnings(slip: SessionSlip?, acknowledged: Set<Warning>) -> [Warning] {
        var found: [Warning] = []
        if slip?.status == .sent { found.append(.sent) }
        if overwritesHandEditedSentence(slip) { found.append(.handEdited) }
        return found.filter { !acknowledged.contains($0) }
    }

    /// The group whose homework criterion follows grading, for the "Theo chấm BTVN" note.
    static func followsGrades(criterion: Int) -> Bool { criterion == SlipRules.criteriaCount - 1 }
}

/// Fixed Vietnamese text of the criteria mode.
enum CriteriaModeText {
    static let byStudent = "Theo học sinh"
    static let byCriterion = "Theo tiêu chí"
    static let hint = "Chạm tên em chưa đạt tiêu chí đó. Chạm lại để bỏ chọn."
    static func unmetCount(_ count: Int) -> String { count == 0 ? "Cả lớp đạt" : "\(count) em chưa đạt" }
    static let sentMark = "Đã gửi"
    static let legacyMark = "Phiếu thang cũ"
    static let absentMark = "Vắng"
    static let followsGrades = "Theo chấm BTVN"
    static let warningTitle = "Sửa phiếu này?"
    static let sentWarning = "Phiếu đã gửi cho phụ huynh. Sửa sẽ đổi phiếu trên máy bạn; phụ huynh chỉ thấy nội dung mới nếu gửi lại."
    static let handEditedWarning = "Câu nhận xét của em này đã được sửa tay. Chạm sẽ viết lại câu từ các tiêu chí (ghi chú riêng được giữ)."
    static let confirm = "Vẫn sửa"
    static let cancel = "Quay lại"
    static let saveFailed = "Không lưu được phiếu."
}

/// Fixed Vietnamese text of the "Gửi nhận xét" permission.
enum SendCommentsText {
    static let group = "Gửi nhận xét"
    static let hint = "Cho phép gửi phiếu cho phụ huynh. Không có quyền này vẫn soạn và gán mặc định được."
}
