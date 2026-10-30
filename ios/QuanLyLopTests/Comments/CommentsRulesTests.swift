import XCTest
@testable import QuanLyLop

final class CommentsRulesTests: XCTestCase {
    private func student(_ id: String, _ name: String) -> Student {
        Student(id: id, classId: "c", name: name, parentPhone: nil, enrolledAt: "2026-09-01",
                leftAt: nil, status: .active, version: 1)
    }

    /// `stars` nil means no slip yet.
    private func row(_ id: String, _ name: String, stars: Int?, sent: Bool,
                     attendance: AttendanceStatus? = nil, graded: Int = 0, total: Int = 0) -> I4TicketRow {
        let slip = stars.map {
            SessionSlip(sessionId: "s", studentId: id, stars: $0, criteria: (1 << $0) - 1, note: "",
                        status: sent ? .sent : .draft,
                        sentAt: sent ? "2026-10-19T11:00:00.000Z" : nil,
                        version: 1, updatedAt: "2026-10-19T11:00:00.000Z")
        }
        return I4TicketRow(student: student(id, name), slip: slip, attendance: attendance,
                           previousHomework: I4HomeworkSummary(total: total, graded: graded),
                           previousDate: "2026-10-14", previousHadSections: true)
    }

    func testDefaultSlipsCoverEveryUnsentSlipAndEveryStudentWithoutOneAndFollowHomeworkGrades() {
        let part = HomeworkSection(id: "p", classId: "c", sessionId: "before", kind: .vocabulary, title: "Từ vựng",
                                   description: "", version: 1)
        let notDone = HomeworkGrade(sectionId: "p", studentId: "b", level: .notDone, version: 1,
                                    updatedAt: "2026-10-25T10:00:00.000Z")
        let rows = [
            row("a", "An", stars: 5, sent: true),
            row("b", "Bình", stars: 2, sent: false),
            row("c", "Chi", stars: nil, sent: false, attendance: .present),
            row("d", "Dũng", stars: nil, sent: false, attendance: .absent),
            row("e", "Em", stars: nil, sent: false),
        ]
        let plans = CommentsRules.defaultSlips(rows, sections: [part], grades: [notDone])
        XCTAssertEqual(plans, [
            .init(studentID: "b", criteria: SlipRules.allCriteria & ~(1 << 4), note: ""),
            .init(studentID: "c", criteria: SlipRules.allCriteria, note: ""),
            .init(studentID: "d", criteria: SlipRules.allCriteria, note: ""),
            .init(studentID: "e", criteria: SlipRules.allCriteria, note: ""),
        ])
    }

    func testDefaultSlipSentenceIsGeneratedFromItsCriteria() {
        let plan = CommentsRules.DefaultSlip(studentID: "a", criteria: 0b01111, note: "")
        XCTAssertEqual(plan.comment, SlipRules.generatedSentence(criteria: 0b01111))
        XCTAssertFalse(plan.comment.isEmpty)
    }

    func testSendDefaultsCoverOnlyAnOldUnscoredDraft() {
        let draft = SessionSlip(sessionId: "s", studentId: "d", stars: 3, criteria: 7, note: "", status: .draft, sentAt: nil,
                                version: 1, updatedAt: "2026-10-19T11:00:00.000Z")
        let unscored = SessionSlip(sessionId: "s", studentId: "e", stars: nil, note: "Cũ", status: .draft, sentAt: nil,
                                   version: 1, updatedAt: "2026-10-19T11:00:00.000Z")
        let slips = ["d": draft, "e": unscored]
        let part = HomeworkSection(id: "p", classId: "c", sessionId: "before", kind: .vocabulary, title: "Từ vựng",
                                   description: "", version: 1)
        let notDone = HomeworkGrade(sectionId: "p", studentId: "b", level: .notDone, version: 1,
                                    updatedAt: "2026-10-25T10:00:00.000Z")
        let plans = CommentsRules.sendDefaults(studentIDs: ["a", "b", "c", "d", "e", "f"], slip: { slips[$0] },
                                               sections: [part], grades: [notDone])
        XCTAssertEqual(plans.map(\.studentID), ["e"], "students without a slip and scored drafts get none")
        XCTAssertEqual(plans.map(\.criteria), [31])
        XCTAssertTrue(plans.allSatisfy { !$0.comment.isEmpty })
    }

    func testAnUnscoredOldDraftStillGetsItsDefault() {
        let unscored = SessionSlip(sessionId: "s", studentId: "x", stars: nil, note: "", status: .draft, sentAt: nil,
                                   version: 1, updatedAt: "2026-10-19T11:00:00.000Z")
        let plans = CommentsRules.sendDefaults(studentIDs: ["x", "y"], slip: { $0 == "x" ? unscored : nil },
                                               sections: [], grades: [])
        XCTAssertEqual(plans.map(\.studentID), ["x"], "y has no slip")
    }

    func testRegradedSlipFollowsOnlyAnUnsentNotHandSetFiveCriteriaSlip() {
        let section = HomeworkSection(id: "p", classId: "c", sessionId: "before", kind: .vocabulary, title: "Từ vựng",
                                      description: "", version: 1)
        let notDone = HomeworkGrade(sectionId: "p", studentId: "a", level: .notDone, version: 1,
                                    updatedAt: "2026-10-25T10:00:00.000Z")
        func slip(criteria: Int = 31, status: SlipStatus = .draft, hwManual: Bool = false) -> SessionSlip {
            SessionSlip(sessionId: "s", studentId: "a", stars: SlipRules.stars(criteria: criteria), criteria: criteria,
                        hwManual: hwManual, note: "", status: status, sentAt: nil, version: 1,
                        updatedAt: "2026-10-25T10:00:00.000Z")
        }
        let change = HomeworkRules.regradedSlip(slip: slip(), sections: [section], grades: [notDone], studentID: "a")
        XCTAssertEqual(change?.criteria, 15)
        XCTAssertEqual(change?.comment, SlipRules.generatedSentence(criteria: 15))
        XCTAssertEqual(HomeworkRules.regradedSlip(slip: slip(criteria: 15), sections: [section], grades: [], studentID: "a")?.criteria, 31)
        XCTAssertNil(HomeworkRules.regradedSlip(slip: slip(status: .sent), sections: [section], grades: [notDone], studentID: "a"))
        XCTAssertNil(HomeworkRules.regradedSlip(slip: slip(hwManual: true), sections: [section], grades: [notDone], studentID: "a"))
        XCTAssertNil(HomeworkRules.regradedSlip(slip: nil, sections: [section], grades: [notDone], studentID: "a"))
        XCTAssertNil(HomeworkRules.regradedSlip(slip: slip(criteria: 15), sections: [section], grades: [notDone], studentID: "a"),
                     "nothing moved, so a hand-written sentence stays")
    }

    func testAssignAllNeverPlansASentSlip() {
        let rows = [row("sent", "An", stars: 5, sent: true, attendance: .present),
                    row("none", "Bình", stars: nil, sent: false, attendance: .absent)]
        XCTAssertEqual(CommentsRules.defaultSlips(rows, sections: [], grades: []).map(\.studentID), ["none"])
    }

    func testDefaultSlipKeepsTheNote() {
        let slip = SessionSlip(sessionId: "s", studentId: "b", stars: 2, criteria: 3, note: "Nhắc con ghi bài",
                               status: .draft, sentAt: nil, version: 1, updatedAt: "2026-10-19T11:00:00.000Z")
        let row = I4TicketRow(student: student("b", "Bình"), slip: slip,
                              previousHomework: I4HomeworkSummary(total: 0, graded: 0),
                              previousDate: nil, previousHadSections: false)
        XCTAssertEqual(CommentsRules.defaultSlips([row], sections: [], grades: []).first?.note, "Nhắc con ghi bài")
    }

    func testCountsAndLabelsOfTheTwoFilters() {
        let rows = [
            row("a", "An", stars: 5, sent: true, graded: 2, total: 2),
            row("b", "Bình", stars: nil, sent: false),
            row("c", "Chi", stars: 2, sent: false)
        ]
        let counts = CommentsRules.counts(rows)
        XCTAssertEqual(counts.all, 3)
        XCTAssertEqual(counts.unsent, 2)
        XCTAssertEqual(TicketFilter.allCases, [.all, .unsent])
        XCTAssertEqual(CommentsRules.filterLabel(.all, counts), "Tất cả (3)")
        XCTAssertEqual(CommentsRules.filterLabel(.unsent, counts), "Chưa gửi (2)")
        XCTAssertEqual(CommentsRules.filtered(rows, .unsent).map(\.student.id), ["b", "c"])
        XCTAssertEqual(CommentsRules.filtered(rows, .all).count, 3)
    }

    func testSendableIsEveryUnsentSlipAndNothingForStudentsWithoutOne() {
        let rows = [
            row("sent", "An", stars: 5, sent: true, attendance: .present),
            row("draft", "Bình", stars: 3, sent: false, attendance: .absent),
            row("present", "Chi", stars: nil, sent: false, attendance: .present),
            row("late", "Dũng", stars: nil, sent: false, attendance: .late),
            row("absent", "Em", stars: nil, sent: false, attendance: .absent),
            row("unmarked", "Giang", stars: nil, sent: false)
        ]
        XCTAssertEqual(CommentsRules.sendable(rows).map(\.student.id), ["draft"])
        XCTAssertEqual(CommentsRules.withoutSlip(rows).map(\.student.id), ["present", "late", "absent", "unmarked"])
    }

    func testCardHasNoStarsAndSaysNotCommentedWhenThereIsNoSlip() {
        let none = row("a", "An", stars: nil, sent: false, attendance: .present)
        XCTAssertNil(none.stars)
        XCTAssertEqual(CommentsRules.starsCaption(none), "Chưa nhận xét")
        XCTAssertNil(CommentsRules.starsCaption(row("b", "Bình", stars: 3, sent: false)))
    }

    func testSendMatrixSendsOnlyExistingSlipsWhateverTheAttendance() {
        let statuses: [(name: String, value: AttendanceStatus?, attended: Bool)] = [
            ("present", .present, true), ("late", .late, true), ("absent", .absent, false),
            ("unmarked", nil, false)
        ]
        var rows: [I4TicketRow] = []
        var expectedSendable: [String] = []
        var expectedWithoutSlip: [String] = []
        for status in statuses {
            let bare = "\(status.name)-none"
            let draft = "\(status.name)-draft"
            rows.append(row(bare, bare, stars: nil, sent: false, attendance: status.value))
            rows.append(row(draft, draft, stars: 2, sent: false, attendance: status.value))
            expectedSendable.append(draft)
            expectedWithoutSlip.append(bare)
        }
        rows.append(row("already-sent", "Đã gửi", stars: 3, sent: true, attendance: .present))

        XCTAssertEqual(Set(CommentsRules.sendable(rows).map(\.student.id)), Set(expectedSendable))
        XCTAssertEqual(CommentsRules.sendable(rows).count, expectedSendable.count)
        XCTAssertEqual(Set(CommentsRules.withoutSlip(rows).map(\.student.id)), Set(expectedWithoutSlip))
        XCTAssertEqual(CommentsRules.withoutSlip(rows).count, expectedWithoutSlip.count)
        XCTAssertFalse(CommentsRules.sendable(rows).map(\.student.id).contains("already-sent"))
        XCTAssertFalse(CommentsRules.withoutSlip(rows).map(\.student.id).contains("already-sent"))
    }

    func testAnOpenedSlipOfAnAbsentStudentIsStillSent() {
        let rows = [row("a", "An", stars: 0, sent: false, attendance: .absent)]
        XCTAssertEqual(CommentsRules.sendable(rows).map(\.student.id), ["a"])
    }

    func testUngradedNoticeCountsOnlySlipsThatWillBeSent() {
        let notice = CommentsRules.ungradedNotice([
            row("c", "Chi", stars: 1, sent: false, graded: 1, total: 3),
            row("d", "Dũng", stars: 2, sent: false, graded: 2, total: 2),
            row("e", "Em", stars: nil, sent: false, attendance: .absent, graded: 0, total: 2)
        ])
        XCTAssertEqual(notice.students, 1)
        XCTAssertEqual(notice.parts, 2)
    }

    func testBadgeCopyFollowsSlipStatus() {
        XCTAssertEqual(CommentsRules.badge(row("a", "An", stars: 5, sent: true)).label, "Đã gửi")
        XCTAssertEqual(CommentsRules.badge(row("a", "An", stars: 5, sent: true)).tone, .success)
        XCTAssertEqual(CommentsRules.badge(row("b", "Bình", stars: nil, sent: false)).label, "Chưa gửi")
        XCTAssertEqual(CommentsRules.badge(row("b", "Bình", stars: nil, sent: false)).tone, .neutral)
    }

    func testHomeworkLineCopy() {
        let ungraded = CommentsRules.homeworkLine(row("c", "Chi", stars: 1, sent: false, graded: 1, total: 3))
        XCTAssertEqual(ungraded.text, "BTVN ngày 14/10: 2 phần Chưa chấm")
        XCTAssertTrue(ungraded.warning)

        let graded = CommentsRules.homeworkLine(row("a", "An", stars: 5, sent: true, graded: 3, total: 3))
        XCTAssertEqual(graded.text, "BTVN ngày 14/10: 3/3 phần đã chấm")
        XCTAssertFalse(graded.warning)

        let noneGiven = I4TicketRow(student: student("d", "Dũng"), slip: nil,
                                    previousHomework: I4HomeworkSummary(total: 0, graded: 0),
                                    previousDate: "2026-10-14", previousHadSections: true)
        XCTAssertEqual(CommentsRules.homeworkLine(noneGiven).text, "Buổi trước không giao BTVN")

        let first = I4TicketRow(student: student("e", "Em"), slip: nil,
                                previousHomework: I4HomeworkSummary(total: 0, graded: 0),
                                previousDate: nil, previousHadSections: false)
        XCTAssertEqual(CommentsRules.homeworkLine(first).text, "Buổi đầu · chưa có BTVN buổi trước")
    }

    /// The three sample sentences are fixed by `docs/spec.md` mục 4; compare every character.
    func testStarTemplatesMatchTheSpecVerbatim() {
        XCTAssertEqual(Stars.three.template,
                       "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!")
        XCTAssertEqual(Stars.two.template,
                       "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.")
        XCTAssertEqual(Stars.one.template,
                       "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.")
    }

    func testSendAvailabilityLocksOfflineAndNeverQueues() {
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 3, isOnline: true), .ready)
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 0, isOnline: true), .nothingToSend)
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 3, isOnline: false), .needsNetwork)
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 0, isOnline: false), .needsNetwork)
        XCTAssertEqual(CommentsRules.sendGate(.ready), .go)
        XCTAssertEqual(CommentsRules.sendGate(.needsNetwork), .blocked)
        XCTAssertEqual(CommentsRules.sendGate(.nothingToSend), .alreadySent, "a second press after sending sends nothing")
    }

    func testSheetIsNotUnsavedAfterItsOwnSave() {
        let opening = SlipDraft(criteria: 31, note: "", homeworkTouched: false, sentence: nil)
        let edited = SlipDraft(criteria: 15, note: "ghi chú", homeworkTouched: true, sentence: "Em cố gắng hơn.")
        XCTAssertTrue(SlipRules.hasUnsavedChanges(hasSlip: true, current: edited, opening: opening, lastSaved: nil))
        XCTAssertFalse(SlipRules.hasUnsavedChanges(hasSlip: true, current: edited, opening: opening, lastSaved: edited),
                       "right after a save the sheet matches what was saved")
        var more = edited
        more.note = "ghi chú thêm"
        XCTAssertTrue(SlipRules.hasUnsavedChanges(hasSlip: true, current: more, opening: opening, lastSaved: edited))
    }

    func testSheetWithoutSlipHasSomethingToSaveUntilSaved() {
        let opening = SlipDraft(criteria: 31, note: "", homeworkTouched: false, sentence: nil)
        XCTAssertTrue(SlipRules.hasUnsavedChanges(hasSlip: false, current: opening, opening: opening, lastSaved: nil))
        XCTAssertFalse(SlipRules.hasUnsavedChanges(hasSlip: true, current: opening, opening: opening, lastSaved: nil))
        XCTAssertFalse(SlipRules.hasUnsavedChanges(hasSlip: false, current: opening, opening: opening, lastSaved: opening))
    }
}

final class CriteriaModeRulesTests: XCTestCase {
    private func student(_ id: String) -> Student {
        Student(id: id, classId: "c", name: "HS \(id)", parentPhone: nil, enrolledAt: "2026-01-01", leftAt: nil, status: .active, version: 1)
    }

    private func slip(_ id: String, criteria: Int? = SlipRules.allCriteria, comment: String? = nil, hwManual: Bool = false,
                      status: SlipStatus = .draft, stars: Int? = nil, scale: Int? = nil) -> SessionSlip {
        SessionSlip(sessionId: "s", studentId: id, stars: stars ?? criteria.map { SlipRules.stars(criteria: $0) },
                    criteria: criteria, comment: comment, scale: scale, hwManual: hwManual, note: "ghi chú",
                    status: status, sentAt: nil, version: 2, updatedAt: "x")
    }

    private func row(_ id: String, slip: SessionSlip?, attendance: AttendanceStatus? = nil) -> I4TicketRow {
        I4TicketRow(student: student(id), slip: slip, attendance: attendance,
                    previousHomework: I4HomeworkSummary(total: 0, graded: 0), previousDate: nil, previousHadSections: false)
    }

    func testStudentWithoutASlipShowsTheDefaultAndATapUnticksOnlyThatCriterion() {
        let none: I4FeatureStore.SlipGrading? = CriteriaModeRules.tapGrading(slip: nil, criterion: 3, sections: [], grades: [], studentID: "a")
        let expected = SlipRules.allCriteria & ~(1 << 3)
        XCTAssertEqual(none, .criteria(expected, comment: SlipRules.generatedSentence(criteria: expected), hwManual: nil))
    }

    func testTappingAnUnmetChipTicksItAgainAndKeepsTheOthers() {
        let before = SlipRules.allCriteria & ~(1 << 0) & ~(1 << 2)
        let grading = CriteriaModeRules.tapGrading(slip: slip("a", criteria: before), criterion: 0, sections: [], grades: [], studentID: "a")
        let after = before | 1
        XCTAssertEqual(grading, .criteria(after, comment: SlipRules.generatedSentence(criteria: after), hwManual: nil))
    }

    func testHomeworkTapMarksTheFlagByHandOtherGroupsDoNot() {
        guard case .criteria(_, _, let flag)? = CriteriaModeRules.tapGrading(slip: slip("a"), criterion: 4, sections: [], grades: [], studentID: "a")
        else { return XCTFail("expected a criteria grading") }
        XCTAssertEqual(flag, true)
    }

    func testLegacySlipWithStarsIsLockedButAnUnscoredOldDraftIsNot() {
        let legacy = slip("a", criteria: nil, stars: 2, scale: SessionSlip.legacyScale)
        XCTAssertNil(CriteriaModeRules.tapGrading(slip: legacy, criterion: 1, sections: [], grades: [], studentID: "a"))
        let chip = CriteriaModeRules.chips(rows: [row("a", slip: legacy)], criterion: 1, sections: [], grades: []).first
        XCTAssertEqual(chip?.isLegacy, true)
        XCTAssertEqual(chip?.unmet, false)
        let draft = slip("b", criteria: nil, stars: nil, scale: SessionSlip.legacyScale)
        XCTAssertNotNil(CriteriaModeRules.tapGrading(slip: draft, criterion: 1, sections: [], grades: [], studentID: "b"))
    }

    func testChipsCountUnmetAndMarkSentAndAbsent() {
        let rows = [row("a", slip: slip("a", criteria: SlipRules.allCriteria & ~2, status: .sent), attendance: .absent),
                    row("b", slip: nil), row("c", slip: slip("c", criteria: SlipRules.allCriteria & ~2))]
        let chips = CriteriaModeRules.chips(rows: rows, criterion: 1, sections: [], grades: [])
        XCTAssertEqual(CriteriaModeRules.unmetCount(chips), 2)
        XCTAssertEqual(chips.first?.isSent, true)
        XCTAssertEqual(chips.first?.isAbsent, true)
        XCTAssertEqual(chips.map(\.hasSlip), [true, false, true], "a student without a slip shows the paler default")
    }

    func testDefaultFiveStarSlipIsMetForEveryCriterionSoTheWholeClassIsFilled() {
        let rows = [row("a", slip: slip("a", criteria: SlipRules.allCriteria)), row("b", slip: nil)]
        for criterion in 0..<SlipRules.criteriaCount {
            let chips = CriteriaModeRules.chips(rows: rows, criterion: criterion, sections: [], grades: [])
            XCTAssertEqual(CriteriaModeRules.unmetCount(chips), 0, "criterion \(criterion)")
        }
    }

    func testBadgeSaysWholeClassMetOnlyWhenEveryStudentHasAMetSlip() {
        let met = slip("a", criteria: SlipRules.allCriteria)
        func chips(_ rows: [I4TicketRow]) -> [CriteriaModeRules.Chip] {
            CriteriaModeRules.chips(rows: rows, criterion: 1, sections: [], grades: [])
        }
        let allMet = chips([row("a", slip: met), row("c", slip: slip("c", criteria: SlipRules.allCriteria))])
        XCTAssertEqual(CriteriaModeRules.summary(allMet), .allMet)
        XCTAssertEqual(CriteriaModeText.summary(.allMet), "Cả lớp đạt")

        let noSlip = chips([row("a", slip: met), row("b", slip: nil), row("c", slip: nil)])
        XCTAssertEqual(CriteriaModeRules.noSlipCount(noSlip), 2)
        XCTAssertEqual(CriteriaModeRules.summary(noSlip), .noSlip(2))
        XCTAssertEqual(CriteriaModeText.summary(.noSlip(2)), "2 em chưa có phiếu")

        let unmet = chips([row("a", slip: slip("a", criteria: SlipRules.allCriteria & ~2)), row("b", slip: nil)])
        XCTAssertEqual(CriteriaModeRules.summary(unmet), .unmet(1))
        XCTAssertEqual(CriteriaModeText.summary(.unmet(1)), "1 em chưa đạt")
    }

    func testWarningsAskOncePerKind() {
        let edited = slip("a", comment: "Con rất tốt.", status: .sent)
        XCTAssertEqual(Set(CriteriaModeRules.warnings(slip: edited, acknowledged: [])), [.sent, .handEdited])
        XCTAssertEqual(CriteriaModeRules.warnings(slip: edited, acknowledged: [.sent]), [.handEdited])
        let generated = slip("b", comment: SlipRules.generatedSentence(criteria: SlipRules.allCriteria))
        XCTAssertTrue(CriteriaModeRules.warnings(slip: generated, acknowledged: []).isEmpty)
        XCTAssertTrue(CriteriaModeRules.warnings(slip: nil, acknowledged: []).isEmpty)
    }
}
