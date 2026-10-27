import XCTest
@testable import QuanLyLop

final class AppConfigurationTests: XCTestCase {
    func testBundledConfigurationExposesDeleteAccountFormAndBundlePrefix() throws {
        let configuration = try AppConfiguration.load().get()
        XCTAssertNotNil(configuration.deleteAccountFormURL)
        XCTAssertEqual(configuration.deleteAccountFormURL?.scheme, "https")
        XCTAssertEqual(configuration.bundleIdentifier, "com.study.teacherthu")
        XCTAssertTrue(configuration.tokenStoreService.hasPrefix("com.study.teacherthu."))
    }
}
