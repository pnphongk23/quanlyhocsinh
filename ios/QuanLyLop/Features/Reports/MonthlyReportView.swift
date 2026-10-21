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
    init(classID: String, data: I4FeatureStore = .demo) { self.classID = classID; self.data = data }
    private var students: [Student] { data.students.filter { $0.classId == classID && $0.status == .active } }
    private var student: Student? { students.first { $0.id == studentID } ?? students.first }
    private var published: Bool { data.publications.contains { $0.studentId == student?.id && $0.month == month } }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Báo cáo tháng").appText(AppText.title)
                AppCard { VStack(alignment: .leading, spacing: 12) {
                    Picker("Học sinh", selection: $studentID) { ForEach(students) { Text($0.name).tag($0.id) } }
                    AppTextField(label: "Tháng", text: $month, placeholder: "YYYY-MM")
                    AppButton(title: "Xem trước", variant: .secondary) { Task { await loadPreview() } }
                } }
                if loading { AppSpinner().frame(maxWidth: .infinity).padding() }
                if let snapshot {
                    preview(snapshot)
                    AppCard { VStack(alignment: .leading, spacing: 10) {
                        Text("Nhận xét chung").appText(AppText.subheading)
                        TextField("Nhận xét chung", text: $comment, axis: .vertical).lineLimit(3...6).textFieldStyle(.roundedBorder)
                        AppButton(title: "Lưu nháp", variant: .secondary) { Task { await saveDraft() } }
                    } }
                    AppButton(title: published ? "Phát hành lại" : "Phát hành", size: .large) { guard let student else { return }; Task { await data.publish(student: student, month: month, comment: comment, snapshot: snapshot) } }.disabled(!snapshot.ready)
                    Button("Tạo PDF trên thiết bị") { makePDF(snapshot) }.appText(AppText.buttonSmall).frame(maxWidth: .infinity)
                    if let shareURL { ShareLink(item: shareURL) { Text("Chia sẻ PDF").appText(AppText.buttonSmall) }.frame(maxWidth: .infinity) }
                } else if !loading {
                    AppEmptyState(title: "Chưa có dữ liệu xem trước", detail: { Text("Chọn học sinh và tháng rồi tải bản xem trước.").appText(AppText.muted) })
                }
                if let message = data.errorMessage { Text(message).appText(AppText.muted).foregroundStyle(AppColors.error) }
            }.padding(16)
        }.background(AppColors.background)
        .task { await data.configure(auth: auth); if studentID.isEmpty { studentID = students.first?.id ?? "" }; await loadPreview() }
        .onChange(of: studentID) { _, _ in Task { await loadPreview() } }
        .onChange(of: month) { _, _ in Task { await loadPreview() } }
    }

    @ViewBuilder private func preview(_ report: ReportSnapshot) -> some View {
        AppCard { VStack(alignment: .leading, spacing: 5) {
            Text("Báo cáo tháng \(month.dropFirst(5))").appText(AppText.heading)
            Text("Xem trước · \(student?.name ?? "")").appText(AppText.muted)
        } }
        AppCard { HStack { stat("Chuyên cần", "\(report.attendance.present + report.attendance.late)/\(report.attendance.heldSessions) buổi", "\(report.attendance.late) muộn · \(report.attendance.excused) có phép · \(report.attendance.absent) vắng"); stat("Bài kiểm tra", "\(report.tests.filter { $0.value != nil }.count)/\(report.tests.count) bài", "đã có điểm") } }
        AppCard { VStack(alignment: .leading, spacing: 10) {
            Text("Nhận xét theo sao").appText(AppText.subheading)
            Text("★★★  \(report.stars.three) buổi").foregroundStyle(AppColors.warning)
            Text("★★  \(report.stars.two) buổi").foregroundStyle(AppColors.warning)
            Text("★  \(report.stars.one) buổi").foregroundStyle(AppColors.warning)
        } }
        AppCard { VStack(alignment: .leading, spacing: 10) {
            Text("Bài tập về nhà").appText(AppText.subheading)
            Text("Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành").appText(AppText.muted)
            ForEach(report.homework, id: \.kind) { item in HStack { Text(kindLabel(item.kind)); Spacer(); Text("\(item.excellent) · \(item.done) · \(item.notDone)").appText(AppText.body) } }
            Text("Chỉ tính kết quả đã gửi. BTVN không quy ra điểm.").appText(AppText.caption).foregroundStyle(AppColors.muted)
        } }
        AppCard { VStack(alignment: .leading, spacing: 8) {
            Text("Điểm từng bài").appText(AppText.subheading)
            ForEach(report.tests, id: \.testId) { item in HStack { VStack(alignment: .leading) { Text(item.name).appText(AppText.body); Text(item.date).appText(AppText.caption).foregroundStyle(AppColors.muted) }; Spacer(); Text(item.value.map { "\($0.formatted())/\(item.max)" } ?? "Chưa có điểm").appText(AppText.body) } }
            Text("Bài chưa có điểm cần chấm trước khi phát hành.").appText(AppText.caption).foregroundStyle(AppColors.muted)
        } }
    }

    private func stat(_ title: String, _ value: String, _ detail: String) -> some View { VStack(alignment: .leading, spacing: 5) { Text(title).appText(AppText.caption).foregroundStyle(AppColors.muted); Text(value).appText(AppText.heading); Text(detail).appText(AppText.caption).foregroundStyle(AppColors.muted) }.frame(maxWidth: .infinity, alignment: .leading) }
    private func loadPreview() async {
        guard let student, month.count == 7 else { snapshot = nil; return }
        loading = true; defer { loading = false }
        do {
            snapshot = try await data.api.send(.init(method: .get, path: "students/\(student.id)/report-preview", query: ["month": month]), as: ReportSnapshot.self)
            comment = snapshot?.generalComment ?? ""
        } catch {
            snapshot = data.publications.first { $0.studentId == student.id && $0.month == month }?.snapshot
            comment = snapshot?.generalComment ?? ""
            if snapshot == nil { data.errorMessage = "Không thể tải báo cáo khi mất mạng." }
        }
    }
    private func saveDraft() async {
        guard let student else { return }
        do {
            let body = try APIEndpoint.json(method: .put, path: "students/\(student.id)/reports/\(month)", body: ["general_comment": comment])
            let _: EmptyResponse = try await data.api.send(body, as: EmptyResponse.self)
            data.errorMessage = "Đã lưu nháp báo cáo."
        } catch { data.errorMessage = "Không thể lưu nháp khi mất mạng." }
    }
    private func makePDF(_ snapshot: ReportSnapshot) {
        guard let student else { return }
        let bytes = I4PDFRenderer.render(snapshot: snapshot, studentName: student.name)
        let url = FileManager.default.temporaryDirectory.appending(path: "bao-cao-\(month)-\(student.id).pdf")
        do { try bytes.write(to: url, options: .atomic); shareURL = url }
        catch { data.errorMessage = "Không tạo được PDF." }
    }
    private func kindLabel(_ kind: HomeworkKind) -> String { switch kind { case .vocabulary: "Luyện từ vựng"; case .reading: "Luyện đọc"; case .speaking: "Luyện nói"; case .exercise: "Bài tập" } }
}

enum I4PDFRenderer {
    static func render(snapshot: ReportSnapshot, studentName: String) -> Data {
        let page = CGRect(x: 0, y: 0, width: 595, height: 842)
        let renderer = UIGraphicsPDFRenderer(bounds: page)
        return renderer.pdfData { context in
            context.beginPage()
            let paragraph = NSMutableParagraphStyle(); paragraph.lineSpacing = 5
            let title = [NSAttributedString.Key.font: UIFont.boldSystemFont(ofSize: 22), .foregroundColor: UIColor(AppColors.text)]
            let body = [NSAttributedString.Key.font: UIFont.systemFont(ofSize: 12), .foregroundColor: UIColor(AppColors.text), .paragraphStyle: paragraph]
            var y: CGFloat = 48
            func draw(_ text: String, font: [NSAttributedString.Key: Any], height: CGFloat = 48) {
                (text as NSString).draw(in: CGRect(x: 42, y: y, width: 511, height: height), withAttributes: font); y += height
            }
            draw("Báo cáo tháng \(snapshot.month)", font: title, height: 36)
            draw("Học sinh: \(studentName)", font: body)
            draw("Chuyên cần: \(snapshot.attendance.present + snapshot.attendance.late)/\(snapshot.attendance.heldSessions) buổi (\(snapshot.attendance.late) muộn, \(snapshot.attendance.excused) có phép, \(snapshot.attendance.absent) vắng)", font: body)
            draw("Nhận xét theo sao: ★★★ \(snapshot.stars.three) · ★★ \(snapshot.stars.two) · ★ \(snapshot.stars.one)", font: body)
            draw("Bài tập về nhà", font: title, height: 32)
            for item in snapshot.homework { draw("\(item.kind.rawValue): \(item.excellent) hoàn thành tốt · \(item.done) hoàn thành · \(item.notDone) chưa hoàn thành", font: body) }
            draw("Điểm từng bài", font: title, height: 32)
            for item in snapshot.tests { draw("\(item.name) · \(item.date): \(item.value.map { "\($0.formatted())/\(item.max)" } ?? "Chưa có điểm")", font: body) }
            draw("Nhận xét chung: \(snapshot.generalComment.isEmpty ? "Chưa có nhận xét chung." : snapshot.generalComment)", font: body, height: 90)
        }
    }
}
