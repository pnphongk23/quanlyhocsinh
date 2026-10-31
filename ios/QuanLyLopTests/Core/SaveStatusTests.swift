import XCTest
@testable import QuanLyLop

/// Offline UX state (`SaveStatus` in the prototype): the app frame shows one pill, and only when an
/// edit is not on the server. There is no permanent "đang lưu"/"đã lưu" chip, and no conflict state:
/// the server resolves two devices on one cell last-write-wins.
final class SaveStatusTests: XCTestCase {
    func testFreshCenterShowsNothing() {
        let center = SyncStatusCenter()
        XCTAssertEqual(center.state, .synced)
        XCTAssertFalse(center.isFailed)
    }

    func testFailedSyncShowsErrorAndTheNextSuccessClearsIt() {
        let center = SyncStatusCenter()
        center.record(syncFailed: true, rejectedCommands: 0)
        XCTAssertEqual(center.state, .error)
        center.record(syncFailed: false, rejectedCommands: 0)
        XCTAssertEqual(center.state, .synced)
    }

    func testRejectedCommandKeepsErrorAfterASuccessfulSync() {
        let center = SyncStatusCenter()
        center.record(syncFailed: false, rejectedCommands: 1)
        XCTAssertEqual(center.state, .error)
        XCTAssertEqual(center.rejectedCommandCount, 1)
        center.record(syncFailed: false, rejectedCommands: 0)
        XCTAssertEqual(center.state, .synced)
    }

    func testResetDropsThePreviousIdentityFailures() {
        let center = SyncStatusCenter()
        center.record(syncFailed: true, rejectedCommands: 2)
        center.reset()
        XCTAssertEqual(center.state, .synced)
        XCTAssertEqual(center.rejectedCommandCount, 0)
    }
}
