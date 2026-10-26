import Foundation
import SQLite3

struct StoreFailure: Error, Sendable { let code: Int32 }
private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

/// Owned exclusively by SQLiteStore; @unchecked covers pointer cleanup in deinit only.
private final class SQLiteConnection: @unchecked Sendable {
    let handle: OpaquePointer
    init(path: String) throws {
        var db: OpaquePointer?
        let status = sqlite3_open_v2(path, &db, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil)
        guard status == SQLITE_OK, let db else {
            if let db { sqlite3_close(db) }
            throw StoreFailure(code: status)
        }
        handle = db
        sqlite3_busy_timeout(db, 3000)
    }
    deinit { sqlite3_close(handle) }
    @discardableResult
    func execute(_ sql: String, _ values: [String?] = []) throws -> [[String: String]] {
        var statement: OpaquePointer?
        let status = sqlite3_prepare_v2(handle, sql, -1, &statement, nil)
        guard status == SQLITE_OK, let statement else { throw StoreFailure(code: status) }
        defer { sqlite3_finalize(statement) }
        for (offset, value) in values.enumerated() {
            let status: Int32
            if let value { status = sqlite3_bind_text(statement, Int32(offset + 1), value, -1, sqliteTransient) }
            else { status = sqlite3_bind_null(statement, Int32(offset + 1)) }
            guard status == SQLITE_OK else { throw StoreFailure(code: status) }
        }
        var rows: [[String: String]] = []
        while true {
            let status = sqlite3_step(statement)
            if status == SQLITE_DONE { return rows }
            guard status == SQLITE_ROW else { throw StoreFailure(code: status) }
            var row: [String: String] = [:]
            for column in 0..<sqlite3_column_count(statement) {
                if let text = sqlite3_column_text(statement, column) {
                    row[String(cString: sqlite3_column_name(statement, column))] = String(cString: text)
                }
            }
            rows.append(row)
        }
    }
}

actor SQLiteStore: LocalStore {
    nonisolated let scope: CacheScope
    private let db: SQLiteConnection
    private var observers: [UUID: AsyncStream<Void>.Continuation] = [:]

    init(path: String, scope: CacheScope) throws {
        self.scope = scope
        let db = try SQLiteConnection(path: path)
        self.db = db
        try db.execute("PRAGMA journal_mode=WAL")
        try db.execute("PRAGMA synchronous=FULL")
        let version = try db.execute("PRAGMA user_version").first?["user_version"] ?? "0"
        guard version == "0" || version == "1" else { throw StoreFailure(code: SQLITE_SCHEMA) }
        try db.execute("BEGIN IMMEDIATE")
        do {
            try db.execute("CREATE TABLE IF NOT EXISTS records(scope TEXT NOT NULL, key TEXT NOT NULL, entity TEXT NOT NULL, version INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY(scope,key))")
            try db.execute("CREATE TABLE IF NOT EXISTS commands(seq INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL, id TEXT NOT NULL, record_key TEXT NOT NULL, kind TEXT NOT NULL, json TEXT NOT NULL, local_json TEXT NOT NULL, created_at REAL NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt REAL NOT NULL DEFAULT 0, error TEXT, UNIQUE(scope,id))")
            try db.execute("CREATE INDEX IF NOT EXISTS commands_scope_order ON commands(scope,created_at,seq)")
            try db.execute("CREATE TABLE IF NOT EXISTS meta(scope TEXT PRIMARY KEY, cursor INTEGER NOT NULL, epoch INTEGER NOT NULL)")
            // Keys a sync removed: written in the same transaction as the DELETE, so a late request made through
            // another connection to this file cannot put a removed record back (see `writeFetched`).
            try db.execute("CREATE TABLE IF NOT EXISTS removed(scope TEXT NOT NULL, key TEXT NOT NULL, PRIMARY KEY(scope,key))")
            try db.execute("PRAGMA user_version=1")
            // An interrupted request is replayed with the same UUID, never coalesced.
            try db.execute("UPDATE commands SET state='pending' WHERE scope=? AND state='sending'", [scope.storageKey])
            try Self.dropQueuedSlipSends(db)
            try db.execute("COMMIT")
        } catch { _ = try? db.execute("ROLLBACK"); throw error }
    }

    /// A slip send goes straight to the server and never waits in the outbox, so one found here was left by
    /// an older build and must not be replayed. Its optimistic rows can no longer be trusted either, so the
    /// affected scopes reinstall their snapshot on the next sync.
    private static func dropQueuedSlipSends(_ db: SQLiteConnection) throws {
        let scopes = try db.execute("SELECT DISTINCT scope FROM commands WHERE kind='slip.send'").compactMap { $0["scope"] }
        guard !scopes.isEmpty else { return }
        for scope in scopes { try db.execute("DELETE FROM meta WHERE scope=?", [scope]) }
        try db.execute("DELETE FROM commands WHERE kind='slip.send'")
    }

    static func open(scope: CacheScope, directory: URL = .applicationSupportDirectory) throws -> SQLiteStore {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: directory.path)
        var url = directory.appending(path: "core.sqlite")
        var resource = URLResourceValues(); resource.isExcludedFromBackup = true
        let store = try SQLiteStore(path: url.path, scope: scope)
        try url.setResourceValues(resource)
        return store
    }
    func changes() -> AsyncStream<Void> {
        let id = UUID()
        let (stream, continuation) = AsyncStream<Void>.makeStream(bufferingPolicy: .bufferingNewest(1))
        observers[id] = continuation
        continuation.onTermination = { [weak self] _ in Task { await self?.removeObserver(id) } }
        return stream
    }
    private func removeObserver(_ id: UUID) { observers.removeValue(forKey: id) }
    private func transaction<T>(_ body: () throws -> T) throws -> T {
        try db.execute("BEGIN IMMEDIATE")
        do {
            let result = try body()
            try db.execute("COMMIT")
            for observer in observers.values { observer.yield(()) }
            return result
        } catch { _ = try? db.execute("ROLLBACK"); throw error }
    }
    private func encode<T: Encodable>(_ value: T) throws -> String {
        String(decoding: try WireJSON.encoder().encode(value), as: UTF8.self)
    }
    private func decode<T: Decodable>(_ type: T.Type, _ text: String) throws -> T {
        try WireJSON.decoder().decode(type, from: Data(text.utf8))
    }
    func read<Value: Decodable & Sendable>(_ type: Value.Type, forKey key: String) throws -> Value? {
        guard let text = try db.execute("SELECT json FROM records WHERE scope=? AND key=?", [scope.storageKey, key]).first?["json"] else { return nil }
        // Only an edit that is still on its way to the server may hide the cached row. A `rejected`
        // command is not a value the teacher has (`api-spec.md` mục 6: it was never applied), so the
        // cell falls back to whatever `pull` left in the cache instead of showing a second value.
        let overlay = try db.execute("SELECT local_json FROM commands WHERE scope=? AND record_key=? AND state IN ('pending','sending') ORDER BY created_at DESC,seq DESC LIMIT 1", [scope.storageKey, key]).first?["local_json"]
        return try decode(type, overlay ?? text)
    }
    func records<Value: Decodable & Sendable>(_ type: Value.Type, entity: String) throws -> [Value] {
        try db.execute("SELECT key FROM records WHERE scope=? AND entity=? ORDER BY key", [scope.storageKey, entity])
            .compactMap { try read(type, forKey: $0["key"]!) }
    }
    /// Drops a deleted report batch from the cache: the batch, every report of it and every publication of those
    /// reports. `report_publication` rows carry `batch_id` only for batch-based reports, so the publications of
    /// the batch's reports are matched by `report_id` as well.
    func removeReportBatch(id: String) throws {
        try transaction {
            let reportKeys = try db.execute(
                "SELECT key, json_extract(json,'$.id') AS id FROM records WHERE scope=? AND entity='report' AND json_extract(json,'$.batch_id')=?",
                [scope.storageKey, id])
            let reportIDs = reportKeys.compactMap { $0["id"] }
            for row in reportKeys { try db.execute("DELETE FROM records WHERE scope=? AND key=?", [scope.storageKey, row["key"]!]) }
            try db.execute("DELETE FROM records WHERE scope=? AND entity='report_publication' AND json_extract(json,'$.batch_id')=?",
                           [scope.storageKey, id])
            for reportID in reportIDs { try deletePublications(ofReport: reportID) }
            try db.execute("DELETE FROM records WHERE scope=? AND key=?",
                           [scope.storageKey, RecordKey(entity: "report_batch", k1: id).storageKey])
        }
    }
    /// Drops the cached publications of one report (the server answered 404 for it: its batch was deleted).
    func removePublications(ofReport reportID: String) throws {
        try transaction { try deletePublications(ofReport: reportID) }
    }
    private func deletePublications(ofReport reportID: String) throws {
        try db.execute("DELETE FROM records WHERE scope=? AND entity='report_publication' AND json_extract(json,'$.report_id')=?",
                       [scope.storageKey, reportID])
    }
    /// Class sessions from the cache.
    func classSessions() throws -> [ClassSession] {
        try records(ClassSession.self, entity: "class_session")
    }
    /// Like `records`, but a row whose JSON no longer fits `Value` is left out instead of failing the whole read.
    /// Only decoding problems are tolerated; storage errors still throw. `skipped` counts the dropped rows
    /// so callers never need to look at (or log) their content.
    func recordsSkippingInvalid<Value: Decodable & Sendable>(_ type: Value.Type, entity: String) throws -> (values: [Value], skipped: Int) {
        var values: [Value] = []
        var skipped = 0
        for row in try db.execute("SELECT key FROM records WHERE scope=? AND entity=? ORDER BY key", [scope.storageKey, entity]) {
            do { if let value = try read(type, forKey: row["key"]!) { values.append(value) } }
            catch is DecodingError { skipped += 1 }
        }
        return (values, skipped)
    }
    func write<Value: Encodable & Sendable>(_ value: Value, forKey key: String, enqueueing command: PendingCommand? = nil) throws {
        let json = try encode(value)
        let tree = try JSONDecoder().decode(JSONValue.self, from: Data(json.utf8))
        try transaction {
            if let command {
                guard command.recordKey == key, command.baseVersion >= 0 else { throw StoreFailure(code: SQLITE_MISMATCH) }
                if try !db.execute("SELECT id FROM commands WHERE scope=? AND id=?", [scope.storageKey, command.id.uuidString]).isEmpty { return }
            }
            let entity = (try? JSONDecoder().decode([String].self, from: Data(key.utf8)))?.first ?? "local"
            if command == nil {
                try db.execute("INSERT INTO records(scope,key,entity,version,json) VALUES(?,?,?,?,?) ON CONFLICT(scope,key) DO UPDATE SET json=excluded.json,version=excluded.version,entity=excluded.entity",
                    [scope.storageKey, key, entity, String(tree["version"]?.int ?? 0), json])
            } else {
                // Keep the authoritative row separate from optimistic outbox overlays.
                // -1 is a local placeholder, so even a same-version/noop pull wins after acknowledgement.
                try db.execute("INSERT OR IGNORE INTO records(scope,key,entity,version,json) VALUES(?,?,?,?,?)",
                    [scope.storageKey, key, entity, "-1", json])
            }
            if let command {
                // Coalesce only a never-sent pending cell; UUIDs that reached transport are immutable.
                let cells = ["attendance.set", "score.set", "slip.set", "homework.grade.set"]
                var replacement = command
                if cells.contains(command.kind), let row = try db.execute("SELECT json FROM commands WHERE scope=? AND record_key=? AND kind=? AND state='pending' AND attempts=0 ORDER BY created_at DESC,seq DESC LIMIT 1", [scope.storageKey,key,command.kind]).first,
                   let old = row["json"] {
                    let previous = try decode(PendingCommand.self, old)
                    replacement = PendingCommand(id: command.id, recordKey: key, baseVersion: previous.baseVersion,
                                                 kind: command.kind, payload: command.payload, createdAt: previous.createdAt)
                    try db.execute("DELETE FROM commands WHERE scope=? AND id=?", [scope.storageKey,previous.id.uuidString])
                }
                try db.execute("INSERT INTO commands(scope,id,record_key,kind,json,local_json,created_at) VALUES(?,?,?,?,?,?,?)",
                    [scope.storageKey,replacement.id.uuidString,key,replacement.kind,try encode(replacement),json,String(replacement.createdAt.timeIntervalSince1970)])
                // A fresh edit of the same cell supersedes its rejected command: the teacher has changed
                // the value, so keeping the old error up would leave a permanent save-error pill (spec 5.3
                // asks for an error only while it is true, and the outbox would block logout forever).
                try db.execute("DELETE FROM commands WHERE scope=? AND record_key=? AND kind=? AND state='rejected'",
                               [scope.storageKey,key,command.kind])
            }
        }
    }
    func queuedCommands() throws -> [QueuedCommand] {
        try db.execute("SELECT * FROM commands WHERE scope=? ORDER BY created_at,seq", [scope.storageKey]).map {
            QueuedCommand(command: try decode(PendingCommand.self, $0["json"]!), state: $0["state"]!,
                          attempts: Int($0["attempts"]!)!, error: try $0["error"].map { try decode(APIError.self, $0) })
        }
    }
    func pendingCommands() throws -> [PendingCommand] { try queuedCommands().map(\.command) }
    func pendingCommandCount() throws -> Int { try pendingCommandCountForUser() }
    func rejectedCommandCount() throws -> Int {
        let count = try db.execute("SELECT COUNT(*) AS count FROM commands WHERE scope=? AND state='rejected'", [scope.storageKey])
            .first?["count"]
        return count.flatMap { Int($0) } ?? 0
    }
    /// Counts every membership of this user, so role switching cannot bypass the logout guard.
    func pendingCommandCountForUser() throws -> Int {
        try db.execute("SELECT DISTINCT scope FROM commands").reduce(0) { total, row in
            guard let scopeKey = row["scope"], scopeKey.hasPrefix("\(scope.userId.utf8.count):\(scope.userId)") else { return total }
            return total + (Int(try db.execute("SELECT COUNT(*) AS count FROM commands WHERE scope=?", [scopeKey]).first?["count"] ?? "0") ?? 0)
        }
    }
    func position() throws -> SyncPosition? {
        guard let row = try db.execute("SELECT cursor,epoch FROM meta WHERE scope=?", [scope.storageKey]).first else { return nil }
        return SyncPosition(cursor: Int(row["cursor"]!)!, epoch: Int(row["epoch"]!)!)
    }
    func claimBatch(now: Date) throws -> [PendingCommand] {
        try transaction {
            let rows = try db.execute("SELECT * FROM commands WHERE scope=? AND state<>'rejected' ORDER BY created_at,seq LIMIT 50", [scope.storageKey])
            var result: [PendingCommand] = []
            for row in rows {
                guard row["state"] == "pending", (Double(row["next_attempt"]!) ?? 0) <= now.timeIntervalSince1970 else { break }
                let command = try decode(PendingCommand.self, row["json"]!).currentContract
                try db.execute("UPDATE commands SET state='sending',attempts=attempts+1 WHERE scope=? AND id=?", [scope.storageKey,command.id.uuidString])
                result.append(command)
            }
            return result
        }
    }
    func acknowledge(_ results: [CommandResult]) throws {
        try transaction {
            for result in results {
                switch result.status {
                case .applied:
                    try db.execute("DELETE FROM commands WHERE scope=? AND id=? AND state='sending'", [scope.storageKey,result.id.uuidString])
                case .duplicate:
                    if result.originalStatus == .rejected {
                        try reject(result)
                    } else if result.originalStatus == .applied {
                        try db.execute("DELETE FROM commands WHERE scope=? AND id=? AND state='sending'", [scope.storageKey,result.id.uuidString])
                    } else {
                        // A duplicate without original_status acknowledges nothing; replay the same UUID.
                        try db.execute("UPDATE commands SET state='pending',next_attempt=0 WHERE scope=? AND id=? AND state='sending'", [scope.storageKey,result.id.uuidString])
                    }
                case .rejected: try reject(result)
                }
            }
        }
    }
    private func reject(_ result: CommandResult) throws {
        let error = result.error ?? APIError(code: "rejected", message: nil, details: nil, requestId: nil)
        // Read the cell before the state change so its optimistic placeholder can be dropped.
        let key = try db.execute("SELECT record_key FROM commands WHERE scope=? AND id=?", [scope.storageKey,result.id.uuidString]).first?["record_key"]
        try db.execute("UPDATE commands SET state='rejected',error=? WHERE scope=? AND id=? AND state='sending'", [try encode(error),scope.storageKey,result.id.uuidString])
        // `version = -1` is the local placeholder written with the command. The server never accepted
        // this edit, so the cell goes back to the last pulled value (or to empty) while the command
        // stays queued as the error label's source.
        if let key {
            try db.execute("DELETE FROM records WHERE scope=? AND key=? AND version=-1", [scope.storageKey,key])
        }
    }
    /// Drops a command that was never confirmed, for sends that must not wait in the outbox.
    func discardCommand(id: UUID) throws {
        try db.execute("DELETE FROM commands WHERE scope=? AND id=?", [scope.storageKey, id.uuidString])
    }
    func retry(_ ids: [UUID], now: Date, minimumDelay: TimeInterval = 0) throws {
        try transaction {
            for id in ids {
                let row = try db.execute("SELECT attempts FROM commands WHERE scope=? AND id=? AND state='sending'", [scope.storageKey,id.uuidString]).first
                guard let row else { continue }
                let delay = max(minimumDelay, min(300, pow(2, Double(min(Int(row["attempts"]!) ?? 1, 9)))))
                try db.execute("UPDATE commands SET state='pending',next_attempt=? WHERE scope=? AND id=?", [String(now.timeIntervalSince1970 + delay),scope.storageKey,id.uuidString])
            }
        }
    }
    private func upsert(entity: String, value: JSONValue) throws {
        let key = try Self.recordKey(entity: entity, value: value).storageKey
        let version = value["version"]?.int ?? value["publication_no"]?.int ?? 1
        let json = String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
        try db.execute("INSERT INTO records(scope,key,entity,version,json) VALUES(?,?,?,?,?) ON CONFLICT(scope,key) DO UPDATE SET json=excluded.json,version=excluded.version WHERE excluded.version>records.version",
                       [scope.storageKey,key,entity,String(version),json])
    }
    static func recordKey(entity: String, value: JSONValue) throws -> RecordKey {
        let pairs = ["attendance": "session_id", "score": "test_id", "slip": "session_id", "homework_grade": "section_id"]
        let k1 = value[pairs[entity] ?? "id"]?.string
        let k2 = pairs[entity] == nil ? "" : value["student_id"]?.string
        guard let k1, let k2 else { throw StoreFailure(code: SQLITE_MISMATCH) }
        return RecordKey(entity: entity,k1: k1,k2: k2)
    }
    func apply(_ page: PullPage) throws {
        try transaction {
            for (entity, values) in page.upserts where SyncEntity.allowed.contains(entity) {
                for value in values {
                    try upsert(entity: entity, value: value)
                    let key = try Self.recordKey(entity: entity, value: value)
                    try db.execute("DELETE FROM removed WHERE scope=? AND key=?", [scope.storageKey, key.storageKey])
                }
            }
            for key in page.deleted where SyncEntity.allowed.contains(key.entity) {
                try db.execute("DELETE FROM records WHERE scope=? AND key=?", [scope.storageKey,key.storageKey])
                try db.execute("INSERT OR IGNORE INTO removed(scope,key) VALUES(?,?)", [scope.storageKey, key.storageKey])
            }
            try setPosition(SyncPosition(cursor: page.cursor, epoch: page.epoch))
        }
    }

    /// Writes a record that came from a request made earlier, unless a sync has since removed it or the record
    /// it belongs to (`guarding` lists those keys). Returns false when the write was skipped.
    @discardableResult
    func writeFetched<Value: Encodable & Sendable>(_ value: Value, forKey key: String, guarding owners: [String] = []) throws -> Bool {
        let json = try encode(value)
        let tree = try JSONDecoder().decode(JSONValue.self, from: Data(json.utf8))
        let entity = (try? JSONDecoder().decode([String].self, from: Data(key.utf8)))?.first ?? "local"
        return try transaction {
            for guarded in [key] + owners {
                if try !db.execute("SELECT 1 FROM removed WHERE scope=? AND key=?", [scope.storageKey, guarded]).isEmpty { return false }
            }
            try db.execute("INSERT INTO records(scope,key,entity,version,json) VALUES(?,?,?,?,?) ON CONFLICT(scope,key) DO UPDATE SET json=excluded.json,version=excluded.version,entity=excluded.entity",
                [scope.storageKey, key, entity, String(tree["version"]?.int ?? 0), json])
            return true
        }
    }
    private func setPosition(_ position: SyncPosition) throws {
        try db.execute("INSERT INTO meta(scope,cursor,epoch) VALUES(?,?,?) ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,epoch=excluded.epoch", [scope.storageKey,String(position.cursor),String(position.epoch)])
    }
    func resetCache() throws {
        try transaction {
            try db.execute("DELETE FROM records WHERE scope=?", [scope.storageKey])
            try db.execute("DELETE FROM removed WHERE scope=?", [scope.storageKey])
            try db.execute("DELETE FROM meta WHERE scope=?", [scope.storageKey])
        }
    }
    func resetCacheForUser() throws {
        try transaction {
            let rows = try db.execute("SELECT scope FROM records UNION SELECT scope FROM meta")
            let userPrefix = "\(scope.userId.utf8.count):\(scope.userId)"
            for scopeKey in rows.compactMap({ $0["scope"] }).filter({ $0.hasPrefix(userPrefix) }) {
                try db.execute("DELETE FROM records WHERE scope=?", [scopeKey])
                try db.execute("DELETE FROM removed WHERE scope=?", [scopeKey])
                try db.execute("DELETE FROM meta WHERE scope=?", [scopeKey])
            }
        }
    }
    func installSnapshot(_ records: [String: [JSONValue]], position: SyncPosition) throws {
        try transaction {
            try db.execute("DELETE FROM records WHERE scope=?", [scope.storageKey])
            try db.execute("DELETE FROM removed WHERE scope=?", [scope.storageKey])
            for (entity, values) in records where SyncEntity.allowed.contains(entity) {
                for value in values { try upsert(entity: entity, value: value) }
            }
            try setPosition(position)
        }
    }
}
