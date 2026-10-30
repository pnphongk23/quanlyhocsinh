import XCTest
@testable import QuanLyLop

/// A staff account starts without a name until an Admin sets one; blank text counts as no name.
final class UnnamedProfileTests: XCTestCase {
    private func user(_ name: String?) -> User {
        User(id: "u", phone: "900000001", displayName: name, mustChangePassword: false)
    }

    func testMissingEmptyAndBlankNamesAreUnnamed() {
        XCTAssertFalse(user(nil).hasDisplayName)
        XCTAssertFalse(user("").hasDisplayName)
        XCTAssertFalse(user("  \n ").hasDisplayName)
    }

    func testAnyRealNameIsNamed() {
        XCTAssertTrue(user("Cô Lan").hasDisplayName)
    }
}
