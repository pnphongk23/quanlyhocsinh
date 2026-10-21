import XCTest
@testable import QuanLyLop

private final class PDFTransport: @unchecked Sendable {
    struct Reply: Sendable { let status: Int; let data: Data; let headers: [String: String] }
    private let lock = NSLock()
    private(set) var reply: Reply?
    private(set) var request: URLRequest?
    private(set) var calls = 0

    func set(_ reply: Reply) {
        lock.lock(); defer { lock.unlock() }
        self.reply = reply
    }

    func handle(_ request: URLRequest) -> Reply? {
        lock.lock(); defer { lock.unlock() }
        self.request = request
        calls += 1
        return reply
    }
}

private final class PDFURLProtocol: URLProtocol, @unchecked Sendable {
    static let transport = PDFTransport()
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard let reply = Self.transport.handle(request) else {
            client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)); return
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: reply.status,
                                       httpVersion: nil, headerFields: reply.headers)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: reply.data)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

final class GuardianPDFTests: XCTestCase {
    private let base = URL(string: "https://fixture.invalid/v1")!

    private func downloader(token: String? = "FIXTURE_NOT_A_REAL_TOKEN",
                            session: URLSession? = nil) -> GuardianReportPDFDownloader {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [PDFURLProtocol.self]
        return GuardianReportPDFDownloader(baseURL: base,
                                           tokenStore: InMemoryTokenStore(token: token),
                                           session: session ?? URLSession(configuration: config))
    }

    func testDownloadUsesPublishedPdfEndpointWithBearerAndSavesFile() async throws {
        let pdf = Data("%PDF-1.4 fixture".utf8)
        PDFURLProtocol.transport.set(.init(status: 200, data: pdf,
                                          headers: ["Content-Type": "application/pdf"]))
        let url = try await downloader().download(reportID: "rep_1", publicationNo: 3, month: "2026-10")
        defer { try? FileManager.default.removeItem(at: url) }

        let request = try XCTUnwrap(PDFURLProtocol.transport.request)
        XCTAssertEqual(request.httpMethod, "GET")
        XCTAssertEqual(request.url?.absoluteString,
                       "https://fixture.invalid/v1/reports/rep_1/publications/3/pdf")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer FIXTURE_NOT_A_REAL_TOKEN")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/pdf")
        XCTAssertEqual(try Data(contentsOf: url), pdf)
        XCTAssertEqual(url.lastPathComponent, "bao-cao-thang-10-3.pdf")
    }

    func testMissingTokenNeverCallsTheNetwork() async throws {
        PDFURLProtocol.transport.set(.init(status: 200, data: Data("x".utf8), headers: [:]))
        do {
            _ = try await downloader(token: nil).download(reportID: "rep", publicationNo: 1, month: "2026-10")
            XCTFail("must require a token")
        } catch {
            XCTAssertEqual(error as? GuardianPDFError, .missingToken)
        }
    }

    func testStatusCodesMapToUserFacingErrors() async throws {
        PDFURLProtocol.transport.set(.init(status: 404, data: Data(), headers: [:]))
        await assert(.notFound, reportID: "rep", publicationNo: 1)
        PDFURLProtocol.transport.set(.init(status: 403, data: Data(), headers: [:]))
        await assert(.unauthorized, reportID: "rep", publicationNo: 1)
    }

    func testNonPdfPayloadIsRejected() async throws {
        PDFURLProtocol.transport.set(.init(status: 200, data: Data("{}".utf8),
                                          headers: ["Content-Type": "application/json"]))
        await assert(.notPDF, reportID: "rep", publicationNo: 2)
    }

    func testDownloadedFileIsWrittenUnderTemporaryDirectory() async throws {
        PDFURLProtocol.transport.set(.init(status: 200, data: Data("%PDF-1.7".utf8),
                                          headers: ["Content-Type": "application/pdf"]))
        let url = try await downloader().download(reportID: "rep", publicationNo: 1, month: "2026-10")
        defer { try? FileManager.default.removeItem(at: url) }
        XCTAssertEqual(url.deletingLastPathComponent().standardizedFileURL.path,
                       FileManager.default.temporaryDirectory.standardizedFileURL.path)
    }

    private func assert(_ expected: GuardianPDFError, reportID: String, publicationNo: Int) async {
        do {
            _ = try await downloader().download(reportID: reportID, publicationNo: publicationNo, month: "2026-10")
            XCTFail("expected \(expected)")
        } catch {
            XCTAssertEqual(error as? GuardianPDFError, expected)
        }
    }
}
