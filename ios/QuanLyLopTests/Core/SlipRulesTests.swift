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

    func testDefaultSentenceFollowsTheStars() {
        XCTAssertEqual(SlipRules.defaultSentence(stars: 5), "Con học rất tốt, chăm chỉ, tích cực tham gia phát biểu")
        XCTAssertEqual(SlipRules.defaultSentence(stars: 4), "Con học tốt, làm bài đầy đủ nhưng hơi trầm")
        XCTAssertEqual(SlipRules.defaultSentence(stars: 3), "Con học tốt, nhưng còn hơi mất tập trung, nói tự do")
        let low = "Con chưa tích cực tham gia hoạt động, cần tập trung hơn"
        for stars in 0...2 { XCTAssertEqual(SlipRules.defaultSentence(stars: stars), low) }
    }

    func testAnUneditedCommentFollowsTheStarsAndAnEditedOneStays() throws {
        let unedited = try decodeSlip(#"{"stars":4,"criteria":15,"comment":null,"scale":5,\#(common)}"#)
        XCTAssertEqual(SlipRules.sentence(for: unedited), SlipRules.defaultSentence(stars: 4))
        let edited = try decodeSlip(#"{"stars":4,"criteria":15,"comment":"Con tiến bộ rõ","scale":5,\#(common)}"#)
        XCTAssertEqual(SlipRules.sentence(for: edited), "Con tiến bộ rõ")
    }

    func testNormalizedCommentDropsEmptyAndDefaultText() {
        XCTAssertNil(SlipRules.normalizedComment("   \n", stars: 5))
        XCTAssertNil(SlipRules.normalizedComment(" \(SlipRules.defaultSentence(stars: 5)) ", stars: 5))
        XCTAssertEqual(SlipRules.normalizedComment(" Con rất ngoan ", stars: 5), "Con rất ngoan")
        // The default of another star count is an edit.
        XCTAssertEqual(SlipRules.normalizedComment(SlipRules.defaultSentence(stars: 4), stars: 5),
                       SlipRules.defaultSentence(stars: 4))
        XCTAssertEqual(SlipRules.normalizedComment(String(repeating: "a", count: 400), stars: 5)?.count,
                       SlipRules.maxCommentLength)
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
}
