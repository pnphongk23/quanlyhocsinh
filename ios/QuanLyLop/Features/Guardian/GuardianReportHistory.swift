import Foundation

private struct StudentReportListItem: Decodable, Sendable {
    let reportId: String
    let status: ReportStatus
    let publicationCount: Int
}

private struct StudentReportPage: Decodable, Sendable {
    let items: [StudentReportListItem]
    let nextCursor: String?
}

/// The sync feed only carries reports inside a window around today. This reads the guardian's full
/// list of published reports (`GET /students/{id}/reports`, cursor followed to the end) and fetches the
/// snapshot of every latest publication the cache does not hold yet.
enum GuardianReportHistory {
    /// True when every published report of the students is in the cache afterwards.
    static func refresh(api: any APIClient, store: SQLiteStore, studentIDs: [String]) async -> Bool {
        var have = Set<String>()
        if let known = try? await store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication") {
            have = Set(known.values.map { "\($0.reportId)#\($0.publicationNo)" })
        }
        var complete = true
        for studentID in studentIDs {
            let items: [StudentReportListItem]
            do { items = try await list(api: api, studentID: studentID) }
            catch {
                complete = false
                if (error as? APIFailure) == .offline { return false }
                continue
            }
            for item in items where item.status == .published && item.publicationCount > 0 {
                let marker = "\(item.reportId)#\(item.publicationCount)"
                if have.contains(marker) { continue }
                do {
                    let publication = try await api.send(
                        .init(method: .get, path: "reports/\(item.reportId)/publications/\(item.publicationCount)"),
                        as: ReportPublication.self)
                    let key = RecordKey(entity: "report_publication", k1: publication.id, k2: "").storageKey
                    try await store.write(publication, forKey: key, enqueueing: nil)
                    have.insert(marker)
                } catch {
                    complete = false
                    if (error as? APIFailure) == .offline { return false }
                }
            }
        }
        return complete
    }

    /// Follows the server's `next_cursor` only; a cursor seen twice means the server is looping.
    private static func list(api: any APIClient, studentID: String) async throws -> [StudentReportListItem] {
        var all: [StudentReportListItem] = []
        var cursor: String?
        var seen = Set<String>()
        repeat {
            var query = ["limit": "100"]
            if let cursor { query["cursor"] = cursor }
            let page = try await api.send(.init(method: .get, path: "students/\(studentID)/reports", query: query),
                                          as: StudentReportPage.self)
            all.append(contentsOf: page.items)
            cursor = page.nextCursor
            if let cursor, !seen.insert(cursor).inserted { throw SyncFailure.invalidResponse }
        } while cursor != nil
        return all
    }
}

/// When the guardian's data was last fully refreshed from the server, kept per membership so an
/// offline launch can say how old the cached reports are.
enum GuardianFreshness {
    private static func key(_ scope: CacheScope) -> String { "guardian.refreshedAt." + scope.storageKey }

    static func record(_ scope: CacheScope, at date: Date = .now, defaults: UserDefaults = .standard) {
        defaults.set(date.timeIntervalSince1970, forKey: key(scope))
    }

    static func last(_ scope: CacheScope, defaults: UserDefaults = .standard) -> Date? {
        let value = defaults.double(forKey: key(scope))
        return value > 0 ? Date(timeIntervalSince1970: value) : nil
    }
}
