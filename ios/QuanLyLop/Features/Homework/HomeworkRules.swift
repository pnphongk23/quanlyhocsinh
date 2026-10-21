import Foundation

/// Homework rules shared by the homework tab and the comment sheet
/// (`design/prototype/src/data/homework.ts`, `features/homework/homeworkModel.ts`).
struct I4HomeworkSummary: Equatable {
    let total: Int
    let graded: Int

    var ungraded: Int { max(0, total - graded) }
}

struct I4SectionProgress: Identifiable {
    let section: HomeworkSection
    let summary: I4HomeworkSummary
    var id: String { section.id }
}

enum HomeworkRules {
    static func ordered(_ sessions: [ClassSession]) -> [ClassSession] {
        sessions.sorted { ($0.date, $0.startTime) < ($1.date, $1.startTime) }
    }

    /// The latest non-cancelled session before the one being viewed (`previousHomeworkSession`).
    static func previousSession(_ sessions: [ClassSession], before session: ClassSession) -> ClassSession? {
        let earlier = ordered(sessions).filter {
            $0.classId == session.classId && ($0.date, $0.startTime) < (session.date, session.startTime)
        }
        return earlier.last { $0.status != .cancelled }
    }

    /// The grading session after the giving session, skipping cancelled ones (`gradingSessionPlan`).
    static func gradingPlan(_ sessions: [ClassSession], after session: ClassSession) -> (session: ClassSession?, cancelled: [ClassSession]) {
        let later = ordered(sessions).filter {
            $0.classId == session.classId && ($0.date, $0.startTime) > (session.date, session.startTime)
        }
        var cancelled: [ClassSession] = []
        for candidate in later {
            if candidate.status == .cancelled {
                cancelled.append(candidate)
                continue
            }
            return (candidate, cancelled)
        }
        return (nil, cancelled)
    }

    static func summary(sections: [HomeworkSection], grades: [HomeworkGrade], studentID: String) -> I4HomeworkSummary {
        let graded = sections.filter { section in
            grades.contains { $0.sectionId == section.id && $0.studentId == studentID && $0.level != nil }
        }.count
        return I4HomeworkSummary(total: sections.count, graded: graded)
    }

    static func progress(sections: [HomeworkSection], grades: [HomeworkGrade], students: [Student]) -> [I4SectionProgress] {
        sections.map { section in
            let graded = students.filter { student in
                grades.contains { $0.sectionId == section.id && $0.studentId == student.id && $0.level != nil }
            }.count
            return I4SectionProgress(section: section, summary: I4HomeworkSummary(total: students.count, graded: graded))
        }
    }

    /// Tapping the selected level again clears it.
    static func nextGrade(current: HomeworkLevel?, clicked: HomeworkLevel) -> HomeworkLevel? {
        current == clicked ? nil : clicked
    }

    /// A section can only be removed while nobody has a grade for it.
    static func canDelete(gradeCount: Int) -> Bool { gradeCount == 0 }

    static func deleteBlockedMessage(gradeCount: Int) -> String {
        "Đã chấm cho \(gradeCount) em nên không xoá được. Vẫn sửa được tiêu đề và mô tả."
    }

    static let deleteAllowedMessage = "Chưa chấm cho em nào nên xoá được."

    static func addPartLabel(missing: [HomeworkKind]) -> String? {
        missing.isEmpty ? nil : "còn \(missing.count) loại"
    }

    static func partsCountLabel(_ count: Int) -> String { "\(count)/4 phần" }

    static func gradePillLabel(gradeCount: Int, total: Int) -> String {
        gradeCount > 0 ? "Đã chấm \(gradeCount)/\(total)" : "Chưa chấm"
    }

    static func previousEmptyCopy(first: Bool) -> (title: String, body: String) {
        first
            ? ("Buổi đầu, chưa có BTVN buổi trước",
               "Lớp chưa giao bài nào nên chưa có gì để chấm.")
            : ("Buổi trước không giao BTVN",
               "Không có phần nào để chấm ở buổi này. Phiếu vẫn gửi bình thường.")
    }
}
