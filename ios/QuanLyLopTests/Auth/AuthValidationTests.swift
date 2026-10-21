import XCTest
@testable import QuanLyLop

final class AuthValidationTests: XCTestCase {
    func testRegistrationRequiresAllFields() {
        XCTAssertThrowsError(try AuthValidation.validateRegistration(
            name: " ", workspace: "Lớp", phone: "900000001", password: "strong-pass-1", confirmation: "strong-pass-1"
        )) { XCTAssertEqual($0 as? AuthValidationError, .missingField) }
    }

    func testRegistrationAcceptsValidPasswordAndMatchingConfirmation() throws {
        XCTAssertNoThrow(try AuthValidation.validateRegistration(
            name: "Cô Lan", workspace: "Lớp cô Lan", phone: "900000001",
            password: "strong-pass-1", confirmation: "strong-pass-1"
        ))
    }

    func testPasswordLengthAndConfirmationRules() {
        XCTAssertThrowsError(try AuthValidation.validatePassword("short", confirmation: "short", phone: "900000001")) {
            XCTAssertEqual($0 as? AuthValidationError, .passwordLength)
        }
        XCTAssertThrowsError(try AuthValidation.validatePassword("long-enough", confirmation: "different", phone: "900000001")) {
            XCTAssertEqual($0 as? AuthValidationError, .passwordMismatch)
        }
    }

    func testForcedChangeMustDifferFromCurrentPassword() {
        XCTAssertThrowsError(try AuthValidation.validatePassword(
            "temporary-pass", confirmation: "temporary-pass", phone: "900000001", currentPassword: "temporary-pass"
        )) { XCTAssertEqual($0 as? AuthValidationError, .samePassword) }
    }
}
