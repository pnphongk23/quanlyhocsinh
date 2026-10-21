import SwiftUI

struct SessionHomeworkView: View {
    let sessionID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var showingPrevious = true
    @State private var selectedSection: HomeworkSection?
    @State private var showEditor = false
    @State private var deletingSection: HomeworkSection?
    @State private var kind: HomeworkKind = .vocabulary
    @State private var title = ""
    @State private var description = ""

    init(sessionID: String, data: I4FeatureStore = .demo) {
        self.sessionID = sessionID
        self.data = data
    }

    private var session: ClassSession? {
        data.sessions.first { $0.id == sessionID }
    }

    private var previousSession: ClassSession? {
        guard let session else { return nil }
        return data.sessions
            .filter { $0.classId == session.classId && $0.status != .cancelled && $0.date < session.date }
            .max { $0.date < $1.date }
    }

    private var activeSessionID: String? {
        showingPrevious ? previousSession?.id : session?.id
    }

    private var visibleSections: [HomeworkSection] {
        let target = activeSessionID
        return data.sections
            .filter { $0.sessionId == target }
            .sorted { $0.kind.rawValue < $1.kind.rawValue }
    }

    private var activeStudents: [Student] {
        data.students.filter { $0.classId == session?.classId && $0.status == .active }
    }

    private var sessionIsCancelled: Bool {
        guard let session else { return false }
        return session.status == .cancelled
    }

    private var emptyStateTitle: String {
        showingPrevious ? "Buổi trước chưa có bài tập" : "Chưa giao bài tập hôm nay"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Bài tập về nhà").appText(AppText.title)
            AppSegmented(options: segmentOptions, value: showingPrevious ? "previous" : "today") { value in
                showingPrevious = value == "previous"
            }
            content
            if let message = data.errorMessage {
                Text(message).appText(AppText.muted).foregroundStyle(AppColors.error)
            }
        }
        .padding(16)
        .background(AppColors.background)
        .confirmationDialog("Xoá phần bài tập?", isPresented: deleteConfirmation,
                            presenting: deletingSection) { section in
            Button("Xoá phần", role: .destructive) {
                Task { await data.deleteSection(section) }
            }
            Button("Huỷ", role: .cancel) {}
        } message: { _ in
            Text("Chỉ xoá được phần chưa có em nào được chấm.")
        }
        .sheet(isPresented: $showEditor) { editorSheet }
        .task { await data.configure(auth: auth) }
    }

    private var deleteConfirmation: Binding<Bool> {
        Binding(get: { deletingSection != nil }, set: { shown in if !shown { deletingSection = nil } })
    }

    private var segmentOptions: [AppSegmented.Option] {
        [
            .init(value: "previous", label: "Bài tập buổi trước"),
            .init(value: "today", label: "Bài tập hôm nay")
        ]
    }

    @ViewBuilder
    private var content: some View {
        if sessionIsCancelled {
            AppCard {
                Text("Buổi học đã hủy nên không giao hoặc chấm bài tập.").appText(AppText.body)
            }
        } else if visibleSections.isEmpty {
            AppEmptyState(title: emptyStateTitle)
        } else if showingPrevious {
            previousList
        } else {
            todayList
        }
    }

    private var previousList: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(visibleSections, id: \.id) { section in
                    previousSectionCard(section)
                }
            }
        }
    }

    private func previousSectionCard(_ section: HomeworkSection) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                sectionHeader(section)
                ForEach(activeStudents, id: \.id) { student in
                    gradeRow(section: section, student: student)
                }
            }
        }
    }

    private func sectionHeader(_ section: HomeworkSection) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(kindLabel(section.kind)).appText(AppText.caption).foregroundStyle(AppColors.muted)
                Text(section.title).appText(AppText.subheading)
            }
            Spacer()
            Text(section.description).appText(AppText.muted)
        }
    }

    private func gradeRow(section: HomeworkSection, student: Student) -> some View {
        let level = data.grades.first { $0.sectionId == section.id && $0.studentId == student.id }?.level
        return VStack(alignment: .leading, spacing: 6) {
            Text(student.name).appText(AppText.body)
            AppHomeworkLevelControl(level: level) { newLevel in
                Task { await data.grade(section, student: student, level: newLevel) }
            }
            if student.id != data.students.last?.id {
                AppColors.divider.frame(height: 1)
            }
        }
    }

    @ViewBuilder
    private var todayList: some View {
        ForEach(visibleSections, id: \.id) { section in
            todaySectionCard(section)
        }
        if visibleSections.count < 4 {
            addSectionButton
        }
    }

    private func todaySectionCard(_ section: HomeworkSection) -> some View {
        AppCard {
            HStack {
                sectionSummary(section)
                Spacer()
                editButton(section)
                deleteButton(section)
            }
        }
    }

    private func sectionSummary(_ section: HomeworkSection) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(kindLabel(section.kind)).appText(AppText.caption).foregroundStyle(AppColors.muted)
            Text(section.title).appText(AppText.subheading)
            if !section.description.isEmpty {
                Text(section.description).appText(AppText.muted)
            }
        }
    }

    private func editButton(_ section: HomeworkSection) -> some View {
        Button("Sửa") {
            startEditing(section)
        }
        .appText(AppText.buttonSmall)
    }

    private func deleteButton(_ section: HomeworkSection) -> some View {
        Button("Xoá") {
            deletingSection = section
        }
        .appText(AppText.buttonSmall)
        .foregroundStyle(AppColors.error)
    }

    private var addSectionButton: some View {
        AppButton(title: "+ Thêm phần", variant: .secondary) {
            startAdding()
        }
    }

    private var editorSheet: some View {
        AppSheet(title: selectedSection == nil ? "Thêm phần bài tập" : "Sửa phần bài tập") {
            VStack(spacing: 14) {
                Picker("Phần", selection: $kind) {
                    ForEach(HomeworkKind.allCases, id: \.self) { option in
                        Text(kindLabel(option)).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                AppTextField(label: "Tiêu đề", text: $title, placeholder: "Nhập tiêu đề")
                AppTextField(label: "Mô tả", text: $description, placeholder: "Không bắt buộc")
            }
        } footer: {
            AppButton(title: "Lưu bài tập", size: .large) {
                saveSection()
            }
        } close: {
            showEditor = false
        }
    }

    private func startEditing(_ section: HomeworkSection) {
        selectedSection = section
        kind = section.kind
        title = section.title
        description = section.description
        showEditor = true
    }

    private func startAdding() {
        selectedSection = nil
        title = ""
        description = ""
        kind = firstAvailableKind()
        showEditor = true
    }

    private func firstAvailableKind() -> HomeworkKind {
        let used = Set(visibleSections.map(\.kind))
        return HomeworkKind.allCases.first { !used.contains($0) } ?? .vocabulary
    }

    private func saveSection() {
        guard let target = activeSessionID else { return }
        let draft = kind
        let draftTitle = title
        let draftDescription = description
        let editing = selectedSection
        Task {
            await data.saveSection(sessionID: target, kind: draft, title: draftTitle,
                                   description: draftDescription, section: editing)
            showEditor = false
        }
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
