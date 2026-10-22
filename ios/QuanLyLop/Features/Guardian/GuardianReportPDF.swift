import SwiftUI

// MARK: - Nút "Tải PDF về máy"

struct GuardianReportDownloadButton: View {
    let publication: ReportPublication
    let month: String
    let studentName: String
    let className: String

    @State private var isPreparing = false
    @State private var errorMessage: String?
    @State private var shareItem: I4ReportPDFShareItem?
    @State private var temporaryPDFURL: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button { preparePDF() } label: {
                Text(String(localized: "feature.guardian.tai.pdf.ve.may"))
                    .appText(AppText.buttonLarge)
                    .foregroundStyle(AppColors.onPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 52)
                    .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.control))
            }
            .buttonStyle(.plain)
            .disabled(isPreparing)
            .accessibilityIdentifier("guardian.report.pdf")
            if isPreparing {
                HStack(spacing: 8) {
                    AppSpinner()
                    Text(String(localized: "feature.reports.dang.chuan.bi.pdf"))
                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                        .foregroundStyle(AppColors.muted)
                }
            }
            if let errorMessage {
                GuardianErrorText(text: errorMessage)
            }
        }
        .sheet(item: $shareItem, onDismiss: {
            I4ReportPDFFile.remove(temporaryPDFURL)
            temporaryPDFURL = nil
        }) { item in
            I4ReportPDFShareSheet(url: item.url)
        }
    }

    private func preparePDF() {
        guard !isPreparing else { return }
        isPreparing = true
        errorMessage = nil
        defer { isPreparing = false }
        do {
            let pdf = I4PDFRenderer.render(snapshot: publication.snapshot,
                                           studentName: studentName,
                                           className: className)
            let url = try I4ReportPDFFile.write(pdf, month: month,
                                                publicationNo: publication.publicationNo)
            temporaryPDFURL = url
            shareItem = I4ReportPDFShareItem(url: url)
        } catch _ {
            errorMessage = String(localized: "feature.reports.khong.the.tao.pdf")
        }
    }
}
