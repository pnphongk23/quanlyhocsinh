import SwiftUI

// MARK: - Tab Buổi học (`SessionsTab.tsx`)

struct TeacherSessionsView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var showingAdd = false
    @State private var editing: ClassSession?
    @State private var cancelling: ClassSession?
    @State private var error: String?
    @State private var upcomingOpen = false

    private var today: String { TeacherFormat.todayISO() }
    private var groups: (current: [ClassSession], upcoming: [ClassSession], past: [ClassSession]) {
        data.splitSessions(in: classID, today: today)
    }
    private var spotlight: ClassSession? { groups.current.first }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                if let error { TeacherErrorBanner(message: error) }
                if !data.canReadAttendance {
                    AppEmptyState(title: "Bạn không có quyền xem buổi học")
                } else if data.sessions(in: classID).isEmpty {
                    emptyBlock
                } else {
                    sections
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, 4)
            .padding(.bottom, 96)
        }
        .background(AppColors.background.ignoresSafeArea())
        .overlay(alignment: .bottomTrailing) {
            if data.canWriteAttendance {
                Button { showingAdd = true } label: { TeacherFab() }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Thêm buổi")
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
            }
        }
        .sheet(isPresented: $showingAdd) {
            TeacherExtraSessionSheet(classID: classID, data: data, session: nil)
        }
        .sheet(isPresented: Binding(get: { editing != nil }, set: { if !$0 { editing = nil } })) {
            TeacherExtraSessionSheet(classID: classID, data: data, session: editing)
        }
        .teacherConfirmDialog(
            isPresented: Binding(get: { cancelling != nil }, set: { if !$0 { cancelling = nil } }),
            title: "Huỷ buổi học \(cancelling.map { TeacherFormat.dayMonth($0.date) } ?? "")?",
            message: "Buổi học sẽ được đánh dấu là đã huỷ. Bạn có thể khôi phục lại sau.",
            actions: [
                TeacherDialogAction(label: "Huỷ buổi học", variant: .danger) { cancel() },
                TeacherDialogAction(label: "Giữ buổi học", variant: .neutral) { cancelling = nil },
            ],
            dismiss: { cancelling = nil })
    }

    @ViewBuilder private var sections: some View {
        if let spotlight { currentSection(spotlight) }
        if !groups.upcoming.isEmpty { upcomingSection }
        pastSection
    }

    private func currentSection(_ session: ClassSession) -> some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            TeacherGroupLabel(text: "Buổi hiện tại")
            currentCard(session)
        }
    }

    private func currentCard(_ session: ClassSession) -> some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(TeacherFeatureData.sessionPrefix(session)) · \(TeacherFormat.weekdayDate(session.date))")
                    .appText(AppTextStyle(size: 18, weight: .bold, lineHeight: 23.4))
                    .foregroundStyle(AppColors.text)
                    .fixedSize(horizontal: false, vertical: true)
                Text(session.startTime)
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            TeacherLink(route: .session(classID: classID, sessionID: session.id)) {
                primaryActionLabel(for: session)
            }
            if session.date > today && session.status == .planned {
                Text("Điểm danh mở vào ngày học.")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            if session.status == .planned && data.canWriteAttendance {
                HStack(spacing: 8) {
                    if session.origin == .manual {
                        AppButton(title: "Sửa buổi lẻ", variant: .secondary) { editing = session }
                    }
                    AppButton(title: "Hủy buổi", variant: .danger) { cancelling = session }
                }
            }
        }
        .padding(TeacherMetrics.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func primaryActionLabel(for session: ClassSession) -> some View {
        let title = session.date == today && session.status == .planned ? "Điểm danh" : "Xem buổi"
        return Text(title)
            .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
            .foregroundStyle(AppColors.onPrimary)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private var upcomingSection: some View {
        VStack(spacing: 0) {
            Button { upcomingOpen.toggle() } label: {
                HStack(spacing: 12) {
                    Text("Sắp tới (\(groups.upcoming.count) buổi)")
                        .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22))
                        .foregroundStyle(AppColors.text)
                    Spacer(minLength: 0)
                    Image(systemName: upcomingOpen ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppColors.muted)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .frame(minHeight: AppMetrics.tap)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if upcomingOpen {
                AppColors.divider.frame(height: 1)
                VStack(spacing: TeacherMetrics.listGap) {
                    ForEach(groups.upcoming) { session in
                        sessionRow(session, surfaceOnBackground: true)
                    }
                }
                .padding(8)
            }
        }
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var pastSection: some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            TeacherGroupLabel(text: "Các buổi đã qua")
            if groups.past.isEmpty {
                Text("Chưa có buổi học nào đã qua.")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            } else {
                VStack(spacing: TeacherMetrics.listGap) {
                    ForEach(groups.past) { session in sessionRow(session, surfaceOnBackground: false) }
                }
            }
        }
    }

    private func sessionRow(_ session: ClassSession, surfaceOnBackground: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            TeacherLink(route: .session(classID: classID, sessionID: session.id)) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(TeacherFeatureData.sessionPrefix(session)) · \(TeacherFormat.weekdayDate(session.date))")
                            .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                            .foregroundStyle(AppColors.text)
                            .multilineTextAlignment(.leading)
                        Text(meta(session))
                            .appText(AppText.muted)
                            .foregroundStyle(AppColors.muted)
                            .multilineTextAlignment(.leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if session.status == .cancelled {
                        TeacherStatusPill(text: "Đã huỷ", tone: .warning)
                    } else {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppColors.muted)
                            .frame(width: 44)
                    }
                }
                .padding(.leading, 16)
                .padding(.trailing, session.status == .cancelled ? 16 : 8)
                .padding(.vertical, 8)
                .frame(minHeight: TeacherMetrics.rowMinHeight)
                .contentShape(Rectangle())
            }
            if session.origin == .manual && session.status == .planned && data.canWriteAttendance {
                HStack(spacing: 8) {
                    AppButton(title: "Sửa buổi lẻ", variant: .secondary) { editing = session }
                    AppButton(title: "Hủy buổi", variant: .danger) { cancelling = session }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
            }
        }
        .background(surfaceOnBackground ? AppColors.background : AppColors.surface,
                    in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private func meta(_ session: ClassSession) -> String {
        var parts = [session.startTime]
        if session.status == .planned && session.date <= today { parts.append("Chưa điểm danh") }
        if session.origin == .manual, let note = session.note, !note.isEmpty { parts.append(note) }
        return parts.joined(separator: " · ")
    }

    private var emptyBlock: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar")
                .font(.system(size: 28, weight: .regular))
                .foregroundStyle(AppColors.primaryInk)
                .frame(width: 72, height: 72)
                .background(AppColors.primarySoft, in: Circle())
            VStack(spacing: 8) {
                Text("Lớp chưa có buổi học")
                    .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 28))
                    .foregroundStyle(AppColors.text)
                Text("Buổi học tự sinh theo lịch lặp của lớp. Bạn có thể thêm buổi lẻ ngoài lịch nếu cần.")
                    .appText(AppText.body)
                    .foregroundStyle(AppColors.muted)
                    .multilineTextAlignment(.center)
            }
            if data.canWriteAttendance {
                AppButton(title: "Thêm buổi lẻ", size: .large) { showingAdd = true }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 20)
        .padding(.vertical, 32)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func cancel() {
        guard let session = cancelling else { return }
        cancelling = nil
        Task {
            do {
                try await data.cancel(session)
                error = nil
            } catch {
                self.error = "Không hủy được buổi học. Vui lòng thử lại."
            }
        }
    }
}

// MARK: - Thêm/sửa buổi lẻ (`AddSessionModal.tsx`)

struct TeacherExtraSessionSheet: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    @Bindable var data: TeacherFeatureData
    let session: ClassSession?
    @State private var date = Date.now
    @State private var time = Date.now
    @State private var note = ""
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        TeacherSheet(title: session == nil ? "Thêm buổi lẻ" : "Sửa buổi lẻ") {
            VStack(alignment: .leading, spacing: 16) {
                Text(intro)
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                field("Ngày học") {
                    DatePicker("", selection: $date, displayedComponents: .date)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                }
                field("Giờ học") {
                    DatePicker("", selection: $time, displayedComponents: .hourAndMinute)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                }
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 4) {
                        Text("Ghi chú").appText(AppText.label).foregroundStyle(AppColors.text)
                        Text("(không bắt buộc)").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                    TextField("Ví dụ: Học bù buổi nghỉ", text: $note, axis: .vertical)
                        .appText(AppText.body)
                        .lineLimit(3...5)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
                        .overlay(
                            RoundedRectangle(cornerRadius: AppRadius.button)
                                .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
                }
                if let error {
                    Text(error).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
        } footer: {
            AppButton(title: saving ? "Đang lưu…" : session == nil ? "Lưu buổi học" : "Lưu thay đổi",
                      size: .large) { Task { await save() } }
                .disabled(saving)
            AppButton(title: "Đóng", variant: .secondary, size: .large) { dismiss() }
        } close: {
            dismiss()
        }
        .onAppear(perform: load)
    }

    private var intro: String {
        session == nil
            ? "Tạo một buổi học ngoài lịch lặp của lớp."
            : "Cập nhật ngày, giờ hoặc ghi chú cho buổi đang chờ học."
    }

    private func field<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).appText(AppText.label).foregroundStyle(AppColors.text)
            content()
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(minHeight: AppMetrics.inputHeight)
                .padding(.horizontal, 16)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.button)
                        .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
        }
    }

    private func load() {
        let classTime = data.classroom(id: classID)?.startTime ?? "18:00"
        if let session {
            note = session.note ?? ""
            date = parse(session.date) ?? .now
            time = parseTime(session.startTime) ?? .now
        } else {
            time = parseTime(classTime) ?? .now
        }
    }

    private func parse(_ iso: String) -> Date? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: iso)
    }

    private func parseTime(_ value: String) -> Date? {
        let parts = value.split(separator: ":").compactMap { Int($0) }
        guard let hour = parts.first else { return nil }
        var components = DateComponents()
        components.hour = hour
        components.minute = parts.dropFirst().first ?? 0
        return Calendar.current.date(from: components)
    }

    private func save() async {
        saving = true
        defer { saving = false }
        let day = date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
        let timeText = time.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
        do {
            try await data.addOneOffSession(classID: classID, date: day, time: timeText,
                                            makeup: false, note: note.trimmingCharacters(in: .whitespacesAndNewlines))
            dismiss()
        } catch {
            self.error = "Không lưu được buổi học. Hãy kiểm tra thông tin và thử lại."
        }
    }
}

