import Foundation

/// Server-driven report actions. Creating, commenting, previewing and publishing need the network:
/// the server computes the numbers, and the local cache is updated only from its answers.
extension I4FeatureStore {
    struct BatchPublishOutcome: Equatable {
        let published: Int
        let skipped: [BatchPublishResponse.Skipped]
    }

    /// Creates the batch with a client-made `requestID`; sending the same id again returns the same batch.
    func createBatch(classID: String, fromSessionID: String, toSessionID: String,
                     requestID: String) async -> Result<String, ReportFailure> {
        let fallback = String(localized: "reports.error.create", table: "Reports")
        guard let api else { return .failure(ReportFailure(message: fallback)) }
        do {
            let body = ["id": requestID, "from_session_id": fromSessionID, "to_session_id": toSessionID]
            let endpoint = try APIEndpoint.json(method: .post, path: "classes/\(classID)/report-batches", body: body)
            let response = try await api.send(endpoint, as: CreateReportBatchResponse.self)
            try await cacheBatch(response.batch, classID: classID)
            for row in response.reports { try await cacheReport(row, classID: classID) }
            await refresh()
            return .success(response.batch.id)
        } catch {
            return .failure(ReportFailure.from(error, fallback: fallback))
        }
    }

    /// Saves the general comment of one report. Returns an error message, or nil on success.
    func saveReportComment(reportID: String, comment: String) async -> String? {
        let fallback = String(localized: "feature.scores.khong.the.luu.nhan.xet.chung")
        guard let api, let store, let current = report(id: reportID) else { return fallback }
        do {
            let endpoint = try APIEndpoint.json(method: .put, path: "reports/\(reportID)", body: ["general_comment": comment])
            let response = try await api.send(endpoint, as: ReportCommentResponse.self)
            let next = StudentReport(id: current.id, classId: current.classId, studentId: current.studentId,
                                     batchId: current.batchId, month: current.month, status: current.status,
                                     generalComment: response.generalComment ?? comment,
                                     needsRepublish: response.needsRepublish ?? current.needsRepublish,
                                     publicationCount: current.publicationCount, publishedAt: current.publishedAt,
                                     version: max(current.version, response.version ?? current.version))
            try await store.write(next, forKey: key("report", next.id), enqueueing: nil)
            await refresh()
            if previews[reportID] != nil { _ = await reloadPreviews(reportIDs: [reportID]) }
            return nil
        } catch {
            return ReportFailure.from(error, fallback: fallback).message
        }
    }

    /// The report as the server would publish it now (`GET /reports/{id}/preview`).
    func previewReport(reportID: String) async -> Result<ReportSnapshot, ReportFailure> {
        let fallback = String(localized: "reports.error.preview", table: "Reports")
        guard let api else { return .failure(ReportFailure(message: fallback)) }
        do {
            let snapshot = try await api.send(.init(method: .get, path: "reports/\(reportID)/preview"), as: ReportSnapshot.self)
            return .success(snapshot)
        } catch {
            return .failure(ReportFailure.from(error, fallback: fallback))
        }
    }

    func publishReport(reportID: String) async -> Result<Int, ReportFailure> {
        let fallback = String(localized: "reports.error.publish", table: "Reports")
        guard let api, let current = report(id: reportID) else { return .failure(ReportFailure(message: fallback)) }
        do {
            let response = try await api.send(.init(method: .post, path: "reports/\(reportID)/publish"),
                                              as: ReportPublishResponse.self)
            try await markPublished(current, number: response.publicationNo, at: response.publishedAt)
            await refresh()
            return .success(response.publicationNo)
        } catch {
            return .failure(ReportFailure.from(error, fallback: fallback))
        }
    }

    /// Publishes every ready report of the batch; the server lists the ones it left out in `skipped`.
    func publishBatch(batchID: String) async -> Result<BatchPublishOutcome, ReportFailure> {
        let fallback = String(localized: "reports.error.publish", table: "Reports")
        guard let api else { return .failure(ReportFailure(message: fallback)) }
        do {
            let response = try await api.send(.init(method: .post, path: "report-batches/\(batchID)/publish"),
                                              as: BatchPublishResponse.self)
            for item in response.published {
                if let current = report(id: item.reportId) {
                    try await markPublished(current, number: item.publicationNo, at: response.publishedAt)
                }
            }
            await refresh()
            return .success(BatchPublishOutcome(published: response.published.count, skipped: response.skipped))
        } catch {
            return .failure(ReportFailure.from(error, fallback: fallback))
        }
    }

    private func markPublished(_ current: StudentReport, number: Int, at publishedAt: String) async throws {
        guard let store else { return }
        let next = StudentReport(id: current.id, classId: current.classId, studentId: current.studentId,
                                 batchId: current.batchId, month: current.month, status: .published,
                                 generalComment: current.generalComment, needsRepublish: false,
                                 publicationCount: max(current.publicationCount, number), publishedAt: publishedAt,
                                 version: current.version)
        try await store.write(next, forKey: key("report", next.id), enqueueing: nil)
    }
}
