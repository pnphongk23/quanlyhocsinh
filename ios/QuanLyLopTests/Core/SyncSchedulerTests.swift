import XCTest
@testable import QuanLyLop

@MainActor
final class SyncSchedulerTests: XCTestCase {
    func testStartsOnForegroundTicksAndStopsInBackground() async throws {
        var active = false
        var online = true
        var calls = 0
        let scheduler = SyncScheduler(interval: .milliseconds(30), isOnline: { online }) {
            calls += 1
        }

        scheduler.setActive(active && online)
        try await Task.sleep(for: .milliseconds(45))
        XCTAssertEqual(calls, 0)

        active = true
        scheduler.setActive(active && online)
        try await Task.sleep(for: .milliseconds(75))
        XCTAssertGreaterThanOrEqual(calls, 2)

        active = false
        scheduler.setActive(active)
        let stoppedAt = calls
        try await Task.sleep(for: .milliseconds(50))
        XCTAssertEqual(calls, stoppedAt)

        online = false
        active = true
        scheduler.setActive(active && online)
        let offlineAt = calls
        try await Task.sleep(for: .milliseconds(50))
        XCTAssertEqual(calls, offlineAt)

        online = true
        scheduler.setActive(active && online)
        try await Task.sleep(for: .milliseconds(10))
        XCTAssertEqual(calls, offlineAt + 1)
        scheduler.setActive(false)
    }

    func testConcurrentCoordinatorsShareOneRunPerCacheScope() async throws {
        let gate = SyncRunGate()
        let lock = CallCounter()
        async let first: Void = gate.run(scope: "one") {
            await lock.increment()
            try await Task.sleep(for: .milliseconds(60))
        }
        try await Task.sleep(for: .milliseconds(5))
        async let second: Void = gate.run(scope: "one") { await lock.increment() }
        _ = try await (first, second)
        let totalCalls = await lock.value
        XCTAssertEqual(totalCalls, 1)
    }
}

private actor CallCounter {
    private(set) var value = 0
    func increment() { value += 1 }
}
