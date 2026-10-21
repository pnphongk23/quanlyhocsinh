import Foundation

enum ReportPDFUploadError: Error, Equatable {
    case pdfTooLarge(bytes: Int)
}

/// Uploads a generated monthly-report PDF. The contract is
/// `PUT /reports/{id}/publications/{no}/pdf` with an `application/pdf` body of at most 5 MB
/// (see `ios/docs/core-api.md` section 1). The size guard stays in the feature layer because
/// `APIEndpoint` never truncates a body.
enum ReportPDFUpload {
    static let maximumBytes = 5 * 1024 * 1024
    static let contentType = "application/pdf"

    static func endpoint(reportId: String, publicationNo: Int, pdf: Data) -> APIEndpoint {
        let path = "reports/\(reportId)/publications/\(publicationNo)/pdf"
        return APIEndpoint.binary(method: .put, path: path, body: pdf, contentType: contentType)
    }

    static func upload(pdf: Data, reportId: String, publicationNo: Int, api: any APIClient) async throws {
        guard pdf.count <= maximumBytes else {
            throw ReportPDFUploadError.pdfTooLarge(bytes: pdf.count)
        }
        let endpoint = endpoint(reportId: reportId, publicationNo: publicationNo, pdf: pdf)
        _ = try await api.send(endpoint, as: EmptyResponse.self)
    }
}
