import Foundation

/// Reads of the report endpoints. The sync cache only covers a window around today, so the teacher's
/// batch list, the report rows and the full session list of a class come from these calls instead.
private struct ClassSessionPage: Decodable, Sendable {
    let items: [ClassSession]
    let nextCursor: String?
}

private struct ReportBatchList: Decodable, Sendable {
    let items: [ReportBatchItem]
}

private struct ReportBatchReports: Decodable, Sendable {
    let batch: ReportBatchItem
    let items: [ReportBatchRow]
}

enum ReportRemote {
    /// Every session of the class, following the server's `next_cursor` to the end.
    static func sessions(api: any APIClient, classID: String) async throws -> [ClassSession] {
        var all: [ClassSession] = []
        var cursor: String?
        var seen = Set<String>()
        repeat {
            var query = ["from": "2000-01-01", "to": "2999-12-31", "limit": "200"]
            if let cursor { query["cursor"] = cursor }
            let page = try await api.send(.init(method: .get, path: "classes/\(classID)/sessions", query: query),
                                          as: ClassSessionPage.self)
            all.append(contentsOf: page.items)
            cursor = page.nextCursor
            if let cursor, !seen.insert(cursor).inserted { throw SyncFailure.invalidResponse }
        } while cursor != nil
        return all
    }

    static func batches(api: any APIClient, classID: String) async throws -> [ReportBatchItem] {
        try await api.send(.init(method: .get, path: "classes/\(classID)/report-batches"), as: ReportBatchList.self).items
    }

    static func reports(api: any APIClient, batchID: String) async throws -> [ReportBatchRow] {
        try await api.send(.init(method: .get, path: "report-batches/\(batchID)/reports"), as: ReportBatchReports.self).items
    }

    static func preview(api: any APIClient, reportID: String) async throws -> ReportSnapshot {
        try await api.send(.init(method: .get, path: "reports/\(reportID)/preview"), as: ReportSnapshot.self)
    }
}

extension I4FeatureStore {
    /// Sessions that decide the numbering and the choices of a report range: the class's full list once
    /// it has been loaded, the sync cache before that (or when the network never answered).
    func reportSessions(in classID: String) -> [ClassSession] {
        fullSessions[classID] ?? sessions(in: classID)
    }

    func hasFullSessions(_ classID: String) -> Bool { fullSessions[classID] != nil }

    /// Loads the class's sessions, report batches and the reports of every batch from the server and
    /// keeps them in the local cache. Returns nil on success; on failure the cache is still shown.
    func loadClassReports(classID: String) async -> ReportFailure? {
        let fallback = String(localized: "reports.error.load", table: "Reports")
        guard let api, store != nil else { return nil }
        // The session list needs the attendance permission, the batches only the report one: a refused
        // or failed session list must not hide the batches, it only blocks picking a new range.
        do {
            let list = try await ReportRemote.sessions(api: api, classID: classID)
            fullSessions[classID] = list
            sessionListFailure[classID] = nil
        } catch {
            sessionListFailure[classID] = Self.sessionListMessage(error, fallback: fallback)
        }
        do {
            let items = try await ReportRemote.batches(api: api, classID: classID)
            let rowsByBatch = try await withThrowingTaskGroup(of: (String, [ReportBatchRow]).self) { group in
                for item in items {
                    group.addTask { (item.id, try await ReportRemote.reports(api: api, batchID: item.id)) }
                }
                var collected: [String: [ReportBatchRow]] = [:]
                for try await (batchID, rows) in group { collected[batchID] = rows }
                return collected
            }
            for item in items {
                try await cacheBatch(item, classID: classID)
                for row in rowsByBatch[item.id] ?? [] { try await cacheReport(row, classID: classID) }
            }
            await refresh()
            return nil
        } catch {
            return ReportFailure.from(error, fallback: fallback)
        }
    }

    private static func sessionListMessage(_ error: Error, fallback: String) -> String {
        if case .server(let status, _, _)? = error as? APIFailure, status == 403 {
            return String(localized: "reports.error.sessionsForbidden", table: "Reports")
        }
        return ReportFailure.from(error, fallback: fallback).message
    }

    /// Reloads one batch: the report rows as the server holds them now and the server's own readiness
    /// (`GET /reports/{id}/preview`) of each, so a row never relies on a cache that misses older data.
    func loadBatchDetail(batchID: String) async -> ReportFailure? {
        let fallback = String(localized: "reports.error.load", table: "Reports")
        guard let api, store != nil else { return nil }
        do {
            let rows = try await ReportRemote.reports(api: api, batchID: batchID)
            let classID = batch(id: batchID)?.classId ?? ""
            for row in rows { try await cacheReport(row, classID: classID) }
            await refresh()
            return await reloadPreviews(reportIDs: rows.map(\.reportId))
        } catch {
            // Deleted on another device: the batch is gone, not an error to retry.
            if case .server(let status, _, _)? = error as? APIFailure, status == 404 {
                return await dropReportBatchLocally(batchID: batchID, fallback: fallback)
            }
            return ReportFailure.from(error, fallback: fallback)
        }
    }

    /// Fetches the previews of the given reports and keeps them; a report whose preview cannot be read
    /// keeps its previous one.
    func reloadPreviews(reportIDs: [String]) async -> ReportFailure? {
        let fallback = String(localized: "reports.error.load", table: "Reports")
        guard let api else { return nil }
        do {
            let snapshots = try await withThrowingTaskGroup(of: (String, ReportSnapshot).self) { group in
                for reportID in reportIDs {
                    group.addTask { (reportID, try await ReportRemote.preview(api: api, reportID: reportID)) }
                }
                var collected: [String: ReportSnapshot] = [:]
                for try await (reportID, snapshot) in group { collected[reportID] = snapshot }
                return collected
            }
            for (reportID, snapshot) in snapshots { previews[reportID] = snapshot }
            return nil
        } catch {
            return ReportFailure.from(error, fallback: fallback)
        }
    }

    func cacheBatch(_ item: ReportBatchItem, classID: String) async throws {
        guard let store else { return }
        let batch = ReportBatch(id: item.id, classId: classID, fromSessionId: item.fromSessionId,
                                toSessionId: item.toSessionId, fromKey: item.fromKey, toKey: item.toKey,
                                version: self.batch(id: item.id)?.version ?? 1)
        try await store.write(batch, forKey: key("report_batch", batch.id), enqueueing: nil)
    }

    func cacheReport(_ row: ReportBatchRow, classID: String) async throws {
        guard let store else { return }
        let report = StudentReport(id: row.reportId, classId: classID, studentId: row.studentId,
                                   batchId: row.batchId, month: row.month, status: row.status,
                                   generalComment: row.generalComment ?? "", needsRepublish: row.needsRepublish,
                                   publicationCount: row.publicationCount, publishedAt: row.publishedAt,
                                   version: row.version)
        try await store.write(report, forKey: key("report", report.id), enqueueing: nil)
    }
}
