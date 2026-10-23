import Foundation

/// Runs synchronization only while the signed-in app is active and reachable.
@MainActor
final class SyncScheduler {
    private let interval: Duration
    private let isOnline: @MainActor () -> Bool
    private let synchronize: @MainActor () async -> Void
    private var task: Task<Void, Never>?

    init(interval: Duration = .seconds(60),
         isOnline: @escaping @MainActor () -> Bool,
         synchronize: @escaping @MainActor () async -> Void) {
        self.interval = interval
        self.isOnline = isOnline
        self.synchronize = synchronize
    }

    func setActive(_ active: Bool) {
        guard active else {
            task?.cancel()
            task = nil
            return
        }
        guard task == nil else { return }
        task = Task { [weak self] in
            guard let self else { return }
            if isOnline() { await synchronize() }
            while !Task.isCancelled {
                do { try await Task.sleep(for: interval) } catch { return }
                guard !Task.isCancelled else { return }
                if isOnline() { await synchronize() }
            }
        }
    }
}
