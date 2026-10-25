import XCTest
@testable import QuanLyLop

final class HomeworkRulesTests: XCTestCase {
    private func session(_ id: String, _ date: String, status: SessionStatus = .held,
                         number _: Int? = nil) -> ClassSession {
        ClassSession(id: id, classId: "c", date: date, startTime: "18:00", origin: .recurring,
                     isMakeup: false, status: status, note: nil, version: 1)
    }

    private func student(_ id: String) -> Student {
        Student(id: id, classId: "c", name: "Em \(id)", parentPhone: nil, enrolledAt: "2026-09-01",
                leftAt: nil, status: .active, version: 1)
    }

    private func section(_ id: String, kind: HomeworkKind, session: String) -> HomeworkSection {
        HomeworkSection(id: id, classId: "c", sessionId: session, kind: kind, title: "Tiêu đề",
                        description: "", version: 1)
    }

    private func grade(_ section: String, _ student: String, _ level: HomeworkLevel?) -> HomeworkGrade {
        HomeworkGrade(sectionId: section, studentId: student, level: level, version: 1,
                      updatedAt: "2026-10-19T11:00:00.000Z")
    }

    func testPreviousSessionSkipsCancelledSessions() {
        let sessions = [
            session("s1", "2026-10-01", number: 1),
            session("s2", "2026-10-08", number: 2),
            session("s3", "2026-10-15", status: .cancelled),
            session("s4", "2026-10-19", number: 3)
        ]
        XCTAssertEqual(HomeworkRules.previousSession(sessions, before: sessions[3])?.id, "s2")
        XCTAssertNil(HomeworkRules.previousSession(sessions, before: sessions[0]))
    }

    func testGradingPlanSkipsCancelledSessionsAndReportsThem() {
        let sessions = [
            session("s1", "2026-10-01", number: 1),
            session("s2", "2026-10-08", status: .cancelled),
            session("s3", "2026-10-15", number: 2),
            session("s4", "2026-10-22", number: 3)
        ]
        let plan = HomeworkRules.gradingPlan(sessions, after: sessions[0])
        XCTAssertEqual(plan.session?.id, "s3")
        XCTAssertEqual(plan.cancelled.map(\.id), ["s2"])

        let last = HomeworkRules.gradingPlan(sessions, after: sessions[3])
        XCTAssertNil(last.session)
        XCTAssertTrue(last.cancelled.isEmpty)
    }

    func testDeleteIsBlockedOnceAnyGradeExists() {
        XCTAssertTrue(HomeworkRules.canDelete(gradeCount: 0))
        XCTAssertFalse(HomeworkRules.canDelete(gradeCount: 1))
        XCTAssertEqual(HomeworkRules.deleteAllowedMessage, "Chưa chấm cho em nào nên xoá được.")
        XCTAssertTrue(HomeworkRules.deleteBlockedMessage(gradeCount: 2).contains("2 em"))
    }

    func testTappingTheSameLevelClearsIt() {
        XCTAssertEqual(HomeworkRules.nextGrade(current: .done, clicked: .done), nil)
        XCTAssertEqual(HomeworkRules.nextGrade(current: .done, clicked: .excellent), .excellent)
        XCTAssertEqual(HomeworkRules.nextGrade(current: nil, clicked: .notDone), .notDone)
    }

    func testAuxiliaryLabels() {
        XCTAssertNil(HomeworkRules.addPartLabel(missing: []))
        XCTAssertEqual(HomeworkRules.addPartLabel(missing: [.reading, .speaking]), "còn 2 loại")
        XCTAssertEqual(HomeworkRules.partsCountLabel(3), "3/4 phần")
        XCTAssertEqual(HomeworkRules.gradePillLabel(gradeCount: 0, total: 9), "Chưa chấm")
        XCTAssertEqual(HomeworkRules.gradePillLabel(gradeCount: 4, total: 9), "Đã chấm 4/9")
        XCTAssertEqual(HomeworkRules.previousEmptyCopy(first: true).title, "Buổi đầu, chưa có BTVN buổi trước")
        XCTAssertEqual(HomeworkRules.previousEmptyCopy(first: false).title, "Buổi trước không giao BTVN")
    }

    func testSectionProgressAndStudentSummary() {
        let sections = [
            section("v", kind: .vocabulary, session: "s1"),
            section("r", kind: .reading, session: "s1")
        ]
        let grades = [
            grade("v", "a", .excellent),
            grade("v", "b", .done),
            grade("v", "c", nil),
            grade("r", "a", .notDone)
        ]
        let students = ["a", "b", "c"].map(student)
        let progress = HomeworkRules.progress(sections: sections, grades: grades, students: students)
        XCTAssertEqual(progress[0].summary, I4HomeworkSummary(total: 3, graded: 2))
        XCTAssertEqual(progress[0].summary.ungraded, 1)
        XCTAssertEqual(progress[1].summary, I4HomeworkSummary(total: 3, graded: 1))
        XCTAssertEqual(HomeworkRules.summary(sections: sections, grades: grades, studentID: "a"),
                       I4HomeworkSummary(total: 2, graded: 2))
        XCTAssertEqual(HomeworkRules.summary(sections: sections, grades: grades, studentID: "c"),
                       I4HomeworkSummary(total: 2, graded: 0))
    }

    func testKindLabelsAndOrder() {
        XCTAssertEqual(HomeworkKind.allCases.sorted { $0.sortOrder < $1.sortOrder },
                       [.vocabulary, .reading, .speaking, .exercise])
        XCTAssertEqual(HomeworkKind.vocabulary.label, "Luyện từ vựng")
        XCTAssertEqual(HomeworkKind.reading.label, "Luyện đọc")
        XCTAssertEqual(HomeworkKind.speaking.label, "Luyện nói")
        XCTAssertEqual(HomeworkKind.exercise.label, "Bài tập")
    }

    func testChoosingKindFillsEmptyTitle() {
        let result = HomeworkRules.titleAfterChoosing(.reading, title: "", autoFilled: nil)
        XCTAssertEqual(result.title, "Luyện đọc")
        XCTAssertEqual(result.autoFilled, "Luyện đọc")
        XCTAssertEqual(HomeworkRules.titleAfterChoosing(.reading, title: "  \n", autoFilled: nil).title, "Luyện đọc")
    }

    func testChoosingAnotherKindReplacesOnlyTheAutoFilledTitle() {
        let result = HomeworkRules.titleAfterChoosing(.speaking, title: "Luyện đọc", autoFilled: "Luyện đọc")
        XCTAssertEqual(result.title, "Luyện nói")
        XCTAssertEqual(result.autoFilled, "Luyện nói")
    }

    func testChoosingKindNeverOverwritesTypedTitle() {
        let typed = HomeworkRules.titleAfterChoosing(.speaking, title: "Unit 3 nói", autoFilled: nil)
        XCTAssertEqual(typed.title, "Unit 3 nói")
        XCTAssertNil(typed.autoFilled)
        let edited = HomeworkRules.titleAfterChoosing(.exercise, title: "Luyện đọc thêm", autoFilled: "Luyện đọc")
        XCTAssertEqual(edited.title, "Luyện đọc thêm")
        XCTAssertEqual(edited.autoFilled, "Luyện đọc")
    }

    func testActiveProgressFollowsTheSelectedKindAndFallsBackToTheFirst() {
        let vocabulary = I4SectionProgress(section: section("a", kind: .vocabulary, session: "s"),
                                           summary: I4HomeworkSummary(total: 2, graded: 1))
        let grammar = I4SectionProgress(section: section("b", kind: .reading, session: "s"),
                                        summary: I4HomeworkSummary(total: 2, graded: 0))
        XCTAssertEqual(HomeworkRules.activeProgress([vocabulary, grammar], selected: .reading)?.section.id, "b")
        XCTAssertEqual(HomeworkRules.activeProgress([vocabulary, grammar], selected: nil)?.section.id, "a")
        XCTAssertEqual(HomeworkRules.activeProgress([vocabulary], selected: .reading)?.section.id, "a")
        XCTAssertNil(HomeworkRules.activeProgress([], selected: .reading))
    }

    func testPartLabelRepeatsTheKindOnlyWhenTheTitleSaysSomethingElse() {
        let plain = HomeworkSection(id: "a", classId: "c", sessionId: "s", kind: .vocabulary,
                                    title: HomeworkKind.vocabulary.label, description: "", version: 1)
        XCTAssertEqual(HomeworkRules.partLabel(plain), HomeworkKind.vocabulary.label)
        let blank = HomeworkSection(id: "a", classId: "c", sessionId: "s", kind: .vocabulary,
                                    title: "  ", description: "", version: 1)
        XCTAssertEqual(HomeworkRules.partLabel(blank), HomeworkKind.vocabulary.label)
        let named = section("b", kind: .reading, session: "s")
        XCTAssertEqual(HomeworkRules.partLabel(named), "\(HomeworkKind.reading.label) · Tiêu đề")
    }

    // MARK: - Homework criterion

    private var parts: [HomeworkSection] {
        [section("v", kind: .vocabulary, session: "prev"), section("r", kind: .reading, session: "prev")]
    }

    private func criterion(_ grades: [HomeworkGrade], sections: [HomeworkSection]? = nil, manual: Bool? = nil) -> Bool {
        HomeworkRules.homeworkCriterionMet(sections: sections ?? parts, grades: grades, studentID: "a", manual: manual)
    }

    func testHomeworkCriterionUnticksOnANotDonePart() {
        XCTAssertFalse(criterion([grade("v", "a", .excellent), grade("r", "a", .notDone)]))
        XCTAssertFalse(criterion([grade("v", "a", .notDone)]), "a partly graded set with a not-done part")
    }

    func testHomeworkCriterionTicksWhenEveryGradedPartIsDone() {
        XCTAssertTrue(criterion([grade("v", "a", .excellent), grade("r", "a", .done)]))
    }

    func testHomeworkCriterionKeepsTheDefaultWhenNothingIsGradedOrNoHomework() {
        XCTAssertTrue(criterion([]))
        XCTAssertTrue(criterion([grade("v", "a", nil)]))
        XCTAssertTrue(criterion([], sections: []), "no homework given last session")
    }

    func testHomeworkCriterionTicksOnAPartialGradeWithoutNotDone() {
        XCTAssertTrue(criterion([grade("v", "a", .done)]))
    }

    func testHomeworkCriterionIgnoresOtherStudentsAndOtherSessionsParts() {
        XCTAssertTrue(criterion([grade("v", "b", .notDone)]))
        XCTAssertTrue(criterion([grade("other", "a", .notDone)]))
    }

    func testHomeworkCriterionManualValueWinsOverGrades() {
        let notDone = [grade("v", "a", .notDone)]
        XCTAssertTrue(criterion(notDone, manual: true))
        XCTAssertFalse(criterion([grade("v", "a", .excellent)], manual: false))
    }
}
