import Foundation
import Observation
import UIKit

/// Port of `useSaveAction.ts` timing: the write is local and finishes at once, so `saving` is held
/// for `AppDuration.loadingMin`, then `saved` for `AppDuration.successHold`, then back to `idle`.
/// A failure goes straight back to `idle` with `error` set; the screen keeps what the user typed
/// and keeps the editor open.
@MainActor
@Observable
final class AppSaveController {
    enum Phase: Equatable, Sendable { case idle, saving, saved }

    private(set) var phase: Phase = .idle
    private(set) var error: Error?

    private let now: @MainActor () -> Date
    private let sleep: @MainActor (TimeInterval) async -> Void
    private let announce: @MainActor (String) -> Void
    private var holdTask: Task<Void, Never>?

    var isSaving: Bool { phase == .saving }

    init(now: @escaping @MainActor () -> Date = { Date() },
         sleep: @escaping @MainActor (TimeInterval) async -> Void = { seconds in
             try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
         },
         announce: @escaping @MainActor (String) -> Void = { message in
             UIAccessibility.post(notification: .announcement, argument: message)
         }) {
        self.now = now
        self.sleep = sleep
        self.announce = announce
    }

    /// Runs `work`. Returns `true` when it succeeded; ignored (returns `false`) while already saving.
    @discardableResult
    func submit(_ work: @MainActor () async throws -> Void) async -> Bool {
        guard phase != .saving else { return false }
        holdTask?.cancel()
        error = nil
        phase = .saving
        let startedAt = now()
        var failure: Error?
        do { try await work() } catch { failure = error }
        let remaining = AppDuration.loadingMin - now().timeIntervalSince(startedAt)
        if remaining > 0 { await sleep(remaining) }
        if let failure {
            error = failure
            phase = .idle
            return false
        }
        phase = .saved
        announce(String(localized: "ds.save.saved", table: "DesignSystem"))
        holdTask = Task { [weak self] in
            guard let self else { return }
            await self.sleep(AppDuration.successHold)
            if !Task.isCancelled, self.phase == .saved { self.phase = .idle }
        }
        return true
    }

    func clearError() { error = nil }
}
