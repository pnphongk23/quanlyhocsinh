import SwiftUI

struct SessionCommentsView: View {
    let sessionID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var filter = "Tất cả"
    @State private var editingStudent: Student?
    @State private var selectedStars: Stars?
    @State private var note = ""
    @State private var confirmSend = false
    init(sessionID: String, data: I4FeatureStore = .demo) { self.sessionID = sessionID; self.data = data }
    private var session: ClassSession? { data.sessions.first { $0.id == sessionID } }
    private var students: [Student] {
        data.students.filter { student in
            guard student.classId == session?.classId, student.status == .active else { return false }
            let slip = data.slips.first { $0.sessionId == sessionID && $0.studentId == student.id }
            switch filter { case "Chưa chọn sao": return slip?.stars == nil; case "Chưa gửi": return slip?.status != .sent; default: return true }
        }
    }
    private var selectedCount: Int { data.slips.filter { $0.sessionId == sessionID && $0.stars != nil && $0.status != .sent }.count }
    private var ungradedCount: Int { data.grades.filter { $0.level == nil }.count }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Nhận xét").appText(AppText.title)
            ScrollView(.horizontal, showsIndicators: false) { HStack { ForEach(["Tất cả", "Chưa chọn sao", "Chưa gửi"], id: \.self) { item in AppButton(title: item, variant: filter == item ? .primary : .secondary) { filter = item } } } }
            if students.isEmpty { AppEmptyState(title: "Chưa có học sinh") }
            ForEach(students) { student in
                let slip = data.slips.first { $0.sessionId == sessionID && $0.studentId == student.id }
                Button { editingStudent = student; selectedStars = slip?.stars; note = slip?.note ?? "" } label: {
                    AppListRow { VStack(alignment: .leading, spacing: 4) { Text(student.name).appText(AppText.subheading); Text(slip?.status == .sent ? "Đã gửi" : slip?.stars == nil ? "Chưa chọn sao" : "Bản nháp").appText(AppText.caption).foregroundStyle(slip?.status == .sent ? AppColors.success : AppColors.muted) }; Spacer(); Text(slip?.stars.map { String(repeating: "★", count: $0.rawValue) } ?? "☆ ☆ ☆").foregroundStyle(AppColors.warning); Image(systemName: "chevron.right").foregroundStyle(AppColors.muted) }
                }.buttonStyle(.plain)
            }
            AppButton(title: "Gửi phiếu cả lớp · \(selectedCount)", size: .large) { confirmSend = true }
            if let message = data.errorMessage { Text(message).appText(AppText.muted).foregroundStyle(AppColors.error) }
        }.padding(16).background(AppColors.background)
        .sheet(item: $editingStudent) { student in
            AppSheet(title: "Phiếu buổi học", content: {
                VStack(alignment: .leading, spacing: 16) {
                    Text(student.name).appText(AppText.subheading)
                    HStack(spacing: 12) { ForEach(Stars.allCases, id: \.self) { stars in Button { selectedStars = stars } label: { Text(String(repeating: "★", count: stars.rawValue)).font(.system(size: 22)).foregroundStyle(selectedStars == stars ? AppColors.warning : AppColors.muted).frame(maxWidth: .infinity, minHeight: AppMetrics.tap).background(selectedStars == stars ? AppColors.warningSoft : AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.control)) } } }
                    if let selectedStars { Text(selectedStars.template).appText(AppText.body).foregroundStyle(AppColors.text) }
                    AppTextField(label: "Ghi chú", text: $note, placeholder: "Không bắt buộc")
                    if ungradedCount > 0 { Text("Còn \(ungradedCount) phần BTVN chưa chấm; vẫn có thể gửi phiếu.").appText(AppText.muted).foregroundStyle(AppColors.warning) }
                }
            }, footer: {
                AppButton(title: "Lưu phiếu", size: .large) { guard let stars = selectedStars else { data.errorMessage = "Chọn mức sao trước khi lưu."; return }; Task { await data.saveSlip(sessionID: sessionID, student: student, stars: stars, note: note); editingStudent = nil } }
            }, close: { editingStudent = nil })
        }
        .confirmationDialog("Gửi phiếu cả lớp?", isPresented: $confirmSend, titleVisibility: .visible) {
            Button("Gửi phiếu", role: .destructive) { Task { await data.sendSlips(sessionID: sessionID) } }
            Button("Huỷ", role: .cancel) {}
        } message: { Text(ungradedCount > 0 ? "Có \(ungradedCount) phần BTVN chưa chấm. Phiếu vẫn được gửi; phụ huynh sẽ thấy Chưa chấm." : "Các phiếu đã chọn sao sẽ được gửi cho phụ huynh.") }
        .task { await data.configure(auth: auth) }
    }
}
