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
    @State private var shareItem: I4ReportPDFShareItem?
    @State private var temporaryPDFURL: URL?

    init(classID: String, data: I4FeatureStore = I4FeatureStore()) {
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
                AppEmptyState(title: String(localized: "feature.reports.ban.khong.co.quyen.xem.bao.cao")) {
                    Text(String(localized: "feature.reports.lien.he.admin.neu.ban.can.quyen.truy.cap")).appText(AppText.body)
                }
            } else if previewOpen, let selected {
                preview(selected)
            } else {
                monthBar
                summaryLine
                notices
                if rows.isEmpty {
                    AppEmptyState(title: String(localized: "feature.reports.chua.co.du.lieu.bao.cao")) {
                        Text(String(localized: "feature.reports.chon.thang.co.buoi.hoc.hoac.bai.kiem.tra.e.xem.b"))
                            .appText(AppText.body)
                    }
                } else {
                    studentList
                    if data.canWriteCommentsReports {
                        publishAllButton
                        Text(String(localized: "feature.reports.phu.huynh.chi.thay.bao.cao.sau.khi.ban.phat.hanh"))
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
        .sheet(item: $shareItem, onDismiss: {
            I4ReportPDFFile.remove(temporaryPDFURL)
            temporaryPDFURL = nil
        }) { item in
            I4ReportPDFShareSheet(url: item.url)
        }
    }

    private func latestMonth() -> String? {
        let dates = sessions.map(\.date) + tests.map(\.date)
        return dates.sorted().last.map { String($0.prefix(7)) }
    }

    private var monthBar: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(String(localized: "feature.reports.chon.thang"))
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
            .accessibilityLabel(String(localized: "feature.reports.chon.thang.bao.cao"))
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
            Text(String(localized: "feature.reports.san.sang.4539f330"))
            Text("\(summary.missing)")
                .foregroundStyle(AppColors.warning)
            Text(String(localized: "feature.reports.thieu.du.lieu.d64d166d"))
            Text("\(summary.published)")
                .foregroundStyle(AppColors.text)
            Text(String(localized: "feature.reports.a.phat.hanh"))
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
                AppButton(title: String(localized: "feature.reports.xem.truoc"), variant: .secondary, size: .large) {
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
            statCard(label: String(localized: "feature.reports.chuyen.can"),
                     value: String.localizedStringWithFormat(String(localized: "feature.reports.buoi"), String(describing: (report.attendanceCount)), String(describing: (report.snapshot.attendance.heldSessions))),
                     detail: report.attendanceDetail)
            statCard(label: String(localized: "feature.reports.bai.kiem.tra"),
                     value: String.localizedStringWithFormat(String(localized: "feature.reports.bai"), String(describing: (report.gradedTestCount)), String(describing: (report.snapshot.tests.count))),
                     detail: String(localized: "feature.reports.a.co.iem"))
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
            Text(String(localized: "feature.reports.nhan.xet.chung.cua.thang"))
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
                            Text(report.suggestion ?? String(localized: "feature.reports.nhap.nhan.xet.chung.cho.phu.huynh.cua.em.nay"))
                                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                                .foregroundStyle(AppColors.muted)
                                .padding(.horizontal, 15)
                                .padding(.vertical, 18)
                                .allowsHitTesting(false)
                        }
                    }
                if let suggestion = report.suggestion {
                    AppButton(title: String(localized: "feature.reports.dung.goi.y.lam.ban.nhap"), variant: .secondary) {
                        commentDraft = CommentDraft(key: draftKey(report), value: suggestion)
                        saveNow()
                    }
                }
            } else {
                Text(commentValue(report).isEmpty ? String(localized: "feature.reports.chua.co.nhan.xet.chung") : commentValue(report))
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
            message = String(localized: "feature.reports.a.luu.nhan.xet.chung")
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
                  case .published: published += 1
                case .failed: break
                }
            }
            publishing = false
            if published > 0 {
                message = String.localizedStringWithFormat(String(localized: "feature.reports.a.phat.hanh.bao.cao.b1c96543"), String(describing: (published)))
                error = nil
            } else {
                error = String(localized: "feature.reports.khong.the.phat.hanh.bao.cao.kiem.tra.ket.noi.roi")
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
            .accessibilityLabel(String(localized: "feature.reports.quay.lai.danh.sach.bao.cao"))
            VStack(alignment: .leading, spacing: 2) {
                Text(I4Format.monthTitle(report.month))
                    .appText(AppTextStyle(size: 22, weight: .bold, lineHeight: 27.5, tracking: -0.22))
                    .foregroundStyle(AppColors.text)
                Text(String.localizedStringWithFormat(String(localized: "feature.reports.xem.truoc.d5092a86"), String(describing: (report.student.name)), String(describing: (klass?.name ?? String(localized: "feature.reports.class")))))
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
                Text(String(localized: "feature.reports.nhan.xet.theo.sao"))
                    .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                    .foregroundStyle(AppColors.text)
                Spacer(minLength: 0)
                Text(String.localizedStringWithFormat(String(localized: "feature.reports.buoi.co.phieu"), String(describing: (report.ticketCount))))
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                    .foregroundStyle(AppColors.muted)
            }
            Text(String(localized: "feature.reports.tinh.tren.cac.phieu.a.gui"))
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            if report.ticketCount == 0 {
                Text(String(localized: "feature.reports.chua.co.phieu.nao.uoc.gui.trong.thang.nay"))
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
            Text(String.localizedStringWithFormat(String(localized: "feature.reports.buoi.d5e8f7ce"), String(describing: (count))))
                .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24))
                .foregroundStyle(AppColors.text)
                .frame(minWidth: 60, alignment: .trailing)
        }
        .frame(minHeight: 32)
    }

    private func homeworkBlock(_ report: I4MonthlyReport) -> some View {
        let items = report.snapshot.homework
        return VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "feature.reports.bai.tap.ve.nha"))
                .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                .foregroundStyle(AppColors.text)
            Text(String(localized: "feature.reports.tot.hoan.thanh.tot.chua.chua.hoan.thanh"))
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            if items.isEmpty {
                Text(String(localized: "feature.reports.chua.co.ket.qua.bai.tap.nao.uoc.gui.trong.thang"))
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            } else {
                homeworkHeader
                ForEach(items, id: \.kind) { item in
                    homeworkRow(item)
                }
            }
            Text(String(localized: "feature.reports.chi.tinh.ket.qua.a.gui.khong.tinh.phan.chua.cham"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var homeworkHeader: some View {
        HStack(spacing: 8) {
            Text(String(localized: "feature.reports.phan"))
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(String(localized: "feature.reports.tot")).frame(width: 46, alignment: .trailing)
            Text(String(localized: "feature.reports.hoan.thanh")).frame(width: 82, alignment: .trailing)
            Text(String(localized: "feature.reports.chua")).frame(width: 46, alignment: .trailing)
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
            Text(String(localized: "feature.reports.iem.tung.bai"))
                .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                .foregroundStyle(AppColors.text)
            if report.snapshot.tests.isEmpty {
                Text(String(localized: "feature.reports.khong.co.bai.kiem.tra.trong.thang.nay"))
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
                    Text(test.value.map { "\(I4Format.score($0))/\(test.max)" } ?? String(localized: "feature.reports.noScore"))
                            .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                            .foregroundStyle(AppColors.text)
                    }
                    .frame(minHeight: 44)
                    .padding(.vertical, 5)
                    .overlay(alignment: .bottom) { AppColors.divider.frame(height: 1) }
                }
            }
            Text(String(localized: "feature.reports.bai.chua.co.iem.can.cham.truoc.khi.phat.hanh"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func commentBlock(_ report: I4MonthlyReport) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "feature.reports.nhan.xet.chung"))
                .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 26))
                .foregroundStyle(AppColors.text)
            if commentValue(report).isEmpty {
                Text(String(localized: "feature.reports.chua.co.nhan.xet.chung"))
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
                AppButton(title: published ? String(localized: "feature.reports.phat.hanh.lai") : String(localized: "feature.reports.phat.hanh"), size: .large) {
                    publish(report)
                }
                .disabled(!report.ready || !slot.publishable || publishing)
            }
            Button { printReport(report) } label: {
                Text(String(localized: "feature.reports.in.bao.cao"))
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
                message = String(localized: "feature.reports.a.phat.hanh.bao.cao")
                error = nil
              case .failed(let failure):
                  error = failure
            }
        }
    }

    private func printReport(_ report: I4MonthlyReport) {
        let pdf = I4PDFRenderer.render(snapshot: report.snapshot, studentName: report.student.name,
                                       className: klass?.name ?? "")
        do {
            let publicationNo = data.report(studentID: report.student.id, month: month)?.publicationCount ?? 0
            let url = try I4ReportPDFFile.write(pdf, month: month, publicationNo: publicationNo)
            temporaryPDFURL = url
            shareItem = I4ReportPDFShareItem(url: url)
            error = nil
        } catch _ {
            error = String(localized: "feature.reports.khong.the.tao.pdf")
        }
    }
}

struct CommentDraft {
    let key: String
    let value: String
}

/// The monthly report PDF: the same content as the preview, rendered on device with UIKit.
enum I4PDFRenderer {
    static func render(snapshot: ReportSnapshot, studentName: String, className: String = "") -> Data {
        let page = CGRect(x: 0, y: 0, width: 595, height: 842)
        let renderer = UIGraphicsPDFRenderer(bounds: page)
        return renderer.pdfData { context in
            context.beginPage()
            var cursor = PDFCursor(top: 48, context: context, page: page)
            cursor.title(String.localizedStringWithFormat(String(localized: "feature.reports.bao.cao.thang"), String(describing: (Int(snapshot.month.dropFirst(5)) ?? 0))))
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
                cursor.text(String(localized: "feature.reports.chua.co.ket.qua.bai.tap.nao.uoc.gui.trong.thang"), muted: true)
            } else {
                cursor.text(String(localized: "feature.reports.phan.tot.hoan.thanh.chua"), size: 11, muted: true)
                for item in snapshot.homework {
                    cursor.text("\(item.kind.label) · \(item.excellent) · \(item.done) · \(item.notDone)")
                }
                cursor.text(String(localized: "feature.reports.chi.tinh.ket.qua.a.gui.khong.quy.ra.iem"), size: 10, muted: true)
            }

            cursor.heading(String(localized: "feature.reports.iem.tung.bai"))
            if snapshot.tests.isEmpty {
                cursor.text(String(localized: "feature.reports.khong.co.bai.kiem.tra.trong.thang.nay"), muted: true)
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
