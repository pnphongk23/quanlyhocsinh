import SwiftUI

/// Năm mục thanh tab dưới (`GuardianShell.tsx`): đúng thứ tự ảnh 15.
enum GuardianTab: String, CaseIterable, Identifiable {
    case overview, attendance, scores, comments, reports

    var id: String { rawValue }

    var label: String {
        switch self {
        case .overview: String(localized: "feature.guardian.tong.quan")
        case .attendance: String(localized: "feature.guardian.iem.danh")
        case .scores: String(localized: "feature.guardian.iem.so")
        case .comments: String(localized: "feature.guardian.nhan.xet")
        case .reports: String(localized: "feature.guardian.bao.cao")
        }
    }

    var glyph: GuardianGlyphName {
        switch self {
        case .overview: .home
        case .attendance: .attendance
        case .scores: .scores
        case .comments: .comments
        case .reports: .reports
        }
    }
}

/// Màn chi tiết mở từ tab Nhận xét (`/ph/nhan-xet/:id`). Tab Nhận xét vẫn sáng.
enum GuardianDetail: Equatable {
    case ticket(String)
}

struct GuardianRootView: View {
    var model: AuthModel? = nil
    @Environment(\.scenePhase) private var scenePhase

    @State private var dashboard: GuardianDashboard?
    @State private var selectedChildID: String?
    @State private var tab: GuardianTab = .overview
    @State private var detail: GuardianDetail?
    @State private var months: [String: String] = [:]
    @State private var errorMessage: String?
    @State private var isLoading = true

    private var children: [GuardianChildData] { dashboard?.children ?? [] }

    private var child: GuardianChildData? {
        guard let dashboard else { return nil }
        return dashboard.children.first { $0.student.id == (selectedChildID ?? dashboard.children.first?.student.id) }
    }

    private var screen: AuthModel.Screen { model?.screen ?? .main }

    var body: some View {
        VStack(spacing: 0) {
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(AppColors.background.ignoresSafeArea())
        .preferredColorScheme(.light)
        .safeAreaInset(edge: .bottom, spacing: 0) { tabBar }
        .task { await load() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await load() } }
        }
    }

    // MARK: Nội dung

    @ViewBuilder private var content: some View {
        if let model, screen == .settings {
            AuthSettingsView(model: model, guardianMeta: settingsMeta)
        } else if let model, screen == .changePassword {
            AuthChangePasswordView(model: model) { model.show(.settings) }
        } else {
            mainContent
        }
    }

    private var settingsMeta: String {
        guard let dashboard, !dashboard.children.isEmpty else { return "" }
#if DEBUG
        // The account-settings prototype fixture has no class assignment for the linked children.
        // Keep this difference inside the screenshot-only seed; guardian pages still show their
        // real demo class name (6A).
        if DemoFlag.screen == "settings" || DemoFlag.screen == "settings-blocked" {
            return dashboard.children
                .map { String.localizedStringWithFormat(String(localized: "feature.guardian.be.ea132ac1"), String(describing: (AuthFormat.shortName($0.student.name)))) }
                .joined(separator: ", ")
        }
#endif
        return dashboard.children.map(\.childrenMeta).joined(separator: ", ")
    }

    @ViewBuilder private var mainContent: some View {
        if isLoading && dashboard == nil {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let detail {
            detailPage(detail)
        } else if let child {
            page(child)
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    GuardianPageHeader(eyebrow: nil, title: tabLabel)
                    if let errorMessage {
                        GuardianErrorText(text: errorMessage)
                    } else {
                        GuardianEmptyState(title: String(localized: "feature.guardian.chua.co.con.nao.uoc.lien.ket"),
                                           detail: String(localized: "feature.guardian.lien.he.giao.vien.neu.ban.can.xem.du.lieu.cua.co"))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 16)
            }
        }
    }

    @ViewBuilder private func detailPage(_ detail: GuardianDetail) -> some View {
        switch detail {
        case .ticket(let sessionID):
            if let child, let session = child.session(id: sessionID) {
                GuardianTicketView(child: child, session: session,
                                   back: { self.detail = nil })
            } else {
                missingTicket
            }
        }
    }

    private var missingTicket: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                GuardianPageHeader(eyebrow: child?.student.name, title: String(localized: "feature.guardian.phieu.buoi.hoc"),
                                   backAction: { detail = nil })
                GuardianEmptyState(title: String(localized: "feature.guardian.khong.tim.thay.buoi.hoc.nay"),
                                   detail: String(localized: "feature.guardian.buoi.hoc.khong.thuoc.lop.cua.con.hoac.a.bi.huy"))
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 16)
        }
    }

    private func page(_ child: GuardianChildData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                header(child)
                // `.chips` chỉ có ở trang Tổng quan (`GuardianOverviewPage`); bốn tab còn lại không có.
                if tab == .overview {
                    GuardianChildChips(children: children, selectedID: child.student.id) { id in
                        selectedChildID = id
                        months[child.student.id] = nil
                    }
                }
                switch tab {
                case .overview:
                    GuardianOverviewPage(child: child, month: month(for: child),
                                         openScores: { tab = .scores },
                                         openTicket: { session in detail = .ticket(session.id) })
                case .attendance:
                    GuardianAttendancePage(child: child, month: month(for: child)) { value in
                        months[child.student.id] = value
                    }
                case .scores:
                    GuardianScoresPage(child: child, month: month(for: child)) { value in
                        months[child.student.id] = value
                    }
                case .comments:
                    GuardianCommentsPage(child: child) { session in
                        detail = .ticket(session.id)
                    }
                case .reports:
                    GuardianReportView(child: child)
                }
                if let errorMessage {
                    GuardianErrorText(text: errorMessage)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 16)
        }
        .scrollIndicators(.hidden)
        .refreshable { await load() }
    }

    @ViewBuilder private func header(_ child: GuardianChildData) -> some View {
        switch tab {
        case .overview:
            GuardianPageHeader(eyebrow: "\(child.className) · \(GuardianFormat.monthLabel(month(for: child)))",
                               title: tab.label)
        case .reports:
            // `Báo cáo tháng 10` (ảnh 10 của P1), không phải nhãn tab "Báo cáo". Tháng lấy theo
            // báo cáo đã phát hành mới nhất, giống `publishedReportMonths()[0]` của prototype.
            GuardianPageHeader(eyebrow: child.student.name,
                               title: String.localizedStringWithFormat(String(localized: "feature.guardian.bao.cao.thang"), String(describing: (GuardianFormat.monthNumber(child.latestReportMonth)))))
        default:
            GuardianPageHeader(eyebrow: child.student.name, title: tab.label)
        }
    }

    private var tabLabel: String { tab.label }

    private func month(for child: GuardianChildData) -> String {
        if let stored = months[child.student.id], child.months.contains(stored) { return stored }
        return child.defaultMonth
    }

    // MARK: Thanh tab (`.tabbar`, `.tab`, `.tabActive`)

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(GuardianTab.allCases) { item in
                tabButton(item)
            }
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 8)
        .background(AppColors.surface)
        .overlay(alignment: .top) { AppColors.border.frame(height: 1) }
    }

    private func tabButton(_ item: GuardianTab) -> some View {
        let active = isActive(item)
        return Button { select(item) } label: {
            VStack(spacing: 4) {
                GuardianIcon(name: item.glyph)
                Text(item.label)
                    .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                    .lineLimit(1)
                    .minimumScaleFactor(0.9)
            }
            .foregroundStyle(active ? AppColors.primary : AppColors.muted)
            .frame(maxWidth: .infinity)
            .padding(.top, 8)
            .frame(minHeight: 56)
            .overlay(alignment: .top) {
                (active ? AppColors.primary : Color.clear).frame(height: 3)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("guardian.tab.\(item.rawValue)")
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }

    /// Settings screens leave every tab inactive, like `SettingsShell` rendering the page
    /// inside the guardian shell.
    private func isActive(_ item: GuardianTab) -> Bool {
        guard screen == .main else { return false }
        if detail != nil { return item == .comments }
        return item == tab
    }

    private func select(_ item: GuardianTab) {
        if screen != .main { model?.show(.main) }
        detail = nil
        tab = item
    }

    // MARK: Nạp dữ liệu

    @MainActor
    private func load() async {
        isLoading = true
        defer { isLoading = false }
        if let demo = GuardianDemo.dashboard {
            dashboard = demo
            selectFirstChild(demo)
            errorMessage = nil
            return
        }
        do {
            let next = try await GuardianRepository.load()
            dashboard = next
            selectFirstChild(next)
            errorMessage = nil
        } catch {
            errorMessage = String(localized: "feature.guardian.khong.tai.uoc.du.lieu.cua.con.vui.long.thu.lai")
        }
    }

    private func selectFirstChild(_ dashboard: GuardianDashboard) {
        if let selectedChildID, dashboard.children.contains(where: { $0.student.id == selectedChildID }) { return }
        selectedChildID = dashboard.children.first?.student.id
    }
}

#Preview {
    GuardianRootView()
}
