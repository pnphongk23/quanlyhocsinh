import Foundation
import Observation

/// Prototype `SaveState` (`design/prototype/src/data/types.ts`).
///
/// I-6 renders only `.error`. `offline-plan.md` forbids a permanent sync chip ("chỉ hiện lỗi khi
/// lưu hoặc đồng bộ lỗi"), so "đang lưu"/"đã lưu" are never shown; the other cases exist so the
/// state names stay the prototype's.
enum SaveState: String, Sendable, Equatable, CaseIterable {
    case unsaved, local, synced, error
}

/// One place the app frame can read "saving is broken" from.
///
/// `SyncCoordinator` writes it from whatever actor runs a sync and the app frame reads it on the
/// main actor, so the fields sit behind a lock; `@Observable` keeps the frame up to date without
/// polling. A failed sync and a command the server rejected both mean the same thing to the teacher
/// — this edit is not on the server yet — so they share one visible state.
///
/// Two devices editing one cell are resolved by the server last-write-wins (`api-spec.md` mục 6,
/// chốt 2026-10-21), with no flag and no choice for the teacher.
@Observable
final class SyncStatusCenter: @unchecked Sendable {
    static let shared = SyncStatusCenter()

    private let lock = NSLock()
    private var syncFailure = false
    private var rejectedCommands = 0

    init() {}

    var state: SaveState {
        lock.withLock { syncFailure || rejectedCommands > 0 ? .error : .synced }
    }
    var isFailed: Bool { state == .error }
    var rejectedCommandCount: Int { lock.withLock { rejectedCommands } }

    /// Replaces the whole picture after one synchronisation attempt: the caller reports whether the
    /// attempt failed and the store's rejected-command count (cumulative). A later successful sync
    /// clears the failure, but not simply because it ran: commands still `rejected` in the outbox
    /// keep the error visible until they are resolved.
    func record(syncFailed: Bool, rejectedCommands: Int) {
        lock.withLock {
            syncFailure = syncFailed
            self.rejectedCommands = max(0, rejectedCommands)
        }
    }

    /// Logout / identity change: the previous account's failures are not ours any more.
    func reset() { record(syncFailed: false, rejectedCommands: 0) }
}
