import SwiftUI

struct TeacherRootView: View {
    @Environment(AuthModel.self) private var auth
    @State private var data = TeacherFeatureData()
    @State private var i4Data: I4FeatureStore
    @State private var tab: TeacherTab
    @State private var classesPath = NavigationPath()
    @State private var calendarPath = NavigationPath()
    private let accountSettings: (() -> AnyView)?

    init(auth: AuthModel? = nil, initialTab: TeacherTab = .classes, accountSettings: (() -> AnyView)? = nil) {
        _i4Data = State(initialValue: auth.map(I4FeatureStore.init(auth:)) ?? I4FeatureStore())
        _tab = State(initialValue: initialTab)
        self.accountSettings = accountSettings
    }

    #if DEBUG
    /// Screenshot harness only: renders the real tab shell with synthetic data and a pre-pushed route.
    init(demoData: TeacherFeatureData, initialRoutes: [TeacherRoute]) {
        _data = State(initialValue: demoData)
        _i4Data = State(initialValue: I4FeatureStore())
        _tab = State(initialValue: .classes)
        _classesPath = State(initialValue: NavigationPath(initialRoutes))
        accountSettings = nil
    }
    #endif

    /// Cài đặt và Đổi mật khẩu là các màn của mô hình đăng nhập; cả hai nằm trong tab Cài đặt.
    private var tabSelection: Binding<TeacherTab> {
        Binding(get: { auth.screen == .settings || auth.screen == .changePassword ? .settings : tab },
                set: { item in
                    tab = item
                    if auth.screen != .main { auth.show(.main) }
                })
    }

    var body: some View {
        TabView(selection: tabSelection) {
            NavigationStack(path: $classesPath) {
                TeacherClassListView(data: data, i4Data: i4Data)
                    .teacherRoutes(data: data, i4Data: i4Data)
            }
            .tabItem { Label(String(localized: "feature.classes.lop"), systemImage: "book") }
            .tag(TeacherTab.classes)

            NavigationStack(path: $calendarPath) {
                TeacherScheduleView(data: data, i4Data: i4Data)
                    .teacherRoutes(data: data, i4Data: i4Data)
            }
            .tabItem { Label(String(localized: "feature.classes.lich"), systemImage: "calendar") }
            .tag(TeacherTab.calendar)

            NavigationStack {
                if let accountSettings {
                    accountSettings()
                } else {
                    TeacherSettingsView(data: data)
                }
            }
            .tabItem { Label(String(localized: "feature.classes.cai.at"), systemImage: "slider.horizontal.3") }
            .tag(TeacherTab.settings)
        }
        .tint(AppState.selectedFg)
        .task {
            await data.configure(auth: auth)
            await i4Data.configure(auth: auth)
        }
        // A role, permission or class change found by the next `/me` rereads what this role may do.
        .onChange(of: auth.activeMembership) { _, _ in
            Task {
                await data.configure(auth: auth)
                await i4Data.configure(auth: auth)
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

/// Mobile tab bar (`.tabbar` of `shell.module.css`): 3 items with a fill on the selected tab.
struct TeacherTabBar: View {
    @Binding var selection: TeacherTab

    private struct Item: Identifiable {
        let tab: TeacherTab
        let label: String
        let systemImage: String
        var id: TeacherTab { tab }
    }

    private let items = [
        Item(tab: .classes, label: String(localized: "feature.classes.lop"), systemImage: "book"),
        Item(tab: .calendar, label: String(localized: "feature.classes.lich"), systemImage: "calendar"),
        Item(tab: .settings, label: String(localized: "feature.classes.cai.at"), systemImage: "slider.horizontal.3"),
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
              .foregroundStyle(active ? AppState.selectedFg : AppColors.muted)
              .frame(maxWidth: .infinity, minHeight: 56)
              .padding(.horizontal, 8)
              .padding(.top, 8)
              .background(active ? AppState.selectedBg : .clear,
                          in: RoundedRectangle(cornerRadius: AppRadius.segment))
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

    private var classes: [Classroom] { data.classes }
    private var todaySessions: [ClassSession] {
        TeacherFeatureData.todaySessions(data.sessions, classes: data.classes, today: today)
    }
    private var unfinishedSessions: [ClassSession] { data.unfinishedAttendanceSessions(today: today) }
    private var today: String { TeacherFormat.todayISO() }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                greeting
                if let error = data.errorMessage { TeacherErrorBanner(message: error) { Task { await data.refresh() } } }
                if !data.canReadClasses {
                    AppEmptyState(title: String(localized: "feature.classes.ban.khong.co.quyen.xem.lop.hoc"))
                } else if !data.isReady {
                    loadingState
                } else if classes.isEmpty {
                    emptyState
                } else {
                    VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
                        todaySection
                        unfinishedSection
                        classesSection
                    }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, TeacherMetrics.fabContentInset)
        }
        .background(AppColors.background.ignoresSafeArea())
        .overlay(alignment: .bottomTrailing) {
            if data.canWriteClasses {
                TeacherLink(route: .newClass) { TeacherFab() }
                    .accessibilityLabel(String(localized: "feature.classes.tao.lop.moi"))
                .padding(.trailing, TeacherMetrics.fabTrailingInset)
                .padding(.bottom, TeacherMetrics.fabBottomInset)
            }
        }
        .navigationTitle(String(localized: "feature.classes.lop.cua.toi"))
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await data.refresh() }
    }

    private var greeting: some View {
        Text(String.localizedStringWithFormat(String(localized: "feature.classes.xin.chao"), String(describing: (data.displayName))))
            .appText(AppText.muted)
            .foregroundStyle(AppColors.muted)
    }

    private var loadingState: some View {
        HStack(spacing: 12) {
            AppSpinner()
            Text(String(localized: "feature.classes.ang.tai.lop.hoc")).appText(AppText.body).foregroundStyle(AppColors.muted)
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.vertical, 24)
    }

    private var emptyState: some View {
        AppEmptyState(title: String(localized: "feature.classes.chua.co.lop.hoc")) {
            if data.canWriteClasses {
                TeacherLink(route: .newClass) {
                    Text(String(localized: "feature.classes.tao.lop.au.tien"))
                        .appText(AppText.buttonSmall)
                        .foregroundStyle(AppColors.onPrimary)
                        .padding(.horizontal, 16)
                        .frame(minHeight: AppMetrics.tap)
                        .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.button))
                }
            }
        }
    }

    private var todaySection: some View {
        AppSection(title: String(localized: "classes.today.title", table: "Teacher")) {
            if !todaySessions.isEmpty {
                VStack(spacing: TeacherMetrics.listGap) {
                    ForEach(todaySessions) { session in
                        if let klass = data.classroom(id: session.classId) {
                            todayCard(session: session, classroom: klass)
                        }
                    }
                }
            } else {
                AppEmptyState(title: String(localized: "classes.today.empty", table: "Teacher"), size: .compact)
            }
        }
    }

    private var classesSection: some View {
        AppSection(title: String(localized: "classes.list.title", table: "Teacher")) {
            VStack(spacing: TeacherMetrics.listGap) {
                ForEach(classes, id: \.id) { klass in classCard(klass) }
            }
        }
    }

    private func todayCard(session: ClassSession, classroom: Classroom) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(String.localizedStringWithFormat(String(localized: "feature.classes.hom.nay.7aac3196"), String(describing: session.startTime)))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.onPrimary)
                Text("\(classroom.name) · \(TeacherFeatureData.sessionPrefix(session))")
                    .appText(AppText.heading)
                    .foregroundStyle(AppColors.onPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            TeacherLink(route: .session(classID: classroom.id, sessionID: session.id)) {
                if session.status == .held {
                    TeacherStatusPill(text: String(localized: "feature.classes.a.iem.danh"), tone: .success)
                        .frame(minHeight: AppMetrics.tap)
                } else {
                    Text(String(localized: "feature.classes.iem.danh"))
                        .appText(AppText.buttonSmall)
                        .foregroundStyle(AppColors.primaryInk)
                        .padding(.horizontal, 16)
                        .frame(minHeight: AppMetrics.tap)
                        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var unfinishedSection: some View {
        AppSection(title: String(localized: "classes.tasks.title", table: "Teacher")) {
            if unfinishedSessions.isEmpty {
                AppEmptyState(title: String(localized: "classes.tasks.empty", table: "Teacher"), size: .compact)
            } else {
                VStack(spacing: TeacherMetrics.listGap) {
                    ForEach(unfinishedSessions) { session in
                        if let klass = data.classroom(id: session.classId) {
                            unfinishedCard(session: session, classroom: klass)
                        }
                    }
                }
            }
        }
    }

    private func unfinishedCard(session: ClassSession, classroom: Classroom) -> some View {
        TeacherLink(route: .session(classID: classroom.id, sessionID: session.id)) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(String(localized: "classes.tasks.attendance", table: "Teacher"))
                        .appText(AppText.heading).foregroundStyle(AppState.pendingFg)
                    Text("\(classroom.name) · \(TeacherFeatureData.sessionPrefix(session))")
                        .appText(AppText.muted).foregroundStyle(AppColors.muted)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").foregroundStyle(AppColors.muted)
            }
            .padding(TeacherMetrics.cardPadding)
            .background(AppState.pendingBg, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
    }

    private func classCard(_ klass: Classroom) -> some View {
        TeacherLink(route: .classDetail(klass.id), identifier: "class.card.\(klass.id)") {
            VStack(alignment: .leading, spacing: 12) {
                  Text(klass.name)
                    .appText(AppText.heading)
                    .foregroundStyle(AppColors.text)
                    .lineLimit(1)
                  HStack(spacing: 8) {
                      TeacherCountChip(count: "\(data.activeStudents(in: klass.id).count)", after: String(localized: "feature.classes.students.suffix"))
                      TeacherCountChip(before: String(localized: "feature.classes.chuyen.can"), count: attendanceText(klass))
                  }
                  if let weekdays = klass.weekdays, !weekdays.isEmpty {
                      Text(classScheduleLine(klass))
                          .appText(AppText.muted).foregroundStyle(AppColors.muted)
                          .accessibilityIdentifier("class.schedule.\(klass.id)")
                  }
                  if let next = TeacherFeatureData.nextPlannedSessions(data.sessions.filter { $0.classId == klass.id }, today: today).first {
                      Text(String.localizedStringWithFormat(
                          String(localized: "classes.card.next", table: "Teacher"),
                          String(describing: TeacherFormat.capitalizedWeekdayName(next.date)),
                          String(describing: TeacherFormat.dayMonth(next.date)),
                          String(describing: next.startTime)))
                          .appText(AppText.caption).foregroundStyle(AppColors.primaryInk)
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

      private func classScheduleLine(_ klass: Classroom) -> String {
          let days = (klass.weekdays ?? []).sorted().compactMap { day in
              TeacherNewClassView.weekdayLabels.first(where: { $0.value == day })?.label
          }.joined(separator: " · ")
        return [days, klass.startTime ?? ""].filter { !$0.isEmpty }.joined(separator: " · ")
      }
}

// MARK: - Cài đặt (tab hiện có, ngoài phạm vi I-8B)

struct TeacherSettingsView: View {
    @Bindable var data: TeacherFeatureData

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                AppCard {
                    HStack {
                        Text(String(localized: "feature.classes.vai.tro")).appText(AppText.label)
                        Spacer()
                        Text(data.roleName).appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                }
                AppCard {
                    HStack {
                        Text(String(localized: "feature.classes.ngon.ngu")).appText(AppText.label)
                        Spacer()
                        Text(String(localized: "feature.classes.tieng.viet")).appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
        }
        .background(AppColors.background.ignoresSafeArea())
        .navigationTitle(String(localized: "feature.classes.cai.at"))
        .navigationBarTitleDisplayMode(.large)
    }
}
