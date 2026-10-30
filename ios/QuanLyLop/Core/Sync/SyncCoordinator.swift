import Foundation

/// Final statuses of a pushed command (`api-spec.md` mục 6.1).
///
enum CommandStatus: String, Codable, Sendable { case applied, duplicate, rejected }
enum SyncEntity {
    static let allowed: Set<String> = [
        "class", "student", "class_session", "test", "attendance", "score", "slip",
        "homework_section", "homework_grade", "report_batch", "report", "report_publication"
    ]
}

/// Prevents parallel pulls when multiple feature views create coordinators for the same cache.
actor SyncRunGate {
    static let shared = SyncRunGate()
    private var activeScopes: [String: Task<Void, Error>] = [:]

    func run(scope: String, rerunIfPending: (@Sendable () async -> Bool)? = nil,
             operation: @escaping @Sendable () async throws -> Void) async throws {
        try await run(scope: scope, rerunIfPending: rerunIfPending, allowFollowUp: true,
                      onCoalesced: {}, operation: operation)
    }

    func run(scope: String, onCoalesced: @escaping @Sendable () async -> Void,
             operation: @escaping @Sendable () async throws -> Void) async throws {
        try await run(scope: scope, rerunIfPending: nil, allowFollowUp: false,
                      onCoalesced: onCoalesced, operation: operation)
    }

    private func run(scope: String, rerunIfPending: (@Sendable () async -> Bool)?, allowFollowUp: Bool,
                     onCoalesced: @escaping @Sendable () async -> Void,
                     operation: @escaping @Sendable () async throws -> Void) async throws {
        if let running = activeScopes[scope] {
            await onCoalesced()
            try await running.value
            return
        }
        let running = Task { try await operation() }
        activeScopes[scope] = running
        do { try await running.value }
        catch { activeScopes[scope] = nil; throw error }
        if allowFollowUp, let rerunIfPending, await rerunIfPending() {
            let followUp = Task { try await operation() }
            activeScopes[scope] = followUp
            do { try await followUp.value }
            catch { activeScopes[scope] = nil; throw error }
            activeScopes[scope] = nil
        } else {
            activeScopes[scope] = nil
        }
    }
}
struct CommandResult: Codable, Sendable, Equatable {
    let id: UUID
    let status: CommandStatus
    var version: Int? = nil
    var originalStatus: CommandStatus? = nil
    var error: APIError? = nil
    var noop: Bool? = nil
    var outcome: String? = nil
    var sent: [String]? = nil
    var skipped: [JSONValue]? = nil
}
/// The server only accepts a UUID as `device_id`, so every push uses this one stored id.
enum DeviceIdentity {
    static let defaultsKey = "\(AppConfiguration.identifierPrefix).device_id"
    static func current(defaults: UserDefaults = .standard) -> String {
        if let stored = defaults.string(forKey: defaultsKey), UUID(uuidString: stored) != nil { return stored }
        let created = UUID().uuidString.lowercased()
        defaults.set(created, forKey: defaultsKey)
        return created
    }
}
struct PushRequest: Encodable, Sendable {
    let membershipId: String
    let deviceId: String
    let commands: [SyncCommand]
}
struct PushResponse: Codable, Sendable {
    let epoch: Int
    let cursor: Int
    let results: [CommandResult]
}
struct PullPage: Codable, Sendable {
    let cursor: Int
    let epoch: Int
    let hasMore: Bool
    let serverTime: String
    let upserts: [String: [JSONValue]]
    let deleted: [RecordKey]
}
struct SnapshotManifest: Codable, Sendable {
    struct Window: Codable, Sendable { let from: String; let to: String }
    let cursor: Int
    let epoch: Int
    let window: Window
    let entities: [String]
}
struct SnapshotPage: Codable, Sendable {
    let items: [JSONValue]
    let nextAfter: String?
}
enum SyncFailure: Error { case invalidResponse }
struct SyncResult: Sendable, Equatable {
    var didChangeData = false
    var didPushCommands = false
    var succeeded = true
    var shouldResetBackoff: Bool { didChangeData || didPushCommands }
}

/// Call on launch and network restoration, after the app's own successful push, and from pull-to-refresh.
/// Retry deadlines live in SQLite: this actor never spins or sleeps waiting for the network.
actor SyncCoordinator {
    private let api: any APIClient
    private let store: any LocalStore
    nonisolated let deviceId: String
    private let status: SyncStatusCenter
    private var lastResult = SyncResult()
    init(api: any APIClient, store: any LocalStore, deviceId: String,
         status: SyncStatusCenter = .shared) {
        self.api = api; self.store = store; self.deviceId = deviceId; self.status = status
    }
    func synchronize(now: Date = .now) async throws -> SyncResult {
        try await SyncRunGate.shared.run(scope: store.scope.storageKey, rerunIfPending: { [store] in
            ((try? await store.pendingCommandCount()) ?? 0) > 0
        }) { [self] in
            do {
                let result = try await run(now: now)
                await record(result)
                await report(syncFailed: false)
            } catch {
                await report(syncFailed: true)
                throw error
            }
        }
        return lastResult
    }
    private func record(_ result: SyncResult) { lastResult = result }
      /// One failed sync or one rejected command is enough for the app frame to show the save-error
      /// pill; a successful sync clears it unless rejected commands remain queued.
    private func report(syncFailed: Bool) async {
        let rejected = (try? await store.rejectedCommandCount()) ?? 0
        status.record(syncFailed: syncFailed, rejectedCommands: rejected)
    }
    private func run(now: Date) async throws -> SyncResult {
        var result = SyncResult()
        if try await store.position() == nil {
            try await snapshot()
        }
        do {
            while true {
                try Task.checkCancellation()
                let batch = try await store.claimBatch(now: now)
                guard !batch.isEmpty else { break }
                result.didPushCommands = true
                do {
                    let request = PushRequest(membershipId: store.scope.membershipId, deviceId: deviceId, commands: batch.map(\.wire))
                    let response = try await api.send(try .json(method: .post, path: "sync/push", body: request), as: PushResponse.self)
                    let sentIds = Set(batch.map(\.id))
                    let results = response.results.filter { sentIds.contains($0.id) }
                    guard Set(results.map(\.id)).count == results.count else { throw SyncFailure.invalidResponse }
                    try await store.acknowledge(results)
                    // Unacknowledged/malformed duplicates remain in the queue and replay later.
                    let acknowledged = Set(results.filter {
                      $0.status != .duplicate || [.applied, .rejected].contains($0.originalStatus)
                    }.map(\.id))
                    let missing = batch.map(\.id).filter { !acknowledged.contains($0) }
                    try await store.retry(missing, now: now, minimumDelay: 0)
                    // Never advance pull cursor from push: unseen remote edits would be skipped.
                    result.didChangeData = try await pull(now: now) || result.didChangeData
                    if !missing.isEmpty { break }
                } catch {
                    let minimum: TimeInterval
                    if case APIFailure.server(_, _, let retryAfter) = error { minimum = retryAfter ?? 0 }
                    else { minimum = 0 }
                    try await store.retry(batch.map(\.id), now: now, minimumDelay: minimum)
                    throw error
                }
            }
            result.didChangeData = try await pull(now: now) || result.didChangeData
            return result
        } catch let failure as APIFailure {
            if failure.requiresSnapshot {
                try await store.resetCache()
                try await snapshot()
                result.didChangeData = try await pull(now: now) || result.didChangeData
                return result
            }
            if Self.isRecoveryFailure(failure) { try await store.resetCache() }
            throw failure
        }
    }
    private static func isRecoveryFailure(_ failure: APIFailure) -> Bool {
        switch failure {
        case .badStatus(let code): code == 404
        case .server(let status, let error, _): status == 404 || error.code == "account_disabled" || error.code == "unauthorized"
        default: false
        }
    }
    private func snapshot() async throws {
        let membership = store.scope.membershipId
        let manifest = try await api.send(.init(method: .get, path: "sync/snapshot", query: ["membership_id": membership]), as: SnapshotManifest.self)
        var records: [String: [JSONValue]] = [:]
          for entity in manifest.entities {
              // The server contract has a fixed entity set. Ignore unknown additions so one
              // unsupported entity cannot prevent the supported snapshot from installing.
              guard SyncEntity.allowed.contains(entity) else { continue }
            var after: String?
            repeat {
                try Task.checkCancellation()
                var query = ["membership_id": membership, "limit": "300"]
                if let after { query["after"] = after }
                let page = try await api.send(.init(method: .get, path: "sync/snapshot/" + entity, query: query), as: SnapshotPage.self)
                records[entity, default: []].append(contentsOf: page.items)
                if let next = page.nextAfter, next == after { throw SyncFailure.invalidResponse }
                after = page.nextAfter
            } while after != nil
        }
        try await store.installSnapshot(records, position: SyncPosition(cursor: manifest.cursor, epoch: manifest.epoch))
    }
    private func pull(now: Date) async throws -> Bool {
        var changed = false
        guard var position = try await store.position() else { throw SyncFailure.invalidResponse }
        while true {
            try Task.checkCancellation()
            let query = ["membership_id": store.scope.membershipId, "cursor": String(position.cursor), "epoch": String(position.epoch), "limit": "200"]
              let received = try await api.send(.init(method: .get, path: "sync/pull", query: query), as: PullPage.self)
              let page = PullPage(cursor: received.cursor, epoch: received.epoch, hasMore: received.hasMore,
                                  serverTime: received.serverTime,
                                  upserts: received.upserts.filter { SyncEntity.allowed.contains($0.key) },
                                  deleted: received.deleted.filter { SyncEntity.allowed.contains($0.entity) })
            guard page.epoch == position.epoch, page.cursor >= position.cursor,
                  !page.hasMore || page.cursor > position.cursor else { throw SyncFailure.invalidResponse }
              try await store.apply(page)
              changed = changed || !page.upserts.isEmpty || !page.deleted.isEmpty
            position = SyncPosition(cursor: page.cursor, epoch: page.epoch)
              if !page.hasMore { return changed }
        }
    }
}
