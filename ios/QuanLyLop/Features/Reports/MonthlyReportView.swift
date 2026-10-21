import SwiftUI
import PDFKit
import UIKit

struct MonthlyReportView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var studentID = ""
    @State private var month = String(ISO8601DateFormatter().string(from: .now).prefix(7))
    @State private var comment = ""
    @State private var snapshot: ReportSnapshot?
    @State private var loading = false
    @State private var shareURL: URL?

    init(classID: String, data: I4FeatureStore = .demo) {
        self.classID = classID
        self.data = data
    }

    private var students: [Student] {
        data.students.filter { $0.classId == classID && $0.status == .active }
    }

    private var student: Student? {
        students.first { $0.id == studentID } ?? students.first
    }

    private var published: Bool {
        guard let student else { return false }
        return data.publications.contains { $0.studentId == student.id && $0.month == month }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Báo cáo tháng").appText(AppText.title)
                controls
                if loading { AppSpinner().frame(maxWidth: .infinity).padding() }
                if let snapshot {
                    preview(snapshot)
                    commentCard
                    publishButton(snapshot)
                    localPDFButton(snapshot)
                    if let shareURL {
                        ShareLink(item: shareURL) {
                            Text("Chia sẻ PDF").appText(AppText.buttonSmall)
                        }
                        .frame(maxWidth: .infinity)
                    }
                } else if !loading {
                    AppEmptyState(title: "Chưa có dữ liệu xem trước") {
                        Text("Chọn học sinh và tháng rồi tải bản xem trước.").appText(AppText.muted)
                    }
                }
                if let message = data.errorMessage {
                    Text(message).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
            .padding(16)
        }
        .background(AppColors.background)
        .task {
            await data.configure(auth: auth)
            if studentID.isEmpty { studentID = students.first?.id ?? "" }
            await loadPreview()
        }
        .onChange(of: studentID) { _, _ in Task { await loadPreview() } }
        .onChange(of: month) { _, _ in Task { await loadPreview() } }
    }

    private var controls: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Học sinh", selection: $studentID) {
                    ForEach(students, id: \.id) { item in
                        Text(item.name).tag(item.id)
                    }
                }
                AppTextField(label: "Tháng", text: $month, placeholder: "YYYY-MM")
                AppButton(title: "Xem trước", variant: .secondary) {
                    Task { await loadPreview() }
                }
            }
        }
    }

    private var commentCard: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Nhận xét chung").appText(AppText.subheading)
                TextField("Nhận xét chung", text: $comment, axis: .vertical)
                    .lineLimit(3...6)
                    .textFieldStyle(.roundedBorder)
                AppButton(title: "Lưu nháp", variant: .secondary) {
                    Task { await saveDraft() }
                }
            }
        }
    }

    private func publishButton(_ snapshot: ReportSnapshot) -> some View {
        AppButton(title: published ? "Phát hành lại" : "Phát hành", size: .large) {
            guard let student else { return }
            Task {
                await data.publish(student: student, month: month, comment: comment, snapshot: snapshot)
            }
        }
        .disabled(!snapshot.ready)
    }

    private func localPDFButton(_ snapshot: ReportSnapshot) -> some View {
        Button("Tạo PDF trên thiết bị") { makePDF(snapshot) }
            .appText(AppText.buttonSmall)
            .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func preview(_ report: ReportSnapshot) -> some View {
        previewHeader
        AppCard {
            HStack {
                attendanceStat(report)
                testStat(report)
            }
        }
        starsCard(report)
        homeworkCard(report)
        testsCard(report)
    }

    private var previewHeader: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 5) {
                Text("Báo cáo tháng \(month.dropFirst(5))").appText(AppText.heading)
                Text("Xem trước · \(student?.name ?? "")").appText(AppText.muted)
            }
        }
    }

    private func attendanceStat(_ report: ReportSnapshot) -> some View {
        stat("Chuyên cần", attendanceValue(report), attendanceDetail(report))
    }

    private func testStat(_ report: ReportSnapshot) -> some View {
        stat("Bài kiểm tra", testValue(report), "đã có điểm")
    }

    private func attendanceValue(_ report: ReportSnapshot) -> String {
        let attended = report.attendance.present + report.attendance.late
        return "\(attended)/\(report.attendance.heldSessions) buổi"
    }

    private func attendanceDetail(_ report: ReportSnapshot) -> String {
        let attendance = report.attendance
        return "\(attendance.late) muộn · \(attendance.excused) có phép · \(attendance.absent) vắng"
    }

    private func testValue(_ report: ReportSnapshot) -> String {
        let scored = report.tests.filter { $0.value != nil }.count
        return "\(scored)/\(report.tests.count) bài"
    }

    private func starsCard(_ report: ReportSnapshot) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Nhận xét theo sao").appText(AppText.subheading)
                starLine(3, count: report.stars.three)
                starLine(2, count: report.stars.two)
                starLine(1, count: report.stars.one)
            }
        }
    }

    private func starLine(_ stars: Int, count: Int) -> some View {
        Text("\(String(repeating: "★", count: stars))  \(count) buổi")
            .foregroundStyle(AppColors.warning)
    }

    private func homeworkCard(_ report: ReportSnapshot) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Bài tập về nhà").appText(AppText.subheading)
                Text("Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành").appText(AppText.muted)
                ForEach(report.homework, id: \.kind) { homeworkRow($0) }
                Text("Chỉ tính kết quả đã gửi. BTVN không quy ra điểm.")
                    .appText(AppText.caption).foregroundStyle(AppColors.muted)
            }
        }
    }

    private func homeworkRow(_ item: HomeworkSummary) -> some View {
        HStack {
            Text(kindLabel(item.kind))
            Spacer()
            Text("\(item.excellent) · \(item.done) · \(item.notDone)").appText(AppText.body)
        }
    }

    private func testsCard(_ report: ReportSnapshot) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("Điểm từng bài").appText(AppText.subheading)
                ForEach(report.tests, id: \.testId) { item in
                    testRow(item)
                }
                Text("Bài chưa có điểm cần chấm trước khi phát hành.")
                    .appText(AppText.caption).foregroundStyle(AppColors.muted)
            }
        }
    }

    private func testRow(_ item: ReportTest) -> some View {
        HStack {
            VStack(alignment: .leading) {
                Text(item.name).appText(AppText.body)
                Text(item.date).appText(AppText.caption).foregroundStyle(AppColors.muted)
            }
            Spacer()
            Text(scoreText(item)).appText(AppText.body)
        }
    }

    private func scoreText(_ item: ReportTest) -> String {
        guard let value = item.value else { return "Chưa có điểm" }
        return "\(value.formatted())/\(item.max)"
    }

    private func stat(_ title: String, _ value: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).appText(AppText.caption).foregroundStyle(AppColors.muted)
            Text(value).appText(AppText.heading)
            Text(detail).appText(AppText.caption).foregroundStyle(AppColors.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func loadPreview() async {
        guard let student, month.count == 7 else {
            snapshot = nil
            return
        }
        loading = true
        defer { loading = false }
        do {
            let path = "students/\(student.id)/report-preview"
            let preview = try await data.api.send(.init(method: .get, path: path, query: ["month": month]),
                                                  as: ReportSnapshot.self)
            snapshot = preview
            comment = preview.generalComment
        } catch {
            let stored = data.publications.first { $0.studentId == student.id && $0.month == month }?.snapshot
            snapshot = stored
            comment = stored?.generalComment ?? ""
            if stored == nil { data.errorMessage = "Không thể tải báo cáo khi mất mạng." }
        }
    }

    private func saveDraft() async {
        guard let student else { return }
        do {
            let path = "students/\(student.id)/reports/\(month)"
            let body = try APIEndpoint.json(method: .put, path: path, body: ["general_comment": comment])
            let _: EmptyResponse = try await data.api.send(body, as: EmptyResponse.self)
            data.errorMessage = "Đã lưu nháp báo cáo."
        } catch { data.errorMessage = "Không thể lưu nháp khi mất mạng." }
    }

    private func makePDF(_ snapshot: ReportSnapshot) {
        guard let student else { return }
        let bytes = I4PDFRenderer.render(snapshot: snapshot, studentName: student.name)
        let name = "bao-cao-\(month)-\(student.id).pdf"
        let url = FileManager.default.temporaryDirectory.appending(path: name)
        do {
            try bytes.write(to: url, options: .atomic)
            shareURL = url
        } catch { data.errorMessage = "Không tạo được PDF." }
    }

    private func kindLabel(_ kind: HomeworkKind) -> String {
        switch kind {
        case .vocabulary: "Luyện từ vựng"
        case .reading: "Luyện đọc"
        case .speaking: "Luyện nói"
        case .exercise: "Bài tập"
        }
    }
}

enum I4PDFRenderer {
    static func render(snapshot: ReportSnapshot, studentName: String) -> Data {
        let page = CGRect(x: 0, y: 0, width: 595, height: 842)
        let renderer = UIGraphicsPDFRenderer(bounds: page)
        return renderer.pdfData { context in
            context.beginPage()
            var cursor = PDFCursor(top: 48)
            let titleFont = titleAttributes()
            let bodyFont = bodyAttributes()
            cursor.draw("Báo cáo tháng \(snapshot.month)", font: titleFont, height: 36)
            cursor.draw("Học sinh: \(studentName)", font: bodyFont)
            cursor.draw(attendanceLine(snapshot), font: bodyFont)
            cursor.draw(starsLine(snapshot), font: bodyFont)
            cursor.draw("Bài tập về nhà", font: titleFont, height: 32)
            for item in snapshot.homework {
                cursor.draw(homeworkLine(item), font: bodyFont)
            }
            cursor.draw("Điểm từng bài", font: titleFont, height: 32)
            for item in snapshot.tests {
                cursor.draw(testLine(item), font: bodyFont)
            }
            cursor.draw(commentLine(snapshot), font: bodyFont, height: 90)
        }
    }

    private static func titleAttributes() -> [NSAttributedString.Key: Any] {
        [.font: UIFont.boldSystemFont(ofSize: 22), .foregroundColor: UIColor(AppColors.text)]
    }

    private static func bodyAttributes() -> [NSAttributedString.Key: Any] {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineSpacing = 5
        return [
            .font: UIFont.systemFont(ofSize: 12),
            .foregroundColor: UIColor(AppColors.text),
            .paragraphStyle: paragraph
        ]
    }

    private static func attendanceLine(_ snapshot: ReportSnapshot) -> String {
        let attendance = snapshot.attendance
        let attended = attendance.present + attendance.late
        return "Chuyên cần: \(attended)/\(attendance.heldSessions) buổi (\(attendance.late) muộn, \(attendance.excused) có phép, \(attendance.absent) vắng)"
    }

    private static func starsLine(_ snapshot: ReportSnapshot) -> String {
        "Nhận xét theo sao: ★★★ \(snapshot.stars.three) · ★★ \(snapshot.stars.two) · ★ \(snapshot.stars.one)"
    }

    private static func homeworkLine(_ item: HomeworkSummary) -> String {
        "\(item.kind.rawValue): \(item.excellent) hoàn thành tốt · \(item.done) hoàn thành · \(item.notDone) chưa hoàn thành"
    }

    private static func testLine(_ item: ReportTest) -> String {
        let value = item.value.map { "\($0.formatted())/\(item.max)" } ?? "Chưa có điểm"
        return "\(item.name) · \(item.date): \(value)"
    }

    private static func commentLine(_ snapshot: ReportSnapshot) -> String {
        let comment = snapshot.generalComment.isEmpty ? "Chưa có nhận xét chung." : snapshot.generalComment
        return "Nhận xét chung: \(comment)"
    }
}

private struct PDFCursor {
    var y: CGFloat
    init(top: CGFloat) { y = top }

    mutating func draw(_ text: String, font: [NSAttributedString.Key: Any], height: CGFloat = 48) {
        let rect = CGRect(x: 42, y: y, width: 511, height: height)
        (text as NSString).draw(in: rect, withAttributes: font)
        y += height
    }
}
