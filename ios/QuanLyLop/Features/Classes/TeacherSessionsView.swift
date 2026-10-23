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
                    AppEmptyState(title: String(localized: "feature.classes.ban.khong.co.quyen.xem.buoi.hoc"))
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
                    .accessibilityLabel(String(localized: "feature.classes.them.buoi"))
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
            title: String.localizedStringWithFormat(String(localized: "feature.classes.huy.buoi.hoc.a26a4ee4"), String(describing: (cancelling.map { TeacherFormat.dayMonth($0.date) } ?? ""))),
            message: String(localized: "feature.classes.buoi.hoc.se.uoc.anh.dau.la.a.huy.ban.co.the.khoi"),
            actions: [
                TeacherDialogAction(label: String(localized: "feature.classes.huy.buoi.hoc"), variant: .danger) { cancel() },
                TeacherDialogAction(label: String(localized: "feature.classes.giu.buoi.hoc"), variant: .neutral) { cancelling = nil },
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
            TeacherGroupLabel(text: String(localized: "feature.classes.buoi.hien.tai"))
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
                Text(String(localized: "feature.classes.iem.danh.mo.vao.ngay.hoc"))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            if session.status == .planned && data.canWriteAttendance {
                HStack(spacing: 8) {
                    if session.origin == .manual {
                        AppButton(title: String(localized: "feature.classes.sua.buoi.le"), variant: .secondary) { editing = session }
                    }
                    AppButton(title: String(localized: "feature.classes.huy.buoi.c50dd61d"), variant: .danger) { cancelling = session }
                }
            }
        }
        .padding(TeacherMetrics.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func primaryActionLabel(for session: ClassSession) -> some View {
        let title = session.date == today && session.status == .planned ? String(localized: "feature.classes.iem.danh") : String(localized: "feature.classes.xem.buoi")
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
                    Text(String.localizedStringWithFormat(String(localized: "feature.classes.sap.toi.buoi"), String(describing: (groups.upcoming.count))))
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
            TeacherGroupLabel(text: String(localized: "feature.classes.cac.buoi.a.qua"))
            if groups.past.isEmpty {
                Text(String(localized: "feature.classes.chua.co.buoi.hoc.nao.a.qua"))
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
                        TeacherStatusPill(text: String(localized: "feature.classes.a.huy"), tone: .warning)
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
                    AppButton(title: String(localized: "feature.classes.sua.buoi.le"), variant: .secondary) { editing = session }
                    AppButton(title: String(localized: "feature.classes.huy.buoi.c50dd61d"), variant: .danger) { cancelling = session }
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
        if session.status == .planned && session.date <= today { parts.append(String(localized: "feature.classes.chua.iem.danh")) }
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
                Text(String(localized: "feature.classes.lop.chua.co.buoi.hoc"))
                    .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 28))
                    .foregroundStyle(AppColors.text)
                Text(String(localized: "feature.classes.buoi.hoc.tu.sinh.theo.lich.lap.cua.lop.ban.co.th"))
                    .appText(AppText.body)
                    .foregroundStyle(AppColors.muted)
                    .multilineTextAlignment(.center)
            }
            if data.canWriteAttendance {
                AppButton(title: String(localized: "feature.classes.them.buoi.le"), size: .large) { showingAdd = true }
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
                self.error = String(localized: "feature.classes.khong.huy.uoc.buoi.hoc.vui.long.thu.lai")
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
    @State private var operationID: ClientGeneratedID?

    var body: some View {
        TeacherSheet(title: session == nil ? String(localized: "feature.classes.them.buoi.le") : String(localized: "feature.classes.sua.buoi.le")) {
            VStack(alignment: .leading, spacing: 16) {
                Text(intro)
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                field(String(localized: "feature.classes.ngay.hoc")) {
                    DatePicker("", selection: $date, displayedComponents: .date)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                }
                field(String(localized: "feature.classes.gio.hoc")) {
                    DatePicker("", selection: $time, displayedComponents: .hourAndMinute)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                }
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 4) {
                        Text(String(localized: "feature.classes.ghi.chu")).appText(AppText.label).foregroundStyle(AppColors.text)
                        Text(String(localized: "feature.classes.khong.bat.buoc")).appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                    TextField(String(localized: "feature.classes.vi.du.hoc.bu.buoi.nghi"), text: $note, axis: .vertical)
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
            AppButton(title: saving ? String(localized: "feature.classes.ang.luu") : session == nil ? String(localized: "feature.classes.luu.buoi.hoc") : String(localized: "feature.classes.luu.thay.oi"),
                      size: .large) { Task { await save() } }
                .disabled(saving)
            AppButton(title: String(localized: "feature.classes.ong"), variant: .secondary, size: .large) { dismiss() }
        } close: {
            dismiss()
        }
        .onAppear(perform: load)
    }

    private var intro: String {
        session == nil
            ? String(localized: "feature.classes.tao.mot.buoi.hoc.ngoai.lich.lap.cua.lop")
            : String(localized: "feature.classes.cap.nhat.ngay.gio.hoac.ghi.chu.cho.buoi.ang.cho")
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
        if operationID == nil { operationID = ClientGeneratedID() }
        let day = date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
        let timeText = time.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
        do {
              try await data.addOneOffSession(id: operationID!.rawValue, classID: classID, date: day, time: timeText,
                                            makeup: false, note: note.trimmingCharacters(in: .whitespacesAndNewlines))
            dismiss()
        } catch {
            self.error = String(localized: "feature.classes.khong.luu.uoc.buoi.hoc.hay.kiem.tra.thong.tin.va")
        }
    }
}
