import Foundation

/// Builds the roster `NotesImportRules` reads from what the comments tab already shows: the students enrolled on the
/// session date with their slip and attendance, plus the class members who left earlier or had not joined yet.
enum NotesImportRoster {
    static func build(rows: [I4TicketRow], others: [(student: Student, enrollment: NotesImportRules.Enrollment)],
                      sections: [HomeworkSection], grades: [HomeworkGrade]) -> [NotesImportRules.Student] {
        let enrolled = rows.map { row -> NotesImportRules.Student in
            let slip = row.slip.map { slip in
                let effective = CriteriaModeRules.effectiveCriteria(slip: slip, sections: sections, grades: grades,
                                                                    studentID: row.student.id)
                return NotesImportRules.SlipInfo(state: slip.status == .sent ? .sent : .draft,
                                                 isLegacy: CriteriaModeRules.isLocked(slip),
                                                 unmetMask: SlipRules.allCriteria & ~effective,
                                                 note: slip.note)
            }
            let homeworkDone = HomeworkRules.homeworkCriterionMet(sections: sections, grades: grades, studentID: row.student.id)
            return NotesImportRules.Student(id: row.student.id, fullName: row.student.name,
                                            attendance: attendance(row.attendance), enrollment: .active, slip: slip,
                                            homeworkNotDone: !homeworkDone)
        }
        let rest = others.map {
            NotesImportRules.Student(id: $0.student.id, fullName: $0.student.name, attendance: .notMarked,
                                     enrollment: $0.enrollment, slip: nil, homeworkNotDone: false)
        }
        return enrolled + rest
    }

    private static func attendance(_ status: AttendanceStatus?) -> NotesImportRules.Attendance {
        switch status {
        case .present: .present
        case .late: .late
        case .absent: .absent
        case nil: .notMarked
        }
    }
}

extension I4FeatureStore {
    /// Class members who are not on the session's list: left before its date, or enrolled after it.
    func otherMembers(of session: ClassSession) -> [(student: Student, enrollment: NotesImportRules.Enrollment)] {
        students.filter { $0.classId == session.classId }.compactMap { student in
            if student.enrolledAt > session.date { return (student, .notEnrolledYet) }
            if let left = student.leftAt, left < session.date { return (student, .left) }
            return nil
        }
    }
}
