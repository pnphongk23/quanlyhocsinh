import XCTest
@testable import QuanLyLop

/// The one-student comment sheet: star picker order, Mít's pose per level, and a save error that
/// does not outlive the failure.
@MainActor
final class CommentSheetTests: XCTestCase {
    func testMascotPoseFollowsTheChosenStars() {
        XCTAssertEqual(MascotPose.forStars(nil), .cho)
        let five: [MascotPose] = [.sao0, .sao1, .sao2, .sao3, .sao4, .sao5]
        for (stars, pose) in five.enumerated() {
            XCTAssertEqual(MascotPose.forStars(stars, scale: 5), pose)
            XCTAssertEqual(MascotPose.forStars(stars), pose, "five stars is the default scale")
        }
        // Old three-star slips keep their poses; out-of-range levels never crash.
        XCTAssertEqual(MascotPose.forStars(1, scale: 3), .sao1)
        XCTAssertEqual(MascotPose.forStars(2, scale: 3), .sao2)
        XCTAssertEqual(MascotPose.forStars(3, scale: 3), .sao3)
        XCTAssertEqual(MascotPose.forStars(nil, scale: 3), .cho)
        XCTAssertEqual(MascotPose.forStars(9, scale: 5), .sao5)
        XCTAssertEqual(MascotPose.forStars(-1, scale: 5), .sao0)
        for pose in five {
            XCTAssertNotNil(MascotImage.image(for: pose), "\(pose.fileName).webp must be in the app bundle")
        }
    }

    func testOnlyAnErrorIsDrawnAndItClearsWhenTheFailureIsGone() async {
        XCTAssertEqual(SaveStatusKind.pending.errorOnly, .savedLocal)
        XCTAssertEqual(SaveStatusKind.offline.errorOnly, .savedLocal)
        XCTAssertEqual(SaveStatusKind.savedLocal.errorOnly, .savedLocal)
        XCTAssertEqual(SaveStatusKind.error.errorOnly, .error)

        let center = SyncStatusCenter()
        let source = AppSaveStatusSource(pendingCount: { 0 }, isOnline: { true },
                                         hasRejectedCommands: { center.rejectedCommandCount > 0 },
                                         now: { Date(timeIntervalSince1970: 1) }, sleep: { _ in })
        center.record(syncFailed: false, rejectedCommands: 1)
        await source.refresh()
        XCTAssertEqual(source.kind.errorOnly, .error)
        center.record(syncFailed: false, rejectedCommands: 0)
        await source.refresh()
        XCTAssertEqual(source.kind.errorOnly, .savedLocal, "a resolved failure must not leave the banner behind")
    }
}
