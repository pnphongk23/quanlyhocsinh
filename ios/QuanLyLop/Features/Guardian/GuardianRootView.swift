import SwiftUI

enum GuardianTab: String, CaseIterable, Identifiable {
    case classes, comments
    var id: String { rawValue }
    var label: String {
        switch self {
        case .classes: String(localized: "guardian.tab.classes", table: "Guardian")
        case .comments: String(localized: "guardian.tab.comments", table: "Guardian")
        }
    }
    var glyph: GuardianGlyphName { self == .classes ? .home : .comments }
}

enum GuardianDetail: Equatable {
    case ticket(String)
    case scores
    case report
}

struct GuardianRootView: View {
    var model: AuthModel? = nil
    @Environment(\.scenePhase) private var scenePhase
    @State private var dashboard: GuardianDashboard?
    @State private var selectedChildID: String?
    @State private var tab: GuardianTab = .classes
    @State private var detail: GuardianDetail?
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

    var body: some View {
        VStack(spacing: 0) {
            content.frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(AppColors.background.ignoresSafeArea())
        .preferredColorScheme(.light)
        .safeAreaInset(edge: .bottom, spacing: 0) { if screen == .main { tabBar } }
        .sheet(isPresented: $showingChildPicker) { childPicker }
        .task { await load() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await load() } }
        }
    }

    @ViewBuilder private var content: some View {
        if let model, screen == .settings {
            AuthSettingsView(model: model, guardianMeta: settingsMeta, onClose: { model.show(.main) })
        } else if let model, screen == .changePassword {
            AuthChangePasswordView(model: model) { model.show(.settings) }
        } else if isLoading && dashboard == nil {
            ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let detail {
            detailPage(detail)
        } else if let child {
            rootPage(child)
        } else {
            ScrollView {
                VStack(spacing: 16) {
                    rootHeader
                    if let errorMessage { GuardianErrorText(text: errorMessage) }
                    else {
                        AppEmptyState(title: String(localized: "feature.guardian.chua.co.con.nao.uoc.lien.ket"),
                                      description: String(localized: "feature.guardian.lien.he.giao.vien.neu.ban.can.xem.du.lieu.cua.co"),
                                      mascot: .cho)
                    }
                }
                .padding(.horizontal, 20).padding(.top, 16)
            }
        }
    }

    private var settingsMeta: String {
        guard let dashboard, !dashboard.children.isEmpty else { return "" }
        return dashboard.children.map(\.childrenMeta).joined(separator: ", ")
    }

    private func rootPage(_ child: GuardianChildData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                rootHeader
                if tab == .classes {
                    GuardianPageHeader(eyebrow: "\(child.className) · \(GuardianFormat.monthLabel(month(for: child)))",
                                       title: String(localized: "guardian.tab.classes", table: "Guardian"))
                    GuardianOverviewPage(child: child, month: month(for: child),
                                         openScores: { detail = .scores },
                                         openTicket: { detail = .ticket($0.id) })
                    HStack(spacing: 10) {
                        shortcut(String(localized: "feature.guardian.iem"), icon: "chart.bar", action: { detail = .scores })
                        shortcut(String(localized: "feature.guardian.bao.cao"), icon: "doc.text", action: { detail = .report })
                    }
                    GuardianCardHead(title: String(localized: "feature.guardian.danh.sach.buoi.hoc"))
                    GuardianAttendancePage(child: child, month: month(for: child)) { months[child.student.id] = $0 }
                } else {
                    GuardianPageHeader(eyebrow: child.student.name,
                                       title: String(localized: "guardian.tab.comments", table: "Guardian"))
                    GuardianCommentsPage(child: child) { detail = .ticket($0.id) }
                }
                if let errorMessage { GuardianErrorText(text: errorMessage) }
            }
            .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 16)
        }
        .scrollIndicators(.hidden)
        .refreshable { await load() }
    }

    private func shortcut(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
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
                      GuardianTicketView(child: child, session: session, back: { self.detail = nil })
                  } else { missingTicket }
            case .scores:
                ScrollView { VStack(alignment: .leading, spacing: 12) {
                    detailHeader(String(localized: "feature.guardian.iem"))
                    GuardianScoresPage(child: child, month: month(for: child)) { months[child.student.id] = $0 }
                }.padding(.horizontal, 20).padding(.top, 12) }
            case .report:
                ScrollView { VStack(alignment: .leading, spacing: 12) {
                    detailHeader(String(localized: "feature.guardian.bao.cao"))
                    GuardianReportView(child: child)
                }.padding(.horizontal, 20).padding(.top, 12) }
            }
        } else { missingTicket }
    }

    private func detailHeader(_ title: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            rootHeader
            GuardianPageHeader(eyebrow: child?.student.name, title: title, backAction: { detail = nil })
        }
    }

    private var missingTicket: some View {
        ScrollView { VStack(alignment: .leading, spacing: 12) {
            rootHeader
            GuardianPageHeader(eyebrow: child?.student.name, title: String(localized: "feature.guardian.phieu.buoi.hoc"), backAction: { detail = nil })
            AppEmptyState(title: String(localized: "feature.guardian.khong.tim.thay.buoi.hoc.nay"),
                          description: String(localized: "feature.guardian.buoi.hoc.khong.thuoc.lop.cua.con.hoac.a.bi.huy"))
        }.padding(.horizontal, 20).padding(.top, 12) }
    }

    private var rootHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 10) {
            Button { if children.count > 1 { showingChildPicker = true } } label: {
                HStack(spacing: 8) {
                    Text(child.map { AppInitials.of($0.student.name) } ?? "–")
                        .appText(AppTextStyle(size: 13, weight: .bold, lineHeight: 18))
                        .foregroundStyle(AppColors.primaryInk)
                        .frame(width: 36, height: 36)
                        .background(AppColors.primarySoft, in: Circle())
                    Text(child?.student.name ?? String(localized: "feature.guardian.chua.co.con.nao.uoc.lien.ket"))
                        .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(AppColors.text).lineLimit(1)
                    if children.count > 1 { Image(systemName: "chevron.down").font(.caption.weight(.semibold)) }
                }
                .frame(minHeight: 44)
            }
            .buttonStyle(.plain)
            .disabled(children.count < 2)
            Spacer(minLength: 0)
            Button { model?.show(.settings) } label: {
                Text(model?.currentUser.flatMap { AppInitials.of($0.displayName ?? "") } ?? "PH")
                    .appText(AppTextStyle(size: 13, weight: .bold, lineHeight: 18))
                    .foregroundStyle(AppColors.primaryInk)
                    .frame(width: 44, height: 44)
                    .background(AppColors.primarySoft, in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(String(localized: "feature.auth.cai.at.tai.khoan"))
          }
          if let updatedAt = dashboard?.updatedAt {
              let formatted = updatedAt.formatted(Date.FormatStyle(date: .numeric, time: .shortened)
                  .locale(Locale(identifier: "vi_VN")))
              Text(String.localizedStringWithFormat(String(localized: "guardian.updatedAt", table: "Guardian"), formatted))
                  .appText(AppTextStyle(size: 12, weight: .regular, lineHeight: 18))
                  .foregroundStyle(AppColors.muted)
          }
        }
    }

    private var childPicker: some View {
        NavigationStack {
            List(children, id: \.student.id) { item in
                Button {
                    selectedChildID = item.student.id
                    months[item.student.id] = nil
                    showingChildPicker = false
                } label: {
                    HStack(spacing: 12) {
                        Text(AppInitials.of(item.student.name)).frame(width: 40, height: 40).background(AppColors.primarySoft, in: Circle())
                        VStack(alignment: .leading) {
                            Text(item.student.name).foregroundStyle(AppColors.text)
                            Text(item.className).foregroundStyle(AppColors.muted)
                        }
                        Spacer()
                        if item.student.id == child?.student.id { Image(systemName: "checkmark").foregroundStyle(AppColors.primary) }
                    }
                    .frame(minHeight: 44)
                }.buttonStyle(.plain)
            }
            .navigationTitle(String(localized: "guardian.childPicker.title", table: "Guardian"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(String(localized: "feature.auth.ong")) { showingChildPicker = false } } }
        }
        .presentationDetents([.medium, .large])
    }

    private var tabBar: some View {
        HStack(spacing: 8) {
            ForEach(GuardianTab.allCases) { item in
                Button { select(item) } label: {
                    Label(item.label, systemImage: item == .classes ? "house.fill" : "text.bubble")
                        .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 18))
                        .foregroundStyle(tab == item ? AppColors.primaryInk : AppColors.muted)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(tab == item ? AppColors.primarySoft : Color.clear, in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("guardian.tab.\(item.rawValue)")
                .accessibilityAddTraits(tab == item ? [.isSelected] : [])
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 6).background(AppColors.surface)
        .overlay(alignment: .top) { AppColors.border.frame(height: 1) }
    }

    private func select(_ item: GuardianTab) {
        if screen != .main { model?.show(.main) }
        detail = nil
        tab = item
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
    private func selectFirstChild(_ dashboard: GuardianDashboard) {
        if let selectedChildID, dashboard.children.contains(where: { $0.student.id == selectedChildID }) { return }
        selectedChildID = dashboard.children.first?.student.id
    }
}

#Preview { GuardianRootView() }
