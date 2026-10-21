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
                GuardianCardHead(title: String(localized: "feature.guardian.nhan.xet.cua.giao.vien"),
                                 trailing: AnyView(GuardianStars(level: slip.stars ?? .one)))
                Text(slip.stars?.template ?? "")
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if !slip.note.isEmpty {
                    GuardianNoteBlock(label: String(localized: "feature.guardian.ghi.chu"), text: slip.note)
                }
            }
        } else {
            GuardianTicketCard {
                Text(String(localized: "feature.guardian.co.chua.gui.phieu.buoi.nay"))
                    .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24))
                    .foregroundStyle(AppColors.text)
                GuardianMutedText(text: String(localized: "feature.guardian.phieu.buoi.hoc.hien.o.ay.sau.khi.co.gui.cho.phu"))
            }
        }
    }

    @ViewBuilder private var previousHomeworkCard: some View {
        if !ticket.previousParts.isEmpty, let previous = ticket.previousSession {
            GuardianTicketCard {
                GuardianCardHead(title: String.localizedStringWithFormat(String(localized: "feature.guardian.ket.qua.btvn.buoi.3b11636e"), String(describing: (previous.sessionNumber ?? 0)), String(describing: (GuardianFormat.dayMonth(previous.date)))))
                GuardianHomeworkParts(parts: ticket.previousParts)
            }
        }
    }

    private var assignedHomeworkCard: some View {
        GuardianTicketCard {
            GuardianCardHead(title: assignedTitle)
            if let homework = ticket.assigned {
                ForEach(homework.grading.cancelled) { cancelled in
                    Text(String.localizedStringWithFormat(String(localized: "feature.guardian.a.huy"), String(describing: (GuardianFormat.sessionPrefix(cancelled))), String(describing: (GuardianFormat.dayMonth(cancelled.date)))))
                        .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                        .foregroundStyle(AppColors.warning)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppColors.warningSoft, in: RoundedRectangle(cornerRadius: AppRadius.chip))
                }
                GuardianHomeworkParts(parts: homework.parts, showDescriptions: true)
            } else {
                GuardianMutedText(text: String(localized: "feature.guardian.buoi.nay.khong.giao.bai.tap.ve.nha"))
            }
        }
    }

    private var assignedTitle: String {
        guard let homework = ticket.assigned else { return String(localized: "feature.guardian.btvn.moi") }
        return String.localizedStringWithFormat(String(localized: "feature.guardian.btvn.moi.76c7ccf2"), String(describing: (gradingLine(homework))))
    }

    /// "Cô chấm ở buổi 19 · Thứ Tư 21/10" hoặc "Chưa có buổi chấm".
    private func gradingLine(_ homework: GuardianHomeworkSession) -> String {
        guard let gradingSession = homework.grading.session else { return String(localized: "feature.guardian.chua.co.buoi.cham") }
        return String.localizedStringWithFormat(String(localized: "feature.guardian.co.cham.o.buoi"), String(describing: (gradingSession.sessionNumber ?? 0)), String(describing: (GuardianFormat.weekdayDayMonth(gradingSession.date))))
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
            GuardianEmptyState(title: String(localized: "feature.guardian.co.chua.phat.hanh.bao.cao.thang.nay"),
                               detail: String(localized: "feature.guardian.bao.cao.hien.o.ay.sau.khi.co.phat.hanh.cho.phu.h"))
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
            Text(String(localized: "feature.guardian.3.thang.gan.nhat"))
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
            GuardianStatCard(label: String(localized: "feature.guardian.chuyen.can"),
                             value: String.localizedStringWithFormat(String(localized: "feature.guardian.buoi.d4197bc8"), String(describing: (attended)), String(describing: (report.attendance.heldSessions))),
                             detail: String.localizedStringWithFormat(String(localized: "feature.guardian.muon.69aa257b"), String(describing: (report.attendance.late))))
            GuardianStatCard(label: String(localized: "feature.guardian.bai.kiem.tra"),
                             value: String.localizedStringWithFormat(String(localized: "feature.guardian.bai"), String(describing: (scored)), String(describing: (report.tests.count))),
                             detail: String(localized: "feature.guardian.a.co.iem"))
        }
    }

    private func starsCard(_ report: ReportSnapshot) -> some View {
        let maximum = max(1, report.stars.three, report.stars.two, report.stars.one)
        let total = report.stars.three + report.stars.two + report.stars.one
        return VStack(alignment: .leading, spacing: 8) {
            GuardianCardHead(title: String(localized: "feature.guardian.nhan.xet.theo.sao"),
                             trailing: AnyView(
                                Text(String.localizedStringWithFormat(String(localized: "feature.guardian.buoi.co.phieu"), String(describing: (total))))
                                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                                    .foregroundStyle(AppColors.muted)))
            Text(String(localized: "feature.guardian.tinh.tren.cac.phieu.a.gui"))
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
            Text(String.localizedStringWithFormat(String(localized: "feature.guardian.buoi.d5e8f7ce"), String(describing: (count))))
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
                .frame(width: 52, alignment: .trailing)
        }
        .frame(height: 20)
    }

    private func homeworkCard(_ report: ReportSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            GuardianCardHead(title: String(localized: "feature.guardian.bai.tap.ve.nha"))
            Text(String(localized: "feature.guardian.tot.hoan.thanh.tot.chua.chua.hoan.thanh"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                .foregroundStyle(AppColors.muted)
            if report.homework.isEmpty {
                GuardianMutedText(text: String(localized: "feature.guardian.chua.co.ket.qua.bai.tap.a.gui.trong.thang.nay"))
            } else {
                homeworkTable(report.homework)
            }
            Text(String(localized: "feature.guardian.chi.tinh.ket.qua.a.gui.khong.tinh.phan.chua.cham"))
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
                Text(String(localized: "feature.guardian.phan")).frame(maxWidth: .infinity, alignment: .leading)
                Text(String(localized: "feature.guardian.tot")).frame(width: 56, alignment: .trailing)
                Text(String(localized: "feature.guardian.hoan.thanh")).frame(width: 104, alignment: .trailing)
                Text(String(localized: "feature.guardian.chua")).frame(width: 44, alignment: .trailing)
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
            GuardianCardHead(title: String(localized: "feature.guardian.iem.tung.bai"))
            if report.tests.isEmpty {
                GuardianMutedText(text: String(localized: "feature.guardian.khong.co.bai.kiem.tra.trong.thang.nay"))
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
                            Text(row.value.map { String(format: "%.1f", $0) + "/\(row.max)" } ?? String(localized: "feature.guardian.noScore"))
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
