import XCTest
@testable import QuanLyLop

final class SlipRulesTests: XCTestCase {
    private func decodeSlip(_ json: String) throws -> SessionSlip {
        try WireJSON.decoder().decode(SessionSlip.self, from: Data(json.utf8))
    }

    private let common = """
    "session_id":"s","student_id":"a","note":"","status":"sent","sent_at":null,"version":1,"updated_at":"2026-10-25T10:00:00.000Z"
    """

    func testStarsAreTheNumberOfCriteriaMet() {
        XCTAssertEqual(SlipRules.stars(criteria: 0), 0)
        XCTAssertEqual(SlipRules.stars(criteria: 0b00001), 1)
        XCTAssertEqual(SlipRules.stars(criteria: 0b10101), 3)
        XCTAssertEqual(SlipRules.stars(criteria: 0b11110), 4)
        XCTAssertEqual(SlipRules.stars(criteria: SlipRules.allCriteria), 5)
        XCTAssertEqual(SlipRules.stars(criteria: 0b111111), 5, "bits above the fifth are ignored")
    }

    func testTogglingACriterionFlipsOnlyItsBit() {
        var criteria = SlipRules.allCriteria
        criteria = SlipRules.toggled(criteria, index: 3)
        XCTAssertEqual(criteria, 0b10111)
        XCTAssertFalse(SlipRules.isMet(criteria, index: 3))
        XCTAssertEqual(SlipRules.stars(criteria: criteria), 4)
        XCTAssertEqual(SlipRules.toggled(criteria, index: 3), SlipRules.allCriteria)
    }

    func testCriteriaAreNamedInSpecOrder() {
        XCTAssertEqual((0..<SlipRules.criteriaCount).map(SlipRules.criterionTitle), [
            "Chú ý nghe giảng", "Ghi chép đầy đủ", "Tham gia hoạt động sôi nổi", "Không mất trật tự",
            "Hoàn thành bài tập về nhà"
        ])
    }

    func testASlipWithoutAStoredSentenceCarriesTheGeneratedOneAndAStoredOneStays() throws {
        let unedited = try decodeSlip(#"{"stars":4,"criteria":23,"comment":null,"scale":5,\#(common)}"#)
        XCTAssertEqual(SlipRules.sentence(for: unedited), SlipRules.generatedSentence(criteria: 23))
        let stored = try decodeSlip(#"{"stars":4,"criteria":15,"comment":"Con tiến bộ rõ","scale":5,\#(common)}"#)
        XCTAssertEqual(SlipRules.sentence(for: stored), "Con tiến bộ rõ")
    }

    func testOldSlipDecodesAsScaleThreeAndKeepsItsOldSentence() throws {
        let old = try decodeSlip(#"{"stars":2,\#(common)}"#)
        XCTAssertTrue(old.isLegacy)
        XCTAssertEqual(old.scale, 3)
        XCTAssertNil(old.criteria)
        XCTAssertEqual(old.legacyStars, .two)
        XCTAssertEqual(SlipRules.sentence(for: old), Stars.two.template)
    }

    func testFiveCriteriaSlipDecodesCriteriaCommentAndScale() throws {
        let slip = try decodeSlip(#"{"stars":5,"criteria":31,"comment":null,"scale":5,\#(common)}"#)
        XCTAssertFalse(slip.isLegacy)
        XCTAssertEqual(slip.scale, 5)
        XCTAssertEqual(slip.criteria, 31)
        XCTAssertNil(slip.comment)
    }

    func testStarsSummaryWithoutStars5DecodesAsZero() throws {
        let summary = try WireJSON.decoder().decode(StarsSummary.self, from: Data(#"{"three":1,"two":2,"one":3}"#.utf8))
        XCTAssertEqual(summary.stars5, Stars5Summary())
        XCTAssertEqual(summary.legacyTotal, 6)
        let withFive = try WireJSON.decoder().decode(
            StarsSummary.self, from: Data(#"{"three":0,"two":0,"one":0,"stars5":{"s5":2,"s4":1,"s3":0,"s2":0,"s1":0,"s0":1}}"#.utf8))
        XCTAssertEqual(withFive.stars5.total, 4)
        XCTAssertEqual(withFive.stars5.descending.map(\.count), [2, 1, 0, 0, 0, 1])
    }

    func testBatchDecodesMonthAndIgnoresSessionNumbers() throws {
        let json = #"{"id":"b","class_id":"c","month":"2026-10","from_session_id":null,"to_session_id":null,"from_number":null,"to_number":null,"from_key":"2026-10-01 00:00","to_key":"2026-10-31 23:59","version":1}"#
        let batch = try WireJSON.decoder().decode(ReportBatch.self, from: Data(json.utf8))
        XCTAssertEqual(batch.month, "2026-10")
        let old = try WireJSON.decoder().decode(ReportBatch.self, from: Data(#"{"id":"b","class_id":"c","from_session_id":"x","to_session_id":"y","from_number":1,"to_number":8,"from_key":"2026-10-01 18:00","to_key":"2026-10-24 18:00","version":1}"#.utf8))
        XCTAssertNil(old.month)
    }

    // MARK: - Generated sentence

    func testGeneratedSentenceForFiveStars() {
        XCTAssertEqual(SlipRules.generatedSentence(criteria: 0b11111),
                       "Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà.")
    }

    func testGeneratedSentenceMissingQuiet() {
        XCTAssertEqual(SlipRules.generatedSentence(criteria: 0b10111),
                       "Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng còn mất trật tự.")
    }

    func testGeneratedSentenceWithNothingMetListsOnlyUnmet() {
        XCTAssertEqual(SlipRules.generatedSentence(criteria: 0),
                       "Con chưa chú ý nghe giảng, chưa ghi bài đầy đủ, chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.")
    }

    func testGeneratedSentenceTwoMetThreeUnmet() {
        XCTAssertEqual(SlipRules.generatedSentence(criteria: 0b00011),
                       "Con chú ý nghe giảng và ghi bài đầy đủ, nhưng chưa tích cực tham gia hoạt động, còn mất trật tự và chưa hoàn thành bài tập về nhà.")
    }

    func testGeneratedSentenceOneMetFourUnmet() {
        XCTAssertEqual(SlipRules.generatedSentence(criteria: 0b00100),
                       "Con tích cực tham gia các hoạt động trong lớp, nhưng chưa chú ý nghe giảng, chưa ghi bài đầy đủ, còn mất trật tự và chưa hoàn thành bài tập về nhà.")
    }

    func testGeneratedSentenceFourMetOneUnmetEachCriterion() {
        let unmet = ["chưa chú ý nghe giảng", "chưa ghi bài đầy đủ", "chưa tích cực tham gia hoạt động",
                     "còn mất trật tự", "chưa hoàn thành bài tập về nhà"]
        for index in 0..<5 {
            let sentence = SlipRules.generatedSentence(criteria: SlipRules.allCriteria & ~(1 << index))
            XCTAssertTrue(sentence.hasSuffix(", nhưng \(unmet[index])."), sentence)
        }
    }

    func testGeneratedSentenceShapeForEveryMask() {
        for mask in 0...SlipRules.allCriteria {
            let sentence = SlipRules.generatedSentence(criteria: mask)
            XCTAssertTrue(sentence.hasPrefix("Con "), sentence)
            XCTAssertTrue(sentence.hasSuffix("."), sentence)
            XCTAssertEqual(sentence.contains("nhưng"), mask != 0 && mask != SlipRules.allCriteria, sentence)
        }
        XCTAssertEqual(SlipRules.generatedSentence(criteria: 0b111111), SlipRules.generatedSentence(criteria: 0b11111))
    }

    // MARK: - Hand-set homework flag

    func testHwManualDecodesFromZeroOneBoolOrAbsent() throws {
        let base = #"{"session_id":"s","student_id":"a","criteria":15,"scale":5,"note":"","status":"draft","sent_at":null,"version":1,"updated_at":"2026-10-26T10:00:00.000Z""#
        XCTAssertTrue(try decodeSlip(base + #","hw_manual":1}"#).hwManual)
        XCTAssertFalse(try decodeSlip(base + #","hw_manual":0}"#).hwManual)
        XCTAssertTrue(try decodeSlip(base + #","hw_manual":true}"#).hwManual)
        XCTAssertFalse(try decodeSlip(base + "}").hwManual, "an old cache or a parent view has no flag")
    }

    func testHwManualSurvivesTheCacheRoundTrip() throws {
        let slip = SessionSlip(sessionId: "s", studentId: "a", stars: 4, criteria: 15, hwManual: true, note: "",
                               status: .draft, sentAt: nil, version: 2, updatedAt: "2026-10-26T10:00:00.000Z")
        let data = try WireJSON.encoder().encode(slip)
        XCTAssertEqual(try WireJSON.decoder().decode(SessionSlip.self, from: data), slip)
        XCTAssertTrue(String(decoding: data, as: UTF8.self).contains("\"hw_manual\":true"))
    }

    func testHomeworkChipSaysSoWhenLastSessionHadNoHomework() {
        XCTAssertEqual(SlipSheetText.homeworkChipNote(previousSectionCount: 0), "Buổi trước chưa có BTVN")
        XCTAssertEqual(SlipSheetText.homeworkChipNote(previousSectionCount: 2), "Theo chấm BTVN")
        let none = HomeworkRules.openingCriteria(slip: nil, sections: [], grades: [], studentID: "a")
        XCTAssertTrue(SlipRules.isMet(none, index: 4), "the criterion stays ticked")
    }

    func testSendDialogNoteSaysCommentNotSampleSentenceAndNote() {
        let text = SlipSheetText.sendDialogNote(homeworkSuffix: ".")
        XCTAssertEqual(text, "Phụ huynh nhận **một thông báo** cho buổi này, gồm sao và nhận xét.")
        XCTAssertFalse(text.contains("câu mẫu"))
    }

    // MARK: - Hand-editable sentence

    func testSavePayloadAlwaysPairsCriteriaWithASentence() {
        func grading(touched: Bool, sentence: String?, hasSlip: Bool = true, legacy: Bool = false) -> I4FeatureStore.SlipGrading {
            SlipRules.grading(isLegacy: legacy, hasSlip: hasSlip, criteria: 15, criteriaTouched: touched,
                              homeworkTouched: false, sentence: sentence)
        }
        XCTAssertEqual(grading(touched: true, sentence: nil), .criteria(15, comment: SlipRules.generatedSentence(criteria: 15)),
                       "a toggled criterion brings its generated sentence")
        XCTAssertEqual(grading(touched: false, sentence: "Con ngoan."), .criteria(15, comment: "Con ngoan."))
        XCTAssertEqual(grading(touched: true, sentence: "Con ngoan."), .criteria(15, comment: "Con ngoan."))
        XCTAssertEqual(grading(touched: false, sentence: nil), .noteOnly)
        XCTAssertEqual(grading(touched: false, sentence: nil, hasSlip: false), .criteria(15, comment: SlipRules.generatedSentence(criteria: 15)))
        XCTAssertEqual(grading(touched: true, sentence: nil, legacy: true), .legacy)
    }

    func testOpeningSentenceKeepsTheSavedOneUnlessTheCriteriaMoved() throws {
        let slip = try decodeSlip(#"{"stars":4,"criteria":15,"comment":"Con tiến bộ rõ","scale":5,\#(common)}"#)
        XCTAssertEqual(SlipRules.openingSentence(slip: slip, openingCriteria: 15), "Con tiến bộ rõ")
        XCTAssertEqual(SlipRules.openingSentence(slip: slip, openingCriteria: 31), SlipRules.generatedSentence(criteria: 31),
                       "re-grading homework overwrites a hand-written sentence")
        XCTAssertEqual(SlipRules.openingSentence(slip: nil, openingCriteria: 31), SlipRules.generatedSentence(criteria: 31))
    }

    func testAParentSlipWithoutNoteDecodes() throws {
        let slip = try decodeSlip(#"{"session_id":"s","student_id":"a","stars":4,"comment":"Con chú ý nghe giảng.\nGhi thêm","scale":5,"status":"sent","sent_at":null,"version":1,"updated_at":"2026-10-26T10:00:00.000Z"}"#)
        XCTAssertEqual(slip.note, "")
        XCTAssertNil(slip.criteria)
        XCTAssertFalse(slip.hwManual)
        XCTAssertEqual(SlipRules.sentence(for: slip), "Con chú ý nghe giảng.\nGhi thêm", "the merged paragraph is shown whole")
    }
}
