import Foundation

/// Responses of the report-batch endpoints (`contract-changes.md`, report batches by session range).
struct ReportBatchItem: Decodable, Sendable {
    let id: String
    let classId: String
    let fromSessionId: String?
    let toSessionId: String?
    let fromKey: String
    let toKey: String
}

extension KeyedDecodingContainer {
    /// REST answers carry SQLite flags as `0`/`1`; the sync feed carries booleans. Accepts both.
    func decodeServerFlag(forKey key: Key) throws -> Bool {
        if let flag = try? decode(Bool.self, forKey: key) { return flag }
        return try decode(Int.self, forKey: key) != 0
    }

    func decodeServerFlagIfPresent(forKey key: Key) throws -> Bool? {
        guard contains(key), try !decodeNil(forKey: key) else { return nil }
        return try decodeServerFlag(forKey: key)
    }
}

struct ReportBatchRow: Decodable, Sendable {
    let reportId: String
    let batchId: String
    let studentId: String
    let month: String?
    let status: ReportStatus
    let generalComment: String?
    let needsRepublish: Bool
    let publicationCount: Int
    let publishedAt: String?
    let version: Int

    private enum CodingKeys: String, CodingKey {
        case reportId, batchId, studentId, month, status, generalComment, needsRepublish
        case publicationCount, publishedAt, version
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        reportId = try container.decode(String.self, forKey: .reportId)
        batchId = try container.decode(String.self, forKey: .batchId)
        studentId = try container.decode(String.self, forKey: .studentId)
        month = try container.decodeIfPresent(String.self, forKey: .month)
        status = try container.decode(ReportStatus.self, forKey: .status)
        generalComment = try container.decodeIfPresent(String.self, forKey: .generalComment)
        needsRepublish = try container.decodeServerFlag(forKey: .needsRepublish)
        publicationCount = try container.decode(Int.self, forKey: .publicationCount)
        publishedAt = try container.decodeIfPresent(String.self, forKey: .publishedAt)
        version = try container.decode(Int.self, forKey: .version)
    }
}

struct CreateReportBatchResponse: Decodable, Sendable {
    let batch: ReportBatchItem
    let reports: [ReportBatchRow]
}

struct ReportCommentResponse: Decodable, Sendable {
    let generalComment: String?
    let needsRepublish: Bool?
    let version: Int?

    private enum CodingKeys: String, CodingKey { case generalComment, needsRepublish, version }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        generalComment = try container.decodeIfPresent(String.self, forKey: .generalComment)
        needsRepublish = try container.decodeServerFlagIfPresent(forKey: .needsRepublish)
        version = try container.decodeIfPresent(Int.self, forKey: .version)
    }
}

struct ReportPublishResponse: Decodable, Sendable {
    let reportId: String
    let batchId: String?
    let publicationNo: Int
    let publishedAt: String
    let snapshot: ReportSnapshot
}

struct BatchPublishResponse: Decodable, Sendable {
    struct Published: Decodable, Sendable, Equatable {
        let reportId: String
        let publicationNo: Int
    }
    struct Skipped: Decodable, Sendable, Equatable {
        let reportId: String
        let missing: [String]
    }
    let published: [Published]
    let skipped: [Skipped]
    let publishedAt: String
}

/// Why a report call failed, already worded for the teacher.
struct ReportFailure: Error, Equatable {
    let message: String

    static func from(_ error: Error, fallback: String) -> ReportFailure {
        if error is CancellationError { return ReportFailure(message: fallback) }
        guard let failure = error as? APIFailure else { return ReportFailure(message: fallback) }
        switch failure {
        case .offline, .missingToken:
            return ReportFailure(message: String(localized: "reports.error.offline", table: "Reports"))
        case .server(let status, let error, _):
            if status == 409, error.details?["reason"]?.string == "report_not_ready" {
                return ReportFailure(message: notReady(error.details?["missing"]))
            }
            // The server answers 422 `validation_error`; what went wrong is in `details.reason`.
            if status == 422, error.details?["reason"]?.string == "invalid_range" {
                return ReportFailure(message: ReportRangeProblem.order.message)
            }
            if status == 422, error.details?["reason"]?.string == "session_cancelled" {
                return ReportFailure(message: ReportRangeProblem.cancelled.message)
            }
            if status == 422 { return ReportFailure(message: String(localized: "reports.error.range", table: "Reports")) }
            if status == 403 { return ReportFailure(message: String(localized: "reports.error.forbidden", table: "Reports")) }
            if status == 404 { return ReportFailure(message: String(localized: "reports.error.notFound", table: "Reports")) }
            if status == 409 { return ReportFailure(message: String(localized: "reports.error.conflict", table: "Reports")) }
            if status == 429 { return ReportFailure(message: String(localized: "reports.error.tooFast", table: "Reports")) }
            return ReportFailure(message: fallback)
        default:
            return ReportFailure(message: fallback)
        }
    }

    private static func notReady(_ missing: JSONValue?) -> String {
        var codes: [String] = []
        if case .array(let items) = missing { codes = items.compactMap(\.string) }
        let reasons = ReportRules.missingReasons(codes)
        if reasons.isEmpty { return String(localized: "reports.error.notReady", table: "Reports") }
        return String.localizedStringWithFormat(String(localized: "reports.error.notReadyMissing", table: "Reports"),
                                                reasons.joined(separator: ", "))
    }
}
