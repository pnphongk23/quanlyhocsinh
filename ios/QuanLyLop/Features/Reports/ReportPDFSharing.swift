import SwiftUI
import UIKit

struct I4ReportPDFShareItem: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

enum I4ReportPDFFile {
    /// "bao-cao-2026-10-01-2026-10-24-1.pdf"; reports from before batches use their month.
    static func fileName(for snapshot: ReportSnapshot, publicationNo: Int) -> String {
        if let range = snapshot.range {
            let from = String(range.fromKey.prefix(10)), to = String(range.toKey.prefix(10))
            return "bao-cao-\(from)-\(to)-\(publicationNo).pdf"
        }
        let monthNumber = Int((snapshot.month ?? "").suffix(2)) ?? 0
        return "bao-cao-thang-\(monthNumber)-\(publicationNo).pdf"
    }

    @MainActor
    static func write(_ data: Data, name: String) throws -> URL {
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
