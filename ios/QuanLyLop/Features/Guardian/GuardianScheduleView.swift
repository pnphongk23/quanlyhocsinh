import SwiftUI

/// Which sessions the class tab's "Buổi sắp tới" section lists and how the schedule groups them.
enum GuardianScheduleRules {
    /// Sessions from `today` on (a cancelled one stays so the parent knows), soonest first.
    static func upcoming(_ rows: [GuardianSessionRow], today: String, limit: Int? = nil) -> [GuardianSessionRow] {
        let sorted = rows.filter { $0.session.date >= today }
            .sorted { ($0.session.date, $0.session.startTime) < ($1.session.date, $1.session.startTime) }
        return limit.map { Array(sorted.prefix($0)) } ?? sorted
    }

    /// The dot under a day number: exactly the days whose list is not empty.
    static func hasSessions(on date: String, in byDate: [String: [GuardianSessionRow]]) -> Bool {
        !(byDate[date] ?? []).isEmpty
    }

    static func byDate(_ rows: [GuardianSessionRow]) -> [String: [GuardianSessionRow]] {
        Dictionary(grouping: rows, by: { $0.session.date }).mapValues {
            $0.sorted { $0.session.startTime < $1.session.startTime }
        }
    }
}

/// "Buổi sắp tới": the next sessions of the selected child with "Tất cả" opening the whole schedule.
struct GuardianUpcomingSection: View {
    let child: GuardianChildData
    let openSession: (GuardianSessionRow) -> Void
    let openAll: () -> Void

    /// The home page shows this many; the rest is behind "Tất cả" (same as the web home).
    static let homeLimit = 3

    private var rows: [GuardianSessionRow] {
        GuardianScheduleRules.upcoming(child.sessionRows, today: TeacherFormat.todayISO(), limit: Self.homeLimit)
    }

    var body: some View {
        AppSection(title: String(localized: "guardian.upcoming.title", table: "Guardian"),
                   trailing: AnyView(
                    Button(action: openAll) {
                        Text(String(localized: "feature.comments.tat.ca"))
                            .appDynamicText(AppText.label)
                            .foregroundStyle(AppColors.primaryInk)
                            .frame(minWidth: AppMetrics.tap, minHeight: AppMetrics.tap, alignment: .trailing)
                    }
                    .accessibilityIdentifier("guardian.upcoming.all"))) {
            if rows.isEmpty {
                AppEmptyState(title: String(localized: "guardian.upcoming.empty", table: "Guardian"), size: .compact)
            } else {
                VStack(spacing: TeacherMetrics.listGap) {
                    ForEach(rows) { row in
                        GuardianScheduleCard(row: row, lead: TeacherFormat.weekdayName(row.session.date)) { openSession(row) }
                    }
                }
            }
        }
    }
}

struct GuardianScheduleCard: View {
    let row: GuardianSessionRow
    let lead: String
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            HStack(spacing: AppSpace.s12) {
                VStack(alignment: .leading, spacing: AppSpace.s2) {
                    Text(lead).appDynamicText(AppText.label).foregroundStyle(AppColors.text)
                    Text(TeacherFormat.dayMonth(row.session.date)).appDynamicText(AppText.muted).foregroundStyle(AppColors.muted)
                }
                .frame(width: AppMetrics.dateColumn, alignment: .leading)
                Text(row.session.startTime)
                    .appDynamicText(AppText.subheading)
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .trailing, spacing: AppSpace.s2) {
                    Text(row.statusLabel)
                        .appDynamicText(AppText.caption)
                        .foregroundStyle(row.statusColor)
                        .lineLimit(1)
                    if let slip = row.sentSlip { GuardianStars(slip: slip, size: 14) }
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: AppMetrics.rowChevronSize, weight: .semibold))
                    .foregroundStyle(AppColors.muted)
            }
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, AppSpace.s12)
            .frame(maxWidth: .infinity, minHeight: AppMetrics.tap, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
            .contentShape(RoundedRectangle(cornerRadius: AppRadius.card))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(String.localizedStringWithFormat(
            String(localized: "feature.guardian.mo.phieu.buoi.hoc.buoi"),
            SessionLabel.title(for: row.session)))
    }
}

/// "Lịch học của con": the child's sessions by day or by month, like the teacher's schedule.
struct GuardianScheduleView: View {
    let child: GuardianChildData
    let openSession: (GuardianSessionRow) -> Void
    @State private var mode = "day"
    @State private var selectedDate = TeacherFormat.todayISO()
    @State private var visibleYear = TeacherFormat.components(TeacherFormat.todayISO()).year
    @State private var visibleMonth = TeacherFormat.components(TeacherFormat.todayISO()).month

    private var today: String { TeacherFormat.todayISO() }
    private var byDate: [String: [GuardianSessionRow]] { GuardianScheduleRules.byDate(child.sessionRows) }
    private var dateRows: [GuardianSessionRow] { byDate[selectedDate] ?? [] }
    private var upcoming: [GuardianSessionRow] {
        let from = selectedDate > today ? selectedDate : today
        return GuardianScheduleRules.upcoming(child.sessionRows, today: from).filter { $0.session.date > from }.prefix(8).map { $0 }
    }

    var body: some View {
        GuardianScroll {
            AppSegmented(options: [.init(value: "day", label: String(localized: "feature.classes.ngay")),
                                   .init(value: "month", label: String(localized: "feature.classes.thang"))],
                         value: mode) { changeMode($0) }
            if mode == "day" { dayView } else { monthView }
        }
        .navigationTitle(String(localized: "guardian.schedule.title", table: "Guardian"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func changeMode(_ next: String) {
        mode = next
        if next == "month" {
            let parts = TeacherFormat.components(selectedDate)
            visibleYear = parts.year
            visibleMonth = parts.month
        }
    }

    // MARK: Ngày

    private var dayView: some View {
        VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
            VStack(spacing: TeacherMetrics.contentGap) {
                dayBar
                dayList
            }
            if !upcoming.isEmpty {
                AppSection(title: String(localized: "guardian.upcoming.title", table: "Guardian")) {
                    VStack(spacing: TeacherMetrics.listGap) {
                        ForEach(upcoming) { card($0) }
                    }
                }
            }
        }
    }

    private var dayBar: some View {
        HStack(spacing: AppSpace.s8) {
            navButton("chevron.backward", label: String(localized: "feature.classes.hom.truoc")) {
                selectedDate = TeacherScheduleView.addDays(selectedDate, -1)
            }
            VStack(spacing: AppSpace.s2) {
                Text(TeacherFormat.weekdayDate(selectedDate))
                    .appDynamicText(AppText.subheading).foregroundStyle(AppColors.text).lineLimit(1)
                if selectedDate == today {
                    Text(String(localized: "feature.classes.hom.nay")).appDynamicText(AppText.muted).foregroundStyle(AppColors.muted)
                } else {
                    Button { goToday() } label: {
                        Text(String(localized: "feature.classes.ve.hom.nay")).appDynamicText(AppText.muted)
                            .foregroundStyle(AppColors.muted).underline()
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity)
            navButton("chevron.right", label: String(localized: "feature.classes.hom.sau")) {
                selectedDate = TeacherScheduleView.addDays(selectedDate, 1)
            }
        }
        .padding(AppSpace.s8)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    @ViewBuilder private var dayList: some View {
        if dateRows.isEmpty {
            AppEmptyState(title: String(localized: "feature.classes.khong.co.buoi.hoc"), size: .compact)
        } else {
            VStack(spacing: TeacherMetrics.listGap) {
                ForEach(dateRows) { card($0) }
            }
        }
    }

    private func card(_ row: GuardianSessionRow) -> some View {
        GuardianScheduleCard(row: row, lead: TeacherFormat.weekdayName(row.session.date)) { openSession(row) }
    }

    private func navButton(_ systemImage: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(AppColors.text)
                .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    // MARK: Tháng

    private var monthView: some View {
        VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
            monthCard
            AppSection(title: TeacherFormat.weekdayDate(selectedDate)) { dayList }
        }
    }

    private var monthCard: some View {
        VStack(spacing: TeacherMetrics.contentGap) {
            HStack(spacing: AppSpace.s8) {
                navButton("chevron.backward", label: String(localized: "feature.classes.thang.truoc")) { changeMonth(-1) }
                Text(TeacherFormat.monthTitle(year: visibleYear, month: visibleMonth))
                    .appDynamicText(AppText.subheading).foregroundStyle(AppColors.text).frame(maxWidth: .infinity)
                navButton("chevron.right", label: String(localized: "feature.classes.thang.sau")) { changeMonth(1) }
            }
            monthGrid
        }
        .padding(TeacherMetrics.cardPadding)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var monthGrid: some View {
        let weeks = TeacherScheduleView.trimmedWeeks(visibleYear, visibleMonth)
        return VStack(spacing: AppSpace.s2) {
            HStack(spacing: AppSpace.s2) {
                ForEach(["T2", "T3", "T4", "T5", "T6", "T7", "CN"], id: \.self) { name in
                    Text(name).appText(AppText.pill).foregroundStyle(AppColors.muted)
                        .frame(maxWidth: .infinity).padding(.vertical, AppSpace.s4)
                }
            }
            ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                HStack(spacing: AppSpace.s2) {
                    ForEach(week, id: \.date) { dayCell($0) }
                }
            }
        }
    }

    @ViewBuilder private func dayCell(_ cell: TeacherScheduleView.DayCell) -> some View {
        if !cell.inMonth {
            Color.clear.frame(maxWidth: .infinity).frame(minHeight: AppMetrics.tap)
        } else {
            let has = GuardianScheduleRules.hasSessions(on: cell.date, in: byDate)
            let selected = cell.date == selectedDate
            Button { selectedDate = cell.date } label: {
                VStack(spacing: AppSpace.s2) {
                    Text("\(cell.day)").appText(AppText.chip)
                    Circle()
                        .fill(has ? (selected ? AppColors.onPrimary : AppColors.primary) : .clear)
                        .frame(width: 5, height: 5)
                }
                .foregroundStyle(selected ? AppColors.onPrimary : AppColors.text)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                .background(selected ? AppColors.primary : .clear, in: RoundedRectangle(cornerRadius: AppRadius.button))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.button)
                    .strokeBorder(cell.date == today && !selected ? AppColors.primary : .clear, lineWidth: AppMetrics.borderWidth))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(TeacherFormat.fullDate(cell.date))
        }
    }

    private func goToday() {
        selectedDate = today
        let parts = TeacherFormat.components(today)
        visibleYear = parts.year
        visibleMonth = parts.month
    }

    private func changeMonth(_ offset: Int) {
        var month = visibleMonth + offset
        var year = visibleYear
        if month < 1 { month = 12; year -= 1 }
        if month > 12 { month = 1; year += 1 }
        visibleYear = year
        visibleMonth = month
        let day = min(TeacherFormat.components(selectedDate).day, TeacherScheduleView.daysInMonth(year, month))
        selectedDate = TeacherFormat.iso(year: year, month: month, day: day)
    }
}
