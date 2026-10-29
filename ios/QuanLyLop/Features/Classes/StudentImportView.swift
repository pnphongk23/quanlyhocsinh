import SwiftUI
import UniformTypeIdentifiers

/// "Nhập danh sách": paste or pick a `.csv`, check the preview, then create the students one by one. Needs the network.
struct StudentImportSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var data: TeacherFeatureData
    @State private var model: StudentImportModel
    @State private var pickingFile = false
    @State private var editing: Int?
    private let connectivity = ConnectivityMonitor.shared

    init(classID: String, data: TeacherFeatureData) {
        let existing = data.activeStudents(in: classID).map {
            StudentImportRules.Existing(fullName: $0.name, guardianPhone: $0.parentPhone.flatMap(StudentImportRules.normalizedPhone))
        }
        self.init(data: data, model: StudentImportModel(existing: existing) { id, name, phone in
            try await data.addStudent(id: id, to: classID, name: name, parentPhone: phone, refreshing: false)
        })
    }

    init(data: TeacherFeatureData, model: StudentImportModel) {
        self.data = data
        _model = State(initialValue: model)
    }

    private var online: Bool { connectivity.isOnline }

    var body: some View {
        TeacherSheet(title: StudentImportText.title, content: { content }, footer: { footer },
                     detents: [.large], close: close)
            .interactiveDismissDisabled(model.phase == .creating)
            .fileImporter(isPresented: $pickingFile, allowedContentTypes: [.commaSeparatedText, .plainText]) { result in
                load(result)
            }
            .onChange(of: model.phase) { _, phase in
                if phase == .result, model.createdCount > 0 { Task { await data.refresh() } }
            }
    }

    private func close() {
        guard model.phase != .creating else { return }
        model.clear()
        dismiss()
    }

    // MARK: Content

    @ViewBuilder private var content: some View {
        switch model.phase {
        case .input: inputContent
        case .preview: previewContent
        case .creating, .result: resultContent
        }
    }

    private var inputContent: some View {
        VStack(alignment: .leading, spacing: AppSpace.s12) {
            Text(StudentImportText.pasteLabel).appText(AppText.label).foregroundStyle(AppColors.text)
            TextEditor(text: $model.text)
                .appText(AppText.body)
                .foregroundStyle(AppColors.text)
                .scrollContentBackground(.hidden)
                .padding(AppSpace.s12)
                .frame(minHeight: 200)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.control)
                    .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
                .accessibilityIdentifier("import.text")
            Text(StudentImportText.pasteHint).appText(AppText.muted).foregroundStyle(AppColors.muted)
            AppButton(title: StudentImportText.pickFile, systemImage: "doc.text", variant: .secondary) { pickingFile = true }
                .accessibilityIdentifier("import.pickFile")
            if model.fileUnreadable {
                Text(StudentImportText.fileError).appText(AppText.muted).foregroundStyle(AppColors.error)
            }
            if !online {
                Text(StudentImportText.needNetworkHint).appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
        }
    }

    private var previewContent: some View {
        let plan = model.plan
        let skipped = plan.rows.filter { $0.status == .skipExisting || $0.status == .skipDuplicateInPaste }.count
        let fix = plan.rows.filter { $0.status == .needsFix }.count
        return VStack(alignment: .leading, spacing: AppSpace.s12) {
            Text(StudentImportText.summary(add: plan.addCount, skipped: skipped, fix: fix))
                .appText(AppText.label).foregroundStyle(AppColors.text)
            if plan.warnings.contains(.under20) {
                Text(StudentImportText.under20(total: model.totalAfterAdd))
                    .appText(AppText.muted).foregroundStyle(AppState.cardPendingFg)
                    .padding(AppSpace.s12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .appStatusCard(.pending, radius: AppRadius.row)
            }
            if plan.rows.isEmpty {
                Text(StudentImportText.emptyPreview).appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            ForEach(plan.rows) { row in rowCard(row) }
        }
    }

    private func rowCard(_ row: StudentImportRules.Row) -> some View {
        VStack(alignment: .leading, spacing: AppSpace.s8) {
            HStack(alignment: .top, spacing: AppSpace.s12) {
                VStack(alignment: .leading, spacing: AppSpace.s4) {
                    Text(row.name ?? StudentImportText.label(.missingName))
                        .appText(AppText.subheading)
                        .foregroundStyle(row.name == nil ? AppColors.error : AppColors.text)
                    Text(row.guardianPhone.map(AuthFormat.phone) ?? (row.phoneText.isEmpty ? StudentImportText.noPhone : row.phoneText))
                        .appText(AppText.muted)
                        .foregroundStyle(row.flags.contains(.invalidPhone) ? AppColors.error : AppColors.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Button { editing = editing == row.id ? nil : row.id } label: {
                    Text(editing == row.id ? StudentImportText.done : StudentImportText.edit)
                        .appText(AppText.buttonSmall).foregroundStyle(AppColors.primaryInk)
                        .frame(minWidth: AppMetrics.tap, minHeight: AppMetrics.tap)
                }
                .accessibilityIdentifier("import.edit.\(row.id)")
                Button { model.remove(row.id) } label: {
                    Image(systemName: "trash").foregroundStyle(AppColors.muted)
                        .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                }
                .accessibilityLabel(StudentImportText.remove)
                .accessibilityIdentifier("import.remove.\(row.id)")
            }
            pills(row)
            if editing == row.id { editFields(row) }
        }
        .padding(.horizontal, AppSpace.s12)
        .padding(.vertical, AppSpace.s8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.row))
    }

    @ViewBuilder private func pills(_ row: StudentImportRules.Row) -> some View {
        let forced = model.forceAdd.contains(row.id)
        HStack(spacing: AppSpace.s8) {
            if row.status == .skipExisting || (forced && row.status == .add && row.flags.isEmpty) {
                TeacherStatusPill(text: StudentImportText.alreadyInClass, tone: .neutral)
                Button { model.toggleForce(row.id) } label: {
                    Text(forced ? StudentImportText.skipAgain : StudentImportText.addAnyway)
                        .appText(AppText.buttonSmall).foregroundStyle(AppColors.primaryInk)
                        .frame(minHeight: AppMetrics.tap)
                }
                .accessibilityIdentifier("import.force.\(row.id)")
            }
        }
        ForEach(row.flags, id: \.self) { flag in
            TeacherStatusPill(text: StudentImportText.label(flag), tone: tone(flag))
        }
    }

    private func tone(_ flag: StudentImportRules.Flag) -> TeacherStatusPill.Tone {
        switch flag {
        case .missingName, .invalidPhone, .suspiciousName: .error
        case .sameNameDifferentPhone: .warning
        case .duplicateInPaste: .neutral
        }
    }

    private func editFields(_ row: StudentImportRules.Row) -> some View {
        let candidate = model.candidates.first { $0.id == row.id }
        return VStack(alignment: .leading, spacing: AppSpace.s12) {
            TeacherField(label: StudentImportText.nameField,
                         text: Binding(get: { candidate?.name ?? "" },
                                       set: { model.update(row.id, name: $0, phoneText: candidate?.phoneText ?? "") }),
                         identifier: "import.name.\(row.id)")
            TeacherField(label: StudentImportText.phoneField,
                         text: Binding(get: { candidate?.phoneText ?? "" },
                                       set: { model.update(row.id, name: candidate?.name ?? "", phoneText: $0) }),
                         keyboard: .phonePad, identifier: "import.phone.\(row.id)")
        }
    }

    private var resultContent: some View {
        VStack(alignment: .leading, spacing: AppSpace.s12) {
            Text(StudentImportText.progress(model.createdCount, of: model.items.count))
                .appText(AppText.heading).foregroundStyle(AppColors.text)
                .accessibilityIdentifier("import.progress")
            ProgressView(value: Double(model.createdCount), total: Double(max(model.items.count, 1)))
                .tint(AppColors.primary)
            if model.phase == .result {
                if model.stoppedOffline {
                    Text(StudentImportText.stoppedOffline).appText(AppText.muted).foregroundStyle(AppState.cardPendingFg)
                        .padding(AppSpace.s12).frame(maxWidth: .infinity, alignment: .leading)
                        .appStatusCard(.pending, radius: AppRadius.row)
                }
                if model.failedCount > 0 {
                    Text(StudentImportText.failedCount(model.failedCount)).appText(AppText.label).foregroundStyle(AppColors.error)
                    ForEach(model.items.filter { $0.state == .failed }) { item in
                        Text(item.name).appText(AppText.body).foregroundStyle(AppColors.text)
                    }
                }
            }
        }
    }

    // MARK: Footer

    @ViewBuilder private var footer: some View {
        switch model.phase {
        case .input:
            AppButton(title: StudentImportText.preview, variant: .primary, size: .large) { model.showPreview() }
                .disabled(!model.canPreview)
                .accessibilityIdentifier("import.preview")
        case .preview:
            AppButton(title: online ? StudentImportText.add(model.plan.addCount) : StudentImportText.needNetwork,
                      variant: .primary, size: .large) { Task { await model.start() } }
                .disabled(!online || model.plan.addCount == 0)
                .accessibilityIdentifier("import.add")
            AppButton(title: StudentImportText.back, variant: .secondary, size: .large) { model.backToInput() }
        case .creating:
            AppButton(title: StudentImportText.progress(model.createdCount, of: model.items.count), variant: .primary, size: .large) {}
                .disabled(true)
        case .result:
            if model.remainingCount > 0 {
                AppButton(title: online ? StudentImportText.retryRest : StudentImportText.needNetwork,
                          variant: .primary, size: .large) { Task { await model.retryRest() } }
                    .disabled(!online)
                    .accessibilityIdentifier("import.retry")
            }
            AppButton(title: StudentImportText.finish, variant: model.remainingCount > 0 ? .secondary : .primary,
                      size: .large, action: close)
                .accessibilityIdentifier("import.finish")
        }
    }

    // MARK: File

    private func load(_ result: Result<URL, Error>) {
        guard case .success(let url) = result else { model.fileFailed(); return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let bytes = try? Data(contentsOf: url) else { model.fileFailed(); return }
        model.loadFile(bytes)
    }
}

#if DEBUG
/// Screenshot harness only: synthetic names and numbers, no network.
struct StudentImportDemo: View {
    let kind: String
    @State private var model: StudentImportModel
    private let data = TeacherDemoData.data(withAbsenceWarning: false)

    init(kind: String) {
        self.kind = kind
        var calls = 0
        let model = StudentImportModel(existing: StudentImportDemoData.existing) { _, _, _ in
            calls += 1
            if kind == "import-result", calls == 4 { throw APIFailure.offline }
        }
        model.text = kind == "import-result" ? StudentImportDemoData.resultText : StudentImportDemoData.previewText
        if kind != "import-input" { model.showPreview() }
        _model = State(initialValue: model)
    }

    var body: some View {
        Color.clear.sheet(isPresented: .constant(true)) {
            StudentImportSheet(data: data, model: model)
                .task { if kind == "import-result" { await model.start() } }
        }
    }
}
#endif
