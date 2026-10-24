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

    /// The part being graded: the selected kind, or the first part when none is selected (or the
    /// selected kind is not in this lesson's homework).
    static func activeProgress(_ progress: [I4SectionProgress], selected: HomeworkKind?) -> I4SectionProgress? {
        progress.first { $0.section.kind == selected } ?? progress.first
    }

    /// One line for the part picker: the kind, plus the title when it says something else.
    static func partLabel(_ section: HomeworkSection) -> String {
        let title = section.title.trimmingCharacters(in: .whitespacesAndNewlines)
        return title.isEmpty || title == section.kind.label ? section.kind.label : "\(section.kind.label) · \(title)"
    }

    /// Tapping the selected level again clears it.
    static func nextGrade(current: HomeworkLevel?, clicked: HomeworkLevel) -> HomeworkLevel? {
        current == clicked ? nil : clicked
    }

    /// A section can only be removed while nobody has a grade for it.
    static func canDelete(gradeCount: Int) -> Bool { gradeCount == 0 }

    static func deleteBlockedMessage(gradeCount: Int) -> String {
        String.localizedStringWithFormat(String(localized: "feature.homework.a.cham.cho.em.nen.khong.xoa.uoc.van.sua.uoc.tieu"), String(describing: (gradeCount)))
    }

    static let deleteAllowedMessage = String(localized: "feature.homework.chua.cham.cho.em.nao.nen.xoa.uoc")

    /// Choosing a kind writes its name into the title when the title is empty or still the name
    /// written by the previous choice; a title the user typed is never overwritten.
    static func titleAfterChoosing(_ kind: HomeworkKind, title: String,
                                   autoFilled: String?) -> (title: String, autoFilled: String?) {
        let untouched = title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || title == autoFilled
        guard untouched else { return (title, autoFilled) }
        return (kind.label, kind.label)
    }

    static func addPartLabel(missing: [HomeworkKind]) -> String? {
        missing.isEmpty ? nil : String.localizedStringWithFormat(String(localized: "feature.homework.con.loai"), String(describing: (missing.count)))
    }

    static func partsCountLabel(_ count: Int) -> String { String.localizedStringWithFormat(String(localized: "feature.homework.4.phan"), String(describing: (count))) }

    static func gradePillLabel(gradeCount: Int, total: Int) -> String {
        gradeCount > 0 ? String.localizedStringWithFormat(String(localized: "feature.homework.a.cham"), String(describing: (gradeCount)), String(describing: (total))) : String(localized: "feature.homework.ungraded")
    }

    static func previousEmptyCopy(first: Bool) -> (title: String, body: String) {
        first
            ? (String(localized: "feature.homework.buoi.au.chua.co.btvn.buoi.truoc"),
               String(localized: "feature.homework.lop.chua.giao.bai.nao.nen.chua.co.gi.e.cham"))
            : (String(localized: "feature.homework.buoi.truoc.khong.giao.btvn"),
               String(localized: "feature.homework.khong.co.phan.nao.e.cham.o.buoi.nay.phieu.van.gu"))
    }
}
