import SwiftUI

// MARK: - Chi tiết buổi học (`SessionDetailPage.tsx`)

struct TeacherSessionDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    let sessionID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var tab = "diem-danh"
    @State private var confirmingCancel = false
    @State private var showingInfo = false
    @State private var error: String?

    private var session: ClassSession? { data.session(id: sessionID) }
    private var klass: Classroom? { data.classroom(id: classID) }
    private var future: Bool { (session?.date ?? "") > TeacherFormat.todayISO() }
    private var cancelled: Bool { session?.status == .cancelled }

    private let tabs = [
        TeacherTextTabs.Item(id: "diem-danh", label: String(localized: "feature.classes.iem.danh")),
        TeacherTextTabs.Item(id: "btvn", label: String(localized: "feature.classes.bai.tap.ve.nha")),
        TeacherTextTabs.Item(id: "nhan-xet", label: String(localized: "feature.classes.nhan.xet")),
    ]

    var body: some View {
        VStack(spacing: 0) {
            if let session {
                if !cancelled { tabsBar }
                body(session)
            } else {
                AppEmptyState(title: String(localized: "feature.classes.khong.tim.thay.buoi.hoc"))
                    .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            }
        }
          .background(AppColors.background.ignoresSafeArea())
          .refreshable {
              await data.refresh()
              await i4Data.refresh()
              error = data.errorMessage ?? i4Data.errorMessage
          }
        .navigationTitle(session.map { TeacherFeatureData.sessionPrefix($0) } ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .toolbar {
            if session != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingInfo = true } label: {
                        Image(systemName: "info.circle")
                            .frame(minWidth: AppMetrics.tap, minHeight: AppMetrics.tap)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel(String(localized: "session.info.title", table: "Teacher"))
                }
            }
            if let session, !cancelled, session.status == .planned, data.canWriteAttendance {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button(role: .destructive) { confirmingCancel = true } label: {
                            Label(String(localized: "feature.classes.huy.buoi"), systemImage: "xmark.circle")
                        }
                        .accessibilityIdentifier("session.cancel")
                    } label: {
                        Image(systemName: "ellipsis")
                    }
                    .accessibilityLabel(String(localized: "feature.classes.tuy.chon.buoi.hoc"))
                }
            }
        }
        .sheet(isPresented: $showingInfo) {
            if let session {
                TeacherSessionInfoSheet(session: session, className: klass?.name)
            }
        }
        .confirmationDialog(
            String.localizedStringWithFormat(String(localized: "feature.classes.huy.buoi.hoc.a26a4ee4"), String(describing: (session.map { TeacherFormat.dayMonth($0.date) } ?? ""))),
            isPresented: $confirmingCancel, titleVisibility: .visible) {
            Button(String(localized: "feature.classes.huy.buoi.hoc"), role: .destructive) { cancel() }
                .accessibilityIdentifier("session.cancel.confirm")
            Button(String(localized: "feature.classes.giu.buoi.hoc"), role: .cancel) {}
        } message: {
            Text(String(localized: "feature.classes.buoi.hoc.se.uoc.anh.dau.la.a.huy.ban.co.the.khoi"))
        }
    }

    private var tabsBar: some View {
        TeacherTextTabs(items: tabs, selection: tab, fontSize: 14, fillsWidth: true) { tab = $0 }
            .background(AppColors.surface)
    }

    @ViewBuilder private func body(_ session: ClassSession) -> some View {
        if cancelled {
            scrolled { cancelledBody(session) }
        } else {
            switch tab {
            case "nhan-xet":
                // Nhận xét tự cuộn và ghim nút Gửi phiếu cả lớp ở đáy màn.
                VStack(spacing: 0) {
                    if let error {
                        TeacherErrorBanner(message: error)
                            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                    }
                    SessionCommentsView(sessionID: session.id, data: i4Data)
                }
            case "btvn":
                scrolled { SessionHomeworkView(sessionID: session.id, data: i4Data) }
            default:
                // Điểm danh tự cuộn và ghim nút Lưu ở đáy màn.
                VStack(spacing: 0) {
                    if let error {
                        TeacherErrorBanner(message: error)
                            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                    }
                    TeacherAttendanceView(session: session, data: data)
                }
            }
        }
    }

    private func scrolled<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                if let error { TeacherErrorBanner(message: error) }
                content()
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, 4)
            .padding(.bottom, TeacherMetrics.cardPadding)
        }
    }

    private func cancelledBody(_ session: ClassSession) -> some View {
        VStack(spacing: TeacherMetrics.contentGap) {
            VStack(spacing: 2) {
                Text(TeacherFormat.weekdayDate(session.date))
                    .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                    .foregroundStyle(AppColors.text)
                Text(String.localizedStringWithFormat(String(localized: "feature.classes.a.huy.6af7a5ff"), String(describing: (TeacherFeatureData.sessionPrefix(session)))))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))

            VStack(spacing: 16) {
                Image(systemName: "calendar")
                    .font(.system(size: 28, weight: .regular))
                    .foregroundStyle(AppColors.primaryInk)
                    .frame(width: 72, height: 72)
                    .background(AppColors.primarySoft, in: Circle())
                VStack(spacing: 8) {
                    Text(String(localized: "feature.classes.buoi.nay.a.huy"))
                        .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 28))
                        .foregroundStyle(AppColors.text)
                        .accessibilityIdentifier("session.cancelled")
                    Text(String(localized: "feature.classes.khong.can.iem.danh.khoi.phuc.neu.ban.huy.nham"))
                        .appText(AppText.body)
                        .foregroundStyle(AppColors.muted)
                        .multilineTextAlignment(.center)
                }
                AppButton(title: String(localized: "feature.classes.ve.danh.sach.buoi"), variant: .secondary, size: .large) { dismiss() }
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.button))
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 20)
            .padding(.vertical, 32)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
    }

    private func cancel() {
        confirmingCancel = false
        guard let session else { return }
        Task {
            do {
                try await data.cancel(session)
                error = nil
            } catch {
                self.error = String(localized: "feature.classes.khong.huy.uoc.buoi.hoc")
            }
        }
    }
}

// MARK: - Thông tin buổi học (sheet từ nút info ở thanh điều hướng)

struct TeacherSessionInfoSheet: View {
    @Environment(\.dismiss) private var dismiss
    let session: ClassSession
    let className: String?

    var body: some View {
        NavigationStack {
            TeacherScroll {
                VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                    card {
                        infoRow(String(localized: "session.info.class", table: "Teacher"),
                                className ?? String(localized: "feature.classes.lop.hoc"))
                        infoRow(String(localized: "session.info.date", table: "Teacher"),
                                TeacherFormat.weekdayDate(session.date))
                        infoRow(String(localized: "session.info.time", table: "Teacher"), session.startTime)
                    }
                }
                .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                .padding(.top, TeacherMetrics.screenPaddingTop)
                .padding(.bottom, TeacherMetrics.cardPadding)
            }
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle(String(localized: "session.info.title", table: "Teacher"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(String(localized: "session.info.close", table: "Teacher")) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) { content() }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, AppMetrics.cardPaddingVertical)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func infoRow(_ title: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(title)
                .appText(AppText.muted)
                .foregroundStyle(AppColors.muted)
            Text(value)
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .multilineTextAlignment(.trailing)
        }
        .accessibilityElement(children: .combine)
    }
}
