import Foundation

/// Score rules that the views and tests share (`TestScoresPage.tsx`, spec mục 4 "Điểm").
enum ScoreRules {
    /// A typed value outside 0…max (an empty box is not an error).
    static func isInvalid(_ raw: String, max: Int) -> Bool {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return false }
        guard let value = Double(trimmed.replacingOccurrences(of: ",", with: ".")) else { return true }
        return !value.isFinite || value < 0 || value > Double(max)
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
