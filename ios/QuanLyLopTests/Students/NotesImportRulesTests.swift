import XCTest
@testable import QuanLyLop

/// Runs every case of `golden-notes-cases.json` (copied unchanged from main, see Fixtures/golden-notes-cases.SOURCE.txt).
final class NotesImportRulesTests: XCTestCase {
    private func golden() throws -> [String: Any] {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "golden-notes-cases", withExtension: "json"))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    }

    private func roster(_ golden: [String: Any]) throws -> [NotesImportRules.Student] {
        let roster = try XCTUnwrap(golden["roster"] as? [String: Any])
        let homework = try XCTUnwrap(roster["previousHomework"] as? [String: String])
        return try XCTUnwrap(roster["students"] as? [[String: Any]]).map { item in
            var slip: NotesImportRules.SlipInfo?
            if let raw = item["slip"] as? [String: Any] {
                let unchecked = (raw["unchecked"] as? [String]) ?? []
                let mask = unchecked.compactMap { NotesImportRules.criterionKeys.firstIndex(of: $0) }.reduce(0) { $0 | (1 << $1) }
                slip = NotesImportRules.SlipInfo(state: NotesImportRules.SlipState(rawValue: raw["state"] as! String)!,
                                                 isLegacy: (raw["scale"] as? Int) == 3, unmetMask: mask,
                                                 note: (raw["note"] as? String) ?? "")
            }
            let id = item["id"] as! String
            return NotesImportRules.Student(id: id, fullName: item["fullName"] as! String,
                                            attendance: NotesImportRules.Attendance(rawValue: item["attendance"] as! String)!,
                                            enrollment: NotesImportRules.Enrollment(rawValue: item["enrollment"] as! String)!,
                                            slip: slip, homeworkNotDone: homework[id] == "not_done")
        }
    }

    func testAllGoldenCases() throws {
        let golden = try golden()
        let students = try roster(golden)
        let cases = try XCTUnwrap(golden["cases"] as? [[String: Any]])
        XCTAssertEqual(cases.count, 23)
        for item in cases {
            let id = item["id"] as! String
            let options = (item["options"] as? [String: Bool]) ?? [:]
            let result = NotesImportRules.analyze(item["input"] as! String, students: students,
                                                  options: .init(includePraise: options["includePraise"] ?? false,
                                                                 includeSent: options["includeSent"] ?? false,
                                                                 createDefaultsForRest: options["createDefaultsForRest"] ?? false))
            let actual = try JSONSerialization.jsonObject(with: JSONEncoder().encode(result)) as? NSDictionary
            let expected = NSDictionary(dictionary: item["expect"] as! [String: Any])
            if actual != expected {
                for key in expected.allKeys as! [String] where (actual?[key] as? NSObject) != (expected[key] as? NSObject) {
                    XCTFail("\(id): \(key)\n expected \(expected[key] ?? "nil")\n actual   \(actual?[key] ?? "nil")")
                }
                for key in (actual?.allKeys as? [String] ?? []) where expected[key] == nil {
                    XCTFail("\(id): unexpected key \(key)")
                }
            }
        }
    }
}
