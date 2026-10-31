import Foundation

/// Why the delete action of a report batch cannot be used right now.
enum ReportDeletionAvailability: Equatable {
    case allowed
    case noPermission
    case offline
}

/// What the confirmation dialog says: a batch that was published also tells the teacher that parents lose it.
struct ReportDeletionTarget: Identifiable, Equatable {
    let batchID: String
    let rangeLabel: String
    let published: Bool
    var id: String { batchID }
}

enum ReportDeletionRules {
    /// Deleting is a server call that is never queued: it needs the permission to write reports and a network.
    static func availability(canWrite: Bool, isOnline: Bool) -> ReportDeletionAvailability {
        if !canWrite { return .noPermission }
        return isOnline ? .allowed : .offline
    }

    /// A batch counts as published as soon as one of its reports has a publication.
    static func isPublished(_ reports: [StudentReport]) -> Bool {
        reports.contains { $0.status == .published || $0.publicationCount > 0 }
    }

    static func message(for target: ReportDeletionTarget) -> String {
        let key = target.published ? "reports.delete.message.published" : "reports.delete.message.draft"
        return String.localizedStringWithFormat(String(localized: String.LocalizationValue(key), table: "Reports"), target.rangeLabel)
    }
}

extension I4FeatureStore {
    func deletionTarget(batchID: String) -> ReportDeletionTarget? {
        guard let batch = batch(id: batchID) else { return nil }
        let label = ReportRangeRules.resolve(batch, sessions: reportSessions(in: batch.classId)).label
        return ReportDeletionTarget(batchID: batchID, rangeLabel: label,
                                    published: ReportDeletionRules.isPublished(reports(batchID: batchID)))
    }

    /// Soft-deletes the whole batch on the server, then drops it from the cache. The server answers 200 again
    /// for a batch it already deleted, and 404 once the batch is gone for this workspace: both mean it is gone,
    /// so the cache is cleaned. Any other failure keeps the batch and returns the message to show.
    func deleteReportBatch(batchID: String) async -> ReportFailure? {
        let fallback = String(localized: "reports.error.delete", table: "Reports")
        guard let api else { return ReportFailure(message: fallback) }
        do {
            _ = try await api.send(.init(method: .delete, path: "report-batches/\(batchID)"), as: DeleteReportBatchResponse.self)
        } catch {
            guard case .server(let status, _, _)? = error as? APIFailure, status == 404 else {
                return ReportFailure.from(error, fallback: fallback)
            }
        }
        return await dropReportBatchLocally(batchID: batchID, fallback: fallback)
    }

    /// Removes the batch, its reports and publications from the cache and from what the screens hold.
    func dropReportBatchLocally(batchID: String, fallback: String = String(localized: "reports.error.delete", table: "Reports")) async -> ReportFailure? {
        deletedBatchIDs.insert(batchID)
        let reportIDs = reports(batchID: batchID).map(\.id)
        do {
            try await store?.removeReportBatch(id: batchID)
        } catch {
            deletedBatchIDs.remove(batchID)
            return ReportFailure(message: fallback)
        }
        for id in reportIDs { previews[id] = nil }
        await refresh()
        return nil
    }
}
