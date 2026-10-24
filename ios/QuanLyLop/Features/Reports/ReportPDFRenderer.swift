import UIKit

/// The report PDF: the same content as the preview, rendered on device with UIKit.
enum I4PDFRenderer {
    /// Range label of the snapshot; reports from before batches only know their month.
    static func title(for snapshot: ReportSnapshot) -> String {
        if let range = snapshot.range {
            return String.localizedStringWithFormat(String(localized: "reports.pdf.title", table: "Reports"),
                                                    ReportRangeRules.label(of: range))
        }
        return String.localizedStringWithFormat(String(localized: "feature.reports.bao.cao.thang"),
                                                String(describing: Int((snapshot.month ?? "").dropFirst(5)) ?? 0))
    }

    static func render(snapshot: ReportSnapshot, studentName: String, className: String = "") -> Data {
        let page = CGRect(x: 0, y: 0, width: 595, height: 842)
        let renderer = UIGraphicsPDFRenderer(bounds: page)
        return renderer.pdfData { context in
            context.beginPage()
            var cursor = PDFCursor(top: 48, context: context, page: page)
            cursor.title(title(for: snapshot))
            cursor.text(className.isEmpty ? studentName : "\(studentName) · \(className)", size: 12, muted: true)
            cursor.gap(8)

            let attendance = snapshot.attendance
            cursor.heading(String(localized: "feature.reports.chuyen.can"))
            cursor.text(String.localizedStringWithFormat(String(localized: "feature.reports.buoi.muon.co.phep.vang"), String(describing: (attendance.present + attendance.late)), String(describing: (attendance.heldSessions)), String(describing: (attendance.late)), String(describing: (attendance.excused)), String(describing: (attendance.absent))))

            let stars = snapshot.stars
            cursor.heading(String(localized: "feature.reports.nhan.xet.theo.sao"))
            cursor.text(String.localizedStringWithFormat(String(localized: "feature.reports.buoi.buoi.buoi.tinh.tren.phieu.a.gui"), String(describing: (stars.three)), String(describing: (stars.two)), String(describing: (stars.one))))

            cursor.heading(String(localized: "feature.reports.bai.tap.ve.nha"))
            if snapshot.homework.isEmpty {
                cursor.text(String(localized: "reports.homework.none", table: "Reports"), muted: true)
            } else {
                cursor.text(String(localized: "feature.reports.phan.tot.hoan.thanh.chua"), size: 11, muted: true)
                for item in snapshot.homework {
                    cursor.text("\(item.kind.label) · \(item.excellent) · \(item.done) · \(item.notDone)")
                }
                cursor.text(String(localized: "feature.reports.chi.tinh.ket.qua.a.gui.khong.quy.ra.iem"), size: 10, muted: true)
            }

            cursor.heading(String(localized: "feature.reports.iem.tung.bai"))
            if snapshot.tests.isEmpty {
                cursor.text(String(localized: "reports.tests.none", table: "Reports"), muted: true)
            } else {
                for test in snapshot.tests {
                      let value = test.value.map { "\(I4Format.score($0))/\(test.max)" } ?? String(localized: "feature.reports.noScore")
                    cursor.text("\(test.name) · \(I4Format.date(test.date)): \(value)")
                }
            }

            cursor.heading(String(localized: "feature.reports.nhan.xet.chung"))
            cursor.text(snapshot.generalComment.isEmpty ? String(localized: "feature.reports.chua.co.nhan.xet.chung") : snapshot.generalComment)
        }
    }
}

private struct PDFCursor {
    var y: CGFloat
    let context: UIGraphicsPDFRendererContext
    let page: CGRect

    init(top: CGFloat, context: UIGraphicsPDFRendererContext, page: CGRect) {
        self.y = top
        self.context = context
        self.page = page
    }

    mutating func gap(_ amount: CGFloat) { y += amount }

    mutating func title(_ text: String) {
        draw(text, font: .boldSystemFont(ofSize: 22), color: UIColor(AppColors.text), width: page.width - 84, height: 30)
        y += 4
    }

    mutating func heading(_ text: String) {
        y += 10
        draw(text, font: .boldSystemFont(ofSize: 14), color: UIColor(AppColors.text), width: page.width - 84, height: 22)
    }

    mutating func text(_ text: String, size: CGFloat = 12, muted: Bool = false) {
        draw(text, font: .systemFont(ofSize: size),
             color: muted ? UIColor(AppColors.muted) : UIColor(AppColors.text),
             width: page.width - 84, height: 0)
    }

    private mutating func draw(_ text: String, font: UIFont, color: UIColor, width: CGFloat, height: CGFloat) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineSpacing = 4
        let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .paragraphStyle: paragraph]
        let measured = (text as NSString).boundingRect(with: CGSize(width: width, height: .greatestFiniteMagnitude),
                                                       options: [.usesLineFragmentOrigin, .usesFontLeading],
                                                       attributes: attributes, context: nil)
        let needed = height > 0 ? max(height, measured.height) : measured.height
        if y + needed > page.height - 40 {
            context.beginPage()
            y = 48
        }
        (text as NSString).draw(in: CGRect(x: 42, y: y, width: width, height: needed), withAttributes: attributes)
        y += needed + 4
    }
}
