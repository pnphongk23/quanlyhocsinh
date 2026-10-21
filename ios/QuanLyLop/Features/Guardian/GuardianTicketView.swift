import SwiftUI

// MARK: - PH · Phiếu buổi học (ảnh 08)

struct GuardianTicketView: View {
    let child: GuardianChildData
    let session: ClassSession
    let back: () -> Void

    private var ticket: GuardianTicketDetail { child.ticket(for: session) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                GuardianPageHeader(eyebrow: "\(child.student.name) · \(child.className)",
                                   title: "\(GuardianFormat.sessionPrefix(session)) · \(GuardianFormat.weekdayDayMonth(session.date))",
                                   backAction: back)
                commentCard
                previousHomeworkCard
                assignedHomeworkCard
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 16)
        }
        .scrollIndicators(.hidden)
    }

    @ViewBuilder private var commentCard: some View {
        if let slip = ticket.slip {
            GuardianTicketCard {
                GuardianCardHead(title: "Nhận xét của giáo viên",
                                 trailing: AnyView(GuardianStars(level: slip.stars ?? .one)))
                Text(slip.stars?.template ?? "")
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if !slip.note.isEmpty {
                    GuardianNoteBlock(label: "Ghi chú", text: slip.note)
                }
            }
        } else {
            GuardianTicketCard {
                Text("Cô chưa gửi phiếu buổi này")
                    .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24))
                    .foregroundStyle(AppColors.text)
                GuardianMutedText(text: "Phiếu buổi học hiện ở đây sau khi cô gửi cho phụ huynh.")
            }
        }
    }

    @ViewBuilder private var previousHomeworkCard: some View {
        if !ticket.previousParts.isEmpty, let previous = ticket.previousSession {
            GuardianTicketCard {
                GuardianCardHead(title: "Kết quả BTVN buổi \(previous.sessionNumber ?? 0) · \(GuardianFormat.dayMonth(previous.date))")
                GuardianHomeworkParts(parts: ticket.previousParts)
            }
        }
    }

    private var assignedHomeworkCard: some View {
        GuardianTicketCard {
            GuardianCardHead(title: assignedTitle)
            if let homework = ticket.assigned {
                ForEach(homework.grading.cancelled) { cancelled in
                    Text("\(GuardianFormat.sessionPrefix(cancelled)) · \(GuardianFormat.dayMonth(cancelled.date)) · Đã huỷ")
                        .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                        .foregroundStyle(AppColors.warning)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppColors.warningSoft, in: RoundedRectangle(cornerRadius: AppRadius.chip))
                }
                GuardianHomeworkParts(parts: homework.parts, showDescriptions: true)
            } else {
                GuardianMutedText(text: "Buổi này không giao bài tập về nhà.")
            }
        }
    }

    private var assignedTitle: String {
        guard let homework = ticket.assigned else { return "BTVN mới" }
        return "BTVN mới · \(gradingLine(homework))"
    }

    /// "Cô chấm ở buổi 19 · Thứ Tư 21/10" hoặc "Chưa có buổi chấm".
    private func gradingLine(_ homework: GuardianHomeworkSession) -> String {
        guard let gradingSession = homework.grading.session else { return "Chưa có buổi chấm" }
        return "Cô chấm ở buổi \(gradingSession.sessionNumber ?? 0) · \(GuardianFormat.weekdayDayMonth(gradingSession.date))"
    }
}

// MARK: - PH · Báo cáo tháng (ảnh 10)

struct GuardianReportView: View {
    let child: GuardianChildData

    private var month: String { child.latestReportMonth }
    private var publication: ReportPublication? { child.latestReport(in: month) }

    var body: some View {
        if let publication {
            reportBody(publication)
        } else {
            GuardianEmptyState(title: "Cô chưa phát hành báo cáo tháng này",
                               detail: "Báo cáo hiện ở đây sau khi cô phát hành cho phụ huynh.")
        }
    }

    private func reportBody(_ publication: ReportPublication) -> some View {
        let report = publication.snapshot
        return VStack(alignment: .leading, spacing: 12) {
            reportSegmented
            statCards(report)
            starsCard(report)
            homeworkCard(report)
            testsCard(report)
            GuardianReportDownloadButton(publication: publication, month: month)
        }
    }

    private var reportSegmented: some View {
        HStack(spacing: 4) {
            Text(GuardianFormat.monthLabel(month))
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 10))
            // Báo cáo 3 tháng thuộc mục "Làm sau" của spec 8 nên chưa mở.
            Text("3 tháng gần nhất")
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .padding(4)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.control))
    }

    private func statCards(_ report: ReportSnapshot) -> some View {
        let attended = report.attendance.present + report.attendance.late
        let scored = report.tests.filter { $0.value != nil }.count
        return HStack(spacing: 8) {
            GuardianStatCard(label: "Chuyên cần",
                             value: "\(attended)/\(report.attendance.heldSessions) buổi",
                             detail: "\(report.attendance.late) muộn")
            GuardianStatCard(label: "Bài kiểm tra",
                             value: "\(scored)/\(report.tests.count) bài",
                             detail: "đã có điểm")
        }
    }

    private func starsCard(_ report: ReportSnapshot) -> some View {
        let maximum = max(1, report.stars.three, report.stars.two, report.stars.one)
        let total = report.stars.three + report.stars.two + report.stars.one
        return VStack(alignment: .leading, spacing: 8) {
            GuardianCardHead(title: "Nhận xét theo sao",
                             trailing: AnyView(
                                Text("\(total) buổi có phiếu")
                                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                                    .foregroundStyle(AppColors.muted)))
            Text("Tính trên các phiếu đã gửi.")
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                .foregroundStyle(AppColors.muted)
            VStack(spacing: 8) {
                starBar(.three, count: report.stars.three, maximum: maximum)
                starBar(.two, count: report.stars.two, maximum: maximum)
                starBar(.one, count: report.stars.one, maximum: maximum)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func starBar(_ level: Stars, count: Int, maximum: Int) -> some View {
        HStack(spacing: 8) {
            GuardianStars(level: level, size: 16)
                .frame(width: 62, alignment: .leading)
            GeometryReader { proxy in
                Capsule()
                    .fill(AppColors.background)
                    .overlay(alignment: .leading) {
                        Capsule()
                            .fill(GuardianColors.star)
                            .frame(width: proxy.size.width * CGFloat(count) / CGFloat(maximum))
                    }
            }
            .frame(height: 12)
            Text("\(count) buổi")
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
                .frame(width: 52, alignment: .trailing)
        }
        .frame(height: 20)
    }

    private func homeworkCard(_ report: ReportSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            GuardianCardHead(title: "Bài tập về nhà")
            Text("Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành")
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                .foregroundStyle(AppColors.muted)
            if report.homework.isEmpty {
                GuardianMutedText(text: "Chưa có kết quả bài tập đã gửi trong tháng này.")
            } else {
                homeworkTable(report.homework)
            }
            Text("Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.")
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                .foregroundStyle(AppColors.muted)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func homeworkTable(_ rows: [HomeworkSummary]) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Text("Phần").frame(maxWidth: .infinity, alignment: .leading)
                Text("Tốt").frame(width: 56, alignment: .trailing)
                Text("Hoàn thành").frame(width: 104, alignment: .trailing)
                Text("Chưa").frame(width: 44, alignment: .trailing)
            }
            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
            .foregroundStyle(AppColors.muted)
            .padding(.vertical, 8)
            .overlay(alignment: .bottom) { AppColors.divider.frame(height: 1) }
            ForEach(Array(rows.enumerated()), id: \.element.kind) { index, row in
                HStack(spacing: 4) {
                    Text(row.kind.guardianReportLabel)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .foregroundStyle(AppColors.text)
                    Text("\(row.excellent)")
                        .foregroundStyle(AppColors.success)
                        .frame(width: 56, alignment: .trailing)
                    Text("\(row.done)")
                        .foregroundStyle(AppColors.primaryInk)
                        .frame(width: 104, alignment: .trailing)
                    Text("\(row.notDone)")
                        .foregroundStyle(AppColors.error)
                        .frame(width: 44, alignment: .trailing)
                }
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .padding(.vertical, 8)
                .overlay(alignment: .bottom) {
                    if index < rows.count - 1 { AppColors.divider.frame(height: 1) }
                }
            }
        }
    }

    private func testsCard(_ report: ReportSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            GuardianCardHead(title: "Điểm từng bài")
            if report.tests.isEmpty {
                GuardianMutedText(text: "Không có bài kiểm tra trong tháng này.")
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(report.tests.enumerated()), id: \.element.testId) { index, row in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(row.name)
                                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                                    .foregroundStyle(AppColors.text)
                                Text(GuardianFormat.longDayMonth(row.date))
                                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                                    .foregroundStyle(AppColors.muted)
                            }
                            Spacer(minLength: 0)
                            Text(row.value.map { String(format: "%.1f", $0) + "/\(row.max)" } ?? "Chưa có điểm")
                                .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                                .foregroundStyle(AppColors.text)
                        }
                        .padding(.vertical, 8)
                        .overlay(alignment: .top) {
                            if index > 0 { AppColors.divider.frame(height: 1) }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }
}
