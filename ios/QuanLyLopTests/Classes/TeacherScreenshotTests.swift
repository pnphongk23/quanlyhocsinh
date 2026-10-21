import SwiftUI
import XCTest
@testable import QuanLyLop

/// Renders the teacher screens from the prototype comparison brief at 390×844.
///
/// The app has no demo login and `App/` is outside this package, so the screens are drawn
/// with `ImageRenderer` from the real SwiftUI views and the synthetic `TeacherDemoData`
/// fixtures. Set `QLH_SCREENSHOT_DIR` to the absolute path of `ios/docs/screens`; without
/// it the test skips, so a normal `xcodebuild test` stays green.
@MainActor
final class TeacherScreenshotTests: XCTestCase {
    func testRenderTeacherScreensForPrototypeComparison() throws {
        guard let directory = ProcessInfo.processInfo.environment["QLH_SCREENSHOT_DIR"] else {
            throw XCTSkip("QLH_SCREENSHOT_DIR not set: screenshot run only")
        }
        let root = URL(fileURLWithPath: directory)
        let data = TeacherDemoData.data()
        for (index, screen) in TeacherDemoScreen.allCases.enumerated() {
            let view = screen.view(data: data.dataSource(for: screen), index: index)
                .frame(width: 390)
                .background(AppColors.background)
                .environment(\.colorScheme, .light)
                .environment(\.teacherStaticLayout, true)
            let renderer = ImageRenderer(content: view)
            renderer.scale = 2
            renderer.isOpaque = true
            guard let image = renderer.uiImage, let png = image.pngData() else {
                XCTFail("could not render \(screen.rawValue)")
                continue
            }
            let folder = root.appendingPathComponent(screen.group, isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            // The prototype shots are 390×844 viewports, so the comparison image keeps the
            // first 844pt; the whole page is kept next to it for content past the fold.
            try png.write(to: folder.appendingPathComponent("\(screen.rawValue)-ios-full.png"))
            if let cropped = Self.cropTop(image, height: 844 * 2), let data = cropped.pngData() {
                try data.write(to: folder.appendingPathComponent("\(screen.rawValue)-ios.png"))
            }
        }
    }
}

extension TeacherScreenshotTests {
    static func cropTop(_ image: UIImage, height: CGFloat) -> UIImage? {
        guard let cg = image.cgImage else { return nil }
        let maxHeight = min(CGFloat(cg.height), height)
        guard let cropped = cg.cropping(to: CGRect(x: 0, y: 0, width: CGFloat(cg.width), height: maxHeight)) else { return nil }
        return UIImage(cgImage: cropped, scale: image.scale, orientation: .up)
    }
}

private extension TeacherFeatureData {
    /// Empty states need an empty data source; everything else uses the shared demo store.
    func dataSource(for screen: TeacherDemoScreen) -> TeacherFeatureData {
        switch screen {
        case .classListEmpty, .studentsEmpty, .scheduleEmpty: TeacherDemoData.emptyData()
        default: self
        }
    }
}
