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

    var title: String { self == .archive ? "Lưu trữ bài kiểm tra?" : "Xoá bài kiểm tra?" }
    var message: String {
        self == .archive
            ? "Bài đã có điểm nên sẽ được lưu trữ; điểm đã nhập vẫn giữ, bài ẩn khỏi bảng điểm và báo cáo."
            : "Bài chưa có điểm nào nên sẽ bị xoá hẳn."
    }
    var actionLabel: String { self == .archive ? "Lưu trữ bài" : "Xoá bài" }
}
