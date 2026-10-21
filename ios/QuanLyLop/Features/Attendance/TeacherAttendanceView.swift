import SwiftUI

/// Điểm danh buổi học (`features/attendance/AttendancePanel.tsx`).
///
/// Bốn trạng thái đúng thứ tự hợp đồng Có mặt → Vắng → Muộn → Có phép; bấm vào nhãn
/// để đổi, hoặc vuốt như prototype (phải: vắng, trái: muộn). Trạng thái được lưu vào
/// `LocalStore` + hàng đợi lệnh trước khi đồng bộ, nên mất mạng vẫn giữ nháp.
struct TeacherAttendanceView: View {
    let session: ClassSession
    @Bindable var data: TeacherFeatureData
    @State private var drafts: [String: TeacherAttendanceDraft] = [:]
    @State private var saving = false
    @State private var localError: String?

    private let cycleOrder: [AttendanceStatus] = [.present, .absent, .late, .excused]

    private var today: String { TeacherFormat.todayISO() }
    private var readOnly: Bool { session.date > today }
    private var canEdit: Bool { data.canWriteAttendance }
    private var viewOnly: Bool { readOnly || !canEdit }

    private var roster: [Student] {
        data.students(in: session.classId).filter { TeacherFeatureData.student($0, isEnrolledOn: session.date) }
    }

    private func draft(for student: Student) -> TeacherAttendanceDraft {
        if let draft = drafts[student.id] { return draft }
        let stored = data.attendanceFor(sessionID: session.id, studentID: student.id)
        return TeacherAttendanceDraft(status: stored?.status ?? .present,
                                      lateAt: stored?.lateAt,
                                      note: stored?.note ?? "")
    }

    private func storedStatus(_ student: Student) -> AttendanceStatus? {
        data.attendanceFor(sessionID: session.id, studentID: student.id)?.status
    }

    private func update(_ student: Student, _ change: (inout TeacherAttendanceDraft) -> Void) {
        var value = draft(for: student)
        change(&value)
        drafts[student.id] = value
        localError = nil
    }

    private func cycle(_ student: Student) {
        let current = draft(for: student).status
        let index = cycleOrder.firstIndex(of: current) ?? 0
        update(student) { $0.status = cycleOrder[(index + 1) % cycleOrder.count] }
    }

    private var absentCount: Int {
        roster.filter { draft(for: $0).status == .absent }.count
    }

    private var warnings: [Student] {
        roster.filter { data.hasAbsenceWarning($0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !data.canReadAttendance {
                AppEmptyState(title: "Bạn không có quyền xem điểm danh")
            } else if roster.isEmpty {
                AppEmptyState(title: "Lớp chưa có học sinh")
            } else {
                if !viewOnly { summaryRow }
                if readOnly { readOnlyNotice }
                if !readOnly && !canEdit { permissionNotice }
                if !viewOnly {
                    Text("Vuốt phải: vắng · Vuốt trái: muộn")
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                        .foregroundStyle(AppColors.muted)
                }
                if let localError {
                    TeacherErrorBanner(message: localError) { save() }
                }
                VStack(spacing: 8) {
                    ForEach(roster) { student in row(student) }
                }
                if !viewOnly { attentionCard }
                bottomButton
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 48)
    }

    /// Image 17 keeps a disabled “Điểm danh” button in the same sticky spot; the label and
    /// grey fill come from `.stickyBar > button:disabled`.
    @ViewBuilder private var bottomButton: some View {
        if !viewOnly && !readOnly {
            AppButton(title: saving ? "Đang lưu…" : "Lưu điểm danh", size: .large) { save() }
                .disabled(saving)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.button))
                .padding(.top, 8)
        } else if readOnly {
            Text("Điểm danh")
                .appText(AppText.buttonLarge)
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.buttonHeightLarge)
                .background(AppColors.inputBorder, in: RoundedRectangle(cornerRadius: AppRadius.button))
                .padding(.top, 8)
                .accessibilityLabel("Điểm danh")
        }
    }

    private var summaryRow: some View {
        HStack(spacing: 8) {
            HStack(spacing: 0) {
                Text("\(absentCount)")
                    .appText(AppTextStyle(size: 14, weight: .bold, lineHeight: 21))
                    .foregroundStyle(AppColors.error)
                Text(" vắng mặt").appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            Spacer(minLength: 0)
            AppButton(title: "Tất cả có mặt", variant: .secondary) {
                for student in roster { update(student) { $0.status = .present } }
            }
        }
        .padding(.top, 8)
    }

    private var readOnlyNotice: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "lock")
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(AppColors.primaryInk)
            Text("Chỉ điểm danh được từ ngày học (\(TeacherFormat.dayMonth(session.date))) trở đi. Bây giờ bạn chỉ xem hoặc huỷ buổi.")
                .appText(AppText.muted)
                .foregroundStyle(AppColors.primaryInk)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private var permissionNotice: some View {
        Text("Bạn chỉ có quyền xem điểm danh của buổi học này.")
            .appText(AppText.muted)
            .foregroundStyle(AppColors.primaryInk)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private var attentionCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Cần chú ý")
                .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24))
                .foregroundStyle(AppColors.text)
            if warnings.isEmpty {
                Text("Chưa có học sinh vắng 2 buổi liên tiếp.")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            } else {
                ForEach(warnings) { student in
                    Text("\(student.name) vắng ít nhất 2 buổi liên tiếp.")
                        .appText(AppText.muted)
                        .foregroundStyle(AppColors.muted)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func row(_ student: Student) -> some View {
        let value = draft(for: student)
        let displayed: AttendanceStatus? = viewOnly ? storedStatus(student) : value.status
        return VStack(spacing: 0) {
            HStack(spacing: 8) {
                TeacherAvatar(name: student.name, size: 36)
                VStack(alignment: .leading, spacing: 4) {
                    Text(student.name)
                        .appText(AppTextStyle(size: 16, weight: .medium, lineHeight: 24))
                        .foregroundStyle(AppColors.text)
                    if !viewOnly && value.status == .late { lateFields(student, value) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                statusButton(student, displayed)
            }
            .padding(.leading, 12)
            .padding(.trailing, 8)
            .padding(.vertical, 6)
            .frame(minHeight: TeacherMetrics.rowMinHeight)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
            .opacity(readOnly ? 0.6 : 1)
            .gesture(swipeGesture(student))
        }
    }

    private func lateFields(_ student: Student, _ value: TeacherAttendanceDraft) -> some View {
        HStack(spacing: 8) {
            HStack(spacing: 6) {
                Text("Đến lúc")
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                    .foregroundStyle(AppColors.muted)
                TextField("", text: lateAtBinding(student, value),
                          prompt: Text("18:00").foregroundStyle(AppColors.placeholder))
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                    .keyboardType(.numbersAndPunctuation)
                    .padding(.horizontal, 10)
                    .frame(minHeight: AppMetrics.tap)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
                    .overlay(
                        RoundedRectangle(cornerRadius: AppRadius.button)
                            .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
                    .frame(maxWidth: 96)
                    .accessibilityLabel("Giờ đến muộn của \(student.name)")
            }
            TextField("", text: noteBinding(student, value),
                      prompt: Text("Ghi chú").foregroundStyle(AppColors.placeholder))
                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                .padding(.horizontal, 10)
                .frame(minHeight: AppMetrics.tap)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.button)
                        .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
                .frame(maxWidth: .infinity)
                .accessibilityLabel("Ghi chú điểm danh của \(student.name)")
        }
    }

    private func statusButton(_ student: Student, _ displayed: AttendanceStatus?) -> some View {
        Button {
            guard !viewOnly else { return }
            cycle(student)
        } label: {
            Text(displayed?.label ?? "–")
                .appText(AppText.pill)
                .foregroundStyle(pillTone(displayed))
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(pillBackground(displayed), in: Capsule())
                .frame(minWidth: 96, minHeight: AppMetrics.tap)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(viewOnly)
        .accessibilityLabel(accessibilityLabel(student, displayed))
    }

    private func accessibilityLabel(_ student: Student, _ displayed: AttendanceStatus?) -> String {
        let state = displayed?.label ?? "Chưa điểm danh"
        return viewOnly ? "\(student.name): \(state)" : "\(student.name): \(state). Bấm để đổi"
    }

    private func pillTone(_ status: AttendanceStatus?) -> Color {
        switch status {
        case .present: AppColors.success
        case .late: AppColors.warning
        case .excused: AppColors.primaryInk
        case .absent: AppColors.error
        case nil: AppColors.muted
        }
    }

    private func pillBackground(_ status: AttendanceStatus?) -> Color {
        switch status {
        case .present: AppColors.successSoft
        case .late: AppColors.warningSoft
        case .excused: AppColors.primarySoft
        case .absent: AppColors.errorSoft
        case nil: AppColors.neutralSoft
        }
    }

    /// Swipe right marks “Vắng”, swipe left marks “Muộn”, same as the prototype hint.
    private func swipeGesture(_ student: Student) -> some Gesture {
        DragGesture(minimumDistance: 24)
            .onEnded { value in
                guard !viewOnly else { return }
                let dx = value.translation.width
                guard abs(dx) > abs(value.translation.height) * 1.2, abs(dx) >= 64 else { return }
                update(student) { $0.status = dx < 0 ? .late : .absent }
            }
    }

    private func lateAtBinding(_ student: Student, _ value: TeacherAttendanceDraft) -> Binding<String> {
        Binding(get: { value.lateAt ?? "" },
                set: { newValue in update(student) { $0.lateAt = newValue } })
    }

    private func noteBinding(_ student: Student, _ value: TeacherAttendanceDraft) -> Binding<String> {
        Binding(get: { value.note },
                set: { newValue in update(student) { $0.note = newValue } })
    }

    private func save() {
        guard !viewOnly else { return }
        saving = true
        Task {
            defer { saving = false }
            do {
                try await data.saveAttendance(session: session, drafts: drafts)
                drafts.removeAll()
                localError = nil
            } catch {
                localError = "Không lưu được điểm danh."
            }
        }
    }
}
