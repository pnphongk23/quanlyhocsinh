import SwiftUI

/// Điểm danh buổi học (`features/attendance/AttendancePanel.tsx`).
///
/// Ba trạng thái Có mặt → Muộn → Vắng; bấm vào nhãn để mở menu chọn trạng thái, hoặc vuốt trái một dòng
/// để hiện ba nút Có mặt / Muộn / Vắng.
/// Nút Lưu ghim ở đáy màn, danh sách tự cuộn. Trạng thái được lưu vào
/// `LocalStore` + hàng đợi lệnh trước khi đồng bộ, nên mất mạng vẫn giữ nháp.
struct TeacherAttendanceView: View {
    let session: ClassSession
    @Bindable var data: TeacherFeatureData
    @State private var drafts: [String: TeacherAttendanceDraft] = [:]
    @State private var saveController = AppSaveController()
    /// The row whose three status buttons are open, and the row being dragged with its horizontal travel.
    @State private var revealedID: String?
    @State private var dragging: (id: String, dx: CGFloat)?

    private let cycleOrder: [AttendanceStatus] = [.present, .late, .absent]

    private var today: String { TeacherFormat.todayISO() }
    private var readOnly: Bool { session.date > today }
    private var canEdit: Bool { data.canWriteAttendance }
    private var viewOnly: Bool { readOnly || !canEdit }

    private var roster: [Student] {
        data.students(in: session.classId).filter { TeacherFeatureData.student($0, isEnrolledOn: session.date) }
    }

    /// What the row shows: the teacher's pick, else the saved status, else nil ("Chưa điểm danh").
    private func status(for student: Student) -> AttendanceStatus? {
        drafts[student.id]?.status ?? storedStatus(student)
    }

    private func storedStatus(_ student: Student) -> AttendanceStatus? {
        data.attendanceFor(sessionID: session.id, studentID: student.id)?.status
    }

    private func update(_ student: Student, _ change: (inout TeacherAttendanceDraft) -> Void) {
        var value = drafts[student.id] ?? TeacherAttendanceDraft(status: storedStatus(student) ?? .present)
          change(&value)
          drafts[student.id] = value
    }

    private var absentCount: Int {
        roster.filter { status(for: $0) == .absent }.count
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
            if roster.allSatisfy({ status(for: $0) == nil }) {
                Text(String.localizedStringWithFormat(String(localized: "feature.attendance.chua.iem.danh.n.em"), roster.count))
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
                    .accessibilityIdentifier("attendance.unmarkedSummary")
            } else {
                HStack(spacing: 0) {
                    Text("\(absentCount)")
                        .appText(AppText.label)
                        .foregroundStyle(AppColors.error)
                    Text(String(localized: "feature.attendance.vang.mat")).appText(AppText.muted).foregroundStyle(AppColors.muted)
                }
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
        let displayed: AttendanceStatus? = viewOnly ? storedStatus(student) : status(for: student)
        let content = HStack(spacing: 8) {
            TeacherAvatar(name: student.name, size: 36)
            Text(student.name)
                .appText(AppTextStyle(size: 16, weight: .medium, lineHeight: 24))
                .foregroundStyle(AppColors.text)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            statusButton(student, displayed)
        }
        .padding(.leading, 12)
        .padding(.trailing, 8)
        .padding(.vertical, 6)
        .frame(minHeight: TeacherMetrics.rowMinHeight)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
        .opacity(readOnly ? 0.6 : 1)
        return Group {
            if viewOnly {
                content
            } else {
                content
                    .offset(x: swipeOffset(for: student))
                    .background(alignment: .trailing) {
                        // Only while the row is open or dragged: at rest the buttons would bleed through the rounded corners.
                        if swipeOffset(for: student) != 0 { swipeActions(student, current: displayed) }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.button))
                    .simultaneousGesture(swipeGesture(student))
            }
        }
    }

    private var swipeActionWidth: CGFloat { TeacherMetrics.attendanceSwipeButtonWidth * CGFloat(swipeOrder.count) }
    private let swipeOrder: [AttendanceStatus] = [.present, .late, .absent]

    /// Open row rests at the full width of the three buttons; a drag in progress follows the finger.
    private func swipeOffset(for student: Student) -> CGFloat {
        let base: CGFloat = revealedID == student.id ? -swipeActionWidth : 0
        guard dragging?.id == student.id else { return base }
        return min(0, max(-swipeActionWidth, base + (dragging?.dx ?? 0)))
    }

    private func swipeActions(_ student: Student, current: AttendanceStatus?) -> some View {
        HStack(spacing: 0) {
            ForEach(swipeOrder, id: \.self) { status in
                Button {
                    update(student) { $0.status = status }
                    withAnimation(.easeOut(duration: AppDuration.press)) { revealedID = nil }
                } label: {
                    Text(status.label)
                        .appText(AppText.pill)
                        .foregroundStyle(pillTone(status))
                        .frame(width: TeacherMetrics.attendanceSwipeButtonWidth)
                        .frame(maxHeight: .infinity)
                        .background(pillBackground(status))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("attendance.swipe.\(status.rawValue)")
                .accessibilityAddTraits(current == status ? [.isSelected] : [])
            }
        }
    }

    /// Swipe left opens the three status buttons on that row; swiping right or tapping the row closes them.
    private func swipeGesture(_ student: Student) -> some Gesture {
        DragGesture(minimumDistance: 16)
            .onChanged { value in
                guard abs(value.translation.width) > abs(value.translation.height) * 1.2 else { return }
                dragging = (student.id, value.translation.width)
            }
            .onEnded { value in
                defer { dragging = nil }
                guard abs(value.translation.width) > abs(value.translation.height) * 1.2 else { return }
                let base: CGFloat = revealedID == student.id ? -swipeActionWidth : 0
                let end = base + value.translation.width
                withAnimation(.easeOut(duration: AppDuration.press)) {
                    revealedID = end < -swipeActionWidth / 2 ? student.id : nil
                }
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
                        Text($0.label).tag(Optional($0)).accessibilityIdentifier("attendance.status.\($0.rawValue)")
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
            Text(displayed?.label ?? String(localized: "feature.attendance.chua.iem.danh")).appText(AppText.pill)
                .lineLimit(1).fixedSize(horizontal: true, vertical: false)
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

    private func statusBinding(_ student: Student) -> Binding<AttendanceStatus?> {
        Binding(get: { status(for: student) },
                set: { newValue in if let newValue { update(student) { $0.status = newValue } } })
    }

    private func pillTone(_ status: AttendanceStatus?) -> Color {
        switch status {
        case .present, .late, .absent: AppState.selectedFg
        case nil: AppColors.muted
        }
    }

    private func pillBackground(_ status: AttendanceStatus?) -> Color {
        switch status {
        case .present: AppState.successBg
        case .late: AppState.pendingBg
        case .absent: AppState.errorBg
        case nil: AppColors.neutralSoft
        }
    }
}
