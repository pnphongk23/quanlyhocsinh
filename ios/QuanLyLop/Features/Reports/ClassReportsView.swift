import SwiftUI

/// Tab "Báo cáo" of a class: the report batches (each one a session range), newest first, and the
/// button that adds one. There is no month or period picker.
struct ClassReportsView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var adding = false
    @State private var openBatchID: String?
    @State private var error: String?
    @State private var loading = false

    /// `seedError` lets the debug screenshot harness open the screen already in its error state.
    init(classID: String, data: I4FeatureStore = I4FeatureStore(), seedError: String? = nil) {
        self.classID = classID
        self.data = data
        _error = State(initialValue: seedError)
    }

    private var sessions: [ClassSession] { data.reportSessions(in: classID) }
    private var batches: [ReportBatch] { data.batches(in: classID) }
    private var hasHeldSession: Bool { ReportRangeRules.defaultRange(sessions, classID: classID) != nil }

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
            description: hasHeldSession
                ? String(localized: "reports.list.empty.hint", table: "Reports")
                : String(localized: "reports.list.empty.noHeld", table: "Reports"))
    }

    private func batchRow(_ batch: ReportBatch) -> some View {
        let range = ReportRangeRules.resolve(batch, sessions: sessions)
        let counts = ReportRangeRules.counts(data.reports(batchID: batch.id))
        return Button { openBatchID = batch.id } label: {
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
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, TeacherMetrics.contentGap)
            .frame(maxWidth: .infinity, minHeight: TeacherMetrics.reportRowMinHeight)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("reports.batch.row")
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
                if let reason = data.sessionListFailure[classID], !data.hasFullSessions(classID) {
                    Text(reason)
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                        .foregroundStyle(AppColors.muted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityIdentifier("reports.add.blocked")
                }
                AppButton(title: String(localized: "reports.list.add", table: "Reports"), size: .large) {
                    adding = true
                }
                .disabled(!hasHeldSession || !data.hasFullSessions(classID))
                .accessibilityIdentifier("reports.add")
            }
        }
    }
}

/// Picks the first and last session of a new batch. Cancelled sessions have no number and are not offered.
struct AddReportBatchSheet: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    let created: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var fromID = ""
    @State private var toID = ""
    @State private var requestID = UUID().uuidString.lowercased()
    @State private var controller = AppSaveController()

    private var choices: [ReportSessionChoice] {
        ReportRangeRules.choices(data.reportSessions(in: classID), classID: classID)
    }

    private var problem: ReportRangeProblem? {
        guard !fromID.isEmpty, !toID.isEmpty else { return .notInClass }
        return ReportRangeRules.problem(data.reportSessions(in: classID), classID: classID, from: fromID, to: toID)
    }

    var body: some View {
        AppSheet(title: String(localized: "reports.add.title", table: "Reports")) {
            VStack(alignment: .leading, spacing: AppMetrics.cardPaddingHorizontal) {
                Text(String(localized: "reports.add.hint", table: "Reports"))
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
                picker(String(localized: "reports.add.from", table: "Reports"), selection: $fromID, id: "reports.add.from")
                picker(String(localized: "reports.add.to", table: "Reports"), selection: $toID, id: "reports.add.to")
                if let problem, !fromID.isEmpty, !toID.isEmpty {
                    Text(problem.message).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
                if let message = (controller.error as? I4SaveFailure)?.message {
                    TeacherErrorBanner(message: message)
                }
            }
            .padding(.bottom, AppMetrics.cardPaddingHorizontal)
        } footer: {
            AppSaveButton(title: String(localized: "reports.add.create", table: "Reports"), controller: controller,
                          isEnabled: problem == nil, onSuccess: {}) {
                let result = await data.createBatch(classID: classID, fromSessionID: fromID, toSessionID: toID,
                                                    requestID: requestID)
                switch result {
                case .success(let batchID): created(batchID)
                case .failure(let failure): throw I4SaveFailure(message: failure.message)
                }
            }
            .accessibilityIdentifier("reports.add.create")
        } close: { dismiss() }
        .onAppear(perform: applyDefault)
        // A new range needs a new id: the same id with another range is refused by the server.
        .onChange(of: fromID) { _, _ in requestID = UUID().uuidString.lowercased() }
        .onChange(of: toID) { _, _ in requestID = UUID().uuidString.lowercased() }
    }

    private func applyDefault() {
        guard fromID.isEmpty, let range = ReportRangeRules.defaultRange(data.reportSessions(in: classID), classID: classID) else { return }
        fromID = range.from.id
        toID = range.to.id
    }

    private func picker(_ title: String, selection: Binding<String>, id: String) -> some View {
        VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
            Text(title).appText(AppText.label).foregroundStyle(AppColors.text)
            Menu {
                Picker(title, selection: selection) {
                    ForEach(choices) { choice in Text(choice.label).tag(choice.id) }
                }
            } label: {
                HStack(spacing: AppMetrics.saveFeedbackGap) {
                    Text(choices.first { $0.id == selection.wrappedValue }?.label ?? "")
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
            .accessibilityIdentifier(id)
        }
    }
}
