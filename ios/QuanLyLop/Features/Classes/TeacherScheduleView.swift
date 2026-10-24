import SwiftUI

// MARK: - Tab Lịch (`SchedulePage.tsx`)

struct TeacherScheduleView: View {
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var view = "day"
    @State private var selectedDate = TeacherFormat.todayISO()
    @State private var selectedClass = "all"
    @State private var visibleYear = TeacherFormat.components(TeacherFormat.todayISO()).year
    @State private var visibleMonth = TeacherFormat.components(TeacherFormat.todayISO()).month

    init(data: TeacherFeatureData, i4Data: I4FeatureStore,
         initialView: String = "day", initialDate: String? = nil) {
        _data = Bindable(data)
        self.i4Data = i4Data
        let date = initialDate ?? TeacherFormat.todayISO()
        _view = State(initialValue: initialView)
        _selectedDate = State(initialValue: date)
        _visibleYear = State(initialValue: TeacherFormat.components(date).year)
        _visibleMonth = State(initialValue: TeacherFormat.components(date).month)
    }

    private struct Entry: Identifiable {
        let session: ClassSession
        let className: String
        var id: String { session.id }
    }

    private var today: String { TeacherFormat.todayISO() }

    private var classes: [Classroom] { data.classes.filter { $0.status == .active } }

    private var entries: [Entry] {
        let active = Dictionary(uniqueKeysWithValues: classes.map { ($0.id, $0.name) })
        return data.sessions
            .filter { active[$0.classId] != nil }
            .map { Entry(session: $0, className: active[$0.classId] ?? "") }
            .sorted { ($0.session.date, $0.session.startTime) < ($1.session.date, $1.session.startTime) }
    }

    private var filtered: [Entry] {
        entries.filter { selectedClass == "all" || $0.session.classId == selectedClass }
    }

    private var entriesByDate: [String: [Entry]] {
        Dictionary(grouping: filtered, by: { $0.session.date })
    }

    private var dateEntries: [Entry] { entriesByDate[selectedDate] ?? [] }

    private var missedEntries: [Entry] {
        filtered.filter { $0.session.status == .planned && $0.session.date < today }
    }

    private var upcomingEntries: [Entry] {
        let from = selectedDate > today ? selectedDate : today
        let end = Self.addDays(from, 13)
        return filtered
            .filter { $0.session.status == .planned && $0.session.date > from && $0.session.date <= end }
            .sorted { ($0.session.date, $0.session.startTime) < ($1.session.date, $1.session.startTime) }
    }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                TeacherSegmented(options: [.init(id: "day", label: String(localized: "feature.classes.ngay")), .init(id: "month", label: String(localized: "feature.classes.thang"))],
                                 value: view) { changeView($0) }
                filterChips
                if view == "day" { dayView } else { monthView }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, 24)
        }
        .background(AppColors.background.ignoresSafeArea())
        .navigationTitle(String(localized: "feature.classes.lich"))
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: Ngày | Tháng

    private func changeView(_ next: String) {
        view = next
        if next == "month" {
            let parts = TeacherFormat.components(selectedDate)
            visibleYear = parts.year
            visibleMonth = parts.month
        }
    }

    private var filterChips: some View {
        TeacherHorizontalScroll {
            HStack(spacing: 8) {
                filterChip(value: "all", label: String(localized: "feature.classes.tat.ca.lop"))
                ForEach(classes, id: \.id) { klass in
                    filterChip(value: klass.id, label: klass.name)
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 2)
        }
    }

    private func filterChip(value: String, label: String) -> some View {
        let active = selectedClass == value
        return Button { selectedClass = value } label: {
            Text(label)
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                  .foregroundStyle(active ? AppState.selectedFg : AppColors.muted)
                .lineLimit(1)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(minHeight: 36)
                  .background(active ? AppState.selectedBg : AppColors.surface,
                              in: RoundedRectangle(cornerRadius: AppRadius.segment))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }

    // MARK: Ngày

    @ViewBuilder private var dayView: some View {
        dayBar
        if dateEntries.isEmpty {
            dayEmpty
        } else {
            cardList(dateEntries) { entry in entry.session.startTime }
        }
        if !missedEntries.isEmpty {
            TeacherGroupLabel(text: String(localized: "feature.classes.chua.iem.danh"))
            cardList(missedEntries) { entry in TeacherFormat.dayMonth(entry.session.date) }
        }
        if !upcomingEntries.isEmpty {
            TeacherGroupLabel(text: String(localized: "feature.classes.sap.toi"))
            cardList(upcomingEntries) { entry in TeacherFormat.weekdayName(entry.session.date) }
        }
    }

    private var dayBar: some View {
        HStack(spacing: 8) {
            navButton("chevron.backward", label: String(localized: "feature.classes.hom.truoc")) { selectedDate = Self.addDays(selectedDate, -1) }
            VStack(spacing: 2) {
                Text(TeacherFormat.weekdayDate(selectedDate))
                    .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                    .foregroundStyle(AppColors.text)
                    .lineLimit(1)
                if selectedDate == today {
                    Text(String(localized: "feature.classes.hom.nay")).appText(AppText.muted).foregroundStyle(AppColors.muted)
                } else {
                    Button { goToday() } label: {
                        Text(String(localized: "feature.classes.ve.hom.nay"))
                            .appText(AppText.muted)
                            .foregroundStyle(AppColors.muted)
                            .underline()
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity)
            navButton("chevron.right", label: String(localized: "feature.classes.hom.sau")) { selectedDate = Self.addDays(selectedDate, 1) }
        }
        .padding(6)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
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

    private var dayEmpty: some View {
        TeacherEmptyState(systemImage: "calendar",
                          title: String(localized: "feature.classes.khong.co.buoi.hoc"),
                          message: String.localizedStringWithFormat(String(localized: "feature.classes.ngay.chua.co.buoi.hoc.nao.chon.ngay.khac.e.xem.l"), String(describing: (TeacherFormat.dayMonth(selectedDate)))))
    }

    // MARK: Tháng

    @ViewBuilder private var monthView: some View {
        monthCard
        TeacherGroupLabel(text: TeacherFormat.weekdayDate(selectedDate))
        if dateEntries.isEmpty {
            dayEmpty
        } else {
            cardList(dateEntries) { entry in entry.session.startTime }
        }
    }

    private var monthCard: some View {
        VStack(spacing: TeacherMetrics.contentGap) {
            HStack(spacing: 8) {
                navButton("chevron.backward", label: String(localized: "feature.classes.thang.truoc")) { changeMonth(-1) }
                Text(TeacherFormat.monthTitle(year: visibleYear, month: visibleMonth))
                    .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24))
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity)
                navButton("chevron.right", label: String(localized: "feature.classes.thang.sau")) { changeMonth(1) }
            }
            if !isCurrentMonth {
                Button { goToday() } label: {
                    Text(String(localized: "feature.classes.ve.thang.nay"))
                        .appText(AppText.muted)
                        .foregroundStyle(AppColors.muted)
                        .underline()
                }
                .buttonStyle(.plain)
            }
            monthGrid
        }
        .padding(TeacherMetrics.cardPadding)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var isCurrentMonth: Bool {
        let parts = TeacherFormat.components(today)
        return parts.year == visibleYear && parts.month == visibleMonth
    }

    private var monthGrid: some View {
        let weeks = Self.trimmedWeeks(visibleYear, visibleMonth)
        return VStack(spacing: 2) {
            HStack(spacing: 2) {
                ForEach(["T2", "T3", "T4", "T5", "T6", "T7", "CN"], id: \.self) { name in
                    Text(name)
                        .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                        .foregroundStyle(AppColors.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
            }
            ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                HStack(spacing: 2) {
                    ForEach(week, id: \.date) { cell in
                        dayCell(cell)
                    }
                }
            }
        }
    }

    private struct DayCell: Hashable {
        let date: String
        let inMonth: Bool
        let day: Int
    }

    @ViewBuilder private func dayCell(_ cell: DayCell) -> some View {
        if !cell.inMonth {
            Color.clear.frame(maxWidth: .infinity).frame(minHeight: AppMetrics.tap)
        } else {
            let hasSessions = !(entriesByDate[cell.date] ?? []).isEmpty
            let selected = cell.date == selectedDate
            let isToday = cell.date == today
            Button { selectedDate = cell.date } label: {
                VStack(spacing: 2) {
                    Text("\(cell.day)")
                        .appText(AppTextStyle(size: 15, weight: selected ? .bold : .medium, lineHeight: 22.5))
                    Circle()
                        .fill(selected ? AppColors.onPrimary : (hasSessions ? AppColors.primary : .clear))
                        .frame(width: 5, height: 5)
                }
                .foregroundStyle(selected ? AppColors.onPrimary : AppColors.text)
                .frame(maxWidth: .infinity)
                .frame(minHeight: AppMetrics.tap)
                .background(selected ? AppColors.primary : .clear,
                            in: RoundedRectangle(cornerRadius: AppRadius.button))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.button)
                        .strokeBorder(isToday && !selected ? AppColors.primary : .clear, lineWidth: 1.5))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(TeacherFormat.fullDate(cell.date)), \(hasSessions ? "có buổi học" : "không có buổi học")")
        }
    }

    // MARK: Thẻ buổi học

    private func cardList(_ items: [Entry], lead: @escaping (Entry) -> String) -> some View {
        VStack(spacing: TeacherMetrics.contentGap) {
            ForEach(items) { entry in card(entry, lead: lead(entry)) }
        }
    }

    private func card(_ entry: Entry, lead: String) -> some View {
        TeacherLink(route: .session(classID: entry.session.classId, sessionID: entry.session.id)) {
            HStack(spacing: 12) {
                Text(lead)
                    .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 20.8))
                    .foregroundStyle(AppColors.text)
                    .frame(width: 56, alignment: .leading)
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.className)
                        .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                        .foregroundStyle(AppColors.text)
                        .multilineTextAlignment(.leading)
                    Text(meta(entry.session))
                        .appText(AppText.muted)
                        .foregroundStyle(AppColors.muted)
                        .multilineTextAlignment(.leading)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                trailing(entry.session)
            }
            .padding(TeacherMetrics.cardPadding)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
    }

    @ViewBuilder private func trailing(_ session: ClassSession) -> some View {
        let state = Self.state(of: session, today: today)
        if state.action == "checkin" {
            Text(state.label)
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(AppColors.primaryInk)
                .padding(.horizontal, 14)
                .frame(height: AppMetrics.tap)
                .background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
        } else {
            TeacherStatusPill(text: state.label, tone: state.tone)
        }
    }

    private func meta(_ session: ClassSession) -> String {
        var parts = [TeacherFeatureData.sessionPrefix(session)]
        if session.origin == .manual {
            let note = session.note?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            parts.append(note.isEmpty ? String(localized: "feature.classes.buoi.le") : note)
        }
        return parts.joined(separator: " · ")
    }

    // MARK: Trạng thái & lịch

    private struct CardState {
        let label: String
        let tone: TeacherStatusPill.Tone
        let action: String
    }

    /// `scheduleState` of `scheduleModel.ts`.
    private static func state(of session: ClassSession, today: String) -> CardState {
        switch session.status {
        case .cancelled: return CardState(label: String(localized: "feature.classes.a.huy"), tone: .warning, action: "status")
        case .held: return CardState(label: String(localized: "feature.classes.a.iem.danh"), tone: .success, action: "status")
        case .planned:
            if session.date < today { return CardState(label: String(localized: "feature.classes.chua.iem.danh"), tone: .warning, action: "status") }
            if session.date == today { return CardState(label: String(localized: "feature.classes.iem.danh"), tone: .primary, action: "checkin") }
            return CardState(label: String(localized: "feature.classes.chua.toi"), tone: .neutral, action: "status")
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
        let day = min(TeacherFormat.components(selectedDate).day, Self.daysInMonth(year, month))
        selectedDate = TeacherFormat.iso(year: year, month: month, day: day)
    }

    private static func daysInMonth(_ year: Int, _ month: Int) -> Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh") ?? .current
        var components = DateComponents()
        components.year = year
        components.month = month
        guard let date = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: date) else { return 30 }
        return range.count
    }

    private static func addDays(_ iso: String, _ amount: Int) -> String {
        let parts = TeacherFormat.components(iso)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh") ?? .current
        var components = DateComponents()
        components.year = parts.year
        components.month = parts.month
        components.day = parts.day + amount
        guard let date = calendar.date(from: components) else { return iso }
        let result = calendar.dateComponents([.year, .month, .day], from: date)
        return TeacherFormat.iso(year: result.year ?? parts.year, month: result.month ?? parts.month,
                                 day: result.day ?? parts.day)
    }

    /// `monthGrid` + `trimMonthWeeks` of `sessionGroups.ts`.
    private static func trimmedWeeks(_ year: Int, _ month: Int) -> [[DayCell]] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh") ?? .current
        calendar.firstWeekday = 2
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        guard let first = calendar.date(from: components) else { return [] }
        let weekday = calendar.component(.weekday, from: first) // 1 = Sunday
        let mondayOffset = (weekday + 5) % 7
        guard let start = calendar.date(byAdding: .day, value: -mondayOffset, to: first) else { return [] }
        var weeks: [[DayCell]] = []
        for week in 0..<6 {
            var row: [DayCell] = []
            for weekdayIndex in 0..<7 {
                guard let date = calendar.date(byAdding: .day, value: week * 7 + weekdayIndex, to: start) else { continue }
                let parts = calendar.dateComponents([.year, .month, .day], from: date)
                let isoDate = TeacherFormat.iso(year: parts.year ?? year, month: parts.month ?? month,
                                                day: parts.day ?? 1)
                row.append(DayCell(date: isoDate, inMonth: parts.month == month, day: parts.day ?? 1))
            }
            weeks.append(row)
        }
        let visible = weeks.filter { $0.contains { $0.inMonth } }
        return visible.isEmpty ? weeks : visible
    }
}
