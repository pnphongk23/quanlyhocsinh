import SwiftUI
import UIKit

/// Error states of the guardian report download. The prototype prints the page
/// (`window.print()`), so these are iOS-only messages (see the report).
enum GuardianPDFError: Error, Equatable {
    case missingToken
    case offline
    case unauthorized
    case notFound
    case notPDF
    case server(Int)

    var message: String {
        switch self {
        case .missingToken, .unauthorized:
            String(localized: "feature.guardian.phien.ang.nhap.a.het.han.vui.long.ang.nhap.lai")
        case .offline:
            String(localized: "feature.guardian.khong.co.ket.noi.mang.vui.long.thu.lai")
        case .notFound:
            String(localized: "feature.guardian.bao.cao.chua.co.tep.pdf.vui.long.thu.lai.sau")
        case .notPDF, .server:
            String(localized: "feature.guardian.khong.tai.uoc.pdf.vui.long.thu.lai")
        }
    }
}

/// `GET /reports/{id}/publications/{no}/pdf` (api-spec mục 8): the Worker streams the PDF
/// from R2 and checks permission per request, with no signed link.
///
/// Core's `APIClient` only decodes JSON, so this feature-level downloader performs the
/// binary GET with the same Bearer/service conventions. Recorded in the I-8A report for
/// the lead: a `sendData` on the core client would let this disappear.
struct GuardianReportPDFDownloader: Sendable {
    let baseURL: URL
    let tokenStore: any TokenStore
    let session: URLSession

    init(baseURL: URL, tokenStore: any TokenStore, session: URLSession? = nil) {
        self.baseURL = baseURL
        self.tokenStore = tokenStore
        if let session { self.session = session }
        else {
            let config = URLSessionConfiguration.ephemeral
            config.urlCache = nil
            config.httpCookieStorage = nil
            config.timeoutIntervalForRequest = 60
            self.session = URLSession(configuration: config)
        }
    }

    /// Live downloader for the current build configuration.
    static func live() -> GuardianReportPDFDownloader? {
        guard case .success(let configuration) = AppConfiguration.load() else { return nil }
        let tokenStore = KeychainTokenStore(service: "vn.quanlylop.\(configuration.environment.rawValue)")
        return GuardianReportPDFDownloader(baseURL: configuration.apiBaseURL, tokenStore: tokenStore)
    }

    func request(reportID: String, publicationNo: Int) -> URLRequest? {
        let path = "reports/\(reportID)/publications/\(publicationNo)/pdf"
        guard var parts = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { return nil }
        let base = parts.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        parts.path = "/" + ([base, path].filter { !$0.isEmpty }.joined(separator: "/"))
        guard let url = parts.url, url.scheme == "https" else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/pdf", forHTTPHeaderField: "Accept")
        request.setValue("ios/1.0.0", forHTTPHeaderField: "X-Client")
        request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Request-Id")
        return request
    }

    /// Downloads the published PDF and returns a temporary file ready to share or save.
    func download(reportID: String, publicationNo: Int, month: String) async throws -> URL {
        guard var request = request(reportID: reportID, publicationNo: publicationNo) else {
            throw GuardianPDFError.notPDF
        }
        guard let token = try await tokenStore.token() else { throw GuardianPDFError.missingToken }
        request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")

        let data: Data
        let response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch let error as URLError {
            if error.code == .cancelled { throw CancellationError() }
            throw GuardianPDFError.offline
        }
        guard let http = response as? HTTPURLResponse else { throw GuardianPDFError.notPDF }
        switch http.statusCode {
        case 200..<300: break
        case 401, 403: throw GuardianPDFError.unauthorized
        case 404: throw GuardianPDFError.notFound
        default: throw GuardianPDFError.server(http.statusCode)
        }
        let type = http.value(forHTTPHeaderField: "Content-Type") ?? ""
        guard type.isEmpty || type.lowercased().contains("pdf") else { throw GuardianPDFError.notPDF }
        guard !data.isEmpty else { throw GuardianPDFError.notPDF }

        let name = "bao-cao-thang-\(GuardianFormat.monthNumber(month))-\(publicationNo).pdf"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try data.write(to: url, options: .atomic)
        return url
    }
}

// MARK: - Nút "Tải PDF về máy"

struct GuardianReportDownloadButton: View {
    let publication: ReportPublication
    let month: String

    @State private var isDownloading = false
    @State private var errorMessage: String?
    @State private var share: GuardianShareItem?

    private struct GuardianShareItem: Identifiable {
        let url: URL
        var id: String { url.absoluteString }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button { Task { await download() } } label: {
                Text(String(localized: "feature.guardian.tai.pdf.ve.may"))
                    .appText(AppText.buttonLarge)
                    .foregroundStyle(AppColors.onPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 52)
                    .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.control))
            }
            .buttonStyle(.plain)
            .disabled(isDownloading)
            .accessibilityIdentifier("guardian.report.pdf")
            if isDownloading {
                HStack(spacing: 8) {
                    AppSpinner()
                    Text(String(localized: "feature.guardian.ang.tai.pdf"))
                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                        .foregroundStyle(AppColors.muted)
                }
            }
            if let errorMessage {
                GuardianErrorText(text: errorMessage)
            }
        }
        .sheet(item: $share) { item in
            GuardianShareSheet(url: item.url)
        }
    }

    private func download() async {
        guard !isDownloading, let downloader = GuardianReportPDFDownloader.live() else {
            errorMessage = GuardianPDFError.notPDF.message
            return
        }
        isDownloading = true
        errorMessage = nil
        defer { isDownloading = false }
        do {
            let url = try await downloader.download(reportID: publication.reportId,
                                                    publicationNo: publication.publicationNo,
                                                    month: month)
            share = GuardianShareItem(url: url)
        } catch let error as GuardianPDFError {
            errorMessage = error.message
        } catch is CancellationError {
            return
        } catch {
            errorMessage = GuardianPDFError.notPDF.message
        }
    }
}

/// System share sheet: "Lưu vào Tệp" downloads the PDF to the device (iOS-native step
/// standing in for the prototype's browser print dialog).
struct GuardianShareSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
