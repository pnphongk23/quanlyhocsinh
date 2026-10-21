import SwiftUI
import UIKit

/// Tab "Báo cáo" (`ReportsPage.tsx`): month picker, review list with per-student status,
/// inline general comment, preview of the monthly report and publishing.
struct MonthlyReportView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var month: String
    @State private var studentID = ""
    @State private var previewOpen = false
    @State private var commentDraft: CommentDraft?
    @State private var message: String?
    @State private var error: String?
    @State private var publishing = false
    @State private var saveTask: Task<Void, Never>?

    init(classID: String, data: I4FeatureStore = .demo) {
        self.classID = classID
        self.data = data
        _month = State(initialValue: I4Format.currentMonth())
    }

    private var klass: Classroom? { data.classes.first { $0.id == classID } }

    private var sessions: [ClassSession] { data.sessions(in: classID) }
    private var tests: [TestDefinition] { data.tests(in: classID) }

    private var choices: [String] {
        ReportRules.monthChoices(sessions: data.sessions, tests: data.tests,
                                 reports: data.reports, selected: month)
    }

    private var rows: [I4MonthlyReport] {
        data.students
            .filter { $0.classId == classID }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            .compactMap { student in
                ReportRules.build(student: student, month: month, sessions: sessions,
                                  attendance: data.attendance, tests: tests, scores: data.scores,
                                  slips: data.slips, sections: data.sections, grades: data.grades,
                                  generalComment: data.report(studentID: student.id, month: month)?.generalComment ?? "")
            }
    }

    private var selected: I4MonthlyReport? {
        rows.first { $0.student.id == studentID } ?? rows.first
    }

    private var slots: [ReportSlot] {
        rows.map { ReportRules.slot($0, record: data.report(studentID: $0.student.id, month: month)) }
    }

    private var summary: (total: Int, ready: Int, missing: Int, published: Int, publishable: Int) {
        ReportRules.summary(slots)
    }

    private var monthLabel: String { I4Format.monthOption(month) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !data.canReadCommentsReports {
                AppEmptyState(title: "Bạn không có quyền xem báo cáo") {
                    Text("Liên hệ Admin nếu bạn cần quyền truy cập.").appText(AppText.body)
                }
            } else if previewOpen, let selected {
                preview(selected)
            } else {
                monthBar
                summaryLine
                notices
                if rows.isEmpty {
                    AppEmptyState(title: "Chưa có dữ liệu báo cáo") {
                        Text("Chọn tháng có buổi học hoặc bài kiểm tra để xem báo cáo.")
                            .appText(AppText.body)
                    }
                } else {
                    studentList
                    if data.canWriteCommentsReports {
                        publishAllButton
                        Text("Phụ huynh chỉ thấy báo cáo sau khi bạn phát hành.")
                            .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                            .foregroundStyle(AppColors.muted)
                    }
                }
            }
        }
        .task {
            await data.configure(auth: auth)
            if month == I4Format.currentMonth(), let latest = latestMonth() { month = latest }
            if studentID.isEmpty { studentID = rows.first?.student.id ?? "" }
        }
        .onChange(of: studentID) { _, _ in
            previewOpen = false
            message = nil
            error = nil
            commentDraft = nil
        }
    }

    private func latestMonth() -> String? {
        let dates = sessions.map(\.date) + tests.map(\.date)
        return dates.sorted().last.map { String($0.prefix(7)) }
    }

    private var monthBar: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Chọn tháng")
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            Menu {
                ForEach(choices, id: \.self) { choice in
                    Button(I4Format.monthOption(choice)) { changeMonth(choice) }
                }
            } label: {
                HStack(spacing: 8) {
                    Text(monthLabel)
                        .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                        .foregroundStyle(AppColors.text)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppColors.text)
                }
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.control)
                        .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
            }
            .accessibilityLabel("Chọn tháng báo cáo")
        }
    }

    private func changeMonth(_ choice: String) {
        guard choice != month else { return }
        month = choice
        studentID = rows.first?.student.id ?? ""
        previewOpen = false
        message = nil
        error = nil
        commentDraft = nil
    }

    private var summaryLine: some View {
        HStack(spacing: 4) {
            Text("\(summary.ready)/\(summary.total)")
                .foregroundStyle(AppColors.text)
            Text("sẵn sàng ·")
            Text("\(summary.missing)")
                .foregroundStyle(AppColors.warning)
            Text("thiếu dữ liệu ·")
            Text("\(summary.published)")
                .foregroundStyle(AppColors.text)
            Text("đã phát hành")
        }
        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
        .foregroundStyle(AppColors.muted)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var notices: some View {
        if let message {
            Text(message)
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.success)
        }
        if let error {
            Text(error)
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.error)
        }
    }

    private var studentList: some View {
        VStack(spacing: 8) {
            ForEach(Array(rows.enumerated()), id: \.element.student.id) { index, row in
                studentRow(row, slot: slots[index])
            }
        }
    }

    private func studentRow(_ report: I4MonthlyReport, slot: ReportSlot) -> some View {
        let active = report.student.id == selected?.student.id
        return VStack(alignment: .leading, spacing: 8) {
            Button { select(report) } label: {
                HStack(alignment: .top, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(report.student.name)
                            .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 21.6))
                            .foregroundStyle(AppColors.text)
                            .multilineTextAlignment(.leading)
                        if !slot.detail.isEmpty {
                            Text(slot.detail)
                                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                                .foregroundStyle(AppColors.muted)
                                .multilineTextAlignment(.leading)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    AppPill(title: slot.label, tone: slot.tone)
                }
                .frame(minHeight: 40)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if active {
                AppColors.divider.frame(height: 1)
                    .padding(.top, 8)
                facts(report)
                commentEditor(report)
                AppButton(title: "Xem trước", variant: .secondary, size: .large) {
                    saveNow()
                    previewOpen = true
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(active ? AppColors.primary : .clear, lineWidth: 2))
    }

    private func facts(_ report: I4MonthlyReport) -> some View {
        HStack(spacing: 8) {
            statCard(label: "Chuyên cần",
                     value: "\(report.attendanceCount)/\(report.snapshot.attendance.heldSessions) buổi",
                     detail: report.attendanceDetail)
            statCard(label: "Bài kiểm tra",
                     value: "\(report.gradedTestCount)/\(report.snapshot.tests.count) bài",
                     detail: "đã có điểm")
        }
    }

    private func statCard(label: String, value: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                .foregroundStyle(AppColors.muted)
            Text(value)
                .appText(AppTextStyle(size: 18, weight: .bold, lineHeight: 23.4))
                .foregroundStyle(AppColors.text)
            if !detail.isEmpty {
                Text(detail)
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                    .foregroundStyle(AppColors.muted)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: 12))
    }

    private func commentEditor(_ report: I4MonthlyReport) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Nhận xét chung của tháng")
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(AppColors.text)
            if data.canWriteCommentsReports {
                TextEditor(text: commentBinding(report))
                    .font(.system(size: 15))
                    .foregroundStyle(AppColors.text)
                    .scrollContentBackground(.hidden)
                    .padding(10)
                    .frame(minHeight: 72)
                    .background(AppColors.background, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(alignment: .topLeading) {
                        if commentValue(report).isEmpty {
                            Text(report.suggestion ?? "Nhập nhận xét chung cho phụ huynh của em này.")
                                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                                .foregroundStyle(AppColors.muted)
                                .padding(.horizontal, 15)
                                .padding(.vertical, 18)
                                .allowsHitTesting(false)
                        }
                    }
                if let suggestion = report.suggestion {
                    AppButton(title: "Dùng gợi ý làm bản nháp", variant: .secondary) {
                        commentDraft = CommentDraft(key: draftKey(report), value: suggestion)
                        saveNow()
                    }
                }
            } else {
                Text(commentValue(report).isEmpty ? "Chưa có nhận xét chung." : commentValue(report))
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppColors.background, in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func draftKey(_ report: I4MonthlyReport) -> String { "\(month):\(report.student.id)" }

    private func commentValue(_ report: I4MonthlyReport) -> String {
        if let commentDraft, commentDraft.key == draftKey(report) { return commentDraft.value }
        return data.report(studentID: report.student.id, month: month)?.generalComment ?? ""
    }

    private func commentBinding(_ report: I4MonthlyReport) -> Binding<String> {
        Binding(
            get: { commentValue(report) },
            set: { value in
                commentDraft = CommentDraft(key: draftKey(report), value: value)
                message = nil
                error = nil
                scheduleSave(report)
            }
        )
    }

    private func scheduleSave(_ report: I4MonthlyReport) {
        saveTask?.cancel()
        let key = draftKey(report)
        saveTask = Task {
            try? await Task.sleep(for: .milliseconds(700))
            guard !Task.isCancelled else { return }
            await persistComment(report, key: key)
        }
    }

    private func saveNow() {
        saveTask?.cancel()
        guard let report = selected else { return }
        let key = draftKey(report)
        Task { await persistComment(report, key: key) }
    }

    private func persistComment(_ report: I4MonthlyReport, key: String) async {
        guard data.canWriteCommentsReports, let draft = commentDraft, draft.key == key else { return }
        let existing = data.report(studentID: report.student.id, month: month)?.generalComment ?? ""
        guard draft.value.trimmingCharacters(in: .whitespacesAndNewlines) != existing else { return }
        if let failure = await data.saveReportComment(studentID: report.student.id, month: month,
                                                       comment: draft.value) {
            error = failure
        } else {
            message = "Đã lưu nhận xét chung."
            error = nil
        }
    }

    private func select(_ report: I4MonthlyReport) {
        let key = draftKey(report)
        if let draft = commentDraft, draft.key != key {
            saveNow()
        }
        studentID = report.student.id
    }

    private var publishAllButton: some View {
        AppButton(title: ReportRules.publishAllLabel(summary.publishable), size: .large) {
            publishAll()
        }
        .disabled(publishing || summary.publishable == 0)
    }

    private func publishAll() {
        let waiting = zip(rows, slots).filter { $0.1.publishable }.map(\.0)
        guard !waiting.isEmpty else { return }
        publishing = true
        Task {
            var published = 0
            for report in waiting {
                switch await data.publish(student: report.student, month: month) {
                case .published, .publishedWithoutPDF: published += 1
                case .failed: break
                }
            }
            publishing = false
            if published > 0 {
                message = "Đã phát hành \(published) báo cáo."
                error = nil
            } else {
                error = "Không thể phát hành báo cáo. Kiểm tra kết nối rồi thử lại."
            }
        }
    }

    // MARK: - Preview (ReportPreview.tsx)

    private func preview(_ report: I4MonthlyReport) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            previewHeader(report)
            previewFacts(report)
            starsBlock(report)
            homeworkBlock(report)
            testsBlock(report)
            commentBlock(report)
            previewActions(report)
        }
    }

    private func previewHeader(_ report: I4MonthlyReport) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Button { previewOpen = false } label: {
                Image(systemName: "chevron.backward")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppColors.text)
                    .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                    .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Quay lại danh sách báo cáo")
            VStack(alignment: .leading, spacing: 2) {
                Text(I4Format.monthTitle(report.month))
                    .appText(AppTextStyle(size: 22, weight: .bold, lineHeight: 27.5, tracking: -0.22))
                    .foregroundStyle(AppColors.text)
                Text("Xem trước · \(report.student.name) · \(klass?.name ?? "Lớp học")")
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 19.6))
                    .foregroundStyle(AppColors.muted)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func previewFacts(_ report: I4MonthlyReport) -> some View {
        facts(report)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func starsBlock(_ report: I4MonthlyReport) -> some View {
        let stars = report.snapshot.stars
        let maxCount = max(1, stars.three, stars.two, stars.one)
        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("Nhận xét theo sao")
                    .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                    .foregroundStyle(AppColors.text)
                Spacer(minLength: 0)
                Text("\(report.ticketCount) buổi có phiếu")
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                    .foregroundStyle(AppColors.muted)
            }
            Text("Tính trên các phiếu đã gửi.")
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            if report.ticketCount == 0 {
                Text("Chưa có phiếu nào được gửi trong tháng này.")
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            } else {
                starRow(3, count: stars.three, maxCount: maxCount)
                starRow(2, count: stars.two, maxCount: maxCount)
                starRow(1, count: stars.one, maxCount: maxCount)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func starRow(_ level: Int, count: Int, maxCount: Int) -> some View {
        HStack(spacing: 12) {
            Text(String(repeating: "★", count: level))
                .font(.system(size: 20))
                .foregroundStyle(I4Style.starBar)
                .lineLimit(1)
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppColors.divider)
                    Capsule().fill(I4Style.starBar)
                        .frame(width: geometry.size.width * CGFloat(count) / CGFloat(maxCount))
                }
            }
            .frame(height: 10)
            Text("\(count) buổi")
                .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24))
                .foregroundStyle(AppColors.text)
                .frame(minWidth: 60, alignment: .trailing)
        }
        .frame(minHeight: 32)
    }

    private func homeworkBlock(_ report: I4MonthlyReport) -> some View {
        let items = report.snapshot.homework
        return VStack(alignment: .leading, spacing: 8) {
            Text("Bài tập về nhà")
                .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                .foregroundStyle(AppColors.text)
            Text("Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành")
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            if items.isEmpty {
                Text("Chưa có kết quả bài tập nào được gửi trong tháng này.")
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            } else {
                homeworkHeader
                ForEach(items, id: \.kind) { item in
                    homeworkRow(item)
                }
            }
            Text("Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.")
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var homeworkHeader: some View {
        HStack(spacing: 8) {
            Text("Phần")
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("Tốt").frame(width: 46, alignment: .trailing)
            Text("Hoàn thành").frame(width: 82, alignment: .trailing)
            Text("Chưa").frame(width: 46, alignment: .trailing)
        }
        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
        .foregroundStyle(AppColors.muted)
        .padding(.bottom, 4)
    }

    private func homeworkRow(_ item: HomeworkSummary) -> some View {
        HStack(spacing: 8) {
            Text(item.kind.label)
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("\(item.excellent)")
                .foregroundStyle(AppColors.success)
                .frame(width: 46, alignment: .trailing)
            Text("\(item.done)")
                .foregroundStyle(AppColors.primary)
                .frame(width: 82, alignment: .trailing)
            Text("\(item.notDone)")
                .foregroundStyle(AppColors.error)
                .frame(width: 46, alignment: .trailing)
        }
        .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { AppColors.divider.frame(height: 1) }
    }

    private func testsBlock(_ report: I4MonthlyReport) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Điểm từng bài")
                .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                .foregroundStyle(AppColors.text)
            if report.snapshot.tests.isEmpty {
                Text("Không có bài kiểm tra trong tháng này.")
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            } else {
                ForEach(report.snapshot.tests, id: \.testId) { test in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(test.name)
                                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                                .foregroundStyle(AppColors.text)
                            Text(I4Format.date(test.date))
                                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                                .foregroundStyle(AppColors.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Text(test.value.map { "\(I4Format.score($0))/\(test.max)" } ?? "Chưa có điểm")
                            .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                            .foregroundStyle(AppColors.text)
                    }
                    .frame(minHeight: 44)
                    .padding(.vertical, 5)
                    .overlay(alignment: .bottom) { AppColors.divider.frame(height: 1) }
                }
            }
            Text("Bài chưa có điểm cần chấm trước khi phát hành.")
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func commentBlock(_ report: I4MonthlyReport) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Nhận xét chung")
                .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                .foregroundStyle(AppColors.text)
            if commentValue(report).isEmpty {
                Text("Chưa có nhận xét chung.")
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            } else {
                Text(commentValue(report))
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func previewActions(_ report: I4MonthlyReport) -> some View {
        let record = data.report(studentID: report.student.id, month: month)
        let slot = ReportRules.slot(report, record: record)
        let published = record?.status == .published
        return VStack(spacing: 8) {
            if data.canWriteCommentsReports {
                AppButton(title: published ? "Phát hành lại" : "Phát hành", size: .large) {
                    publish(report)
                }
                .disabled(!report.ready || !slot.publishable || publishing)
            }
            Button { printReport(report) } label: {
                Text("In báo cáo")
                    .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity, minHeight: AppMetrics.buttonHeightLarge)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
            }
            .buttonStyle(.plain)
        }
    }

    private func publish(_ report: I4MonthlyReport) {
        publishing = true
        Task {
            let outcome = await data.publish(student: report.student, month: month)
            publishing = false
            switch outcome {
            case .published:
                message = "Đã phát hành báo cáo."
                error = nil
            case .publishedWithoutPDF:
                message = "Đã phát hành báo cáo nhưng chưa tải được PDF lên máy chủ."
                error = nil
            case .failed(let failure):
                error = failure
            }
        }
    }

    private func printReport(_ report: I4MonthlyReport) {
        let pdf = I4PDFRenderer.render(snapshot: report.snapshot, studentName: report.student.name,
                                       className: klass?.name ?? "")
        I4PrintPresenter.shared.present(pdf: pdf)
    }
}

struct CommentDraft {
    let key: String
    let value: String
}

/// Presents the system print dialog with the locally rendered report PDF.
@MainActor
final class I4PrintPresenter {
    static let shared = I4PrintPresenter()
    private var controller: UIPrintInteractionController?

    func present(pdf: Data) {
        guard UIPrintInteractionController.isPrintingAvailable else { return }
        let controller = UIPrintInteractionController.shared
        let info = UIPrintInfo(dictionary: nil)
        info.jobName = "Bao cao thang"
        info.outputType = .general
        controller.printInfo = info
        controller.printingItem = pdf
        self.controller = controller
        controller.present(animated: true, completionHandler: nil)
    }
}

/// The monthly report PDF: the same content as the preview, rendered on device with UIKit.
enum I4PDFRenderer {
    static func render(snapshot: ReportSnapshot, studentName: String, className: String = "") -> Data {
        let page = CGRect(x: 0, y: 0, width: 595, height: 842)
        let renderer = UIGraphicsPDFRenderer(bounds: page)
        return renderer.pdfData { context in
            context.beginPage()
            var cursor = PDFCursor(top: 48, context: context, page: page)
            cursor.title("Báo cáo tháng \(Int(snapshot.month.dropFirst(5)) ?? 0)")
            cursor.text(className.isEmpty ? studentName : "\(studentName) · \(className)", size: 12, muted: true)
            cursor.gap(8)

            let attendance = snapshot.attendance
            cursor.heading("Chuyên cần")
            cursor.text("\(attendance.present + attendance.late)/\(attendance.heldSessions) buổi · \(attendance.late) muộn · \(attendance.excused) có phép · \(attendance.absent) vắng")

            let stars = snapshot.stars
            cursor.heading("Nhận xét theo sao")
            cursor.text("★★★ \(stars.three) buổi · ★★ \(stars.two) buổi · ★ \(stars.one) buổi (tính trên phiếu đã gửi)")

            cursor.heading("Bài tập về nhà")
            if snapshot.homework.isEmpty {
                cursor.text("Chưa có kết quả bài tập nào được gửi trong tháng này.", muted: true)
            } else {
                cursor.text("Phần · Tốt · Hoàn thành · Chưa", size: 11, muted: true)
                for item in snapshot.homework {
                    cursor.text("\(item.kind.label) · \(item.excellent) · \(item.done) · \(item.notDone)")
                }
                cursor.text("Chỉ tính kết quả đã gửi, không quy ra điểm.", size: 10, muted: true)
            }

            cursor.heading("Điểm từng bài")
            if snapshot.tests.isEmpty {
                cursor.text("Không có bài kiểm tra trong tháng này.", muted: true)
            } else {
                for test in snapshot.tests {
                    let value = test.value.map { "\(I4Format.score($0))/\(test.max)" } ?? "Chưa có điểm"
                    cursor.text("\(test.name) · \(I4Format.date(test.date)): \(value)")
                }
            }

            cursor.heading("Nhận xét chung")
            cursor.text(snapshot.generalComment.isEmpty ? "Chưa có nhận xét chung." : snapshot.generalComment)
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
