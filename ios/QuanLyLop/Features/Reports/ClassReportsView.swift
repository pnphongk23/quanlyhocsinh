import SwiftUI

/// Tab "Báo cáo" of a class: the report batches (each one a month, or an older session range), newest
/// first, and the button that adds one.
struct ClassReportsView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var adding = false
    @State private var openBatchID: String?
    @State private var error: String?
    @State private var loading = false
    @State private var deletion: ReportDeletionTarget?
    @State private var deleting = false

    /// `seedError` lets the debug screenshot harness open the screen already in its error state.
    init(classID: String, data: I4FeatureStore = I4FeatureStore(), seedError: String? = nil) {
        self.classID = classID
        self.data = data
        _error = State(initialValue: seedError)
    }

    private var batches: [ReportBatch] { data.batches(in: classID) }

    var body: some View {
        TeacherScroll { content }
            .background(AppColors.background.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) { addBar }
            .task {
                await data.configure(auth: auth)
                if error == nil { await reload() }
            }
            .sheet(isPresented: $adding) {
                AddReportBatchSheet(classID: classID, data: data) { batchID in
                    adding = false
                    openBatchID = batchID
                }
            }
            .navigationDestination(item: $openBatchID) { batchID in
                ReportBatchDetailView(batchID: batchID, data: data)
            }
            .reportDeletionDialog(target: $deletion, data: data, onFailure: { error = $0 }, onDeleted: { error = nil },
                                  busy: $deleting)
    }

    /// Reads the class's sessions, batches and reports from the server. A failure is kept as `error`,
    /// so a failed load is never shown as an empty list.
    private func reload() async {
        loading = true
        error = nil
        error = await data.loadClassReports(classID: classID)?.message
        loading = false
    }

    @ViewBuilder private var content: some View {
        VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
            if !data.canReadCommentsReports {
                AppEmptyState(title: String(localized: "feature.reports.ban.khong.co.quyen.xem.bao.cao")) {
                    Text(String(localized: "feature.reports.lien.he.admin.neu.ban.can.quyen.truy.cap")).appText(AppText.body)
                }
            } else if !data.isReady {
                HStack { Spacer(); AppSpinner(); Spacer() }.padding(.top, AppMetrics.sectionGap)
            } else {
                if let error, batches.isEmpty {
                    AppErrorState(message: error) { Task { await reload() } }
                } else if loading && batches.isEmpty {
                    HStack { Spacer(); AppSpinner(); Spacer() }.padding(.top, AppMetrics.sectionGap)
                } else if batches.isEmpty {
                    emptyState
                } else {
                    if let error { TeacherErrorBanner(message: error) { Task { await reload() } } }
                    ReportDeleteOfflineNote(data: data)
                    AppSection(title: String(localized: "reports.list.title", table: "Reports")) {
                        VStack(spacing: TeacherMetrics.listGap) {
                            ForEach(batches, id: \.id) { batchRow($0) }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
        .padding(.top, TeacherMetrics.screenPaddingTop)
        .padding(.bottom, TeacherMetrics.contentGap * 2)
    }

    private var emptyState: some View {
        AppEmptyState(
            title: String(localized: "reports.list.empty.title", table: "Reports"),
            description: String(localized: "reports.list.empty.hint", table: "Reports"))
    }

    private func batchRow(_ batch: ReportBatch) -> some View {
        let range = ReportRangeRules.resolve(batch)
        let counts = ReportRangeRules.counts(data.reports(batchID: batch.id))
        return HStack(spacing: 0) {
            Button { openBatchID = batch.id } label: {
                HStack(spacing: TeacherMetrics.contentGap) {
                    VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
                        Text(range.label)
                            .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                            .foregroundStyle(AppColors.text)
                            .multilineTextAlignment(.leading)
                        Text(countsLine(counts))
                            .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                            .foregroundStyle(counts.needsRepublish > 0 ? AppColors.warning : AppColors.muted)
                            .multilineTextAlignment(.leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppColors.muted)
                }
                .padding(.leading, AppMetrics.cardPaddingHorizontal)
                .padding(.trailing, data.canWriteCommentsReports ? TeacherMetrics.listGap : AppMetrics.cardPaddingHorizontal)
                .padding(.vertical, TeacherMetrics.contentGap)
                .frame(maxWidth: .infinity, minHeight: TeacherMetrics.reportRowMinHeight)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("reports.batch.row")
            ReportBatchMenu(batchID: batch.id, data: data, target: $deletion, busy: deleting) {
                Image(systemName: "ellipsis")
                    .font(.system(size: 20, weight: .regular))
                    .foregroundStyle(AppColors.muted)
                    .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                    .contentShape(Rectangle())
            }
            .padding(.trailing, TeacherMetrics.listGap)
        }
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func countsLine(_ counts: ReportBatchCounts) -> String {
        var line = String.localizedStringWithFormat(String(localized: "reports.list.counts", table: "Reports"),
                                                    counts.published, counts.draft)
        if counts.needsRepublish > 0 {
            line += String.localizedStringWithFormat(String(localized: "reports.list.countsRepublish", table: "Reports"),
                                                     counts.needsRepublish)
        }
        return line
    }

    @ViewBuilder private var addBar: some View {
        if data.canReadCommentsReports, data.canWriteCommentsReports, data.isReady {
            TeacherPinnedBar {
                AppButton(title: String(localized: "reports.list.add", table: "Reports"), size: .large) {
                    adding = true
                }
                .accessibilityIdentifier("reports.add")
            }
        }
    }
}

/// Picks the month of a new batch; the current month is chosen first. Several batches of one month are allowed.
struct AddReportBatchSheet: View {
    static let monthCount = 12

    let classID: String
    @ObservedObject var data: I4FeatureStore
    let created: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var month = ReportRangeRules.monthKey(.now)
    @State private var requestID = UUID().uuidString.lowercased()
    @State private var controller = AppSaveController()

    /// The current month and the ones before it, newest first.
    static func monthChoices(now: Date = .now, calendar: Calendar = .current) -> [String] {
        (0..<monthCount).compactMap { offset in
            calendar.date(byAdding: .month, value: -offset, to: now).map { ReportRangeRules.monthKey($0, calendar: calendar) }
        }
    }

    var body: some View {
        AppSheet(title: String(localized: "reports.add.title", table: "Reports")) {
            VStack(alignment: .leading, spacing: AppMetrics.cardPaddingHorizontal) {
                Text(String(localized: "reports.add.hint", table: "Reports"))
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
                monthPicker
                if let message = (controller.error as? I4SaveFailure)?.message {
                    TeacherErrorBanner(message: message)
                }
            }
            .padding(.bottom, AppMetrics.cardPaddingHorizontal)
        } footer: {
            AppSaveButton(title: String(localized: "reports.add.create", table: "Reports"), controller: controller,
                          identifier: "reports.add.create", onSuccess: {}) {
                let result = await data.createBatch(classID: classID, month: month, requestID: requestID)
                switch result {
                case .success(let batchID): created(batchID)
                case .failure(let failure): throw I4SaveFailure(message: failure.message)
                }
            }
        } close: { dismiss() }
        // Another month needs another id: the same id with another month is refused by the server.
        .onChange(of: month) { _, _ in requestID = UUID().uuidString.lowercased() }
    }

    private var monthPicker: some View {
        VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
            Text(String(localized: "reports.add.month", table: "Reports")).appText(AppText.label).foregroundStyle(AppColors.text)
            Menu {
                Picker(String(localized: "reports.add.month", table: "Reports"), selection: $month) {
                    ForEach(Self.monthChoices(), id: \.self) { choice in
                        Text(ReportRangeRules.monthTitle(choice) ?? choice).tag(choice)
                    }
                }
            } label: {
                HStack(spacing: AppMetrics.saveFeedbackGap) {
                    Text(ReportRangeRules.monthTitle(month) ?? month)
                        .appText(AppText.body).foregroundStyle(AppColors.text)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(AppColors.muted)
                }
                .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.inputHeight)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.control)
                    .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
            }
            .accessibilityIdentifier("reports.add.month")
        }
    }
}
