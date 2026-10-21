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
            if let latest = child.sentSlips.first {
                latestTicket(latest)
            }
            recentScores
        }
    }

    private var attendanceCard: some View {
        let data = child.attendanceMonth(month)
        let attended = data.present + data.late
        return GuardianStatCard(label: "Đi học",
                                value: "\(attended)/\(data.rows.count)",
                                detail: "buổi · \(data.late) muộn, \(data.excused) có phép")
    }

    private func latestTicket(_ item: GuardianSentSlip) -> some View {
        Button { openTicket(item.session) } label: {
            GuardianTicketCard {
                GuardianCardHead(title: "Nhận xét mới nhất",
                                 trailing: AnyView(
                                    Text("Buổi \(item.session.sessionNumber ?? 0) ›")
                                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                                        .foregroundStyle(AppColors.muted)))
                GuardianStars(level: item.slip.stars ?? .one)
                Text(item.slip.stars?.template ?? "")
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .multilineTextAlignment(.leading)
                if !item.slip.note.isEmpty {
                    GuardianNoteBlock(label: "Ghi chú", text: item.slip.note)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Mở phiếu buổi học buổi \(item.session.sessionNumber ?? 0)")
    }

    private var recentScores: some View {
        let rows = Array(child.scoreRows(in: month).prefix(3))
        return VStack(alignment: .leading, spacing: 8) {
            GuardianCardHead(title: "Điểm gần đây",
                             trailing: AnyView(
                                Button("Xem tất cả", action: openScores)
                                    .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                                    .foregroundStyle(AppColors.primaryInk)))
            if rows.isEmpty {
                GuardianMutedText(text: "Chưa có điểm trong tháng này.")
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
                GuardianMutedText(text: "Chưa có buổi học nào trong tháng này.")
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
                    Text("Đến muộn \(time)")
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                        .foregroundStyle(AppColors.muted)
                }
                if !row.note.isEmpty {
                    Text("Ghi chú: \(row.note)")
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                        .foregroundStyle(AppColors.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if let status = row.status {
                AppPill(title: status.guardianPillLabel, tone: status.guardianTone)
                    .fixedSize()
            } else {
                Text("Chưa điểm danh")
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
                GuardianMutedText(text: "Chưa có bài kiểm tra nào trong tháng này.")
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    GuardianCardHead(title: "Điểm từng bài",
                                     trailing: AnyView(
                                        Text("\(rows.filter { $0.value != nil }.count) bài có điểm")
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
            Text("Phiếu buổi học theo từng buổi: sao, câu mẫu, ghi chú và kết quả BTVN.")
                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                .foregroundStyle(AppColors.muted)
                .padding(.top, -4)
            if tickets.isEmpty {
                GuardianEmptyState(title: "Chưa có phiếu buổi học",
                                   detail: "Cô gửi phiếu sau buổi học, phiếu hiện ở đây khi cô đã gửi.")
            }
            ForEach(Array(tickets.enumerated()), id: \.element.id) { index, item in
                ticket(item, isNew: index == 0)
            }
        }
    }

    private func ticket(_ item: GuardianSentSlip, isNew: Bool) -> some View {
        Button { openTicket(item.session) } label: {
            GuardianTicketCard(isNew: isNew) {
                GuardianCardHead(title: "Buổi \(item.session.sessionNumber ?? 0) · \(GuardianFormat.longDayMonth(item.session.date))",
                                 trailing: AnyView(
                                    HStack(spacing: 8) {
                                        if isNew { AppPill(title: "Mới", tone: .primary) }
                                        GuardianStars(level: item.slip.stars ?? .one)
                                    }))
                Text(item.slip.stars?.template ?? "")
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25))
                    .foregroundStyle(AppColors.text)
                    .multilineTextAlignment(.leading)
                if !item.slip.note.isEmpty {
                    GuardianNoteBlock(label: "Ghi chú", text: item.slip.note)
                }
                if let homework = child.gradedHomework(for: item.session), !homework.parts.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Kết quả BTVN buổi \(homework.sessionNumber)")
                            .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                            .foregroundStyle(AppColors.muted)
                        GuardianPillFlow(parts: homework.parts)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Mở phiếu buổi học buổi \(item.session.sessionNumber ?? 0)")
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
