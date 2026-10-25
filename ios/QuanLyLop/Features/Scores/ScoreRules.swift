import Foundation

/// Score rules that the views and tests share (`TestScoresPage.tsx`, spec mục 4 "Điểm").
enum ScoreRules {
    static let maximum = 1000.0

    /// A score the server accepts: 0…1000 in steps of 0,5.
    static func isInvalid(_ value: Double) -> Bool {
        guard value.isFinite, value >= 0, value <= maximum else { return true }
        return abs(value * 2 - (value * 2).rounded()) > 1e-9
    }

    /// A typed value outside the allowed scores (an empty box is not an error).
    static func isInvalid(_ raw: String) -> Bool {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return false }
        guard let value = Double(trimmed.replacingOccurrences(of: ",", with: ".")) else { return true }
        return isInvalid(value)
    }

    /// Text shown in a score field: localized decimal separator without trailing zeroes.
    static func inputText(_ value: Double?) -> String {
        guard let value else { return "" }
        return I4Format.score(value)
    }

    static func isEmpty(_ raw: String) -> Bool {
        raw.trimmingCharacters(in: .whitespaces).isEmpty
    }

    /// Number of students without a score ("Còn N em chưa có điểm").
    static func missingCount(testID: String, students: [Student], scores: [Score]) -> Int {
        students.filter { student in
            !scores.contains { $0.testId == testID && $0.studentId == student.id && $0.value != nil }
        }.count
    }

    /// Drafts left after "Gán điểm mặc định" finished: the ones still equal to what they were when the
    /// teacher confirmed were overwritten by the default and go; anything typed or changed while the
    /// assignment was running stays.
    static func draftsAfterAssign(current: [String: String], atConfirm: [String: String]) -> [String: String] {
        current.filter { atConfirm[$0.key] != $0.value }
    }

    /// A test with any saved score (including 0) is archived; otherwise it is deleted outright.
    static func deletionMode(hasScores: Bool) -> TestDeletion {
        hasScores ? .archive : .delete
    }
}

enum TestDeletion: Equatable {
    case delete
    case archive

    var title: String { self == .archive ? String(localized: "feature.scores.luu.tru.bai.kiem.tra") : String(localized: "feature.scores.xoa.bai.kiem.tra") }
    var message: String {
        self == .archive
            ? String(localized: "feature.scores.bai.a.co.iem.nen.se.uoc.luu.tru.iem.a.nhap.van.g")
            : String(localized: "feature.scores.bai.chua.co.iem.nao.nen.se.bi.xoa.han")
    }
    var actionLabel: String { self == .archive ? String(localized: "feature.scores.luu.tru.bai") : String(localized: "feature.scores.xoa.bai") }
}
