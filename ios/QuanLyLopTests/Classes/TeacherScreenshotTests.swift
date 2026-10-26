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
    /// The slip sheet of a four-star slip, drawn at 390×844 the way `design/slip-sheet-v4` shows it.
    func testRenderSlipSheet() throws {
        guard let directory = ProcessInfo.processInfo.environment["QLH_SLIP_SHEET_DIR"] else {
            throw XCTSkip("QLH_SLIP_SHEET_DIR not set: screenshot run only")
        }
        let session = ClassSession(id: "s", classId: "c", date: "2026-10-25", startTime: "18:00", origin: .recurring,
                                   isMakeup: false, status: .held, note: nil, version: 1)
        let student = Student(id: "a", classId: "c", name: "Nguyễn Vũ Gia Hân", parentPhone: nil,
                              enrolledAt: "2026-09-01", leftAt: nil, status: .active, version: 1)
        func slip(_ criteria: Int, hwManual: Bool = false, note: String = "") -> SessionSlip {
            SessionSlip(sessionId: "s", studentId: "a", stars: SlipRules.stars(criteria: criteria), criteria: criteria,
                        hwManual: hwManual, note: note, status: .draft, sentAt: nil, version: 1,
                        updatedAt: "2026-10-25T10:00:00.000Z")
        }
        let previousPart = HomeworkSection(id: "p", classId: "c", sessionId: "before", kind: .vocabulary, title: "Từ vựng",
                                           description: "", version: 1)
        let notDone = HomeworkGrade(sectionId: "p", studentId: "a", level: .notDone, version: 1,
                                    updatedAt: "2026-10-25T10:00:00.000Z")
        let longNote = (1...6).map { "Dòng \($0): em tập trung hơn ở phần nghe, cần luyện thêm phát âm cuối từ." }
            .joined(separator: "\n")
        let states: [(name: String, slip: SessionSlip?, sections: [HomeworkSection], grades: [HomeworkGrade])] = [
            ("slip-5-stars", slip(0b11111, hwManual: true), [], []),
            ("slip-4-stars-missing-order", slip(0b10111, hwManual: true), [], []),
            ("slip-0-stars", slip(0, hwManual: true), [], []),
            ("slip-homework-auto", slip(0b11111), [previousPart], [notDone]),
            ("slip-long-note", slip(0b10111, hwManual: true, note: longNote), [], []),
            // A slip that was never saved has unsaved changes, so the footer shows "Chưa lưu".
            ("slip-unsaved", nil, [previousPart], [notDone])
        ]
        let folder = URL(fileURLWithPath: directory, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        for state in states {
            let sheet = I4TicketSheet(session: session, student: student, slip: state.slip, previousDate: nil,
                                      sections: state.sections, grades: state.grades, canWrite: true,
                                      saveStatusSource: nil, onClose: {}, onGoHomework: {}, onSave: { _, _ in nil })
            try Self.snapshot(sheet, to: folder.appendingPathComponent("\(state.name).png"))
        }
    }

    /// `ImageRenderer` leaves a `ScrollView` empty, so the sheet is hosted in a real window and drawn from it.
    private static func snapshot<V: View>(_ view: V, to url: URL) throws {
        let frame = CGRect(x: 0, y: 0, width: 390, height: 844)
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let window = UIWindow(windowScene: scene)
        window.frame = frame
        let host = UIHostingController(rootView: view.environment(\.colorScheme, .light))
        window.rootViewController = host
        window.makeKeyAndVisible()
        RunLoop.main.run(until: Date().addingTimeInterval(0.8))
        let image = UIGraphicsImageRenderer(bounds: frame).image { _ in
            window.drawHierarchy(in: frame, afterScreenUpdates: true)
        }
        window.isHidden = true
        try XCTUnwrap(image.pngData()).write(to: url)
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
