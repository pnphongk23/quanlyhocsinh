import SwiftUI

struct SessionCommentsView: View {
    let sessionID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var filter = "Tất cả"
    @State private var editingStudent: StudentSelection?
    @State private var selectedStars: Stars?
    @State private var note = ""
    @State private var confirmSend = false

    init(sessionID: String, data: I4FeatureStore = .demo) {
        self.sessionID = sessionID
        self.data = data
    }

    private let filters = ["Tất cả", "Chưa chọn sao", "Chưa gửi"]

    private var session: ClassSession? {
        data.sessions.first { $0.id == sessionID }
    }

    private var students: [Student] {
        data.students.filter { student in
            guard student.classId == session?.classId, student.status == .active else { return false }
            let slip = slip(for: student)
            switch filter {
            case "Chưa chọn sao": return slip?.stars == nil
            case "Chưa gửi": return slip?.status != .sent
            default: return true
            }
        }
    }

    private var selectedCount: Int {
        data.slips.filter { $0.sessionId == sessionID && $0.stars != nil && $0.status != .sent }.count
    }

    private var ungradedCount: Int {
        data.grades.filter { $0.level == nil }.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Nhận xét").appText(AppText.title)
            filterBar
            if students.isEmpty { AppEmptyState(title: "Chưa có học sinh") }
            ForEach(students, id: \.id) { student in
                studentRow(student)
            }
            AppButton(title: "Gửi phiếu cả lớp · \(selectedCount)", size: .large) { confirmSend = true }
            if let message = data.errorMessage {
                Text(message).appText(AppText.muted).foregroundStyle(AppColors.error)
            }
        }
        .padding(16)
        .background(AppColors.background)
        .sheet(item: $editingStudent) { selection in
            slipSheet(selection.student)
        }
        .confirmationDialog("Gửi phiếu cả lớp?", isPresented: $confirmSend, titleVisibility: .visible) {
            Button("Gửi phiếu", role: .destructive) {
                Task { await data.sendSlips(sessionID: sessionID) }
            }
            Button("Huỷ", role: .cancel) {}
        } message: {
            Text(sendMessage)
        }
        .task { await data.configure(auth: auth) }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(filters, id: \.self) { item in
                    AppButton(title: item, variant: filterBtnVariant(item)) { filter = item }
                }
            }
        }
    }

    private func filterBtnVariant(_ item: String) -> AppButtonStyle.Variant {
        filter == item ? .primary : .secondary
    }

    private var sendMessage: String {
        if ungradedCount > 0 {
            return "Có \(ungradedCount) phần BTVN chưa chấm. Phiếu vẫn được gửi; phụ huynh sẽ thấy Chưa chấm."
        }
        return "Các phiếu đã chọn sao sẽ được gửi cho phụ huynh."
    }

    private func slip(for student: Student) -> SessionSlip? {
        data.slips.first { $0.sessionId == sessionID && $0.studentId == student.id }
    }

    private func studentRow(_ student: Student) -> some View {
        let slip = slip(for: student)
        return Button {
            editingStudent = StudentSelection(student: student)
            selectedStars = slip?.stars
            note = slip?.note ?? ""
        } label: {
            AppListRow {
                studentSummary(student, slip: slip)
                Spacer()
                starText(slip?.stars)
                Image(systemName: "chevron.right").foregroundStyle(AppColors.muted)
            }
        }
        .buttonStyle(.plain)
    }

    private func studentSummary(_ student: Student, slip: SessionSlip?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(student.name).appText(AppText.subheading)
            Text(statusLabel(slip)).appText(AppText.caption).foregroundStyle(statusColor(slip))
        }
    }

    private func statusLabel(_ slip: SessionSlip?) -> String {
        if slip?.status == .sent { return "Đã gửi" }
        return slip?.stars == nil ? "Chưa chọn sao" : "Bản nháp"
    }

    private func statusColor(_ slip: SessionSlip?) -> Color {
        slip?.status == .sent ? AppColors.success : AppColors.muted
    }

    private func starText(_ stars: Stars?) -> some View {
        Text(stars.map { String(repeating: "★", count: $0.rawValue) } ?? "☆ ☆ ☆")
            .foregroundStyle(AppColors.warning)
    }

    private func slipSheet(_ student: Student) -> some View {
        AppSheet(title: "Phiếu buổi học") {
            VStack(alignment: .leading, spacing: 16) {
                Text(student.name).appText(AppText.subheading)
                starPicker
                if let selectedStars {
                    Text(selectedStars.template).appText(AppText.body).foregroundStyle(AppColors.text)
                }
                AppTextField(label: "Ghi chú", text: $note, placeholder: "Không bắt buộc")
                if ungradedCount > 0 {
                    Text("Còn \(ungradedCount) phần BTVN chưa chấm; vẫn có thể gửi phiếu.")
                        .appText(AppText.muted).foregroundStyle(AppColors.warning)
                }
            }
        } footer: {
            AppButton(title: "Lưu phiếu", size: .large) {
                saveSlip(for: student)
            }
        } close: {
            editingStudent = nil
        }
    }

    private var starPicker: some View {
        HStack(spacing: 12) {
            ForEach(Stars.allCases, id: \.self) { stars in
                starOption(stars)
            }
        }
    }

    private func starOption(_ stars: Stars) -> some View {
        let active = selectedStars == stars
        return Button { selectedStars = stars } label: {
            Text(String(repeating: "★", count: stars.rawValue))
                .font(.system(size: 22))
                .foregroundStyle(active ? AppColors.warning : AppColors.muted)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                .background(active ? AppColors.warningSoft : AppColors.background,
                            in: RoundedRectangle(cornerRadius: AppRadius.control))
        }
    }

    private func saveSlip(for student: Student) {
        guard let stars = selectedStars else {
            data.errorMessage = "Chọn mức sao trước khi lưu."
            return
        }
        let draftNote = note
        Task {
            await data.saveSlip(sessionID: sessionID, student: student, stars: stars, note: draftNote)
            editingStudent = nil
        }
    }
}

private struct StudentSelection: Identifiable {
    let student: Student
    var id: String { student.id }
}
