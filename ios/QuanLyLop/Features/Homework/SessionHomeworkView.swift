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

    init(sessionID: String, data: I4FeatureStore = .demo) {
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
        previousProgress.first { $0.section.kind == selectedKind } ?? previousProgress.first
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
                                  onClose: { self.editor = nil })
                .presentationDetents([.large])
                .presentationDragIndicator(.hidden)
        }
        .task { await data.configure(auth: auth) }
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
        HStack(spacing: 3) {
            ForEach(HomeworkTab.allCases, id: \.self) { option in
                Button { view = option } label: {
                    Text(option.label)
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(view == option ? AppColors.primaryInk : AppColors.muted)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                        .background(view == option ? AppColors.surface : .clear,
                                    in: RoundedRectangle(cornerRadius: 10))
                        .shadow(color: view == option ? Color(.sRGB, white: 0, opacity: 0.12) : .clear,
                                radius: 1, x: 0, y: 1)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(view == option ? [.isSelected] : [])
            }
        }
        .padding(3)
        .background(AppColors.border, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Previous homework

    @ViewBuilder
    private var previousBody: some View {
        if previousSections.isEmpty || activeProgress == nil {
            let copy = HomeworkRules.previousEmptyCopy(first: previousSession == nil)
            noticeCard(title: copy.title, body: copy.body)
            if data.canWriteCommentsReports {
                AppButton(title: String(localized: "feature.homework.giao.btvn.o.bai.tap.hom.nay"), variant: .secondary, size: .medium) {
                    view = .today
                }
            }
        } else if let activeProgress, let session {
            previousCard(activeProgress, session: session)
            ForEach(students, id: \.id) { student in
                studentCard(activeProgress.section, student: student)
            }
        }
    }

    private func previousCard(_ progress: I4SectionProgress, session: ClassSession) -> some View {
        let giving = previousSession
        return VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 0) {
                Text("BTVN \(giving?.sessionNumber.map { "buổi \($0)" } ?? "buổi trước") · \(I4Format.dayMonth(giving?.date ?? session.date))")
                    .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 21.6))
                    .foregroundStyle(AppColors.text)
                Text(String.localizedStringWithFormat(String(localized: "feature.homework.cham.hom.nay.o.buoi.ket.qua.gui.kem.phieu"), String(describing: (session.sessionNumber ?? 0))))
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                    .foregroundStyle(AppColors.muted)
            }
            kindChips
            VStack(alignment: .leading, spacing: 0) {
                Text(progress.section.kind.label.uppercased())
                    .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18, tracking: 0.24))
                    .foregroundStyle(AppColors.primaryInk)
                Text(progress.section.title)
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 21))
                    .foregroundStyle(AppColors.text)
            }
            .padding(.top, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .top) { AppColors.divider.frame(height: 1) }
            HStack {
                Text(String.localizedStringWithFormat(String(localized: "feature.homework.em.a.cham"), String(describing: (progress.summary.graded)), String(describing: (progress.summary.total))))
                    .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                    .foregroundStyle(AppColors.text)
                Spacer(minLength: 0)
                Text(String.localizedStringWithFormat(String(localized: "feature.homework.con.chua.cham"), String(describing: (progress.summary.ungraded))))
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                    .foregroundStyle(AppColors.muted)
            }
            softButton(String(localized: "feature.homework.anh.dau.ca.lop.hoan.thanh")) {
                let section = progress.section
                let roster = students
                Task {
                    await data.gradeAll(section, students: roster, level: .done)
                    error = data.errorMessage
                }
            }
            .disabled(!data.canWriteCommentsReports)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var kindChips: some View {
        I4FlowLayout(spacing: 6) {
            ForEach(previousProgress) { progress in
                let active = progress.section.id == activeProgress?.section.id
                Button {
                    selectedKind = progress.section.kind
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: progress.section.kind.systemImage)
                            .font(.system(size: 15, weight: .regular))
                        Text(progress.section.kind.label)
                            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                    }
                    .foregroundStyle(active ? AppColors.onPrimary : AppColors.text)
                    .padding(.horizontal, 14)
                    .frame(height: AppMetrics.tap)
                    .background(active ? AppColors.primary : AppColors.neutralSoft, in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(active ? [.isSelected] : [])
            }
        }
    }

    private func studentCard(_ section: HomeworkSection, student: Student) -> some View {
        let level = data.grade(sectionID: section.id, studentID: student.id)?.level
        let attendance = previousSession.flatMap { data.attendance(sessionID: $0.id, studentID: student.id) }
        let absent = attendance?.status == .absent || attendance?.status == .excused
        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                I4Avatar(name: student.name)
                Text(student.name)
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 19.5))
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                HStack(spacing: 4) {
                    if absent {
                        Text(String(localized: "feature.homework.vang.buoi.giao.bai"))
                            .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                            .foregroundStyle(AppColors.warning)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(AppColors.warningSoft, in: Capsule())
                    }
                    if level == nil {
                        Text(String(localized: "feature.homework.chua.cham"))
                            .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                            .foregroundStyle(AppColors.muted)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(AppColors.neutralSoft, in: Capsule())
                    }
                }
            }
            AppHomeworkLevelControl(level: level, isEnabled: data.canWriteCommentsReports) { newLevel in
                Task {
                    await data.grade(section, student: student, level: newLevel)
                    error = data.errorMessage
                }
            }
        }
        .padding(.horizontal, 16)
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
                    Text(String(localized: "feature.homework.chua.giao.phan.bai.tap.nao"))
                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                        .foregroundStyle(AppColors.muted)
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
            .padding(.horizontal, 16)
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
                let gradingLabel = grading.sessionNumber.map { String.localizedStringWithFormat(String(localized: "feature.homework.sessionNumber"), String(describing: ($0))) } ?? String(localized: "feature.homework.nextSession")
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
            I4Banner(text: String.localizedStringWithFormat(String(localized: "feature.homework.a.bi.huy.btvn.buoi.cham.o.buoi.phu.huynh.thay.th"), cancelledSessions, String(describing: (session.sessionNumber ?? 0)), String(describing: (grading.sessionNumber ?? 0)), String(describing: (I4Format.weekdayDayMonth(grading.date)))),
                     tone: .warning, horizontal: 14)
        } else if plan.session == nil {
            I4Banner(text: String.localizedStringWithFormat(String(localized: "feature.homework.lich.lop.khong.con.buoi.nao.sau.buoi.phu.huynh.t"), String(describing: (session.sessionNumber ?? 0))),
                     tone: .warning, horizontal: 14)
        }
    }

    private func sectionRow(_ section: HomeworkSection) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: section.kind.systemImage)
                .font(.system(size: 17, weight: .regular))
                .foregroundStyle(AppColors.primaryInk)
                .frame(width: 36, height: 36)
                .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: 10))
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
            if section.id != todaySections.last?.id { AppColors.divider.frame(height: 1) }
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
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func softButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(AppColors.primaryInk)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
        .buttonStyle(.plain)
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

/// Bottom sheet "Thêm phần BTVN" / "Sửa phần" (`SectionEditor`).
struct HomeworkSectionEditor: View {
    @ObservedObject var data: I4FeatureStore
    let sessionID: String
    let editor: HomeworkEditor
    let existingKinds: [HomeworkKind]
    let missingKinds: [HomeworkKind]
    let gradingStudentCount: Int
    let onClose: () -> Void

    @State private var kind: HomeworkKind?
    @State private var title: String
    @State private var description: String
    @State private var error: String?
    @State private var confirmingDelete = false

    init(data: I4FeatureStore, sessionID: String, editor: HomeworkEditor,
         existingKinds: [HomeworkKind], missingKinds: [HomeworkKind],
         gradingStudentCount: Int, onClose: @escaping () -> Void) {
        self.data = data
        self.sessionID = sessionID
        self.editor = editor
        self.existingKinds = existingKinds
        self.missingKinds = missingKinds
        self.gradingStudentCount = gradingStudentCount
        self.onClose = onClose
        switch editor {
        case .add(let kind):
            _kind = State(initialValue: kind)
            _title = State(initialValue: "")
            _description = State(initialValue: "")
        case .edit(let section):
            _kind = State(initialValue: section.kind)
            _title = State(initialValue: section.title)
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

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Capsule()
                        .fill(AppColors.inputBorder)
                        .frame(width: 40, height: 5)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 8)
                    if editingSection == nil {
                        addHeader
                    } else {
                        editHeader
                    }
                    titleField
                    descriptionField
                    if let error {
                        Text(error)
                            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                            .foregroundStyle(AppColors.error)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
                    }
                    if let section = editingSection {
                        deleteRow(section)
                        savedHint
                        AppButton(title: String(localized: "feature.homework.luu"), size: .large) { save() }
                    } else {
                        footHint
                        AppButton(title: String(localized: "feature.homework.luu.phan"), size: .large) { save() }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
        .background(AppColors.surface)
    }

    private var addHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "feature.homework.them.phan.btvn"))
                .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 30))
                .foregroundStyle(AppColors.text)
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

    private func kindOption(_ option: HomeworkKind) -> some View {
        let taken = existingKinds.contains(option)
        let chosen = kind == option
        return Button { kind = option } label: {
            HStack(spacing: 8) {
                Image(systemName: option.systemImage).font(.system(size: 17, weight: .regular))
                Text(option.label)
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 18))
                    .frame(maxWidth: .infinity, alignment: .leading)
                if taken {
                    Text(String(localized: "feature.homework.a.co")).appText(AppTextStyle(size: 12, weight: .medium, lineHeight: 18))
                }
            }
            .foregroundStyle(taken ? AppColors.placeholder : (chosen ? AppColors.primaryInk : AppColors.text))
            .padding(.horizontal, 12)
            .frame(height: 56)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(taken ? AppColors.background : (chosen ? AppColors.primarySoft : AppColors.background),
                        in: RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(chosen ? AppColors.primary : .clear, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .disabled(taken)
    }

    private var editHeader: some View {
        HStack(spacing: 10) {
            Image(systemName: (editingSection?.kind ?? .exercise).systemImage)
                .font(.system(size: 17, weight: .regular))
                .foregroundStyle(AppColors.primaryInk)
                .frame(width: 36, height: 36)
                .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: 10))
            Text(String.localizedStringWithFormat(String(localized: "feature.homework.sua.phan.e042540b"), String(describing: (editingSection?.kind.label ?? String(localized: "feature.homework.exercise")))))
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
                .padding(12)
                .frame(minHeight: AppMetrics.tap)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: 12))
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
                .padding(12)
                .frame(minHeight: 72, alignment: .topLeading)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private var footHint: some View {
        HStack(spacing: 6) {
            Image(systemName: "info.circle").font(.system(size: 14))
            Text(String(localized: "feature.homework.phu.huynh.thay.ngay.khi.luu.khong.inh.kem.tep"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
        }
        .foregroundStyle(AppColors.muted)
    }

    private var savedHint: some View {
        HStack(spacing: 6) {
            Image(systemName: "checkmark").font(.system(size: 13, weight: .semibold))
            Text(String(localized: "feature.homework.phu.huynh.thay.ngay.khi.luu"))
                .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
        }
        .foregroundStyle(AppColors.success)
        .frame(maxWidth: .infinity)
    }

    private func deleteRow(_ section: HomeworkSection) -> some View {
        Group {
            if confirmingDelete {
                VStack(alignment: .leading, spacing: 6) {
                    Text(String.localizedStringWithFormat(String(localized: "feature.homework.xoa.phan.e8531efc"), String(describing: (section.title))))
                        .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                        .foregroundStyle(AppColors.error)
                    Text(String(localized: "feature.homework.phu.huynh.se.khong.thay.phan.nay.nua.khong.the.h"))
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                        .foregroundStyle(AppColors.muted)
                    HStack(spacing: 8) {
                        Spacer(minLength: 0)
                        AppButton(title: String(localized: "feature.homework.huy"), variant: .secondary, size: .medium) { confirmingDelete = false }
                        AppButton(title: String(localized: "feature.homework.xoa.phan"), variant: .danger, size: .medium) { remove(section) }
                    }
                }
                .padding(12)
                .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: 12))
            } else {
                HStack(spacing: 10) {
                    Button { if deletable { confirmingDelete = true } } label: {
                        HStack(spacing: 6) {
                            Image(systemName: deletable ? "trash" : "lock").font(.system(size: 14))
                            Text(String(localized: "feature.homework.xoa.phan")).appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        }
                        .foregroundStyle(deletable ? AppColors.error : AppColors.placeholder)
                        .padding(.horizontal, 16)
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
        }
    }

    private func save() {
        guard let kind = editingSection?.kind ?? kind else { return }
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            error = String(localized: "feature.homework.nhap.tieu.e.phan.bai.tap")
            return
        }
        let draftTitle = title
        let draftDescription = description
        let section = editingSection
        Task {
            if let failure = await data.saveSection(sessionID: sessionID, kind: kind,
                                                     title: draftTitle, description: draftDescription,
                                                     section: section) {
                error = failure
            } else {
                onClose()
            }
        }
    }

    private func remove(_ section: HomeworkSection) {
        Task {
            if let failure = await data.deleteSection(section) {
                error = failure
                confirmingDelete = false
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
