import SwiftUI

// MARK: - Tab Học sinh (`StudentsPage.tsx`)

struct TeacherStudentsView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @State private var showingAdd = false
    @State private var selectedStudent: Student?
    @State private var leaving: Student?
    @State private var editingPhone: Student?
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
                    AppEmptyState(title: String(localized: "feature.classes.chua.co.hoc.sinh")) {
                        Text(String(localized: "feature.classes.them.hoc.sinh.e.bat.au.quan.ly.lop"))
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
                    .accessibilityLabel(String(localized: "feature.classes.them.hoc.sinh"))
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
        .sheet(item: $selectedStudent) { student in optionsSheet(student) }
        .sheet(item: $editingPhone) { student in phoneSheet(student) }
        .sheet(item: $leaving) { student in leaveSheet(student) }
    }

    private var statsLine: String {
        let left = students.count - activeCount
        let warnings = data.absenceWarningCount(in: classID)
        return String.localizedStringWithFormat(String(localized: "feature.classes.ang.hoc.a.nghi.giu.lich.su.vang.2.buoi.lien"), String(describing: (activeCount)), String(describing: (left)), String(describing: (warnings)))
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
            if student.status == .left { TeacherStatusPill(text: String(localized: "feature.classes.a.nghi"), tone: .neutral) }
            if data.canWriteStudents {
                TeacherIconButton(systemImage: "ellipsis", label: String.localizedStringWithFormat(String(localized: "feature.classes.tuy.chon"), String(describing: (student.name))),
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
            return String(localized: "feature.classes.chua.co.so.ien.thoai.phu.huynh")
        }
        return String.localizedStringWithFormat(String(localized: "feature.classes.phu.huynh"), String(describing: (phone)))
    }

    private func enrollmentLine(_ student: Student) -> String {
        var line = String.localizedStringWithFormat(String(localized: "feature.classes.vao.lop"), String(describing: (TeacherFormat.date(student.enrolledAt))))
        if let leftAt = student.leftAt { line += String.localizedStringWithFormat(String(localized: "feature.classes.roi.lop"), String(describing: (TeacherFormat.date(leftAt)))) }
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
            markLeft: {
                selectedStudent = nil
                leaving = student
            },
            close: { selectedStudent = nil })
    }

    private func phoneSheet(_ student: Student) -> some View {
        TeacherParentPhoneSheet(student: student, data: data) { error = $0 }
    }

    private func leaveSheet(_ student: Student) -> some View {
        TeacherSheet(title: String(localized: "feature.classes.anh.dau.hoc.sinh.a.nghi")) {
            Text(String(localized: "feature.classes.ngay.nghi.la.hom.nay.iem.va.iem.danh.cu.van.uoc"))
                .appText(AppText.muted)
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        } footer: {
            AppButton(title: String(localized: "feature.classes.xac.nhan.nghi.hoc"), variant: .danger, size: .large) { markLeft(student) }
        } close: {
            leaving = nil
        }
    }

    private func markLeft(_ student: Student) {
        leaving = nil
        Task {
            do {
                try await data.markLeft(student)
                error = nil
            } catch {
                self.error = String(localized: "feature.classes.khong.the.cap.nhat.trang.thai.hoc.sinh")
            }
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
    @State private var operationID: ClientGeneratedID?
    @State private var saveController = AppSaveController()

    var body: some View {
        TeacherSheet(title: String(localized: "feature.classes.them.hoc.sinh")) {
            VStack(alignment: .leading, spacing: 14) {
                TeacherField(label: String(localized: "feature.classes.ho.va.ten.hoc.sinh"), text: $name, identifier: "student.name")
                TeacherField(label: String(localized: "feature.classes.so.ien.thoai.phu.huynh.tuy.chon"), text: $phone,
                             keyboard: .phonePad, identifier: "student.phone")
                Text(String(localized: "feature.classes.chi.luu.so.ien.thoai.trong.ho.so.chua.gui.loi.mo"))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                if let error {
                    Text(error).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
        } footer: {
            VStack(spacing: 8) {
                AppSaveButton(title: String(localized: "feature.classes.luu.hoc.sinh"), controller: saveController,
                              isEnabled: !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                              onSuccess: { dismiss() }) {
                      try await save()
                }
                .frame(maxWidth: .infinity)
                saveStatus
            }
        } close: {
            dismiss()
        }
    }

    private func save() async throws {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            error = String(localized: "feature.classes.nhap.ho.va.ten.hoc.sinh")
            throw TeacherDataFailure.unavailable
        }
        if operationID == nil { operationID = ClientGeneratedID() }
        do {
              try await data.addStudent(id: operationID!.rawValue, to: classID, name: trimmed, parentPhone: phone)
              error = nil
          } catch {
            self.error = String(localized: "feature.classes.khong.the.luu.hoc.sinh.vui.long.thu.lai")
            throw error
        }
    }

    @ViewBuilder private var saveStatus: some View {
        if saveController.error != nil {
            AppSaveStatus(kind: .error)
        } else if let source = data.saveStatusSource {
            AppSaveStatus(kind: source.kind)
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
    @State private var saveController = AppSaveController()

    init(student: Student, data: TeacherFeatureData, onError: @escaping (String) -> Void) {
        self.student = student
        self.data = data
        self.onError = onError
        _phone = State(initialValue: student.parentPhone ?? "")
    }

    var body: some View {
        TeacherSheet(title: String(localized: "feature.classes.sua.so.ien.thoai.phu.huynh")) {
            VStack(alignment: .leading, spacing: 14) {
                TeacherField(label: String(localized: "feature.classes.so.ien.thoai.phu.huynh"), text: $phone, keyboard: .phonePad,
                             identifier: "student.parentPhone")
                if let error {
                    Text(error).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
        } footer: {
            VStack(spacing: 8) {
                AppSaveButton(title: String(localized: "feature.classes.luu.so.ien.thoai"), controller: saveController,
                              isEnabled: phone != (student.parentPhone ?? ""), onSuccess: { dismiss() }) {
                      try await save()
                }
                .frame(maxWidth: .infinity)
                if saveController.error != nil {
                    AppSaveStatus(kind: .error)
                } else if let source = data.saveStatusSource {
                    AppSaveStatus(kind: source.kind)
                }
            }
        } close: {
            dismiss()
        }
    }

    private func save() async throws {
        do {
              try await data.updateStudent(student, parentPhone: phone)
              error = nil
          } catch {
            let message = String(localized: "feature.classes.khong.cap.nhat.uoc.so.ien.thoai")
            self.error = message
            onError(message)
            throw error
        }
    }
}

/// “Tuỳ chọn học sinh” sheet; phone editing and marking a student as left stay available.
struct TeacherStudentOptionsSheet: View {
    let student: Student
    var editPhone: () -> Void
    var markLeft: () -> Void
    var close: () -> Void

    var body: some View {
        TeacherSheet(title: String(localized: "feature.classes.tuy.chon.hoc.sinh")) {
            VStack(spacing: 10) {
                if student.status == .active {
                    AppButton(title: String(localized: "feature.classes.sua.so.ien.thoai"), variant: .secondary, size: .large, action: editPhone)
                    AppButton(title: String(localized: "feature.classes.anh.dau.nghi"), variant: .danger, size: .large, action: markLeft)
                } else {
                    Text(String(localized: "feature.classes.hoc.sinh.a.nghi.iem.va.iem.danh.cu.van.uoc.giu.t"))
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
