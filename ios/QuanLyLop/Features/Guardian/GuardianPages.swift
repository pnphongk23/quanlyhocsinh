import SwiftUI

// MARK: - PH · Tổng quan (ảnh 15)

struct GuardianOverviewPage: View {
    let child: GuardianChildData
    let month: String
    let openScores: () -> Void
    let openTicket: (ClassSession) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
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
                                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                                        .foregroundStyle(AppColors.muted)))
                GuardianStars(level: item.slip.stars ?? .one)
                Text(item.slip.stars?.template ?? "")
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
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
        return VStack(alignment: .leading, spacing: 8) {
            GuardianCardHead(title: String(localized: "feature.guardian.iem.gan.ay"),
                             trailing: AnyView(
                                Button(String(localized: "feature.guardian.xem.tat.ca"), action: openScores)
                                    .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                                    .foregroundStyle(AppColors.primaryInk)))
            if rows.isEmpty {
                GuardianMutedText(text: String(localized: "feature.guardian.chua.co.iem.trong.thang.nay"))
            } else {
                GuardianScoreRows(rows: rows)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }
}

// MARK: - PH · Điểm danh

struct GuardianAttendancePage: View {
    let child: GuardianChildData
    let month: String
    let selectMonth: (String) -> Void

    var body: some View {
        let data = child.attendanceMonth(month)
        VStack(alignment: .leading, spacing: 12) {
            GuardianMonthSwitch(month: month, months: child.months, select: selectMonth)
            HStack(spacing: 6) {
                GuardianStatCell(value: data.present, name: AttendanceStatus.present.guardianLabel)
                GuardianStatCell(value: data.late, name: AttendanceStatus.late.guardianLabel)
                GuardianStatCell(value: data.excused, name: AttendanceStatus.excused.guardianLabel)
                GuardianStatCell(value: data.absent, name: AttendanceStatus.absent.guardianLabel)
            }
            if data.rows.isEmpty {
                GuardianMutedText(text: String(localized: "feature.guardian.chua.co.buoi.hoc.nao.trong.thang.nay"))
            } else {
                VStack(spacing: 8) {
                    ForEach(data.rows) { row in
                        attendanceRow(row)
                    }
                }
            }
        }
    }

    private func attendanceRow(_ row: GuardianAttendanceRow) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(GuardianFormat.sessionPrefix(row.session)) · \(GuardianFormat.weekdayDayMonth(row.session.date))")
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                    .foregroundStyle(AppColors.text)
                if row.status == .late, let time = row.lateAt, !time.isEmpty {
                    Text(String.localizedStringWithFormat(String(localized: "feature.guardian.en.muon"), String(describing: (time))))
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                        .foregroundStyle(AppColors.muted)
                }
                if !row.note.isEmpty {
                    Text(String.localizedStringWithFormat(String(localized: "feature.guardian.ghi.chu.2c1e0c8e"), String(describing: (row.note))))
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                        .foregroundStyle(AppColors.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if let status = row.status {
                AppPill(title: status.guardianPillLabel, tone: status.guardianTone)
                    .fixedSize()
            } else {
                Text(String(localized: "feature.guardian.chua.iem.danh"))
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.85))
                    .foregroundStyle(AppColors.muted)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }
}

// MARK: - PH · Điểm số

struct GuardianScoresPage: View {
    let child: GuardianChildData
    let month: String
    let selectMonth: (String) -> Void

    var body: some View {
        let rows = child.scoreRows(in: month)
        VStack(alignment: .leading, spacing: 12) {
            GuardianMonthSwitch(month: month, months: child.months, select: selectMonth)
            if rows.isEmpty {
                GuardianMutedText(text: String(localized: "feature.guardian.chua.co.bai.kiem.tra.nao.trong.thang.nay"))
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    GuardianCardHead(title: String(localized: "feature.guardian.iem.tung.bai"),
                                     trailing: AnyView(
                                        Text(String.localizedStringWithFormat(String(localized: "feature.guardian.bai.co.iem"), String(describing: (rows.filter { $0.value != nil }.count))))
                                            .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                                            .foregroundStyle(AppColors.muted)))
                    GuardianScoreRows(rows: rows)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
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
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "feature.guardian.phieu.buoi.hoc.theo.tung.buoi.sao.cau.mau.ghi.ch"))
                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
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
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .multilineTextAlignment(.leading)
                if !item.slip.note.isEmpty {
                    GuardianNoteBlock(label: String(localized: "feature.guardian.ghi.chu"), text: item.slip.note)
                }
                if let homework = child.gradedHomework(for: item.session), !homework.parts.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String.localizedStringWithFormat(String(localized: "feature.guardian.ket.qua.btvn.buoi"), SessionLabel.inline(for: homework.session)))
                            .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
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
