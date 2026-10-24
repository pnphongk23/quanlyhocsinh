import SwiftUI

/// One batch: the students with their status, the general comment of each, the full-screen preview
/// and publishing (one student or the whole class). Publishing needs the network.
struct ReportBatchDetailView: View {
    let batchID: String
    @ObservedObject var data: I4FeatureStore
    @State private var openReportID: String?
    @State private var drafts: [String: String] = [:]
    @State private var preview: ReportPreviewTarget?
    @State private var message: String?
    @State private var error: String?
    @State private var loadError: String?
    @State private var skippedCount = 0
    @State private var publishing = false
    @State private var commentController = AppSaveController()

    private var batch: ReportBatch? { data.batches.first { $0.id == batchID } }
    private var classID: String { batch?.classId ?? "" }
    private var klass: Classroom? { data.classes.first { $0.id == classID } }

    private var range: ResolvedReportRange? {
        batch.map { ReportRangeRules.resolve($0, sessions: data.reportSessions(in: $0.classId)) }
    }

    private struct Row: Identifiable {
        let record: StudentReport
        let content: StudentReportContent
        let slot: ReportSlot
        var id: String { record.id }
    }

    private var rows: [Row] {
        guard let range else { return [] }
        let sessions = data.reportSessions(in: classID)
        let tests = data.tests(in: classID)
        return data.reports(batchID: batchID).compactMap { record in
            guard let student = data.students.first(where: { $0.id == record.studentId }) else { return nil }
            if let snapshot = data.previews[record.id] {
                let content = ReportRules.content(student: student, serverSnapshot: snapshot)
                return Row(record: record, content: content, slot: ReportRules.slot(content, record: record))
            }
            guard let content = ReportRules.build(
                    student: student, range: range, batchID: batchID, sessions: sessions,
                    attendance: data.attendance, tests: tests, scores: data.scores, slips: data.slips,
                    sections: data.sections, grades: data.grades, generalComment: record.generalComment)
            else { return nil }
            return Row(record: record, content: content, slot: ReportRules.slot(content, record: record))
        }
        .sorted { $0.content.student.name.localizedCaseInsensitiveCompare($1.content.student.name) == .orderedAscending }
    }

    var body: some View {
        let rows = rows
        let summary = ReportRules.summary(rows.map(\.slot))
        TeacherScroll {
            VStack(alignment: .leading, spacing: 12) {
                if !data.canReadCommentsReports {
                    AppEmptyState(title: String(localized: "feature.reports.ban.khong.co.quyen.xem.bao.cao"))
                } else if batch == nil {
                    AppEmptyState(title: String(localized: "reports.detail.missing", table: "Reports"))
                } else if rows.isEmpty {
                    AppEmptyState(title: String(localized: "reports.detail.empty.title", table: "Reports"),
                                  description: String(localized: "reports.detail.empty.hint", table: "Reports"))
                } else {
                    summaryLine(summary)
                    notices
                    VStack(spacing: 8) { ForEach(rows) { studentRow($0) } }
                    if data.canWriteCommentsReports {
                        Text(String(localized: "feature.reports.phu.huynh.chi.thay.bao.cao.sau.khi.ban.phat.hanh"))
                            .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                            .foregroundStyle(AppColors.muted)
                    }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, TeacherMetrics.contentGap * 2)
        }
        .background(AppColors.background.ignoresSafeArea())
        .navigationTitle(range?.label ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) { publishBar(summary) }
        .task { loadError = await data.loadBatchDetail(batchID: batchID)?.message }
        .fullScreenCover(item: $preview) { target in
            ReportPreviewScreen(target: target, data: data, className: klass?.name ?? "") { number in
                message = String(localized: "feature.reports.a.phat.hanh.bao.cao")
                error = nil
                _ = number
            }
        }
    }

    private func summaryLine(_ summary: (total: Int, ready: Int, missing: Int, published: Int, publishable: Int)) -> some View {
        HStack(spacing: 4) {
            Text("\(summary.ready)/\(summary.total)").foregroundStyle(AppColors.text)
            Text(String(localized: "feature.reports.san.sang.4539f330"))
            Text("\(summary.missing)").foregroundStyle(AppColors.warning)
            Text(String(localized: "feature.reports.thieu.du.lieu.d64d166d"))
            Text("\(summary.published)").foregroundStyle(AppColors.text)
            Text(String(localized: "feature.reports.a.phat.hanh"))
        }
        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
        .foregroundStyle(AppColors.muted)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private var notices: some View {
        if let message {
            Text(message).appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5)).foregroundStyle(AppColors.success)
        }
        if skippedCount > 0 {
            I4Banner(text: String.localizedStringWithFormat(String(localized: "reports.detail.skipped", table: "Reports"), skippedCount),
                     tone: .warning, systemImage: "exclamationmark.triangle")
        }
        if let loadError { TeacherErrorBanner(message: loadError) }
        if let error { TeacherErrorBanner(message: error) }
    }

    // MARK: Rows

    private func studentRow(_ row: Row) -> some View {
        let active = row.id == openReportID
        return VStack(alignment: .leading, spacing: 8) {
            Button { openReportID = active ? nil : row.id } label: {
                HStack(alignment: .top, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(row.content.student.name)
                            .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 21.6))
                            .foregroundStyle(AppColors.text).multilineTextAlignment(.leading)
                        if !row.slot.detail.isEmpty {
                            Text(row.slot.detail)
                                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                                .foregroundStyle(AppColors.muted).multilineTextAlignment(.leading)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    AppPill(title: row.slot.label, tone: row.slot.tone)
                }
                .frame(minHeight: 40)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("reports.student.row")
            if active {
                AppColors.divider.frame(height: 1).padding(.top, 8)
                HStack(spacing: 8) {
                    ReportFactCard(label: String(localized: "feature.reports.chuyen.can"),
                                   value: String.localizedStringWithFormat(String(localized: "feature.reports.buoi"), String(describing: row.content.attendanceCount), String(describing: row.content.snapshot.attendance.heldSessions)),
                                   detail: row.content.attendanceDetail)
                    ReportFactCard(label: String(localized: "feature.reports.bai.kiem.tra"),
                                   value: String.localizedStringWithFormat(String(localized: "feature.reports.bai"), String(describing: row.content.gradedTestCount), String(describing: row.content.snapshot.tests.count)),
                                   detail: String(localized: "feature.reports.a.co.iem"))
                }
                commentEditor(row)
                AppButton(title: String(localized: "feature.reports.xem.truoc"), variant: .secondary, size: .large) {
                    preview = ReportPreviewTarget(reportID: row.id, studentName: row.content.student.name)
                }
                .accessibilityIdentifier("reports.preview")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(active ? AppColors.primary : .clear, lineWidth: 2))
    }

    private func commentValue(_ row: Row) -> String { drafts[row.id] ?? row.record.generalComment }

    private func commentEditor(_ row: Row) -> some View {
        let value = commentValue(row)
        let changed = value.trimmingCharacters(in: .whitespacesAndNewlines) != row.record.generalComment
        return VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "feature.reports.nhan.xet.chung"))
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21)).foregroundStyle(AppColors.text)
            if data.canWriteCommentsReports {
                TextEditor(text: Binding(get: { commentValue(row) }, set: { drafts[row.id] = $0 }))
                    .font(.system(size: 15)).foregroundStyle(AppColors.text)
                    .scrollContentBackground(.hidden)
                    .padding(10).frame(minHeight: 72)
                    .background(AppColors.background, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(alignment: .topLeading) {
                        if value.isEmpty {
                            Text(row.content.suggestion ?? String(localized: "feature.reports.nhap.nhan.xet.chung.cho.phu.huynh.cua.em.nay"))
                                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25)).foregroundStyle(AppColors.muted)
                                .padding(.horizontal, 15).padding(.vertical, 18).allowsHitTesting(false)
                        }
                    }
                    .accessibilityIdentifier("reports.comment")
                if let suggestion = row.content.suggestion {
                    AppButton(title: String(localized: "feature.reports.dung.goi.y.lam.ban.nhap"), variant: .secondary) {
                        drafts[row.id] = suggestion
                    }
                }
                if let failure = (commentController.error as? I4SaveFailure)?.message {
                    TeacherErrorBanner(message: failure)
                }
                AppSaveButton(title: String(localized: "reports.detail.comment.save", table: "Reports"),
                              controller: commentController, variant: .secondary, size: .large, isEnabled: changed) {
                    if let failure = await data.saveReportComment(reportID: row.id, comment: value) {
                        throw I4SaveFailure(message: failure)
                    }
                    drafts[row.id] = nil
                }
            } else {
                Text(value.isEmpty ? String(localized: "feature.reports.chua.co.nhan.xet.chung") : value)
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25)).foregroundStyle(AppColors.text)
                    .padding(12).frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppColors.background, in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: Publish the whole class

    @ViewBuilder
    private func publishBar(_ summary: (total: Int, ready: Int, missing: Int, published: Int, publishable: Int)) -> some View {
        if data.canReadCommentsReports, data.canWriteCommentsReports, batch != nil, !rows.isEmpty {
            TeacherPinnedBar {
                AppButton(title: publishing ? String(localized: "reports.detail.publishing", table: "Reports")
                                            : ReportRules.publishAllLabel(summary.publishable), size: .large) {
                    publishAll()
                }
                .disabled(publishing || summary.publishable == 0)
                .accessibilityIdentifier("reports.publishAll")
            }
        }
    }

    private func publishAll() {
        publishing = true
        message = nil
        error = nil
        Task {
            switch await data.publishBatch(batchID: batchID) {
            case .success(let outcome):
                skippedCount = outcome.skipped.count
                message = outcome.published > 0
                    ? String.localizedStringWithFormat(String(localized: "feature.reports.a.phat.hanh.bao.cao.b1c96543"), String(describing: outcome.published))
                    : nil
            case .failure(let failure):
                error = failure.message
            }
            publishing = false
        }
    }
}

struct ReportPreviewTarget: Identifiable, Equatable {
    let reportID: String
    let studentName: String
    var id: String { reportID }
}

/// Full-screen preview of one report as the server would publish it now, with publish and PDF.
struct ReportPreviewScreen: View {
    let target: ReportPreviewTarget
    @ObservedObject var data: I4FeatureStore
    let className: String
    let published: (Int) -> Void
    @Environment(\.dismiss) private var dismiss

    private enum Phase { case loading, loaded(ReportSnapshot), failed(String) }

    @State private var phase: Phase = .loading
    @State private var publishing = false
    @State private var error: String?
    @State private var shareItem: I4ReportPDFShareItem?
    @State private var temporaryPDFURL: URL?

    private var record: StudentReport? { data.report(id: target.reportID) }

    var body: some View {
        NavigationStack {
            Group {
                switch phase {
                case .loading:
                    VStack(spacing: 12) {
                        AppSpinner()
                        Text(String(localized: "reports.preview.loading", table: "Reports"))
                            .appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                case .failed(let message):
                    AppErrorState(message: message) { Task { await load() } }
                        .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                        .frame(maxHeight: .infinity, alignment: .top)
                case .loaded(let snapshot):
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            header(snapshot)
                            if !snapshot.ready { missingNote(snapshot) }
                            ReportContentView(snapshot: snapshot, comment: snapshot.generalComment)
                            if let error { TeacherErrorBanner(message: error) }
                        }
                        .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                        .padding(.vertical, TeacherMetrics.screenPaddingTop)
                    }
                }
            }
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle(String(localized: "reports.preview.title", table: "Reports"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "reports.preview.close", table: "Reports")) { dismiss() }
                        .accessibilityIdentifier("reports.preview.close")
                }
            }
            .safeAreaInset(edge: .bottom) {
                if case .loaded(let snapshot) = phase { actions(snapshot) }
            }
        }
        .task { await load() }
        .sheet(item: $shareItem, onDismiss: {
            I4ReportPDFFile.remove(temporaryPDFURL)
            temporaryPDFURL = nil
        }) { I4ReportPDFShareSheet(url: $0.url) }
    }

    private func header(_ snapshot: ReportSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(snapshot.range.map(ReportRangeRules.label(of:)) ?? "")
                .appText(AppTextStyle(size: 22, weight: .bold, lineHeight: 27.5, tracking: -0.22)).foregroundStyle(AppColors.text)
            Text(String.localizedStringWithFormat(String(localized: "feature.reports.xem.truoc.d5092a86"), target.studentName, className))
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 19.6)).foregroundStyle(AppColors.muted)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func missingNote(_ snapshot: ReportSnapshot) -> some View {
        let reasons = ReportRules.missingReasons(snapshot.missing ?? [])
        let text = reasons.isEmpty
            ? String(localized: "reports.preview.notReady", table: "Reports")
            : String.localizedStringWithFormat(String(localized: "reports.preview.missing", table: "Reports"), reasons.joined(separator: ", "))
        return I4Banner(text: text, tone: .warning, systemImage: "exclamationmark.triangle")
    }

    private func actions(_ snapshot: ReportSnapshot) -> some View {
        let again = record?.status == .published || record?.needsRepublish == true
        let alreadyCurrent = record?.status == .published && record?.needsRepublish == false
        return TeacherPinnedBar {
            if data.canWriteCommentsReports {
                AppButton(title: again ? String(localized: "feature.reports.phat.hanh.lai") : String(localized: "feature.reports.phat.hanh"), size: .large) {
                    publish()
                }
                .disabled(!snapshot.ready || alreadyCurrent || publishing)
                .accessibilityIdentifier("reports.publish")
            }
            AppButton(title: String(localized: "feature.reports.in.bao.cao"), variant: .secondary, size: .large) {
                printReport(snapshot)
            }
        }
    }

    private func load() async {
        phase = .loading
        switch await data.previewReport(reportID: target.reportID) {
        case .success(let snapshot): phase = .loaded(snapshot)
        case .failure(let failure): phase = .failed(failure.message)
        }
    }

    private func publish() {
        publishing = true
        error = nil
        Task {
            switch await data.publishReport(reportID: target.reportID) {
            case .success(let number):
                publishing = false
                published(number)
                dismiss()
            case .failure(let failure):
                publishing = false
                error = failure.message
            }
        }
    }

    private func printReport(_ snapshot: ReportSnapshot) {
        let pdf = I4PDFRenderer.render(snapshot: snapshot, studentName: target.studentName, className: className)
        do {
            let url = try I4ReportPDFFile.write(
                pdf, name: I4ReportPDFFile.fileName(for: snapshot, publicationNo: record?.publicationCount ?? 0))
            temporaryPDFURL = url
            shareItem = I4ReportPDFShareItem(url: url)
            error = nil
        } catch {
            self.error = String(localized: "feature.reports.khong.the.tao.pdf")
        }
    }
}
