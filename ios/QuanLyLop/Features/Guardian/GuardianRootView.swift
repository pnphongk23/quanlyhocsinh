import SwiftUI

enum GuardianTab: String, CaseIterable, Identifiable {
    case classes, comments, settings
    var id: String { rawValue }
    var label: String {
        switch self {
        case .classes: String(localized: "guardian.tab.classes", table: "Guardian")
        case .comments: String(localized: "guardian.tab.comments", table: "Guardian")
        case .settings: String(localized: "feature.auth.cai.at")
        }
    }
    var systemImage: String {
        switch self {
        case .classes: "house"
        case .comments: "text.bubble"
        case .settings: "slider.horizontal.3"
        }
    }
}

enum GuardianDetail: Hashable {
    case ticket(String)
    case scores
    case schedule
    case report
}

struct GuardianRootView: View {
    var model: AuthModel? = nil
    @Environment(\.scenePhase) private var scenePhase
    @State private var dashboard: GuardianDashboard?
    @State private var selectedChildID: String?
    @State private var tab: GuardianTab = .classes
    @State private var classesPath: [GuardianDetail] = []
    @State private var commentsPath: [GuardianDetail] = []
    @State private var months: [String: String] = [:]
    @State private var errorMessage: String?
    @State private var isLoading = true
    @State private var showingChildPicker = false

    private var children: [GuardianChildData] { dashboard?.children ?? [] }
    private var child: GuardianChildData? {
        guard let dashboard else { return nil }
        return dashboard.children.first { $0.student.id == (selectedChildID ?? dashboard.children.first?.student.id) }
    }
    private var screen: AuthModel.Screen { model?.screen ?? .main }

    /// Settings and change-password are model screens; both live inside the Cài đặt tab.
    private var tabSelection: Binding<GuardianTab> {
        Binding(get: { screen == .main ? tab : .settings },
                set: { item in
                    tab = item
                    if screen != .main { model?.show(.main) }
                })
    }

    var body: some View {
        TabView(selection: tabSelection) {
            NavigationStack(path: $classesPath) {
                classesPage
                    .navigationDestination(for: GuardianDetail.self) { detailPage($0) }
            }
            .tabItem { Label(GuardianTab.classes.label, systemImage: GuardianTab.classes.systemImage) }
            .tag(GuardianTab.classes)

            NavigationStack(path: $commentsPath) {
                commentsPage
                    .navigationDestination(for: GuardianDetail.self) { detailPage($0) }
            }
            .tabItem { Label(GuardianTab.comments.label, systemImage: GuardianTab.comments.systemImage) }
            .tag(GuardianTab.comments)

            NavigationStack {
                settingsPage
            }
            .tabItem { Label(GuardianTab.settings.label, systemImage: GuardianTab.settings.systemImage) }
            .tag(GuardianTab.settings)
        }
        .tint(AppState.selectedFg)
        .onChange(of: selectedChildID) { _, _ in
            classesPath = []
            commentsPath = []
        }
        .background(AppColors.background.ignoresSafeArea())
        .preferredColorScheme(.light)
        .sheet(isPresented: $showingChildPicker) {
            childPicker.presentationDetents([.height(childPickerHeight), .large])
        }
        .task {
            await load()
            #if DEBUG
            // `selectedChildID` settling clears the stacks, so seed the demo route after it.
            try? await Task.sleep(nanoseconds: 400_000_000)
            switch DemoFlag.screen {
            case "guardian-schedule": classesPath = [.schedule]
            case "guardian-picker": showingChildPicker = true
            default: break
            }
            #endif
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await load() } }
        }
        .onChange(of: model?.syncRevision) { _, _ in
            Task { await rebuildFromCache() }
        }
    }

    // MARK: Tabs

    private var classesPage: some View {
        rootPage(title: GuardianTab.classes.label) { child in
            GuardianPageHeader(eyebrow: "\(child.className) · \(GuardianFormat.monthLabel(month(for: child)))",
                               title: nil)
            GuardianOverviewPage(child: child, month: month(for: child),
                                 openScores: { classesPath.append(.scores) },
                                 openTicket: { classesPath.append(.ticket($0.id)) })
            HStack(spacing: 10) {
                shortcut(String(localized: "guardian.scores", table: "Guardian"), icon: "chart.bar", action: { classesPath.append(.scores) })
                shortcut(String(localized: "feature.guardian.bao.cao"), icon: "doc.text", action: { classesPath.append(.report) })
            }
            GuardianUpcomingSection(child: child) { classesPath.append(.schedule) }
                .padding(.top, AppMetrics.sectionGap - TeacherMetrics.contentGap)
            AppSection(title: String(localized: "guardian.sessionList", table: "Guardian")) {
                GuardianSessionListPage(child: child) { row in classesPath.append(row.destination) }
            }
            .padding(.top, AppMetrics.sectionGap - TeacherMetrics.contentGap)
        }
    }

    private var commentsPage: some View {
        rootPage(title: GuardianTab.comments.label) { child in
            GuardianCommentsPage(child: child) { commentsPath.append(.ticket($0.id)) }
        }
    }

    @ViewBuilder private var settingsPage: some View {
        if let model {
            AuthSettingsView(model: model, guardianMeta: settingsMeta, isRootTab: true)
                .navigationDestination(isPresented: changePasswordPresented) {
                    AuthChangePasswordView(model: model, isPushed: true) { model.show(.settings) }
                }
        } else {
            Color.clear.navigationTitle(GuardianTab.settings.label)
        }
    }

    private var changePasswordPresented: Binding<Bool> {
        Binding(get: { screen == .changePassword },
                set: { if !$0 && screen == .changePassword { model?.show(.settings) } })
    }

    private var settingsMeta: String {
        guard let dashboard, !dashboard.children.isEmpty else { return "" }
        return dashboard.children.map(\.childrenMeta).joined(separator: ", ")
    }

    private func rootPage<Content: View>(title: String,
                                         @ViewBuilder content: @escaping (GuardianChildData) -> Content) -> some View {
        GuardianScroll {
            if isLoading && dashboard == nil {
                ProgressView().frame(maxWidth: .infinity, minHeight: 160)
            } else if let child {
                content(child)
            } else if let errorMessage {
                GuardianErrorText(text: errorMessage)
            } else {
                AppEmptyState(title: String(localized: "feature.guardian.chua.co.con.nao.uoc.lien.ket"),
                              description: String(localized: "feature.guardian.lien.he.giao.vien.neu.ban.can.xem.du.lieu.cua.co"),
                              mascot: .cho)
            }
            if child != nil, let errorMessage { GuardianErrorText(text: errorMessage) }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { childSwitcher } }
        .refreshable { await load() }
    }

    private func shortcut(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .appDynamicText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.primaryInk)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder private func detailPage(_ detail: GuardianDetail) -> some View {
        if let child {
            switch detail {
            case .ticket(let id):
                if let session = child.session(id: id) {
                    GuardianTicketView(child: child, session: session)
                } else { missingTicket }
            case .scores:
                GuardianScroll {
                    GuardianPageHeader(eyebrow: child.student.name, title: nil)
                    GuardianScoresPage(child: child, month: month(for: child)) { months[child.student.id] = $0 }
                }
                .navigationTitle(String(localized: "guardian.scores", table: "Guardian"))
                .navigationBarTitleDisplayMode(.inline)
            case .schedule:
                GuardianScheduleView(child: child)
            case .report:
                GuardianReportView(child: child)
                .navigationTitle(String(localized: "feature.guardian.bao.cao"))
                .navigationBarTitleDisplayMode(.inline)
            }
        } else { missingTicket }
    }

    private var missingTicket: some View {
        GuardianScroll {
            AppEmptyState(title: String(localized: "feature.guardian.khong.tim.thay.buoi.hoc.nay"),
                          description: String(localized: "feature.guardian.buoi.hoc.khong.thuoc.lop.cua.con.hoac.a.bi.huy"))
        }
        .navigationTitle(String(localized: "feature.guardian.phieu.buoi.hoc"))
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder private var childSwitcher: some View {
        if let child {
            Button { if children.count > 1 { showingChildPicker = true } } label: {
                HStack(spacing: 6) {
                    Text(child.student.name).lineLimit(1)
                    if children.count > 1 { Image(systemName: "chevron.down").font(.caption.weight(.semibold)) }
                }
                .foregroundStyle(AppColors.text)
            }
            .disabled(children.count < 2)
            .accessibilityIdentifier("guardian.childSwitcher")
        }
    }

    /// Header plus one row per child, so a family of two does not get a screen-high sheet.
    private var childPickerHeight: CGFloat {
        AppSpace.s48 * 2 + CGFloat(children.count) * (AppMetrics.tap + AppSpace.s24)
    }

    private var childPicker: some View {
        GuardianChildPickerSheet(children: children.map { .init(id: $0.student.id, name: $0.student.name, className: $0.className) },
                                 selectedID: child?.student.id,
                                 select: { id in
                                     selectedChildID = id
                                     months[id] = nil
                                     showingChildPicker = false
                                 },
                                 close: { showingChildPicker = false })
    }

    private func month(for child: GuardianChildData) -> String {
        if let stored = months[child.student.id], child.months.contains(stored) { return stored }
        return child.defaultMonth
    }
    @MainActor private func load() async {
        isLoading = true
        defer { isLoading = false }
        if let demo = GuardianDemo.dashboard { dashboard = demo; selectFirstChild(demo); errorMessage = nil; return }
        if model?.activeMembership == nil && model?.memberships.isEmpty == true {
            dashboard = GuardianDashboard(children: [])
            selectedChildID = nil
            errorMessage = nil
            return
        }
        do {
            let next = try await GuardianRepository.load()
            dashboard = next; selectFirstChild(next); errorMessage = nil
        } catch { errorMessage = String(localized: "feature.guardian.khong.tai.uoc.du.lieu.cua.con.vui.long.thu.lai") }
    }
    /// A background sync changed the cache (a deleted report, for one): redraw from it, no request.
    @MainActor private func rebuildFromCache() async {
        guard GuardianDemo.dashboard == nil, let store = model?.activeSQLiteStore, let current = dashboard else { return }
        guard let next = try? await GuardianRepository.reload(from: store, keeping: current) else { return }
        dashboard = next
        selectFirstChild(next)
    }
    private func selectFirstChild(_ dashboard: GuardianDashboard) {
        if let selectedChildID, dashboard.children.contains(where: { $0.student.id == selectedChildID }) { return }
        selectedChildID = dashboard.children.first?.student.id
    }
}

#Preview { GuardianRootView() }
