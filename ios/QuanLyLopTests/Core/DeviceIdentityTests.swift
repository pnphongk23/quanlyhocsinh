import XCTest
@testable import QuanLyLop

final class DeviceIdentityTests: XCTestCase {
    private func defaults() -> UserDefaults {
        let suite = "device-identity-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }

    func testCurrentIsALowercaseUUIDAndStable() {
        let store = defaults()
        let first = DeviceIdentity.current(defaults: store)
        XCTAssertNotNil(UUID(uuidString: first))
        XCTAssertEqual(first, first.lowercased())
        XCTAssertEqual(DeviceIdentity.current(defaults: store), first)
    }

    func testCurrentReplacesAStoredValueThatIsNotAUUID() {
        let store = defaults()
        store.set("fixture-device", forKey: DeviceIdentity.defaultsKey)
        let id = DeviceIdentity.current(defaults: store)
        XCTAssertNotNil(UUID(uuidString: id))
        XCTAssertEqual(store.string(forKey: DeviceIdentity.defaultsKey), id)
    }
}
