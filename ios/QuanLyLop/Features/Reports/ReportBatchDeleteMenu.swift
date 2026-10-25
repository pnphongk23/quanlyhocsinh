import SwiftUI

/// The (⋯) menu of a report batch with its single action, "Xoá báo cáo". It is hidden without the write
/// permission and disabled while offline: deleting is a server call that is never queued.
struct ReportBatchMenu<Icon: View>: View {
    let batchID: String
    @ObservedObject var data: I4FeatureStore
    @Binding var target: ReportDeletionTarget?
    let busy: Bool
    @ViewBuilder let icon: () -> Icon

    private var availability: ReportDeletionAvailability {
        ReportDeletionRules.availability(canWrite: data.canWriteCommentsReports, isOnline: ConnectivityMonitor.shared.isOnline)
    }

    var body: some View {
        if availability != .noPermission {
            Menu {
                Button(role: .destructive) {
                    target = data.deletionTarget(batchID: batchID)
                } label: {
                    Label(String(localized: "reports.delete.action", table: "Reports"), systemImage: "trash")
                }
                .disabled(availability != .allowed || busy)
                .accessibilityIdentifier("report.delete")
            } label: { icon() }
            .accessibilityLabel(String(localized: "reports.menu.label", table: "Reports"))
            .accessibilityIdentifier("reports.batch.menu")
        }
    }
}

/// Says why "Xoá báo cáo" is locked, so a disabled menu item is never unexplained.
struct ReportDeleteOfflineNote: View {
    @ObservedObject var data: I4FeatureStore

    var body: some View {
        if ReportDeletionRules.availability(canWrite: data.canWriteCommentsReports,
                                            isOnline: ConnectivityMonitor.shared.isOnline) == .offline {
            Text(String(localized: "reports.delete.offline", table: "Reports"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier("report.delete.offline")
        }
    }
}

extension View {
    /// Confirmation dialog for deleting a batch. `onFailure` gets the message of a failed call (the batch
    /// stays); `onDeleted` runs once the batch is gone from the cache.
    func reportDeletionDialog(target: Binding<ReportDeletionTarget?>, data: I4FeatureStore,
                              onFailure: @escaping (String) -> Void, onDeleted: @escaping () -> Void,
                              busy: Binding<Bool>) -> some View {
        confirmationDialog(String(localized: "reports.delete.title", table: "Reports"),
                           isPresented: Binding(get: { target.wrappedValue != nil },
                                                set: { if !$0 { target.wrappedValue = nil } }),
                           titleVisibility: .visible, presenting: target.wrappedValue) { item in
            Button(String(localized: "reports.delete.confirm", table: "Reports"), role: .destructive) {
                busy.wrappedValue = true
                Task {
                    let failure = await data.deleteReportBatch(batchID: item.batchID)
                    busy.wrappedValue = false
                    if let failure { onFailure(failure.message) } else { onDeleted() }
                }
            }
            .accessibilityIdentifier("report.delete.confirm")
            Button(String(localized: "reports.delete.keep", table: "Reports"), role: .cancel) {}
        } message: { item in
            Text(ReportDeletionRules.message(for: item))
        }
    }
}
