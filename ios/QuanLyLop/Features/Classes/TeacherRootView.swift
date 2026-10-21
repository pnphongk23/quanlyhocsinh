import SwiftUI

struct TeacherRootView: View {
    @Environment(AuthModel.self) private var auth
    @State private var data = TeacherFeatureData()
    @State private var i4Data = I4FeatureStore()
    @State private var tab = TeacherTab.classes
    @State private var classesPath = NavigationPath()
    @State private var calendarPath = NavigationPath()

    var body: some View {
        VStack(spacing: 0) {
            content
            TeacherTabBar(selection: $tab)
        }
        .background(AppColors.background.ignoresSafeArea())
        .task {
            await data.configure(auth: auth)
            await i4Data.configure(auth: auth)
        }
    }

    @ViewBuilder private var content: some View {
        switch tab {
        case .classes:
            NavigationStack(path: $classesPath) {
                TeacherClassListView(data: data, i4Data: i4Data, selectTab: { tab = $0 })
                    .teacherRoutes(data: data, i4Data: i4Data)
            }
        case .calendar:
            NavigationStack(path: $calendarPath) {
                TeacherScheduleView(data: data, i4Data: i4Data)
                    .teacherRoutes(data: data, i4Data: i4Data)
            }
        case .settings:
            NavigationStack {
                TeacherSettingsView(data: data)
            }
        }
    }
}

enum TeacherTab: Hashable { case classes, calendar, settings }

/// Navigation targets shared by the Lớp and Lịch tabs.
enum TeacherRoute: Hashable {
    case newClass
    case classDetail(String)
    case session(classID: String, sessionID: String)
}

extension View {
    /// Registers the teacher destinations once so both tabs push the same screens.
    func teacherRoutes(data: TeacherFeatureData, i4Data: I4FeatureStore) -> some View {
        navigationDestination(for: TeacherRoute.self) { route in
            switch route {
            case .newClass:
                TeacherNewClassView(data: data)
            case .classDetail(let classID):
                TeacherClassDetailView(classID: classID, data: data, i4Data: i4Data)
            case .session(let classID, let sessionID):
                TeacherSessionDetailView(classID: classID, sessionID: sessionID, data: data, i4Data: i4Data)
            }
        }
    }
}

/// Mobile tab bar (`.tabbar` of `shell.module.css`): 3 items, 12/600 labels and a 3px
/// top border on the active tab.
struct TeacherTabBar: View {
    @Binding var selection: TeacherTab

    private struct Item: Identifiable {
        let tab: TeacherTab
        let label: String
        let systemImage: String
        var id: TeacherTab { tab }
    }

    private let items = [
        Item(tab: .classes, label: "Lớp", systemImage: "book"),
        Item(tab: .calendar, label: "Lịch", systemImage: "calendar"),
        Item(tab: .settings, label: "Cài đặt", systemImage: "slider.horizontal.3"),
    ]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(items) { item in button(item) }
        }
        .padding(.horizontal, 4)
        .background(AppColors.surface)
        .overlay(alignment: .top) { AppColors.border.frame(height: 1) }
    }

    private func button(_ item: Item) -> some View {
        let active = item.tab == selection
        return Button { selection = item.tab } label: {
            VStack(spacing: 4) {
                Image(systemName: item.systemImage)
                    .font(.system(size: 20, weight: .regular))
                Text(item.label)
                    .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
            }
            .foregroundStyle(active ? AppColors.primary : AppColors.muted)
            .frame(maxWidth: .infinity, minHeight: 56)
            .padding(.top, 8)
            .overlay(alignment: .top) {
                (active ? AppColors.primary : .clear).frame(height: 3)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }
}

// MARK: - Lớp của tôi (`ClassListPage.tsx`)

struct TeacherClassListView: View {
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    var selectTab: (TeacherTab) -> Void = { _ in }

    private var classes: [Classroom] { data.classes }
    private var todaySession: ClassSession? {
        data.sessions.first { $0.date == TeacherFormat.todayISO() && $0.status == .planned }
    }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                header
                if let error = data.errorMessage { TeacherErrorBanner(message: error) { Task { await data.refresh() } } }
                if !data.canReadClasses {
                    AppEmptyState(title: "Bạn không có quyền xem lớp học")
                } else if !data.isReady {
                    loadingState
                } else if classes.isEmpty {
                    emptyState
                } else {
                    if let session = todaySession, let klass = data.classroom(id: session.classId) {
                        todayCard(session: session, classroom: klass)
                    }
                    ForEach(classes, id: \.id) { klass in classCard(klass) }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, 96)
        }
        .background(AppColors.background.ignoresSafeArea())
        .overlay(alignment: .bottomTrailing) {
            if data.canWriteClasses {
                TeacherLink(route: .newClass) { TeacherFab() }
                    .accessibilityLabel("Tạo lớp mới")
                .padding(.trailing, 20)
                .padding(.bottom, 16)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await data.refresh() }
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Xin chào, \(data.displayName)")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                Text("Lớp của tôi")
                    .appText(AppText.title)
                    .foregroundStyle(AppColors.text)
            }
            Spacer(minLength: 0)
            Button { selectTab(.settings) } label: {
                TeacherAvatar(initials: settingsInitials, size: AppMetrics.tap)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Cài đặt")
        }
    }

    private var settingsInitials: String {
        let words = data.displayName.split(separator: " ").suffix(2)
        let letters = words.compactMap(\.first).map(String.init).joined().uppercased()
        return letters.isEmpty ? "GV" : letters
    }

    private var loadingState: some View {
        HStack(spacing: 12) {
            AppSpinner()
            Text("Đang tải lớp học").appText(AppText.body).foregroundStyle(AppColors.muted)
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.vertical, 24)
    }

    private var emptyState: some View {
        AppEmptyState(title: "Chưa có lớp học") {
            if data.canWriteClasses {
                TeacherLink(route: .newClass) {
                    Text("Tạo lớp đầu tiên")
                        .appText(AppText.buttonSmall)
                        .foregroundStyle(AppColors.onPrimary)
                        .padding(.horizontal, 16)
                        .frame(minHeight: AppMetrics.tap)
                        .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.button))
                }
            }
        }
    }

    private func todayCard(session: ClassSession, classroom: Classroom) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Hôm nay · \(classroom.startTime ?? session.startTime)")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.onPrimary)
                Text("\(classroom.name) · \(TeacherFeatureData.sessionPrefix(session))")
                    .appText(AppText.heading)
                    .foregroundStyle(AppColors.onPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            TeacherLink(route: .session(classID: classroom.id, sessionID: session.id)) {
                Text("Điểm danh")
                    .appText(AppText.buttonSmall)
                    .foregroundStyle(AppColors.primaryInk)
                    .padding(.horizontal, 16)
                    .frame(minHeight: AppMetrics.tap)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func classCard(_ klass: Classroom) -> some View {
        TeacherLink(route: .classDetail(klass.id)) {
            VStack(alignment: .leading, spacing: 12) {
                Text(klass.name)
                    .appText(AppText.heading)
                    .foregroundStyle(AppColors.text)
                    .lineLimit(1)
                HStack(spacing: 8) {
                    TeacherCountChip(count: "\(data.activeStudents(in: klass.id).count)", after: " học sinh")
                    TeacherCountChip(before: "Chuyên cần ", count: attendanceText(klass))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(TeacherMetrics.cardPadding)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
    }

    /// The prototype chip reads “Chuyên cần <b>97%</b>”; the number is the bold part.
    private func attendanceText(_ klass: Classroom) -> String {
        guard let rate = data.attendanceRate(in: klass.id) else { return "—" }
        return "\(rate)%"
    }
}

// MARK: - Cài đặt (tab hiện có, ngoài phạm vi I-8B)

struct TeacherSettingsView: View {
    @Bindable var data: TeacherFeatureData

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                Text("Cài đặt").appText(AppText.title).foregroundStyle(AppColors.text)
                AppCard {
                    HStack {
                        Text("Vai trò").appText(AppText.label)
                        Spacer()
                        Text(data.roleName).appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                }
                AppCard {
                    HStack {
                        Text("Ngôn ngữ").appText(AppText.label)
                        Spacer()
                        Text("Tiếng Việt").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
        }
        .background(AppColors.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }
}
