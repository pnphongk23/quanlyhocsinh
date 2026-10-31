import Observation
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

struct GuardianLoadOutcome {
    let dashboard: GuardianDashboard?
    let errorMessage: String?
}

/// The screen's load bookkeeping. Every load takes a token, and only the newest one may write; a result
/// that arrives after a newer load (or a newer sync) started is dropped instead of replacing fresher
/// state. The refresh time and the state are committed in the same step, so a superseded load cannot
/// make the cache look fresher than it is.
@MainActor @Observable
final class GuardianLoadState {
    private(set) var dashboard: GuardianDashboard?
    private(set) var errorMessage: String?
    private(set) var isLoading = true
    private let freshness: UserDefaults
    private var generation = 0

    init(freshness: UserDefaults = .standard) {
        self.freshness = freshness
    }

    /// Starts a load, raises the spinner and returns the token the load must present to write.
    func begin() -> Int {
        generation += 1
        isLoading = true
        return generation
    }

    func isCurrent(_ token: Int) -> Bool { token == generation }

    /// Ends a load's spinner, but only the newest load ends it: an older load finishing while a newer
    /// one still reads would otherwise drop the spinner of the load the screen is waiting for.
    func finish(_ token: Int) {
        guard isCurrent(token) else { return }
        isLoading = false
    }

    /// Accepts a result only while it is still the newest one; false means it was superseded. A
    /// refreshed result also records its time here, with no suspension between the check and the write.
    func commit(_ token: Int, _ outcome: GuardianLoadOutcome, refreshedScope: CacheScope?) -> Bool {
        guard isCurrent(token) else { return false }
        if let refreshedScope, let refreshedAt = outcome.dashboard?.updatedAt {
            GuardianFreshness.record(refreshedScope, at: refreshedAt, defaults: freshness)
        }
        dashboard = outcome.dashboard
        errorMessage = outcome.errorMessage
        return true
    }
}

struct GuardianRootView: View {
    typealias DashboardLoader = @MainActor (CurrentIdentity, SQLiteStore, Bool) async throws -> GuardianDashboard

    var model: AuthModel? = nil
    private let loadDashboard: DashboardLoader
    @State var loads: GuardianLoadState
    @State private var selectedChildID: String?
    @State private var tab: GuardianTab = .classes
    @State private var classesPath: [GuardianDetail] = []
    @State private var commentsPath: [GuardianDetail] = []
    @State private var months: [String: String] = [:]
    @State private var showingChildPicker = false

    init(model: AuthModel? = nil, freshness: UserDefaults = .standard,
         loadDashboard: @escaping DashboardLoader = { identity, store, syncSucceeded in
        try await GuardianRepository.load(identity: identity, store: store, syncSucceeded: syncSucceeded)
    }) {
        self.model = model
        self.loadDashboard = loadDashboard
        _loads = State(initialValue: GuardianLoadState(freshness: freshness))
    }

    private var dashboard: GuardianDashboard? { loads.dashboard }
    private var errorMessage: String? { loads.errorMessage }
    private var isLoading: Bool { loads.isLoading }
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
        .tint(AppColors.primaryInk)
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
            _ = await load()
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
        .onChange(of: model?.syncRevision) { _, _ in
            Task { await syncRevisionDidChange() }
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
            GuardianUpcomingSection(child: child,
                                    openSession: { classesPath.append($0.destination) },
                                    openAll: { classesPath.append(.schedule) })
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
        .refreshable { _ = await load(manualSync: true) }
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
                GuardianScheduleView(child: child) { classesPath.append($0.destination) }
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
    @MainActor func load(manualSync: Bool = false) async -> GuardianLoadOutcome? {
        let token = loads.begin()
        defer { loads.finish(token) }
        if model == nil, let demo = GuardianDemo.dashboard {
            let outcome = GuardianLoadOutcome(dashboard: demo, errorMessage: nil)
            guard loads.commit(token, outcome, refreshedScope: nil) else { return nil }
            selectFirstChild(demo)
            return outcome
        }
        if model?.activeMembership == nil && model?.memberships.isEmpty == true {
            let outcome = GuardianLoadOutcome(dashboard: GuardianDashboard(children: []), errorMessage: nil)
            guard loads.commit(token, outcome, refreshedScope: nil) else { return nil }
            selectedChildID = nil
            return outcome
        }
        do {
            let next: GuardianDashboard
            var syncSucceeded = false
            var loadedScope: CacheScope?
            if let model, model.isSyncEligible, model.activeSQLiteStore != nil {
                if manualSync { syncSucceeded = (await model.synchronizeWhileActive()).succeeded }
                // The sync above re-reads `/me`, which may switch or revoke the role. The identity and
                // the store must still be a matching pair and this load must still be the newest one,
                // so a revoked role stops here instead of reading the previous role's cache.
                guard loads.isCurrent(token),
                      let identity = model.identity,
                      let scope = Self.cacheScope(for: identity),
                      let store = model.activeSQLiteStore,
                      store.scope == scope,
                      model.isSyncEligible else { return nil }
                if !manualSync { syncSucceeded = model.syncResult(for: store.scope) == true }
                loadedScope = scope
                next = try await loadDashboard(identity, store, syncSucceeded)
            } else {
                next = try await GuardianRepository.load()
            }
            let loadError = next.isOffline
                ? String(localized: "feature.guardian.khong.tai.uoc.du.lieu.cua.con.vui.long.thu.lai")
                : nil
            let outcome = GuardianLoadOutcome(dashboard: next, errorMessage: loadError)
            // A refreshed result records its time only if it is still the newest load, in the same step.
            guard loads.commit(token, outcome, refreshedScope: next.isOffline ? nil : loadedScope) else { return nil }
            selectFirstChild(next)
            return outcome
        } catch {
            let loadError = String(localized: "feature.guardian.khong.tai.uoc.du.lieu.cua.con.vui.long.thu.lai")
            let outcome = GuardianLoadOutcome(dashboard: loads.dashboard, errorMessage: loadError)
            guard loads.commit(token, outcome, refreshedScope: nil) else { return nil }
            return outcome
        }
    }
    @MainActor func syncRevisionDidChange() async -> GuardianLoadOutcome? {
        guard let model, let store = model.activeSQLiteStore,
              model.syncResult(for: store.scope) != nil else {
            await rebuildFromCache()
            return loads.dashboard.map { GuardianLoadOutcome(dashboard: $0, errorMessage: loads.errorMessage) }
        }
        return await load()
    }
    /// A background sync changed the cache (a deleted report, for one): redraw from it, no request.
    @MainActor private func rebuildFromCache() async {
        let token = loads.begin()
        defer { loads.finish(token) }
        guard let store = model?.activeSQLiteStore, let current = loads.dashboard else { return }
        guard let next = try? await GuardianRepository.reload(from: store, keeping: current) else { return }
        let outcome = GuardianLoadOutcome(dashboard: next, errorMessage: loads.errorMessage)
        guard loads.commit(token, outcome, refreshedScope: nil) else { return }
        selectFirstChild(next)
    }
    /// The scope an identity points at; nil once no active role is left (a revoked role).
    private static func cacheScope(for identity: CurrentIdentity) -> CacheScope? {
        guard let id = identity.activeMembershipId,
              let membership = identity.memberships.first(where: { $0.id == id }) else { return nil }
        return CacheScope(userId: identity.user.id, workspaceId: membership.workspace.id, membershipId: id)
    }
    private func selectFirstChild(_ dashboard: GuardianDashboard) {
        if let selectedChildID, dashboard.children.contains(where: { $0.student.id == selectedChildID }) { return }
        selectedChildID = dashboard.children.first?.student.id
    }
}

#Preview { GuardianRootView() }
