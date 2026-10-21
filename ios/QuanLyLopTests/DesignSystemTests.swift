import SwiftUI
import XCTest
@testable import QuanLyLop

/// Guards the token table in `docs/report-i1.md`: every value comes from
/// `design/prototype/src/shared/styles/tokens.css` and `src/shared/ui/ui.module.css`.
@MainActor
final class DesignSystemTests: XCTestCase {
    private func rgb(_ color: Color) -> (Int, Int, Int) {
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        UIColor(color).getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        return (Int((red * 255).rounded()), Int((green * 255).rounded()), Int((blue * 255).rounded()))
    }

    private func assertColor(_ color: Color, _ hex: Int, file: StaticString = #filePath, line: UInt = #line) {
        let (red, green, blue) = rgb(color)
        XCTAssertEqual(red, (hex >> 16) & 255, "red of #\(String(hex, radix: 16))", file: file, line: line)
        XCTAssertEqual(green, (hex >> 8) & 255, "green of #\(String(hex, radix: 16))", file: file, line: line)
        XCTAssertEqual(blue, hex & 255, "blue of #\(String(hex, radix: 16))", file: file, line: line)
    }

    func testColorsMatchPrototypeTokens() {
        assertColor(AppColors.canvas, 0xEAECF1)
        assertColor(AppColors.background, 0xF6F7F9)
        assertColor(AppColors.surface, 0xFFFFFF)
        assertColor(AppColors.border, 0xE6E9EE)
        assertColor(AppColors.divider, 0xEEF0F3)
        assertColor(AppColors.inputBorder, 0xD2D7DF)
        assertColor(AppColors.inputBorderStrong, 0xB7BEC9)
        assertColor(AppColors.text, 0x14181F)
        assertColor(AppColors.muted, 0x4A5361)
        assertColor(AppColors.placeholder, 0x6B7280)
        assertColor(AppColors.primary, 0x2F5BEA)
        assertColor(AppColors.primaryInk, 0x1E43B8)
        assertColor(AppColors.primarySoft, 0xE8EEFE)
        assertColor(AppColors.onPrimary, 0xFFFFFF)
        assertColor(AppColors.success, 0x14663F)
        assertColor(AppColors.successSoft, 0xE7F6EC)
        assertColor(AppColors.warning, 0x8A5300)
        assertColor(AppColors.warningSoft, 0xFFF3D6)
        assertColor(AppColors.error, 0xB42318)
        assertColor(AppColors.errorSoft, 0xFDECEC)
        assertColor(AppColors.neutralSoft, 0xF0F2F5)
    }

    func testRadiiMetricsAndTypeScaleMatchPrototype() {
        XCTAssertEqual(AppRadius.card, 16)
        XCTAssertEqual(AppRadius.row, 14)
        XCTAssertEqual(AppRadius.control, 14)
        XCTAssertEqual(AppRadius.button, 12)
        XCTAssertEqual(AppRadius.chip, 10)
        XCTAssertEqual(AppMetrics.tap, 44)
        XCTAssertEqual(AppMetrics.inputHeight, 52)
        XCTAssertEqual(AppButtonStyle.Size.small.height, 44)
        XCTAssertEqual(AppButtonStyle.Size.medium.height, 48)
        XCTAssertEqual(AppButtonStyle.Size.large.height, 52)
        XCTAssertEqual(AppText.title.size, 26)
        XCTAssertEqual(AppText.titleCompact.size, 22)
        XCTAssertEqual(AppText.heading.size, 18)
        XCTAssertEqual(AppText.subheading.size, 16)
        XCTAssertEqual(AppText.label.size, 14)
        XCTAssertEqual(AppText.caption.size, 12)
        XCTAssertEqual(AppText.pill.size, 13)
        XCTAssertEqual(AppText.segment.size, 15)
        XCTAssertEqual(AppText.body.lineHeight, 24)
        XCTAssertEqual(AppText.pill.weight, .semiBold)
    }

    func testBundledFontLoadsWithRealWeights() {
        let regular = AppFont.uiFont(size: 16, weight: .regular)
        XCTAssertTrue(regular.fontName.hasPrefix("PlusJakartaSans"),
                      "expected the bundled Plus Jakarta Sans, got \(regular.fontName)")
        let bold = AppFont.uiFont(size: 16, weight: .bold)
        XCTAssertNotEqual(bold.fontDescriptor, regular.fontDescriptor)
        XCTAssertEqual(AppFont.uiFont(size: 16, weight: .bold).pointSize, 16)
        XCTAssertGreaterThan(AppText.body.extraLineSpacing, 0, "line-height 1.5 needs extra leading")
        XCTAssertEqual(AppText.title.tracking, -0.26, accuracy: 0.001)
    }

    func testAttendanceAndHomeworkLabelsComeFromPrototype() {
        XCTAssertEqual(AttendanceStatus.allCases.map(\.label), ["Có mặt", "Muộn", "Có phép", "Vắng"])
        XCTAssertEqual(HomeworkLevel.allCases.map(\.label), ["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"])
        XCTAssertEqual(AttendanceStatus.excused.pillTone, .primary)
        XCTAssertEqual(HomeworkLevel.done.pillTone, .primary)
        XCTAssertEqual(HomeworkLevel.notDone.pillTone, .error)
        XCTAssertEqual(Stars.three.template,
            "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!")
    }
}
