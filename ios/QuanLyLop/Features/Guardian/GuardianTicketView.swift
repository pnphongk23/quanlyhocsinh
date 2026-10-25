import SwiftUI

// MARK: - PH · Phiếu buổi học (ảnh 08)

struct GuardianTicketView: View {
    let child: GuardianChildData
    let session: ClassSession

    private var ticket: GuardianTicketDetail { child.ticket(for: session) }

    var body: some View {
        GuardianScroll {
            GuardianPageHeader(eyebrow: "\(child.student.name) · \(child.className)")
            commentCard
            VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
                previousHomeworkSection
                assignedHomeworkSection
            }
            .padding(.top, AppMetrics.sectionGap - TeacherMetrics.contentGap)
        }
        .navigationTitle(GuardianFormat.sessionPrefix(session))
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder private var commentCard: some View {
        if let slip = ticket.slip {
            GuardianTicketCard {
                GuardianCardHead(title: String(localized: "feature.guardian.nhan.xet.cua.giao.vien"),
                                 trailing: AnyView(GuardianStars(slip: slip)))
                Text(SlipRules.sentence(for: slip))
                    .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if !slip.note.isEmpty {
                    GuardianNoteBlock(label: String(localized: "feature.guardian.ghi.chu"), text: slip.note)
                }
            }
        } else {
              AppEmptyState(title: String(localized: "feature.guardian.co.chua.gui.phieu.buoi.nay"),
                            description: String(localized: "feature.guardian.phieu.buoi.hoc.hien.o.ay.sau.khi.co.gui.cho.phu"),
                            size: .compact)
        }
    }

    @ViewBuilder private var previousHomeworkSection: some View {
        if !ticket.previousParts.isEmpty, let previous = ticket.previousSession {
            AppSection(title: String.localizedStringWithFormat(String(localized: "guardian.homework.resultOnDate", table: "Reports"), GuardianFormat.dayMonth(previous.date))) {
                GuardianTicketCard {
                    GuardianHomeworkParts(parts: ticket.previousParts)
                }
            }
        }
    }

    private var assignedHomeworkSection: some View {
        AppSection(title: assignedTitle) {
            GuardianTicketCard {
                if let homework = ticket.assigned {
                    ForEach(homework.grading.cancelled) { cancelled in
                        Text(String.localizedStringWithFormat(String(localized: "guardian.ticket.cancelled", table: "Reports"), GuardianFormat.sessionPrefix(cancelled)))
                            .appDynamicText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                            .foregroundStyle(AppColors.warning)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(AppColors.warningSoft, in: RoundedRectangle(cornerRadius: AppRadius.chip))
                    }
                    GuardianHomeworkParts(parts: homework.parts, showDescriptions: true)
                } else {
                    AppEmptyState(title: String(localized: "feature.guardian.buoi.nay.khong.giao.bai.tap.ve.nha"),
                                  size: .compact)
                }
            }
        }
    }

    private var assignedTitle: String {
        guard let homework = ticket.assigned else { return String(localized: "feature.guardian.btvn.moi") }
        return String.localizedStringWithFormat(String(localized: "feature.guardian.btvn.moi.76c7ccf2"), String(describing: (gradingLine(homework))))
    }

    /// "Cô chấm ở buổi T4 · 21/10" hoặc "Chưa có buổi chấm".
    private func gradingLine(_ homework: GuardianHomeworkSession) -> String {
        guard let gradingSession = homework.grading.session else { return String(localized: "feature.guardian.chua.co.buoi.cham") }
        return String.localizedStringWithFormat(String(localized: "guardian.ticket.gradedAt", table: "Reports"), SessionLabel.title(for: gradingSession))
    }
}

// MARK: - PH · Báo cáo theo khoảng buổi (ảnh 10)

struct GuardianReportView: View {
    let child: GuardianChildData
    @State private var openID: String?

    private var open: ReportPublication? {
        child.publishedReports.first { $0.id == openID }
    }

    /// The page owns its scroll view so the download button can sit in the bottom safe area, not at
    /// the end of a long report.
    var body: some View {
        GuardianScroll {
            GuardianPageHeader(eyebrow: child.student.name, title: nil)
            if let open {
                reportBody(open)
            } else if child.publishedReports.isEmpty {
                GuardianEmptyState(title: String(localized: "reports.guardian.empty.title", table: "Reports"),
                                   detail: String(localized: "feature.guardian.bao.cao.hien.o.ay.sau.khi.co.phat.hanh.cho.phu.h"))
            } else {
                reportList
            }
        }
        .safeAreaInset(edge: .bottom) {
            if let open {
                TeacherPinnedBar {
                    GuardianReportDownloadButton(publication: open,
                                                 studentName: child.student.name, className: child.className)
                }
            }
        }
    }

    private var reportList: some View {
        VStack(spacing: TeacherMetrics.listGap) {
            ForEach(child.publishedReports, id: \.id) { publication in
                Button { openID = publication.id } label: {
                    HStack(spacing: TeacherMetrics.contentGap) {
                        VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
                            Text(publication.rangeLabel)
                                .appDynamicText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                                .foregroundStyle(AppColors.text)
                                .multilineTextAlignment(.leading)
                            Text(String.localizedStringWithFormat(String(localized: "reports.guardian.publishedOn", table: "Reports"),
                                                                  I4Format.dayMonth(timestamp: publication.publishedAt) ?? ""))
                                .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                                .foregroundStyle(AppColors.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(AppColors.muted)
                    }
                    .padding(.horizontal, TeacherMetrics.cardPadding)
                    .frame(maxWidth: .infinity, minHeight: TeacherMetrics.rowMinHeight)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("guardian.report.row")
            }
        }
    }

    private func reportBody(_ publication: ReportPublication) -> some View {
        let report = publication.snapshot
        return VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
            reportHeader(publication)
            statCards(report)
            starsCard(report)
            homeworkCard(report)
            testsCard(report)
            commentCard(report)
        }
    }

    private func reportHeader(_ publication: ReportPublication) -> some View {
        HStack(spacing: TeacherMetrics.listGap) {
            Button { openID = nil } label: {
                Image(systemName: "chevron.backward")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(AppColors.text)
                    .frame(width: AppMetrics.tap, height: AppMetrics.tap)
            }
            .accessibilityLabel(String(localized: "reports.guardian.back", table: "Reports"))
            Text(publication.rangeLabel)
                .appDynamicText(AppTextStyle(size: 17, weight: .semiBold, lineHeight: 25.5))
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// A report block: its header above the white card, like every other section.
    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        AppSection(title: title) {
            VStack(alignment: .leading, spacing: TeacherMetrics.listGap) { content() }
                .padding(.horizontal, TeacherMetrics.cardPadding)
                .padding(.vertical, AppMetrics.cardPaddingVertical)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
    }

    private func commentCard(_ report: ReportSnapshot) -> some View {
        let comment = report.generalComment.trimmingCharacters(in: .whitespacesAndNewlines)
        return section(String(localized: "feature.reports.nhan.xet.chung")) {
            if comment.isEmpty {
                GuardianMutedText(text: String(localized: "feature.reports.chua.co.nhan.xet.chung"))
            } else {
                Text(comment)
                    .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
            }
        }
    }

    private func statCards(_ report: ReportSnapshot) -> some View {
        let attended = report.attendance.present + report.attendance.late
        let scored = report.tests.filter { $0.value != nil }.count
        return HStack(spacing: TeacherMetrics.listGap) {
            GuardianStatCard(label: String(localized: "feature.guardian.chuyen.can"),
                             value: String.localizedStringWithFormat(String(localized: "feature.guardian.buoi.d4197bc8"), String(describing: (attended)), String(describing: (report.attendance.heldSessions))),
                             detail: String.localizedStringWithFormat(String(localized: "feature.guardian.muon.69aa257b"), String(describing: (report.attendance.late))))
            GuardianStatCard(label: String(localized: "feature.guardian.bai.kiem.tra"),
                             value: String.localizedStringWithFormat(String(localized: "feature.guardian.bai"), String(describing: (scored)), String(describing: (report.tests.count))),
                             detail: String(localized: "feature.guardian.a.co.iem"))
        }
    }

    private func starsCard(_ report: ReportSnapshot) -> some View {
        let stars = report.stars
        let maximum = max(1, stars.stars5.descending.map(\.count).max() ?? 0, stars.three, stars.two, stars.one)
        let total = stars.stars5.total + stars.legacyTotal
        return section(String(localized: "feature.guardian.nhan.xet.theo.sao")) {
            Text(String.localizedStringWithFormat(String(localized: "feature.guardian.buoi.co.phieu"), String(describing: (total))))
                .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            Text(String(localized: "feature.guardian.tinh.tren.cac.phieu.a.gui"))
                .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                .foregroundStyle(AppColors.muted)
            VStack(spacing: TeacherMetrics.listGap) {
                if stars.stars5.total > 0 {
                    ForEach(stars.stars5.descending, id: \.stars) { starBar($0.stars, count: $0.count, maximum: maximum) }
                }
                if stars.legacyTotal > 0 {
                    if stars.stars5.total > 0 {
                        Text(String(localized: "reports.stars.legacyTitle", table: "Reports"))
                            .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                            .foregroundStyle(AppColors.muted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    starBar(3, count: stars.three, maximum: maximum)
                    starBar(2, count: stars.two, maximum: maximum)
                    starBar(1, count: stars.one, maximum: maximum)
                }
            }
        }
    }

    private func starBar(_ level: Int, count: Int, maximum: Int) -> some View {
        HStack(spacing: TeacherMetrics.listGap) {
            Group {
                if level == 0 {
                    Text(String(localized: "reports.stars.zero", table: "Reports"))
                        .appDynamicText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                        .foregroundStyle(AppColors.muted)
                } else {
                    GuardianStars(level: level, size: 16)
                }
            }
            .frame(width: 100, alignment: .leading)
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
                .appDynamicText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
                .frame(width: 52, alignment: .trailing)
        }
        .frame(height: 20)
    }

    private func homeworkCard(_ report: ReportSnapshot) -> some View {
        section(String(localized: "feature.guardian.bai.tap.ve.nha")) {
            Text(String(localized: "feature.guardian.tot.hoan.thanh.tot.chua.chua.hoan.thanh"))
                .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                .foregroundStyle(AppColors.muted)
            if report.homework.isEmpty {
                GuardianMutedText(text: String(localized: "reports.homework.none", table: "Reports"))
            } else {
                homeworkTable(report.homework)
            }
            Text(String(localized: "feature.guardian.chi.tinh.ket.qua.a.gui.khong.tinh.phan.chua.cham"))
                .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                .foregroundStyle(AppColors.muted)
        }
    }

    private func homeworkTable(_ rows: [HomeworkSummary]) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Text(String(localized: "feature.guardian.phan")).frame(maxWidth: .infinity, alignment: .leading)
                Text(String(localized: "feature.guardian.tot")).frame(width: 56, alignment: .trailing)
                Text(String(localized: "feature.guardian.hoan.thanh")).frame(width: 104, alignment: .trailing)
                Text(String(localized: "feature.guardian.chua")).frame(width: 44, alignment: .trailing)
            }
            .appDynamicText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
            .foregroundStyle(AppColors.muted)
            .padding(.vertical, 8)
            .overlay(alignment: .bottom) { AppColors.divider.frame(height: AppMetrics.hairline) }
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
                .appDynamicText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .padding(.vertical, 8)
                .overlay(alignment: .bottom) {
                    if index < rows.count - 1 { AppColors.divider.frame(height: AppMetrics.hairline) }
                }
            }
        }
    }

    private func testsCard(_ report: ReportSnapshot) -> some View {
        section(String(localized: "feature.guardian.iem.tung.bai")) {
            if report.tests.isEmpty {
                GuardianMutedText(text: String(localized: "reports.tests.none", table: "Reports"))
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(report.tests.enumerated()), id: \.element.testId) { index, row in
                        HStack(spacing: TeacherMetrics.contentGap) {
                            VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
                                Text(row.name)
                                    .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                                    .foregroundStyle(AppColors.text)
                                Text(GuardianFormat.longDayMonth(row.date))
                                    .appDynamicText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                                    .foregroundStyle(AppColors.muted)
                            }
                            Spacer(minLength: 0)
                              Text(row.value.map { GuardianFormat.scoreText($0) } ?? String(localized: "feature.guardian.noScore"))
                                .appDynamicText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                                .foregroundStyle(AppColors.text)
                        }
                        .padding(.vertical, 8)
                        .overlay(alignment: .top) {
                            if index > 0 { AppColors.divider.frame(height: AppMetrics.hairline) }
                        }
                    }
                }
            }
        }
    }
}
