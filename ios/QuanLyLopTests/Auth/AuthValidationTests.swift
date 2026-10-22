import XCTest
@testable import QuanLyLop

@MainActor
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

    func testAccountCopyMatchesPrototype() {
        XCTAssertEqual(AuthCopy.invalidCredentials, "Số điện thoại hoặc mật khẩu không đúng")
        XCTAssertEqual(AuthCopy.loginLocked, "Thử sai quá nhiều lần, thử lại sau 15 phút")
        XCTAssertEqual(AuthCopy.passwordTooShort, "Mật khẩu phải có ít nhất 8 ký tự.")
        XCTAssertEqual(AuthCopy.passwordMismatch, "Mật khẩu nhập lại không khớp.")
        XCTAssertEqual(AuthCopy.sameAsCurrent, "Mật khẩu mới phải khác mật khẩu hiện tại.")
        XCTAssertEqual(AuthCopy.forgotPasswordDescription, "Người vận hành sẽ đặt lại mật khẩu cho bạn. Không gửi mã xác nhận.")
        XCTAssertEqual(AuthCopy.forgotPasswordStepOne, "Liên hệ người vận hành và cung cấp số điện thoại tài khoản.")
        XCTAssertEqual(AuthCopy.forgotPasswordStepTwo, "Người vận hành sẽ đặt lại mật khẩu thủ công.")
        XCTAssertEqual(AuthCopy.wrongCurrent, "Mật khẩu hiện tại không đúng.")
        XCTAssertEqual(AuthRoleBadge.label(Role(id: "r", name: "Phụ huynh", systemKey: nil, scopeKind: .linkedStudents)), "Phụ huynh")
        XCTAssertEqual(AuthRoleBadge.initials(Role(id: "r", name: "Giáo viên", systemKey: nil, scopeKind: .assignedClasses)), "GV")
        XCTAssertEqual(AuthRoleBadge.initials(Role(id: "r", name: "Trợ giảng", systemKey: nil, scopeKind: .assignedClasses)), "TG")
    }

    func testPhoneDisplayAndGroupingMatchPrototype() {
        XCTAssertEqual(AuthFormat.phone("900000001"), "+84 900 000 001")
        XCTAssertEqual(AuthFormat.phone("0900000001"), "+84 900 000 001")
        XCTAssertEqual(AuthFormat.phoneInput("84900000001"), "900 000 001")
        XCTAssertEqual(AuthPhoneField.grouped("900000001"), "900 000 001")
        XCTAssertEqual(AuthPhoneField.grouped("90000000199"), "900 000 001")
        XCTAssertEqual(AuthFormat.classShortLabel("Tiếng Anh giao tiếp 6A"), "6A")
        XCTAssertEqual(AuthFormat.shortName("Trần Gia Bảo"), "Gia Bảo")
        XCTAssertEqual(AuthFormat.initials("Cô Lan"), "CL")
    }

    func testForcedChangeMustDifferFromCurrentPassword() {
        XCTAssertThrowsError(try AuthValidation.validatePassword(
            "temporary-pass", confirmation: "temporary-pass", phone: "900000001", currentPassword: "temporary-pass"
        )) { XCTAssertEqual($0 as? AuthValidationError, .samePassword) }
    }
}
