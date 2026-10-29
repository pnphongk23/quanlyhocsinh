import XCTest
@testable import QuanLyLop

/// Runs every case of `golden-import-cases.json` (copied unchanged from main, see Fixtures/golden-import-cases.SOURCE.txt).
final class StudentImportRulesTests: XCTestCase {
    private struct Golden: Decodable {
        struct Existing: Decodable { let id: String; let fullName: String; let guardianPhone: String? }
        struct Row: Decodable { let name: String?; let guardianPhone: String?; let flags: [String]; let status: String }
        struct Expect: Decodable { let rows: [Row]; let addCount: Int; let warnings: [String] }
        struct Case: Decodable { let id: String; let input: String; let existingStudentCount: Int; let expect: Expect }
        let existingRoster: [Existing]
        let cases: [Case]
    }

    private func golden() throws -> Golden {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "golden-import-cases", withExtension: "json"))
        return try JSONDecoder().decode(Golden.self, from: Data(contentsOf: url))
    }

    func testAllGoldenCases() throws {
        let golden = try golden()
        XCTAssertEqual(golden.cases.count, 14)
        let roster = golden.existingRoster.map { StudentImportRules.Existing(fullName: $0.fullName, guardianPhone: $0.guardianPhone) }
        for item in golden.cases {
            let plan = StudentImportRules.plan(item.input, existing: roster, existingCount: item.existingStudentCount)
            XCTAssertEqual(plan.rows.count, item.expect.rows.count, item.id)
            for (row, expected) in zip(plan.rows, item.expect.rows) {
                XCTAssertEqual(row.name, expected.name, item.id)
                XCTAssertEqual(row.guardianPhone, expected.guardianPhone, item.id)
                XCTAssertEqual(Set(row.flags.map(\.rawValue)), Set(expected.flags), item.id)
                XCTAssertEqual(row.status.rawValue, expected.status, item.id)
            }
            XCTAssertEqual(plan.addCount, item.expect.addCount, item.id)
            XCTAssertEqual(plan.warnings.map(\.rawValue), item.expect.warnings, item.id)
        }
    }

    func testForcingAnExistingStudentAddsIt() {
        let roster = [StudentImportRules.Existing(fullName: "Nguyễn Văn An", guardianPhone: "+84912345678")]
        let candidates = StudentImportRules.parse("nguyen van an\t0912345678")
        XCTAssertEqual(StudentImportRules.analyze(candidates, existing: roster).rows.first?.status, .skipExisting)
        let forced = StudentImportRules.analyze(candidates, existing: roster, forceAdd: [candidates[0].id])
        XCTAssertEqual(forced.rows.first?.status, .add)
        XCTAssertEqual(forced.addCount, 1)
    }

    func testEditedRowIsAnalysedAgain() {
        var candidates = StudentImportRules.parse("Trần Bình\t091201345")
        XCTAssertEqual(StudentImportRules.analyze(candidates, existing: []).rows.first?.status, .needsFix)
        candidates[0].phoneText = "0912013456"
        let row = StudentImportRules.analyze(candidates, existing: []).rows.first
        XCTAssertEqual(row?.status, .add)
        XCTAssertEqual(row?.guardianPhone, "+84912013456")
    }
}
