import SwiftUI

// MARK: - PH · Tổng quan (ảnh 15)

struct GuardianOverviewPage: View {
    let child: GuardianChildData
    let month: String
    let openScores: () -> Void
    let openTicket: (ClassSession) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            HStack(spacing: 8) {
                attendanceCard
                Color.clear.frame(maxWidth: .infinity)
            }
            if let note = child.teacherNote {
                GuardianNoteBox(text: note)
            }
            if let latest = child.sentSlips.first {
                latestTicket(latest)
            }
            recentScores
        }
    }

    private var attendanceCard: some View {
        let data = child.attendanceMonth(month)
        let attended = data.present + data.late
        return GuardianStatCard(label: String(localized: "feature.guardian.i.hoc"),
                                value: "\(attended)/\(data.rows.count)",
                                detail: String.localizedStringWithFormat(String(localized: "feature.guardian.buoi.muon.co.phep"), String(describing: (data.late)), String(describing: (data.excused))))
    }

    private func latestTicket(_ item: GuardianSentSlip) -> some View {
        Button { openTicket(item.session) } label: {
            GuardianTicketCard {
                GuardianCardHead(title: String(localized: "feature.guardian.nhan.xet.moi.nhat"),
                                 trailing: AnyView(
                                    Text(String.localizedStringWithFormat(String(localized: "feature.guardian.buoi"), SessionLabel.title(for: item.session)))
                                        .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                                        .foregroundStyle(AppColors.muted)))
                GuardianStars(level: item.slip.stars ?? .one)
                Text(item.slip.stars?.template ?? "")
                    .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .multilineTextAlignment(.leading)
                if !item.slip.note.isEmpty {
                    GuardianNoteBlock(label: String(localized: "feature.guardian.ghi.chu"), text: item.slip.note)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.guardian.mo.phieu.buoi.hoc.buoi"), SessionLabel.title(for: item.session)))
    }

    private var recentScores: some View {
        let rows = Array(child.scoreRows(in: month).prefix(3))
        return AppSection(title: String(localized: "feature.guardian.iem.gan.ay"),
                          trailing: AnyView(
                            Button(String(localized: "feature.guardian.xem.tat.ca"), action: openScores)
                                .appDynamicText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                                .foregroundStyle(AppColors.primaryInk))) {
            VStack(alignment: .leading, spacing: TeacherMetrics.listGap) {
                if rows.isEmpty {
                    AppEmptyState(title: String(localized: "feature.guardian.chua.co.iem.trong.thang.nay"), size: .compact)
                } else {
                    GuardianScoreRows(rows: rows)
                }
            }
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, AppMetrics.cardPaddingVertical)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
        .padding(.top, AppMetrics.sectionGap - TeacherMetrics.contentGap)
    }
}

/// The class tab's session list is the entry point to both published slips and assigned homework.
struct GuardianSessionListPage: View {
    let child: GuardianChildData
    let openSession: (GuardianSessionRow) -> Void

    private var rowsByMonth: [(month: String, rows: [GuardianSessionRow])] {
        let groups = Dictionary(grouping: child.sessionRows, by: \.month)
        return groups.keys.sorted(by: >).map { month in
            (month, groups[month] ?? [])
        }
    }

    var body: some View {
        if rowsByMonth.isEmpty {
            AppEmptyState(title: String(localized: "feature.guardian.chua.co.buoi.hoc.nao.trong.thang.nay"),
                          size: .compact)
        } else {
            VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
                ForEach(rowsByMonth, id: \.month) { group in
                    AppSection(title: GuardianFormat.monthLabel(group.month)) {
                        VStack(spacing: TeacherMetrics.listGap) {
                            ForEach(group.rows) { row in sessionRow(row) }
                        }
                    }
                }
            }
        }
    }

    private func sessionRow(_ row: GuardianSessionRow) -> some View {
        Button { openSession(row) } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(GuardianFormat.sessionPrefix(row.session)) · \(GuardianFormat.weekdayDayMonth(row.session.date))")
                        .appDynamicText(AppText.segment)
                        .foregroundStyle(AppColors.text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text(row.statusLabel)
                        .appDynamicText(AppText.caption)
                        .foregroundStyle(row.statusColor)
                }
                if let slip = row.sentSlip {
                    GuardianStars(level: slip.stars ?? .one)
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppColors.muted)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(minHeight: AppMetrics.tap)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
            .contentShape(RoundedRectangle(cornerRadius: AppRadius.card))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(String.localizedStringWithFormat(
            String(localized: "feature.guardian.mo.phieu.buoi.hoc.buoi"),
            SessionLabel.title(for: row.session)))
    }
}

// MARK: - PH · Điểm số

struct GuardianScoresPage: View {
    let child: GuardianChildData
    let month: String
    let selectMonth: (String) -> Void

    var body: some View {
        let rows = child.scoreRows(in: month)
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            GuardianMonthSwitch(month: month, months: child.months, select: selectMonth)
            if rows.isEmpty {
                  AppEmptyState(title: String(localized: "feature.guardian.chua.co.bai.kiem.tra.nao.trong.thang.nay"), size: .compact)
            } else {
                AppSection(title: String(localized: "feature.guardian.iem.tung.bai"),
                           trailing: AnyView(
                            Text(String.localizedStringWithFormat(String(localized: "feature.guardian.bai.co.iem"), String(describing: (rows.filter { $0.value != nil }.count))))
                                .appDynamicText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                                .foregroundStyle(AppColors.muted))) {
                    GuardianScoreRows(rows: rows)
                        .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
                        .padding(.vertical, AppMetrics.cardPaddingVertical)
                        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
                }
                .padding(.top, AppMetrics.sectionGap - TeacherMetrics.contentGap)
            }
        }
    }
}

// MARK: - PH · Nhận xét (ảnh 14)

struct GuardianCommentsPage: View {
    let child: GuardianChildData
    let openTicket: (ClassSession) -> Void

    var body: some View {
        let tickets = child.sentSlips
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            Text(String(localized: "feature.guardian.phieu.buoi.hoc.theo.tung.buoi.sao.cau.mau.ghi.ch"))
                .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                .foregroundStyle(AppColors.muted)
                .padding(.top, -4)
            if tickets.isEmpty {
                GuardianEmptyState(title: String(localized: "feature.guardian.chua.co.phieu.buoi.hoc"),
                                   detail: String(localized: "feature.guardian.co.gui.phieu.sau.buoi.hoc.phieu.hien.o.ay.khi.co"))
            }
            ForEach(Array(tickets.enumerated()), id: \.element.id) { index, item in
                ticket(item, isNew: index == 0)
            }
        }
    }

    private func ticket(_ item: GuardianSentSlip, isNew: Bool) -> some View {
        Button { openTicket(item.session) } label: {
            GuardianTicketCard(isNew: isNew) {
                GuardianCardHead(title: String.localizedStringWithFormat(String(localized: "feature.guardian.buoi.c9f84c0e"), SessionLabel.title(for: item.session), String(describing: (GuardianFormat.longDayMonth(item.session.date)))),
                                 trailing: AnyView(
                                    HStack(spacing: 8) {
                                        if isNew { AppPill(title: String(localized: "feature.guardian.moi"), tone: .primary) }
                                        GuardianStars(level: item.slip.stars ?? .one)
                                    }))
                Text(item.slip.stars?.template ?? "")
                    .appDynamicText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .multilineTextAlignment(.leading)
                if !item.slip.note.isEmpty {
                    GuardianNoteBlock(label: String(localized: "feature.guardian.ghi.chu"), text: item.slip.note)
                }
                if let homework = child.gradedHomework(for: item.session), !homework.parts.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String.localizedStringWithFormat(String(localized: "feature.guardian.ket.qua.btvn.buoi"), SessionLabel.inline(for: homework.session)))
                            .appDynamicText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                            .foregroundStyle(AppColors.muted)
                        GuardianPillFlow(parts: homework.parts)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.guardian.mo.phieu.buoi.hoc.buoi"), SessionLabel.title(for: item.session)))
    }
}

/// `.pillRow`: các pill kết quả BTVN tự xuống dòng.
struct GuardianPillFlow: View {
    let parts: [GuardianHomeworkPart]

    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(parts) { part in
                AppPill(title: "\(part.kindLabel) · \(part.level?.guardianLabel ?? "Chưa chấm")",
                        tone: part.level?.guardianTone ?? .neutral)
            }
        }
    }
}

/// Minimal wrapping layout for the prototype's `flex-wrap: wrap` pill row.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var rows: [CGFloat] = [0]
        var heights: [CGFloat] = [0]
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            let row = rows.count - 1
            let needed = rows[row] == 0 ? size.width : rows[row] + spacing + size.width
            if needed > width, rows[row] > 0 {
                rows.append(size.width)
                heights.append(size.height)
            } else {
                rows[row] = needed
                heights[row] = max(heights[row], size.height)
            }
        }
        let height = heights.reduce(0, +) + spacing * CGFloat(max(0, heights.count - 1))
        return CGSize(width: proposal.width ?? rows.max() ?? 0, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > bounds.minX, x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
