import Foundation
import Observation

/// State of the "Nhập danh sách" sheet. The pasted text, the preview rows and the results live only here:
/// `clear()` empties them when the sheet closes, nothing is stored on disk or written to a log.
@MainActor
@Observable
final class StudentImportModel {
    enum Phase: Equatable { case input, preview, creating, result }
    enum ItemState: Equatable { case waiting, created, failed }

    struct Item: Identifiable, Equatable {
        let id: Int
        /// Generated once per row, so sending the row again never creates a second student.
        let uuid: String
        let name: String
        let phone: String?
        var state: ItemState = .waiting
    }

    /// Creates one student; throws `APIFailure.offline` when the network is gone.
    typealias Create = @MainActor (_ id: String, _ name: String, _ parentPhone: String?) async throws -> Void

    private(set) var phase: Phase = .input
    var text = ""
    private(set) var candidates: [StudentImportRules.Candidate] = []
    private(set) var forceAdd: Set<Int> = []
    private(set) var items: [Item] = []
    private(set) var stoppedOffline = false
    private(set) var fileUnreadable = false

    private let existing: [StudentImportRules.Existing]
    private let create: Create

    init(existing: [StudentImportRules.Existing], create: @escaping Create) {
        self.existing = existing
        self.create = create
    }

    var plan: StudentImportRules.Plan {
        StudentImportRules.analyze(candidates, existing: existing, forceAdd: forceAdd)
    }

    var canPreview: Bool { !StudentImportRules.parse(text).isEmpty }
    var createdCount: Int { items.filter { $0.state == .created }.count }
    var failedCount: Int { items.filter { $0.state == .failed }.count }
    var remainingCount: Int { items.count - createdCount }
    var totalAfterAdd: Int { existing.count + plan.addCount }

    // MARK: Input and preview

    func showPreview() {
        candidates = StudentImportRules.parse(text)
        forceAdd = []
        phase = .preview
    }

    func backToInput() { phase = .input }

    func loadFile(_ data: Data) {
        var bytes = data
        if bytes.starts(with: [0xEF, 0xBB, 0xBF]) { bytes = bytes.dropFirst(3) }
        guard let content = String(data: bytes, encoding: .utf8) else {
            fileUnreadable = true
            return
        }
        fileUnreadable = false
        text = content
    }

    func fileFailed() { fileUnreadable = true }

    func remove(_ id: Int) {
        candidates.removeAll { $0.id == id }
        forceAdd.remove(id)
    }

    func update(_ id: Int, name: String, phoneText: String) {
        guard let index = candidates.firstIndex(where: { $0.id == id }) else { return }
        candidates[index].name = name
        candidates[index].phoneText = phoneText
    }

    func toggleForce(_ id: Int) {
        if forceAdd.contains(id) { forceAdd.remove(id) } else { forceAdd.insert(id) }
    }

    // MARK: Creating

    /// Creates the rows marked "add" one after another. Stops at the first offline error.
    func start() async {
        guard phase == .preview else { return }
        items = plan.rows.filter { $0.status == .add }.compactMap { row in
            row.name.map { Item(id: row.id, uuid: ClientGeneratedID().rawValue, name: $0, phone: row.guardianPhone) }
        }
        await run()
    }

    /// Sends the rows not created yet with the same ids.
    func retryRest() async {
        guard phase == .result else { return }
        for index in items.indices where items[index].state == .failed { items[index].state = .waiting }
        await run()
    }

    private func run() async {
        phase = .creating
        stoppedOffline = false
        for index in items.indices where items[index].state == .waiting {
            do {
                try await create(items[index].uuid, items[index].name, items[index].phone)
                items[index].state = .created
            } catch let failure as APIFailure where failure == .offline {
                stoppedOffline = true
                break
            } catch {
                items[index].state = .failed
            }
        }
        phase = .result
    }

    func clear() {
        text = ""
        candidates = []
        forceAdd = []
        items = []
        stoppedOffline = false
        fileUnreadable = false
        phase = .input
    }
}
