import SwiftUI

/// Điểm danh buổi học (`features/attendance/AttendancePanel.tsx`).
///
/// Bốn trạng thái đúng thứ tự hợp đồng Có mặt → Vắng → Muộn → Có phép; bấm vào nhãn
/// để mở menu chọn trạng thái (vuốt phải: vắng, vuốt trái: muộn là đường phụ, không hiện hướng dẫn).
/// Nút Lưu ghim ở đáy màn, danh sách tự cuộn. Trạng thái được lưu vào
/// `LocalStore` + hàng đợi lệnh trước khi đồng bộ, nên mất mạng vẫn giữ nháp.
struct TeacherAttendanceView: View {
    let session: ClassSession
    @Bindable var data: TeacherFeatureData
    @State private var drafts: [String: TeacherAttendanceDraft] = [:]
    @State private var saveController = AppSaveController()

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
    }

    private var absentCount: Int {
        roster.filter { draft(for: $0).status == .absent }.count
    }

    private var hasChanges: Bool {
        roster.contains { student in
            let stored = data.attendanceFor(sessionID: session.id, studentID: student.id)
            return TeacherAttendanceDraft.hasChanges(draft: drafts[student.id], stored: stored)
        }
    }

    private var warnings: [Student] { data.studentsNeedingAttention(in: roster) }

    private var showsBottomBar: Bool {
        data.canReadAttendance && !roster.isEmpty && (readOnly || !viewOnly)
    }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.listGap) {
                if !data.canReadAttendance {
                    AppEmptyState(title: String(localized: "feature.attendance.ban.khong.co.quyen.xem.iem.danh"))
                } else if roster.isEmpty {
                    AppEmptyState(title: String(localized: "feature.attendance.lop.chua.co.hoc.sinh"))
                } else {
                    if !viewOnly { summaryRow }
                    if readOnly { readOnlyNotice }
                    if !readOnly && !canEdit { permissionNotice }
                    if saveController.error != nil {
                        TeacherErrorBanner(message: String(localized: "feature.attendance.khong.luu.uoc.iem.danh"))
                    }
                    VStack(spacing: TeacherMetrics.listGap) {
                        ForEach(roster) { student in row(student) }
                    }
                    if !warnings.isEmpty && !viewOnly { attentionCard }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, 4)
            .padding(.bottom, TeacherMetrics.cardPadding)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if showsBottomBar { bottomBar }
        }
    }

    /// Nút Lưu luôn ghim đáy màn (không cuộn theo danh sách). Image 17 giữ nút “Điểm danh” xám
    /// khi buổi chưa tới ngày; nhãn và màu nền xám theo `.stickyBar > button:disabled`.
    @ViewBuilder private var bottomBar: some View {
        TeacherPinnedBar {
            if readOnly {
                Text(String(localized: "feature.attendance.iem.danh"))
                    .appText(AppText.buttonLarge)
                    .foregroundStyle(AppColors.muted)
                    .frame(maxWidth: .infinity, minHeight: AppMetrics.buttonHeightLarge)
                    .background(AppColors.inputBorder, in: RoundedRectangle(cornerRadius: AppRadius.button))
                    .accessibilityLabel(String(localized: "feature.attendance.iem.danh"))
            } else {
                AppSaveButton(title: String(localized: "feature.attendance.luu.iem.danh"),
                              controller: saveController, isEnabled: hasChanges, identifier: "attendance.save") {
                    try await data.saveAttendance(session: session, drafts: drafts)
                    drafts.removeAll()
                    await data.saveStatusSource?.refresh()
                }
                .frame(maxWidth: .infinity)
                if !hasChanges && saveController.error == nil && saveController.phase == .idle {
                    Text(String(localized: "attendance.save.no_changes", table: "Teacher"))
                        .appText(AppText.caption)
                        .foregroundStyle(AppColors.muted)
                } else if let source = data.saveStatusSource {
                    AppSaveStatus(kind: saveController.error == nil ? source.kind : .error)
                } else {
                    AppSaveStatus(kind: saveController.error == nil ? .savedLocal : .error)
                }
            }
        }
    }

    private var summaryRow: some View {
        HStack(spacing: 8) {
            HStack(spacing: 0) {
                Text("\(absentCount)")
                    .appText(AppTextStyle(size: 14, weight: .bold, lineHeight: 21))
                    .foregroundStyle(AppColors.error)
                Text(String(localized: "feature.attendance.vang.mat")).appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            Spacer(minLength: 0)
            AppButton(title: String(localized: "feature.attendance.tat.ca.co.mat"), variant: .secondary) {
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
            Text(String.localizedStringWithFormat(String(localized: "feature.attendance.chi.iem.danh.uoc.tu.ngay.hoc.tro.i.bay.gio.ban.c"), String(describing: (TeacherFormat.dayMonth(session.date)))))
                .appText(AppText.muted)
                .foregroundStyle(AppColors.primaryInk)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
        .accessibilityIdentifier("attendance.readOnlyNotice")
    }

    private var permissionNotice: some View {
        Text(String(localized: "feature.attendance.ban.chi.co.quyen.xem.iem.danh.cua.buoi.hoc.nay"))
            .appText(AppText.muted)
            .foregroundStyle(AppColors.primaryInk)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private var attentionCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(String(localized: "feature.attendance.can.chu.y"))
                .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24))
                .foregroundStyle(AppColors.text)
            ForEach(warnings) { student in
                Text(String.localizedStringWithFormat(String(localized: "feature.attendance.vang.it.nhat.2.buoi.lien.tiep"), String(describing: (student.name))))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        .accessibilityIdentifier("attendance.warning")
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
                Text(String(localized: "feature.attendance.en.luc"))
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
                    .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.attendance.gio.en.muon.cua"), String(describing: (student.name))))
            }
            TextField("", text: noteBinding(student, value),
                      prompt: Text(String(localized: "feature.attendance.ghi.chu")).foregroundStyle(AppColors.placeholder))
                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                .padding(.horizontal, 10)
                .frame(minHeight: AppMetrics.tap)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.button)
                        .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
                .frame(maxWidth: .infinity)
                .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.attendance.ghi.chu.iem.danh.cua"), String(describing: (student.name))))
        }
    }

    @ViewBuilder private func statusButton(_ student: Student, _ displayed: AttendanceStatus?) -> some View {
        if viewOnly {
            statusPill(displayed, showsChevron: false)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(student.name): \(displayed?.label ?? String(localized: "feature.attendance.chua.iem.danh"))")
        } else {
            Menu {
                Picker("", selection: statusBinding(student)) {
                    ForEach(cycleOrder, id: \.self) {
                        Text($0.label).tag($0).accessibilityIdentifier("attendance.status.\($0.rawValue)")
                    }
                }
            } label: {
                statusPill(displayed, showsChevron: true)
            }
            .accessibilityLabel(String.localizedStringWithFormat(
                String(localized: "attendance.status.a11y", table: "Teacher"), student.name))
            .accessibilityValue(displayed?.label ?? String(localized: "feature.attendance.chua.iem.danh"))
        }
    }

    private func statusPill(_ displayed: AttendanceStatus?, showsChevron: Bool) -> some View {
        HStack(spacing: 4) {
            Text(displayed?.label ?? "–").appText(AppText.pill)
            if showsChevron {
                Image(systemName: "chevron.down").font(.system(size: AppMetrics.pillChevronSize, weight: .semibold))
            }
        }
        .foregroundStyle(pillTone(displayed))
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background(pillBackground(displayed), in: Capsule())
        .frame(minWidth: 96, minHeight: AppMetrics.tap)
        .contentShape(Rectangle())
    }

    private func statusBinding(_ student: Student) -> Binding<AttendanceStatus> {
        Binding(get: { draft(for: student).status },
                set: { newValue in update(student) { $0.status = newValue } })
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

    /// Swipe right marks “Vắng”, swipe left marks “Muộn” (secondary path; no hint text is shown).
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

}
