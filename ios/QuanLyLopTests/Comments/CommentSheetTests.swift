import XCTest
@testable import QuanLyLop

/// The one-student comment sheet: star picker order, Mít's pose per level, and a save error that
/// does not outlive the failure.
@MainActor
final class CommentSheetTests: XCTestCase {
    func testStarPickerListsThreeStarsFirst() {
        XCTAssertEqual(CommentsRules.starPickerOrder, [.three, .two, .one])
        XCTAssertEqual(Set(CommentsRules.starPickerOrder), Set(Stars.allCases))
    }

    func testMascotPoseFollowsTheChosenStars() {
        XCTAssertEqual(MascotPose.forStars(nil), .cho)
        XCTAssertEqual(MascotPose.forStars(.one), .sao1)
        XCTAssertEqual(MascotPose.forStars(.two), .sao2)
        XCTAssertEqual(MascotPose.forStars(.three), .sao3)
        for pose in [MascotPose.sao1, .sao2, .sao3] {
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
