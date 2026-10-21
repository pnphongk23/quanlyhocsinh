import Foundation

struct CacheScope: Codable, Sendable, Equatable {
    let userId: String
    let workspaceId: String
    let membershipId: String
    var storageKey: String { [userId, workspaceId, membershipId].map { "\($0.utf8.count):\($0)" }.joined() }
}
struct RecordKey: Codable, Sendable, Hashable {
    let entity: String
    let k1: String
    var k2: String = ""
    var storageKey: String { String(decoding: try! JSONEncoder().encode([entity, k1, k2]), as: UTF8.self) }
}
struct PendingCommand: Codable, Sendable, Equatable, Identifiable {
    let id: UUID
    let recordKey: String
    let baseVersion: Int
    let kind: String
    let payload: JSONValue
    let createdAt: Date
    init(id: UUID = UUID(), recordKey: String, baseVersion: Int, kind: String,
         payload: JSONValue, createdAt: Date = .now) {
        self.id = id; self.recordKey = recordKey; self.baseVersion = baseVersion
        self.kind = kind; self.payload = payload; self.createdAt = createdAt
    }
    var wire: SyncCommand {
        SyncCommand(id: id, type: kind, baseVersion: baseVersion, createdAt: createdAt, payload: payload)
    }
}
struct SyncCommand: Codable, Sendable, Equatable {
    let id: UUID
    let type: String
    let baseVersion: Int
    let createdAt: Date
    let payload: JSONValue
}
struct SyncPosition: Codable, Sendable, Equatable { let cursor: Int; let epoch: Int }
struct QueuedCommand: Sendable {
    let command: PendingCommand
    let state: String
    let attempts: Int
    let error: APIError?
}
protocol LocalStore: Sendable {
    var scope: CacheScope { get }
    func read<Value: Decodable & Sendable>(_ type: Value.Type, forKey key: String) async throws -> Value?
    func write<Value: Encodable & Sendable>(_ value: Value, forKey key: String, enqueueing command: PendingCommand?) async throws
    func pendingCommands() async throws -> [PendingCommand]
    func pendingCommandCount() async throws -> Int
    /// Commands the server rejected and the client keeps (offline-plan: `rejected` giữ lại).
    /// The app frame reads it to decide whether to show the save error.
    func rejectedCommandCount() async throws -> Int
    func position() async throws -> SyncPosition?
    func claimBatch(now: Date) async throws -> [PendingCommand]
    func acknowledge(_ results: [CommandResult]) async throws
    func retry(_ ids: [UUID], now: Date, minimumDelay: TimeInterval) async throws
    func apply(_ page: PullPage) async throws
    func resetCache() async throws
    func resetCacheForUser() async throws
    func installSnapshot(_ records: [String: [JSONValue]], position: SyncPosition) async throws
}
