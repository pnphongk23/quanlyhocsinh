import SwiftUI
import UIKit

struct I4ReportPDFShareItem: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

enum I4ReportPDFFile {
    @MainActor
    static func write(_ data: Data, month: String, publicationNo: Int) throws -> URL {
        let monthNumber = Int(month.suffix(2)) ?? 0
        let name = "bao-cao-thang-\(monthNumber)-\(publicationNo).pdf"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try? FileManager.default.removeItem(at: url)
        try data.write(to: url, options: .atomic)
        return url
    }

    @MainActor
    static func remove(_ url: URL?) {
        guard let url else { return }
        try? FileManager.default.removeItem(at: url)
    }
}

struct I4ReportPDFShareSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
