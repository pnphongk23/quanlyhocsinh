import XCTest
@testable import QuanLyLop

final class SyncRunGateTests: XCTestCase {
    func testConcurrentCallsShareOneRun() async throws {
        let gate = SyncRunGate()
        let counter = GateCounter()
        let latch = GateLatch()

        let first = Task {
            try await gate.run(scope: "coalesce", operation: {
                await counter.increment()
                await latch.signalStarted()
                await latch.waitForRelease()
            })
        }
        await latch.waitUntilStarted()
        let joined = GateLatch()
        let second = Task {
            try await gate.run(scope: "coalesce", onCoalesced: { await joined.signalStarted() },
                               operation: { await counter.increment() })
        }
        await joined.waitUntilStarted()
        await latch.release()
        try await first.value
        try await second.value
        let calls = await counter.value
        XCTAssertEqual(calls, 1)
    }

    func testNewPendingCommandAllowsExactlyOneFollowUpRun() async throws {
        let gate = SyncRunGate()
        let counter = GateCounter()
        let pending = PendingFlag()
        let latch = GateLatch()
        let first = Task {
            try await gate.run(scope: "follow-up", rerunIfPending: { await pending.value }) {
                await counter.increment()
                if await counter.value == 1 {
                    await latch.signalStarted()
                    await latch.waitForRelease()
                } else {
                    await pending.set(false)
                }
            }
        }
        await latch.waitUntilStarted()
        await pending.set(true)
        await latch.release()
        try await first.value
        let calls = await counter.value
        XCTAssertEqual(calls, 2)
    }
}

private actor GateCounter {
    private(set) var value = 0
    func increment() { value += 1 }
}

private actor PendingFlag {
    private(set) var value = false
    func set(_ value: Bool) { self.value = value }
}

private actor GateLatch {
    private var started = false
    private var released = false
    private var startWaiter: CheckedContinuation<Void, Never>?
    private var releaseWaiter: CheckedContinuation<Void, Never>?
    func signalStarted() { started = true; startWaiter?.resume(); startWaiter = nil }
    func waitUntilStarted() async {
        if started { return }
        await withCheckedContinuation { startWaiter = $0 }
    }
    func waitForRelease() async {
        if released { return }
        await withCheckedContinuation { releaseWaiter = $0 }
    }
    func release() { released = true; releaseWaiter?.resume(); releaseWaiter = nil }
}
