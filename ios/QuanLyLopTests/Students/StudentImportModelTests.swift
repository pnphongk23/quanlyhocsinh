import XCTest
@testable import QuanLyLop

@MainActor
final class StudentImportModelTests: XCTestCase {
    private struct Sent: Equatable { let id: String; let name: String; let phone: String? }

    private final class Server {
        var sent: [Sent] = []
        var created: [String: Sent] = [:]
        /// Number of calls (counting from 1) that fail with the given error, then the network comes back.
        var failAt: [Int: APIFailure] = [:]
        var calls = 0
        var active = 0
        var maxActive = 0

        func create(_ id: String, _ name: String, _ phone: String?) async throws {
            calls += 1
            active += 1
            maxActive = max(maxActive, active)
            defer { active -= 1 }
            await Task.yield()
            if let failure = failAt[calls] { throw failure }
            sent.append(Sent(id: id, name: name, phone: phone))
            created[id] = Sent(id: id, name: name, phone: phone)
        }
    }

    private func model(_ text: String, server: Server) -> StudentImportModel {
        let model = StudentImportModel(existing: []) { try await server.create($0, $1, $2) }
        model.text = text
        model.showPreview()
        return model
    }

    private let twenty = (1...20).map { "\($0). Trần Học Sinh \(Character(UnicodeScalar(64 + $0)!))\t09120\(String(format: "%05d", $0))" }
        .joined(separator: "\n")

    func testCreatesRowsOneAfterAnotherWithOneUUIDEach() async {
        let server = Server()
        let model = model(twenty, server: server)
        XCTAssertEqual(model.plan.addCount, 20)
        await model.start()
        XCTAssertEqual(server.calls, 20)
        XCTAssertEqual(server.maxActive, 1)
        XCTAssertEqual(Set(server.sent.map(\.id)).count, 20)
        XCTAssertEqual(model.createdCount, 20)
        XCTAssertEqual(model.phase, .result)
        XCTAssertTrue(server.sent.allSatisfy { $0.phone?.hasPrefix("+84") == true })
    }

    func testStopsWhenOfflineAndRetryDoesNotCreateTwice() async {
        let server = Server()
        server.failAt = [4: .offline]
        let model = model("An Một\t0911000001\nBình Hai\t0911000002\nChi Ba\t0911000003\nDũng Bốn\t0911000004\nEm Năm\t0911000005", server: server)
        await model.start()
        XCTAssertTrue(model.stoppedOffline)
        XCTAssertEqual(model.createdCount, 3)
        XCTAssertEqual(model.remainingCount, 2)
        XCTAssertEqual(server.calls, 4)
        let firstTry = server.sent.map(\.id)
        await model.retryRest()
        XCTAssertFalse(model.stoppedOffline)
        XCTAssertEqual(model.createdCount, 5)
        XCTAssertEqual(server.calls, 6)
        XCTAssertEqual(server.created.count, 5)
        XCTAssertEqual(Array(server.sent.map(\.id).prefix(3)), firstTry)
    }

    func testRowErrorIsKeptAndTheRestContinues() async {
        let server = Server()
        server.failAt = [2: .badStatus(code: 422)]
        let model = model("An Một\nBình Hai\nChi Ba", server: server)
        await model.start()
        XCTAssertEqual(model.createdCount, 2)
        XCTAssertEqual(model.failedCount, 1)
        XCTAssertFalse(model.stoppedOffline)
        let failedID = model.items.first { $0.state == .failed }?.uuid
        await model.retryRest()
        XCTAssertEqual(model.createdCount, 3)
        XCTAssertEqual(server.created[failedID ?? ""]?.name, "Bình Hai")
    }

    func testRowsNeedingFixAndSkippedRowsAreNotSent() async {
        let server = Server()
        let model = model("An Một\t091100\nBình Hai\nBình Hai", server: server)
        await model.start()
        XCTAssertEqual(server.calls, 1)
        XCTAssertEqual(server.sent.first?.name, "Bình Hai")
    }

    func testClearEmptiesEverything() async {
        let server = Server()
        let model = model("An Một\t0911000001", server: server)
        await model.start()
        model.clear()
        XCTAssertEqual(model.text, "")
        XCTAssertTrue(model.items.isEmpty)
        XCTAssertTrue(model.candidates.isEmpty)
        XCTAssertEqual(model.phase, .input)
    }
}
