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
    init(sessionID: String, data: I4FeatureStore = .demo) { self.sessionID = sessionID; self.data = data }
    private var session: ClassSession? { data.sessions.first { $0.id == sessionID } }
    private var previousSession: ClassSession? {
        guard let session else { return nil }
        return data.sessions.filter { $0.classId == session.classId && $0.status != .cancelled && $0.date < session.date }.max { $0.date < $1.date }
    }
    private var activeSessionID: String? { showingPrevious ? previousSession?.id : session?.id }
    private var visibleSections: [HomeworkSection] { data.sections.filter { $0.sessionId == activeSessionID }.sorted { $0.kind.rawValue < $1.kind.rawValue } }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Bài tập về nhà").appText(AppText.title)
            AppSegmented(options: [.init(value: "previous", label: "Bài tập buổi trước"), .init(value: "today", label: "Bài tập hôm nay")], value: showingPrevious ? "previous" : "today") { showingPrevious = $0 == "previous" }
            if let session, session.status == .cancelled {
                AppCard { Text("Buổi học đã hủy nên không giao hoặc chấm bài tập.").appText(AppText.body) }
            } else if visibleSections.isEmpty {
                AppEmptyState(title: showingPrevious ? "Buổi trước chưa có bài tập" : "Chưa giao bài tập hôm nay")
            } else if showingPrevious {
                ScrollView { VStack(spacing: 12) { ForEach(visibleSections) { section in
                    AppCard { VStack(alignment: .leading, spacing: 10) {
                        HStack { VStack(alignment: .leading, spacing: 4) { Text(kindLabel(section.kind)).appText(AppText.caption).foregroundStyle(AppColors.muted); Text(section.title).appText(AppText.subheading) }; Spacer(); Text(section.description).appText(AppText.muted) }
                        ForEach(data.students.filter { $0.classId == session?.classId && $0.status == .active }) { student in
                            VStack(alignment: .leading, spacing: 6) { Text(student.name).appText(AppText.body); AppHomeworkLevelControl(level: data.grades.first { $0.sectionId == section.id && $0.studentId == student.id }?.level) { level in Task { await data.grade(section, student: student, level: level) } } }
                            if student.id != data.students.last?.id { AppColors.divider.frame(height: 1) }
                        }
                    } }
                } } }
            } else {
                ForEach(visibleSections) { section in AppCard { HStack { VStack(alignment: .leading, spacing: 4) { Text(kindLabel(section.kind)).appText(AppText.caption).foregroundStyle(AppColors.muted); Text(section.title).appText(AppText.subheading); if !section.description.isEmpty { Text(section.description).appText(AppText.muted) } }; Spacer(); Button("Sửa") { selectedSection = section; kind = section.kind; title = section.title; description = section.description; showEditor = true }.appText(AppText.buttonSmall); Button("Xoá") { deletingSection = section }.appText(AppText.buttonSmall).foregroundStyle(AppColors.error) } } }
                if visibleSections.count < 4 { AppButton(title: "+ Thêm phần", variant: .secondary) { selectedSection = nil; title = ""; description = ""; kind = HomeworkKind.allCases.first(where: { k in !visibleSections.contains(where: { $0.kind == k }) }) ?? .vocabulary; showEditor = true } }
            }
            if let message = data.errorMessage { Text(message).appText(AppText.muted).foregroundStyle(AppColors.error) }
        }.padding(16).background(AppColors.background)
        .confirmationDialog("Xoá phần bài tập?", item: $deletingSection) { section in
            Button("Xoá phần", role: .destructive) { Task { await data.deleteSection(section) } }
            Button("Huỷ", role: .cancel) {}
        } message: { _ in Text("Chỉ xoá được phần chưa có em nào được chấm.") }
        .sheet(isPresented: $showEditor) {
            AppSheet(title: selectedSection == nil ? "Thêm phần bài tập" : "Sửa phần bài tập", content: {
                VStack(spacing: 14) {
                    Picker("Phần", selection: $kind) { ForEach(HomeworkKind.allCases, id: \.self) { Text(kindLabel($0)).tag($0) } }.pickerStyle(.segmented)
                    AppTextField(label: "Tiêu đề", text: $title, placeholder: "Nhập tiêu đề")
                    AppTextField(label: "Mô tả", text: $description, placeholder: "Không bắt buộc")
                }
            }, footer: {
                AppButton(title: "Lưu bài tập", size: .large) { guard let target = activeSessionID else { return }; Task { await data.saveSection(sessionID: target, kind: kind, title: title, description: description, section: selectedSection); showEditor = false } }
            }, close: { showEditor = false })
        }
        .task { await data.configure(auth: auth) }
    }

    private func kindLabel(_ kind: HomeworkKind) -> String {
        switch kind { case .vocabulary: "Luyện từ vựng"; case .reading: "Luyện đọc"; case .speaking: "Luyện nói"; case .exercise: "Bài tập" }
    }
}
