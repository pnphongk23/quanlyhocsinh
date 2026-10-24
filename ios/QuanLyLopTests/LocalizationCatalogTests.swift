import Foundation
import XCTest

final class LocalizationCatalogTests: XCTestCase {
    func testFeatureLocalizedKeysExistInVietnameseCatalog() throws {
        let iosRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let featureRoot = iosRoot.appendingPathComponent("QuanLyLop/Features", isDirectory: true)
        let catalogURL = iosRoot.appendingPathComponent("QuanLyLop/Resources/Localizable.xcstrings")
        let catalogData = try Data(contentsOf: catalogURL)
        let catalog = try XCTUnwrap(
            JSONSerialization.jsonObject(with: catalogData) as? [String: Any]
        )
        let strings = try XCTUnwrap(catalog["strings"] as? [String: Any])
        let keyPattern = try NSRegularExpression(pattern: #"String\(localized:\s*"([^"]+)""#)
        let literalPattern = try NSRegularExpression(pattern: #""((?:\\.|[^"\\])*)""#)
        let vietnamesePattern = try NSRegularExpression(pattern: #"[À-ỹ]"#)
        let sourceURLs = try FileManager.default.subpathsOfDirectory(atPath: featureRoot.path)
            .filter { $0.hasSuffix(".swift") }
            .map { featureRoot.appendingPathComponent($0) }

        var missingKeys: [String] = []
        var untranslatedLiterals: [String] = []
        for sourceURL in sourceURLs {
            let sourceLines = try String(contentsOf: sourceURL, encoding: .utf8).components(separatedBy: .newlines)
            for (lineNumber, line) in sourceLines.enumerated() where !line.trimmingCharacters(in: .whitespaces).hasPrefix("//") {
                let lineRange = NSRange(line.startIndex..<line.endIndex, in: line)
                for match in literalPattern.matches(in: line, range: lineRange) {
                    guard let literalRange = Range(match.range(at: 1), in: line) else { continue }
                    let literal = String(line[literalRange])
                    let literalRangeNS = NSRange(literal.startIndex..<literal.endIndex, in: literal)
                    if vietnamesePattern.firstMatch(in: literal, range: literalRangeNS) != nil {
                        untranslatedLiterals.append("\(sourceURL.lastPathComponent):\(lineNumber + 1): \(literal)")
                    }
                }
            }

            let source = sourceLines.joined(separator: "\n")
            let range = NSRange(source.startIndex..<source.endIndex, in: source)
            for match in keyPattern.matches(in: source, range: range) {
                guard let keyRange = Range(match.range(at: 1), in: source) else { continue }
                let key = String(source[keyRange])
                guard key.hasPrefix("feature."), strings[key] != nil else {
                    missingKeys.append("\(sourceURL.lastPathComponent): \(key)")
                    continue
                }
                let entry = try XCTUnwrap(strings[key] as? [String: Any], key)
                let localizations = try XCTUnwrap(entry["localizations"] as? [String: Any], key)
                let vi = try XCTUnwrap(localizations["vi"] as? [String: Any], key)
                let unit = try XCTUnwrap(vi["stringUnit"] as? [String: Any], key)
                XCTAssertEqual(unit["state"] as? String, "translated", key)
            }
        }

        XCTAssertTrue(missingKeys.isEmpty, "Missing localization keys:\n\(missingKeys.joined(separator: "\n"))")
        XCTAssertTrue(
            untranslatedLiterals.isEmpty,
            "Vietnamese literals must use localization keys:\n\(untranslatedLiterals.joined(separator: "\n"))"
        )
    }

    func testDesignSystemKeysExistInDesignSystemCatalog() throws {
        let iosRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let root = iosRoot.appendingPathComponent("QuanLyLop/Core/DesignSystem", isDirectory: true)
        let catalogURL = iosRoot.appendingPathComponent("QuanLyLop/Resources/DesignSystem.xcstrings")
        let catalog = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: catalogURL)) as? [String: Any])
        let strings = try XCTUnwrap(catalog["strings"] as? [String: Any])
        let pattern = try NSRegularExpression(pattern: #"String\(localized:\s*"([^"]+)",\s*table:\s*"DesignSystem""#)

        var used = Set<String>()
        for path in try FileManager.default.subpathsOfDirectory(atPath: root.path) where path.hasSuffix(".swift") {
            let source = try String(contentsOf: root.appendingPathComponent(path), encoding: .utf8)
            let range = NSRange(source.startIndex..<source.endIndex, in: source)
            for match in pattern.matches(in: source, range: range) {
                if let keyRange = Range(match.range(at: 1), in: source) { used.insert(String(source[keyRange])) }
            }
        }
        XCTAssertFalse(used.isEmpty)
        for key in used {
            let entry = try XCTUnwrap(strings[key] as? [String: Any], "missing \(key)")
            let vi = try XCTUnwrap((entry["localizations"] as? [String: Any])?["vi"] as? [String: Any], key)
            let unit = try XCTUnwrap(vi["stringUnit"] as? [String: Any], key)
            XCTAssertEqual(unit["state"] as? String, "translated", key)
        }
        XCTAssertEqual(Set(strings.keys), used, "catalog keys and code keys must match")
    }
}
