import SwiftUI

// MARK: - Chi tiết buổi học (`SessionDetailPage.tsx`)

struct TeacherSessionDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    let sessionID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var tab = "diem-danh"
    @State private var showingMenu = false
    @State private var confirmingCancel = false
    @State private var error: String?

    private var session: ClassSession? { data.session(id: sessionID) }
    private var klass: Classroom? { data.classroom(id: classID) }
    private var future: Bool { (session?.date ?? "") > TeacherFormat.todayISO() }
    private var cancelled: Bool { session?.status == .cancelled }

    private let tabs = [
        TeacherTextTabs.Item(id: "diem-danh", label: "Điểm danh"),
        TeacherTextTabs.Item(id: "nhan-xet", label: "Nhận xét"),
        TeacherTextTabs.Item(id: "btvn", label: "Bài tập về nhà"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            if let session {
                header(session)
                body(session)
            } else {
                AppEmptyState(title: "Không tìm thấy buổi học")
                    .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            }
        }
        .background(AppColors.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showingMenu) {
            TeacherSheet(title: "Tuỳ chọn buổi học") {
                AppButton(title: "Huỷ buổi", variant: .danger, size: .medium) {
                    showingMenu = false
                    confirmingCancel = true
                }
            } close: {
                showingMenu = false
            }
        }
        .teacherConfirmDialog(
            isPresented: $confirmingCancel,
            title: "Huỷ buổi học \(session.map { TeacherFormat.dayMonth($0.date) } ?? "")?",
            message: "Buổi học sẽ được đánh dấu là đã huỷ. Bạn có thể khôi phục lại sau.",
            actions: [
                TeacherDialogAction(label: "Huỷ buổi học", variant: .danger) { cancel() },
                TeacherDialogAction(label: "Giữ buổi học", variant: .neutral) { confirmingCancel = false },
            ],
            dismiss: { confirmingCancel = false })
    }

    private func header(_ session: ClassSession) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                TeacherIconButton(systemImage: "chevron.backward", label: "Quay lại") { dismiss() }
                VStack(alignment: .leading, spacing: 0) {
                    Text(klass?.name ?? "Lớp học")
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                        .foregroundStyle(AppColors.muted)
                        .lineLimit(1)
                    HStack(spacing: 8) {
                        Text("\(TeacherFeatureData.sessionPrefix(session)) · \(TeacherFormat.dayMonth(session.date))")
                            .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 25))
                            .foregroundStyle(AppColors.text)
                            .lineLimit(1)
                        if cancelled { TeacherStatusPill(text: "Đã huỷ", tone: .warning) }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if !cancelled && session.status == .planned && data.canWriteAttendance {
                    TeacherIconButton(systemImage: "ellipsis", label: "Tuỳ chọn buổi học",
                                      tint: AppColors.muted) { showingMenu = true }
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
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
            Text("Người dạy")
                .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
            teacherRow(position: "Giáo viên chính", name: data.displayName)
            teacherRow(position: "Trợ giảng", name: nil)
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
                Text(name ?? "Không có")
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
                Text("\(TeacherFeatureData.sessionPrefix(session)) · đã huỷ")
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
                    Text("Buổi này đã huỷ")
                        .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 28))
                        .foregroundStyle(AppColors.text)
                    Text("Không cần điểm danh. Khôi phục nếu bạn huỷ nhầm.")
                        .appText(AppText.body)
                        .foregroundStyle(AppColors.muted)
                        .multilineTextAlignment(.center)
                }
                AppButton(title: "Về danh sách buổi", variant: .secondary, size: .large) { dismiss() }
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
                self.error = "Không hủy được buổi học."
            }
        }
    }
}
