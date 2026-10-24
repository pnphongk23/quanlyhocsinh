import XCTest
@testable import QuanLyLop

final class ScoreRulesTests: XCTestCase {
    func testEmptyBoxIsNotAnErrorAndInvalidValuesAre() {
        XCTAssertFalse(ScoreRules.isInvalid("", max: 15))
        XCTAssertTrue(ScoreRules.isEmpty("  "))
        for value in ["0", "0,5", "7,5", "7.5", "15"] {
            XCTAssertFalse(ScoreRules.isInvalid(value, max: 15), "Expected \(value) to be valid")
        }
        XCTAssertFalse(ScoreRules.isInvalid(" 8 ", max: 15))
        for value in ["7,3", "7,25", "15,5", "-0,5", "abc"] {
            XCTAssertTrue(ScoreRules.isInvalid(value, max: 15), "Expected \(value) to be invalid")
        }
    }

    func testMissingCountOnlyCountsSavedValues() {
        let students = [
            Student(id: "a", classId: "c", name: "An", parentPhone: nil, enrolledAt: "2026-09-01",
                    leftAt: nil, status: .active, version: 1),
            Student(id: "b", classId: "c", name: "Bình", parentPhone: nil, enrolledAt: "2026-09-01",
                    leftAt: nil, status: .active, version: 1)
        ]
        let scores = [
            Score(testId: "t", studentId: "a", value: 0, version: 1, updatedAt: "2026-10-21"),
            Score(testId: "t", studentId: "b", value: nil, version: 1, updatedAt: "2026-10-21")
        ]
        // 0 is a saved score; nil is "Chưa có điểm".
        XCTAssertEqual(ScoreRules.missingCount(testID: "t", students: students, scores: scores), 1)
    }

    func testDeletionArchivesWhenAnyScoreExists() {
        XCTAssertEqual(ScoreRules.deletionMode(hasScores: true), .archive)
        XCTAssertEqual(ScoreRules.deletionMode(hasScores: false), .delete)
        XCTAssertEqual(TestDeletion.archive.title, "Lưu trữ bài kiểm tra?")
        XCTAssertEqual(TestDeletion.delete.title, "Xoá bài kiểm tra?")
        XCTAssertEqual(TestDeletion.archive.actionLabel, "Lưu trữ bài")
        XCTAssertEqual(TestDeletion.delete.actionLabel, "Xoá bài")
        XCTAssertEqual(TestDeletion.delete.message, "Bài chưa có điểm nào nên sẽ bị xoá hẳn.")
    }

    func testInputTextUsesVietnameseDecimalSeparatorWithoutTrailingZeroes() {
        XCTAssertEqual(ScoreRules.inputText(nil), "")
        XCTAssertEqual(ScoreRules.inputText(9), "9")
        XCTAssertEqual(ScoreRules.inputText(7.5), "7,5")
        XCTAssertEqual(ScoreRules.inputText(0), "0")
    }

    func testScoreDisplayUsesVietnameseDecimalsAndDashForMissingValues() {
        XCTAssertEqual(I4Format.score(82.0), "82")
        XCTAssertEqual(I4Format.score(7.5), "7,5")
        XCTAssertEqual(I4Format.score(0.0), "0")
        XCTAssertEqual(I4Format.score(nil), "–")
    }

    func testMaximumAndHighestScoreValidation() throws {
        let test = try TestDefinition(id: "t", classId: "c", name: "Unit 6", date: "2026-10-21")
        XCTAssertEqual(test.maxScore, 15)
        XCTAssertThrowsError(try test.validateNewMaximum(1001, highestScore: nil))
        XCTAssertThrowsError(try test.validateNewMaximum(0, highestScore: nil))
        XCTAssertNoThrow(try test.validateNewMaximum(10, highestScore: 10))
        XCTAssertThrowsError(try test.validateNewMaximum(10, highestScore: 10.5))
    }
}
