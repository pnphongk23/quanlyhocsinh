import SwiftUI

// MARK: - Tab Học sinh (`StudentsPage.tsx`)

struct TeacherStudentsView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @State private var showingAdd = false
    @State private var selectedStudent: Student?
    @State private var leaving: Student?
    @State private var editingPhone: Student?
    @State private var revealedPassword: PasswordReveal?
    @State private var error: String?

    init(classID: String, data: TeacherFeatureData, showsAdd: Bool = false, optionStudent: Student? = nil) {
        self.classID = classID
        _data = Bindable(data)
        _showingAdd = State(initialValue: showsAdd)
        _selectedStudent = State(initialValue: optionStudent)
    }

    private var students: [Student] { data.students(in: classID) }
    private var activeCount: Int { data.activeStudents(in: classID).count }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                Text(statsLine)
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.9))
                    .foregroundStyle(AppColors.muted)
                if let error { TeacherErrorBanner(message: error) }
                if students.isEmpty {
                    AppEmptyState(title: "Chưa có học sinh") {
                        Text("Thêm học sinh để bắt đầu quản lý lớp.")
                            .appText(AppText.body)
                            .foregroundStyle(AppColors.muted)
                    }
                } else {
                    VStack(spacing: TeacherMetrics.listGap) {
                        ForEach(students) { student in card(student) }
                    }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, 4)
            .padding(.bottom, 96)
        }
        .background(AppColors.background.ignoresSafeArea())
        .overlay(alignment: .bottomTrailing) {
            if data.canWriteStudents {
                Button { showingAdd = true } label: { TeacherFab() }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Thêm học sinh")
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
        .sheet(item: $selectedStudent) { student in optionsSheet(student) }
        .sheet(item: $editingPhone) { student in phoneSheet(student) }
        .sheet(item: $leaving) { student in leaveSheet(student) }
        .sheet(item: $revealedPassword) { reveal in passwordSheet(reveal.value) }
    }

    private var statsLine: String {
        let left = students.count - activeCount
        let warnings = data.absenceWarningCount(in: classID)
        return "\(activeCount) đang học · \(left) đã nghỉ (giữ lịch sử) · \(warnings) vắng 2 buổi liền"
    }

    private func card(_ student: Student) -> some View {
        HStack(spacing: 12) {
            TeacherAvatar(name: student.name, size: 40)
            VStack(alignment: .leading, spacing: 2) {
                Text(student.name)
                    .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 21.6))
                    .foregroundStyle(AppColors.text)
                Text(parentLine(student))
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                    .foregroundStyle(AppColors.muted)
                Text(enrollmentLine(student))
                    .appText(AppTextStyle(size: 12, weight: .regular, lineHeight: 16.8))
                    .foregroundStyle(AppColors.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if student.status == .left { TeacherStatusPill(text: "Đã nghỉ", tone: .neutral) }
            if data.canWriteStudents {
                TeacherIconButton(systemImage: "ellipsis", label: "Tuỳ chọn \(student.name)",
                                  tint: AppColors.muted) { selectedStudent = student }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(minHeight: 64)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func parentLine(_ student: Student) -> String {
        guard let phone = student.parentPhone, !phone.isEmpty else {
            return "Chưa có số điện thoại phụ huynh"
        }
        return "Phụ huynh · \(phone)"
    }

    private func enrollmentLine(_ student: Student) -> String {
        var line = "Vào lớp \(TeacherFormat.date(student.enrolledAt))"
        if let leftAt = student.leftAt { line += " · Rời lớp \(TeacherFormat.date(leftAt))" }
        return line
    }

    private var addSheet: some View {
        TeacherAddStudentSheet(classID: classID, data: data)
    }

    private func optionsSheet(_ student: Student) -> some View {
        TeacherStudentOptionsSheet(
            student: student,
            editPhone: {
                selectedStudent = nil
                editingPhone = student
            },
            issuePassword: {
                selectedStudent = nil
                Task { await issuePassword(student) }
            },
            markLeft: {
                selectedStudent = nil
                leaving = student
            },
            close: { selectedStudent = nil })
    }

    private func phoneSheet(_ student: Student) -> some View {
        TeacherParentPhoneSheet(student: student, data: data) { message in
            editingPhone = nil
            error = message
        }
    }

    private func leaveSheet(_ student: Student) -> some View {
        TeacherSheet(title: "Đánh dấu học sinh đã nghỉ?") {
            Text("Ngày nghỉ là hôm nay. Điểm và điểm danh cũ vẫn được giữ trong lịch sử lớp.")
                .appText(AppText.muted)
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        } footer: {
            AppButton(title: "Xác nhận nghỉ học", variant: .danger, size: .large) { markLeft(student) }
        } close: {
            leaving = nil
        }
    }

    private func passwordSheet(_ password: String) -> some View {
        TeacherSheet(title: "Mật khẩu tạm") {
            VStack(alignment: .leading, spacing: 12) {
                Text(password)
                    .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 28))
                    .foregroundStyle(AppColors.text)
                    .textSelection(.enabled)
                Text("Hãy gửi mật khẩu cho phụ huynh. Mật khẩu này chỉ hiển thị một lần.")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } footer: {
            AppButton(title: "Đã hiểu", size: .large) { revealedPassword = nil }
        } close: {
            revealedPassword = nil
        }
    }

    private func markLeft(_ student: Student) {
        leaving = nil
        Task {
            do {
                try await data.markLeft(student)
                error = nil
            } catch {
                self.error = "Không thể cập nhật trạng thái học sinh."
            }
        }
    }

    private func issuePassword(_ student: Student) async {
        do {
            let password = try await data.issueGuardianPassword(for: student)
            revealedPassword = PasswordReveal(value: password)
        } catch {
            self.error = "Không cấp được mật khẩu. SĐT này không tự đặt lại được hoặc phụ huynh chưa có SĐT."
        }
    }
}

struct TeacherAddStudentSheet: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    @Bindable var data: TeacherFeatureData
    @State private var name = ""
    @State private var phone = ""
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        TeacherSheet(title: "Thêm học sinh") {
            VStack(alignment: .leading, spacing: 14) {
                TeacherField(label: "Họ và tên học sinh", text: $name, identifier: "student.name")
                TeacherField(label: "Số điện thoại phụ huynh (tuỳ chọn)", text: $phone,
                             keyboard: .phonePad, identifier: "student.phone")
                Text("Chỉ lưu số điện thoại trong hồ sơ. Chưa gửi lời mời hoặc tin nhắn.")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                if let error {
                    Text(error).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
        } footer: {
            AppButton(title: saving ? "Đang lưu…" : "Lưu học sinh", size: .large) { Task { await save() } }
                .disabled(saving)
        } close: {
            dismiss()
        }
    }

    private func save() async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            error = "Nhập họ và tên học sinh."
            return
        }
        saving = true
        defer { saving = false }
        do {
            try await data.addStudent(to: classID, name: trimmed, parentPhone: phone)
            dismiss()
        } catch {
            self.error = "Không thể lưu học sinh. Vui lòng thử lại."
        }
    }
}

struct TeacherParentPhoneSheet: View {
    @Environment(\.dismiss) private var dismiss
    let student: Student
    @Bindable var data: TeacherFeatureData
    var onError: (String) -> Void
    @State private var phone: String
    @State private var error: String?
    @State private var saving = false

    init(student: Student, data: TeacherFeatureData, onError: @escaping (String) -> Void) {
        self.student = student
        self.data = data
        self.onError = onError
        _phone = State(initialValue: student.parentPhone ?? "")
    }

    var body: some View {
        TeacherSheet(title: "Sửa số điện thoại phụ huynh") {
            VStack(alignment: .leading, spacing: 14) {
                TeacherField(label: "Số điện thoại phụ huynh", text: $phone, keyboard: .phonePad,
                             identifier: "student.parentPhone")
                if let error {
                    Text(error).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
        } footer: {
            AppButton(title: saving ? "Đang lưu…" : "Lưu số điện thoại", size: .large) { Task { await save() } }
                .disabled(saving)
        } close: {
            dismiss()
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        do {
            try await data.updateStudent(student, parentPhone: phone)
            dismiss()
        } catch {
            let message = "Không cập nhật được số điện thoại."
            self.error = message
            onError(message)
        }
    }
}

/// One-time guardian password shown in a sheet exactly once (spec mục 4).
struct PasswordReveal: Identifiable {
    let id = UUID()
    let value: String
}

/// “Tuỳ chọn học sinh” sheet. The mobile prototype only lists “Đánh dấu nghỉ”; the two
/// account actions come from brief I-8B (sửa SĐT, cấp mật khẩu) and keep the same rows.
struct TeacherStudentOptionsSheet: View {
    let student: Student
    var editPhone: () -> Void
    var issuePassword: () -> Void
    var markLeft: () -> Void
    var close: () -> Void

    var body: some View {
        TeacherSheet(title: "Tuỳ chọn học sinh") {
            VStack(spacing: 10) {
                if student.status == .active {
                    AppButton(title: "Sửa số điện thoại", variant: .secondary, size: .large, action: editPhone)
                    AppButton(title: "Cấp mật khẩu", variant: .secondary, size: .large, action: issuePassword)
                    AppButton(title: "Đánh dấu nghỉ", variant: .danger, size: .large, action: markLeft)
                } else {
                    Text("Học sinh đã nghỉ. Điểm và điểm danh cũ vẫn được giữ trong lịch sử lớp.")
                        .appText(AppText.muted)
                        .foregroundStyle(AppColors.muted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        } close: {
            close()
        }
    }
}
