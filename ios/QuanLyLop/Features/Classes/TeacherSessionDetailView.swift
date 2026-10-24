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
    @State private var error: String?

    private var session: ClassSession? { data.session(id: sessionID) }
    private var klass: Classroom? { data.classroom(id: classID) }
    private var future: Bool { (session?.date ?? "") > TeacherFormat.todayISO() }
    private var cancelled: Bool { session?.status == .cancelled }

    private let tabs = [
        TeacherTextTabs.Item(id: "diem-danh", label: String(localized: "feature.classes.iem.danh")),
        TeacherTextTabs.Item(id: "nhan-xet", label: String(localized: "feature.classes.nhan.xet")),
        TeacherTextTabs.Item(id: "btvn", label: String(localized: "feature.classes.bai.tap.ve.nha")),
    ]

    var body: some View {
        VStack(spacing: 0) {
            if let session {
                header(session)
                body(session)
            } else {
                AppEmptyState(title: String(localized: "feature.classes.khong.tim.thay.buoi.hoc"))
                    .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            }
        }
        .background(AppColors.background.ignoresSafeArea())
        .navigationTitle(session.map { "\(TeacherFeatureData.sessionPrefix($0)) · \(TeacherFormat.dayMonth($0.date))" } ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let session, !cancelled, session.status == .planned, data.canWriteAttendance {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button(role: .destructive) { confirmingCancel = true } label: {
                            Label(String(localized: "feature.classes.huy.buoi"), systemImage: "xmark.circle")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                    }
                    .accessibilityLabel(String(localized: "feature.classes.tuy.chon.buoi.hoc"))
                }
            }
        }
        .teacherConfirmDialog(
            isPresented: $confirmingCancel,
            title: String.localizedStringWithFormat(String(localized: "feature.classes.huy.buoi.hoc.a26a4ee4"), String(describing: (session.map { TeacherFormat.dayMonth($0.date) } ?? ""))),
            message: String(localized: "feature.classes.buoi.hoc.se.uoc.anh.dau.la.a.huy.ban.co.the.khoi"),
            actions: [
                TeacherDialogAction(label: String(localized: "feature.classes.huy.buoi.hoc"), variant: .danger) { cancel() },
                TeacherDialogAction(label: String(localized: "feature.classes.giu.buoi.hoc"), variant: .neutral) { confirmingCancel = false },
            ],
            dismiss: { confirmingCancel = false })
    }

    private func header(_ session: ClassSession) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Text("\(klass?.name ?? String(localized: "feature.classes.lop.hoc")) · \(TeacherFormat.sessionDateLine(date: session.date, start: session.startTime, end: nil))")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                if cancelled { TeacherStatusPill(text: String(localized: "feature.classes.a.huy"), tone: .warning) }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, 2)
            .padding(.bottom, 8)
            if !cancelled {
                TeacherTextTabs(items: tabs, selection: tab, fontSize: 14, fillsWidth: true) { tab = $0 }
            }
        }
        .background(AppColors.surface)
    }

    @ViewBuilder private func body(_ session: ClassSession) -> some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                if let error { TeacherErrorBanner(message: error) }
                if cancelled || tab == "diem-danh" { teacherCard }
                if cancelled {
                    cancelledBody(session)
                } else {
                    switch tab {
                    case "nhan-xet":
                        SessionCommentsView(sessionID: session.id, data: i4Data)
                    case "btvn":
                        SessionHomeworkView(sessionID: session.id, data: i4Data)
                    default:
                        TeacherAttendanceView(session: session, data: data)
                    }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, 4)
            .padding(.bottom, TeacherMetrics.tabBarHeight)
        }
    }

    private var teacherCard: some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            Text(String(localized: "feature.classes.nguoi.day"))
                .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
            teacherRow(position: String(localized: "feature.classes.giao.vien.chinh"), name: data.displayName)
            teacherRow(position: String(localized: "feature.classes.tro.giang"), name: nil)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func teacherRow(position: String, name: String?) -> some View {
        HStack(spacing: 12) {
            if let name {
                TeacherAvatar(name: name, size: 40)
            } else {
                TeacherAvatar(initials: "", size: 40, isEmpty: true)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(position)
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 17.6))
                    .foregroundStyle(AppColors.muted)
                Text(name ?? String(localized: "feature.classes.khong.co"))
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 21))
                    .foregroundStyle(AppColors.text)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
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
