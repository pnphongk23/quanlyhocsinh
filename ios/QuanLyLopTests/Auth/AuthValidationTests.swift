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

    func testGuardianSetupRequiresPhoneAndMatchingPassword() throws {
        XCTAssertNoThrow(try AuthValidation.validateGuardianSetup(
            phone: "0900000001", password: "strong-pass-1", confirmation: "strong-pass-1"))
        XCTAssertThrowsError(try AuthValidation.validateGuardianSetup(
            phone: "", password: "strong-pass-1", confirmation: "strong-pass-1")) {
            XCTAssertEqual($0 as? AuthValidationError, .missingField)
        }
        XCTAssertThrowsError(try AuthValidation.validateGuardianSetup(
            phone: "0900000001", password: "strong-pass-1", confirmation: "different-pass")) {
            XCTAssertEqual($0 as? AuthValidationError, .passwordMismatch)
        }
    }

    func testGuardianSetupRequestSendsOnlyPhoneAndPassword() throws {
        let endpoint = try APIEndpoint.json(method: .post, path: "auth/register-guardian",
                                            body: GuardianRegistrationRequest(phone: "0900000001", password: "strong-pass-1"),
                                            requiresAuthentication: false)
        let data = try XCTUnwrap(endpoint.body)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: String])
        XCTAssertEqual(object, ["phone": "0900000001", "password": "strong-pass-1"])
    }

    func testPhoneBoxAcceptsZeroPlus84AndSpacesAndNormalizesOnSubmit() {
        for input in ["0900000001", "0900 000 001", " 090.000.0001 ", "+84900000001", "+84 900 000 001", "84900000001",
                      "(090) 000-0001"] {
            XCTAssertEqual(AuthFormat.normalizedPhone(input), "0900000001", input)
        }
    }

    func testPhoneBoxRejectsWrongLengthLettersAndOtherPrefixes() {
        for input in ["", "090000000", "09000000011", "+8490000000", "+849000000011", "abc0900000001", "+1 900 000 0001",
                      "900000001", "0900a00001"] {
            XCTAssertNil(AuthFormat.normalizedPhone(input), input)
        }
    }

    func testGuardianRegistrationResponseDecodesUnlinkedAccount() throws {
        let payload = Data(#"{"token":"fixture","expires_at":"2099-01-01T00:00:00.000Z","user":{"id":"u1","phone":"0900000001","display_name":"Chị Lan","must_change_password":false},"memberships":[],"active_membership_id":null}"#.utf8)
        let response = try WireJSON.decoder().decode(AuthSession.self, from: payload)
        XCTAssertEqual(response.user.displayName, "Chị Lan")
        XCTAssertTrue(response.memberships.isEmpty)
        XCTAssertNil(response.activeMembershipId)
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

    // MARK: - Two-step sign-in

    private func model(_ api: PhoneCheckAPI) throws -> AuthModel {
        let scope = CacheScope(userId: "u", workspaceId: "w", membershipId: "m")
        let store = try SQLiteStore(path: ":memory:", scope: scope)
        return AuthModel(configuration: .fallback, apiClient: api, tokenStore: InMemoryTokenStore(token: nil),
                         identityStore: PhoneCheckIdentityStore(), storeFactory: { _ in store }, isOnline: { true })
    }

    func testPhoneCheckRoutesByWhatTheServerSays() async throws {
        let cases: [(String, AuthModel.Screen, AuthModel.LoginStep)] = [
            ("login", .login, .password), ("guardian_setup", .guardianRegister, .phone),
            ("teacher_register", .register, .phone)
        ]
        for (next, screen, step) in cases {
            let api = PhoneCheckAPI(response: .next(next))
            let model = try model(api)
            await model.restoreSession()
            try await model.checkPhone("+84 900 000 001")
            XCTAssertEqual(model.screen, screen, next)
            XCTAssertEqual(model.loginStep, step, next)
            XCTAssertEqual(model.loginPhone, "0900000001", "the number is normalized before it is sent")
            let sent = await api.sentPhones
            XCTAssertEqual(sent, ["0900000001"])
        }
    }

    func testBadPhoneIsRejectedAfterTappingWithoutAskingTheServer() async throws {
        let api = PhoneCheckAPI(response: .next("login"))
        let model = try model(api)
        await model.restoreSession()
        do { try await model.checkPhone("090 000"); XCTFail("expected a format error") } catch {}
        XCTAssertEqual(model.message, LoginText.invalidPhone)
        XCTAssertEqual(model.screen, .login)
        let sent = await api.sentPhones
        XCTAssertTrue(sent.isEmpty)
    }

    func testRateLimitedPhoneCheckShowsAQuietMessageAndStaysOnTheFirstStep() async throws {
        let api = PhoneCheckAPI(response: .failure(status: 429, code: "rate_limited", details: nil))
        let model = try model(api)
        await model.restoreSession()
        do { try await model.checkPhone("0900000001"); XCTFail("expected a failure") } catch {}
        XCTAssertEqual(model.message, LoginText.rateLimited)
        XCTAssertEqual(model.loginStep, .phone)
        XCTAssertEqual(model.screen, .login)
    }

    func testUndeclaredGuardianNumberGoesBackToThePhoneStepWithAnExplanation() async throws {
        let api = PhoneCheckAPI(response: .next("guardian_setup"),
                                registerFailure: (403, "forbidden", .object(["reason": .string("phone_not_declared")])))
        let model = try model(api)
        await model.restoreSession()
        try await model.checkPhone("0900000001")
        XCTAssertEqual(model.screen, .guardianRegister)
        do { try await model.setUpGuardian(password: "strong-pass-1", confirmation: "strong-pass-1"); XCTFail("expected 403") } catch {}
        XCTAssertEqual(model.screen, .login)
        XCTAssertEqual(model.loginStep, .phone)
        XCTAssertEqual(model.message, LoginText.phoneNotDeclared)
    }
}

private actor PhoneCheckAPI: APIClient {
    enum Response { case next(String), failure(status: Int, code: String, details: JSONValue?) }
    nonisolated let baseURL = URL(string: "https://fixture.invalid/v1")!
    private let response: Response
    private let registerFailure: (Int, String, JSONValue?)?
    private(set) var sentPhones: [String] = []

    init(response: Response, registerFailure: (Int, String, JSONValue?)? = nil) {
        self.response = response
        self.registerFailure = registerFailure
    }

    func send<Value: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Value.Type) async throws -> Value {
        switch endpoint.path {
        case "auth/phone-check":
            if let body = endpoint.body, let object = try? JSONSerialization.jsonObject(with: body) as? [String: String] {
                sentPhones.append(object["phone"] ?? "")
            }
            switch response {
            case .next(let next): return try WireJSON.decoder().decode(type, from: Data(#"{"next":"\#(next)"}"#.utf8))
            case .failure(let status, let code, let details):
                throw APIFailure.server(status: status, error: APIError(code: code, message: nil, details: details, requestId: nil),
                                        retryAfter: 60)
            }
        case "auth/register-guardian":
            if let (status, code, details) = registerFailure {
                throw APIFailure.server(status: status, error: APIError(code: code, message: nil, details: details, requestId: nil),
                                        retryAfter: nil)
            }
            throw APIFailure.offline
        default:
            throw APIFailure.offline
        }
    }
}

private actor PhoneCheckIdentityStore: CachedIdentityStore {
    func load() -> CurrentIdentity? { nil }
    func save(_ identity: CurrentIdentity) {}
    func clear() {}
}
