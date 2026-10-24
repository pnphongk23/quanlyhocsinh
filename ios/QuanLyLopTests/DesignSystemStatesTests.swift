import SwiftUI
import XCTest
@testable import QuanLyLop

/// Sleeps that only finish when the test says so, so the 400 ms / 1.6 s holds can be observed.
@MainActor
private final class ManualSleeper {
    private(set) var requested: [TimeInterval] = []
    private var waiting: [CheckedContinuation<Void, Never>] = []

    func sleep(_ seconds: TimeInterval) async {
        requested.append(seconds)
        await withCheckedContinuation { waiting.append($0) }
    }

    func releaseAll() {
        let pending = waiting
        waiting = []
        pending.forEach { $0.resume() }
    }

    func waitForRequest(count: Int) async {
        for _ in 0..<2000 where requested.count < count { await Task.yield() }
    }
}

@MainActor
final class DesignSystemStatesTests: XCTestCase {
    private struct Failure: Error {}

    private func makeController(_ sleeper: ManualSleeper, announced: @escaping @MainActor (String) -> Void = { _ in })
        -> AppSaveController {
        AppSaveController(now: { Date(timeIntervalSince1970: 1_000) },
                          sleep: { await sleeper.sleep($0) }, announce: announced)
    }

    // MARK: Save controller

    func testSaveHoldsLoadingForMinimumThenShowsSavedThenIdle() async {
        let sleeper = ManualSleeper()
        var announcements: [String] = []
        let controller = makeController(sleeper) { announcements.append($0) }

        let outcome = Task { await controller.submit { } }
        await sleeper.waitForRequest(count: 1)
        XCTAssertEqual(controller.phase, .saving)
        XCTAssertEqual(sleeper.requested, [AppDuration.loadingMin], "work finished at once, still 400 ms of loading")

        sleeper.releaseAll()
        let ok = await outcome.value
        XCTAssertTrue(ok)
        XCTAssertEqual(controller.phase, .saved)
        XCTAssertEqual(announcements, ["Đã lưu"])

        await sleeper.waitForRequest(count: 2)
        XCTAssertEqual(sleeper.requested.last, AppDuration.successHold)
        XCTAssertEqual(controller.phase, .saved, "saved is held until the 1.6 s are over")
        sleeper.releaseAll()
        for _ in 0..<2000 where controller.phase != .idle { await Task.yield() }
        XCTAssertEqual(controller.phase, .idle)
    }

    func testFailureReturnsToIdleKeepsErrorAndNeverShowsSaved() async {
        let sleeper = ManualSleeper()
        let controller = makeController(sleeper)

        let outcome = Task { await controller.submit { throw Failure() } }
        await sleeper.waitForRequest(count: 1)
        XCTAssertEqual(controller.phase, .saving, "an error also waits out the minimum loading")
        sleeper.releaseAll()

        let ok = await outcome.value
        XCTAssertFalse(ok)
        XCTAssertEqual(controller.phase, .idle)
        XCTAssertTrue(controller.error is Failure)
        XCTAssertEqual(sleeper.requested, [AppDuration.loadingMin], "no success hold after an error")

        controller.clearError()
        XCTAssertNil(controller.error)
    }

    func testSecondSubmitIsIgnoredWhileSaving() async {
        let sleeper = ManualSleeper()
        let controller = makeController(sleeper)
        var runs = 0
        let first = Task { await controller.submit { runs += 1 } }
        await sleeper.waitForRequest(count: 1)

        let second = await controller.submit { runs += 1 }
        XCTAssertFalse(second)
        sleeper.releaseAll()
        _ = await first.value
        XCTAssertEqual(runs, 1)
    }

    func testRetryAfterFailureStartsANewSave() async {
        let sleeper = ManualSleeper()
        let controller = makeController(sleeper)
        let failing = Task { await controller.submit { throw Failure() } }
        await sleeper.waitForRequest(count: 1)
        sleeper.releaseAll()
        _ = await failing.value

        let retry = Task { await controller.submit { } }
        await sleeper.waitForRequest(count: 2)
        XCTAssertNil(controller.error, "a new attempt clears the old error")
        sleeper.releaseAll()
        let ok = await retry.value
        XCTAssertTrue(ok)
        XCTAssertEqual(controller.phase, .saved)
    }

    func testDurationsMatchTokens() {
        XCTAssertEqual(AppDuration.loadingMin, 0.4)
        XCTAssertEqual(AppDuration.successHold, 1.6)
        XCTAssertEqual(AppDuration.pendingAfter, 1.0)
        XCTAssertEqual(AppMetrics.emptyMascot, 96)
        XCTAssertEqual(AppMetrics.emptyMascotCompact, 56)
        XCTAssertEqual(AppState.disabledOpacity, 0.5)
    }

    // MARK: Save status

    func testStatusKindTransitions() {
        let start = Date(timeIntervalSince1970: 5_000)
        func kind(failed: Bool = false, since: Date? = start, online: Bool = true, after: TimeInterval) -> SaveStatusKind {
            .resolve(failed: failed, unsyncedSince: since, isOnline: online, now: start.addingTimeInterval(after))
        }
        XCTAssertEqual(kind(since: nil, after: 9), .savedLocal)
        XCTAssertEqual(kind(after: 0.5), .savedLocal, "pending shows only after 1 s")
        XCTAssertEqual(kind(after: 1.0), .savedLocal)
        XCTAssertEqual(kind(after: 1.01), .pending)
        XCTAssertEqual(kind(online: false, after: 0.1), .offline)
        XCTAssertEqual(kind(since: nil, online: false, after: 9), .savedLocal, "nothing queued: offline is irrelevant")
        XCTAssertEqual(kind(failed: true, online: false, after: 9), .error)
    }

    func testStatusSourceSwitchesToPendingAfterOneSecondAndClearsWhenQueueEmpties() async {
        var count = 1
        var clock = Date(timeIntervalSince1970: 100)
        let sleeper = ManualSleeper()
        let source = AppSaveStatusSource(pendingCount: { count }, isOnline: { true }, failed: { false },
                                         now: { clock }, sleep: { await sleeper.sleep($0) })

        await source.refresh()
        XCTAssertEqual(source.kind, .savedLocal)
        await sleeper.waitForRequest(count: 1)
        XCTAssertEqual(try XCTUnwrap(sleeper.requested.first), 1.01, accuracy: 0.001)

        clock = clock.addingTimeInterval(1.5)
        sleeper.releaseAll()
        for _ in 0..<2000 where source.kind != .pending { await Task.yield() }
        XCTAssertEqual(source.kind, .pending)

        count = 0
        await source.refresh()
        XCTAssertEqual(source.kind, .savedLocal)
    }

    func testStatusSourceReportsOfflineAndError() async {
        var online = false
        var failed = false
        let source = AppSaveStatusSource(pendingCount: { 2 }, isOnline: { online }, failed: { failed },
                                         now: { Date(timeIntervalSince1970: 1) }, sleep: { _ in })
        await source.refresh()
        XCTAssertEqual(source.kind, .offline)
        online = true; failed = true
        await source.refresh()
        XCTAssertEqual(source.kind, .error)
    }

    // MARK: Initials

    func testInitialsDropNotesAndNonLetters() {
        XCTAssertEqual(AppInitials.of("Cô Hương (demo)"), "CH")
        XCTAssertEqual(AppInitials.of("Cô Hương (demo"), "CH")
        XCTAssertEqual(AppInitials.of("Trần Gia Bảo"), "GB")
        XCTAssertEqual(AppInitials.of("  Nguyễn   Văn An "), "VA")
        XCTAssertEqual(AppInitials.of("An"), "A")
        XCTAssertEqual(AppInitials.of("Đặng Ân"), "ĐÂ")
        XCTAssertEqual(AppInitials.of("- 123 (x)"), "")
        XCTAssertEqual(AppInitials.of(""), "")
    }

    // MARK: Mascot and empty state

    func testMascotPosesLoadFromBundle() {
        for pose in MascotPose.allCases {
            let image = MascotImage.image(for: pose)
            XCTAssertNotNil(image, "\(pose.fileName).webp must be in the app bundle and decode")
            XCTAssertGreaterThan(image?.size.width ?? 0, 10)
        }
    }

    func testEmptyStateRendersMascotAtRegularAndCompactSizes() throws {
        let gallery = DesignSystemStatesGallery().frame(width: 390).environment(\.colorScheme, .light)
        let renderer = ImageRenderer(content: gallery)
        renderer.scale = 3
        let image = try XCTUnwrap(renderer.uiImage)
        XCTAssertGreaterThan(image.size.height, 400)

        let directory = URL(fileURLWithPath: "/tmp/qlh-a1-shots", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        if let png = image.pngData() { try? png.write(to: directory.appendingPathComponent("states-gallery.png")) }

        for (name, size) in [("regular", AppMetrics.emptyMascot), ("compact", AppMetrics.emptyMascotCompact)] {
            let single = ImageRenderer(content: AppMascot(pose: .cho, height: size))
            single.scale = 3
            let rendered = try XCTUnwrap(single.uiImage)
            XCTAssertEqual(rendered.size.height, size, accuracy: 0.5, name)
            XCTAssertTrue(hasVisiblePixels(rendered), "Mít must draw real pixels at \(name) size")
        }
    }

    private func hasVisiblePixels(_ image: UIImage) -> Bool {
        guard let cg = image.cgImage, let data = cg.dataProvider?.data, let bytes = CFDataGetBytePtr(data) else { return false }
        let count = CFDataGetLength(data)
        var index = 3
        while index < count { if bytes[index] > 0 { return true }; index += 4 }
        return false
    }
}
