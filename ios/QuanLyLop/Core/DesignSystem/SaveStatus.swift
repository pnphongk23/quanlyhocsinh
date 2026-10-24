import Observation
import SwiftUI

/// What the save line of a screen says (rules.md mục 6, "Chờ đồng bộ").
enum SaveStatusKind: Equatable, Sendable {
    /// "Đã lưu trên máy": written locally and (nearly) nothing left to push.
    case savedLocal
    /// Pill "Chờ đồng bộ": the push queue has been non-empty for more than `AppDuration.pendingAfter`.
    case pending
    /// "Đã lưu trên máy · sẽ đồng bộ khi có mạng".
    case offline
    /// Sync failed or the server rejected a command.
    case error

    /// `unsyncedSince` is when the push queue last went from empty to non-empty.
    static func resolve(failed: Bool, unsyncedSince: Date?, isOnline: Bool, now: Date) -> SaveStatusKind {
        if failed { return .error }
        guard let unsyncedSince else { return .savedLocal }
        if !isOnline { return .offline }
        return now.timeIntervalSince(unsyncedSince) > AppDuration.pendingAfter ? .pending : .savedLocal
    }
}

/// Read-only view of the push queue (`LocalStore.pendingCommandCount`), connectivity
/// (`ConnectivityMonitor`) and sync failures (`SyncStatusCenter`). A screen calls `refresh()` after
/// each save and when a sync ends; the "Chờ đồng bộ" switch after one second is scheduled here.
@MainActor
@Observable
final class AppSaveStatusSource {
    private(set) var kind: SaveStatusKind = .savedLocal

    private let pendingCount: @MainActor () async -> Int
    private let isOnline: @MainActor () -> Bool
    private let failed: @MainActor () -> Bool
    private let now: @MainActor () -> Date
    private let sleep: @MainActor (TimeInterval) async -> Void
    private var unsyncedSince: Date?
    private var recheck: Task<Void, Never>?

    init(pendingCount: @escaping @MainActor () async -> Int,
         isOnline: @escaping @MainActor () -> Bool = { ConnectivityMonitor.shared.isOnline },
         failed: @escaping @MainActor () -> Bool = { SyncStatusCenter.shared.isFailed },
         now: @escaping @MainActor () -> Date = { Date() },
         sleep: @escaping @MainActor (TimeInterval) async -> Void = { seconds in
             try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
         }) {
        self.pendingCount = pendingCount
        self.isOnline = isOnline
        self.failed = failed
        self.now = now
        self.sleep = sleep
    }

    convenience init(store: any LocalStore) {
        self.init(pendingCount: { (try? await store.pendingCommandCount()) ?? 0 })
    }

    func refresh() async {
        let count = await pendingCount()
        if count > 0 {
            if unsyncedSince == nil { unsyncedSince = now() }
        } else {
            unsyncedSince = nil
        }
        recompute()
        scheduleRecheck()
    }

    private func recompute() {
        kind = .resolve(failed: failed(), unsyncedSince: unsyncedSince, isOnline: isOnline(), now: now())
    }

    private func scheduleRecheck() {
        recheck?.cancel()
        recheck = nil
        guard let unsyncedSince else { return }
        let wait = AppDuration.pendingAfter - now().timeIntervalSince(unsyncedSince)
        guard wait >= 0, kind == .savedLocal else { return }
        recheck = Task { [weak self] in
            await self?.sleep(wait + 0.01)
            guard let self, !Task.isCancelled else { return }
            self.recompute()
        }
    }
}

/// One line for the save state of a screen; nothing else should draw these texts.
struct AppSaveStatus: View {
    let kind: SaveStatusKind

    var body: some View {
        Group {
            switch kind {
            case .savedLocal:
                label(String(localized: "ds.status.local", table: "DesignSystem"), systemImage: "checkmark",
                      color: AppColors.muted)
            case .pending:
                AppPill(title: String(localized: "ds.status.pending", table: "DesignSystem"), tone: .warning)
            case .offline:
                label(String(localized: "ds.status.offline", table: "DesignSystem"), systemImage: "wifi.slash",
                      color: AppState.pendingFg)
            case .error:
                AppPill(title: String(localized: "status.save.error"), tone: .error)
            }
        }
        .accessibilityIdentifier("saveStatus.\(identifier)")
        .accessibilityAddTraits(.updatesFrequently)
    }

    private func label(_ text: String, systemImage: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: systemImage).font(.system(size: 12, weight: .semibold))
            Text(text).appText(AppText.caption)
        }
        .foregroundStyle(color)
    }

    private var identifier: String {
        switch kind {
        case .savedLocal: "local"
        case .pending: "pending"
        case .offline: "offline"
        case .error: "error"
        }
    }
}
