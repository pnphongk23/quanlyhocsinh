import SwiftUI

/// Tab "Bài tập về nhà" of a session (`HomeworkPanel.tsx`): grade last session's homework
/// or publish today's parts.
struct SessionHomeworkView: View {
    let sessionID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var view: HomeworkTab = .previous
    @State private var selectedKind: HomeworkKind?
    @State private var editor: HomeworkEditor?
    @State private var error: String?
    @State private var saveStatusSource: AppSaveStatusSource?

    init(sessionID: String, data: I4FeatureStore = I4FeatureStore()) {
        self.sessionID = sessionID
        self.data = data
    }

    private var session: ClassSession? { data.session(id: sessionID) }

    private var previousSession: ClassSession? {
        guard let session else { return nil }
        return HomeworkRules.previousSession(data.sessions(in: session.classId), before: session)
    }

    private var previousSections: [HomeworkSection] {
        guard let previousSession else { return [] }
        return data.sections(sessionID: previousSession.id)
    }

    private var todaySections: [HomeworkSection] { data.sections(sessionID: sessionID) }

    private var students: [Student] {
        guard let session else { return [] }
        return data.students(enrolledOn: session)
    }

    private var previousProgress: [I4SectionProgress] {
        HomeworkRules.progress(sections: previousSections, grades: data.grades, students: students)
    }

    private var activeProgress: I4SectionProgress? {
        HomeworkRules.activeProgress(previousProgress, selected: selectedKind)
    }

    private var missingKinds: [HomeworkKind] {
        HomeworkKind.allCases.filter { kind in !todaySections.contains { $0.kind == kind } }
    }

    private var gradingPlan: (session: ClassSession?, cancelled: [ClassSession]) {
        guard let session else { return (nil, []) }
        return HomeworkRules.gradingPlan(data.sessions(in: session.classId), after: session)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            content
        }
        .sheet(item: $editor) { editor in
            HomeworkSectionEditor(data: data, sessionID: sessionID, editor: editor,
                                  existingKinds: todaySections.map(\.kind),
                                  missingKinds: missingKinds,
                                  gradingStudentCount: gradingPlan.session.map { data.students(enrolledOn: $0).count } ?? 0,
                                  saveStatusSource: saveStatusSource,
                                  onClose: { self.editor = nil })
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .task {
            await data.configure(auth: auth)
            if let store = data.store {
                let source = AppSaveStatusSource(store: store)
                await source.refresh()
                saveStatusSource = source
            }
        }
        .onChange(of: SyncStatusCenter.shared.state) { _, _ in
            Task { await saveStatusSource?.refresh() }
        }
    }

    @ViewBuilder
    private var content: some View {
        if !data.canReadCommentsReports {
            AppEmptyState(title: String(localized: "feature.homework.ban.khong.co.quyen.xem.bai.tap.ve.nha")) {
                Text(String(localized: "feature.homework.lien.he.admin.neu.ban.can.quyen.truy.cap")).appText(AppText.body)
            }
        } else if let session {
            if session.status == .cancelled {
                noticeCard(title: String(localized: "feature.homework.buoi.hoc.a.huy.nen.khong.giao.hoac.cham.bai.tap"))
            } else {
                segmented
                if let error {
                    I4Banner(text: error, tone: .error, systemImage: "exclamationmark.triangle",
                             horizontal: 14, vertical: 10)
                }
                if let saveStatusSource { AppSaveStatus(kind: saveStatusSource.kind.errorOnly) }
                if !data.canWriteCommentsReports {
                    I4Banner(text: String(localized: "feature.homework.ban.chi.co.quyen.xem.bai.tap.ve.nha.cua.buoi.nay"),
                             horizontal: 12, vertical: 10)
                }
                if view == .previous { previousBody } else { todayBody(session) }
            }
        } else {
            AppEmptyState(title: String(localized: "feature.homework.khong.tim.thay.buoi.hoc"))
        }
    }

    private var segmented: some View {
        AppSegmented(
            options: HomeworkTab.allCases.map { .init(value: $0.rawValue, label: $0.label) },
            value: view.rawValue
        ) { selection in
            if let selected = HomeworkTab(rawValue: selection) { view = selected }
        }
    }

    // MARK: - Previous homework

    @ViewBuilder
    private var previousBody: some View {
        if previousSections.isEmpty || activeProgress == nil {
            let copy = HomeworkRules.previousEmptyCopy(first: previousSession == nil)
            AppEmptyState(title: copy.title, description: copy.body, size: .compact) {
                if data.canWriteCommentsReports {
                    AppButton(title: String(localized: "feature.homework.giao.btvn.o.bai.tap.hom.nay"), variant: .secondary, size: .medium) {
                        view = .today
                    }
                }
            }
        } else if let activeProgress, let session {
            VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
                partPicker(activeProgress, session: session)
                AppSection(title: String(localized: "homework.grading.header", table: "Teacher")) {
                    VStack(spacing: TeacherMetrics.listGap) {
                        ForEach(students, id: \.id) { student in
                            studentCard(activeProgress.section, student: student)
                        }
                    }
                }
            }
        }
    }

    /// The parts of last session's homework as a row of chips (name and graded count); the class-wide mark sits in
    /// the menu beside the summary line.
    private func partPicker(_ progress: I4SectionProgress, session: ClassSession) -> some View {
        let giving = previousSession
        let summary = String.localizedStringWithFormat(
            String(localized: "homework.grading.summary", table: "Teacher"),
            I4Format.dayMonth(giving?.date ?? session.date),
            String(progress.summary.graded), String(progress.summary.total))
        return VStack(alignment: .leading, spacing: AppSpace.s8) {
            HStack(spacing: AppSpace.s4) {
                Text(summary)
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if data.canWriteCommentsReports { bulkMenu(progress) }
            }
            ScrollView(.horizontal) {
                HStack(spacing: AppSpace.s8) {
                    ForEach(previousProgress) { option in
                        partChip(option, selected: option.section.kind == progress.section.kind)
                    }
                }
            }
            .scrollIndicators(.hidden)
            .accessibilityIdentifier("homework.partPicker")
        }
        .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
        .padding(.vertical, AppSpace.s12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func partChip(_ option: I4SectionProgress, selected: Bool) -> some View {
        Button { selectedKind = option.section.kind } label: {
            Text("\(HomeworkRules.partLabel(option.section)) · \(option.summary.graded)/\(option.summary.total)")
                .appText(AppText.chip)
                .foregroundStyle(selected ? AppState.selectedFg : AppColors.text)
                .lineLimit(1)
                .padding(.horizontal, AppSpace.s16)
                .frame(minHeight: AppMetrics.tap)
                .background(selected ? AppState.selectedBg : AppColors.background,
                            in: RoundedRectangle(cornerRadius: AppRadius.chip))
                .fixedSize(horizontal: true, vertical: false)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
        .accessibilityLabel(String(localized: "homework.part.picker.a11y", table: "Teacher"))
    }

    private func bulkMenu(_ progress: I4SectionProgress) -> some View {
        Menu {
            Button {
                Task {
                    await data.gradeAll(progress.section, students: students, level: .done)
                    error = data.errorMessage
                    await saveStatusSource?.refresh()
                }
            } label: {
                Label(String(localized: "feature.homework.anh.dau.ca.lop.hoan.thanh"), systemImage: "checkmark.circle")
            }
            .accessibilityIdentifier("homework.grade.bulk")
        } label: {
            Image(systemName: "ellipsis")
                .font(.system(size: 18, weight: .regular))
                .foregroundStyle(AppColors.muted)
                .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                .contentShape(Rectangle())
        }
        .accessibilityLabel(String(localized: "homework.part.more.a11y", table: "Teacher"))
    }

    private func studentCard(_ section: HomeworkSection, student: Student) -> some View {
        let level = data.grade(sectionID: section.id, studentID: student.id)?.level
        let attendance = previousSession.flatMap { data.attendance(sessionID: $0.id, studentID: student.id) }
        let absent = attendance?.status == .absent
        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                I4Avatar(name: student.name)
                Text(student.name)
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 19.5))
                    .foregroundStyle(AppColors.text)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if level == nil {
                    AppPill(title: String(localized: "feature.homework.chua.cham"), tone: .neutral)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                }
            }
            if absent {
                AppPill(title: String(localized: "feature.homework.vang.buoi.giao.bai"), tone: .warning)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
            }
            AppHomeworkLevelControl(level: level, isEnabled: data.canWriteCommentsReports) { newLevel in
                Task {
                    await data.grade(section, student: student, level: newLevel)
                    error = data.errorMessage
                    await saveStatusSource?.refresh()
                }
            }
        }
        .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    // MARK: - Today's homework

    private func todayBody(_ session: ClassSession) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            gradingBanner(session)
            VStack(alignment: .leading, spacing: 10) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(String(localized: "feature.homework.btvn.giao.hom.nay"))
                        .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 21.6))
                        .foregroundStyle(AppColors.text)
                    todayMeta(session)
                }
                if !todaySections.isEmpty {
                    AppPill(title: String(localized: "feature.homework.a.luu.phu.huynh.a.thay"), tone: .success)
                }
                if todaySections.isEmpty {
            AppEmptyState(title: String(localized: "feature.homework.chua.giao.phan.bai.tap.nao"), size: .compact)
                } else {
                    VStack(spacing: 0) {
                        ForEach(todaySections, id: \.id) { section in
                            sectionRow(section)
                        }
                    }
                }
                if data.canWriteCommentsReports, let hint = HomeworkRules.addPartLabel(missing: missingKinds) {
                    Button {
                        if let kind = missingKinds.first { editor = .add(kind) }
                    } label: {
                        HStack(spacing: 6) {
                            Text(String(localized: "feature.homework.them.phan"))
                                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                            Text("· \(hint)")
                                .appText(AppTextStyle(size: 14, weight: .medium, lineHeight: 21))
                        }
                        .foregroundStyle(AppColors.primaryInk)
                        .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                        .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
    }

    private func todayMeta(_ session: ClassSession) -> some View {
        HStack(spacing: 0) {
            Text(String.localizedStringWithFormat(String(localized: "feature.homework.mot.lan.cho.ca.lop"), String(describing: (HomeworkRules.partsCountLabel(todaySections.count)))))
                .foregroundStyle(AppColors.muted)
            if let grading = gradingPlan.session {
                let gradingLabel = SessionLabel.inline(for: grading)
                Text(String.localizedStringWithFormat(String(localized: "feature.homework.cham.o"), gradingLabel))
                    .foregroundStyle(AppColors.muted)
            } else {
                Text(String(localized: "feature.homework.chua.co.buoi.cham"))
                    .foregroundStyle(AppColors.warning)
            }
        }
        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
        .lineLimit(2)
    }

    @ViewBuilder
    private func gradingBanner(_ session: ClassSession) -> some View {
        let plan = gradingPlan
        if !plan.cancelled.isEmpty, let grading = plan.session {
            let cancelledSessions = plan.cancelled.map { String.localizedStringWithFormat(String(localized: "feature.homework.cancelledSession"), I4Format.dayMonth($0.date)) }.joined(separator: ", ")
            I4Banner(text: String.localizedStringWithFormat(String(localized: "homework.grading.cancelledBanner", table: "Teacher"), cancelledSessions, I4Format.dayMonth(session.date), SessionLabel.title(for: grading)),
                     tone: .warning, horizontal: 14)
        } else if plan.session == nil {
            I4Banner(text: String.localizedStringWithFormat(String(localized: "feature.homework.lich.lop.khong.con.buoi.nao.sau.buoi.phu.huynh.t"), SessionLabel.inline(for: session)),
                     tone: .warning, horizontal: 14)
        }
    }

    private func sectionRow(_ section: HomeworkSection) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: section.kind.systemImage)
                .font(.system(size: 17, weight: .regular))
                .foregroundStyle(AppColors.primaryInk)
                .frame(width: 36, height: 36)
                .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.chip))
            VStack(alignment: .leading, spacing: 0) {
                Text(section.kind.label.uppercased())
                    .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18, tracking: 0.24))
                    .foregroundStyle(AppColors.primaryInk)
                Text(section.title)
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 21))
                    .foregroundStyle(AppColors.text)
                if !section.description.isEmpty {
                    Text(section.description)
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                        .foregroundStyle(AppColors.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if data.canWriteCommentsReports {
                Button { editor = .edit(section) } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(AppColors.muted)
                        .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                        .background(AppColors.neutralSoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.homework.sua.phan"), String(describing: (section.kind.label))))
            }
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            if section.id != todaySections.last?.id { AppColors.divider.frame(height: AppMetrics.hairline) }
        }
    }

    // MARK: - Shared pieces

    private func noticeCard(title: String, body: String? = nil) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "info.circle")
                .font(.system(size: 20, weight: .regular))
                .foregroundStyle(AppColors.text)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 22.4))
                    .foregroundStyle(AppColors.text)
                if let body {
                    Text(body)
                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 20.3))
                        .foregroundStyle(AppColors.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

}

enum HomeworkTab: String, CaseIterable {
    case previous, today
    var label: String { self == .previous ? String(localized: "feature.homework.bai.tap.buoi.truoc") : String(localized: "feature.homework.bai.tap.hom.nay") }
}

enum HomeworkEditor: Identifiable {
    case add(HomeworkKind)
    case edit(HomeworkSection)

    var id: String {
        switch self {
        case .add(let kind): "add-\(kind.rawValue)"
        case .edit(let section): "edit-\(section.id)"
        }
    }
}

/// Sheet "Thêm phần BTVN" / "Sửa phần" (`SectionEditor`): close button in the navigation bar, the
/// main action pinned to the bottom edge.
struct HomeworkSectionEditor: View {
    @ObservedObject var data: I4FeatureStore
    let sessionID: String
    let editor: HomeworkEditor
    let existingKinds: [HomeworkKind]
    let missingKinds: [HomeworkKind]
    let gradingStudentCount: Int
    let saveStatusSource: AppSaveStatusSource?
    let onClose: () -> Void

    @State private var kind: HomeworkKind?
    @State private var title: String
    @State private var autoFilledTitle: String?
    @State private var description: String
    @State private var error: String?
    @State private var saveController = AppSaveController()
    @State private var confirmingDelete = false
    @State private var confirmingDiscard = false
    private let initialKind: HomeworkKind?
    private let initialTitle: String
    private let initialDescription: String

    init(data: I4FeatureStore, sessionID: String, editor: HomeworkEditor,
         existingKinds: [HomeworkKind], missingKinds: [HomeworkKind],
         gradingStudentCount: Int, saveStatusSource: AppSaveStatusSource?, onClose: @escaping () -> Void) {
        self.data = data
        self.sessionID = sessionID
        self.editor = editor
        self.existingKinds = existingKinds
        self.missingKinds = missingKinds
        self.gradingStudentCount = gradingStudentCount
        self.saveStatusSource = saveStatusSource
        self.onClose = onClose
        switch editor {
        case .add(let kind):
            let filled = HomeworkRules.titleAfterChoosing(kind, title: "", autoFilled: nil)
            initialKind = kind
            initialTitle = filled.title
            initialDescription = ""
            _kind = State(initialValue: kind)
            _title = State(initialValue: filled.title)
            _autoFilledTitle = State(initialValue: filled.autoFilled)
            _description = State(initialValue: "")
        case .edit(let section):
            initialKind = section.kind
            initialTitle = section.title
            initialDescription = section.description
            _kind = State(initialValue: section.kind)
            _title = State(initialValue: section.title)
            _autoFilledTitle = State(initialValue: nil)
            _description = State(initialValue: section.description)
        }
    }

    private var editingSection: HomeworkSection? {
        if case .edit(let section) = editor { return section }
        return nil
    }

    private var gradeCount: Int {
        guard let section = editingSection else { return 0 }
        return data.grades(sectionID: section.id).filter { $0.level != nil }.count
    }

    private var deletable: Bool { HomeworkRules.canDelete(gradeCount: gradeCount) }

    private var hasUnsavedChanges: Bool {
        kind != initialKind || title != initialTitle || description != initialDescription
    }

    private var navigationTitle: String {
        guard let section = editingSection else { return String(localized: "feature.homework.them.phan.btvn") }
        return String.localizedStringWithFormat(String(localized: "feature.homework.sua.phan.e042540b"), String(describing: section.kind.label))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if editingSection == nil {
                        kindPicker
                    } else {
                        editHeader
                    }
                    titleField
                    descriptionField
                    if let section = editingSection { deleteRow(section) }
                }
                .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                .padding(.top, 12)
                .padding(.bottom, 20)
            }
            .background(AppColors.surface)
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "feature.classes.ong")) { requestClose() }
                        .accessibilityIdentifier("sheet.close")
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                TeacherPinnedBar {
                if let error {
                    Text(error)
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(AppColors.error)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .appStatusCard(.error, radius: AppRadius.button)
                }
                if let saveStatusSource { AppSaveStatus(kind: saveStatusSource.kind) }
                    AppSaveButton(title: editingSection == nil ? String(localized: "feature.homework.luu.phan")
                                                               : String(localized: "feature.homework.luu"),
                                  controller: saveController, identifier: "homework.assign.save") {
                        try await save()
                    }
                }
            }
        }
        .interactiveDismissDisabled(hasUnsavedChanges)
        .confirmationDialog(String(localized: "homework.editor.discard.title", table: "Teacher"),
                            isPresented: $confirmingDiscard, titleVisibility: .visible) {
            Button(String(localized: "homework.editor.discard.confirm", table: "Teacher"), role: .destructive) { onClose() }
            Button(String(localized: "homework.editor.discard.keep", table: "Teacher"), role: .cancel) {}
        } message: {
            Text(String(localized: "homework.editor.discard.message", table: "Teacher"))
        }
        .confirmationDialog(String.localizedStringWithFormat(String(localized: "feature.homework.xoa.phan.e8531efc"), String(describing: editingSection?.title ?? "")),
                            isPresented: $confirmingDelete, titleVisibility: .visible) {
            Button(String(localized: "feature.homework.xoa.phan"), role: .destructive) {
                if let section = editingSection { remove(section) }
            }
            Button(String(localized: "feature.homework.huy"), role: .cancel) {}
        } message: {
            Text(String(localized: "feature.homework.phu.huynh.se.khong.thay.phan.nay.nua.khong.the.h"))
        }
        .onChange(of: saveController.phase) { oldPhase, newPhase in
            if oldPhase == .saved, newPhase == .idle { onClose() }
        }
        .onChange(of: SyncStatusCenter.shared.state) { _, _ in
            Task { await saveStatusSource?.refresh() }
        }
    }

    private func requestClose() {
        if hasUnsavedChanges { confirmingDiscard = true } else { onClose() }
    }

    private var kindPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "feature.homework.loai"))
                .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                .foregroundStyle(AppColors.text)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)],
                      spacing: 8) {
                ForEach(HomeworkKind.allCases, id: \.self) { option in
                    kindOption(option)
                }
            }
            Text(String(localized: "feature.homework.moi.loai.chi.co.mot.phan.trong.mot.buoi"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
        }
    }

    /// Resting state has a token stroke; the chosen state is the selected fill (no stroke), as in
    /// rules.md mục 6.
    private func kindOption(_ option: HomeworkKind) -> some View {
        let taken = existingKinds.contains(option)
        let chosen = kind == option
        return Button { choose(option) } label: {
            HStack(spacing: 8) {
                Image(systemName: option.systemImage).font(.system(size: 17, weight: .regular))
                Text(option.label)
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 18))
                    .frame(maxWidth: .infinity, alignment: .leading)
                if taken {
                    Text(String(localized: "feature.homework.a.co")).appText(AppTextStyle(size: 12, weight: .medium, lineHeight: 18))
                }
            }
            .foregroundStyle(taken ? AppColors.placeholder : (chosen ? AppState.selectedFg : AppColors.text))
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .frame(maxWidth: .infinity)
            .frame(height: TeacherMetrics.rowMinHeight)
            .background(chosen ? AppState.selectedBg : AppColors.surface,
                        in: RoundedRectangle(cornerRadius: AppRadius.card))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.card)
                    .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth)
                    .opacity(chosen ? 0 : 1))
        }
        .buttonStyle(.plain)
        .disabled(taken)
        .accessibilityAddTraits(chosen ? [.isSelected] : [])
    }

    private func choose(_ option: HomeworkKind) {
        kind = option
        error = nil
        let next = HomeworkRules.titleAfterChoosing(option, title: title, autoFilled: autoFilledTitle)
        title = next.title
        autoFilledTitle = next.autoFilled
    }

    private var editHeader: some View {
        HStack(spacing: 10) {
            Image(systemName: (editingSection?.kind ?? .exercise).systemImage)
                .font(.system(size: 17, weight: .regular))
                .foregroundStyle(AppColors.primaryInk)
                .frame(width: 36, height: 36)
                .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.chip))
            Text(editingSection?.kind.label ?? String(localized: "feature.homework.exercise"))
                .appText(AppTextStyle(size: 18, weight: .bold, lineHeight: 23.4))
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
            AppPill(title: HomeworkRules.gradePillLabel(gradeCount: gradeCount, total: gradingStudentCount),
                    tone: gradeCount > 0 ? .warning : .neutral)
        }
    }

    private var titleField: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(String(localized: "feature.homework.tieu.e"))
                .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                .foregroundStyle(AppColors.text)
            TextField("", text: $title)
                .font(.system(size: 15))
                .foregroundStyle(AppColors.text)
                .padding(TeacherMetrics.contentGap)
                .frame(minHeight: AppMetrics.tap)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
    }

    private var descriptionField: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Text(String(localized: "feature.homework.mo.ta"))
                    .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                    .foregroundStyle(AppColors.text)
                Text(String(localized: "feature.homework.khong.bat.buoc"))
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                    .foregroundStyle(AppColors.muted)
            }
            TextField("", text: $description, axis: .vertical)
                .lineLimit(2...5)
                .font(.system(size: 15))
                .foregroundStyle(AppColors.text)
                .padding(TeacherMetrics.contentGap)
                .frame(minHeight: TeacherMetrics.commentEditorMinHeight, alignment: .topLeading)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
    }

    private func deleteRow(_ section: HomeworkSection) -> some View {
        HStack(spacing: 10) {
            Button { if deletable { confirmingDelete = true } } label: {
                HStack(spacing: 6) {
                    Image(systemName: deletable ? "trash" : "lock").font(.system(size: 14))
                    Text(String(localized: "feature.homework.xoa.phan")).appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                }
                .foregroundStyle(deletable ? AppColors.error : AppColors.placeholder)
                .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
                .frame(minHeight: AppMetrics.tap)
                .background(deletable ? AppColors.errorSoft : AppColors.neutralSoft,
                            in: RoundedRectangle(cornerRadius: AppRadius.button))
            }
            .buttonStyle(.plain)
            .disabled(!deletable)
            Text(deletable ? HomeworkRules.deleteAllowedMessage
                 : HomeworkRules.deleteBlockedMessage(gradeCount: gradeCount))
                .appText(AppTextStyle(size: 12, weight: .regular, lineHeight: 16.8))
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func save() async throws {
        guard let kind = editingSection?.kind ?? kind else {
            let message = String(localized: "feature.homework.loai")
            error = message
            throw I4SaveFailure(message: message)
        }
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            let message = String(localized: "feature.homework.nhap.tieu.e.phan.bai.tap")
            error = message
            throw I4SaveFailure(message: message)
        }
        if let failure = await data.saveSection(sessionID: sessionID, kind: kind,
                                                title: title, description: description,
                                                section: editingSection) {
            error = failure
            throw I4SaveFailure(message: failure)
        }
        error = nil
        await saveStatusSource?.refresh()
    }

    private func remove(_ section: HomeworkSection) {
        Task {
            if let failure = await data.deleteSection(section) {
                error = failure
            } else {
                onClose()
            }
        }
    }
}

/// Wraps chips onto several lines (`flex-wrap: wrap`).
struct I4FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0 && x + size.width > width {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: proposal.width ?? x, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > bounds.minX && x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
